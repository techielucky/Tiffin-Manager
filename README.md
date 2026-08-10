# Tiffin Manager V1 frontend

Files:
- index.html
- css/style.css
- js/config.js
- js/utils.js
- js/auth.js
- js/database.js
- js/app.js

Before testing:
1. Create Supabase project.
2. Run the database SQL from the previous step.
3. Complete the RLS policies and signup trigger.
4. In js/config.js, replace the two placeholders with your Supabase Project URL and public Publishable/anon key.
5. Enable Email provider in Supabase Auth and disable Confirm email.
6. Run with VS Code Live Server (recommended) rather than file://.

Never put the Supabase service_role/secret key in frontend code.
