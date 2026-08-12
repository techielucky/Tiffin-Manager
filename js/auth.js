/*
=========================================================
TIFFIN MANAGER
AUTHENTICATION
=========================================================
*/

window.TiffinAuth = (() => {

    /*
    Get Supabase createClient
    */

    const {
        createClient
    } = window.supabase;


    /*
    Get configuration
    */

    const config =
        window.TIFFIN_CONFIG;


    /*
    Check configuration
    */

    if (
        !config ||
        !config.SUPABASE_URL ||
        !config.SUPABASE_KEY
    ) {

        console.error(
            "Supabase configuration is missing."
        );

    }


    /*
    Create Supabase client

    persistSession = true

    means the login session can
    remain when the user returns.
    */

    const supabaseClient =
        createClient(
            config.SUPABASE_URL,
            config.SUPABASE_KEY,
            {
                auth: {

                    persistSession: true,

                    autoRefreshToken: true,

                    detectSessionInUrl: true

                }
            }
        );


    /*
    Login or Register
    */

    let mode = "login";


    /*
    Change authentication mode
    */

    function setMode(newMode) {

        mode = newMode;


        /*
        Tabs
        */

        document
            .getElementById("loginTab")
            .classList
            .toggle(
                "active",
                mode === "login"
            );


        document
            .getElementById("registerTab")
            .classList
            .toggle(
                "active",
                mode === "register"
            );


        /*
        Show/hide name field
        */

        document
            .getElementById("nameField")
            .classList
            .toggle(
                "hidden",
                mode !== "register"
            );


        /*
        Change button text
        */

        document
            .getElementById("authButton")
            .textContent =
                mode === "login"
                    ? "Sign in"
                    : "Create account";


        /*
        Clear previous message
        */

        document
            .getElementById("authMessage")
            .textContent = "";

    }


    /*
    Login/Register form
    */

    async function submit(event) {

        event.preventDefault();


        const username =
            document
                .getElementById("username")
                .value
                .trim();


        const password =
            document
                .getElementById("password")
                .value;


        const message =
            document
                .getElementById("authMessage");


        message.textContent = "";


        /*
        Validate username
        */

        if (
            !TiffinUtils
                .validUsername(username)
        ) {

            message.textContent =
                "Username must contain 3–30 letters, numbers or underscores.";

            return;

        }


        /*
        Validate password
        */

        if (password.length < 6) {

            message.textContent =
                "Password must contain at least 6 characters.";

            return;

        }


        /*
        Internal email

        User only sees username.
        */

        const email =
            TiffinUtils
                .usernameToEmail(
                    username
                );


        /* =================================================
           REGISTER
        ================================================= */

        if (mode === "register") {

            const displayName =
                document
                    .getElementById(
                        "displayName"
                    )
                    .value
                    .trim()
                    || username;


            const {
                data,
                error
            } =
                await supabaseClient
                    .auth
                    .signUp({

                        email,

                        password,

                        options: {

                            data: {

                                username,

                                display_name:
                                    displayName

                            }

                        }

                    });


            /*
            Registration error
            */

            if (error) {

                console.error(
                    error
                );

                message.textContent =
                    error.message;

                return;

            }


            /*
            If email confirmation
            is enabled, there won't
            necessarily be a session.
            */

            if (!data.session) {

                message.textContent =
                    "Account created. If confirmation is enabled, disable Confirm email in Supabase Auth settings.";

                return;

            }


            TiffinUtils.toast(
                "Account created!"
            );

            return;

        }


        /* =================================================
           LOGIN
        ================================================= */

        const {
            error
        } =
            await supabaseClient
                .auth
                .signInWithPassword({

                    email,

                    password

                });


        if (error) {

            console.error(
                error
            );

            message.textContent =
                "Invalid username or password.";

            return;

        }


        TiffinUtils.toast(
            "Signed in!"
        );

    }


    /*
    Logout
    */

    async function logout() {

        const {
            error
        } =
            await supabaseClient
                .auth
                .signOut();


        if (error) {

            console.error(
                error
            );

            TiffinUtils.toast(
                "Could not log out."
            );

            return;

        }

        TiffinUtils.toast(
            "Logged out."
        );

    }


    /*
    Return Supabase client
    */

    function getClient() {

        return supabaseClient;

    }


    /*
    Get current user
    */

    async function getUser() {

        return await supabaseClient
            .auth
            .getUser();

    }


    /*
    Initialize authentication
    */

    function init() {


        /*
        Login tab
        */

        document
            .getElementById("loginTab")
            .addEventListener(
                "click",
                () => setMode("login")
            );


        /*
        Register tab
        */

        document
            .getElementById("registerTab")
            .addEventListener(
                "click",
                () => setMode("register")
            );


        /*
        Authentication form
        */

        document
            .getElementById("authForm")
            .addEventListener(
                "submit",
                submit
            );


        /*
        Logout
        */

        document
            .getElementById("logoutBtn")
            .addEventListener(
                "click",
                logout
            );


        /*
        Listen for authentication
        state changes.
        */

        supabaseClient
            .auth
            .onAuthStateChange(
                async (
                    event,
                    session
                ) => {

                    if (session) {

                        await TiffinApp
                            .enter(session);

                    } else {

                        TiffinApp
                            .showAuth();

                    }

                }
            );


        /*
        Check existing session.

        This is what allows
        the user to return later
        without signing in again.
        */

        supabaseClient
            .auth
            .getSession()
            .then(
                ({ data }) => {

                    if (
                        data.session
                    ) {

                        TiffinApp
                            .enter(
                                data.session
                            );

                    } else {

                        TiffinApp
                            .showAuth();

                    }

                }
            );

    }


    /*
    Public functions
    */

    return {

        init,

        getClient,

        getUser,

        logout

    };

})();