/*
=========================================================
TIFFIN MANAGER
AUTHENTICATION
=========================================================
*/

window.TiffinAuth = (() => {
    const { createClient } = window.supabase;
    const config = window.TIFFIN_CONFIG;

    if (!config || !config.SUPABASE_URL || !config.SUPABASE_KEY) {
        console.error("Supabase configuration is missing.");
    }

    const supabaseClient = createClient(
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

    let mode = "login";

    /*
    Change between login and registration.
    */
    function setMode(newMode) {
        mode = newMode;

        document.getElementById("loginTab")
            .classList.toggle("active", mode === "login");

        document.getElementById("registerTab")
            .classList.toggle("active", mode === "register");

        document.getElementById("nameField")
            .classList.toggle("hidden", mode !== "register");

        document.getElementById("authButton").textContent =
            mode === "login" ? "Sign in" : "Create account";

        document.getElementById("authMessage").textContent = "";
    }

    /*
    Handle login and registration.
    */
    async function submit(event) {
        event.preventDefault();

        const username = document.getElementById("username").value.trim();
        const password = document.getElementById("password").value;
        const message = document.getElementById("authMessage");

        message.textContent = "";

        if (!TiffinUtils.validUsername(username)) {
            message.textContent =
                "Username must contain 3–30 letters, numbers or underscores.";
            return;
        }

        if (password.length < 6) {
            message.textContent =
                "Password must contain at least 6 characters.";
            return;
        }

        const email = TiffinUtils.usernameToEmail(username);

        try {
            /*
            REGISTER
            */
            if (mode === "register") {
                const displayName =
                    document.getElementById("displayName").value.trim()
                    || username;

                const { data, error } = await supabaseClient.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            username,
                            display_name: displayName
                        }
                    }
                });

                if (error) {
                    console.error(error);
                    message.textContent = error.message;
                    return;
                }

                if (!data.session) {
                    message.textContent =
                        "Account created. If email confirmation is enabled, check your email or adjust your Supabase Auth settings.";
                    return;
                }

                TiffinUtils.toast("Account created!");
                return;
            }

            /*
            LOGIN
            */
            const { error } = await supabaseClient.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                console.error(error);
                message.textContent = "Invalid username or password.";
                return;
            }

            TiffinUtils.toast("Signed in!");
        } catch (error) {
            console.error(error);
            message.textContent =
                error.message || "An authentication error occurred.";
        }
    }

    /*
    Log out the current user.
    */
    async function logout() {
        try {
            const { error } = await supabaseClient.auth.signOut();

            if (error) {
                console.error(error);
                TiffinUtils.toast("Could not log out.");
                return;
            }

            TiffinUtils.toast("Logged out.");
        } catch (error) {
            console.error(error);
            TiffinUtils.toast("Could not log out.");
        }
    }

    function getClient() {
        return supabaseClient;
    }

    async function getUser() {
        return await supabaseClient.auth.getUser();
    }

    /*
    Initialize authentication UI and session handling.
    */
    function init() {
        document.getElementById("loginTab")
            .addEventListener("click", () => setMode("login"));

        document.getElementById("registerTab")
            .addEventListener("click", () => setMode("register"));

        document.getElementById("authForm")
            .addEventListener("submit", submit);

        document.getElementById("logoutBtn")
            .addEventListener("click", logout);

        supabaseClient.auth.onAuthStateChange(async (event, session) => {
            if (session) {
                await TiffinApp.enter(session);
            } else {
                TiffinApp.showAuth();
            }
        });

        supabaseClient.auth.getSession().then(({ data, error }) => {
            if (error) {
                console.error(error);
                TiffinApp.showAuth();
                return;
            }

            if (data.session) {
                TiffinApp.enter(data.session);
            } else {
                TiffinApp.showAuth();
            }
        });
    }

    return {
        init,
        getClient,
        getUser,
        logout
    };
})();