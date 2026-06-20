"use client";

import { useState } from "react";

type Ticket = {
  id: string;
  reference_number: string;
  tenant_name: string;
  tenant_email: string;
  tenant_phone: string | null;
  property_address: string;
  category: string;
  description: string;
  status: string;
  ai_response: string;
  created_at: string;
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-yellow-100 text-yellow-800",
  resolved: "bg-green-100 text-green-800",
  escalated: "bg-red-100 text-red-800",
};

const FILTERS = ["all", "open", "escalated", "resolved"];

export default function TicketTable({ tickets }: { tickets: Ticket[] }) {
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [filter, setFilter] = useState("all");

  const filtered =
    filter === "all" ? tickets : tickets.filter((t) => t.status === filter);

  return (
    <div className="flex gap-6">
      <div className="flex-1 min-w-0">
        <div className="flex gap-2 mb-4">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                filter === f
                  ? "bg-blue-600 text-white"
                  : "bg-white border border-gray-300 text-gray-600 hover:border-blue-400"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Reference
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Tenant
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Property
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Category
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Status
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ticket) => (
                <tr
                  key={ticket.id}
                  onClick={() =>
                    setSelected(selected?.id === ticket.id ? null : ticket)
                  }
                  className={`border-b border-gray-100 cursor-pointer transition-colors ${
                    selected?.id === ticket.id
                      ? "bg-blue-50"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">
                    {ticket.reference_number}
                  </td>
                  <td className="px-4 py-3 text-gray-900">
                    {ticket.tenant_name}
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-[150px] truncate">
                    {ticket.property_address}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{ticket.category}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[ticket.status] ?? "bg-gray-100 text-gray-600"}`}
                    >
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
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-gray-400"
                  >
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
            <h3 className="font-semibold text-gray-900">
              {selected.reference_number}
            </h3>
            <button
              onClick={() => setSelected(null)}
              className="text-gray-400 hover:text-gray-600 text-lg leading-none"
            >
              ×
            </button>
          </div>
          <div className="flex flex-col gap-2 text-sm">
            <div>
              <span className="text-gray-500">Tenant: </span>
              <span className="text-gray-900">{selected.tenant_name}</span>
            </div>
            <div>
              <span className="text-gray-500">Email: </span>
              <span className="text-gray-900">{selected.tenant_email}</span>
            </div>
            <div>
              <span className="text-gray-500">Phone: </span>
              <span className="text-gray-900">
                {selected.tenant_phone ?? "Not provided"}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Property: </span>
              <span className="text-gray-900">{selected.property_address}</span>
            </div>
            <div>
              <span className="text-gray-500">Category: </span>
              <span className="text-gray-900">{selected.category}</span>
            </div>
            <div className="mt-2">
              <span className="text-gray-500 block mb-1">Issue:</span>
              <p className="text-gray-900 bg-gray-50 rounded p-2">
                {selected.description}
              </p>
            </div>
            <div className="mt-2">
              <span className="text-gray-500 block mb-1">AI guide sent:</span>
              <p className="text-gray-700 bg-gray-50 rounded p-2 text-xs whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                {selected.ai_response}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}