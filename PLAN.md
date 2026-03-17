# FitPay — Build Plan

> Payment infrastructure for fitness coaches. Base fee + bonus pot mechanic.
> MVP target: 6 weeks (per pitch deck Phase 1).

---

## What's Done

- [x] Auth flow (login, signup, middleware, RLS, session)
- [x] Database schema (9 migrations — users, coaches, programmes, clients, enrollments, milestones, milestone_submissions, milestone_evidence, payments, bonus_pots, attendance_logs)
- [x] RLS policies on all tables
- [x] Coach profile creation + settings page
- [x] Stripe Connect onboarding (Express account creation, onboarding link, webhook for account.updated)
- [x] Stripe webhook handler (payment_intent.succeeded/failed, account.updated)
- [x] Landing page
- [x] Dashboard (redesigned to match prototype — stat cards, active clients list, programmes list)
- [x] Clients list page
- [x] Clients add form (`/clients/new` + `POST /api/clients`)
- [x] Programmes list page
- [x] Sidebar navigation
- [x] Design system (Tailwind v4, DM Sans + Fraunces, violet/cream theme)
- [x] UI components (Button, Card, Input, Label)
- [x] Zod schemas (client, coach, programme, enrollment)
- [x] TypeScript types (all DB models + enums)
- [x] TanStack Query provider

---

## Phase 1 — Programme CRUD

Everything depends on programmes. Coaches need to create programmes before they can enrol clients or collect payments.

### API

- [ ] `GET /api/programmes` — list coach's programmes
- [ ] `POST /api/programmes` — create programme (validate with `createProgrammeSchema`)
- [ ] `GET /api/programmes/[id]` — get single programme with milestones
- [ ] `PUT /api/programmes/[id]` — update programme
- [ ] `DELETE /api/programmes/[id]` — delete programme (only if no active enrollments)

### Pages

- [ ] `/programmes/new` — create programme form
  - Name, description, duration (weeks), base fee (£), bonus pot (£)
  - Milestone builder: add/remove milestones with name, week number, required evidence type
  - Status defaults to DRAFT, coach can activate
- [ ] `/programmes/[id]` — programme detail page
  - Overview (fees, duration, milestones)
  - Enrolled clients list
  - Edit / archive actions
  - "Copy checkout link" button (generates `/checkout/[token]` URL)
- [ ] `/programmes/[id]/edit` — edit programme form (reuse create form)

### Milestones

- [ ] Insert milestones to `milestones` table when creating a programme
- [ ] Update/delete milestones on programme edit (only if no submissions exist)
- [ ] Display milestone list on programme detail page

---

## Phase 2 — Client Management

Complete client CRUD so coaches can manage their roster before enrolling.

### API

- [ ] `GET /api/clients/[id]` — get single client with enrollment history
- [ ] `PUT /api/clients/[id]` — update client details
- [ ] `DELETE /api/clients/[id]` — delete client (only if no active enrollments)

### Pages

- [ ] `/clients/[id]` — client detail page (match prototype `ClientDetail` view)
  - Client info (name, email, phone)
  - Active enrollment with programme name, week progress, bonus pot status
  - Payment timeline (instalments paid/pending)
  - Bonus pot card with progress bar and status
  - Edit / delete actions
- [ ] Update clients list page — make rows clickable (link to `/clients/[id]`)

---

## Phase 3 — Enrollment System

Connect clients to programmes. This is the core transaction setup before payments flow.

### API

- [ ] `POST /api/enrollments` — create enrollment
  - Validate with `createEnrollmentSchema`
  - Calculate `end_date` from `start_date` + programme `duration_weeks`
  - Copy `base_fee_amount` and `bonus_pot_amount` from programme (or allow override)
  - Create `bonus_pots` record (status: HELD)
  - Create scheduled `payments` records (split base fee into instalments)
  - Set enrollment status to PENDING_PAYMENT
- [ ] `GET /api/enrollments` — list coach's enrollments with client + programme info
- [ ] `GET /api/enrollments/[id]` — enrollment detail with payments, milestones, bonus pot
- [ ] `PUT /api/enrollments/[id]` — update enrollment status (cancel, complete)

### Pages

- [ ] Enrollment creation flow — either:
  - From programme detail page: "Enrol client" → select client → set start date → confirm
  - Or from client detail page: "Enrol in programme" → select programme → set start date → confirm
- [ ] Enrollment detail view (can be part of client detail page)
  - Status, dates, payment progress, milestone progress

### Payment Schedule Engine

