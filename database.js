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

        return TiffinAuth
            .getClient();

    }


    /*
    Load all current user's data
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

            settingsResult

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
                    .maybeSingle()

            ]);


        /*
        Check errors
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


        /*
        Store data locally
        */

        profile =
            profileResult.data;


        people =
            peopleResult.data || [];


        tiffins =
            tiffinResult.data || [];


        expenses =
            expenseResult.data || [];


        /*
        Load meal rates
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

            rates

        };

    }


    /*
    Return loaded application state
    */

    function getState() {

        return {

            profile,

            people,

            tiffins,

            expenses,

            rates

        };

    }


    /*
    Find a tiffin record
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
    Add / toggle meal
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
        Toggle meal
        */

        record[meal] =
            record[meal]
                ? 0
                : 1;


        /*
        Save to database
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
    Add person
    */

    async function addPerson(
        name
    ) {

        const {
            data: userData
        } =
            await TiffinAuth
                .getUser();


        const row = {

            id:
                TiffinUtils.id(),

            user_id:
                userData.user.id,

            name

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
    Delete person
    */

    async function deletePerson(
        id
    ) {

        const {
            error
        } =
            await client()
                .from("people")
                .delete()
                .eq(
                    "id",
                    id
                );


        if (error) {

            throw error;

        }


        people =
            people.filter(
                person =>
                    person.id !== id
            );

    }


    /*
    Add expense
    */

    async function addExpense(
        row
    ) {

        const {
            data: userData
        } =
            await TiffinAuth
                .getUser();


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
    Delete expense
    */

    async function deleteExpense(
        id
    ) {

        const {
            error
        } =
            await client()
                .from("expenses")
                .delete()
                .eq(
                    "id",
                    id
                );


        if (error) {

            throw error;

        }


        expenses =
            expenses.filter(
                expense =>
                    expense.id !== id
            );

    }


    /*
    Update profile
    */

    async function updateProfile(
        displayName
    ) {

        const {
            data: userData
        } =
            await TiffinAuth
                .getUser();


        const {
            error
        } =
            await client()
                .from("profiles")
                .update({

                    display_name:
                        displayName

                })
                .eq(
                    "id",
                    userData.user.id
                );


        if (error) {

            throw error;

        }


        profile.display_name =
            displayName;

    }


    /*
    Save meal rates
    */

    async function saveRates(
        nextRates
    ) {

        const {
            data: userData
        } =
            await TiffinAuth
                .getUser();


        const row = {

            user_id:
                userData.user.id,

            breakfast_rate:
                nextRates.breakfast,

            lunch_rate:
                nextRates.lunch,

            dinner_rate:
                nextRates.dinner,

            extra_rate:
                nextRates.extra,

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


    return {

        loadAll,

        getState,

        recordFor,

        upsertTiffin,

        addPerson,

        deletePerson,

        addExpense,

        deleteExpense,

        updateProfile,

        saveRates

    };

})();