# Eastwinds Maintenance

A Next.js PWA for student tenants to report maintenance issues to their landlady.
Built for Eastwinds Property Group: roughly 80 student tenants across several
managed properties in Birmingham.

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
| Email | Resend (still the sandbox sender until the domain is set up) |
| Address lookup | Google Places API (New) — server-side proxy, restricted to Birmingham (15km radius) |
| Styling | Tailwind CSS v4, Lucide icons |
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
APP_URL=                     # the live site address, used to build email links
RESEND_FROM=                 # e.g. "Maintenance <maintenance@send.example.com>" — see below
RESEND_REPLY_TO=             # the landlady's real inbox — unmatched inbound email is forwarded here
REPLY_DOMAIN=                # the receiving domain for tenant replies — see Conversations
INBOUND_WEBHOOK_SECRET=      # whsec_... from the Resend webhook, verifies inbound posts
```

## Domain setup

Both jobs below are DNS changes on the landlady's existing domain, so do them
together in one request to whoever manages it. Nothing here is urgent to a
tenant, but until the email half is done **students receive no confirmation
emails at all** — the fallback sender only delivers to addresses verified in the
Resend account.

### One rule that decides everything

**The app and the email sending must use different subdomains.** A CNAME record
has to be the only record at its name; the app needs a CNAME, and Resend needs MX
and TXT records. Put both at the same subdomain and one will break.

| Purpose | Subdomain | Records |
|---|---|---|
| The app students visit | `maintenance.example.co.uk` | one CNAME, from Vercel |
| Sending email | `send.example.co.uk` | MX + TXT (or CNAMEs), from Resend |

Sender then reads `maintenance@send.example.co.uk`. Slightly redundant, but only
the domain registers with anyone reading it.

### 1. Get the records

**Vercel** → project → Settings → Domains → Add → enter the app subdomain.
It shows one CNAME record.

**Resend** → Domains → Add Domain → enter the sending subdomain. It shows three
records. Note the Type column rather than the labels: Resend files the MX record
under "SPF", so "one DKIM and two SPF" is the expected three.

Optionally add DMARC yourself, scoped to the sending subdomain so it cannot
affect her existing mail: TXT at `_dmarc.send`, value
`v=DMARC1; p=none; rua=mailto:her@example.co.uk`.

### 2. Send them to the web person

Screenshot both sets rather than retyping. A single dropped character in a DKIM
key fails silently. Include:

- **Additions only.** Do not modify or replace existing records, particularly
  the SPF or MX on the root domain, or her business email stops working.
- **Cloudflare users:** set these to "DNS only" (grey cloud), not proxied.
  Proxying breaks both mail authentication and the Vercel CNAME.
- **Enter names exactly as shown.** Some panels append the domain themselves,
  which turns `send.example.co.uk` into `send.example.co.uk.example.co.uk`.

Copy her in. An unknown person asking for DNS changes should make a good web
developer suspicious.

### 3. Finish in Vercel

Once both verify:

- Set `RESEND_FROM` to `Eastwinds Maintenance <maintenance@send.example.co.uk>`
- Set `APP_URL` to the new app address. This builds the "View your
  request" link in every confirmation email, so missing it leaves students with
  dead vercel.app links
- **Redeploy.** Environment variables do not take effect until you do
- Flip `SHOW_DELIVERY_WARNINGS` to false in `TicketTable.tsx`

### 4. Check

1. Email her at her normal address and confirm it still arrives. If DNS went
   wrong you want to know within the hour
2. Submit a test ticket to a Gmail address, checking the spam folder rather than
   assuming
3. Try a university address if you can. They filter hardest, and that's where
   most students are

Email failures are logged to the Vercel function logs (`Email to tenant failed
for MT-…`) and never fail a submission, since the ticket is already saved.

---

## Key Files

```
src/
  app/
    layout.tsx                            # root layout: Geist font, PWA meta tags
    page.tsx                              # entire multi-step student form (state machine)
    Brand.tsx                             # arch mark + wordmark lockup
    SiteHeader.tsx                        # navy header used on every screen
    icon.svg                              # favicon
    globals.css                           # Tailwind base + global button cursor
    manifest.ts                           # student PWA manifest (start_url: "/")
    api/
      submit/route.ts                     # POST: saves ticket to DB, sends emails
      places/route.ts                     # GET: Google Places autocomplete proxy (Birmingham only)
      upload-url/route.ts                 # POST: generates signed Supabase upload URL (bypasses RLS)
      job-batch/route.ts                  # POST: creates a handyman job sheet from selected tickets
      message-tenants/route.ts            # POST: emails a whole property, ticket-scoped or announcement
      inbound-email/route.ts              # POST: Resend webhook, threads student replies onto tickets
      find-ticket/route.ts                # POST: emails a student links to their tickets
      export/route.ts                     # GET: CSV of every ticket and its messages
      thread/[token]/reply/route.ts       # POST: student reply from the public thread page
      tickets/bulk/route.ts               # POST: bulk bin / restore / purge / resolve / reopen
      tickets/[reference]/
        resolved/route.ts                 # POST: marks resolved (media kept), notifies the student
        escalate/route.ts                 # POST: marks escalated (status only, no email)
        reopen/route.ts                   # POST: sets status back to open
        reply/route.ts                    # POST: the landlady's reply on a ticket's thread
        read/route.ts                     # POST: marks a ticket's inbound messages read
        delete/route.ts                   # POST: moves to bin (soft delete)
        restore/route.ts                  # POST: restores from bin
        purge/route.ts                    # POST: permanent delete — row + media files
        notes/route.ts                    # POST: saves the landlady's note for the handyman
    confirmation/[reference]/
      page.tsx                            # confirmation page (server component)
      CloseTicketButton.tsx               # client component — subtle self-resolve link
    job/[token]/
      page.tsx                            # public handyman job sheet — no auth, unguessable token
    t/[token]/
      page.tsx                            # public ticket thread for the student, same trust model
      ThreadReplyBox.tsx                  # client component: the student's reply box
    find-ticket/
      page.tsx                            # emails a student their ticket links
    admin/
      layout.tsx                          # admin layout — links to admin PWA manifest
      login/page.tsx                      # landlady login (Supabase Auth)
      dashboard/
        page.tsx                          # auth-gated dashboard + automatic bin purge
        DashboardHeader.tsx               # header with ticket count + logout
        TicketTable.tsx                   # state, filtering, list views, selection bar
        TicketDetail.tsx                  # one ticket: details, actions, notes, attachments
        Thread.tsx                        # the conversation view + reply composer
        AttachmentLightbox.tsx            # full-screen viewer with download fallback
        MessageTenants.tsx                # compose box for messaging a whole house
  lib/
    categories.ts                         # source of truth: all categories, subcategories, tips
                                          # also contains CONTACTS object with landlady/landlord phone numbers
    tickets.ts                            # Ticket type + pure logic: age, bin maths, sort/filter
                                          # config, handyman message formatters
    messages.ts                           # TicketMessage type + pure logic: matching, parsing, unread
    stripReply.ts                         # server-only quote stripping for inbound email
    notify.ts                             # the resolved-notification email, shared by both resolve paths
    categoryIcons.ts                      # category id -> Lucide icon
    media.ts                              # browser-side image compression + HEIC to JPEG
    storage.ts                            # shared helpers for deleting ticket media
