# Student Maintenance Hub

A Next.js PWA for student tenants to report maintenance issues to their landlady. Designed for ~80 student tenants across multiple managed properties in Birmingham.

**Live URL:** https://appliance-helper-self.vercel.app  
**Auto-deploys from:** `main` branch on GitHub (`roshanbahia42/appliance-helper`)  
**Admin dashboard:** https://appliance-helper-self.vercel.app/admin/login

---

## Stack

| Layer | Service |
|---|---|
| Framework | Next.js (App Router) with Geist font |
| Database | Supabase (`tickets` table) |
| File storage | Supabase Storage (`ticket-media` bucket, public) |
| Email | Resend (`onboarding@resend.dev` — **sandbox**, see below) |
| Address lookup | Google Places API (New) — server-side proxy, restricted to Birmingham (15km radius) |
| Styling | Tailwind CSS v4 |
| Auth | Supabase Auth (admin only) |
| Hosting | Vercel (`appliance-helper-self.vercel.app`) |

---

## Environment Variables

Set in Vercel → Settings → Environment Variables (and locally in `.env.local`):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
GOOGLE_PLACES_API_KEY=
LANDLORD_EMAIL=              # currently Roshan's email — change to landlady's before go-live
NEXT_PUBLIC_APP_URL=https://appliance-helper-self.vercel.app
```

---

## Key Files

```
src/
  app/
    layout.tsx                            # root layout — Geist font, PWA meta tags
    page.tsx                              # entire multi-step student form (state machine)
    globals.css                           # Tailwind base + global button cursor
    manifest.ts                           # student PWA manifest (start_url: "/")
    api/
      submit/route.ts                     # POST: saves ticket to DB, sends emails
      places/route.ts                     # GET: Google Places autocomplete proxy (Birmingham only)
      upload-url/route.ts                 # POST: generates signed Supabase upload URL (bypasses RLS)
      job-batch/route.ts                  # POST: creates a handyman job sheet from selected tickets
      tickets/[reference]/
        resolved/route.ts                 # POST: marks resolved, deletes media from storage
        escalate/route.ts                 # POST: marks escalated (status only, no email)
        reopen/route.ts                   # POST: sets status back to open
        delete/route.ts                   # POST: deletes ticket + media files from storage
    confirmation/[reference]/
      page.tsx                            # confirmation page (server component)
      CloseTicketButton.tsx               # client component — subtle self-resolve link
    job/[token]/
      page.tsx                            # public handyman job sheet — no auth, unguessable token
    admin/
      layout.tsx                          # admin layout — links to admin PWA manifest
      login/page.tsx                      # landlady login (Supabase Auth)
      dashboard/
        page.tsx                          # auth-gated dashboard (server component)
        DashboardHeader.tsx               # header with ticket count + logout
        TicketTable.tsx                   # filterable ticket list, mobile-first
  lib/
    categories.ts                         # source of truth: all categories, subcategories, tips
                                          # also contains CONTACTS object with landlady/landlord phone numbers
  utils/
    supabase/
      admin.ts                            # service-role client (server only)
      server.ts                           # session-aware client (server)
      client.ts                           # browser client
public/
  admin-manifest.webmanifest              # admin PWA manifest (start_url: "/admin/login", scope: "/admin/")
  icon-192.png                            # PWA icon (placeholder — swap for real logo)
  icon-512.png                            # PWA icon (placeholder)
```

---

## Supabase Setup

### `tickets` table columns

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| reference_number | text | |
| tenant_name | text | |
| tenant_room | text | Room number — required at submission |
| tenant_email | text | |
| tenant_phone | text | Required at submission |
| property_address | text | |
| category | text | |
| description | text | Required at submission |
| status | text | `open` / `escalated` / `resolved` |
| media_urls | text[] (nullable) | Public Supabase Storage URLs — min 1 required at submission |
| sent_to_handyman_at | timestamptz (nullable) | Set when included in a job sheet |
| created_at | timestamptz | |
| updated_at | timestamptz | |

If `tenant_room` column is missing, run:
```sql
ALTER TABLE tickets ADD COLUMN tenant_room text;
```

### `job_batches` table

Stores handyman job sheets. Required for the batch send feature:

```sql
CREATE TABLE job_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL,
  reference_numbers text[] NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tickets ADD COLUMN sent_to_handyman_at timestamptz;
