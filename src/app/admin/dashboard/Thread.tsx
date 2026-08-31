"use client";

import { useState } from "react";
import { TriangleAlert } from "lucide-react";
import { senderUnrecognised, type TicketMessage } from "@/lib/messages";
import type { Ticket } from "@/lib/tickets";

/**
 * One ticket's conversation plus the reply composer. This replaces the old
 * one-shot message box: replies here are recorded on the thread, where an
 * email sent from the landlady's own inbox would vanish from the record.
 *
 * Does its own POST, like MessageTenants, so a send failure can be shown
 * right next to the composer. On the mobile overlay the table's error bar is
 * underneath and invisible.
 */
export default function Thread({
  ticket,
  messages,
  onOpenAttachment,
  onSent,
}: {
  ticket: Ticket;
  messages: TicketMessage[];
  onOpenAttachment: (url: string) => void;
  onSent: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSent, setJustSent] = useState(false);

  const send = async () => {
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/tickets/${ticket.reference_number}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: draft }),
      });
      if (res.status === 401) {
        setError("Your session has expired. Please log in again.");
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? `That didn't work (${res.status})`);
        return;
      }
      setDraft("");
      setJustSent(true);
      setTimeout(() => setJustSent(false), 2000);
      onSent();
    } catch {
      setError("Could not reach the server. Check your connection.");
    } finally {
      setSending(false);
    }
  };

  const firstName = ticket.tenant_name.split(" ")[0];

  return (
    <div className="mt-2">
      <span className="text-gray-500 block mb-1">Conversation:</span>

      {messages.length > 0 && (
        <div className="flex flex-col gap-2 mb-2">
          {messages.map((message) => {
            const outbound = message.direction === "outbound";
            const flagged = senderUnrecognised(message, ticket.tenant_email);
            return (
              <div
                key={message.id}
                className={`max-w-[85%] rounded-lg px-3 py-2 ${
                  outbound
                    ? "self-end bg-[#0f2044] text-white"
                    : "self-start bg-gray-100 text-gray-900"
                }`}
              >
                {!outbound && (
                  <p className="text-xs font-medium text-gray-500 mb-0.5">
                    {message.sender_name || message.sender_email || "Tenant"}
                  </p>
                )}
                {flagged && (
                  <p className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 mb-1">
                    <TriangleAlert className="w-3 h-3 shrink-0" aria-hidden="true" />
                    Sent from {message.sender_email}, not the address on the ticket
                  </p>
                )}
                {message.body && (
                  <p className="text-sm whitespace-pre-wrap break-words">{message.body}</p>
                )}
                {message.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {message.attachments.map((url, i) =>
                      /\.(mp4|mov|webm)$/i.test(url) ? (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`text-xs underline ${outbound ? "text-blue-200" : "text-blue-700"}`}
                        >
                          View video {i + 1}
                        </a>
                      ) : (
                        <button
                          key={url}
                          onClick={() => onOpenAttachment(url)}
                          className="w-14 h-14 rounded overflow-hidden"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt={`Attachment ${i + 1}`}
                            className="w-full h-full object-cover hover:opacity-90"
                          />
                        </button>
                      )
                    )}
                  </div>
                )}
                <p
                  className={`text-[10px] mt-1 ${outbound ? "text-blue-200" : "text-gray-400"}`}
                >
                  {new Date(message.created_at).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                  })}{" "}
                  {new Date(message.created_at).toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            );
          })}
        </div>
      )}

      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={2}
        placeholder={`Message ${firstName}. They get it by email and can reply.`}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      {justSent && <p className="mt-1 text-xs text-green-600">Sent</p>}
      {draft.trim() && (
        <button
          onClick={send}
          disabled={sending}
          className="mt-1 w-full bg-[#0f2044] text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-blue-900 disabled:opacity-50"
        >
          {sending ? "Sending..." : `Send to ${firstName}`}
        </button>
      )}
    </div>
  );
}
