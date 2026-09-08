# LeaderSmart v2 — Phase 1 Analysis (Read-Only Inventory)

_Author: Claude Opus 4.7 (analysis session)_
_Date: 2026-08-27_
_Live URL: `https://leadersmart.app` · Repo: `equip2lead/leadersmart` · Supabase project: `oisrzurefglwiaeqedyp`_

This document is a pre-refactor inventory. **No code was changed to produce it.** It exists so the v2 dashboard redesign — expanding LeaderSmart to serve both Churches and Ministries / Organizations — can be planned against the actual current state rather than a mental model of what the app looks like.

---

## 1. Framework and architecture

### Runtime versions
| Package | Version |
|---|---|
| `next` | `15.5.15` (App Router) |
| `react` / `react-dom` | `^19.0.0` |
| `typescript` | `^5.7.2` |
| `@supabase/ssr` | `^0.6.1` |
| `@supabase/supabase-js` | `^2.47.10` |
| `tailwindcss` | `^3.4.17` |
| `lucide-react` | `^0.460.0` (sole icon library) |
| `recharts` | `^3.8.1` (used only by legacy chart component, no active use) |
| `tailwind-merge`, `clsx` | present (`cn` helper in `src/lib/cn.ts`) |

No test framework, no linting config beyond `next lint`, no CI. `typecheck` and `build` scripts are the only automated gates.

### Directory layout
```
src/
├── app/                            # Next.js App Router
│   ├── layout.tsx                  # Global HTML shell, Inter font
│   ├── page.tsx                    # Marketing landing (indigo redesign)
│   ├── globals.css                 # Tailwind + smooth-scroll + card/btn utilities
│   ├── _landing/                   # Client components for the landing page only
│   │   ├── header.tsx              # Floating rounded-pill header
│   │   ├── mega-menu.tsx           # (defined but unused by current landing)
│   │   ├── category-tabs.tsx       # (defined but unused by current landing)
│   │   ├── lang-toggle.tsx         # Cookie-backed EN/FR
│   │   └── currency-selector.tsx   # Cookie-backed currency
│   ├── admin/                      # Owner / admin_pastor dashboard + CRUD
│   ├── pastor/                     # Pastor-of-the-Month workflow
│   ├── leader/                     # Department Head workflow
│   ├── kids/, kiosk/               # Kids ministry (stub-quality)
│   ├── onboarding/                 # 4-step wizard (owner-only)
│   ├── settings/                   # Church + user profile + owner-tools stubs
│   ├── auth/                       # Route handlers + accept-invite page
│   ├── login/, signup/, dashboard/ # Auth entry points
│
├── components/                     # Shared UI (thin — only 3 files)
│   ├── app-shell.tsx               # Sidebar + main + mobile top bar wrapper
│   ├── page-heading.tsx            # H1 + subtitle primitive
│   └── sidebar.tsx                 # Role-branched grouped navigation
│
├── lib/                            # Shared server + client utilities
│   ├── auth.ts                     # getMe(), requireRole()
│   ├── roles.ts                    # Role groups, predicates, home routing
│   ├── audit.ts                    # logAudit() — best-effort audit_log insert
│   ├── currency.ts                 # Country → currency + price table
│   ├── icons.ts                    # Curated lucide icon map for departments
│   ├── i18n.ts                     # 2,111-line EN/FR dictionary + t() helper
│   ├── cn.ts                       # Tailwind class merge
│   ├── types.ts                    # DB row types (User, Church, etc.)
│   └── supabase/
│       ├── server.ts               # Server client (cookies from next/headers)
│       ├── client.ts               # Browser client
│       ├── admin.ts                # Service-role client (server-only)
│       └── middleware.ts           # updateSession() — imported by root middleware
│
└── middleware.ts                   # Delegates to lib/supabase/middleware.ts
```

### Routing pattern
- **App Router**, one route per folder. No route groups (`(group)`), no parallel routes, no intercepting routes.
- Each surface (`/admin`, `/pastor`, `/leader`, `/onboarding`) has a `layout.tsx` that (a) authorises via `getMe()` / `requireRole()` and (b) wraps children in the `AppShell` sidebar layout (except onboarding, which uses its own minimal shell).
- Server components dominate. Client components live under `_landing/`, `_form.tsx`, or `_row.tsx` suffixes and are strictly interactive UI (forms, dropdowns, toggles).
- Server Actions (`'use server'`) handle every mutation. Direct client-side `supabase.from(...).insert(...)` was removed during Phase 2 and 3 of the last dashboard rebuild.

