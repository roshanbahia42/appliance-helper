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
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-yellow-100 text-yellow-800",
  resolved: "bg-green-100 text-green-800",
  escalated: "bg-red-100 text-red-800",
};

const DATE_OPTIONS = [
  { label: "All time", value: "all" },
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
];

export default function TicketTable({ tickets }: { tickets: Ticket[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDate, setFilterDate] = useState("all");
  const [filterProperty, setFilterProperty] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [searchTenant, setSearchTenant] = useState("");

  const uniqueProperties = [...new Set(tickets.map((t) => t.property_address))].sort();
  const uniqueCategories = [...new Set(tickets.map((t) => t.category))].sort();

  const filtered = tickets.filter((t) => {
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (filterProperty !== "all" && t.property_address !== filterProperty) return false;
    if (filterCategory !== "all" && t.category !== filterCategory) return false;
    if (searchTenant && !t.tenant_name.toLowerCase().includes(searchTenant.toLowerCase())) return false;
    if (filterDate !== "all") {
      const days = filterDate === "7d" ? 7 : 30;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      if (new Date(t.created_at) < cutoff) return false;
    }
    return true;
  });

  const hasActiveFilters =
    filterStatus !== "all" || filterDate !== "all" || filterProperty !== "all" ||
    filterCategory !== "all" || searchTenant !== "";

  const clearFilters = () => {
    setFilterStatus("all");
    setFilterDate("all");
    setFilterProperty("all");
    setFilterCategory("all");
    setSearchTenant("");
  };

  const deleteTicket = async (reference: string) => {
    setActionLoading("delete");
    await fetch(`/api/tickets/${reference}/delete`, { method: "POST" });
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
      `Reference: ${ticket.reference_number}`,
      `Property: ${ticket.property_address}`,
      `Issue: ${ticket.category}`,
      ticket.description ? `Details: ${ticket.description}` : null,
      ``,
      `Tenant: ${ticket.tenant_name}${ticket.tenant_room ? ` — Room ${ticket.tenant_room}` : ""}`,
      ticket.tenant_phone ? `Phone: ${ticket.tenant_phone}` : null,
      `Email: ${ticket.tenant_email}`,
      (ticket.media_urls?.length ?? 0) > 0
        ? `\nPhotos/videos:\n${ticket.media_urls!.join("\n")}`
        : null,
    ]
      .filter((l) => l !== null)
      .join("\n");

  const copyForHandyman = (ticket: Ticket) => {
    navigator.clipboard.writeText(formatHandymanText(ticket));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const whatsappForHandyman = (ticket: Ticket) => {
    const text = encodeURIComponent(formatHandymanText(ticket));
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

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

      <div className="flex gap-6">
        <div className="flex-1 min-w-0">
          {/* Status tabs */}
          <div className="flex gap-2 mb-3">
            {["all", "open", "escalated", "resolved"].map((f) => (
              <button
                key={f}
                onClick={() => setFilterStatus(f)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                  filterStatus === f
                    ? "bg-blue-600 text-white"
                    : "bg-white border border-gray-300 text-gray-600 hover:border-blue-400"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Secondary filters */}
          <div className="flex flex-wrap gap-2 mb-4">
            <input
              type="text"
              placeholder="Search tenant..."
              value={searchTenant}
              onChange={(e) => setSearchTenant(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-40"
            />
            <select
              value={filterProperty}
              onChange={(e) => setFilterProperty(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[180px]"
            >
              <option value="all">All properties</option>
              {uniqueProperties.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All categories</option>
              {uniqueCategories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {DATE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-gray-400 hover:text-gray-600 px-2"
              >
                Clear filters
              </button>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Reference</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Tenant</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Property</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((ticket) => (
                  <tr
                    key={ticket.id}
                    onClick={() => { setSelected(selected?.id === ticket.id ? null : ticket); setConfirmDelete(false); }}
                    className={`border-b border-gray-100 cursor-pointer transition-colors ${
                      selected?.id === ticket.id ? "bg-blue-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{ticket.reference_number}</td>
                    <td className="px-4 py-3 text-gray-900">{ticket.tenant_name}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-[150px] truncate">{ticket.property_address}</td>
                    <td className="px-4 py-3 text-gray-600">{ticket.category}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[ticket.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {ticket.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                      No tickets found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {selected && (
          <div className="w-80 shrink-0 bg-white border border-gray-200 rounded-xl p-5 h-fit sticky top-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-semibold text-gray-900">{selected.reference_number}</h3>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
              >
                ×
              </button>
            </div>

            <div className="flex flex-col gap-2 text-sm">
              <div><span className="text-gray-500">Tenant: </span><span className="text-gray-900">{selected.tenant_name}{selected.tenant_room ? ` — Room ${selected.tenant_room}` : ""}</span></div>
              <div><span className="text-gray-500">Email: </span><span className="text-gray-900">{selected.tenant_email}</span></div>
              <div><span className="text-gray-500">Phone: </span><span className="text-gray-900">{selected.tenant_phone ?? "Not provided"}</span></div>
              <div><span className="text-gray-500">Property: </span><span className="text-gray-900">{selected.property_address}</span></div>
              <div><span className="text-gray-500">Category: </span><span className="text-gray-900">{selected.category}</span></div>
              <div className="mt-2">
                <span className="text-gray-500 block mb-1">Issue:</span>
                <p className="text-gray-900 bg-gray-50 rounded p-2">{selected.description}</p>
              </div>

              {/* Status actions */}
              <div className="mt-4 flex flex-col gap-2">
                {selected.status !== "resolved" && (
                  <button
                    onClick={() => updateStatus(selected.reference_number, "resolved")}
                    disabled={!!actionLoading}
                    className="w-full bg-green-600 text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {actionLoading === "resolved" ? "Saving..." : "Mark resolved"}
                  </button>
                )}
                {selected.status === "open" && (
                  <button
                    onClick={() => updateStatus(selected.reference_number, "escalate")}
                    disabled={!!actionLoading}
                    className="w-full bg-red-600 text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {actionLoading === "escalate" ? "Saving..." : "Escalate"}
                  </button>
                )}
                {(selected.status === "resolved" || selected.status === "escalated") && (
                  <button
                    onClick={() => updateStatus(selected.reference_number, "reopen")}
                    disabled={!!actionLoading}
                    className="w-full bg-white border border-gray-300 text-gray-600 rounded-lg px-3 py-2 text-sm font-medium hover:border-gray-400 disabled:opacity-50 transition-colors"
                  >
                    {actionLoading === "reopen" ? "Saving..." : "Reopen"}
                  </button>
                )}
              </div>

              {/* Delete */}
              <div className="mt-2 pt-2 border-t border-gray-100">
                {confirmDelete ? (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs text-gray-500 text-center">Delete this ticket permanently?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConfirmDelete(false)}
                        className="flex-1 border border-gray-300 text-gray-600 rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => deleteTicket(selected.reference_number)}
                        disabled={actionLoading === "delete"}
                        className="flex-1 bg-red-600 text-white rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-red-700 disabled:opacity-50"
                      >
                        {actionLoading === "delete" ? "Deleting..." : "Yes, delete"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="w-full text-xs text-gray-400 hover:text-red-500 transition-colors py-1"
                  >
                    🗑 Delete ticket
                  </button>
                )}
              </div>

              {/* Handyman actions */}
              <div className="mt-1 flex gap-2">
                <button
                  onClick={() => copyForHandyman(selected)}
                  className="flex-1 bg-gray-50 border border-gray-200 text-gray-600 rounded-lg px-3 py-2 text-sm font-medium hover:bg-gray-100 transition-colors"
                >
                  {copied ? "Copied ✓" : "Copy details"}
                </button>
                <button
                  onClick={() => whatsappForHandyman(selected)}
                  className="flex-1 bg-[#25D366] text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-[#1ebe5d] transition-colors"
                >
                  WhatsApp
                </button>
              </div>

              {/* Attachments */}
              {(selected.media_urls ?? []).length > 0 && (
                <div className="mt-2">
                  <span className="text-gray-500 block mb-2">Attachments:</span>
                  <div className="grid grid-cols-2 gap-2">
                    {selected.media_urls!.map((url, i) => {
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
          </div>
        )}
      </div>
    </>
  );
}
