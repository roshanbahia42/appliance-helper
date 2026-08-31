"use client";

import { useState } from "react";
import SiteHeader from "@/app/SiteHeader";

/**
 * Recovers a lost ticket link. The confirmation email is normally the only
 * copy, so a student who tidied their inbox has no other way back to their
 * conversation.
 *
 * The result message is the same whether or not the address has tickets:
 * answering differently would let anyone test which emails have reported
 * something here.
 */
export default function FindTicketPage() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/find-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Something went wrong. Please try again.");
        return;
      }
      setDone(true);
    } catch {
      setError("Could not reach the server. Check your connection.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <SiteHeader>
        <h1 className="text-2xl font-bold text-white">Find your ticket</h1>
        <p className="text-blue-200 text-sm mt-1">
          We&apos;ll email you links to your maintenance requests
        </p>
      </SiteHeader>

      <div className="max-w-xl mx-auto p-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          {done ? (
            <div>
              <p className="font-semibold text-slate-900">Check your email</p>
              <p className="text-sm text-slate-500 mt-1">
                If any maintenance requests are linked to that address, the
                links are on their way to it now.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-3">
              <label htmlFor="find-email" className="text-sm font-medium text-slate-900">
                Email address
              </label>
              <p className="text-sm text-slate-500 -mt-2">
                The one you used when you reported the issue.
              </p>
              <input
                id="find-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {error && <p className="text-xs text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={sending || !email.trim()}
                className="w-full bg-[#0f2044] text-white rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-blue-900 disabled:opacity-40"
              >
                {sending ? "Sending..." : "Email me my tickets"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
