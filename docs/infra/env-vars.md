# Environment variables

## Public vs server-only

In Next.js, any variable prefixed with `NEXT_PUBLIC_` is embedded into client bundles and is readable by anyone using the app.

- **Public:** `NEXT_PUBLIC_*` (safe to expose)
- **Server-only:** everything else (must never be used in client components)

Do not put secrets in `NEXT_PUBLIC_*` vars.

## Local development

- Copy `.env.example` → `.env.local`
- Fill in dev values

`.env.local` is not committed.
