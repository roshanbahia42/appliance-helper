/**
 * The Eastwinds lockup: the arch mark plus the name as real text.
 *
 * The name is HTML rather than the wordmark SVG on purpose. That SVG sets the
 * name as live <text>, so it depends on Geist being loaded and would fall back
 * to different metrics if it weren't. As HTML it uses the same font the rest of
 * the page already has, and stays selectable.
 *
 * The mark is inlined rather than an <img> so it inherits currentColor and
 * costs no extra request.
 */
export default function Brand({
  tone = "light",
  size = "md",
}: {
  /** "light" for the navy header, "dark" for white backgrounds. */
  tone?: "light" | "dark";
  size?: "sm" | "md" | "lg";
}) {
  const markSize =
    size === "sm" ? "h-7 w-7" : size === "lg" ? "h-11 w-11" : "h-9 w-9";
  const nameSize =
    size === "sm" ? "text-base" : size === "lg" ? "text-2xl" : "text-xl";

  return (
    <span className="inline-flex items-center gap-2.5">
      <svg
        viewBox="0 0 512 512"
        className={`${markSize} shrink-0`}
        fill={tone === "light" ? "#ffffff" : "#0f2044"}
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M148 370V172a108 108 0 0 1 216 0v198h-42V172a66 66 0 0 0-132 0v198zM112 406h288v42H112z"
        />
      </svg>
      <span className="flex flex-col leading-none">
        <span
          className={`${nameSize} font-semibold tracking-tight ${
            tone === "light" ? "text-white" : "text-[#0f2044]"
          }`}
        >
          Eastwinds
        </span>
        <span
          className={`font-mono text-[9px] tracking-[0.18em] mt-0.5 ${
            tone === "light" ? "text-blue-200" : "text-slate-500"
          }`}
        >
          PROPERTY GROUP
        </span>
      </span>
    </span>
  );
}
