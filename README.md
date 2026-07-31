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
RESEND_FROM=                 # e.g. "Maintenance <maintenance@send.example.com>" — see below
RESEND_REPLY_TO=             # optional: where tenant replies go
```

### Setting up real email

Until `RESEND_FROM` points at a verified domain, the app falls back to
`onboarding@resend.dev`, which **only delivers to addresses verified in the
Resend account** — so students receive nothing.

1. **Get a domain.** Sending from `vercel.app` isn't possible. Either the
   landlady's existing business domain or a new one (~£10/year).
2. **Add it in Resend** → Domains → Add Domain. Use a *subdomain* such as
   `send.example.com`, so email reputation stays isolated from the main domain.
3. **Add the DNS records Resend shows** at the registrar — DKIM, SPF, and an MX
   record for bounce handling. Verification usually takes minutes.
4. **Add a DMARC record.** Not enforced by Resend, but Gmail and Outlook weight
   it heavily, and many students will be on university mail with strict
   filtering. Start with `v=DMARC1; p=none; rua=mailto:you@example.com`.
5. **Set `RESEND_FROM`** in Vercel, e.g.
   `Student Maintenance <maintenance@send.example.com>`. No redeploy needed
   beyond the env change.
6. **Send a real test** to a Gmail and a university address, and check it isn't
   in spam.

Email failures are logged to the Vercel function logs (`Email to tenant failed
for MT-…`) and never fail the submission — the ticket is already saved by then.

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
      tickets/bulk/route.ts               # POST: bulk bin / restore / purge / resolve / reopen
      tickets/[reference]/
        resolved/route.ts                 # POST: marks resolved (media kept)
        escalate/route.ts                 # POST: marks escalated (status only, no email)
        reopen/route.ts                   # POST: sets status back to open
        delete/route.ts                   # POST: moves to bin (soft delete)
        restore/route.ts                  # POST: restores from bin
        purge/route.ts                    # POST: permanent delete — row + media files
        notes/route.ts                    # POST: saves private admin notes
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
    media.ts                              # browser-side image compression + HEIC→JPEG
    storage.ts                            # shared helpers for deleting ticket media
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
| deleted_at | timestamptz (nullable) | Set when moved to the bin; purged after 30 days |
| admin_notes | text (nullable) | Landlady's private notes — never shown to tenant or handyman |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### Full schema setup

Safe to run repeatedly — everything is `IF NOT EXISTS`, so a partially-migrated
database is fine. (A plain `CREATE TABLE` on an existing table errors and
silently skips every statement after it, which is easy to miss.)

```sql
CREATE TABLE IF NOT EXISTS job_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL,
  reference_numbers text[] NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS tenant_room text;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS sent_to_handyman_at timestamptz;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS admin_notes text;

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_batches ENABLE ROW LEVEL SECURITY;
```

If a `properties` table exists, enable RLS on it too:

```sql
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
```

### Why RLS with no policies

The anon key is public — it ships in the browser bundle — so without RLS anyone
can read and write the database directly using it. Every app query runs
server-side with the service role key, which bypasses RLS entirely, so enabling
RLS with **zero policies** locks out the anon key while the server keeps full
access. The browser only uses Supabase for `signInWithPassword` and `signOut`,
which hit the auth API rather than any table, so nothing breaks.

If a browser-side table query is ever added it will silently return nothing
until a policy is written for it.

### `ticket-media` storage bucket

- **Public** bucket — files readable by anyone with the URL
- Uploads go via signed URLs generated server-side (no RLS policy required)
- Max 5 files per submission. Videos capped at 25MB, photos at 50MB before compression
- Files are deleted only when a ticket is **purged** from the bin — resolving keeps them

### Image compression

Photos are downscaled to 1600px and re-encoded as JPEG in the browser before
upload (`src/lib/media.ts`), typically a 10x reduction while staying sharp enough
to diagnose a fault. This keeps the project inside the 1GB free storage tier —
roughly 1,400 tickets rather than 170.

It also converts HEIC to JPEG, so iPhone photos display in the dashboard and job
sheet instead of falling back to a download link. If the browser can't decode the
format (Chrome and Firefox can't read HEIC), the original file uploads unchanged,
so compression failing never blocks a submission — the HEIC download fallbacks in
the UI remain as a safety net.

Video can't be compressed browser-side, which is why the cap is lower: a single
25MB clip costs as much storage as ~35 compressed photos.

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
- **Urgent issues get no "problem solved" exit.** Following the safety steps
  doesn't remove the landlady's need for a record, so the only way off the tips
  screen is to report. Non-urgent issues keep the exit — that's the whole point
  of showing tips first.
- **Phone numbers are deliberately not format-validated.** Many students are
  international, and a UK-shaped rule would silently reject valid numbers
- Non-emergency tickets submit as `open` — landlady checks dashboard
- Progress bar correctly reflects visual order for both emergency and non-emergency flows
- Address search restricted to Birmingham via Google Places `locationRestriction`

### Address search

`api/places` returns each suggestion as `{ text, specific }`. Only `specific`
results — an actual building — can be submitted. Streets and postcodes come back
too, marked with "search ›"; selecting one feeds it back as the query so the
tenant narrows down to their building. Without that distinction, widening the
search would let someone submit "Tiverton Road, Birmingham" with no house number,
which is useless to a handyman.

Google Places is good at street names but **not** at UK postcode → full list of
houses; a postcode may return only the postcode area itself. A dedicated UK
address API (getAddress.io, Ideal Postcodes, Royal Mail PAF) does that properly
and is worth the small cost if postcode search turns out to matter.

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

Resolved tickets keep everything — the landlady needs a written record of what was
reported. Media is removed only when a ticket is purged from the bin.

### Status vs. sent — they are not the same thing

Status answers *how urgent is this*. The ✓ answers *has it been passed on*. A
ticket carries both independently:

| | Not sent | Sent |
|---|---|---|
| **open** | New, waiting for the next handyman round | With the handyman, routine |
| **escalated** | **Needs action now** — can't wait for the round | Urgent, handyman has it |

Escalate must not be repurposed to mean "dealt with" — the ✓ already records
that, emergency submissions set `escalated` automatically, and overloading it
would make the red flag meaningless exactly when it matters most.

---

## Admin Dashboard (`/admin/login` → `/admin/dashboard`)

To create admin credentials: Supabase → Authentication → Users → Add user.

**Mobile-first layout** — designed for phone use:
- On mobile: tickets show as tappable cards → tapping opens a full-screen detail panel
- On desktop: traditional table + side panel layout

Features:
- **Status tabs**: All / Open / Escalated / Resolved
- **Search**: matches reference, tenant name, room, address, category,
  description, private notes, and the report date — "July", "Jul", "29/07",
  "29 July" and "2026" all work
- **Filters**: property, category, and date
  (last 7d / last 30d / older than 6 months / older than 1 year / all)
- **Sort**: click a desktop column header to sort by tenant, property, status,
  sent or age; mobile gets a sort dropdown instead
- **Ticket age** is shown on every row and turns red once an unresolved ticket
  passes 14 days (`STALE_AFTER_DAYS`) — repairs must happen within a reasonable
  time of being reported
- **Sent status** — a bold green ✓ (its own desktop column), with the send date
  in the detail panel
- Detail panel includes:
  - Tenant name, room, email, phone, property, category, description
  - **Mark resolved** / **Escalate** / **Reopen** status buttons
  - **Private notes** — free-text box saved per ticket; tickets with notes show 📝
  - Tenant email and phone are `mailto:` / `tel:` links
  - **Move to bin** (with confirmation) — soft delete, recoverable for 30 days
  - **Send to handyman** — opens WhatsApp with this one ticket pre-filled
  - **Attachments** — images open in full-screen lightbox; HEIC/unsupported shows download button

### Duplicates — handled by grouping, not by a feature

Housemates sharing a boiler produce several tickets for one job. A
related-reports panel was built for this and then removed: it fired on
same-property-within-14-days regardless of category, so in a shared house it
triggered on most tickets, and judging a duplicate needs the other ticket's
photos and description, which a summary line can't provide.

The job sheet already groups by property, so duplicates arrive as adjacent lines
in the WhatsApp message — visible at the moment they matter, with no UI. The cost
of one slipping through is a line the handyman ignores; the cost of wrongly
merging two real faults is one never getting fixed. Grouping is the better trade.

### The bin

Deleting a ticket moves it to the bin rather than destroying it:

- The **🗑 Bin** tab shows binned tickets; they're hidden from all other views
- Each shows how many days remain before permanent deletion
- **Restore** puts it back; **Delete now** removes it and its media immediately
- Anything binned for more than 30 days is purged automatically (row + storage
  files) next time the dashboard loads — see `purgeExpiredBin` in
  `admin/dashboard/page.tsx`
- Binned tickets drop off any job sheet they were already on

### End-of-year clear-out

Records are kept for the tenancy year, then cleared when tenants change over:

1. Set the date filter to **Older than 1 year**
2. Tick the header checkbox to select everything showing
3. **🗑 Bin** in the selection bar, then confirm

That leaves a 30-day grace period before they're purged automatically. To skip
the wait, open the **Bin** tab, select all, and **Delete permanently** — that one
asks for confirmation, since it can't be undone.

Bulk actions run as a single request (`/api/tickets/bulk`) rather than one call
per ticket, so clearing a few hundred at once is fine.

### The selection bar

Ticking any checkbox raises a bar at the bottom of the screen. What it offers
depends on which tab you're in:

| Tab | Actions |
|---|---|
| All / Open | 🗑 Bin · Urgent · Resolve · Send |
| Escalated | 🗑 Bin · Resolve · Send |
| Resolved | 🗑 Bin · Reopen · Send |
| Bin | Restore · Delete |

Buttons lay out as a 2-column grid on mobile so four fit without cramping.

Every action confirms first, including Restore — an accidental restore drops
tickets back among hundreds of others with no easy way to find them again. The
prompts and button colours live in `BULK_CONFIRM` in `TicketTable.tsx`.

### The fortnightly round

The handyman visits roughly fortnightly, so the routine before a visit is:

1. Status tab **Open**, click the **Sent** column to bring unsent to the top
2. Header checkbox to select them all
3. **Send** — one WhatsApp message, grouped by property

Selecting tickets that have already gone out is fine: the send asks first and
offers **Send N new** (skipping the duplicates) or **Send all N** (deliberate
re-send, e.g. the handyman lost the message). It never re-sends silently.

After the visit, bulk **Resolve** whatever got done.

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
property with photos inline, urgent flags, and room numbers. This solves the
attachment problem: one link instead of a wall of raw image URLs.

The handyman is deliberately not given tenant phone numbers or emails — access
is arranged through the landlady.

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
| Emergency submission | Landlady (`LANDLORD_EMAIL`) | Urgent red-header email with full tenant + issue details, the tenant's photos inline, and a link to the dashboard |

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

## Known Issues

- **Tickets resolved before July 2026** had their photos deleted on resolve (the old behaviour), so their `media_urls` point at files that no longer exist.

---

## Blocking go-live

1. **Resend real domain** — the sandbox sender only delivers to addresses
   verified in Resend, so **no student currently receives their confirmation
   email**. Code is ready; it needs a domain, DNS records, and `RESEND_FROM`
   set in Vercel. See "Setting up real email" above. This is the one item that
   makes the student-facing half of the app work.
2. **Rotate API keys** — all keys were exposed in a dev session and should be
   rotated before real data exists.
3. **Replace `LANDLORD_EMAIL`** in Vercel with the landlady's real address —
   emergency alerts currently go to Roshan.
4. **PWA icons and app name** — `public/icon-192.png` / `icon-512.png` are
   placeholders and "Student Maintenance Hub" is provisional.

## Waiting on the landlady

5. **Category streamlining** — which categories and subcategories are actually
   relevant to her properties. To be done in one batch.
6. **Appliance manuals** — needs her appliance inventory per property, then a
   lookup table (property + category → manual URL) and an upload interface.
   Property is already collected before the tips screen, so the flow is ready.
7. **Does `escalated` earn its place?** — with the ✓ recording dispatch, its only
   remaining job is "can't wait for the fortnightly round". If she wouldn't use
   it, statuses collapse to open/resolved and emergency submissions need another
   way to signal urgency.
8. **CSV export** — plan agreed (exports the filtered view, handles quoting,
   Excel formula injection, UTF-8 BOM and ISO dates). Held pending her answer on
   whether she wants it. Note it preserves the written record only — photo links
   die with the tickets, so decide before the first changeover, not after.
9. **Emergency SMS** — email is sent now; does she also want a text?

## Worth doing, unprompted

10. **Surface email failures in the dashboard** — failures are now logged to
    Vercel, but the landlady can't see them. A `confirmation_failed` flag on the
    ticket would let her spot a tenant who never got confirmation.
11. **Handyman message wording** — copy pass on `formatBatchText` in
    `TicketTable.tsx`. No infrastructure change.
12. **Handyman job completion** — the job sheet is read-only; letting him tick
    jobs off would flow back to the dashboard.

## Decided against

- ~~Stats strip~~ — status counts sit on the tabs. Oldest-open is just a sort and
  most-reported-property wasn't actionable.
- ~~Duplicate detection~~ — built, then removed as more noise than help. See
  "Duplicates" above.
- ~~Phone format validation~~ — would silently reject international students.