middleware.ts                             # refreshes the Supabase session, guards /admin/dashboard
  utils/
    supabase/
      admin.ts                            # service-role client (server only)
      requireAdmin.ts                     # 401 guard for admin-only API routes
      server.ts                           # session-aware client (server)
      client.ts                           # browser client
public/
  brand/                                  # source SVGs for the mark and wordmark
  icon-512.png / icon-192.png             # PWA icons, rendered from brand/
  apple-icon.png                          # iOS home screen
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

-- Conversation threads. One row per message, either direction.
CREATE TABLE IF NOT EXISTS ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  sender_name text,
  sender_email text,
  body text NOT NULL,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  provider_message_id text UNIQUE,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ticket_messages_thread_idx
  ON ticket_messages (ticket_id, created_at);

-- Unguessable token used in both the reply address and the student thread URL.
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS public_token text
  DEFAULT replace(gen_random_uuid()::text, '-', '');

UPDATE tickets SET public_token = replace(gen_random_uuid()::text, '-', '')
  WHERE public_token IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS tickets_public_token_idx
  ON tickets (public_token);

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE ticket_messages TO service_role;
```

If a `properties` table exists, enable RLS on it too:

```sql
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
```

### Admin API routes require a session

The middleware only guards `/admin/dashboard`, which stops someone loading the
page but does nothing for the routes behind it. `requireAdmin()` gates every
admin route: bulk, job-batch, message-tenants, notes, delete, purge, restore,
escalate and reopen. Without it, anyone who knew the URL could POST to
`/api/tickets/bulk` and permanently purge tickets.

`/resolved` is deliberately left open, because the tenant's own close-ticket link
on the confirmation page calls it. `/submit`, `/places` and `/upload-url` are the
public student flow, and `/find-ticket` and `/thread/[token]/reply` are public by
design: the first never reveals anything, the second is keyed by the unguessable
token. `/inbound-email` is protected by the Svix signature instead of a session,
because Resend is the caller.

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

### Address search — why you must type the house number first

`api/places` only returns buildings (`street_address`, `premise`, `subpremise`),
so a tenant has to type "12 Tiverton" rather than "Tiverton Road".

Including `route` and `postal_code` was tried so that street and postcode
searches returned something, and reverted. Google autocomplete **matches text, it
cannot enumerate** — there is no query meaning "list every house on this street",
so selecting a street simply returned the same street. It was a dead end, and it
also risked someone submitting "Tiverton Road, Birmingham" with no house number.

The real issue was discoverability, not capability: nothing told tenants to lead
with their number, so typing a street name looked broken. The helper text and the
no-results message now say so explicitly.

**If postcode → house list is genuinely wanted**, it needs a UK PAF-backed API
(getAddress.io, Ideal Postcodes, Royal Mail PAF direct). Those enumerate properly:
type `B29 7QW`, get all fourteen houses. A few pounds a month at this volume.
Google cannot do it at any price.

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
  - **Notes for the handyman** — saved per ticket and included in the message
    sent to him. Tickets with notes show a marker in the list
  - **Message everyone at this property** — see below
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
3. **Bin** in the selection bar, then confirm

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

### Emailing tenants

Messaging one tenant happens in the ticket's conversation thread (see
Conversations below). **Message everyone at this property** in the ticket detail
starts the whole house on that same thread, with the ticket's details included
in the email. The filter row also carries a whole-house button for
announcements with no particular ticket in hand; replies to those go to the
landlady's inbox, not a thread.

Property sends go through `/api/message-tenants` so the sender address, the
template and the one-copy-each rule can only behave one way. The tenant's email
is shown as plain text rather than a `mailto:` link, because handing off to the
device's mail client sends from whatever personal account it happens to use,
which is the problem the thread exists to solve.

Whole-house recipients are worked out server-side from live tickets at that
address within the last year, so there is no tenant list to maintain: the annual
clear-out doubles as list maintenance, because binning last year's tickets drops
last year's tenants. The one-year window is a backstop for a clear-out that gets
skipped.

Everyone receives their own copy. One email with the whole house in the To field
would disclose every tenant's address to the others.

Tenants who have never reported anything won't be on the whole-house list. Asking
each new intake to file one test ticket at the start of the year closes that gap.

### Conversations (email threads on tickets)

Every ticket has a message thread. The landlady writes in the ticket's
conversation box; the student gets it by email and just hits reply; the reply
lands back on the thread. She gets no email for routine replies: the **Needs
reply** tab and the blue "new" badges in the dashboard are her signal, which is
the point: her inbox stays quiet and the written record stays complete.

How a reply finds its ticket, in priority order:

1. **The tagged address.** Outbound mail sets reply-to to
   `ticket+<public_token>@<REPLY_DOMAIN>`. The token comes back in the To
   field and is matched against `tickets.public_token`.
2. **Thread headers.** `In-Reply-To`/`References` matched against stored
   `provider_message_id`s.
3. **The reference in the subject.** `MT-YYYY-NNNNN`, which every outbound
   subject carries.

Anything that matches nothing, or matches a binned ticket, is **forwarded to
`RESEND_REPLY_TO`**, never dropped. Auto-replies (out-of-office and the like)
are detected by header and subject and discarded. Retries are safe: messages
dedupe on the provider's message id.

Replies to a resolved ticket **reopen it**, because "it's not actually fixed" is the
most likely content. Resolving a ticket emails the student, and that email's
reply-to is the tagged address, so their "no it isn't" comes straight back and
reopens it.

Photo attachments on replies are kept, but recompressed server-side with sharp
(1600px, JPEG 80) before storage. Emailed photos arrive ~10x larger than the
browser-compressed ones, and this is the main storage control. Known video
types are stored up to the same 25MB cap as the form; other file types are
skipped because the bucket is public and an .html or .svg would execute script.

**Setup (Resend side):**

1. Emails → Receiving gives the account a `<id>.resend.app` test domain that
   works with no DNS. `REPLY_DOMAIN` points there until cutover.
2. Webhooks → add the endpoint `https://<app domain>/api/inbound-email` with
   the `email.received` event; the signing secret is `INBOUND_WEBHOOK_SECRET`.
