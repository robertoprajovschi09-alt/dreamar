# AgencyOS AI — Phase 1 Plan

A premium, multi-tenant SaaS foundation for marketing agencies. This phase delivers a fully usable product: agencies can sign up, subscribe, invite their team, manage clients with niche-specific dashboards, plan content, track video performance, log business impact, store documents, and manage tasks. AI features, Client Portal, AI Reports, Approval Workflow, Hook Library, and Strategy Room ship in Phase 2.

## Visual direction

Premium, scannable, agency-grade UI built around your three brand colors:

- **Background:** near-black `#0A0A0A` (dark mode default) and pure white `#FFFFFF` (light mode)
- **Accent:** signal red `#E11D2E` — used sparingly for primary CTAs, active states, alerts, and key metrics
- **Surfaces:** layered grays for cards, subtle red glow on hover for primary actions
- **Type:** Inter (UI) + JetBrains Mono (numbers/metrics) for that "ops dashboard" feel
- **Layout:** persistent left sidebar, top bar with workspace switcher + global search, content area with large headings, generous spacing, clean cards, dense tables when needed
- Dark mode by default, full light mode parity, theme toggle in top bar
- Fully responsive down to mobile (collapsible sidebar, stacked cards)

## What ships in Phase 1

### 1. Multi-tenant foundation
- Email/password + Google sign-in
- Agency workspaces (each user belongs to one or more agencies)
- Roles: **SaaS Admin**, **Agency Owner**, **Agency Team Member**, **Content Creator** (Client Viewer + Client Portal ship in Phase 2)
- Workspace switcher in top bar
- Strict data isolation: every query scoped to the active agency
- Invite team members by email (respects plan seat limits)

### 2. Billing (Stripe BYOK, 4 plans)
- Starter 99 / Growth 150 / Unlimited 249 / White Label Pro 399 (EUR/month)
- Stripe Checkout for new subscriptions, Customer Portal for plan changes/cancellation
- Webhook handler keeps subscription status + plan in sync
- **Plan-limit enforcement** in the DB and UI: client cap, seat cap, feature flags (AI reports, niche dashboards, white-label, custom branding)
- Friendly upgrade prompts when a limit is hit
- 14-day trial on signup

### 3. Agency Dashboard (home)
Cards: active clients, scheduled posts this week, pending approvals, monthly reports due, top-performing videos, underperforming clients, overdue tasks, AI alerts placeholder, client health score (basic rule-based for Phase 1, AI-powered in Phase 2). All cards click through to filtered views.

### 4. Client Management
Full CRUD for clients with all fields you specified: name, niche, city, website, contact person, start date, monthly retainer, status, objectives, platforms, brand voice, notes. Each client has tabs: Overview, Niche Dashboard, Calendar, Videos, Business Impact, Documents, Tasks, Settings.

### 5. Niche-based dashboards (4 niches in Phase 1)
- **Real Estate** — properties, views, messages, viewings, offers, sold, cost per lead
- **Restaurant** — products, reservations, orders, foot traffic, events, best dishes
- **Dental Clinic** — treatments, qualified leads, appointments, patients arrived, conversions
- **Fitness Gym** — memberships sold, trials, classes, transformations, new members
- Plus a **Custom** niche with a generic editable metric grid
- Each niche has its own form, metric cards, and table layout
- (Lounge, beauty, auto, hotel, local store ship in Phase 2 — same pattern, easy to add)

### 6. Content Calendar
- Monthly grid view, drag-and-drop posts between days
- Filter by client, platform, status (idea → script → filming → editing → sent for approval → approved → scheduled → published → analyzed)
- Post detail drawer: script, attached files, assigned member, deadline, client approval status placeholder
- List view alternative

### 7. Video Performance Tracker
- Per-video record with all 25+ fields you listed (client, platform, hook, body angle, CTA, format, duration, objective, views, reach, watch time, retention metrics, engagement, DMs, calls, sales impact, feedback, AI score placeholder, recommendation)
- Sortable/filterable table per client and across the agency
- Manual entry (no platform integrations in Phase 1)

### 8. Business Impact Tracker
- Manual entry form: calls, DMs, bookings, appointments, orders, sales, viewings, contracts, revenue estimate, qualitative feedback, objections
- Time-series chart per client
- Roll-up on Agency Dashboard

### 9. Document Library
- Per-client folders, upload PDFs/images/videos/brand files
- Tags, search, preview
- AI summarization stub (button visible, wired to Lovable AI in Phase 2)

### 10. Task Management
- Tasks with title, client, assignee, deadline, priority, status, type, comments, attachments
- Kanban + list views
- Overdue surfacing on Agency Dashboard

### 11. Admin Panel (SaaS Admin only)
- List all agencies, their plan, MRR, seat usage, client count
- Suspend/reactivate workspaces
- View global usage metrics

## Phase 2 (next iteration, not in this plan)
AI Monthly Report Generator (PDF), AI Strategy Room, Hook Library, Client Portal, Approval Workflow, AI document summarization, AI client health score, remaining 5 niche dashboards, white-label theming, custom domain structure, competitor watch.

---

## Technical notes

- **Stack:** React 18 + Vite + TypeScript + Tailwind + shadcn, Lovable Cloud (Supabase) for DB/auth/storage/edge functions
- **Multi-tenancy:** every domain table has `agency_id`; RLS policies enforce isolation via `SECURITY DEFINER` functions (`current_user_agencies()`, `has_role_in_agency(agency_id, role)`) to avoid recursion
- **Roles table:** separate `agency_members(agency_id, user_id, role)` table — never on profiles
- **Plan limits:** enforced both in DB triggers (hard cap) and UI (graceful upsell)
- **Stripe BYOK:** you'll add `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` as secrets after the plan is approved. I'll create a small script/edge function to provision the 4 products + prices in your Stripe account on first run, and store the resulting price IDs in a `plans` table
- **Storage:** one private bucket `agency-files` with path-based RLS (`{agency_id}/{client_id}/...`)
- **Edge functions:** `stripe-checkout`, `stripe-portal`, `stripe-webhook`, `invite-member`
- **Theme tokens:** all colors in `index.css` as HSL semantic tokens (`--accent`, `--accent-glow`, `--surface-1/2/3`, etc.) — never hardcoded — so reskinning for white-label in Phase 2 is trivial
- **No demo data seeded.** Empty states with clear CTAs everywhere.

```text
agencies ── agency_members ── auth.users
   │              │
   │              └── role (owner | team | creator | admin)
   │
   ├── subscriptions (stripe_customer_id, stripe_sub_id, plan, status, seats, client_cap)
   ├── clients ── niche, retainer, objectives, ...
   │      ├── niche_real_estate / niche_restaurant / niche_dental / niche_fitness / niche_custom
   │      ├── content_posts (calendar)
   │      ├── videos (performance tracker)
   │      ├── business_impact_entries
   │      ├── documents (storage refs)
   │      └── tasks
   └── (audit_log, invites)
```

## What I need from you after approval
1. Your **Stripe secret key** (test key is fine to start) — I'll prompt for it via the secrets tool
2. Optional: a logo file to drop in (otherwise I'll ship a clean wordmark "AgencyOS" with the red accent)

Once approved, I'll switch to build mode and start with the foundation (auth, agencies, roles, RLS, theming) before layering the modules.