/**
 * Ticket shape and the pure logic around it — no React, no data fetching, so
 * everything here is trivially testable and reusable by any view.
 */

export type Ticket = {
  id: string;
  reference_number: string;
  tenant_name: string;
  tenant_room: string | null;
  tenant_email: string;
  tenant_phone: string | null;
  property_address: string;
  category: string;
  description: string;
  status: string;
  media_urls: string[] | null;
  created_at: string;
  sent_to_handyman_at: string | null;
  deleted_at: string | null;
  admin_notes: string | null;
  confirmation_failed: boolean | null;
};

export type BulkAction =
  | "delete"
  | "purge"
  | "resolve"
  | "reopen"
  | "restore"
  | "escalate";

const DAY_MS = 86_400_000;

/** Matches the automatic purge in admin/dashboard/page.tsx. */
export const BIN_RETENTION_DAYS = 30;

/**
 * Unresolved tickets older than this are flagged. Repairs have to happen within
 * a reasonable time of being reported, so age is the number that matters.
 */
export const STALE_AFTER_DAYS = 14;

export const STATUS_COLORS: Record<string, string> = {
  open: "bg-yellow-100 text-yellow-800",
  resolved: "bg-green-100 text-green-800",
  escalated: "bg-red-100 text-red-800",
};

export function ageInDays(createdAt: string) {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / DAY_MS);
}

export function formatAge(createdAt: string) {
  const days = ageInDays(createdAt);
  if (days === 0) return "Today";
  if (days === 1) return "1 day";
  return `${days} days`;
}

export function isStale(ticket: Pick<Ticket, "created_at" | "status">) {
  return (
    ticket.status !== "resolved" && ageInDays(ticket.created_at) >= STALE_AFTER_DAYS
  );
}

export function daysLeftInBin(deletedAt: string) {
  const expires = new Date(deletedAt);
  expires.setDate(expires.getDate() + BIN_RETENTION_DAYS);
  return Math.max(0, Math.ceil((expires.getTime() - Date.now()) / DAY_MS));
}

/**
 * Text for a single job. The handyman deliberately gets no tenant email or
 * phone number — access is arranged through the landlady.
 */
export function formatHandymanText(ticket: Ticket) {
  return [
    `Property: ${ticket.property_address}${ticket.tenant_room ? ` — Room ${ticket.tenant_room}` : ""}`,
    `Issue: ${ticket.category}`,
    ticket.description ? `Details: ${ticket.description}` : null,
    (ticket.media_urls?.length ?? 0) > 0
      ? `\nPhotos/videos:\n${ticket.media_urls!.join("\n")}`
      : null,
  ]
    .filter((line) => line !== null)
    .join("\n");
}

/**
 * Several jobs as one message, grouped by property — the format the landlady
 * already used by hand, so the handyman sees nothing new. Duplicates for one
 * fault end up as adjacent lines, which is how they get spotted.
 */
export function formatBatchText(tickets: Ticket[], jobSheetUrl: string) {
  const byProperty = tickets.reduce<Record<string, Ticket[]>>((acc, ticket) => {
    (acc[ticket.property_address] ??= []).push(ticket);
    return acc;
  }, {});

  const lines = [
    `Hi, ${tickets.length} ${tickets.length === 1 ? "job" : "jobs"}:`,
    "",
  ];

  for (const address of Object.keys(byProperty).sort()) {
    lines.push(address);
    for (const ticket of byProperty[address]) {
      lines.push(
        `• ${ticket.tenant_room ? `Room ${ticket.tenant_room} — ` : ""}${ticket.category}`
      );
    }
    lines.push("");
  }

  lines.push(`Full details + photos: ${jobSheetUrl}`);
  return lines.join("\n");
}

/** Every bulk action confirms first — see BULK_CONFIRM's use in the selection bar. */
export const BULK_CONFIRM: Record<
  BulkAction,
  { prompt: (n: number) => string; label: string; loading: string; className: string }
> = {
  delete: {
    prompt: (n) => `Move ${n} ${n === 1 ? "ticket" : "tickets"} to the bin?`,
    label: "Yes, move to bin",
    loading: "Moving...",
    className: "bg-red-600 hover:bg-red-700",
  },
  purge: {
    prompt: (n) =>
      `Delete ${n} ${n === 1 ? "ticket" : "tickets"} permanently? This cannot be undone.`,
    label: "Yes, delete",
    loading: "Deleting...",
    className: "bg-red-600 hover:bg-red-700",
  },
  resolve: {
    prompt: (n) => `Mark ${n} ${n === 1 ? "ticket" : "tickets"} as resolved?`,
    label: "Yes, resolve",
    loading: "Saving...",
    className: "bg-green-600 hover:bg-green-700",
  },
  reopen: {
    prompt: (n) => `Reopen ${n} ${n === 1 ? "ticket" : "tickets"}?`,
    label: "Yes, reopen",
    loading: "Reopening...",
    className: "bg-blue-600 hover:bg-blue-700",
  },
  restore: {
    // Even restore confirms: an accidental one scatters tickets back among
    // hundreds of others with no easy way to find them again.
    prompt: (n) => `Restore ${n} ${n === 1 ? "ticket" : "tickets"} from the bin?`,
    label: "Yes, restore",
    loading: "Restoring...",
    className: "bg-blue-600 hover:bg-blue-700",
  },
  escalate: {
    prompt: (n) => `Flag ${n} ${n === 1 ? "ticket" : "tickets"} as urgent?`,
    label: "Yes, escalate",
    loading: "Escalating...",
    className: "bg-red-600 hover:bg-red-700",
  },
};

export const SORT_OPTIONS = [
  { label: "Newest first", value: "created-desc" },
  { label: "Oldest first", value: "created-asc" },
  { label: "Tenant A–Z", value: "tenant-asc" },
  { label: "Property A–Z", value: "property-asc" },
  { label: "Status", value: "status-asc" },
  { label: "Not sent first", value: "sent-asc" },
];

export const SORT_VALUES: Record<string, (t: Ticket) => string | number> = {
  created: (t) => new Date(t.created_at).getTime(),
  tenant: (t) => t.tenant_name.toLowerCase(),
  property: (t) => t.property_address.toLowerCase(),
  status: (t) => t.status,
  sent: (t) => (t.sent_to_handyman_at ? 1 : 0),
};

/**
 * "recent-N" keeps tickets from the last N days, "older-N" keeps ones from
 * before then. The latter is what makes an end-of-tenancy clear-out possible.
 */
export const DATE_OPTIONS = [
  { label: "All time", value: "all" },
  { label: "Last 7 days", value: "recent-7" },
  { label: "Last 30 days", value: "recent-30" },
  { label: "Older than 6 months", value: "older-183" },
  { label: "Older than 1 year", value: "older-365" },
];
