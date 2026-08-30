import Link from "next/link";
import Brand from "./Brand";

/**
 * Navy header used across every screen.
 *
 * From lg up the lockup is pinned to the far left and the title block is
 * centred, so it lines up with the max-w-xl content column below it. Centring
 * the pair together instead would push the title right of everything else on
 * the page.
 *
 * Below lg they stack, which is the only arrangement that fits a phone and
 * avoids the logo colliding with the centred title on a narrow laptop.
 *
 * The lockup is always the way back to the start. It's the only persistent one
 * on the inner steps.
 */
export default function SiteHeader({
  children,
  width = "max-w-xl",
  onHome,
}: {
  children?: React.ReactNode;
  /** Match the page's own content column so the title aligns with it. */
  width?: string;
  /**
   * The student flow keeps its step in state on a single route, so linking to
   * "/" from it navigates nowhere and leaves you on the same screen. Pages that
   * work that way pass a reset handler instead of relying on the link.
   */
  onHome?: () => void;
}) {
  const markClasses =
    "self-start shrink-0 hover:opacity-80 transition-opacity lg:absolute lg:left-0 lg:top-1/2 lg:-translate-y-1/2";

  return (
    <header className="bg-[#0f2044] px-5 sm:px-8 py-5">
      <div className="relative flex flex-col gap-4 lg:block lg:gap-0">
        {onHome ? (
          <button type="button" onClick={onHome} aria-label="Start again" className={markClasses}>
            <Brand size="lg" />
          </button>
        ) : (
          <Link href="/" aria-label="Eastwinds home" className={markClasses}>
            <Brand size="lg" />
          </Link>
        )}
        {children && (
          <div
            className={`${width} mx-auto w-full lg:border-l lg:border-white/15 lg:pl-7`}
          >
            {children}
          </div>
        )}
      </div>
    </header>
  );
}
