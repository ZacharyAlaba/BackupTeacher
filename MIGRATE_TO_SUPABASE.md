Migration steps to use Supabase instead of Prisma

Overview
- This project already includes Supabase helpers under `utils/supabase` and the `@supabase` packages.
- The build scripts currently run Prisma by default; we updated the build script so Prisma is opt-in via `USE_PRISMA=true`.

Quick actions to deploy with Supabase
1. Create a Supabase project and get the `SUPABASE_URL` and `SUPABASE_ANON_KEY` (publishable) and `SUPABASE_SERVICE_ROLE_KEY` (server-side secret).
2. Set these environment variables in your deployment platform as:
   - `NEXT_PUBLIC_SUPABASE_URL` = SUPABASE_URL
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = SUPABASE_ANON_KEY
   - `SUPABASE_SERVICE_ROLE_KEY` = SUPABASE_SERVICE_ROLE_KEY

Using Supabase in server and client code
- Client components/pages: import `createClient` from `utils/supabase/client`.
- Server components / edge code: import `createClient` from `utils/supabase/server` and pass `cookies()` where required.

Data migration and seeding
- If you currently have data in a Prisma-managed database, export it and import into Supabase using the Supabase import tools or write a script that inserts via `@supabase/supabase-js` and run it during deployment (set an env var like `RUN_SUPABASE_SEED` and add a script to `package.json`).

Replacing Prisma calls (example)
- Prisma: `await prisma.student.findFirst({ where: { id } })`
- Supabase: `const { data, error } = await supabase.from('student').select('*').eq('id', id).maybeSingle()`

Next steps I can take for you
- Replace specific API routes and server utilities that use `prisma` with `supabase` calls (file-by-file).
- Add a seeding script that uses the Supabase Admin key and wire it into your CI/CD.

If you want, tell me which APIs or files you want migrated first and I'll update them.
