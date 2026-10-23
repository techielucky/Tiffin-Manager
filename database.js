
/*
=========================================================
TIFFIN MANAGER
DATABASE
=========================================================
*/

window.TiffinDB = (() => {

    let profile = null;
    let people = [];
    let tiffins = [];
    let expenses = [];
    let lastSpendReset = null;

    /*
    Default meal prices
    */

    let rates = {
        breakfast: 30,
        lunch: 50,
        dinner: 50,
        extra: 50
    };

    /*
    Get Supabase client
    */

    function client() {
        return TiffinAuth.getClient();
    }

    /*
    Get the currently authenticated user.
    */

    async function requireUser() {
        const { data, error } = await TiffinAuth.getUser();

        if (error) {
            throw error;
        }

        if (!data?.user) {
            throw new Error("You are not signed in.");
        }

        return data.user;
    }

    /*
    Load all current user's data.
    */

    async function loadAll() {
        const user = await requireUser();
        const userId = user.id;

        const [
            profileResult,
            peopleResult,
            tiffinResult,
            expenseResult,
            settingsResult,
            resetResult
        ] = await Promise.all([

            client()
                .from("profiles")
                .select("*")
                .eq("id", userId)
                .maybeSingle(),

            client()
                .from("people")
                .select("*")
                .eq("user_id", userId)
                .order("name"),

            client()
                .from("tiffin_records")
                .select("*")
                .eq("user_id", userId)
                .order("date"),

            client()
                .from("expenses")
                .select("*")
                .eq("user_id", userId)
                .order("date", { ascending: false }),

            client()
                .from("settings")
                .select("*")
                .eq("user_id", userId)
                .maybeSingle(),

            client()
                .from("spend_resets")
                .select("id, reset_at, amount_paid")
                .eq("user_id", userId)
                .order("reset_at", { ascending: false })
                .limit(1)
                .maybeSingle()

        ]);

        if (profileResult.error) throw profileResult.error;
        if (peopleResult.error) throw peopleResult.error;
        if (tiffinResult.error) throw tiffinResult.error;
        if (expenseResult.error) throw expenseResult.error;
        if (settingsResult.error) throw settingsResult.error;

        /*
        A missing spend_resets table or policy is an error.
        Run the supplied SQL migration before using reset.
        */

        if (resetResult.error) {
            console.error("Could not load spend reset:", resetResult.error);
            throw resetResult.error;
        }

        profile = profileResult.data;
        people = peopleResult.data || [];
        tiffins = tiffinResult.data || [];
        expenses = expenseResult.data || [];
        lastSpendReset = resetResult.data || null;

        if (settingsResult.data) {
            const settings = settingsResult.data;

            rates = {
                breakfast: Number(settings.breakfast_rate ?? 30),
                lunch: Number(settings.lunch_rate ?? 50),
                dinner: Number(settings.dinner_rate ?? 50),
                extra: Number(settings.extra_rate ?? 50)
            };
        }

        return getState();
    }

    /*
    Return loaded application state.
    */

    function getState() {
        return {
            profile,
            people,
            tiffins,
            expenses,
            rates,
            lastSpendReset
        };
    }

    /*
    Find a tiffin record.
    */

    function recordFor(personId, date) {
        return tiffins.find(record =>
            String(record.person_id) === String(personId) &&
            record.date === date
        );
    }

    /*
    Add / toggle a meal.
    */

    async function upsertTiffin(personId, date, meal) {
        const user = await requireUser();

        const validMeals = ["breakfast", "lunch", "dinner", "extra"];

        if (!validMeals.includes(meal)) {
            throw new Error("Invalid meal type.");
        }

        let record = recordFor(personId, date);
        let isNew = false;

        if (!record) {
            record = {
                id: TiffinUtils.id(),
                user_id: user.id,
                person_id: personId,
                date,
                breakfast: 0,
                lunch: 0,
                dinner: 0,
                extra: 0
            };

            isNew = true;
        }

        const previousValue = Number(record[meal] || 0);
        record[meal] = previousValue ? 0 : 1;

        const { error } = await client()
            .from("tiffin_records")
            .upsert(record, {
                onConflict: "user_id,person_id,date"
            });

        if (error) {
            record[meal] = previousValue;

            if (isNew) {
                record = null;
            }

            throw error;
        }

        if (isNew) {
            tiffins.push(record);
        }
    }

    /*
    Add person.
    */

    async function addPerson(name) {
        const user = await requireUser();
        const cleanName = String(name || "").trim();

        if (!cleanName) {
            throw new Error("Person name is required.");
        }

        const row = {
            id: TiffinUtils.id(),
            user_id: user.id,
            name: cleanName
        };

        const { data, error } = await client()
            .from("people")
            .insert(row)
            .select("*")
            .single();

        if (error) {
            throw error;
        }

        people.push(data || row);
    }

    /*
    Delete person and associated tiffin records.

    We delete the tiffin records first to avoid a foreign-key
    conflict if the database does not use ON DELETE CASCADE.
    */

    async function deletePerson(id) {
        const user = await requireUser();
        const userId = user.id;

        const person = people.find(
            item => String(item.id) === String(id)
        );

        if (!person) {
            throw new Error(
                "Person not found. Refresh the page and try again."
            );
        }

        if (person.user_id !== userId) {
            throw new Error("You cannot delete this person.");
        }

        /*
        Delete this person's tiffin records.
        */

        const { error: tiffinError } = await client()
            .from("tiffin_records")
            .delete()
            .eq("person_id", id)
            .eq("user_id", userId);

        if (tiffinError) {
            console.error("Could not delete tiffin records:", tiffinError);

            throw new Error(
                "Could not delete the person's tiffin records. " +
                "Check the tiffin_records DELETE policy in Supabase. " +
                tiffinError.message
            );
        }

        /*
        Delete the person and request the deleted row back.
        */

        const { data: deletedRows, error } = await client()
            .from("people")
            .delete()
            .eq("id", id)
            .eq("user_id", userId)
            .select("id");

        if (error) {
            console.error("Delete person error:", error);

            throw new Error(
                "Could not delete person. Check the people DELETE " +
                "policy and any foreign-key constraints. " +
                error.message
            );
        }

        if (!deletedRows || deletedRows.length === 0) {
            throw new Error(
                "No person was deleted. Check the people table's " +
                "DELETE policy in Supabase."
            );
        }

        people = people.filter(
            item => String(item.id) !== String(id)
        );

        tiffins = tiffins.filter(
            item => String(item.person_id) !== String(id)
        );
    }

    /*
    Add expense.
    */

    async function addExpense(row) {
        const user = await requireUser();

        const amount = Number(row.amount);

        if (!Number.isFinite(amount) || amount < 0) {
            throw new Error("Enter a valid expense amount.");
        }

        const expense = {
            ...row,
            id: TiffinUtils.id(),
            user_id: user.id
        };

        const { data, error } = await client()
            .from("expenses")
            .insert(expense)
            .select("*")
            .single();

        if (error) {
            throw error;
        }

        expenses.unshift(data || expense);
    }

    /*
    Delete expense and verify the deletion succeeded.
    */

    async function deleteExpense(id) {
        const user = await requireUser();
        const userId = user.id;

        const { data: deletedRows, error } = await client()
            .from("expenses")
            .delete()
            .eq("id", id)
            .eq("user_id", userId)
            .select("id");

        if (error) {
            console.error("Delete expense error:", error);

            throw new Error(
                "Could not delete expense. Check the expenses DELETE " +
                "policy in Supabase. " + error.message
            );
        }

        if (!deletedRows || deletedRows.length === 0) {
            throw new Error(
                "No expense was deleted. Check the expenses table's " +
                "DELETE policy in Supabase."
            );
        }

        expenses = expenses.filter(
            expense => String(expense.id) !== String(id)
        );
    }

    /*
    Calculate current unpaid expense total.

    This function expects expenses to have a created_at column.
    Expenses created after the last reset are included.
    Historical expense rows are not deleted.
    */

    function getCurrentSpend() {
        const resetTime = lastSpendReset?.reset_at
            ? new Date(lastSpendReset.reset_at).getTime()
            : 0;

        return expenses.reduce((total, expense) => {
            const amount = Number(expense.amount || 0);

            if (!Number.isFinite(amount)) {
                return total;
            }

            /*
            Before any reset, include all expenses.
            After a reset, include only later expenses.
            */

            const expenseTime = expense.created_at
                ? new Date(expense.created_at).getTime()
                : 0;

            if (resetTime && expenseTime <= resetTime) {
                return total;
            }

            return total + amount;
        }, 0);
    }

    /*
    Mark all current debt paid and reset current spend.

    This records a settlement instead of deleting expense history.
    */

    async function settleCurrentSpend(amountPaid) {
        const user = await requireUser();
        const amount = Number(amountPaid ?? getCurrentSpend());

        if (!Number.isFinite(amount) || amount < 0) {
            throw new Error("Invalid payment amount.");
        }

        const row = {
            user_id: user.id,
            amount_paid: amount,
            reset_at: new Date().toISOString()
        };

        const { data, error } = await client()
            .from("spend_resets")
            .insert(row)
            .select("id, reset_at, amount_paid")
            .single();

        if (error) {
            console.error("Spend reset error:", error);
            throw new Error(
                "Could not reset current spend. Check that the " +
                "spend_resets table and its INSERT/SELECT policies " +
                "are configured in Supabase. " + error.message
            );
        }

        lastSpendReset = data;
        return data;
    }

    /*
    Update profile.
    */

    async function updateProfile(displayName) {
        const user = await requireUser();
        const cleanName = String(displayName || "").trim();

        const { error } = await client()
            .from("profiles")
            .update({
                display_name: cleanName
            })
            .eq("id", user.id);

        if (error) {
            throw error;
        }

        if (profile) {
            profile.display_name = cleanName;
        }
    }

    /*
    Save meal rates.
    */

    async function saveRates(nextRates) {
        const user = await requireUser();

        const row = {
            user_id: user.id,
            breakfast_rate: Number(nextRates.breakfast),
            lunch_rate: Number(nextRates.lunch),
            dinner_rate: Number(nextRates.dinner),
            extra_rate: Number(nextRates.extra),
            updated_at: new Date().toISOString()
        };

        const { error } = await client()
            .from("settings")
            .upsert(row, {
                onConflict: "user_id"
            });

        if (error) {
            throw error;
        }

        rates = {
            breakfast: Number(nextRates.breakfast),
            lunch: Number(nextRates.lunch),
            dinner: Number(nextRates.dinner),
            extra: Number(nextRates.extra)
        };
    }

    /*
    Public API.
    */

    return {
        loadAll,
        getState,
        recordFor,
        upsertTiffin,
        addPerson,
        deletePerson,
        addExpense,
        deleteExpense,
        getCurrentSpend,
        settleCurrentSpend,
        updateProfile,
        saveRates
    };

})();
