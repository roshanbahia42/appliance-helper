import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireAdmin } from "@/utils/supabase/requireAdmin";
import type { TicketMessage } from "@/lib/messages";

/**
 * A cell that starts with one of these would run as a formula when the file
 * is opened in Excel or Sheets. Tenant-typed text lands in this export, so
 * every risky cell gets a leading apostrophe, which spreadsheets display as
 * plain text.
 */
function csvCell(value: string | null | undefined) {
  let cell = value ?? "";
  if (/^[=+\-@]/.test(cell)) cell = `'${cell}`;
  return `"${cell.replace(/"/g, '""')}"`;
}

const HEADER = [
  "Reference",
  "Status",
  "Property",
  "Room",
  "Tenant",
  "Tenant email",
  "Tenant phone",
  "Issue",
  "Description",
  "Reported",
  "Sent to handyman",
  "Notes",
  "Message date",
  "Message from",
  "Message",
  "Message attachments",
];

/**
 * Everything as one spreadsheet: each ticket is a row, followed by a row per
 * message on its thread. This is the landlady's written record leaving the
 * system, so it includes binned tickets too.
 */
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const supabase = createAdminClient();
  const [{ data: tickets }, { data: messages }] = await Promise.all([
    supabase.from("tickets").select("*").order("created_at", { ascending: true }),
    supabase.from("ticket_messages").select("*").order("created_at", { ascending: true }),
  ]);

  const messagesByTicket: Record<string, TicketMessage[]> = {};
  for (const message of messages ?? []) {
    (messagesByTicket[message.ticket_id] ??= []).push(message);
  }

  const lines = [HEADER.map(csvCell).join(",")];

  for (const ticket of tickets ?? []) {
    const ticketCells = [
      ticket.reference_number,
      ticket.status + (ticket.deleted_at ? " (binned)" : ""),
      ticket.property_address,
      ticket.tenant_room,
      ticket.tenant_name,
      ticket.tenant_email,
      ticket.tenant_phone,
      ticket.category,
      ticket.description,
      new Date(ticket.created_at).toLocaleString("en-GB"),
      ticket.sent_to_handyman_at
        ? new Date(ticket.sent_to_handyman_at).toLocaleDateString("en-GB")
        : "",
      ticket.admin_notes,
    ];
    lines.push([...ticketCells, "", "", "", ""].map(csvCell).join(","));

    for (const message of messagesByTicket[ticket.id] ?? []) {
      lines.push(
        [
          ticket.reference_number,
          ...Array(11).fill(""),
          new Date(message.created_at).toLocaleString("en-GB"),
          message.direction === "outbound"
            ? "Eastwinds"
            : message.sender_name || message.sender_email || "Tenant",
          message.body,
          String(message.attachments?.length ?? 0),
        ]
          .map(csvCell)
          .join(",")
      );
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  // BOM so Excel opens it as UTF-8; accented names garble without it.
  return new NextResponse("\uFEFF" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="eastwinds-tickets-${today}.csv"`,
    },
  });
}
