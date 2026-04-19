# LeaderSmart Foundation Files

This is the foundation for the LeaderSmart Next.js app. Built in a previous Claude session with strategy, database design, and architecture decisions already made.

## What's in this directory

| File | Purpose |
|---|---|
| `package.json` | Next.js 15, React 19, Tailwind, Supabase SSR — all dependencies pinned |
| `tsconfig.json` | TypeScript config with `@/*` path alias |
| `next.config.mjs` | Next.js config with Supabase image domains |
| `tailwind.config.ts` | LeaderSmart brand tokens (brand-700 blue, flame-600 orange) |
| `postcss.config.mjs` | PostCSS for Tailwind |
| `.env.example` | Environment variable template |
| `.gitignore` | Standard Next.js gitignore |
| `src/middleware.ts` | Auth middleware on every request |
| `src/lib/supabase/client.ts` | Browser-side Supabase client |
| `src/lib/supabase/server.ts` | Server component Supabase client |
| `src/lib/supabase/middleware.ts` | Session refresh helper |
| `src/lib/types.ts` | TypeScript types matching the Supabase schema |
| `src/lib/i18n.ts` | Translation dictionary (English + French) |
| `src/lib/cn.ts` | Tailwind class merge helper |
| `src/app/globals.css` | Global Tailwind styles + utility classes |
| `src/app/layout.tsx` | Root layout with Inter font |

## Quick start

```bash
# Install dependencies
npm install

# Copy environment template and fill in your Supabase credentials
cp .env.example .env.local
# Edit .env.local with your anon key

# Verify the foundation compiles
npm run typecheck
```

You will get errors when you run `npm run dev` because the `app/page.tsx` and other route files don't exist yet. That's expected — that's what Claude Code is going to build next.

## Database

The Supabase database is already live and complete:
- Project: `oisrzurefglwiaeqedyp`
- Region: Paris (eu-west-3)
- Dashboard: https://supabase.com/dashboard/project/oisrzurefglwiaeqedyp
- 19 tables with full RLS, 16 WhatsApp templates seeded

Do not recreate the database. Use the existing one via the env vars in `.env.local`.

## Next step

Open `CLAUDE_CODE_PROMPT.md` (in the parent handoff folder) and paste it as your first message in Claude Code. It will continue the build from here.
