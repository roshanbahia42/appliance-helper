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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4">
        <h1 className="text-xl font-bold text-gray-900">Request Received</h1>
      </header>

      <div className="max-w-xl mx-auto p-6 flex flex-col gap-5">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800 font-semibold">
            Request submitted successfully
          </p>
          <p className="text-green-700 text-sm mt-1">
            Reference number: <strong>{reference}</strong>
          </p>
          <p className="text-green-600 text-sm mt-1">
            A confirmation has been sent to {ticket.tenant_email}
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h2 className="font-semibold text-gray-900 mb-3">
            Before we arrange a visit, please try these steps:
          </h2>
          <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {ticket.ai_response}
          </div>
        </div>

        <ConfirmationActions reference={reference} currentStatus={ticket.status} />
      </div>
    </div>
  );
}