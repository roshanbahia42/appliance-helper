import { createAdminClient } from "@/utils/supabase/admin";
import { notFound } from "next/navigation";
import SiteHeader from "@/app/SiteHeader";
import { CONTACTS } from "@/lib/categories";
import { STATUS_LABELS } from "@/lib/tickets";
import type { TicketMessage } from "@/lib/messages";
import ThreadReplyBox from "./ThreadReplyBox";

const STATUS_STYLES: Record<string, string> = {
  open: "bg-yellow-100 text-yellow-800",
  escalated: "bg-red-100 text-red-700",
  resolved: "bg-green-100 text-green-800",
};

/**
 * A ticket's conversation, for the student. Public in the same way as the
 * handyman's job sheet: the unguessable token in the URL is the only key.
 * The messages here go both ways by email too, so nothing on this page is
 * the student's only route, but it is the reliable one when an emailed reply
 * can't be matched or the confirmation email is long gone.
 */
export default async function ThreadPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = createAdminClient();

  const { data: ticket } = await supabase
    .from("tickets")
    .select(
      "id, reference_number, category, description, property_address, tenant_room, status, created_at"
    )
    .eq("public_token", token)
    .is("deleted_at", null)
    .maybeSingle();

  if (!ticket) notFound();

  const { data: messages } = await supabase
    .from("ticket_messages")
    .select("*")
    .eq("ticket_id", ticket.id)
    .order("created_at", { ascending: true });

  const thread: TicketMessage[] = messages ?? [];

  return (
    <div className="min-h-screen bg-slate-50">
      <SiteHeader>
        <h1 className="text-xl font-bold text-white">{ticket.category}</h1>
        <p className="text-blue-200 text-sm mt-0.5">
          {ticket.reference_number} · {ticket.property_address}
          {ticket.tenant_room ? `, Room ${ticket.tenant_room}` : ""}
        </p>
      </SiteHeader>

      <div className="max-w-xl mx-auto p-6 flex flex-col gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between gap-3 text-sm">
          <span className="text-slate-500">
            Reported {new Date(ticket.created_at).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[ticket.status] ?? "bg-slate-100 text-slate-600"}`}
          >
            {STATUS_LABELS[ticket.status] ?? ticket.status}
          </span>
        </div>

        {ticket.description && (
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Your report
            </h2>
            <p className="text-sm text-slate-800 leading-relaxed">{ticket.description}</p>
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Conversation
          </h2>
          {thread.length === 0 ? (
            <p className="text-sm text-slate-400">
              No messages yet. If you have an update or a question, send it below.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {thread.map((message) => {
                const mine = message.direction === "inbound";
                return (
                  <div
                    key={message.id}
                    className={`max-w-[85%] rounded-lg px-3 py-2 ${
                      mine
                        ? "self-end bg-[#0f2044] text-white"
                        : "self-start bg-slate-100 text-slate-900"
                    }`}
                  >
                    <p className={`text-xs font-medium mb-0.5 ${mine ? "text-blue-200" : "text-slate-500"}`}>
                      {mine ? "You" : "Eastwinds"}
                    </p>
                    {message.body && (
                      <p className="text-sm whitespace-pre-wrap break-words">{message.body}</p>
                    )}
                    {message.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {message.attachments.map((url, i) =>
                          /\.(mp4|mov|webm)$/i.test(url) ? (
                            <a
                              key={url}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`text-xs underline ${mine ? "text-blue-200" : "text-blue-700"}`}
                            >
                              View video {i + 1}
                            </a>
                          ) : (
                            <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                              {/* Plain img by choice: arbitrary Supabase Storage
                                  URLs that next/image would need whitelisted. */}
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={url}
                                alt={`Attachment ${i + 1}`}
                                className="w-16 h-16 rounded object-cover"
                              />
                            </a>
                          )
                        )}
                      </div>
                    )}
                    <p className={`text-[10px] mt-1 ${mine ? "text-blue-200" : "text-slate-400"}`}>
                      {new Date(message.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      })}{" "}
                      {new Date(message.created_at).toLocaleTimeString("en-GB", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <ThreadReplyBox token={token} resolved={ticket.status === "resolved"} />

        {/* Always visible: a routine thread can turn into an emergency, and
            nobody is watching this page in real time. */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm text-red-900 leading-relaxed">
            <strong>Emergency?</strong> Do not wait for a reply here. Call the
            property managers on {CONTACTS.landlady} or {CONTACTS.landlord2}. If
            there is danger to life, call 999 first.
          </p>
        </div>
      </div>
    </div>
  );
}