- [ ] Generate payment schedule on enrollment creation
  - Split base fee into 3 equal payments across programme duration
  - Payment 1: enrollment start date, Payment 2: start + ⅓ duration, Payment 3: start + ⅔ duration
  - Create `payments` records with `scheduled_date` and status SCHEDULED
  - Bonus pot payment as separate record (type: BONUS_POT, scheduled at start)
- [ ] Platform fee: 1% on every payment via Stripe `application_fee_amount`
  - `application_fee_amount = Math.round(amount * 0.01)`
  - Record as PLATFORM_FEE payment in database for tracking

---

## Phase 4 — Stripe Payments & Checkout

Client-facing checkout where clients pay for their programme. Stripe Connect splits payments at source. No login required — clients pay via public link.

### Database Migration

- [ ] Add `auth_provider` (VARCHAR) + `auth_provider_id` (VARCHAR) columns to `clients` table
  - Nullable — clients exist before they have an auth account
  - Linked on first login via email match
  - Provider-agnostic so auth platform can be swapped later

### API

- [ ] `POST /api/payments/create-intent` — create Stripe PaymentIntent
  - Use Stripe Connect destination charges (or separate charges + transfers)
  - Split: base fee instalment → coach's Stripe account, bonus pot → platform escrow
  - Apply platform fee (application_fee_amount)
  - Return client_secret for frontend
- [ ] `POST /api/checkout/[token]` — validate checkout token, return programme + payment details
- [ ] Enhance webhook handler:
  - On `payment_intent.succeeded`: update correct `payments` record, advance enrollment status
  - Handle partial payments (individual instalments)

### Pages

- [ ] `/checkout/[token]` — public client checkout page (no login required)
  - Display programme details (name, duration, total cost breakdown)
  - Show base fee + bonus pot split explanation
  - Collect client email (pre-filled if known)
  - Terms agreement checkbox
  - Stripe Elements card form
  - Confirmation page on success
  - Client record linked by email — no account creation required at this stage
- [ ] Generate checkout tokens/links per enrollment
  - Store UUID token on enrollment
  - Token lookup returns programme + payment details

### Checkout Link Generation

- [ ] Generate unique checkout URL for each enrollment
- [ ] "Copy checkout link" on programme detail page
- [ ] Coach sends link to client (DM, email, WhatsApp — outside FitPay for now)

---

## Phase 5 — Milestone Verification Engine

The referee system: coaches approve milestones, evidence is logged, bonus pot releases on completion.

### API

- [ ] `GET /api/enrollments/[id]/milestones` — list milestones for enrollment with submission status
- [ ] `POST /api/milestones/[id]/submit` — client submits evidence for a milestone
  - Create `milestone_submissions` record (status: PENDING)
  - Attach evidence records to `milestone_evidence`
- [ ] `PUT /api/milestones/submissions/[id]` — coach approves/rejects submission
  - Update status to APPROVED or REJECTED
  - Add review notes
  - If all milestones approved → trigger bonus pot release (Phase 6)
- [ ] `POST /api/milestone-evidence` — upload evidence file
  - Accept photo uploads (progress photos, screenshots)
  - Store in Supabase Storage or S3
  - Record metadata (timestamp, type)

### Pages

- [ ] Milestone status view on client detail / enrollment detail
  - List of milestones with week number
  - Submission status per milestone (not submitted / pending review / approved / rejected)
  - Evidence preview (photos)
- [ ] Coach review UI
  - View submitted evidence
  - Approve / reject with notes
  - Clear audit trail
- [ ] Client portal milestone submission (`/portal/milestones`)
  - Client logs in (account created via email match from checkout)
  - Upload progress photos
  - Confirm check-in attendance
  - Auth stored as `auth_provider` + `auth_provider_id` on clients table (provider-agnostic)

### Evidence Upload (deferred — storage TBD)

- [ ] Storage provider setup (Supabase Storage or S3 — to be decided later)
- [ ] Upload component (drag & drop or file picker)
- [ ] Image preview + metadata display
- [ ] Timestamp validation (cannot be backdated — per pitch deck)

---

## Phase 6 — Bonus Pot Release

The core mechanic: escrow release on milestone completion.

### API

- [ ] `POST /api/bonus-pots/[id]/release` — release bonus pot to coach
  - Verify all milestones are approved
  - Create Stripe Transfer from platform to coach's Connect account
  - Update `bonus_pots` record: status → RELEASED, `released_at` → now
  - Update `stripe_transfer_id`
- [ ] `POST /api/bonus-pots/[id]/refund` — refund bonus pot to client
  - Create Stripe Refund
  - Update status → REFUNDED, `refunded_at` → now
- [ ] `POST /api/bonus-pots/[id]/donate` — donate unclaimed bonus pot
  - Update status → DONATED
  - Track donation reference

