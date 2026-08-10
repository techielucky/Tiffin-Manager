/*
=========================================================
TIFFIN MANAGER
UTILITY FUNCTIONS
=========================================================
*/

window.TiffinUtils = {

    /*
    Get today's date
    Format:

    YYYY-MM-DD
    */

    today() {

        const date = new Date();

        const year =
            date.getFullYear();

        const month =
            String(date.getMonth() + 1)
                .padStart(2, "0");

        const day =
            String(date.getDate())
                .padStart(2, "0");

        return `${year}-${month}-${day}`;
    },


    /*
    Generate unique ID
    */

    id() {

        return crypto.randomUUID();

    },


    /*
    Format money in Indian Rupees
    */

    money(value) {

        return "₹" +
            Number(value || 0)
                .toLocaleString("en-IN", {
                    maximumFractionDigits: 2
                });

    },


    /*
    Convert database date
    into readable Indian date
    */

    dateText(value) {

        if (!value) return "";

        return new Date(
            value + "T00:00:00"
        ).toLocaleDateString(
            "en-IN",
            {
                day: "numeric",
                month: "long",
                year: "numeric"
            }
        );

    },


    /*
    Escape HTML

    Important when displaying
    user-entered names/descriptions.
    */

    escape(value) {

        return String(value ?? "")
            .replace(
                /[&<>"']/g,
                character => ({
                    "&": "&amp;",
                    "<": "&lt;",
                    ">": "&gt;",
                    '"': "&quot;",
                    "'": "&#039;"
                }[character])
            );

    },


    /*
    Convert username into
    internal Supabase Auth email.

    Example:

    lucky

    becomes

    lucky@tiffin.local
    */

    usernameToEmail(username) {

        return (
            username
                .toLowerCase()
                .trim()
            + "@tiffin.local"
        );

    },


    /*
    Username validation

    Allowed:

    letters
    numbers
    underscore
    */

    validUsername(username) {

        return /^[a-zA-Z0-9_]{3,30}$/
            .test(username);

    },


    /*
    Show small notification
    */

    toast(message) {

        const toast =
            document.getElementById("toast");

        if (!toast) return;

        toast.textContent = message;

        toast.classList.add("show");

        clearTimeout(
            window.__toastTimer
        );

        window.__toastTimer =
            setTimeout(() => {

                toast.classList.remove(
                    "show"
                );

            }, 2200);

    }

};