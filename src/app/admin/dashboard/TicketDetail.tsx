"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import {
  BIN_RETENTION_DAYS,
  daysLeftInBin,
  formatAge,
  isStale,
  type Ticket,
} from "@/lib/tickets";
import MessageProperty from "./MessageProperty";

/**
 * Everything shown for one ticket. Rendered twice — as a sticky side panel on
 * desktop and a full-screen overlay on mobile — so it deliberately carries no
 * layout of its own.
 *
 * The parent keys this on ticket.id, so the draft note and any half-finished
 * confirmation reset when a different ticket is opened.
 */
export default function TicketDetail({
  ticket,
  actionLoading,
  showDeliveryWarnings,
  onStatusChange,
  onBinAction,
  onSaveNote,
  onSendToHandyman,
  onOpenAttachment,
}: {
  ticket: Ticket;
  actionLoading: string | null;
  showDeliveryWarnings: boolean;
  onStatusChange: (reference: string, action: "resolved" | "escalate" | "reopen") => void;
  onBinAction: (reference: string, action: "delete" | "purge" | "restore") => void;
  onSaveNote: (reference: string, notes: string) => Promise<void>;
  onSendToHandyman: (ticket: Ticket) => void;
  onOpenAttachment: (url: string) => void;
}) {
  const [noteDraft, setNoteDraft] = useState(ticket.admin_notes ?? "");
  const [noteSaved, setNoteSaved] = useState(false);
  const [showDeliveryNote, setShowDeliveryNote] = useState(false);
  const [confirmBin, setConfirmBin] = useState(false);

  const inBin = !!ticket.deleted_at;
  const busy = !!actionLoading;

  const handleSaveNote = async () => {
    await onSaveNote(ticket.reference_number, noteDraft);
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
  };

  return (
    <div className="flex flex-col gap-2 text-sm">
      <div>
        <span className="text-gray-500">Tenant: </span>
        <span className="text-gray-900">
          {ticket.tenant_name}
          {ticket.tenant_room ? `, Room ${ticket.tenant_room}` : ""}
        </span>
      </div>

      <div>
        <span className="text-gray-500">Email: </span>
        <a
          href={`mailto:${ticket.tenant_email}?subject=${encodeURIComponent(`Maintenance request ${ticket.reference_number}`)}`}
          className="text-blue-700 hover:underline break-all"
        >
          {ticket.tenant_email}
        </a>
        {showDeliveryWarnings && ticket.confirmation_failed && (
          <>
            {/* Click rather than a title tooltip: native tooltips don't exist on
                touch and won't re-show reliably on desktop. */}
            <button
              onClick={() => setShowDeliveryNote((open) => !open)}
              className="ml-1.5 text-xs text-red-600 whitespace-nowrap underline decoration-dotted underline-offset-2"
            >
              ⚠ not delivered
            </button>
            {showDeliveryNote && (
              <p className="mt-1.5 text-xs text-red-800 bg-red-50 border border-red-100 rounded-md px-2 py-1.5">
                Confirmation email failed, likely a typo.
              </p>
            )}
          </>
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

      <div>
        <span className="text-gray-500">Property: </span>
        <span className="text-gray-900">{ticket.property_address}</span>
      </div>

      <div>
        <span className="text-gray-500">Category: </span>
        <span className="text-gray-900">{ticket.category}</span>
      </div>

      <div>
        <span className="text-gray-500">Reported: </span>
        <span className={isStale(ticket) ? "text-red-600 font-medium" : "text-gray-900"}>
          {new Date(ticket.created_at).toLocaleDateString()} ·{" "}
          {formatAge(ticket.created_at)} ago
        </span>
      </div>

      <div>
        <span className="text-gray-500">Sent to handyman: </span>
        <span
          className={
            ticket.sent_to_handyman_at ? "text-green-700 font-medium" : "text-gray-400"
          }
        >
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
        <span className="text-gray-500 block mb-1">Your notes to the handyman:</span>
        <textarea
          value={noteDraft}
          onChange={(e) => setNoteDraft(e.target.value)}
          rows={3}
          placeholder="Included in the message sent to the handyman"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
        {noteDraft !== (ticket.admin_notes ?? "") && (
          <button
            onClick={handleSaveNote}
            disabled={actionLoading === "note"}
            className="mt-1 w-full bg-gray-100 border border-gray-200 text-gray-700 rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-gray-200 disabled:opacity-50"
          >
            {actionLoading === "note" ? "Saving..." : "Save note"}
          </button>
        )}
        {noteSaved && (
          <p className="mt-1 text-xs text-green-600 text-center">Note saved</p>
        )}
      </div>

      {inBin ? (
        <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs text-amber-900">
            In the bin. Deleted permanently in {daysLeftInBin(ticket.deleted_at!)}{" "}
            {daysLeftInBin(ticket.deleted_at!) === 1 ? "day" : "days"}.
          </p>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => onBinAction(ticket.reference_number, "restore")}
              disabled={busy}
              className="flex-1 bg-white border border-amber-300 text-amber-900 rounded-lg px-3 py-2 text-xs font-medium hover:bg-amber-100 disabled:opacity-50"
            >
              {actionLoading === "restore" ? "Restoring..." : "Restore"}
            </button>
            <button
              onClick={() => onBinAction(ticket.reference_number, "purge")}
              disabled={busy}
              className="flex-1 bg-red-600 text-white rounded-lg px-3 py-2 text-xs font-medium hover:bg-red-700 disabled:opacity-50"
            >
              {actionLoading === "purge" ? "Deleting..." : "Delete now"}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-4 flex flex-col gap-2">
            {ticket.status !== "resolved" && (
              <button
                onClick={() => onStatusChange(ticket.reference_number, "resolved")}
                disabled={busy}
                className="w-full bg-green-600 text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {actionLoading === "resolved" ? "Saving..." : "Mark resolved"}
              </button>
            )}
            {ticket.status === "open" && (
              <button
                onClick={() => onStatusChange(ticket.reference_number, "escalate")}
                disabled={busy}
                className="w-full bg-red-600 text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {actionLoading === "escalate" ? "Saving..." : "Mark urgent"}
              </button>
            )}
            {/* Both call reopen, which sets the status back to open. The label
                differs because un-flagging an urgent ticket isn't "reopening"
                anything. */}
            {ticket.status === "escalated" && (
              <button
                onClick={() => onStatusChange(ticket.reference_number, "reopen")}
                disabled={busy}
                className="w-full bg-white border border-gray-300 text-gray-600 rounded-lg px-3 py-2 text-sm font-medium hover:border-gray-400 disabled:opacity-50 transition-colors"
              >
                {actionLoading === "reopen" ? "Saving..." : "Remove urgent flag"}
              </button>
            )}
            {ticket.status === "resolved" && (
              <button
                onClick={() => onStatusChange(ticket.reference_number, "reopen")}
                disabled={busy}
                className="w-full bg-white border border-gray-300 text-gray-600 rounded-lg px-3 py-2 text-sm font-medium hover:border-gray-400 disabled:opacity-50 transition-colors"
              >
                {actionLoading === "reopen" ? "Saving..." : "Reopen"}
              </button>
            )}
          </div>

          <div className="mt-2 pt-2 border-t border-gray-100">
            {confirmBin ? (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-gray-500 text-center">
                  Move to bin? It will be deleted after {BIN_RETENTION_DAYS} days.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmBin(false)}
                    className="flex-1 border border-gray-300 text-gray-600 rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => onBinAction(ticket.reference_number, "delete")}
                    disabled={actionLoading === "delete"}
                    className="flex-1 bg-red-600 text-white rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-red-700 disabled:opacity-50"
                  >
                    {actionLoading === "delete" ? "Moving..." : "Move to bin"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmBin(true)}
                className="w-full flex items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors py-1"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                Move to bin
              </button>
            )}
          </div>

          <div className="mt-1 flex flex-col gap-2">
            <button
              onClick={() => onSendToHandyman(ticket)}
              className="w-full bg-[#25D366] text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-[#1ebe5d] transition-colors"
            >
              Send to handyman
            </button>
            <MessageProperty
              property={ticket.property_address}
              label="Message everyone at this property"
              full
            />
          </div>
        </>
      )}

      {(ticket.media_urls ?? []).length > 0 && (
        <div className="mt-2">
          <span className="text-gray-500 block mb-2">Attachments:</span>
          <div className="grid grid-cols-2 gap-2">
            {ticket.media_urls!.map((url, i) => {
              const isVideo = /\.(mp4|mov|avi|webm|mkv)$/i.test(url);
              return isVideo ? (
                <video
                  key={url}
                  src={url}
                  controls
                  className="w-full rounded-lg col-span-2"
                />
              ) : (
                <button
                  key={url}
                  onClick={() => onOpenAttachment(url)}
                  className="w-full rounded-lg overflow-hidden aspect-square"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
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
}
