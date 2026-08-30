"use client";

import { useState } from "react";

/**
 * Lets a tenant close their own ticket if the problem sorted itself out.
 *
 * It confirms first: the link sits at the bottom of the page where it's easy to
 * hit by accident, and a tenant who closes a real fault has no way to reopen it.
 */
export default function CloseTicketButton({
  reference,
  initialStatus,
}: {
  reference: string;
  initialStatus: string;
}) {
  const [state, setState] = useState<"idle" | "confirming" | "loading" | "done">(
    initialStatus === "resolved" ? "done" : "idle"
  );

  if (state === "done") {
    return (
      <p className="text-center text-xs text-slate-400">
        Ticket closed. Thanks for letting us know.
      </p>
    );
  }

  if (state === "idle") {
    return (
      <button
        onClick={() => setState("confirming")}
        className="w-full text-center text-xs text-slate-400 hover:text-slate-600 transition-colors"
      >
        Issue since been resolved? Close this ticket
      </button>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-3">
      <p className="text-sm text-slate-700 text-center">
        Close this ticket? Your landlady will stop looking into it.
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => setState("idle")}
          disabled={state === "loading"}
          className="flex-1 border border-slate-300 text-slate-600 rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={async () => {
            setState("loading");
            await fetch(`/api/tickets/${reference}/resolved`, { method: "POST" });
            setState("done");
          }}
          disabled={state === "loading"}
          className="flex-1 bg-[#0f2044] text-white rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-blue-900 disabled:opacity-50"
        >
          {state === "loading" ? "Closing..." : "Yes, close it"}
        </button>
      </div>
    </div>
  );
}
