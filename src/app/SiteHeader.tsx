import Link from "next/link";
import Brand from "./Brand";

/**
 * Navy header used across every screen.
 *
 * The lockup and the title sit in one row inside the same column as the page
 * content below, so the divider and the heading line up with the left edge of
 * that content instead of floating at some width of their own. Pages pass the
 * width they actually use.
 *
 * Below lg they stack, which is the only arrangement that fits a phone.
 *
 * The lockup is always the way back to the start. It's the only persistent one
 * on the inner steps.
 */
export default function SiteHeader({
  children,
  width = "max-w-2xl",
  onHome,
}: {
  children?: React.ReactNode;
  /** Match the page's own content column so the header lines up with it. */
  width?: string;
  /**
   * The student flow keeps its step in state on a single route, so linking to
   * "/" from it navigates nowhere and leaves you on the same screen. Pages that
   * work that way pass a reset handler instead of relying on the link.
   */
  onHome?: () => void;
}) {
  const markClasses = "self-start shrink-0 hover:opacity-80 transition-opacity";

  return (
    <header className="bg-[#0f2044] px-5 sm:px-8 py-4">
      <div
        className={`${width} mx-auto flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-6`}
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