3. At cutover: MX records for `reply.<domain>` (values from Resend) go to the
   web person. It cannot be `send.` (send-only, MX already used for bounces)
   or the app's subdomain (its CNAME must be alone at that name). Then change
   `REPLY_DOMAIN` and redeploy. Nothing else changes.
4. For the first weeks, Resend's own "forward to an address" switch is worth
   turning on as a belt-and-braces net: the landlady gets a copy of every
   inbound email even if the webhook misbehaves. Deliberately noisy; switch it
   off once trusted.

Quote stripping (removing the quoted email under a reply) is heuristic: the
library handles Gmail and Outlook, but expect occasional stray quoted text
from unusual clients. A failure falls back to keeping the full text, never to
losing the message.

**The student's side:**

- `/t/<public_token>` is a public thread page, same trust model as the job
  sheet: the unguessable URL is the key. History, a reply box, the emergency
  phone numbers always visible, and a note that replying to a resolved ticket
  reopens it. It is both the chase-up route and the fallback when an emailed
  reply can't be matched.
- `/find-ticket` emails a student links to their tickets, for when the
  confirmation email is long gone. The response never reveals whether an
  address has tickets.
- The confirmation page links through to the thread.

**Export:** the Export CSV link in the dashboard filter row downloads every
ticket with its messages, one row per ticket, one per message under it.
Cells are escaped against spreadsheet formula injection.

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

