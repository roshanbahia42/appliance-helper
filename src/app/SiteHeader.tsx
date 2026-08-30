import Link from "next/link";
import Brand from "./Brand";

/**
 * Navy header used across every screen.
 *
 * On desktop the lockup and the page title sit side by side on one row. Stacked
 * bands left dead space twice over: to the right of the logo, and above a title
 * that had drifted to the bottom of a tall navy block. Below `sm` they stack,
 * which is the only thing that fits on a phone.
 *
 * The lockup always links home. It's the only persistent way back from an inner
 * step.
 */
export default function SiteHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header className="bg-[#0f2044]">
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-5 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-7">
        <Link
          href="/"
          aria-label="Eastwinds home"
          className="shrink-0 hover:opacity-80 transition-opacity"
        >
          <Brand size="lg" />
        </Link>
        {children && (
          <div className="flex-1 min-w-0 sm:border-l sm:border-white/15 sm:pl-7">
            {children}
          </div>
        )}
      </div>
    </header>
  );
}
