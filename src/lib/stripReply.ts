import "server-only";
import EmailReplyParser from "email-reply-parser";

/**
 * The part of a reply the student actually typed. Every reply arrives with the
 * whole previous email quoted underneath, and no rule separates the two
 * perfectly across mail clients, so this is a heuristic: the library handles
 * Gmail and Outlook formats, and a failure falls back to the full text rather
 * than losing the message.
 *
 * Separate from messages.ts because the parser needs Node builtins, and that
 * file is bundled for the browser.
 */
export function stripQuotedText(text: string) {
  try {
    const visible = new EmailReplyParser().read(text).getVisibleText().trim();
    return visible || text.trim();
  } catch {
    return text.trim();
  }
}
