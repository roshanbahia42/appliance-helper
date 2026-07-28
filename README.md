# Student Maintenance Hub

A Next.js PWA for student tenants to report maintenance issues to their landlady. Designed for ~80 student tenants across multiple managed properties.

**Live URL:** https://appliance-helper.vercel.app  
**Auto-deploys from:** `main` branch on GitHub  
**Admin dashboard:** `/admin/dashboard`

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
| Hosting | Vercel |

---

## Environment Variables

Set in Vercel → Settings → Environment Variables (and locally in `.env.local`):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
GOOGLE_PLACES_API_KEY=
LANDLORD_EMAIL=          # currently Roshan's email — must be changed to landlady's before go-live
```

---

## Key Files

```
src/
  app/
    page.tsx                              # entire multi-step form (state machine)
    globals.css                           # Tailwind base + global button cursor
    manifest.ts                           # PWA manifest
    api/
      submit/route.ts                     # POST: saves ticket to DB, sends confirmation email
      places/route.ts                     # GET: Google Places autocomplete proxy
      tickets/[reference]/
        resolved/route.ts                 # POST: marks resolved, deletes media from storage
        escalate/route.ts                 # POST: marks escalated
    confirmation/[reference]/
      page.tsx                            # confirmation page (server component)
    admin/
      login/page.tsx                      # landlady login
      dashboard/
        page.tsx                          # auth-gated dashboard (server component)
        DashboardHeader.tsx               # header with ticket count
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

| Column | Type |
|---|---|
| id | uuid (PK) |
| reference_number | text |
| tenant_name | text |
| tenant_email | text |
| tenant_phone | text (nullable) |
| property_address | text |
| category | text |
| description | text |
| status | text (`open` / `escalated` / `resolved`) |
| media_urls | text[] (nullable) |
| created_at | timestamptz |
| updated_at | timestamptz |

### `ticket-media` storage bucket

- Public bucket (files served via public URL, no auth required to view)
- Files uploaded by tenant at form submission
- Files auto-deleted when ticket is marked resolved
- 50MB per-file limit enforced client-side

Storage policy to allow anonymous uploads:
```sql
CREATE POLICY "Allow anon uploads" ON storage.objects
  FOR INSERT TO anon WITH CHECK (bucket_id = 'ticket-media');
```

---

## User Flow

```
Step 1 — Category grid (11 categories)
  └─ has subcategories?
       ├─ Yes → Step 2 — Subcategory list
       │           └─ Step 3 — Troubleshooting tips
       │                 ├─ "Problem solved!" → success screen (no ticket created)
       │                 └─ "I still need help →" → Step 4
       └─ No (Other / Not Sure) → Step 4 directly

Step 4 — Property address (Google Places autocomplete, UK addresses)
Step 5 — Tenant details (name, email, phone, description, photos/videos)
  └─ Submit → POST /api/submit → redirect to /confirmation/[reference]
```

Emergency categories (`isEmergency: true`) skip step 3 and save the ticket as `escalated` immediately.

"Other / Not Sure" skips steps 2 and 3; description field becomes required.

---

## Ticket Statuses

| Status | Meaning | How it's set |
|---|---|---|
| `open` | Submitted, awaiting landlady attention | Default on submission |
| `escalated` | Needs priority attention | Emergency flag at submission, or admin escalates from dashboard |
| `resolved` | Fixed / closed | Admin marks resolved from dashboard |

When a ticket is marked **resolved**, its media files are automatically deleted from Supabase Storage.

---

## Admin Dashboard

URL: `/admin/dashboard`

- Landlady logs in at `/admin/login` with her Supabase Auth credentials
- Filter tickets by status: All / Open / Escalated / Resolved
- Click any row to open a detail side panel showing: tenant info, property, issue, description, photo/video attachments
- **Mark resolved** button — closes ticket and deletes uploaded media
- **Escalate** button — flags as priority (only shown for `open` tickets)

---

## Email

A confirmation email is sent to the **tenant** on submission, containing their reference number and a summary of the issue.

**Current limitation:** Using `onboarding@resend.dev` (Resend sandbox mode). This only delivers to email addresses verified in the Resend dashboard. To send to any student email address, a real sending domain must be set up in Resend and the `from` field updated in `src/app/api/submit/route.ts`.

No email is currently sent to the landlady on new submissions — she checks the dashboard. (Escalation notification is a pending task below.)

---

## Categories

All 11 categories, their subcategories, and troubleshooting tips live in `src/lib/categories.ts`. This is the only file to edit when updating the decision-tree content.

To add or edit a subcategory:
1. Find the category by `id` in `categories.ts`
2. Add/edit entries in `subcategories[]` — each has `id`, `name`, `description`, `tips[]`, and optionally `isUrgent: true`
3. Commit and push — Vercel auto-deploys

Categories with no `subcategories` skip steps 2 and 3 in the tenant flow.

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

Open [http://localhost:3000](http://localhost:3000).

Type-check: `npx tsc --noEmit`

---

## Pending / Known Issues

1. **Resend real domain** — sandbox mode only delivers to verified addresses. Needs a real sending domain in Resend and the `from` address updated in `api/submit/route.ts`.
2. **Replace `LANDLORD_EMAIL`** — update in Vercel environment variables to landlady's real email.
3. **Rotate API keys** — all keys should be rotated before go-live.
4. **Emergency alerts** — no notification sent to landlady when an emergency ticket is submitted. Options: urgent email (no new service), SMS via Twilio (more reliable), or both.
5. **Appliance manuals** — landlady has requested property/appliance-specific manuals shown on the confirmation page and in the confirmation email. Needs: appliance inventory per property from landlady, a DB lookup table mapping property + category to a manual URL, and an admin upload interface.
6. **PWA icons** — `public/icon-192.png` and `public/icon-512.png` are placeholder icons. Swap for real logo when available.
7. **Admin notes** — no way to add internal notes to a ticket or manually edit the status back to open.

---

## Questions to Ask the Landlady

Batch these into one conversation rather than asking piecemeal:

1. **Emergency alerts** — text, email, or both when an emergency ticket comes in? (currently: urgent email to landlady on emergency submissions only)
2. **Non-emergency notifications** — is she happy checking the dashboard for normal tickets, or does she want an email for every submission?
3. **Appliance manuals** — can she provide PDFs or photos of manuals? Which appliances are at which property?
4. **Appliance inventory** — full list of appliances per property (needed before manuals feature can be built)
5. **Her real email address** — to replace the placeholder `LANDLORD_EMAIL` in Vercel
6. **Sending domain** — does she have a domain or branded email address we can use for Resend? Currently Resend sandbox only sends to verified addresses
7. **Logo / branding** — PWA icons are a placeholder. Does she have a logo or colour preference?
