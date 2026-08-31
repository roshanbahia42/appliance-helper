"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * The student's reply box on the public thread page. This is the path for
 * chasing an outstanding ticket, and the fallback when an emailed reply can't
 * be matched, so it works with nothing but the link.
 */
export default function ThreadReplyBox({
  token,
  resolved,
}: {
  token: string;
  /** Warns that replying reopens, so nobody is surprised by it. */
  resolved: boolean;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/thread/${token}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: draft }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Could not send. Please try again.");
        return;
      }
      setDraft("");
      router.refresh();
    } catch {
      setError("Could not reach the server. Check your connection.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <label htmlFor="thread-reply" className="text-sm font-medium text-slate-900 block mb-2">
        Send an update
      </label>
      {resolved && (
        <p className="text-xs text-slate-500 mb-2">
          This request is marked as resolved. Sending a message will reopen it.
        </p>
      )}
      <textarea
        id="thread-reply"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={3}
        maxLength={5000}
        placeholder="Any update, question or extra detail..."
        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      <button
        onClick={send}
        disabled={sending || !draft.trim()}
        className="mt-2 w-full bg-[#0f2044] text-white rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-blue-900 disabled:opacity-40"
      >
        {sending ? "Sending..." : "Send"}
      </button>
    </div>
  );
}