```

### `ticket-media` storage bucket

- **Public** bucket — files readable by anyone with the URL
- Uploads go via signed URLs generated server-side (no RLS policy required)
- Files auto-deleted when ticket is marked resolved or deleted
- 50MB per-file limit enforced client-side, max 5 files per submission
- HEIC files upload fine but won't preview in Chrome/Firefox — a download fallback is shown

---

## User Flow (Student)

```
Step 1 — Category grid (tap to select)
  └─ has subcategories?
       ├─ Yes, non-emergency → Step 2 — Subcategory
       │     └─ Step 3 — Property (progress bar: 3)
       │           └─ Step 4 — Troubleshooting tips + YouTube suggestion (progress bar: 4)
       │                 ├─ "Problem solved!" → success screen (no ticket created)
       │                 └─ "I still need help →" → Step 5
       ├─ Yes, emergency/urgent → Step 2 — Subcategory
       │     └─ Step 3 — Tips with emergency steps + contact numbers (progress bar: 3)
       │           └─ Step 4 — Property (progress bar: 4)
       │                 └─ Step 5
       └─ No subcategories (Other / Not Sure) → Step 3 — Property → Step 5

Step 5 — Tenant details (all fields required):
  Full Name*, Room No.*, Email*, Phone*, Description*, Photos or videos* (min 1)
  └─ Submit → POST /api/submit → redirect to /confirmation/[reference]
```

- Emergency categories submit as `escalated` and immediately email the landlady
- Non-emergency tickets submit as `open` — landlady checks dashboard
- Progress bar correctly reflects visual order for both emergency and non-emergency flows
- Address search restricted to Birmingham via Google Places `locationRestriction`

---

## Confirmation Page (`/confirmation/[reference]`)

Shows:
- Success banner with reference number and email confirmation
- Ticket summary: reference, property + room, issue category, description
- Uploaded attachments (images inline, HEIC/video as download link)
- "Your landlady has been notified" message
- Subtle "Issue since been resolved? Close this ticket" link

---

## Ticket Statuses

| Status | Meaning | How it's set |
|---|---|---|
| `open` | Submitted, awaiting attention | Default on submission |
| `escalated` | Priority — needs urgent attention | Emergency at submission; admin can escalate |
| `resolved` | Fixed / closed | Admin or tenant marks resolved |

When marked **resolved** or **deleted**, media files are automatically removed from Supabase Storage.

---

## Admin Dashboard (`/admin/login` → `/admin/dashboard`)

To create admin credentials: Supabase → Authentication → Users → Add user.

**Mobile-first layout** — designed for phone use:
- On mobile: tickets show as tappable cards → tapping opens a full-screen detail panel
- On desktop: traditional table + side panel layout

Features:
- **Status tabs**: All / Open / Escalated / Resolved
- **Filters**: tenant name search, property dropdown, category dropdown, date range (7d / 30d / all)
- Detail panel includes:
  - Tenant name, room, email, phone, property, category, description
  - **Mark resolved** / **Escalate** / **Reopen** status buttons
  - **Delete ticket** (with confirmation) — removes ticket + storage files
  - **Copy details** — clipboard-formatted text for handyman (property + room, issue, details, tenant name + phone — no email)
  - **WhatsApp** — opens WhatsApp with details pre-filled (single ticket)
  - **Attachments** — images open in full-screen lightbox; HEIC/unsupported shows download button

### Sending jobs to the handyman (batched)

The landlady's existing workflow was writing jobs into her notes app grouped by
property and sending one WhatsApp per property. The dashboard automates that:

1. Tick the checkbox on each ticket to send (or the header checkbox to select all filtered)
2. A bar appears at the bottom — tap **Send to handyman**
3. WhatsApp opens with one message, grouped by property:

```
Hi, 5 jobs:

1 Example Road
• Room 1 — Plumbing — Shower leaking
• Kitchen — Furniture — Coffee table leg

2 Example Road
• Room 6 — Furniture — Bed broken

