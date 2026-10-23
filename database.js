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
    =========================================================
    Default meal prices
    =========================================================
    */

    let rates = {

        breakfast: 30,

        lunch: 50,

        dinner: 50,

        extra: 50

    };


    /*
    =========================================================
    Get Supabase client
    =========================================================
    */

    function client() {

        return TiffinAuth
            .getClient();

    }


    /*
    =========================================================
    Load all current user's data
    =========================================================
    */

    async function loadAll() {

        const {
            data: userData,
            error: userError
        } =
            await TiffinAuth
                .getUser();


        if (
            userError ||
            !userData.user
        ) {

            throw (
                userError ||
                new Error(
                    "You are not signed in."
                )
            );

        }


        const userId =
            userData.user.id;


        /*
        Load everything.

        RLS automatically restricts
        these queries to the
        logged-in user's data.
        */

        const [

            profileResult,

            peopleResult,

            tiffinResult,

            expenseResult,

            settingsResult,

            resetResult

        ] =
            await Promise.all([

                client()
                    .from("profiles")
                    .select("*")
                    .eq(
                        "id",
                        userId
                    )
                    .single(),


                client()
                    .from("people")
                    .select("*")
                    .eq(
                        "user_id",
                        userId
                    )
                    .order(
                        "name"
                    ),


                client()
                    .from("tiffin_records")
                    .select("*")
                    .eq(
                        "user_id",
                        userId
                    )
                    .order(
                        "date"
                    ),


                client()
                    .from("expenses")
                    .select("*")
                    .eq(
                        "user_id",
                        userId
                    )
                    .order(
                        "date",
                        {
                            ascending:
                                false
                        }
                    ),


                client()
                    .from("settings")
                    .select("*")
                    .eq(
                        "user_id",
                        userId
                    )
                    .maybeSingle(),

                client()
                    .from("spend_resets")
                    .select("reset_at, amount_paid")
                    .eq("user_id", userId)
                    .order("reset_at", { ascending: false })
                    .limit(1)
                    .maybeSingle()

            ]);


        /*
        =========================================================
        Check errors
        =========================================================
        */

        if (
            profileResult.error &&
            profileResult.error.code !==
                "PGRST116"
        ) {

            throw profileResult.error;

        }


        if (
            peopleResult.error
        ) {

            throw peopleResult.error;

        }


        if (
            tiffinResult.error
        ) {

            throw tiffinResult.error;

        }


        if (
            expenseResult.error
        ) {

            throw expenseResult.error;

        }


        if (
            settingsResult.error
        ) {

            throw settingsResult.error;

        }

        if (resetResult.error) {
            throw resetResult.error;
        }


        /*
        =========================================================
        Store data locally
        =========================================================
        */

        profile =
            profileResult.data;


        people =
            peopleResult.data || [];


        tiffins =
            tiffinResult.data || [];


        expenses =
            expenseResult.data || [];

        lastSpendReset = resetResult.data || null;


        /*
        =========================================================
        Load meal rates
        =========================================================
        */

        if (
            settingsResult.data
        ) {

            rates = {

                breakfast:
                    Number(
                        settingsResult
                            .data
                            .breakfast_rate
                    ),

                lunch:
                    Number(
                        settingsResult
                            .data
                            .lunch_rate
                    ),

                dinner:
                    Number(
                        settingsResult
                            .data
                            .dinner_rate
                    ),

                extra:
                    Number(
                        settingsResult
                            .data
                            .extra_rate
                    )

            };

        }


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
    =========================================================
    Return loaded application state
    =========================================================
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
    =========================================================
    Find a tiffin record
    =========================================================
    */

    function recordFor(
        personId,
        date
    ) {

        return tiffins.find(
            record =>

                record.person_id ===
                    personId &&

                record.date ===
                    date

        );

    }


    /*
    =========================================================
    Add / toggle meal
    =========================================================
    */

    async function upsertTiffin(
        personId,
        date,
        meal
    ) {

        const {
            data: userData
        } =
            await TiffinAuth
                .getUser();


        const userId =
            userData.user.id;


        let record =
            recordFor(
                personId,
                date
            );


        /*
        Create record if it
        doesn't exist.
        */

        if (!record) {

            record = {

                id:
                    TiffinUtils.id(),

                user_id:
                    userId,

                person_id:
                    personId,

                date,

                breakfast: 0,

                lunch: 0,

                dinner: 0,

                extra: 0

            };


            tiffins.push(
                record
            );

        }


        /*
        =========================================================
        Toggle meal
        =========================================================
        */

        record[meal] =
            record[meal]
                ? 0
                : 1;


        /*
        =========================================================
        Save to database
        =========================================================
        */

        const {
            error
        } =
            await client()
                .from(
                    "tiffin_records"
                )
                .upsert(
                    record,
                    {
                        onConflict:
                            "user_id,person_id,date"
                    }
                );


        if (error) {

            throw error;

        }

    }


    /*
    =========================================================
    Add person
    =========================================================
    */

    async function addPerson(
        name
    ) {

        const {
            data: userData
        } =
            await TiffinAuth
                .getUser();


        if (!userData?.user) {

            throw new Error(
                "You are not signed in."
            );

        }


        const cleanName =
            String(name || "")
                .trim();


        if (!cleanName) {

            throw new Error(
                "Person name is required."
            );

        }


        const row = {

            id:
                TiffinUtils.id(),

            user_id:
                userData.user.id,

            name:
                cleanName

        };


        const {
            error
        } =
            await client()
                .from("people")
                .insert(row);


        if (error) {

            throw error;

        }


        people.push(
            row
        );

    }


    /*
    =========================================================
    Delete person
    =========================================================
    */

    async function deletePerson(id) {
        const { data: userData, error: userError } = await TiffinAuth.getUser();
        if (userError || !userData?.user) {
            throw userError || new Error("You are not signed in.");
        }

        const userId = userData.user.id;
        const person = people.find(item => String(item.id) === String(id));
        if (!person) throw new Error("Person not found. Refresh the page and try again.");

        // Remove this person's tiffin rows first. This also works when the
        // database foreign key was created without ON DELETE CASCADE.
        const { error: tiffinError } = await client()
            .from("tiffin_records")
            .delete()
            .eq("person_id", id)
            .eq("user_id", userId);
        if (tiffinError) {
            console.error("Delete person's tiffin records failed:", tiffinError);
            throw new Error(`Could not delete this person's tiffin records. Check the tiffin_records DELETE policy in Supabase. ${tiffinError.message}`);
        }

        const { data: deletedRows, error } = await client()
            .from("people")
            .delete()
            .eq("id", id)
            .eq("user_id", userId)
            .select("id");

        if (error) {
            console.error("Delete person error:", error);
            throw new Error(`Could not delete person. Check the people DELETE policy in Supabase. ${error.message}`);
        }
        if (!deletedRows || deletedRows.length === 0) {
            throw new Error("Supabase did not delete this person. Check that the people table has a DELETE policy for the signed-in user.");
        }

        people = people.filter(item => String(item.id) !== String(id));
        tiffins = tiffins.filter(item => String(item.person_id) !== String(id));
    }

    /*
    =========================================================
    Add expense
    =========================================================
    */

    async function addExpense(
        row
    ) {

        const {
            data: userData
        } =
            await TiffinAuth
                .getUser();


        if (!userData?.user) {

            throw new Error(
                "You are not signed in."
            );

        }


        row.id =
            TiffinUtils.id();


        row.user_id =
            userData.user.id;


        const {
            error
        } =
            await client()
                .from("expenses")
                .insert(row);


        if (error) {

            throw error;

        }


        expenses.unshift(
            row
        );

    }


    /*
    =========================================================
    Delete expense
    =========================================================
    */

    async function deleteExpense(id) {
        // Trim whitespace before passing the UUID to Supabase.
        const expenseId = String(id ?? "").trim();
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

        if (!uuidPattern.test(expenseId)) {
            throw new Error("Invalid expense ID. Refresh the page and try again.");
        }

        const { data: userData, error: userError } = await TiffinAuth.getUser();
        if (userError || !userData?.user) {
            throw userError || new Error("You are not signed in.");
        }

        const userId = userData.user.id;
        const { data: deletedRows, error } = await client()
            .from("expenses")
            .delete()
            .eq("id", expenseId)
            .eq("user_id", userId)
            .select("id");

        if (error) {
            console.error("Delete expense error:", error);
            throw new Error(`Could not delete expense. Check the expenses DELETE policy in Supabase. ${error.message}`);
        }
        if (!deletedRows || deletedRows.length === 0) {
            throw new Error("Supabase did not delete this expense. Check that the expenses table has a DELETE policy for the signed-in user.");
        }

        expenses = expenses.filter(item => String(item.id).trim() !== expenseId);
    }

    /*
    =========================================================
    Mark current spend as paid without deleting history
    =========================================================
    */
    async function settleCurrentSpend(amountPaid) {
        const { data: userData, error: userError } = await TiffinAuth.getUser();
        if (userError || !userData?.user) {
            throw userError || new Error("You are not signed in.");
        }

        const row = {
            user_id: userData.user.id,
            amount_paid: Number(amountPaid || 0),
            reset_at: new Date().toISOString()
        };

        const { data, error } = await client()
            .from("spend_resets")
            .insert(row)
            .select("reset_at, amount_paid")
            .single();

        if (error) throw error;
        lastSpendReset = data;
        return data;
    }


    /*
    =========================================================
    Update profile
    =========================================================
    */

    async function updateProfile(
        displayName
    ) {

        const {
            data: userData,
            error: userError
        } =
            await TiffinAuth
                .getUser();


        if (
            userError ||
            !userData?.user
        ) {

            throw (
                userError ||
                new Error(
                    "You are not signed in."
                )
            );

        }


        const cleanName =
            String(displayName || "")
                .trim();


        const {
            error
        } =
            await client()
                .from("profiles")
                .update({

                    display_name:
                        cleanName

                })
                .eq(
                    "id",
                    userData.user.id
                );


        if (error) {

            throw error;

        }


        if (profile) {

            profile.display_name =
                cleanName;

        }

    }


    /*
    =========================================================
    Save meal rates
    =========================================================
    */

    async function saveRates(
        nextRates
    ) {

        const {
            data: userData,
            error: userError
        } =
            await TiffinAuth
                .getUser();


        if (
            userError ||
            !userData?.user
        ) {

            throw (
                userError ||
                new Error(
                    "You are not signed in."
                )
            );

        }


        const row = {

            user_id:
                userData.user.id,

            breakfast_rate:
                Number(
                    nextRates.breakfast
                ),

            lunch_rate:
                Number(
                    nextRates.lunch
                ),

            dinner_rate:
                Number(
                    nextRates.dinner
                ),

            extra_rate:
                Number(
                    nextRates.extra
                ),

            updated_at:
                new Date()
                    .toISOString()

        };


        const {
            error
        } =
            await client()
                .from("settings")
                .upsert(
                    row,
                    {
                        onConflict:
                            "user_id"
                    }
                );


        if (error) {

            throw error;

        }


        rates = {

            ...nextRates

        };

    }


    /*
    =========================================================
    Public API
    =========================================================
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

        settleCurrentSpend,

        updateProfile,

        saveRates

    };

})();