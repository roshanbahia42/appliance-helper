import type { Metadata } from "next";

export const metadata: Metadata = {
  manifest: "/admin-manifest.webmanifest",
  title: "Maintenance Admin",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Admin",
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
