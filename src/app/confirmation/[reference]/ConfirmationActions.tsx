"use client";

import { useState } from "react";

export default function ConfirmationActions({
  reference,
  currentStatus,
}: {
  reference: string;
  currentStatus: string;
}) {
  const [loading, setLoading] = useState<"resolved" | "escalate" | null>(null);
  const [doneType, setDoneType] = useState<"resolved" | "escalate" | null>(
    currentStatus === "resolved"
      ? "resolved"
      : currentStatus === "escalated"
        ? "escalate"
        : null
  );

  const handleAction = async (action: "resolved" | "escalate") => {
    setLoading(action);
    await fetch(`/api/tickets/${reference}/${action}`, { method: "POST" });
    setDoneType(action);
    setLoading(null);
  };

  if (doneType) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-800 text-sm">
        {doneType === "resolved"
          ? "Great! We're glad the issue is resolved. No further action needed."
          : "Your landlord has been notified and will be in touch soon. Keep your reference number handy."}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-gray-700">
        Did these steps fix your issue?
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => handleAction("resolved")}
          disabled={!!loading}
          className="flex-1 bg-green-600 text-white rounded-lg px-4 py-3 text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {loading === "resolved" ? "Saving..." : "Yes, issue resolved"}
        </button>
        <button
          onClick={() => handleAction("escalate")}
          disabled={!!loading}
          className="flex-1 bg-gray-800 text-white rounded-lg px-4 py-3 text-sm font-medium hover:bg-gray-900 disabled:opacity-50 transition-colors"
        >
          {loading === "escalate" ? "Saving..." : "No, I still need help"}
        </button>
      </div>
    </div>
  );
}