/*
=========================================================
TIFFIN MANAGER
MAIN APPLICATION
=========================================================
*/

window.TiffinApp = (() => {

    /*
    Currently selected date
    */

    let currentDate =
        TiffinUtils.today();


    /*
    Enter application after login
    */

    async function enter(session) {

        /*
        Hide login
        */

        document
            .getElementById("authScreen")
            .classList
            .add("hidden");


        /*
        Show application
        */

        document
            .getElementById("appScreen")
            .classList
            .remove("hidden");


        try {

            /*
            Load database
            */

            await TiffinDB
                .loadAll();


            /*
            Set dates
            */

            document
                .getElementById(
                    "selectedDate"
                )
                .value =
                    currentDate;


            document
                .getElementById(
                    "reportMonth"
                )
                .value =
                    currentDate
                        .slice(0, 7);


            /*
            Render
            */

            render();

        } catch (error) {

            console.error(
                error
            );

            TiffinUtils.toast(
                error.message ||
                "Could not load your data."
            );

        }

    }


    /*
    Show authentication page
    */

    function showAuth() {

        document
            .getElementById(
                "appScreen"
            )
            .classList
            .add("hidden");


        document
            .getElementById(
                "authScreen"
            )
            .classList
            .remove("hidden");

    }


    /*
    Render everything
    */

    function render() {

        const state =
            TiffinDB.getState();


        /*
        Header
        */

        const username =
            state.profile?.username ||
            "";


        document
            .getElementById(
                "headerUsername"
            )
            .textContent =
                "@" + username;


        /*
        Settings
        */

        document
            .getElementById(
                "settingsUsername"
            )
            .value =
                username;


        document
            .getElementById(
                "settingsName"
            )
            .value =
                state.profile
                    ?.display_name ||
                "";


        /*
        Meal rates
        */

        document
            .getElementById(
                "rateBreakfast"
            )
            .value =
                state.rates
                    .breakfast;


        document
            .getElementById(
                "rateLunch"
            )
            .value =
                state.rates
                    .lunch;


        document
            .getElementById(
                "rateDinner"
            )
            .value =
                state.rates
                    .dinner;


        document
            .getElementById(
                "rateExtra"
            )
            .value =
                state.rates
                    .extra;


        /*
        Render sections
        */

        renderDashboard();

        renderPeople();

        renderExpenses();

        renderReports();

    }


    /*
    Dashboard
    */

    function renderDashboard() {

        const {

            people,

            tiffins,

            expenses,

            rates

        } =
            TiffinDB.getState();


        /*
        Number of people
        */

        document
            .getElementById(
                "peopleCount"
            )
            .textContent =
                people.length;


        /*
        Date title
        */

        document
            .getElementById(
                "dayTitle"
            )
            .textContent =
                TiffinUtils
                    .dateText(
                        currentDate
                    );


        const body =
            document
                .getElementById(
                    "tiffinBody"
                );


        /*
        No people
        */

        if (!people.length) {

            body.innerHTML = `

                <tr>

                    <td colspan="5">

                        <div class="empty">

                            Add people first
                            from the People section.

                        </div>

                    </td>

                </tr>

            `;

        } else {


            /*
            Create people rows
            */

            body.innerHTML =
                people.map(
                    person => {

                        const record =
                            TiffinDB.recordFor(
                                person.id,
                                currentDate
                            ) || {};


                        const breakfast =
                            Number(
                                record.breakfast ||
                                0
                            );


                        const lunch =
                            Number(
                                record.lunch ||
                                0
                            );


                        const dinner =
                            Number(
                                record.dinner ||
                                0
                            );


                        return `

                        <tr>

                            <td class="strong">

                                ${TiffinUtils.escape(
                                    person.name
                                )}

                            </td>


                            <td>

                                <button

                                    class="
                                        meal
                                        ${breakfast
                                            ? "on"
                                            : ""}
                                    "

                                    data-person="
                                        ${person.id}
                                    "

                                    data-meal="
                                        breakfast
                                    "

                                >

                                    ${breakfast
                                        ? "✓"
                                        : ""}

                                </button>

                            </td>


                            <td>

                                <button

                                    class="
                                        meal
                                        ${lunch
                                            ? "on"
                                            : ""}
                                    "

                                    data-person="
                                        ${person.id}
                                    "

                                    data-meal="
                                        lunch
                                    "

                                >

                                    ${lunch
                                        ? "✓"
                                        : ""}

                                </button>

                            </td>


                            <td>

                                <button

                                    class="
                                        meal
                                        ${dinner
                                            ? "on"
                                            : ""}
                                    "

                                    data-person="
                                        ${person.id}
                                    "

                                    data-meal="
                                        dinner
                                    "

                                >

                                    ${dinner
                                        ? "✓"
                                        : ""}

                                </button>

                            </td>


                            <td class="strong">

                                ${
                                    breakfast +
                                    lunch +
                                    dinner
                                }

                            </td>

                        </tr>

                        `;

                    }
                ).join("");

        }


        /*
        Calculate today's totals
        */

        const todayRows =
            tiffins.filter(
                record =>
                    record.date ===
                    currentDate
            );


        let totalTiffins = 0;

        let revenue = 0;


        todayRows.forEach(
            record => {

                const breakfast =
                    Number(
                        record.breakfast ||
                        0
                    );


                const lunch =
                    Number(
                        record.lunch ||
                        0
                    );


                const dinner =
                    Number(
                        record.dinner ||
                        0
                    );


                const extra =
                    Number(
                        record.extra ||
                        0
                    );


                totalTiffins +=
                    breakfast +
                    lunch +
                    dinner +
                    extra;


                revenue +=

                    breakfast *
                        rates.breakfast +

                    lunch *
                        rates.lunch +

                    dinner *
                        rates.dinner +

                    extra *
                        rates.extra;

            }
        );


        /*
        Today's expenses
        */

        const todayExpenses =
            expenses.filter(
                expense =>
                    expense.date ===
                    currentDate
            );


        const expenseTotal =
            todayExpenses.reduce(
                (
                    total,
                    expense
                ) =>
                    total +
                    Number(
                        expense.amount ||
                        0
                    ),
                0
            );


        /*
        Update dashboard
        */

        document
            .getElementById(
                "tiffinCount"
            )
            .textContent =
                totalTiffins;


        document
            .getElementById(
                "expenseTotal"
            )
            .textContent =
                TiffinUtils.money(
                    expenseTotal
                );


        document
            .getElementById(
                "revenueTotal"
            )
            .textContent =
                TiffinUtils.money(
                    revenue
                );


        /*
        Today's expenses list
        */

        document
            .getElementById(
                "dayExpenses"
            )
            .innerHTML =

            todayExpenses.length

                ? todayExpenses
                    .map(expenseHTML)
                    .join("")

                : `

                    <div class="empty">

                        No expenses today.

                    </div>

                `;

    }


    /*
    Expense HTML
    */

    function expenseHTML(
        expense
    ) {

        return `

            <div class="list-item">

                <div>

                    <div class="strong">

                        ${TiffinUtils.escape(
                            expense.category
                        )}

                    </div>


                    <div class="muted">

                        ${TiffinUtils.dateText(
                            expense.date
                        )}

                        ${
                            expense.description
                                ? " • " +
                                  TiffinUtils.escape(
                                      expense.description
                                  )
                                : ""
                        }

                    </div>

                </div>


                <div class="item-right">

                    <strong>

                        ${TiffinUtils.money(
                            expense.amount
                        )}

                    </strong>


                    <button

                        class="
                            btn
                            danger
                            delete-expense
                        "

                        data-id="
                            ${expense.id}
                        "

                        type="button"

                    >

                        Delete

                    </button>

                </div>

            </div>

        `;

    }


    /*
    Render People
    */

    function renderPeople() {

        const {
            people
        } =
            TiffinDB.getState();


        const container =
            document
                .getElementById(
                    "peopleGrid"
                );


        if (!people.length) {

            container.innerHTML = `

                <div class="
                    card
                    empty-card
                ">

                    <div class="empty">

                        No people added yet.

                    </div>

                </div>

            `;

            return;

        }


        container.innerHTML =
            people.map(
                person => `

                    <div
                        class="person-card"
                    >

                        <div
                            class="person-info"
                        >

                            <div class="avatar">

                                ${TiffinUtils.escape(
                                    person.name
                                        [0]
                                        ?.toUpperCase()
                                    || "?"
                                )}

                            </div>


                            <div>

                                <strong>

                                    ${TiffinUtils.escape(
                                        person.name
                                    )}

                                </strong>


                                <div
                                    class="muted"
                                >

                                    Tracked person

                                </div>

                            </div>

                        </div>


                        <button

                            class="
                                btn
                                danger
                                delete-person
                            "

                            data-id="
                                ${person.id}
                            "

                            type="button"

                        >

                            Delete

                        </button>

                    </div>

                `
            ).join("");

    } 