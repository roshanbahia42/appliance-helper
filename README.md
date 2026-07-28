# Student Maintenance Hub

A Next.js PWA for student tenants to report maintenance issues to their landlady. Designed for ~80 student tenants across multiple managed properties.

**Live URL:** https://appliance-helper-self.vercel.app  
**Auto-deploys from:** `main` branch on GitHub (`roshanbahia42/appliance-helper`)  
**Admin dashboard:** https://appliance-helper-self.vercel.app/admin/login

---

## Stack

| Layer | Service |
|---|---|
| Framework | Next.js (App Router) |
| Database | Supabase (`tickets` table) |
| File storage | Supabase Storage (`ticket-media` bucket, public) |
| Email | Resend (`onboarding@resend.dev` — **sandbox**, see below) |
| Address lookup | Google Places API (New) — server-side proxy, key never sent to browser |
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
    page.tsx                              # entire multi-step form (state machine, all 5 steps)
    globals.css                           # Tailwind base + global button cursor
    manifest.ts                           # PWA manifest
    api/
      submit/route.ts                     # POST: saves ticket to DB, sends emails
      places/route.ts                     # GET: Google Places autocomplete proxy
      upload-url/route.ts                 # POST: generates signed Supabase upload URL (bypasses RLS)
      tickets/[reference]/
        resolved/route.ts                 # POST: marks resolved, deletes media from storage
        escalate/route.ts                 # POST: marks escalated (status only, no email)
        reopen/route.ts                   # POST: sets status back to open
        delete/route.ts                   # POST: deletes ticket + media files from storage
    confirmation/[reference]/
      page.tsx                            # confirmation page (server component)
      CloseTicketButton.tsx               # client component — subtle self-resolve link
    admin/
      login/page.tsx                      # landlady login (Supabase Auth)
      dashboard/
        page.tsx                          # auth-gated dashboard (server component)
        DashboardHeader.tsx               # header with ticket count + logout
        TicketTable.tsx                   # filterable ticket list + detail side panel
  lib/
    categories.ts                         # source of truth: all categories, subcategories, tips
  utils/
    supabase/
      admin.ts                            # service-role client (server only)
      server.ts                           # session-aware client (server)
      client.ts                           # browser client
public/
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
| tenant_room | text (nullable) | Room number if applicable |
| tenant_email | text | |
| tenant_phone | text (nullable) | |
| property_address | text | |
| category | text | |
| description | text | |
| status | text | `open` / `escalated` / `resolved` |
| media_urls | text[] (nullable) | Public Supabase Storage URLs |
| created_at | timestamptz | |
| updated_at | timestamptz | |

If `tenant_room` column is missing, run:
```sql
ALTER TABLE tickets ADD COLUMN tenant_room text;
```

### `ticket-media` storage bucket

- **Public** bucket — files readable by anyone with the URL
- Uploads go via signed URLs generated server-side (no RLS policy required)
- Files auto-deleted when ticket is marked resolved or deleted
- 50MB per-file limit enforced client-side, max 5 files per submission
- HEIC files upload fine but won't preview in Chrome/Firefox — a download fallback is shown

---

## User Flow

```
Step 1 — Category grid (11 categories, logo links home)
  └─ has subcategories?
       ├─ Yes → Step 2 — Subcategory list
       │           └─ Step 3 — Troubleshooting tips
       │                 ├─ "Problem solved!" → success screen (no ticket created)
       │                 └─ "I still need help →" → Step 4
       └─ No (Other / Not Sure) → Step 4 directly

Step 4 — Property address (Google Places autocomplete, UK addresses)
Step 5 — Tenant details: name, room number (optional), email, phone (optional),
          description, photos/videos (up to 5, 50MB each)
  └─ Submit → POST /api/submit → redirect to /confirmation/[reference]
```

- Emergency categories skip step 3 and save as `escalated` immediately + email landlady
- "Other / Not Sure" skips steps 2 and 3; description becomes required
- All step headers have a house logo icon linking back to `/`

---

## Confirmation Page (`/confirmation/[reference]`)

Shows:
- ✅ Success banner with reference number and email confirmation
- Ticket summary: reference, property + room, issue category, description
- Uploaded attachments (images inline, HEIC/video as download link)
- "Your landlady has been notified" message
- Subtle "Issue since been resolved? Close this ticket" link
- "View your request →" button also in the confirmation email

---

## Ticket Statuses

| Status | Meaning | How it's set |
|---|---|---|
| `open` | Submitted, awaiting attention | Default on submission |
| `escalated` | Priority — needs urgent attention | Emergency at submission; admin escalates from dashboard |
| `resolved` | Fixed / closed | Admin or tenant marks resolved |

When marked **resolved** or **deleted**, media files are automatically removed from Supabase Storage.

---

## Admin Dashboard (`/admin/login` → `/admin/dashboard`)

To create admin credentials: Supabase → Authentication → Users → Add user.

Features:
- **Status tabs**: All / Open / Escalated / Resolved
- **Filters**: tenant name search, property dropdown, category dropdown, date range (7d / 30d / all)
- Click any row → detail side panel with:
  - Tenant name, room, email, phone, property, category, description
  - **Mark resolved** / **Escalate** / **Reopen** status buttons
  - **Delete ticket** (with confirmation) — removes ticket + storage files
  - **Copy details** — clipboard-formatted text for handyman (no email included)
  - **WhatsApp** — opens WhatsApp with details pre-filled for forwarding to handyman
  - **Attachments** — images open in full-screen lightbox; HEIC/unsupported shows download button

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

All 11 categories, subcategories, and troubleshooting tips live in `src/lib/categories.ts`. To add or edit:
1. Find the category by `id`
2. Edit `subcategories[]` — each entry has `id`, `name`, `description`, `tips[]`, optionally `isUrgent: true`
3. Commit and push — Vercel auto-deploys

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

1. **Resend real domain** — sandbox only delivers to verified addresses. Set up a real sending domain in Resend and update `from` in `api/submit/route.ts`.
2. **Replace `LANDLORD_EMAIL`** — change in Vercel env vars to landlady's real address.
3. **Rotate API keys** — all keys should be rotated before go-live (previously exposed in a dev session).
4. **Appliance manuals** — landlady wants property/appliance-specific manuals on the confirmation page and in the email. Needs: appliance inventory per property, DB lookup table (property + category → manual URL), admin upload interface.
5. **PWA icons** — placeholder icons in `public/`. Replace with real logo when available; also update `LogoLink` SVG in `page.tsx`.
6. **Admin notes** — no way to add internal notes to a ticket.
7. **Remove placeholder examples from form inputs** — "e.g. Jamie Smith" etc. on name/room fields are unnecessary; strip before go-live.

---

## Questions to Ask the Landlady

Batch into one conversation:

1. **Emergency alerts** — email is sent now; does she also want a text (SMS via Twilio)?
2. **Non-emergency notifications** — happy checking the dashboard, or wants an email on every submission?
3. **Appliance manuals** — can she provide PDFs/photos? Which appliances at which properties?
4. **Appliance inventory** — full list per property (needed to build the manuals feature)
5. **Her real email address** — to replace `LANDLORD_EMAIL` in Vercel
6. **Sending domain** — does she have a domain for Resend to send from?
7. **Logo / branding** — real logo to replace the placeholder house icon and PWA icons
