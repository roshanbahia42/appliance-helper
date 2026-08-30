import Link from "next/link";
import Brand from "./Brand";

/**
 * Navy header used across every screen.
 *
 * The lockup sits in a full-width bar so it uses the empty space either side of
 * the centred content column, rather than being squeezed into it. It always
 * links home, which is the only persistent way back on the inner steps.
 *
 * `children` is the page's own title block, kept in the narrow column so it
 * lines up with the content below.
 */
export default function SiteHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header className="bg-[#0f2044]">
      <div className="px-5 sm:px-8 py-4">
        <Link
          href="/"
          aria-label="Eastwinds home"
          className="inline-block hover:opacity-80 transition-opacity"
        >
          <Brand size="lg" />
        </Link>
      </div>
      {children && (
        <div className="max-w-xl mx-auto px-6 pb-5">{children}</div>
      )}
    </header>
  );
}
