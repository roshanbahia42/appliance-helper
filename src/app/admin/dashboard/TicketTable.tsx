"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Ticket = {
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

// Every confirmation currently fails, because RESEND_FROM still points at the
// sandbox sender that only delivers to verified addresses. The warning would
// therefore appear on every ticket and mean nothing. Flip to true once a
// verified sending domain is live — see "Setting up real email" in the README.
const SHOW_DELIVERY_WARNINGS = true;

const BIN_RETENTION_DAYS = 30;

function daysLeftInBin(deletedAt: string) {
  const expires = new Date(deletedAt);
  expires.setDate(expires.getDate() + BIN_RETENTION_DAYS);
  const days = Math.ceil((expires.getTime() - Date.now()) / 86_400_000);
  return Math.max(0, days);
}

const STATUS_COLORS: Record<string, string> = {
  open: "bg-yellow-100 text-yellow-800",
  resolved: "bg-green-100 text-green-800",
  escalated: "bg-red-100 text-red-800",
};

// Anything unresolved beyond this gets flagged — repairs have to happen within a
// reasonable time, measured from when the tenant reported it.
const STALE_AFTER_DAYS = 14;

function ageInDays(createdAt: string) {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000);
}

function formatAge(createdAt: string) {
  const days = ageInDays(createdAt);
  if (days === 0) return "Today";
  if (days === 1) return "1 day";
  return `${days} days`;
}

function isStale(ticket: { created_at: string; status: string }) {
  return ticket.status !== "resolved" && ageInDays(ticket.created_at) >= STALE_AFTER_DAYS;
}

type BulkAction = "delete" | "purge" | "resolve" | "reopen" | "restore" | "escalate";

// Every bulk action confirms first. Even restore: an accidental one scatters
// tickets back among hundreds of others with no easy way to find them again.
const BULK_CONFIRM: Record<
  string,
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

const SORT_OPTIONS = [
  { label: "Newest first", value: "created-desc" },
  { label: "Oldest first", value: "created-asc" },
  { label: "Tenant A–Z", value: "tenant-asc" },
  { label: "Property A–Z", value: "property-asc" },
  { label: "Status", value: "status-asc" },
  { label: "Not sent first", value: "sent-asc" },
];

const SORT_VALUES: Record<string, (t: Ticket) => string | number> = {
  created: (t) => new Date(t.created_at).getTime(),
  tenant: (t) => t.tenant_name.toLowerCase(),
  property: (t) => t.property_address.toLowerCase(),
  status: (t) => t.status,
  sent: (t) => (t.sent_to_handyman_at ? 1 : 0),
};

// "recent-N" keeps tickets from the last N days; "older-N" keeps ones from before
// then — the latter is what makes an end-of-year clear-out possible.
const DATE_OPTIONS = [
  { label: "All time", value: "all" },
  { label: "Last 7 days", value: "recent-7" },
  { label: "Last 30 days", value: "recent-30" },
  { label: "Older than 6 months", value: "older-183" },
  { label: "Older than 1 year", value: "older-365" },
];

