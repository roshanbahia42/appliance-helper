"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BULK_CONFIRM,
  DATE_OPTIONS,
  SORT_OPTIONS,
  SORT_VALUES,
  STATUS_COLORS,
  STATUS_LABELS,
  formatAge,
  formatBatchText,
  formatHandymanText,
  isStale,
  type BulkAction,
  type Ticket,
} from "@/lib/tickets";
import { Check, FileText, Trash2, X } from "lucide-react";
import AttachmentLightbox from "./AttachmentLightbox";
import TicketDetail from "./TicketDetail";
import MessageTenants from "./MessageTenants";

// Flags a tenant whose confirmation email bounced, so the landlady can spot a
// mistyped address. On while the sandbox sender was in use it fired on every
// ticket and meant nothing; with a verified domain a failure is genuine.
const SHOW_DELIVERY_WARNINGS = true;

export default function TicketTable({ tickets }: { tickets: Ticket[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [bulkLoading, setBulkLoading] = useState<string | null>(null);
  const [confirmBulk, setConfirmBulk] = useState<BulkAction | null>(null);
  const [sendConflict, setSendConflict] = useState(false);

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
  };

  // One pass, then slice it up. Searching re-formats three dates per ticket, so
  // running the predicate once per status tab made every keystroke five times
  // more expensive than it needed to be.
  const matching = tickets.filter(matchesFilters);
  const live = matching.filter((t) => !t.deleted_at);

  const statusCounts: Record<string, number> = {
    all: live.length,
    open: live.filter((t) => t.status === "open").length,
    escalated: live.filter((t) => t.status === "escalated").length,
    resolved: live.filter((t) => t.status === "resolved").length,
  };

  const [sortField, sortDirection] = sort.split("-");
  const sortValue = SORT_VALUES[sortField] ?? SORT_VALUES.created;

  const filtered = (
    inBin
      ? matching.filter((t) => t.deleted_at)
      : filterStatus === "all"
        ? live
        : live.filter((t) => t.status === filterStatus)
  )
    .slice()
    .sort((a, b) => {
      const av = sortValue(a);
      const bv = sortValue(b);
      if (av === bv) return 0;
      return (av < bv ? -1 : 1) * (sortDirection === "asc" ? 1 : -1);
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
    router.refresh();
  };

  const updateStatus = async (reference: string, action: "resolved" | "escalate" | "reopen") => {
    setActionLoading(action);
    await fetch(`/api/tickets/${reference}/${action}`, { method: "POST" });
    setActionLoading(null);
    setSelected(null);
    router.refresh();
  };

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

  const selectedTickets = tickets.filter((t) => selectedIds.has(t.id));
  const alreadySentCount = selectedTickets.filter((t) => t.sent_to_handyman_at).length;

  // Offer an action only where it would change something. Keying off the tab
  // meant "Mark urgent" showed for tickets that were already urgent.
  const canMarkUrgent = selectedTickets.some((t) => t.status !== "escalated");
  const canResolve = selectedTickets.some((t) => t.status !== "resolved");
  const canReopen = selectedTickets.some((t) => t.status !== "open");

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

  const saveNote = async (reference: string, notes: string) => {
    setActionLoading("note");
    await fetch(`/api/tickets/${reference}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    setActionLoading(null);
    router.refresh();
  };

  const selectTicket = (ticket: Ticket) => {
    setSelected(selected?.id === ticket.id ? null : ticket);
  };


  return (
    <>
      {lightboxUrl && (
        // Keyed so switching attachments resets the component's error state.
        <AttachmentLightbox
          key={lightboxUrl}
          url={lightboxUrl}
          onClose={() => setLightboxUrl(null)}
        />
      )}

      {/* Batch send bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 shadow-lg px-5 py-3">
          <div className="max-w-5xl mx-auto flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            {sendConflict ? (
              <>
                <span className="text-sm text-gray-700">
                  {alreadySentCount === selectedTickets.length
                    ? `${alreadySentCount === 1 ? "This has" : "These have"} already been sent. Send again?`
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
                        className="flex items-center justify-center gap-1.5 border border-gray-300 text-gray-700 rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-gray-50"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                        Bin
                      </button>
                      {canMarkUrgent && (
                        <button
                          onClick={() => setConfirmBulk("escalate")}
                          className="border border-red-300 text-red-700 rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-red-50"
                        >
                          Urgent
                        </button>
                      )}
                      {canResolve ? (
                        <button
                          onClick={() => setConfirmBulk("resolve")}
                          className="bg-green-600 text-white rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-green-700"
                        >
                          Resolve
                        </button>
                      ) : (
                        canReopen && (
                          <button
                            onClick={() => setConfirmBulk("reopen")}
                            className="bg-blue-600 text-white rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-blue-700"
                          >
                            Reopen
                          </button>
                        )
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
              aria-label="Close ticket"
              className="w-11 h-11 -mr-2 flex items-center justify-center text-gray-500 hover:text-gray-800"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="p-5">
            <TicketDetail
              key={selected.id}
              ticket={selected}
              actionLoading={actionLoading}
              showDeliveryWarnings={SHOW_DELIVERY_WARNINGS}
              onStatusChange={updateStatus}
              onBinAction={binTicket}
              onSaveNote={saveNote}
              onSendToHandyman={whatsappForHandyman}
              onOpenAttachment={setLightboxUrl}
            />
          </div>
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
                // The bin tab is icon-only, so it needs a name of its own.
                aria-label={f === "bin" ? "Bin" : undefined}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === f
                    ? "bg-blue-600 text-white"
                    : "bg-white border border-gray-300 text-gray-600 hover:border-blue-400"
                } ${f === "bin" ? "ml-auto flex items-center" : ""}`}
              >
                {f === "bin" ? (
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <>
                    {f === "all" ? "All" : STATUS_LABELS[f] ?? f}
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

          {filterProperty !== "all" && (
            <div className="mb-4">
              <MessageTenants property={filterProperty} label="Message tenants" />
            </div>
          )}

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
                      {ticket.tenant_name}{ticket.tenant_room ? `, Room ${ticket.tenant_room}` : ""}
                      {ticket.admin_notes && (
                        <span
                          className="inline-flex align-middle ml-1 text-gray-400"
                          title="Has notes"
                        >
                          <FileText className="w-4 h-4" aria-label="Has notes" />
                        </span>
                      )}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${STATUS_COLORS[ticket.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {STATUS_LABELS[ticket.status] ?? ticket.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 truncate">{ticket.category}</p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{ticket.property_address}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {ticket.sent_to_handyman_at && (
                      <Check
                        className="w-4 h-4 text-green-600"
                        strokeWidth={3}
                        aria-label="Sent to handyman"
                      />
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
                        <span
                          className="inline-flex align-middle ml-1 text-gray-400"
                          title="Has notes"
                        >
                          <FileText className="w-4 h-4" aria-label="Has notes" />
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-900">{ticket.tenant_name}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-[150px] truncate">{ticket.property_address}</td>
                    <td className="px-4 py-3 text-gray-600">{ticket.category}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[ticket.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {STATUS_LABELS[ticket.status] ?? ticket.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {ticket.sent_to_handyman_at ? (
                        <Check
                          className="w-5 h-5 text-green-600"
                          strokeWidth={3}
                          aria-label="Sent to handyman"
                        />
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
          /* Capped to the viewport with its own scrollbar. Left to grow with
             h-fit, a long ticket made the page scroll through the whole list
             before the panel's own content moved. */
          <div className="hidden md:flex md:flex-col w-80 shrink-0 bg-white border border-gray-200 rounded-xl sticky top-6 max-h-[calc(100vh-3rem)]">
            <div className="flex justify-between items-start px-5 pt-4 pb-3 border-b border-gray-100 shrink-0">
              <h3 className="font-semibold text-gray-900">{selected.reference_number}</h3>
              <button
                onClick={() => setSelected(null)}
                aria-label="Close ticket"
                className="w-9 h-9 -mr-2 -mt-1 flex items-center justify-center text-gray-500 hover:text-gray-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-4">
              <TicketDetail
                key={selected.id}
                ticket={selected}
                actionLoading={actionLoading}
                showDeliveryWarnings={SHOW_DELIVERY_WARNINGS}
                onStatusChange={updateStatus}
                onBinAction={binTicket}
                onSaveNote={saveNote}
                onSendToHandyman={whatsappForHandyman}
                onOpenAttachment={setLightboxUrl}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
