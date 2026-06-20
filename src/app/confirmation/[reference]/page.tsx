import { createAdminClient } from "@/utils/supabase/admin";
import { notFound } from "next/navigation";
import ConfirmationActions from "./ConfirmationActions";

export default async function ConfirmationPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  const supabase = createAdminClient();

  const { data: ticket } = await supabase
    .from("tickets")
    .select("*")
    .eq("reference_number", reference)
    .single();

  if (!ticket) notFound();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-[#0f2044] px-6 py-8">
        <div className="max-w-xl mx-auto">
          <h1 className="text-2xl font-bold text-white">
            Student Maintenance Hub
          </h1>
          <p className="text-blue-200 text-sm mt-1">Request received</p>
        </div>
      </header>

      <div className="max-w-xl mx-auto p-6 flex flex-col gap-5">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-start gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <p className="font-semibold text-slate-900">
                Request submitted successfully
              </p>
              <p className="text-slate-500 text-sm mt-0.5">
                Reference:{" "}
                <span className="font-mono font-semibold text-slate-700">
                  {reference}
                </span>
              </p>
              <p className="text-slate-500 text-sm mt-0.5">
                A confirmation has been sent to {ticket.tenant_email}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">🔍</span>
            <h2 className="font-semibold text-slate-900">
              Before we arrange a visit, please try these steps
            </h2>
          </div>
          <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
            {ticket.ai_response}
          </div>
        </div>

        <ConfirmationActions
          reference={reference}
          currentStatus={ticket.status}
        />
      </div>
    </div>
  );
}
