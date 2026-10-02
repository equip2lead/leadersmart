# French coverage audit — 2 October 2026

Diagnostic only. No code or data was changed to produce this.

Scope: every French-bearing column on the level tables, EN/FR parity in
`src/lib/i18n.ts`, hardcoded English in JSX across `src/app` and
`src/components`, and the state of Supabase's auth email templates.

---

## Lesson content (`level_materials`)

| | EN | FR |
|---|---|---|
| `lesson_content` (12 lessons) | **12 / 12** | **0 / 12** |
| `assignment_prompt` | 12 / 12 | **12 / 12** |
| `title_fr` | 20 / 20 | 20 / 20 |
| `lesson_body_blocks` | 0 / 12 | 0 / 12 |

`lesson_content_fr` is the single real gap: empty in every tenant.

Two corrections to the brief's premises:

- **`assignment_prompt_fr` is already fully translated**, 12 of 12. It needs no
  work. The brief asked for both columns.
- **The work is 48 rows, not 12.** `level_materials` is church-scoped, so the
  same 12 lessons exist once per tenant across FIRE CHURCH, Fire Church Test,
  Faithmin inter and Nice ministry. Verified identical:
  `count(DISTINCT md5(lesson_content)) = 12` over 48 rows. Twelve translations
  applied to four copies each.

### Size

**82,604 characters** of English teaching prose per tenant — roughly 13,500
words. Faithful French runs 15–20% longer, so about 95,000 characters to write.
This is the largest single item in the brief by a wide margin.

| Level | Lesson | EN chars |
|---:|---|---:|
| 1 | L1 — Introductory Leadership Concepts | 7,271 |
| 1 | L2 — Five Levels of Leadership | 5,752 |
| 2 | L6 — Biblical Leadership (servanthood) | 13,714 |
| 2 | L11 — Communication and Motivation | 6,404 |
| 3 | L4 — Visionary Leadership | 9,412 |
| 3 | L30 — The Law of Priorities | 5,103 |
| 3 | L36 — Budgets and Financial Matters | 4,968 |
| 4 | L5 — Leadership Development | 5,024 |
| 4 | L25 — The Law of Empowerment | 7,246 |
| 4 | L26 — The Law of Reproduction | 5,184 |
| 5 | L34 — The Law of Legacy | 6,404 |
| 5 | L37 — Conclusion | 6,122 |

---

## Level metadata (`level_definitions`)

Fully translated. 20 of 20 rows have both `title_fr` and `description_fr`.

Note: the column is `title_fr`, not `name_fr` as the brief had it.

---

## Other level tables

| Table | Rows | `name_fr` | `description` (EN) | `description_fr` |
|---|---:|---:|---:|---:|
| `level_competencies` | 92 | 92 | **0** | 0 |
| `level_milestones` | 76 | 76 | **0** | 0 |
| `level_materials` | 80 | 80 | **0** | 0 |

**No translation debt here.** Every `name_fr` is populated, and the
`description` columns are empty on *both* sides — unused, not untranslated.
Translating them would mean inventing English source text first.

---

## i18n keys (`src/lib/i18n.ts`)

**Perfect parity.**

- EN: 1,747 keys. FR: 1,747 keys.
- EN keys with no FR counterpart: **0**
- FR keys with no EN counterpart: **0**
- Duplicate keys in either dictionary: **0**

54 keys hold byte-identical values in both languages. Most are legitimate —
cognates (`Date`, `Action`, `Description`, `Contact`, `Excellent`), proper
nouns (`Ghana`, `Kenya`, `LinkedIn`, `Twitter / X`, `Dr. Denis Ekobena`),
and format-only strings (`{name} 👋`, `{count} / {max}`, `https://…`).

Four look genuinely untranslated:

| Key | Value | Suggested FR |
|---|---|---|
| `leaders.sidebar_link` | `Leaders` | `Responsables` |
| `lesson.breadcrumb_leaders` | `Leaders` | `Responsables` |
| `submissions.column_leader` | `Leader` | `Responsable` |
| `nav.owner.badge` | `Owner` | `Propriétaire` |

(`plan.cat.leadership` = `Leadership` is fine; French uses the word.)

---

## Hardcoded strings

**10 files, ~32 user-facing strings** not routed through `t()`. Two whole
modules are English-only regardless of the language toggle.

| File | Strings | What |
|---|---:|---|
| `src/app/kids/manage/_manager.tsx` | 8 | Form labels, buttons, search placeholder |
| `src/app/settings/_password-form.tsx` | 7 | Labels, validation messages, button |
| `src/app/kiosk/_screen.tsx` | 4 | Check-in screen copy |
| `src/app/settings/_user-form.tsx` | 4 | Profile labels, Save button |
| `src/app/kids/manage/page.tsx` | 3 | Page subtitle, "Unknown child" |
| `src/app/dashboard/page.tsx` | 3 | Setup-incomplete messaging |
| `src/app/settings/page.tsx` | 2 | Section headings |
| `src/app/settings/_church-form.tsx` | 2 | Save button |
| `src/app/_landing/hero.tsx` | 1 | "Leadership Overview" |
| `src/app/layout.tsx` | 1 | SEO meta description (not UI chrome) |

The clusters that matter: **the entire Kids check-in module** (`kids/manage`
plus `kiosk`) and **the Settings profile and password forms**. A French-language
pastor sees English on both.

Count is a floor, not a ceiling: the scan catches JSX text nodes, a few
attributes, and sentence-shaped literals. It will miss strings assembled at
runtime.

---

## Email templates

**English-only.** All of Supabase's default templates, unmodified.

Evidence: `confirmation_sent_at` is populated on 4 accounts and
`email_confirmed_at` was set, so delivery works through Supabase's default
sender with stock templates. Supabase's stock templates are single-language
with no locale branching.

Templates live in the Supabase dashboard, not in a queryable table, so this
needs a dashboard confirmation rather than a query.

**Bilingual templates are achievable** — the language is already available
where a template can reach it. `signup` passes `preferred_language` into user
metadata (`src/app/signup/page.tsx:38`), confirmed landing in
`raw_user_meta_data` for all three self-signups. A template could branch on
`{{ .Data.preferred_language }}`.

One gap: `inviteUserByEmail` (`src/app/admin/users/actions.ts:78`,
`src/app/onboarding/actions.ts:256`) passes no language, so invited users have
`meta_lang = NULL` and would fall back to English whatever the template does.

---

## Summary — what actually needs doing

| Gap | Size | In this brief? |
|---|---|---|
| `lesson_content_fr` | 12 translations → 48 rows, ~82.6k chars | Yes, Part 2 |
| No FR editor for lesson content | 1 form | Yes, Part 3 |
| Kids module + Settings forms hardcoded | ~25 strings, 6 files | **No — needs a decision** |
| 4 untranslated i18n values | 4 keys | **No — needs a decision** |
| EN-only auth emails | Dashboard templates + invite locale | **No — needs a decision** |
| `description_fr` on 3 level tables | — | Not a gap; EN is empty too |
| i18n key parity | — | Not a gap; already perfect |