## Known gaps worth a decision

These came out of a full review and are design questions rather than bugs.

**A student can't get back to their ticket.** The reference is only ever shown
once and in an email that currently never arrives. Closing the tab loses it.
`/confirmation/<reference>` works for anyone who has the number, so a "check my
request" box on the home page would be enough.

**Nothing sets expectations.** The confirmation page says the landlady has been
notified but never says roughly when to expect someone, so a tenant has no idea
whether silence at day three is normal.

**A photo is required for every report.** Fine for a cracked tile, awkward for no
hot water, an intermittent noise, or a smell — there is nothing to photograph, so
the tenant either abandons the form or submits a meaningless picture. Consider
requiring it only where it helps.

**The landlady has no triage view.** Counts and filters exist, but nothing says
"these three need you today". Sorting by age gets close.

**The job sheet is fire-and-forget.** Once sent there's no signal back, so the
only way to know whether work happened is to ask.

## Blocking go-live

1. **Domain setup.** Until it's done **no student receives a confirmation
   email**, because the fallback sender only delivers to verified addresses.
   The code is ready; this is DNS plus two environment variables. See "Domain
   setup" above, which covers the app URL and email sending together.
2. **Rotate API keys.** All keys were exposed in a dev session and should be
   rotated before real tenant data exists.
3. **Replace `LANDLORD_EMAIL`** in Vercel with the landlady's real address.
   Emergency alerts currently go to Roshan.
4. **Conversations cutover, once everything is tested.** Move `REPLY_DOMAIN`
   from the Resend test domain to `reply.<domain>` (MX records via the web
   person), and switch `/api/submit`'s reply-to from `RESEND_REPLY_TO` to the
   ticket's tagged address, so replies to the confirmation email land on the
   thread too. Deliberately left pointing at her inbox until then, so no live
   reply routes into an untested pipeline.

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
