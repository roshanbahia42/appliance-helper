import { createAdminClient } from "@/utils/supabase/admin";
import { notFound } from "next/navigation";
import Link from "next/link";
import CloseTicketButton from "./CloseTicketButton";

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
          <Link href="/" className="inline-block hover:opacity-80 transition-opacity">
            <h1 className="text-2xl font-bold text-white">Student Maintenance Hub</h1>
          </Link>
          <p className="text-blue-200 text-sm mt-1">Request received</p>
        </div>
      </header>

      <div className="max-w-xl mx-auto p-6 flex flex-col gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-start gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <p className="font-semibold text-slate-900">Request submitted successfully</p>
              <p className="text-slate-500 text-sm mt-0.5">
                A confirmation has been sent to {ticket.tenant_email}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-3 text-sm">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Your request</h2>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Reference</span>
              <span className="font-mono font-semibold text-slate-800">{reference}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Property</span>
              <span className="text-slate-800 text-right">{ticket.property_address}{ticket.tenant_room ? `, Room ${ticket.tenant_room}` : ""}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Issue</span>
              <span className="text-slate-800 text-right">{ticket.category}</span>
            </div>
            {ticket.description && (
              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-500 block mb-1">Details</span>
                <p className="text-slate-800 bg-slate-50 rounded-lg p-3 leading-relaxed">{ticket.description}</p>
              </div>
            )}
          </div>
        </div>

        {ticket.media_urls && ticket.media_urls.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Your attachments</h2>
            <div className="flex flex-col gap-2">
              {ticket.media_urls.map((url: string, i: number) => {
                const ext = url.split(".").pop()?.toLowerCase() ?? "";
                const isVideo = ["mp4", "mov", "avi", "webm", "mkv"].includes(ext);
                const isPreviewable = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext);
                if (isVideo) return <video key={i} src={url} controls className="w-full rounded-lg" />;
                if (isPreviewable) return (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                    {/* Plain img by choice: these are arbitrary Supabase Storage
                        URLs, and next/image would need every one whitelisted plus
                        per-image transform cost for photos shown once. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Attachment ${i + 1}`} className="w-full rounded-lg" />
                  </a>
                );
                return (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-700 bg-slate-50 rounded-lg px-3 py-2 hover:bg-slate-100">
                    <span>📎</span><span>Attachment {i + 1} — tap to download</span>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-900 leading-relaxed">
            Your landlady has been notified and will be in touch to arrange a repair.
          </p>
        </div>

        <CloseTicketButton reference={reference} initialStatus={ticket.status} />
      </div>
    </div>
  );
}
