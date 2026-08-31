"use client";

import { useState } from "react";
import { Mail } from "lucide-react";

/**
 * Compose box for emailing every tenant at a property, from the property's own
 * address rather than whatever mail client the device happens to open.
 *
 * With a `reference` the send is tied to that ticket: the email carries the
 * ticket's details and replies come back onto its thread, shared by the whole
 * house. Without one it is a plain announcement (the property filter's
 * button), where replies go to the landlady's inbox.
 *
 * Recipients are worked out server-side from tickets, so there is no list to
 * maintain. Messaging a single tenant lives in the ticket's thread now.
 */
export default function MessageTenants({
  property,
  reference,
  label,
  defaultSubject = "",
  full = false,
}: {
  property: string;
  /** Ties the send to a ticket, making replies thread onto it. */
  reference?: string;
  label: string;
  /** Prefills the subject. The ticket's category, where there is one. */
  defaultSubject?: string;
  /** Full width suits the detail panel; inline suits the filter row. */
  full?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const close = () => {
    setOpen(false);
    setSubject(defaultSubject);
    setBody("");
    setResult(null);
  };

  const send = async () => {
    setSending(true);
    setResult(null);

    const res = await fetch("/api/message-tenants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        property_address: property,
        reference,
        scope: reference ? "property" : undefined,
        subject,
        message: body,
      }),
    });
    const data = await res.json();
    setSending(false);

    if (!res.ok) {
      setResult(data.error ?? "Could not send");
      return;
    }
    if (data.rateLimited) {
      setResult(
        `Sent to ${data.sent} of ${data.sent + data.failed}. The daily email limit was reached; message the rest tomorrow.`
      );
      return;
    }
    setResult(
      `Sent to ${data.sent} ${data.sent === 1 ? "tenant" : "tenants"}` +
        (data.failed ? `. ${data.failed} failed` : "")
    );
    setSubject(defaultSubject);
    setBody("");
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={`flex items-center justify-center gap-1.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 ${
          full ? "w-full px-3 py-2" : "px-3 py-1.5"
        }`}
      >
        <Mail className="w-4 h-4" aria-hidden="true" />
        {label}
      </button>
    );
  }

  return (
    <div className="w-full bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
      <div>
        <p className="text-sm font-medium text-gray-900">Message everyone at</p>
        <p className="text-sm text-gray-500 break-all">{property}</p>
      </div>

      <input
        type="text"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="Subject"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        placeholder={
          reference
            ? "Does anyone know who was using the shower when the leak started?"
            : "The handyman is coming on Thursday morning..."
        }
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
      />

      {result && <p className="text-sm text-gray-600">{result}</p>}

      <div className="flex gap-2">
        <button
          onClick={close}
          className="flex-1 border border-gray-300 text-gray-600 rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-gray-50"
        >
          {result ? "Done" : "Cancel"}
        </button>
        <button
          onClick={send}
          disabled={sending || !subject.trim() || !body.trim()}
          className="flex-1 bg-[#0f2044] text-white rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-blue-900 disabled:opacity-40"
        >
          {sending ? "Sending..." : "Send"}
        </button>
      </div>

      <p className="text-xs text-gray-400">
        Goes to everyone who has reported from this property in the last year.
        Each tenant gets their own copy.
        {reference ? " The ticket's details are included and replies land on its conversation." : ""}
      </p>
    </div>
  );
}
