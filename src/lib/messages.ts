/**
 * Message shape and the pure logic around ticket conversations. No React and no
 * data fetching, matching tickets.ts, so everything here is trivially testable
 * and shared by the dashboard, the student thread page and the inbound webhook.
 *
 * Quote stripping lives in stripReply.ts instead: its library needs Node
 * builtins, and this file is bundled for the browser.
 */

export type TicketMessage = {
  id: string;
  ticket_id: string;
  direction: "inbound" | "outbound";
  sender_name: string | null;
  sender_email: string | null;
  body: string;
  /** Public storage URLs, same convention as Ticket.media_urls. */
  attachments: string[];
  provider_message_id: string | null;
  read_at: string | null;
  created_at: string;
};

/** Unread inbound messages are the landlady's only signal a student replied. */
export function unreadCount(messages: TicketMessage[]) {
  return messages.filter((m) => m.direction === "inbound" && !m.read_at).length;
}

export function lastMessageAt(messages: TicketMessage[]) {
  if (messages.length === 0) return 0;
  return Math.max(...messages.map((m) => new Date(m.created_at).getTime()));
}

/**
 * True when a reply came from a different address than the ticket was submitted
 * with. Flagged rather than rejected: students routinely submit with a
 * university address and reply from a personal one.
 */
export function senderUnrecognised(
  message: TicketMessage,
  tenantEmail: string
) {
  if (message.direction !== "inbound" || !message.sender_email) return false;
  return message.sender_email.toLowerCase() !== tenantEmail.toLowerCase();
}

/**
 * The tagged address replies come back to. The token in the local part is how
 * an inbound email finds its ticket without relying on the student's mail
 * client preserving subjects or headers.
 */
export function replyAddress(token: string, domain: string | undefined) {
  if (!domain) return null;
  return `ticket+${token}@${domain}`;
}

/** Pulls the public token out of a recipient list, or null if none carries one. */
export function extractToken(recipients: string[]) {
  for (const recipient of recipients) {
    const match = /ticket\+([a-z0-9]+)@/i.exec(recipient);
    if (match) return match[1].toLowerCase();
  }
  return null;
}

/** Matches the reference format generateReference() has always produced. */
export function extractReference(subject: string) {
  const match = /MT-\d{4}-\d{5}/.exec(subject ?? "");
  return match ? match[0] : null;
}

/**
 * Splits "Jamie Smith <jamie@example.com>" into its parts. Bare addresses come
 * back with an empty name.
 */
export function parseSender(from: string) {
  const match = /^\s*(?:"?([^"<]*)"?\s*)?<([^>]+)>\s*$/.exec(from ?? "");
  if (match) {
    return { name: (match[1] ?? "").trim(), email: match[2].trim().toLowerCase() };
  }
  return { name: "", email: (from ?? "").trim().toLowerCase() };
}

/**
 * Message-IDs referenced by a reply, angle brackets stripped, for matching
 * against stored provider_message_ids. In-Reply-To holds the direct parent;
 * References accumulates the whole chain, so both are worth checking.
 */
export function referencedMessageIds(headers: Record<string, string> | null) {
  if (!headers) return [];
  const ids: string[] = [];
  for (const key of Object.keys(headers)) {
    const lower = key.toLowerCase();
    if (lower === "in-reply-to" || lower === "references") {
      for (const match of headers[key].matchAll(/<([^>]+)>/g)) {
        ids.push(match[1]);
      }
    }
  }
  return [...new Set(ids)];
}

/**
 * Out-of-office and similar autoresponders would otherwise land on tickets as
 * replies. RFC 3834's Auto-Submitted header is the reliable signal; the subject
 * prefixes catch the mail systems that never set it.
 */
export function isAutoReply(
  subject: string,
  headers: Record<string, string> | null
) {
  for (const key of Object.keys(headers ?? {})) {
    const lower = key.toLowerCase();
    const value = (headers?.[key] ?? "").toLowerCase();
    if (lower === "auto-submitted" && value !== "no") return true;
    if (lower === "x-autoreply" || lower === "x-autorespond") return true;
    if (lower === "precedence" && (value === "auto_reply" || value === "bounce")) {
      return true;
    }
  }
  const s = (subject ?? "").toLowerCase();
  return s.startsWith("out of office") || s.startsWith("automatic reply");
}

/** Typed by the landlady or a student, but it still shouldn't build markup. */
export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Last-resort body when an email arrives with no text part. Good enough for
 * display; the original is always in the Resend dashboard if it ever matters.
 */
export function htmlToText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6]|blockquote)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
