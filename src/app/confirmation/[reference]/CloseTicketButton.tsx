"use client";

import { useState } from "react";

export default function CloseTicketButton({
  reference,
  initialStatus,
}: {
  reference: string;
  initialStatus: string;
}) {
  const [state, setState] = useState<"idle" | "loading" | "done">(
    initialStatus === "resolved" ? "done" : "idle"
  );

  if (state === "done") {
    return (
      <p className="text-center text-xs text-slate-400">Ticket closed. Thanks for letting us know.</p>
    );
  }

  return (
    <button
      onClick={async () => {
        setState("loading");
        await fetch(`/api/tickets/${reference}/resolved`, { method: "POST" });
        setState("done");
      }}
      disabled={state === "loading"}
      className="w-full text-center text-xs text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
    >
      {state === "loading" ? "Closing..." : "Issue since been resolved? Close this ticket"}
    </button>
  );
}
