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


    /*
    Render all expenses
    */

    function renderExpenses() {

        const {
            expenses
        } =
            TiffinDB.getState();


        const container =
            document
                .getElementById(
                    "allExpenses"
                );


        container.innerHTML =

            expenses.length

                ? expenses
                    .map(expenseHTML)
                    .join("")

                : `

                    <div class="empty">

                        No expenses yet.

                    </div>

                `;

    }


    /*
    Render reports
    */

    function renderReports() {

        const {

            people,

            tiffins,

            expenses,

            rates

        } =
            TiffinDB.getState();


        const month =
            document
                .getElementById(
                    "reportMonth"
                )
                .value ||
            currentDate.slice(
                0,
                7
            );


        const monthTiffins =
            tiffins.filter(
                record =>
                    record.date
                        .startsWith(
                            month
                        )
            );


        const monthExpenses =
            expenses.filter(
                expense =>
                    expense.date
                        .startsWith(
                            month
                        )
            );


        let breakfast = 0;

        let lunch = 0;

        let dinner = 0;

        let extra = 0;


        const personTotals = {};


        /*
        Process tiffins
        */

        monthTiffins.forEach(
            record => {

                breakfast +=
                    Number(
                        record.breakfast ||
                        0
                    );


                lunch +=
                    Number(
                        record.lunch ||
                        0
                    );


                dinner +=
                    Number(
                        record.dinner ||
                        0
                    );


                extra +=
                    Number(
                        record.extra ||
                        0
                    );


                if (
                    !personTotals[
                        record.person_id
                    ]
                ) {

                    personTotals[
                        record.person_id
                    ] = {

                        breakfast: 0,

                        lunch: 0,

                        dinner: 0,

                        extra: 0

                    };

                }


                personTotals[
                    record.person_id
                ].breakfast +=
                    Number(
                        record.breakfast ||
                        0
                    );


                personTotals[
                    record.person_id
                ].lunch +=
                    Number(
                        record.lunch ||
                        0
                    );


                personTotals[
                    record.person_id
                ].dinner +=
                    Number(
                        record.dinner ||
                        0
                    );


                personTotals[
                    record.person_id
                ].extra +=
                    Number(
                        record.extra ||
                        0
                    );

            }
        );


        const totalTiffins =
            breakfast +
            lunch +
            dinner +
            extra;


        const revenue =

            breakfast *
                rates.breakfast +

            lunch *
                rates.lunch +

            dinner *
                rates.dinner +

            extra *
                rates.extra;


        const expenseTotal =
            monthExpenses.reduce(
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


        const profit =
            revenue -
            expenseTotal;


        /*
        Update report cards
        */

        document
            .getElementById(
                "reportTiffins"
            )
            .textContent =
                totalTiffins;


        document
            .getElementById(
                "reportRevenue"
            )
            .textContent =
                TiffinUtils.money(
                    revenue
                );


        document
            .getElementById(
                "reportExpenses"
            )
            .textContent =
                TiffinUtils.money(
                    expenseTotal
                );


        document
            .getElementById(
                "reportProfit"
            )
            .textContent =
                TiffinUtils.money(
                    profit
                );


        /*
        Person report
        */

        document
            .getElementById(
                "reportBody"
            )
            .innerHTML =

            people.length

                ? people.map(
                    person => {

                        const totals =
                            personTotals[
                                person.id
                            ] || {

                                breakfast: 0,

                                lunch: 0,

                                dinner: 0,

                                extra: 0

                            };


                        const total =

                            totals.breakfast +

                            totals.lunch +

                            totals.dinner +

                            totals.extra;


                        const bill =

                            totals.breakfast *
                                rates.breakfast +

                            totals.lunch *
                                rates.lunch +

                            totals.dinner *
                                rates.dinner +

                            totals.extra *
                                rates.extra;


                        return `

                            <tr>

                                <td
                                    class="strong"
                                >

                                    ${TiffinUtils.escape(
                                        person.name
                                    )}

                                </td>


                                <td>

                                    ${totals.breakfast}

                                </td>


                                <td>

                                    ${totals.lunch}

                                </td>


                                <td>

                                    ${totals.dinner}

                                </td>


                                <td
                                    class="strong"
                                >

                                    ${total}

                                </td>


                                <td
                                    class="strong"
                                >

                                    ${TiffinUtils.money(
                                        bill
                                    )}

                                </td>

                            </tr>

                        `;

                    }
                ).join("")

                : `

                    <tr>

                        <td colspan="6">

                            <div class="empty">

                                No people.

                            </div>

                        </td>

                    </tr>

                `;

    }


    /*
    Refresh all data
    */

    async function refresh() {

        await TiffinDB
            .loadAll();

        render();

    }


    /*
    Change date
    */

    function changeDate(
        days
    ) {

        const date =
            new Date(
                currentDate +
                "T00:00:00"
            );


        date.setDate(
            date.getDate() +
            days
        );


        currentDate =
            date
                .toISOString()
                .slice(
                    0,
                    10
                );


        document
            .getElementById(
                "selectedDate"
            )
            .value =
                currentDate;


        renderDashboard();

    }


    /*
    Go to today
    */

    function goToday() {

        currentDate =
            TiffinUtils.today();


        document
            .getElementById(
                "selectedDate"
            )
            .value =
                currentDate;


        renderDashboard();

    }


    /*
    Save profile
    */

    async function saveProfile() {

        try {

            await TiffinDB
                .updateProfile(

                    document
                        .getElementById(
                            "settingsName"
                        )
                        .value
                        .trim()

                );


            await refresh();


            TiffinUtils.toast(
                "Profile saved"
            );

        } catch (error) {

            TiffinUtils.toast(
                error.message
            );

        }

    }


    /*
    Save rates
    */

    async function saveRates() {

        try {

            await TiffinDB
                .saveRates({

                    breakfast:
                        Number(
                            document
                                .getElementById(
                                    "rateBreakfast"
                                )
                                .value
                        ) || 0,

                    lunch:
                        Number(
                            document
                                .getElementById(
                                    "rateLunch"
                                )
                                .value
                        ) || 0,

                    dinner:
                        Number(
                            document
                                .getElementById(
                                    "rateDinner"
                                )
                                .value
                        ) || 0,

                    extra:
                        Number(
                            document
                                .getElementById(
                                    "rateExtra"
                                )
                                .value
                        ) || 0

                });


            await refresh();


            TiffinUtils.toast(
                "Rates saved"
            );

        } catch (error) {

            TiffinUtils.toast(
                error.message
            );

        }

    }


    /*
    Open modal
    */

    function openModal(
        id
    ) {

        document
            .getElementById(id)
            .classList
            .add("show");

    }


    /*
    Close modal
    */

    function closeModal(
        id
    ) {

        document
            .getElementById(id)
            .classList
            .remove("show");

    }


    /*
    Open expense modal
    */

    function openExpenseModal() {

        document
            .getElementById(
                "expenseDate"
            )
            .value =
                currentDate;


        openModal(
            "expenseModal"
        );

    }


    /*
    Initialize application
    */

    async function init() {


        /*
        Navigation
        */

        document
            .querySelectorAll(
                ".nav"
            )
            .forEach(
                button => {

                    button.addEventListener(
                        "click",
                        () => {

                            document
                                .querySelectorAll(
                                    ".nav"
                                )
                                .forEach(
                                    item =>
                                        item
                                            .classList
                                            .remove(
                                                "active"
                                            )
                                );


                            button
                                .classList
                                .add(
                                    "active"
                                );


                            document
                                .querySelectorAll(
                                    ".page"
                                )
                                .forEach(
                                    page =>
                                        page
                                            .classList
                                            .remove(
                                                "active"
                                            )
                                );


                            document
                                .getElementById(
                                    button
                                        .dataset
                                        .page +
                                    "Page"
                                )
                                .classList
                                .add(
                                    "active"
                                );


                            if (
                                button
                                    .dataset
                                    .page ===
                                "reports"
                            ) {

                                renderReports();

                            }

                        }
                    );

                }
            );


        /*
        Date buttons
        */

        document
            .getElementById(
                "previousDay"
            )
            .onclick =
                () =>
                    changeDate(-1);


        document
            .getElementById(
                "nextDay"
            )
            .onclick =
                () =>
                    changeDate(1);


        document
            .getElementById(
                "todayBtn"
            )
            .onclick =
                goToday;


        document
            .getElementById(
                "selectedDate"
            )
            .onchange =
                event => {

                    currentDate =
                        event.target.value;

                    renderDashboard();

                };


        /*
        Add person
        */

        document
            .getElementById(
                "addPersonBtn"
            )
            .onclick =
                () =>
                    openModal(
                        "personModal"
                    );


        /*
        Add expense
        */

        document
            .getElementById(
                "addExpenseBtn"
            )
            .onclick =
                openExpenseModal;


        document
            .getElementById(
                "addExpensePageBtn"
            )
            .onclick =
                openExpenseModal;


        /*
        Save person
        */

        document
            .getElementById(
                "savePersonBtn"
            )
            .onclick =
            async () => {

                const name =
                    document
                        .getElementById(
                            "personName"
                        )
                        .value
                        .trim();


                if (!name) {

                    TiffinUtils.toast(
                        "Enter a name."
                    );

                    return;

                }


                try {

                    await TiffinDB
                        .addPerson(
                            name
                        );


                    closeModal(
                        "personModal"
                    );


                    document
                        .getElementById(
                            "personName"
                        )
                        .value = "";


                    await refresh();


                    TiffinUtils.toast(
                        "Person added."
                    );

                } catch (error) {

                    TiffinUtils.toast(
                        error.message
                    );

                }

            };


        /*
        Save expense
        */

        document
            .getElementById(
                "saveExpenseBtn"
            )
            .onclick =
            async () => {

                const amount =
                    Number(
                        document
                            .getElementById(
                                "expenseAmount"
                            )
                            .value
                    );


                const date =
                    document
                        .getElementById(
                            "expenseDate"
                        )
                        .value;


                if (
                    !date ||
                    amount <= 0
                ) {

                    TiffinUtils.toast(
                        "Enter a date and amount."
                    );

                    return;

                }


                try {

                    await TiffinDB
                        .addExpense({

                            date,

                            category:
                                document
                                    .getElementById(
                                        "expenseCategory"
                                    )
                                    .value,

                            description:
                                document
                                    .getElementById(
                                        "expenseDescription"
                                    )
                                    .value
                                    .trim(),

                            amount

                        });


                    closeModal(
                        "expenseModal"
                    );


                    await refresh();


                    TiffinUtils.toast(
                        "Expense saved."
                    );

                } catch (error) {

                    TiffinUtils.toast(
                        error.message
                    );

                }

            };


        /*
        Profile
        */

        document
            .getElementById(
                "saveProfileBtn"
            )
            .onclick =
                saveProfile;


        /*
        Rates
        */

        document
            .getElementById(
                "saveRatesBtn"
            )
            .onclick =
                saveRates;


        /*
        Report month
        */

        document
            .getElementById(
                "reportMonth"
            )
            .onchange =
                renderReports;


        /*
        Modal close buttons
        */

        document
            .querySelectorAll(
                "[data-close]"
            )
            .forEach(
                button => {

                    button.onclick =
                        () =>
                            closeModal(
                                button
                                    .dataset
                                    .close
                            );

                }
            );


        /*
        Close modal by clicking
        outside the modal card
        */

        document
            .querySelectorAll(
                ".modal"
            )
            .forEach(
                modal => {

                    modal.addEventListener(
                        "click",
                        event => {

                            if (
                                event.target ===
                                modal
                            ) {

                                modal
                                    .classList
                                    .remove(
                                        "show"
                                    );

                            }

                        }
                    );

                }
            );


        /*
        Global click handling
        */

        document.addEventListener(
            "click",
            async event => {


                /*
                Meal button
                */

                const meal =
                    event.target
                        .closest(
                            ".meal"
                        );


                if (meal) {

                    try {

                        await TiffinDB
                            .upsertTiffin(

                                meal
                                    .dataset
                                    .person,

                                currentDate,

                                meal
                                    .dataset
                                    .meal

                            );


                        await refresh();


                        TiffinUtils.toast(
                            "Saved automatically."
                        );

                    } catch (error) {

                        TiffinUtils.toast(
                            error.message
                        );

                    }

                }


                /*
                Delete person
                */

                const deletePerson =
                    event.target
                        .closest(
                            ".delete-person"
                        );


                if (deletePerson) {

                    if (
                        !confirm(
                            "Delete this person?"
                        )
                    ) {

                        return;

                    }


                    try {

                        await TiffinDB
                            .deletePerson(
                                deletePerson
                                    .dataset
                                    .id
                            );


                        await refresh();


                        TiffinUtils.toast(
                            "Person deleted."
                        );

                    } catch (error) {

                        TiffinUtils.toast(
                            error.message
                        );

                    }

                }


                /*
                Delete expense
                */

                const deleteExpense =
                    event.target
                        .closest(
                            ".delete-expense"
                        );


                if (deleteExpense) {

                    if (
                        !confirm(
                            "Delete this expense?"
                        )
                    ) {

                        return;

                    }


                    try {

                        await TiffinDB
                            .deleteExpense(
                                deleteExpense
                                    .dataset
                                    .id
                            );


                        await refresh();


                        TiffinUtils.toast(
                            "Expense deleted."
                        );

                    } catch (error) {

                        TiffinUtils.toast(
                            error.message
                        );

                    }

                }

            }
        );


        /*
        Default expense date
        */

        document
            .getElementById(
                "expenseDate"
            )
            .value =
                currentDate;

    }


    return {

        init,

        enter,

        showAuth

    };

})();


/*
=========================================================
START APPLICATION
=========================================================
*/

document.addEventListener(
    "DOMContentLoaded",
    () => {

        TiffinApp.init();

        TiffinAuth.init();

    }
);