Full details + photos: https://.../job/a1b2c3d4e5f6
```

The link opens a **job sheet** — a public mobile page grouping every issue by
property with photos inline, urgent flags, and tappable tenant phone numbers.
This solves the attachment problem: one link instead of a wall of raw image URLs.

Job sheets have no login. The 12-character random token is unguessable, and the
page shows nothing beyond what the handyman needs to do the work.

Tickets included in a job sheet are marked with a green ✓ **Sent** so it's clear
what has already been dispatched.

### Admin PWA

The landlady can install the admin dashboard as a home screen app:
1. Go to `https://appliance-helper-self.vercel.app/admin/login` in Safari
2. Share → Add to Home Screen

The admin pages use a separate manifest (`/admin-manifest.webmanifest`) with `start_url: "/admin/login"` so the app opens correctly every time.

---

## Email

| Trigger | Recipient | Content |
|---|---|---|
| Any submission | Tenant | Reference, issue summary, link to confirmation page |
| Emergency submission | Landlady (`LANDLORD_EMAIL`) | Urgent red-header email with full tenant + issue details, link to dashboard |

**Sandbox limitation:** Using `onboarding@resend.dev`. Only delivers to verified addresses in Resend. Needs a real sending domain to reach any student email.

---

## File Uploads

Files upload via signed URLs:
1. Browser calls `POST /api/upload-url` with filename + content type
2. Server generates a short-lived signed URL using the admin client (bypasses RLS)
3. Browser PUTs the file directly to Supabase Storage
4. Public URL stored in `media_urls[]` on the ticket

No storage RLS policies needed. Progress bar tracks per-file upload progress.

---

## Categories

All categories, subcategories, and troubleshooting tips live in `src/lib/categories.ts`. To add or edit:
1. Find the category by `id`
2. Edit `subcategories[]` — each entry has `id`, `name`, `description`, `tips[]`, optionally `isUrgent: true`
3. Commit and push — Vercel auto-deploys

Emergency contact numbers (landlady + landlord 2) are in the `CONTACTS` object at the top of the file. Update there if numbers change — they're referenced in all emergency tips automatically.

Categories with no subcategories skip steps 2 and 3.

---

## Reference Number Format

`MT-{year}-{5-digit-random}` — e.g. `MT-2026-47382`

---

## Running Locally

```bash
npm install
# create .env.local with the variables listed above
npm run dev
```

Type-check: `npx tsc --noEmit`

---

## Known Cosmetic Issues

- **Double filename in file picker**: selected file names appear both in the native input element and in the custom list below it. Functional, cosmetic fix deferred.

---

## Pending / To Do

1. **Category streamlining** — landlady to confirm which categories/subcategories are relevant to her properties. Agreed to do in one batch.
2. **Appliance manuals** — property-specific manuals to appear on the troubleshooting tips screen (property is now collected before tips, so the architecture is ready). Needs: appliance inventory per property, DB lookup table (property + category → manual URL), admin upload interface.
3. **Resend real domain** — sandbox only delivers to verified addresses. Set up a real sending domain in Resend and update `from` in `api/submit/route.ts`.
4. **Replace `LANDLORD_EMAIL`** — change in Vercel env vars to landlady's real address.
5. **Rotate API keys** — all keys should be rotated before go-live (previously exposed in a dev session).
6. **PWA icons** — placeholder icons in `public/`. Replace with real logo when available; update both `icon-192.png` and `icon-512.png`.
7. **App name / branding** — "Student Maintenance Hub" is provisional. Decide on final name, logo, and category icons before launch.
8. **Admin notes** — no way to add internal notes to a ticket.
9. **Handyman job completion** — the job sheet is read-only. Could later let the
   handyman tick jobs off, which would flow back to the dashboard.

---

## Questions to Ask the Landlady

Batch into one conversation:

1. **Emergency alerts** — email is sent now; does she also want a text (SMS via Twilio)?
2. **Appliance manuals** — can she provide PDFs/photos? Which appliances at which properties?
3. **Appliance inventory** — full list per property (needed to build the manuals feature)
4. **Her real email address** — to replace `LANDLORD_EMAIL` in Vercel
5. **Sending domain** — does she have a domain for Resend to send from?
6. **Logo / branding** — real logo to replace the placeholder house icon and PWA icons
7. **App name** — final name for the app and admin portal
