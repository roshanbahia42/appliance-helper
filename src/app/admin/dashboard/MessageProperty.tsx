"use client";

import { useState } from "react";
import { Mail } from "lucide-react";

/**
 * Emails everyone living at one property, for things like "the handyman is
 * coming Thursday".
 *
 * Recipients are worked out server-side from tickets at that address, so there
 * is no tenant list to keep up to date. Everyone is sent their own copy rather
 * than one email addressed to the whole house.
 */
export default function MessageProperty({ property }: { property: string }) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const close = () => {
    setOpen(false);
    setSubject("");
    setBody("");
    setResult(null);
  };

  const send = async () => {
    setSending(true);
    setResult(null);

    const res = await fetch("/api/message-property", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ property_address: property, subject, message: body }),
    });
    const data = await res.json();
    setSending(false);

    if (!res.ok) {
      setResult(data.error ?? "Could not send");
      return;
    }
    setResult(
      `Sent to ${data.sent} ${data.sent === 1 ? "tenant" : "tenants"}` +
        (data.failed ? `. ${data.failed} failed` : "")
    );
    setSubject("");
    setBody("");
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 border border-gray-300 text-gray-700 rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
      >
        <Mail className="w-4 h-4" aria-hidden="true" />
        Message tenants
      </button>
    );
  }

  return (
    <div className="w-full bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
      <div>
        <p className="text-sm font-medium text-gray-900">Message everyone at</p>
        <p className="text-sm text-gray-500">{property}</p>
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
        placeholder="The handyman is coming on Thursday morning..."
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
      </p>
    </div>
  );
}