### Auth mechanism
- Supabase Auth via `@supabase/ssr`.
- `src/middleware.ts` calls `updateSession(request)` on every request. That helper:
  1. Reads all cookies, hydrates a server Supabase client, calls `getUser()` to refresh the session, writes any updated cookies back to the outbound response.
  2. Enforces public-vs-protected route policy. **Public**: `/`, `/login`, `/signup`, `/auth/*`. **Protected**: everything else — unauthenticated hits redirect to `/login`.
  3. Bounces already-authenticated users away from `/login` / `/signup` to `/dashboard`.
  4. On first visit (no `preferred_currency` cookie), reads `x-vercel-ip-country` header and writes a year-long cookie mapping it to a `CurrencyCode`. Used by the marketing pricing card only.
- `/dashboard/page.tsx` is a **role router** — not a real dashboard. It reads the current user's row, and:
  - If they're an owner without `onboarding_completed_at`, redirects to `/onboarding`
  - Otherwise, redirects via `homeForRole(role)` to `/admin`, `/pastor`, or `/leader`
- If a signed-in user has no `public.users` row (Auth user exists but provisioning didn't finish), `/dashboard` runs a **recovery path** that calls the `bootstrap_my_church` RPC. That RPC handles two cases:
  - Self-signup owner (church metadata in `user_metadata`)
  - Invited user (church_id + role in `app_metadata` — Admin-API-only writable, so client can't spoof)

### Data layer
- **Reads**: server components use `createClient()` from `lib/supabase/server.ts` (RLS-scoped session).
- **Writes**: Server Actions only. Two patterns:
  - Regular writes go through the session-scoped server client (RLS enforced).
  - Privileged writes (invite email, service-role updates to `raw_app_meta_data`) go through `createAdminClient()` from `lib/supabase/admin.ts` — service-role key from `SUPABASE_SERVICE_ROLE_KEY`, never imported into a client component.
- **Auditing**: every mutation server action calls `logAudit()` with `{ churchId, userId, action, entityType, entityId, before?, after? }`. Best-effort — failure is swallowed so it never aborts the mutation.
- **RPC**: only `bootstrap_my_church(name, full_name, language)` — used for the church-creation + invited-user-linking handshake.
- **Storage**: single public bucket `church-logos` for uploaded logos (added by onboarding wizard). URL saved to `churches.logo_url`.

---

## 2. Database schema

Live tables in `public` (from `list_tables`, verbose):

| # | Table | RLS | Rows | Purpose | Key columns |
|---|---|---|---|---|---|
| 1 | `churches` | ✅ | 2 | Church tenants. Every other table hangs off `church_id`. | `id`, `name`, `country`, `city`, `language` (enum), `timezone`, `currency`, `logo_url` |
| 2 | `users` | ✅ | 3 | App-side user row, joined to `auth.users(id)` via FK. | `id`, `church_id` → churches, `role` (enum), `preferred_language`, `is_active`, `onboarding_completed_at` |
| 3 | `user_secondary_roles` | ✅ | 0 | Extra hats a user carries (fire_kids_coordinator, etc.). Owner-only INSERT for admin_pastor + fire_kids_coordinator; admin INSERT for department_head. | `user_id`, `church_id`, `role` (enum), `granted_by_user_id` |
| 4 | `user_onboarding_progress` | ✅ | 0 | Per-step wizard state. One row per user, PK on `user_id`. Currently 0 rows because live users predate the migration. | `user_id`, `church_id`, `*_completed_at`, `*_skipped_at`, `completed_at` |
| 5 | `departments` | ✅ | 1 | Ministry teams (Ushering, Media, …). | `church_id`, `name`, `icon`, `leader_user_id`, `co_leader_1_user_id`, `co_leader_2_user_id`, `is_active` |
| 6 | `team_members` | ✅ | 0 | Volunteers on a department. | `department_id`, `full_name`, `phone`, `role_in_team`, `photo_url`, `is_active` |
| 7 | `pastor_assignments` | ✅ | 2 | Monthly Pastor-of-the-Month rotation. Partial unique index enforces one `status='active'` per church. | `church_id`, `pastor_user_id`, `assignment_month` (DATE), `status` (enum), `handover_to_user_id` |
| 8 | `sunday_checklists` | ✅ | 0 | Per-service checkpoint list (17 items). | `pastor_assignment_id`, `service_date`, `items_checked` (jsonb), `attendance_count`, `offering_total`, `submitted_by_user_id` |
| 9 | `weekly_execution_tasks` | ✅ | 0 | Weekly-plan tasks with 8-category taxonomy. | `pastor_assignment_id`, `week_number` (1–5), `task_text`, `category` (enum), `is_complete`, `completed_by_user_id` |
| 10 | `monthly_reports` | ✅ | 0 | 8-criterion end-of-month narrative + financials. Unique on `pastor_assignment_id`. | `pastor_assignment_id`, `criterion_{1..8}_data` (jsonb), `financial_summary`, `is_draft`, `last_edited_by_user_id` |
| 11 | `evaluations` | ✅ | 0 | Peer evaluation of PoM. Unique on `pastor_assignment_id`. | `evaluator_user_id`, `ratings` (jsonb), `overall_score`, `overall_recommendation` (enum), `signed_at` |
| 12 | `schedules` | ✅ | 0 | Per-service slot roster per department. | `department_id`, `service_date`, `service_name`, `slots` (jsonb array), `status` (enum), `sent_to_whatsapp_at` |
| 13 | `schedule_confirmations` | ✅ | 0 | Volunteer yes/no reply per scheduled slot. | `schedule_id`, `team_member_id`, `response` (enum) |
| 14 | `team_attendance` | ✅ | 0 | Per-schedule per-member showed-up flag. Unique `(schedule_id, team_member_id)`. | `schedule_id`, `team_member_id`, `showed_up`, `marked_by_user_id` |
| 15 | `department_weekly_reports` | ✅ | 0 | Weekly 5-question report per department. | `department_id`, `week_start_date`, `showed_up_count`, `absent_count`, `went_well_text`, `went_wrong_text`, `help_needed_text`, `submitted_by_user_id` |
| 16 | `classrooms` | ✅ | 0 | Kids ministry classroom (age-banded). Referenced by kids UI stubs. | `church_id`, `name`, `age_min`, `age_max`, `capacity`, `teacher_user_id` |
| 17 | `children` | ✅ | 0 | Registered child + parent contact + allergies. | `church_id`, `parent_1_phone`, `allergies`, `authorized_pickup` (jsonb) |
| 18 | `checkins` | ✅ | 0 | Per-service child check-in with pickup code. | `child_id`, `classroom_id`, `pickup_code`, `status` (enum: active / picked_up / emergency) |
| 19 | `message_templates` | ✅ | 16 | WhatsApp copy templates (EN + FR × 8 categories). | `name`, `language`, `body_template`, `variables` (text[]), `whatsapp_approved` |
| 20 | `whatsapp_messages` | ✅ | 0 | Message send log. | `church_id`, `to_phone`, `direction` (enum), `body`, `status` (enum), `twilio_sid` |
| 21 | `audit_log` | ✅ | 6 | Every mutation. | `church_id`, `user_id`, `action`, `entity_type`, `entity_id`, `before_value` / `after_value` (jsonb) |
| 22 | `_backup_users_roles_20260823` | ❌ | 3 | Pre-role-migration snapshot. **RLS disabled** — see risk register. | `id`, `role_text`, ... |

**Enums** (from live schema):

| Enum | Values |
|---|---|
| `app_language` | `en`, `fr` |
| `user_role` | `senior_pastor`, `pastor`, `department_leader`, `admin`, `owner`, `admin_pastor`, `department_head`, `fire_kids_coordinator` — 4 current + 4 legacy retained for transition |
| `assignment_status` | `upcoming`, `active`, `completed` |
| `task_category` | 8 values: `leadership`, `senior_leadership`, `department_oversight`, `spiritual_followup`, `communication`, `service_organization`, `evangelism`, `report_clarity` |
| `schedule_status` | `draft`, `published` |
| `confirmation_response` | `pending`, `yes`, `no` |
| `checkin_status` | `active`, `picked_up`, `emergency` |
| `message_direction` | `inbound`, `outbound` |
| `message_status` | `queued`, `sent`, `delivered`, `read`, `failed` |
| `overall_recommendation` | `excellent`, `good`, `needs_improvement` |

**Helper functions** (from `pg_proc`): `bootstrap_my_church`, `get_my_church_id`, `get_my_role`, `has_admin_rights`, `is_owner`, `is_senior_pastor_or_admin` (alias to `has_admin_rights`), `is_fire_kids_coord`, `calculate_evaluation_score`, `generate_pickup_code`, `update_updated_at_column`. All `SECURITY DEFINER`, all called inside RLS policies.

---

## 3. Routes inventory

Grouped by surface. Access column reflects `requireRole([...])` at the layout or page.

### Public / marketing
| Path | File | Access | Works? | Notes |
|---|---|---|---|---|
| `/` | `app/page.tsx` | public | ✅ | Indigo marketing landing (10 sections, 884 lines) |
| `/login` | `app/login/page.tsx` | public | ✅ | Simple email/password + Google button (Google stub) |
| `/signup` | `app/signup/page.tsx` | public | ✅ | Church name + full name + email + password + language radio |

### Auth plumbing
| Path | File | Purpose |
|---|---|---|
| `/auth/callback` | route handler | PKCE `?code=` exchange for signup email confirmation |
| `/auth/confirm` | route handler | Token-hash flow (for signup templates using `{{ .TokenHash }}`) |
| `/auth/accept-invite` | page (client-side `verifyOtp`) | Invited-user onboarding — set password, calls `bootstrap_my_church` to link |
| `/auth/signout` | route handler | POST → `signOut()` → redirect to `/login` |

### `/dashboard` (role router)
Reads `users.role` + `onboarding_completed_at`, then redirects. Never renders UI except a fallback SetupError shell if the RPC fails.

### `/onboarding/*` — Owner-only 4-step wizard
| Path | Access | Purpose |
|---|---|---|
| `/onboarding` | Owner | Redirects to correct step based on `user_onboarding_progress` |
| `/onboarding/step-1` | Owner | Church profile (required) — name, country, language, optional logo |
| `/onboarding/step-2` | Owner | Invite 1–5 admin pastors (skippable) |
| `/onboarding/step-3` | Owner | Create departments from 8 suggestions + custom (skippable) |
| `/onboarding/step-4` | Owner | Assign PoM for current or next 2 months (skippable) — closes wizard |

Layout guards: redirects to `/dashboard` if user isn't owner or onboarding already complete.

### `/admin/*` — Owner + Admin Pastor
| Path | Purpose | Notes |
|---|---|---|
| `/admin` | Church Overview dashboard | 4 stat cards (PoTM · dept count · user count · last Sunday checklist) + weekly-report status per department (green/yellow/red) + onboarding SkipCards |
| `/admin/assignments` | List + create PoM assignments | One-active-per-church constraint, month picker |
| `/admin/assignments/[id]/evaluate` | 8-criterion × 4 sub-criterion peer evaluation | With signature lock |
| `/admin/departments` | CRUD + edit/deactivate + co-heads | Icon dropdown, leader dropdown, 2 co-head slots |
| `/admin/users` | List + invite + promote/demote/remove | Confirmation modals, secondary role badges, Fire Kids grant/revoke |
| `/admin/analytics` | Reports & Analytics landing | 4 counts + 3 aggregate link-cards + "charts arrive later" placeholder |
| `/admin/schedules` | All-departments schedules with dept filter | Read-only aggregate |
| `/admin/attendance` | All-departments attendance with dept filter | Read-only aggregate |
| `/admin/weekly-reports` | All department weekly reports with dept filter + submitter attribution | Read-only aggregate |
| `/admin/audit-log` | Owner-only. Filterable by action + actor. Paginated 50/pg | Newest first |

### `/pastor/*` — Owner + Admin Pastor + Pastor
| Path | Purpose |
|---|---|
| `/pastor` | Personal dashboard: month card, current week (1–5), Sunday-checklist count, quick actions, week 1–5 task list with checkbox toggles |
| `/pastor/sunday-checklist` | 22-item checklist grouped in 7 sub-groups (before/during/after). Auto-save 15s. History table |
| `/pastor/weekly-plan` | 5-week × N-task board with add + toggle |
| `/pastor/monthly-report` | 8-section narrative form with auto-save + submit lock |
| `/pastor/evaluations` | Read-only signed evaluations for the current PoM |

All 5 support the **on-behalf-of** pattern: an owner or admin_pastor loads the current PoM assignment and can act as the pastor with attribution banners. `monthly-report` blocks the actual "Submit" for admins per Section 17 spec (only the assigned pastor signs).

### `/leader/*` — Owner + Admin Pastor + Department Head
| Path | Purpose |
|---|---|
| `/leader` | Department dashboard: team size, this Sunday's schedule status, last weekly report |
| `/leader/team` | Team CRUD with E.164 phone validation + photo URL |
| `/leader/schedules` | Create schedules with repeatable slots (role text + team-member dropdown), draft/publish toggle |
| `/leader/attendance` | Schedule picker → per-member showed_up toggle with optimistic UI |
| `/leader/report` | 5-question weekly report with Q1/Q2 auto-fill from `team_attendance` |

### `/settings/*` — mixed
| Path | Access | Purpose |
|---|---|---|
| `/settings` | any signed-in user | Church profile (edit), user profile, change password |
| `/settings/billing` | Owner | "Coming in Phase 3" stub |
| `/settings/transfer-ownership` | Owner | Static informational — email `support@leadersmart.app` |
| `/settings/danger` | Owner | "Coming in Phase 3" stub |

### Kids ministry — stub-quality
| Path | Purpose | Status |
|---|---|---|
| `/kids/manage` | Register children + roster | Component exists, no server actions wired |
| `/kiosk` | Sunday-morning check-in kiosk | Component exists, no server actions wired |

---

## 4. Components inventory

**`src/components/` — 3 files, thin by design.** The app has no `Button`, `Card`, `Input`, or `Modal` component; those live as Tailwind utilities (`.btn-primary`, `.card`, `.input`) declared in `globals.css`.

| File | Type | Role |
|---|---|---|
| `sidebar.tsx` | Client | Role-branched grouped navigation. Sections: Church Overview · Pastor Workflow · Department Workflow · Kids Ministry · Settings · Owner Tools (owner only). Legacy `PASTOR_NAV` and `LEADER_NAV` kept for accounts still on legacy roles. |
| `app-shell.tsx` | Server | Wraps `Sidebar` + main content + mobile top bar |
| `page-heading.tsx` | Server | `<h1>` + subtitle primitive, used on every admin/pastor/leader page |

**`src/app/_landing/` — landing-page-only client components:**
- `header.tsx` — floating rounded-pill nav with mobile hamburger
- `lang-toggle.tsx` — cookie + localStorage EN/FR switch
- `currency-selector.tsx` — cookie-backed pricing currency dropdown
- `mega-menu.tsx`, `category-tabs.tsx` — **built but currently unused** by the indigo landing. Vestiges of Phase 2 landing.

Every form on the app side (e.g. `admin/departments/_department-form.tsx`, `pastor/sunday-checklist/_form.tsx`) is a colocated `_form.tsx` client component tightly coupled to the page that renders it. There's no shared form library.

**Icons**: everything uses `lucide-react`. `src/lib/icons.ts` exposes a curated ~28-icon map (`DEPARTMENT_ICONS`) for department icon selection.

**Charts**: `recharts` is installed but not currently referenced by any active page (was used by the deleted trend chart; kept in `package.json`).

---

## 5. Existing dashboard experience

### Owner (Dr. Ekobena · Fire Church)
Lands on **`/admin`** — the Church Overview dashboard. Above the fold:
1. Onboarding SkipCards for anything skipped in the wizard (flame-tinted, arrow CTA)
2. Four link-cards in a row: `Pastor of the Month` (name + month) · `Departments` (count) · `Users` (count) · `Last Sunday Checklist` (date)
3. **Weekly Reports by Department** — one row per active department, colour-coded green/yellow/red for this-week / last-week-only / missed. Each row is a link to `/admin/departments`.

Sidebar (Owner sees the full 5 sections + Owner Tools at the bottom):

- **Church Overview**: Dashboard · Pastor Assignments · Departments · Team Users · Reports & Analytics
- **Pastor Workflow**: Sunday Checklist · Weekly Plan · Monthly Report · Evaluations
- **Department Workflow**: All Schedules · All Attendance · All Weekly Reports
- **Kids Ministry**: Kids Check-In · Kids Kiosk
- **Settings**: Settings (single entry)
- **Owner Tools** (owner-only): Audit Log · Billing · Transfer Ownership · Danger Zone

The wordmark carries an "OWNER" badge next to the user name.

### Admin Pastor
Identical sidebar structure **minus the Owner Tools section**. No badge. Same `/admin` dashboard, minus the SkipCards (they only render for the owner).

### Department Head
Lands on **`/leader`** — Department Dashboard. Three stat cards:
1. Team size
2. This Sunday's schedule status (none / draft / X-of-Y confirmed)
3. Weekly Report ("Submitted this week" / never / last-submitted date)

Followed by quick-action tiles: Team Members · Schedules · Attendance · Weekly Report.

Sidebar is the **legacy flat** `LEADER_NAV` (6 items, no sections): Dashboard · Team Members · Schedules · Attendance · Weekly Report · Settings.

### Pastor (rare — invited-as-pastor)
Lands on **`/pastor`** — personal dashboard scoped to their active PoM assignment. Same sidebar as Department Head structurally (also legacy flat `PASTOR_NAV` for accounts still on legacy roles).

### Fire Kids Coordinator
Falls back to `/admin`. No dedicated dashboard yet.

---

## 6. Cross-reference against v2 vision

For each v2 capability from the brief, current state:

| v2 capability | Status | Notes |
|---|---|---|
| **Church vs Ministry/Organization onboarding branching** | ❌ Not built | Onboarding is hard-coded to "church". The word "church" appears in ~200 i18n keys, every wizard step, `bootstrap_my_church` RPC name, `churches` table name. |
| **Sunday Readiness dashboard section** | ⚠️ Partial | `/admin` already has a per-department weekly-report status list and `/leader` has "This Sunday's schedule status". A "Sunday Readiness" hero band pulling both together doesn't exist as a distinct section. |
| **Church service times config (multiple services/Sunday)** | ❌ Not built | `churches.timezone` exists but no service-times table. `sunday_checklists.service_date` is a single date; `schedules.service_name` is free-text. Attendance is per-schedule, not per-service-time. |
| **Multi-branch architecture (org → country → region → branch → dept)** | ❌ Not built | Everything hangs off `church_id`. There is no `organization`, `country_group`, `region`, or `branch` table. RLS gates on `get_my_church_id()` — a single ID, not a hierarchy. |
| **Organization Health dashboard** | ❌ Not built | The `/admin/analytics` page is a stub with 4 counts + 3 aggregate links; no health scoring / trend line / benchmarks. |
| **Leadership Development pathways** | ❌ Not built | Evaluations exist (8 criteria × 4 sub-criteria) but there's no pathway, cohort, or growth-track concept. |
| **Reports dashboard with branch status** | ⚠️ Partial | Weekly-report status list exists per department. Branch-level rollup doesn't exist because branches don't exist. |
| **Adaptive sidebar per org type** | ❌ Not built | Sidebar is role-branched, not org-type-branched. Content is 100% church-flavoured (Pastor of the Month, Sunday Checklist). |
| **Design system change (Royal Indigo · Emerald · Warm Gold)** | ⚠️ Landing done, app not | The marketing landing (`/`) was rebuilt in indigo. The app side (`/admin`, `/pastor`, `/leader`) still uses `brand-*` (navy) + `flame-*` (orange). Tokens live in `tailwind.config.ts`. |
| **Calendar experience** | ❌ Not built | No calendar view anywhere. `pastor_assignments.assignment_month` is a bare DATE. `schedules.service_date` is a bare DATE. No event / recurring event concept. |
| **Tasks and accountability** | ⚠️ Partial | Weekly execution tasks exist with 8-category taxonomy + audit trail + on-behalf-of attribution. But scoped only to Pastor-of-the-Month, not a general task system. |

**Bucketed for planning:**

**Already built — keep as-is** (skip in v2)
- Auth, invites, accept-invite flow
- Role model (owner / admin_pastor / department_head / fire_kids_coordinator + secondary roles)
- RLS, audit_log, church-scoped tenancy
- Sunday Checklist (22-item, on-behalf-of), Weekly Plan, Monthly Report, Evaluations
- Department CRUD (with co-heads), schedules, attendance, weekly reports
- Marketing landing page

**Built but needs restyle** (design refresh only, no schema)
- Sidebar layout & structure (design tokens: brand-navy → indigo, flame → gold)
- Admin dashboard cards (indigo accents, health-index framing)
- Pastor / Leader dashboards (indigo accents, same data)
- Global buttons, cards, inputs (utility class updates in `globals.css`)
- Legacy `PASTOR_NAV` / `LEADER_NAV` flat lists → grouped like `ADMIN_SECTIONS`

**Built but needs extension** (add capability to existing surface)
- Sidebar — needs adaptive top-level branch when org type ≠ church
- `churches` table — probably needs an `organization_type` column (`church` / `ministry` / `nonprofit`) that drives copy
- Onboarding wizard — needs a step 0 or an org-type branch to swap "Church name" → "Ministry name" etc.
- `/admin/analytics` — needs actual charts and Org Health scoring
- i18n dictionary — 2,111 lines; every church-specific string needs an org-type-aware sibling

**Not built — new construction**
- Multi-branch / organization hierarchy (schema + RLS)
- Service times per Sunday (schema + UI)
- Calendar view (framework + week/month views + drag-to-reschedule)
- Leadership Development pathways
- Sunday Readiness hero band
- Organization Health scoring engine
- General-purpose task/accountability system (beyond weekly PoM tasks)

---

## 7. Risk register

Ordered by blast radius:

### R1 — CRITICAL: single-tenant assumption is baked in at 3 layers
`get_my_church_id()` returns a **single** UUID (not a set). Every RLS policy is `WHERE ... = get_my_church_id()`. Every server component reads `me.church.id`. Every server action closes on `church.id`. Adding a `branches` table means either:
- (a) Branches inherit the church-tenant → new `branch_id` FKs on ~15 tables, new helper `get_my_branch_ids()` returning a set, every RLS + server action rewritten
- (b) Branches ARE the tenant (church becomes a "root branch") → deeper migration but cleaner future

Either way it's a coordinated migration touching most of the app.

### R2 — CRITICAL: role model is church-specific and immutable-in-name
`user_role` enum includes `admin_pastor`, `department_head`, `fire_kids_coordinator`. If v2 serves organizations, `admin_pastor` is a category error for a nonprofit. Options:
- Add generic aliases (`admin`, `manager`, `coordinator`) — messy, doubles the enum
- Rename enum values via ALTER TYPE — requires app-side renames + backward-compat aliases
- Keep the DB names, split the UI label per org type — cleaner, but every i18n role label needs an org-type dimension

The role model just settled after Phases 1–3 of the role migration. Another rewrite is expensive.

### R3 — HIGH: church-specific vocabulary permeates i18n
The i18n dictionary is 2,111 lines and mentions "pastor" 190×, "church" 250×, "ministry" 80×. Every string that says "your church" or "the Pastor of the Month" has a nonprofit-equivalent that has to be authored (EN + FR). Machine translation isn't acceptable per prior spec guidance ("pastoral French, not machine translation"). This is a copy-writing project as much as a code project.

### R4 — HIGH: `bootstrap_my_church` is load-bearing
The RPC is the sole path from Auth signup / invite acceptance to a provisioned `users` row. It hard-codes `churches`. A v2 with organizations needs either:
- A renamed / generalised `bootstrap_my_tenant`
- Two parallel RPCs the app picks between at signup time
- One RPC that takes an org type

Renaming will touch `/signup`, `/dashboard/page.tsx` (twice), `/auth/accept-invite/_flow.tsx`, `/admin/users/actions.ts` (invite action), and the migration.

### R5 — HIGH: onboarding wizard is fresh and inflexible
Shipped 4 days ago (~2,000 LOC). It's owner-only, hard-coded to church setup: "Church name", "What departments does your ministry have?", "Assign Pastor of the Month". A v2 wizard needs to branch on org type at step 1 and swap every subsequent step's copy + logic. This is the surface most likely to feel churned to users mid-flight.

### R6 — MEDIUM: legacy role values still live in the enum
Phase 1 additively added new role values and Phase 2 mapped users onto them, but the four legacy values (`senior_pastor`, `pastor`, `department_leader`, `admin`) are still in the enum. Nothing new should be created with them, but they linger in `ADMIN_ROLES`, `PASTOR_ROLES`, `LEADER_ROLES`. A v2 cleanup migration was intended but never shipped. Adds noise but doesn't block v2.

### R7 — MEDIUM: `_backup_users_roles_20260823` has RLS disabled
Snapshot table from the role migration. RLS is `disabled` — technically exposed to `anon` role. Row count 3 (safe demographics), but supabase advisor flags it as critical. Should be dropped or ENABLE RLS'd. Not v2-blocking but shows up on any security scan.

### R8 — MEDIUM: on-behalf-of pattern couples to `pastor_assignments`
The pastor pages load the church's active PoM assignment and let admins act on their behalf. If v2 introduces branches, a "current PoM" per church becomes ambiguous — is it church-wide or per-branch? Same for weekly-plan and monthly report. This ripples into `/pastor/_context.ts`.

### R9 — LOW: `recharts` in package.json is unused
Not blocking anything, but if v2 adds real charts, decide whether to keep `recharts` or switch to `visx` / `nivo`. Currently 46 kB of bundle bloat with no rendered chart.

### R10 — LOW: `_landing/mega-menu.tsx` and `_landing/category-tabs.tsx` exist but are unused
Vestiges of an earlier landing iteration. Harmless but dead weight in the source tree.

### R11 — LOW: no test suite
Zero tests. Every ship is a build-pass + push-and-pray. As v2 introduces multi-branch RLS and calendar logic, that's going to hurt.

---

## 8. Recommended phasing

### Phase 2 (LOW RISK · quick wins)
1. **Rename design tokens** (`brand-*` → indigo-driven, `flame-*` → warm-gold) in `tailwind.config.ts` + `globals.css` + `sidebar.tsx`. **1-day change**, zero schema impact, tests visually.
2. **Restyle admin/pastor/leader dashboards** with new tokens — no logic change, just class swaps + accent-colour choices.
3. **Grouped sidebar for Pastor + Leader roles** — replace flat `PASTOR_NAV` / `LEADER_NAV` with sectioned layout matching `ADMIN_SECTIONS`. Adds parity across roles.
4. **Add `organization_type` column to `churches`** with default `'church'` and DB check constraint. **No behaviour change yet** — just data plumbing. Prep for Phase 3.
5. **Drop `_backup_users_roles_20260823`** and clear that advisor lint.

Ships in 3–5 days total. Zero migration risk.

### Phase 3 (MEDIUM · needs planning, but self-contained)
1. **Onboarding wizard branch** on `organization_type` at step 1: "Are you setting up a church or a ministry/organization?". Swap copy through steps 2–4. New wizard i18n keys `onboarding.org.*` alongside existing `onboarding.step*`.
2. **Sunday Readiness section** on `/admin` — hero band above the current stat cards. Rolls up: (a) Sunday checklist state for active PoM, (b) each department's schedule confirm rate, (c) each department's weekly report state. All data already exists — no schema, just composition.
3. **`/admin/analytics` extension** — add real charts (attendance trend, weekly-report submit rate, PoM evaluation trend) driven by existing data. Pick a chart lib and commit.
4. **Service times per Sunday** — new `service_times` table hung off `church_id` with `day_of_week` + `start_time` + `duration_minutes`. Optionally attach `schedules` and `sunday_checklists` to `service_time_id` rather than raw `service_date`. Bigger data-migration risk than #1–3; do this last in the phase.

Ships in 2–3 weeks.

### Phase 4 (HIGH · requires careful migration, do last)
1. **Multi-branch architecture**. Design decision: are branches a child of church, or does church become "root branch"? Recommend the second — cleaner RLS, single tenant tree. Migration touches every RLS policy.
2. **Role model generalisation** — rename `admin_pastor` → `admin`, `department_head` → keep, add non-church-specific role aliases at the i18n layer. DB-side migration path or a rename.
3. **Calendar view** — new framework, week/month views, drag-to-reschedule. This is a big front-end lift regardless of backend.
4. **Leadership Development pathways** — new schema, new UI. Pure greenfield.
5. **Organization Health scoring engine** — needs metrics-service pattern; likely a materialized view + edge function.

Ships in 2–3 months.

**Cross-cutting recommendation**: introduce a smoke-test harness (Playwright end-to-end for the 4 critical flows — signup, onboarding, invite acceptance, pastor-checklist submit) **before** Phase 4 starts. Multi-branch RLS changes without an integration test net will be terrifying.

---

## Appendix: quick-reference stats

- **Total files under `src/`**: 88
- **Total lines in `src/lib/i18n.ts`**: 2,111 (EN + FR sections)
- **Total lines in `src/app/page.tsx`** (marketing landing): 884
- **Total routes**: 30 pages + 3 route handlers
- **Total tables**: 22 (1 backup)
- **Total enums**: 10
- **Total RPC functions**: 10 (1 owner-facing: `bootstrap_my_church`)
- **Total live users**: 3 across 2 churches
- **Total shared UI components in `src/components/`**: 3
- **Test coverage**: 0%