### Logic

- [ ] Auto-trigger release check when last milestone is approved
- [ ] Partial release support (if programme allows % release per milestone)
- [ ] Expiry logic: what happens if programme ends and milestones are incomplete?
  - Default: refund to client after X days grace period
  - Or: coach can extend deadline

### Dashboard Integration

- [ ] Bonus pots section on dashboard (match prototype "Bonus pots" tab)
  - On track / at risk / released counts with amounts
  - Per-client bonus pot progress with milestone completion %
- [ ] Bonus pot status on client detail page
  - Release button (enabled when all milestones approved)
  - Release confirmation modal

---

## Phase 7 — Payments Dashboard

Coach-facing view of all money movement.

### API

- [ ] `GET /api/payments` — list all payments for coach with filters
  - Filter by status (scheduled, pending, paid, failed, refunded)
  - Filter by type (base_fee, bonus_pot, platform_fee)
  - Filter by date range
  - Include client name, programme name

### Pages

- [ ] `/payments` — payments list page (sidebar link already exists)
  - Table/list view of all payments
  - Status badges (scheduled, pending, paid, failed)
  - Filter/search controls
  - Summary stats (total collected, pending, overdue)
- [ ] Payment detail (inline expand or separate page)
  - Stripe payment link
  - Retry failed payment action

---

## Phase 8 — Attendance Tracking

Session attendance per enrollment, used as milestone evidence.

### API

- [ ] `POST /api/attendance` — log attendance for enrollment
  - Date, attended (boolean), notes
- [ ] `GET /api/enrollments/[id]/attendance` — list attendance for enrollment

### Pages

- [ ] Attendance log on client detail / enrollment view
  - Calendar or list view of sessions
  - Quick toggle for attended / missed
  - Running count vs. required minimum

---

## Phase 9 — Polish & Production Readiness

### UI Components

- [ ] Wrap Radix UI Dialog (modal/confirmation dialogs)
- [ ] Wrap Radix UI Select (dropdowns for programme/client selection)
- [ ] Wrap Radix UI Tabs (for tabbed views)
- [ ] Toast/notification component
- [ ] Skeleton loaders for async content
- [ ] Empty state illustrations

### Error Handling

- [ ] Global error boundary
- [ ] API error responses (consistent format)
- [ ] Stripe error handling (card declined, 3D Secure, network errors)
- [ ] Retry logic for failed webhooks

### Production

- [ ] Environment variable validation on startup
- [ ] Rate limiting on API routes
- [ ] CORS configuration
- [ ] CSP headers
- [ ] Vercel deployment config
- [ ] Stripe webhook endpoint registration for production
- [ ] Database connection pooling tuning for Vercel serverless

### ESLint

- [ ] Fix ESLint config (circular reference error in current config)

---

## Phase 10 — Post-MVP (Phase 2+ from pitch deck)

Not in scope for MVP build, but noted for roadmap.

- [ ] Open banking checkout (GoCardless / Yapily integration)
- [ ] Free tier (up to 5 clients)
- [ ] Subscription billing (£29/mo coach subscription)
- [ ] Client communication (email templates, notifications)
- [ ] Wearable sync (Fitbit, Apple Health)
- [ ] White-label / branding options
- [ ] Bulk client import (CSV)
- [ ] Coach analytics / reporting
- [ ] Mobile-responsive refinements
- [ ] SEO / marketing pages (vs TrueCoach, vs My PT Hub)

---

## Dependency Graph

```
Phase 1 (Programmes)
  └─► Phase 2 (Clients)
        └─► Phase 3 (Enrollments)
              ├─► Phase 4 (Payments & Checkout)
              ├─► Phase 5 (Milestones)
              │     └─► Phase 6 (Bonus Pot Release)
              └─► Phase 8 (Attendance)
Phase 7 (Payments Dashboard) depends on Phase 4
Phase 9 (Polish) runs in parallel throughout
```

---

## Decisions Made

1. **Instalment structure**: 3 equal payments for MVP. Schema supports other structures later.
2. **Platform fee**: flat 1% on every payment via Stripe Connect `application_fee_amount`. Core revenue — in from day one.
3. **Client portal**: pay-first via public link (no login wall). Clients can create an account later to submit evidence and track progress. Email match links existing data. Auth stored as `auth_provider` + `auth_provider_id` on clients table so auth platform is swappable.

## Decisions Still Needed

1. **Evidence storage**: Supabase Storage vs S3? (deferred — will sort later)
2. **Bonus pot expiry**: auto-refund after X days, or manual coach decision?
