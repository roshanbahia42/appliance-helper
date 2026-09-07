import Link from "next/link";
import Brand from "./Brand";

/**
 * Navy header used across every screen.
 *
 * The lockup and the title sit in one row, vertically centred on each other.
 *
 * The row is a fixed width on every page rather than matching each page's own
 * content column. Tracking the content meant the lockup moved sideways as you
 * stepped through the flow, because the category grid is far wider than the
 * forms that follow it. Fixed, the lockup never moves, and on the first step
 * it still lines up with the left edge of the grid.
 *
 * Below lg they stack, which is the only arrangement that fits a phone.
 *
 * The lockup is always the way back to the start. It's the only persistent one
 * on the inner steps.
 */
const HEADER_WIDTH = "max-w-6xl";

export default function SiteHeader({
  children,
  onHome,
}: {
  children?: React.ReactNode;
  /**
   * The student flow keeps its step in state on a single route, so linking to
   * "/" from it navigates nowhere and leaves you on the same screen. Pages that
   * work that way pass a reset handler instead of relying on the link.
   */
  onHome?: () => void;
}) {
  // self-start only while stacked. Left on in the row it would override the
  // centring and sit the lockup higher than the heading beside it.
  const markClasses =
    "self-start lg:self-auto shrink-0 hover:opacity-80 transition-opacity";

  return (
    <header className="bg-[#0f2044] px-5 sm:px-8 py-4">
      <div
        className={`${HEADER_WIDTH} mx-auto flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-6`}
      >
        {onHome ? (
          <button type="button" onClick={onHome} aria-label="Start again" className={markClasses}>
            <Brand size="xl" />
          </button>
        ) : (
          <Link href="/" aria-label="Eastwinds home" className={markClasses}>
            <Brand size="xl" />
          </Link>
        )}
        {children && (
          // Fixed height with the contents centred, so the banner does not
          // change thickness as steps add a progress bar or an urgent badge.
          <div className="flex flex-col justify-center lg:flex-1 lg:min-w-0 lg:min-h-[92px] lg:border-l lg:border-white/15 lg:pl-6">
            {children}
          </div>
        )}
      </div>
    </header>
  );
}
