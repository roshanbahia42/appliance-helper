/**
 * Removes the quoted email underneath a reply.
 *
 * Written out rather than pulled from a library: email-reply-parser calls
 * createRequire(import.meta.url) at module scope to probe for an optional
 * native module, which is invisible to Vercel's function tracing and threw on
 * import in production while working fine locally. Quote stripping is a
 * heuristic either way, so owning ~40 lines of regex is the cheaper trade.
 *
 * No rule separates a reply from its quote perfectly across mail clients. This
 * is deliberately conservative: anything it cannot confidently identify is
 * kept, because showing a bit of extra quoted text is far better than losing
 * what the student wrote.
 */

/**
 * Where the quoted section starts. Each must be specific enough that ordinary
 * prose cannot trip it, since a false positive truncates a real message.
 */
const QUOTE_MARKERS: RegExp[] = [
  // "On Mon, 31 Aug 2026 at 10:00, Someone <a@b.com> wrote:" and its
  // wrapped variants. Gmail, Apple Mail and most mobile clients.
  /^[ \t]*-*[ \t]*On\b[\s\S]{0,300}?\bwrote:[ \t]*$/m,
  // The same line in other locales, which students on exchange will produce.
  /^[ \t]*-*[ \t]*(?:Le|El|Il|Em)\b[\s\S]{0,300}?(?:écrit|escribió|scritto|escreveu)\s*:[ \t]*$/m,
  /^[ \t]*Am\b[\s\S]{0,300}?\bschrieb\b[\s\S]{0,100}?:[ \t]*$/m,
  // Outlook's horizontal rule above the quoted header block.
  /^[ \t]*_{5,}[ \t]*$/m,
  /^[ \t]*-{2,}[ \t]*Original Message[ \t]*-{2,}[ \t]*$/im,
  /^[ \t]*-{2,}[ \t]*Forwarded message[ \t]*-{2,}[ \t]*$/im,
  // A "From:" header line, but only when it carries an address. Without that
  // condition it would cut a message like "From: my room I can hear it".
  /^[ \t]*From:[ \t]*.*[\w.+-]+@[\w.-]+\.\w+.*$/m,
];

/** Client-added sign-offs that add nothing to a maintenance ticket. */
const SIGNATURES =
  /\n+[ \t]*(?:Sent from my [\w\s]+|Get Outlook for \w+|Sent via [\w\s]+)[ \t]*$/i;

export function stripQuotedText(text: string) {
  if (!text) return "";

  const normalised = text.replace(/\r\n/g, "\n");

  // The earliest marker wins: everything from there down is quoted material.
  let cut = normalised.length;
  for (const marker of QUOTE_MARKERS) {
    const match = marker.exec(normalised);
    if (match && match.index < cut) cut = match.index;
  }

  const lines = normalised.slice(0, cut).split("\n");

  // Trailing ">" lines and blanks left above the marker, plus the "someone
  // wrote:" line when it sat on its own without matching a marker above.
  while (lines.length > 0) {
    const last = lines[lines.length - 1].trim();
    if (last === "" || last.startsWith(">")) lines.pop();
    else break;
  }

  const body = lines.join("\n").replace(SIGNATURES, "").trim();

  // Everything looked like a quote, which usually means the reply was typed
  // underneath it. Keep the original rather than returning nothing.
  return body || normalised.trim();
}