export default function TicketTable({ tickets }: { tickets: Ticket[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [bulkLoading, setBulkLoading] = useState<string | null>(null);
  const [confirmBulk, setConfirmBulk] = useState<BulkAction | null>(null);
  const [sendConflict, setSendConflict] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);

  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDate, setFilterDate] = useState("all");
  const [filterProperty, setFilterProperty] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("created-desc");

  const uniqueProperties = [...new Set(tickets.map((t) => t.property_address))].sort();
  const uniqueCategories = [...new Set(tickets.map((t) => t.category))].sort();

  const inBin = filterStatus === "bin";

  // Everything except status, so the tab counts can reflect the other filters.
  const matchesFilters = (t: Ticket) => {
    {
      if (filterProperty !== "all" && t.property_address !== filterProperty) return false;
      if (filterCategory !== "all" && t.category !== filterCategory) return false;
      if (search) {
        const created = new Date(t.created_at);
        const haystack = [
          t.tenant_name,
          t.tenant_room,
          t.reference_number,
          t.property_address,
          t.category,
          t.description,
          t.admin_notes,
          // Several formats so "July", "Jul", "29/07", "29 July" and "2026" all hit.
          created.toLocaleDateString("en-GB"),
          created.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
          created.toLocaleDateString("en-GB", { month: "short" }),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(search.toLowerCase())) return false;
      }
      if (filterDate !== "all") {
        const [mode, days] = filterDate.split("-");
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - Number(days));
        const created = new Date(t.created_at);
        if (mode === "recent" && created < cutoff) return false;
        if (mode === "older" && created > cutoff) return false;
      }
      return true;
    }
  };

  const statusCounts = {
    all: tickets.filter((t) => !t.deleted_at && matchesFilters(t)).length,
    open: tickets.filter((t) => !t.deleted_at && t.status === "open" && matchesFilters(t)).length,
    escalated: tickets.filter((t) => !t.deleted_at && t.status === "escalated" && matchesFilters(t)).length,
    resolved: tickets.filter((t) => !t.deleted_at && t.status === "resolved" && matchesFilters(t)).length,
  } as Record<string, number>;

  const filtered = tickets
    .filter((t) => {
      if (inBin !== !!t.deleted_at) return false;
      if (!inBin && filterStatus !== "all" && t.status !== filterStatus) return false;
      return matchesFilters(t);
    })
    .sort((a, b) => {
      const [field, direction] = sort.split("-");
      const get = SORT_VALUES[field] ?? SORT_VALUES.created;
      const av = get(a);
      const bv = get(b);
      if (av === bv) return 0;
      return (av < bv ? -1 : 1) * (direction === "asc" ? 1 : -1);
    });

  const hasActiveFilters =
    filterStatus !== "all" || filterDate !== "all" || filterProperty !== "all" ||
    filterCategory !== "all" || search !== "" || sort !== "created-desc";

  const clearFilters = () => {
    setFilterStatus("all");
    setFilterDate("all");
    setFilterProperty("all");
    setFilterCategory("all");
    setSearch("");
    setSort("created-desc");
  };

  /** Clicking a desktop column header cycles that column's sort direction. */
  const toggleSort = (field: string) => {
    setSort((prev) => {
      const [prevField, prevDirection] = prev.split("-");
      if (prevField !== field) return `${field}-${field === "created" ? "desc" : "asc"}`;
      return `${field}-${prevDirection === "asc" ? "desc" : "asc"}`;
    });
  };

  const sortIndicator = (field: string) => {
    const [currentField, direction] = sort.split("-");
    if (currentField !== field) return "";
    return direction === "asc" ? " ↑" : " ↓";
  };

  const binTicket = async (reference: string, action: "delete" | "purge" | "restore") => {
    setActionLoading(action);
    await fetch(`/api/tickets/${reference}/${action}`, { method: "POST" });
    setActionLoading(null);
    setSelected(null);
    setConfirmDelete(false);
    router.refresh();
  };

  const updateStatus = async (reference: string, action: "resolved" | "escalate" | "reopen") => {
    setActionLoading(action);
    await fetch(`/api/tickets/${reference}/${action}`, { method: "POST" });
    setActionLoading(null);
    setSelected(null);
    router.refresh();
  };

  const formatHandymanText = (ticket: Ticket) =>
    [
      `Property: ${ticket.property_address}${ticket.tenant_room ? ` — Room ${ticket.tenant_room}` : ""}`,
      `Issue: ${ticket.category}`,
      ticket.description ? `Details: ${ticket.description}` : null,
      (ticket.media_urls?.length ?? 0) > 0
        ? `\nPhotos/videos:\n${ticket.media_urls!.join("\n")}`
        : null,
    ]
      .filter((l) => l !== null)
      .join("\n");

  const whatsappForHandyman = (ticket: Ticket) => {
    const text = encodeURIComponent(formatHandymanText(ticket));
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((t) => selectedIds.has(t.id));

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) filtered.forEach((t) => next.delete(t.id));
      else filtered.forEach((t) => next.add(t.id));
      return next;
    });
  };

  const formatBatchText = (chosen: Ticket[], url: string) => {
    const byProperty = chosen.reduce<Record<string, Ticket[]>>((acc, t) => {
      (acc[t.property_address] ??= []).push(t);
      return acc;
    }, {});

    const lines = [`Hi, ${chosen.length} ${chosen.length === 1 ? "job" : "jobs"}:`, ""];
    for (const address of Object.keys(byProperty).sort()) {
      lines.push(address);
      for (const t of byProperty[address]) {
        lines.push(`• ${t.tenant_room ? `Room ${t.tenant_room} — ` : ""}${t.category}`);
      }
      lines.push("");
    }
    lines.push(`Full details + photos: ${url}`);
    return lines.join("\n");
  };

  const selectedTickets = tickets.filter((t) => selectedIds.has(t.id));
  const alreadySentCount = selectedTickets.filter((t) => t.sent_to_handyman_at).length;

  /** Re-sending is allowed but never silent — the handyman would just get it twice. */
  const requestSend = () => {
    if (alreadySentCount > 0) setSendConflict(true);
    else sendBatchToHandyman();
  };

  const sendBatchToHandyman = async (onlyUnsent = false) => {
    const chosen = onlyUnsent
      ? selectedTickets.filter((t) => !t.sent_to_handyman_at)
      : selectedTickets;
    if (chosen.length === 0) return;

    setSending(true);
    const res = await fetch("/api/job-batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference_numbers: chosen.map((t) => t.reference_number) }),
    });
    const { token, error } = await res.json();
    setSending(false);

    if (!res.ok || !token) {
      alert(error ?? "Failed to create job sheet");
      return;
    }

    const url = `${window.location.origin}/job/${token}`;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(formatBatchText(chosen, url))}`,
      "_blank"
    );
    setSelectedIds(new Set());
    setSendConflict(false);
    router.refresh();
  };

  const bulkAction = async (action: BulkAction) => {
    const chosen = tickets.filter((t) => selectedIds.has(t.id));
    if (chosen.length === 0) return;

    setBulkLoading(action);
    const res = await fetch("/api/tickets/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reference_numbers: chosen.map((t) => t.reference_number),
        action,
      }),
    });
    setBulkLoading(null);

    if (!res.ok) {
      const { error } = await res.json();
      alert(error ?? "Action failed");
      return;
    }

    setSelectedIds(new Set());
    setConfirmBulk(null);
    setSelected(null);
    router.refresh();
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setConfirmBulk(null);
    setSendConflict(false);
  };

  const saveNote = async (reference: string) => {
    setActionLoading("note");
    await fetch(`/api/tickets/${reference}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: noteDraft }),
    });
    setActionLoading(null);
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
    router.refresh();
  };

  const selectTicket = (ticket: Ticket) => {
    const next = selected?.id === ticket.id ? null : ticket;
    setSelected(next);
    setConfirmDelete(false);
    setNoteDraft(next?.admin_notes ?? "");
    setNoteSaved(false);
  };

  const renderDetailBody = (ticket: Ticket) => (
    <div className="flex flex-col gap-2 text-sm">
      <div><span className="text-gray-500">Tenant: </span><span className="text-gray-900">{ticket.tenant_name}{ticket.tenant_room ? ` — Room ${ticket.tenant_room}` : ""}</span></div>
      <div>
        <span className="text-gray-500">Email: </span>
        <a
          href={`mailto:${ticket.tenant_email}?subject=${encodeURIComponent(`Maintenance request ${ticket.reference_number}`)}`}
          className="text-blue-700 hover:underline break-all"
        >
          {ticket.tenant_email}
        </a>
        {SHOW_DELIVERY_WARNINGS && ticket.confirmation_failed && (
          <span
            className="ml-1.5 text-xs text-red-600 whitespace-nowrap"
            title="Their confirmation email was rejected — they may not know the report was received"
          >
            ⚠ not delivered
          </span>
        )}
      </div>
      <div>
        <span className="text-gray-500">Phone: </span>
        {ticket.tenant_phone ? (
          <a
            href={`tel:${ticket.tenant_phone.replace(/\s/g, "")}`}
            className="text-blue-700 hover:underline"
          >
            {ticket.tenant_phone}
          </a>
        ) : (
          <span className="text-gray-900">Not provided</span>
        )}
      </div>
      <div><span className="text-gray-500">Property: </span><span className="text-gray-900">{ticket.property_address}</span></div>
      <div><span className="text-gray-500">Category: </span><span className="text-gray-900">{ticket.category}</span></div>
      <div>
        <span className="text-gray-500">Reported: </span>
        <span className={isStale(ticket) ? "text-red-600 font-medium" : "text-gray-900"}>
          {new Date(ticket.created_at).toLocaleDateString()} · {formatAge(ticket.created_at)} ago
        </span>
      </div>
      <div>
        <span className="text-gray-500">Sent to handyman: </span>
        <span className={ticket.sent_to_handyman_at ? "text-green-700 font-medium" : "text-gray-400"}>
          {ticket.sent_to_handyman_at
            ? new Date(ticket.sent_to_handyman_at).toLocaleDateString()
            : "Not yet"}
        </span>
      </div>
      <div className="mt-2">
        <span className="text-gray-500 block mb-1">Issue:</span>
        <p className="text-gray-900 bg-gray-50 rounded p-2">{ticket.description}</p>
      </div>

      <div className="mt-2">
        <span className="text-gray-500 block mb-1">Your notes:</span>
        <textarea
          value={noteDraft}
          onChange={(e) => setNoteDraft(e.target.value)}
          rows={3}
          placeholder="Private — only you can see this"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
        {noteDraft !== (ticket.admin_notes ?? "") && (
          <button
            onClick={() => saveNote(ticket.reference_number)}
            disabled={actionLoading === "note"}
            className="mt-1 w-full bg-gray-100 border border-gray-200 text-gray-700 rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-gray-200 disabled:opacity-50"
          >
            {actionLoading === "note" ? "Saving..." : "Save note"}
          </button>
        )}
        {noteSaved && <p className="mt-1 text-xs text-green-600 text-center">Note saved</p>}
      </div>

      {ticket.deleted_at && (
        <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs text-amber-900">
            In the bin — deleted permanently in {daysLeftInBin(ticket.deleted_at)}{" "}
            {daysLeftInBin(ticket.deleted_at) === 1 ? "day" : "days"}.
          </p>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => binTicket(ticket.reference_number, "restore")}
              disabled={!!actionLoading}
              className="flex-1 bg-white border border-amber-300 text-amber-900 rounded-lg px-3 py-2 text-xs font-medium hover:bg-amber-100 disabled:opacity-50"
            >
              {actionLoading === "restore" ? "Restoring..." : "Restore"}
            </button>
            <button
              onClick={() => binTicket(ticket.reference_number, "purge")}
              disabled={!!actionLoading}
              className="flex-1 bg-red-600 text-white rounded-lg px-3 py-2 text-xs font-medium hover:bg-red-700 disabled:opacity-50"
            >
              {actionLoading === "purge" ? "Deleting..." : "Delete now"}
            </button>
          </div>
        </div>
      )}

      <div className={`mt-4 flex-col gap-2 ${ticket.deleted_at ? "hidden" : "flex"}`}>
        {ticket.status !== "resolved" && (
          <button
            onClick={() => updateStatus(ticket.reference_number, "resolved")}
            disabled={!!actionLoading}
            className="w-full bg-green-600 text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {actionLoading === "resolved" ? "Saving..." : "Mark resolved"}
          </button>
        )}
        {ticket.status === "open" && (
          <button
            onClick={() => updateStatus(ticket.reference_number, "escalate")}
            disabled={!!actionLoading}
            className="w-full bg-red-600 text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {actionLoading === "escalate" ? "Saving..." : "Escalate"}
          </button>
        )}
        {(ticket.status === "resolved" || ticket.status === "escalated") && (
          <button
            onClick={() => updateStatus(ticket.reference_number, "reopen")}
            disabled={!!actionLoading}
            className="w-full bg-white border border-gray-300 text-gray-600 rounded-lg px-3 py-2 text-sm font-medium hover:border-gray-400 disabled:opacity-50 transition-colors"
          >
            {actionLoading === "reopen" ? "Saving..." : "Reopen"}
          </button>
        )}
      </div>

      {!ticket.deleted_at && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          {confirmDelete ? (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-gray-500 text-center">
                Move to bin? It will be deleted after {BIN_RETENTION_DAYS} days.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 border border-gray-300 text-gray-600 rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => binTicket(ticket.reference_number, "delete")}
                  disabled={actionLoading === "delete"}
                  className="flex-1 bg-red-600 text-white rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  {actionLoading === "delete" ? "Moving..." : "Move to bin"}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-full text-xs text-gray-400 hover:text-red-500 transition-colors py-1"
            >
              🗑 Move to bin
            </button>
          )}
        </div>
      )}

      <div className={`mt-1 ${ticket.deleted_at ? "hidden" : "block"}`}>
        <button
          onClick={() => whatsappForHandyman(ticket)}
          className="w-full bg-[#25D366] text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-[#1ebe5d] transition-colors"
        >
          Send to handyman
        </button>
      </div>

      {(ticket.media_urls ?? []).length > 0 && (
        <div className="mt-2">
          <span className="text-gray-500 block mb-2">Attachments:</span>
          <div className="grid grid-cols-2 gap-2">
            {ticket.media_urls!.map((url, i) => {
              const isVideo = /\.(mp4|mov|avi|webm|mkv)$/i.test(url);
              return isVideo ? (
                <video key={i} src={url} controls className="w-full rounded-lg col-span-2" />
              ) : (
                <button
                  key={i}
                  onClick={() => setLightboxUrl(url)}
                  className="w-full rounded-lg overflow-hidden aspect-square"
                >
                  <img
                    src={url}
                    alt={`Attachment ${i + 1}`}
                    className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {lightboxUrl && (
        <div
          className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <img
            src={lightboxUrl}
            alt="Attachment"
            className="max-w-full max-h-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
            onError={(e) => {
              const el = e.currentTarget;
              el.style.display = "none";
              const fallback = el.nextElementSibling as HTMLElement | null;
              if (fallback) fallback.style.display = "flex";
            }}
          />
          <div
            style={{ display: "none" }}
            className="flex-col items-center gap-3 text-white text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm opacity-80">This file can&apos;t be previewed in the browser</p>
            <a
              href={lightboxUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white text-gray-900 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-100"
            >
              Download file
            </a>
          </div>
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 text-white text-2xl leading-none hover:opacity-70"
          >
            ×
          </button>
        </div>
      )}

      {/* Batch send bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 shadow-lg px-5 py-3">
          <div className="max-w-5xl mx-auto flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            {sendConflict ? (
              <>
                <span className="text-sm text-gray-700">
                  {alreadySentCount === selectedTickets.length
                    ? `${alreadySentCount === 1 ? "This has" : "These have"} already been sent — send again?`
                    : `${alreadySentCount} of ${selectedTickets.length} already sent to the handyman.`}
                </span>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-2 shrink-0">
                  <button
                    onClick={() => setSendConflict(false)}
                    className="border border-gray-300 text-gray-600 rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  {alreadySentCount < selectedTickets.length && (
                    <button
                      onClick={() => sendBatchToHandyman(true)}
                      disabled={sending}
                      className="bg-[#25D366] text-white rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-[#1ebe5d] disabled:opacity-50"
                    >
                      Send {selectedTickets.length - alreadySentCount} new
                    </button>
                  )}
                  <button
                    onClick={() => sendBatchToHandyman(false)}
                    disabled={sending}
                    className="border border-gray-300 text-gray-700 rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                  >
                    {sending ? "Preparing..." : `Send all ${selectedTickets.length}`}
                  </button>
                </div>
              </>
            ) : confirmBulk ? (
              <>
                <span className="text-sm text-gray-700">
                  {BULK_CONFIRM[confirmBulk].prompt(selectedIds.size)}
                </span>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => setConfirmBulk(null)}
                    className="flex-1 sm:flex-none border border-gray-300 text-gray-600 rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => bulkAction(confirmBulk)}
                    disabled={!!bulkLoading}
                    className={`flex-1 sm:flex-none text-white rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-50 ${BULK_CONFIRM[confirmBulk].className}`}
                  >
                    {bulkLoading
                      ? BULK_CONFIRM[confirmBulk].loading
                      : BULK_CONFIRM[confirmBulk].label}
                  </button>
                </div>
              </>
            ) : (
              <>
                <span className="text-sm text-gray-600">
                  {selectedIds.size} selected
                  <button
                    onClick={clearSelection}
                    className="ml-3 text-gray-400 hover:text-gray-600 text-xs underline"
                  >
                    Clear
                  </button>
                </span>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-2 shrink-0">
                  {inBin ? (
                    <>
                      <button
                        onClick={() => setConfirmBulk("restore")}
                        className="border border-gray-300 text-gray-700 rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-gray-50"
                      >
                        Restore
                      </button>
                      <button
                        onClick={() => setConfirmBulk("purge")}
                        className="bg-red-600 text-white rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setConfirmBulk("delete")}
                        className="border border-gray-300 text-gray-700 rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-gray-50"
                      >
                        🗑 Bin
                      </button>
                      {filterStatus !== "escalated" && filterStatus !== "resolved" && (
                        <button
                          onClick={() => setConfirmBulk("escalate")}
                          className="border border-red-300 text-red-700 rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-red-50"
                        >
                          Urgent
                        </button>
                      )}
                      {filterStatus === "resolved" ? (
                        <button
                          onClick={() => setConfirmBulk("reopen")}
                          className="bg-blue-600 text-white rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-blue-700"
                        >
                          Reopen
                        </button>
                      ) : (
                        <button
                          onClick={() => setConfirmBulk("resolve")}
                          className="bg-green-600 text-white rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-green-700"
                        >
                          Resolve
                        </button>
                      )}
                      <button
                        onClick={requestSend}
                        disabled={sending}
                        className="bg-[#25D366] text-white rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-[#1ebe5d] disabled:opacity-50 transition-colors"
                      >
                        {sending ? "Preparing..." : "Send"}
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Mobile full-screen detail overlay */}
      {selected && (
        <div className="fixed inset-0 z-40 bg-white overflow-y-auto md:hidden">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-4 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">{selected.reference_number}</h3>
            <button
              onClick={() => setSelected(null)}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none w-8 h-8 flex items-center justify-center"
            >
              ×
            </button>
          </div>
          <div className="p-5">{renderDetailBody(selected)}</div>
        </div>
      )}

      <div className={`flex gap-6 ${selectedIds.size > 0 ? "pb-24" : ""}`}>
        <div className="flex-1 min-w-0">
          {/* Status tabs */}
          <div className="flex gap-2 mb-3 flex-wrap">
            {["all", "open", "escalated", "resolved", "bin"].map((f) => (
              <button
                key={f}
                onClick={() => {
                  setFilterStatus(f);
                  setSelected(null);
                  clearSelection();
                }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                  filterStatus === f
                    ? "bg-blue-600 text-white"
                    : "bg-white border border-gray-300 text-gray-600 hover:border-blue-400"
                } ${f === "bin" ? "ml-auto" : ""}`}
              >
                {f === "bin" ? (
                  "🗑"
                ) : (
                  <>
                    {f}
                    <span
                      className={`ml-1.5 text-xs ${filterStatus === f ? "text-white/70" : "text-gray-400"}`}
                    >
                      {statusCounts[f]}
                    </span>
                  </>
                )}
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-2 mb-4 md:flex-row md:flex-wrap">
            <input
              type="text"
              placeholder="Search name, address, issue, date..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:w-56 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={filterProperty}
              onChange={(e) => setFilterProperty(e.target.value)}
              className="w-full md:w-auto border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All properties</option>
              {uniqueProperties.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full md:w-auto border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All categories</option>
              {uniqueCategories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full md:w-auto border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {DATE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {/* Desktop sorts via the column headers, so this is mobile-only. */}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="w-full md:hidden border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-gray-400 hover:text-gray-600 px-2 text-left"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Mobile: card list */}
          <div className="flex flex-col gap-2 md:hidden">
            {filtered.length === 0 && (
              <p className="text-center text-gray-400 py-8 text-sm">
                {inBin ? "Bin is empty" : "No tickets found"}
              </p>
            )}
            {/* Desktop gets this from the table header checkbox. */}
            {filtered.length > 0 && (
              <label className="flex items-center gap-2 px-1 py-1 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 accent-blue-600"
                />
                Select all {filtered.length}
              </label>
            )}
            {filtered.map((ticket) => (
              <div
                key={ticket.id}
                className="flex items-start gap-3 bg-white border border-gray-200 rounded-xl p-4"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(ticket.id)}
                  onChange={() => toggleSelect(ticket.id)}
                  className="mt-0.5 w-4 h-4 shrink-0 accent-blue-600"
                />
                <button
                  onClick={() => selectTicket(ticket)}
                  className="flex-1 min-w-0 text-left"
                >
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <span className="font-medium text-gray-900 text-sm">
                      {ticket.tenant_name}{ticket.tenant_room ? ` — Room ${ticket.tenant_room}` : ""}
                      {ticket.admin_notes && (
                        <span className="ml-1 text-xs" title="Has notes">📝</span>
                      )}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize shrink-0 ${STATUS_COLORS[ticket.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {ticket.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 truncate">{ticket.category}</p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{ticket.property_address}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {ticket.sent_to_handyman_at && (
                      <span className="text-green-600 text-base leading-none font-bold" title="Sent to handyman">
                        ✓
                      </span>
                    )}
                    <span
                      className={`text-xs ${isStale(ticket) ? "text-red-600 font-medium" : "text-gray-400"}`}
                    >
                      {formatAge(ticket.created_at)}
                    </span>
                  </div>
                </button>
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 accent-blue-600 align-middle"
                    />
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Reference</th>
                  <th
                    onClick={() => toggleSort("tenant")}
                    className="text-left px-4 py-3 font-medium text-gray-600 cursor-pointer select-none hover:text-gray-900"
                  >
                    Tenant{sortIndicator("tenant")}
                  </th>
                  <th
                    onClick={() => toggleSort("property")}
                    className="text-left px-4 py-3 font-medium text-gray-600 cursor-pointer select-none hover:text-gray-900"
                  >
                    Property{sortIndicator("property")}
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                  <th
                    onClick={() => toggleSort("status")}
                    className="text-left px-4 py-3 font-medium text-gray-600 cursor-pointer select-none hover:text-gray-900"
                  >
                    Status{sortIndicator("status")}
                  </th>
                  <th
                    onClick={() => toggleSort("sent")}
                    className="text-left px-4 py-3 font-medium text-gray-600 cursor-pointer select-none hover:text-gray-900"
                  >
                    Sent{sortIndicator("sent")}
                  </th>
                  <th
                    onClick={() => toggleSort("created")}
                    className="text-left px-4 py-3 font-medium text-gray-600 cursor-pointer select-none hover:text-gray-900"
                  >
                    Age{sortIndicator("created")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((ticket) => (
                  <tr
                    key={ticket.id}
                    onClick={() => selectTicket(ticket)}
                    className={`border-b border-gray-100 cursor-pointer transition-colors ${
                      selected?.id === ticket.id ? "bg-blue-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(ticket.id)}
                        onChange={() => toggleSelect(ticket.id)}
                        className="w-4 h-4 accent-blue-600 align-middle"
                      />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">
                      {ticket.reference_number}
                      {ticket.admin_notes && (
                        <span className="ml-1" title="Has notes">📝</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-900">{ticket.tenant_name}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-[150px] truncate">{ticket.property_address}</td>
                    <td className="px-4 py-3 text-gray-600">{ticket.category}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[ticket.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {ticket.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {ticket.sent_to_handyman_at ? (
                        <span className="text-green-600 text-base font-bold" title="Sent to handyman">
                          ✓
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td
                      className={`px-4 py-3 text-xs ${isStale(ticket) ? "text-red-600 font-semibold" : "text-gray-400"}`}
                      title={new Date(ticket.created_at).toLocaleDateString()}
                    >
                      {formatAge(ticket.created_at)}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                      {inBin ? "Bin is empty" : "No tickets found"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Desktop: side panel */}
        {selected && (
          <div className="hidden md:block w-80 shrink-0 bg-white border border-gray-200 rounded-xl p-5 h-fit sticky top-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-semibold text-gray-900">{selected.reference_number}</h3>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
              >
                ×
              </button>
            </div>
            {renderDetailBody(selected)}
          </div>
        )}
      </div>
    </>
  );
}
