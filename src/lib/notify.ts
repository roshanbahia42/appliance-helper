import { Resend } from "resend";
import { escapeHtml, replyAddress } from "@/lib/messages";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM ?? "onboarding@resend.dev";
const APP_URL = process.env.APP_URL ?? "https://appliance-helper-self.vercel.app";

export type ResolvedTicket = {
  reference_number: string;
  tenant_name: string;
  tenant_email: string;
  category: string;
  public_token: string;
};

/**
 * Tells students their ticket was resolved. Shared by the single resolve
 * route and bulk resolve so the email can only behave one way.
 *
 * Without this a student whose issue was quietly fixed sits there assuming
 * they were ignored. The reply-to is the ticket's tagged address, so "it's
 * not actually fixed" comes straight back onto the thread and reopens it.
 *
 * Failures are logged, never thrown: the resolve itself already happened,
 * and un-resolving over a missed courtesy email would be worse.
 */
export async function sendResolvedEmails(tickets: ResolvedTicket[]) {
  const results = await Promise.allSettled(
    tickets.map((ticket) => {
      const replyTo =
        replyAddress(ticket.public_token, process.env.REPLY_DOMAIN) ??
        process.env.RESEND_REPLY_TO;
      return resend.emails.send({
        from: FROM,
        ...(replyTo ? { replyTo } : {}),
        to: ticket.tenant_email,
        subject: `Resolved: ${ticket.category} (${ticket.reference_number})`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #111;">
            <p>Hi ${escapeHtml(ticket.tenant_name?.split(" ")[0] || "there")},</p>
            <p>Your maintenance request <strong>${ticket.reference_number}</strong> (${escapeHtml(ticket.category)}) has been marked as resolved.</p>
            <p>If the problem is not actually fixed, just reply to this email and the ticket will be reopened.</p>
            <p style="color: #6b7280; font-size: 13px; margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
              You can also <a href="${APP_URL}/t/${ticket.public_token}" style="color: #1d4ed8;">view the conversation</a>.
            </p>
          </div>
        `,
      });
    })
  );

  results.forEach((result, i) => {
    const reference = tickets[i].reference_number;
    if (result.status === "rejected") {
      console.error(`Resolved email for ${reference} threw:`, result.reason);
    } else if (result.value?.error) {
      console.error(
        `Resolved email for ${reference} failed:`,
        JSON.stringify(result.value.error)
      );
    }
  });
}
