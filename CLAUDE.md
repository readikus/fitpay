# FitPay - Development Guide

## What is FitPay?

Payment infrastructure for fitness coaches. Core mechanic: clients pay for coaching programmes with a **base fee** (paid to coach immediately) + **bonus pot** (held in Stripe escrow, released on milestone completion). Revenue: 2% platform fee + £29/mo subscription.

## Tech Stack

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript
- **Auth**: Supabase Auth via `@supabase/ssr` (email/password, cookie-based JWT)
- **Database**: Supabase PostgreSQL, queried via `pg` Pool singleton (not an ORM)
- **Migrations**: Knex with raw SQL (`database/migrations/`)
- **Payments**: Stripe Connect (split payments, escrow, milestone-triggered releases)
- **Styling**: Tailwind CSS v4 + Radix UI components
- **Fonts**: DM Sans (body) + Fraunces (headings) — violet/cream design system
- **Validation**: Zod schemas (`schemas/`)
- **Forms**: React Hook Form + @hookform/resolvers
- **Client state**: Zustand + TanStack Query
- **Deployment**: Vercel

## Project Structure

```
app/                          # Next.js App Router
  (authenticated)/            # Protected routes (auth checked in layout)
    dashboard/                # Coach overview with stats
    programmes/               # Programme CRUD
    clients/                  # Client management
  api/                        # API routes
    auth/me/                  # Session user endpoint
    webhooks/stripe/          # Stripe Connect webhooks
  auth/callback/              # OAuth/magic link handler
  login/                      # Public login page
  page.tsx                    # Public landing page

components/
  ui/                         # Radix UI + styled components (button, card, input, label)
  sidebar.tsx                 # Navigation sidebar
  query-provider.tsx          # TanStack Query provider

providers/
  supabase/                   # Supabase client init (server, browser, middleware)
  database/pool.ts            # pg Pool singleton

database/migrations/          # Knex migration files (raw SQL)

schemas/                      # Zod validation schemas
types/                        # TypeScript type definitions
utils/                        # Utility functions (cn)
```

## Commands

```bash
npm run dev              # Start dev server on port 4050
npm run build            # Production build
npm run migrate:up       # Run next Knex migration
npm run migrate:down     # Rollback last migration
npm run migrate:status   # Check migration status
npm run lint             # ESLint
npm run tsc              # TypeScript type check
```

## Database Schema

9 migrations (all applied), covering:
1. `users` + `coaches` (linked to Supabase Auth via `supabase_auth_id`)
2. `programmes` (name, duration, base_fee_amount, bonus_pot_amount, status)
3. `clients` (per coach, unique email per coach)
4. `enrollments` (client + programme, payment tracking, status workflow)
5. `milestones` + `milestone_submissions` + `milestone_evidence` (verification engine)
6. `payments` + `bonus_pots` (Stripe payment tracking, escrow status)
7. `attendance_logs` (session attendance per enrollment)
8. RLS policies (coach-scoped tables via `app.current_user_id`)
9. RLS on `users` table (scoped by `supabase_auth_id`)

RLS is enabled on all app tables. `knex_migrations` and `knex_migrations_lock` are intentionally unrestricted (Knex internals, no sensitive data, only accessed by migration CLI).

All amounts stored in **pence** (integer). All timestamps are `TIMESTAMPTZ`. All PKs are `UUID`.

## Auth Flow

1. User logs in at `/login` via `supabase.auth.signInWithPassword()`
2. Middleware validates JWT on every request via `supabase.auth.getUser()`
3. Public routes: `/`, `/login`, `/auth/*`, `/api/auth/*`, `/api/webhooks/*`, `/checkout/*`
4. Protected routes redirect to `/login?returnTo=<path>` if not authenticated
5. `getAuthenticatedUser()` returns session user with coach profile from local DB

## Design System

Violet/cream theme from `fitpay-landing.html`:
- Primary: `#7C3AED` (violet)
- Background: `#FDFBF7` (cream)
- Borders: `#E8E3DA` (warm)
- Text: `#1A1814` / `#4A4640` (mid) / `#8C857A` (muted)
- Border radius: 14px
- Tailwind custom colors: `violet`, `violet-dark`, `violet-light`, `cream`, `warm`, `text`, `mid`, `muted`, `amber`, `green`, `border`

## Supabase Project

- Dashboard ID: `fnqxxhnxzacakwgbzduv` (shown in Supabase dashboard URL)
- Internal project ref: `qjglgdcujefjolglfjgf` (used for DNS, API, and DATABASE_URL)
- Region: eu-west-1 (Ireland), pooler host: `aws-1-eu-west-1.pooler.supabase.com`
- Account: `ianharveyread+fp@gmail.com` (separate from main Supabase account — CLI cannot access)

**Important:** Supabase dashboard shows `fnqxxhnxzacakwgbzduv` as the project ref, but the real ref for DNS/pooler is `qjglgdcujefjolglfjgf` (found in the legacy JWT and confirmed via `sb-project-ref` API header).

## Environment Variables

See `.env.example`. Key vars:
- `DATABASE_URL` — Supabase PostgreSQL pooler connection string (uses internal ref, not dashboard ID)
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase project (uses internal ref)
- `SUPABASE_SERVICE_ROLE_KEY` — Admin operations
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` — Stripe Connect

## Conventions

- Follow patterns from `salus-bridge-web` (repository + service layers, Knex raw SQL migrations, Supabase SSR auth)
- Migrations use `knex.raw()` with raw SQL, not Knex schema builder
- Body text: `font-sans` (DM Sans). Headings: `font-serif` (Fraunces)
- Use Tailwind custom color names (`text-violet`, `bg-cream`, `border-border`) not hex values
- Amounts in pence, displayed with `/ 100` formatting
