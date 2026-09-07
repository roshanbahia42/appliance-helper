import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Eastwinds Maintenance",
    short_name: "Eastwinds",
    description: "Report a maintenance issue at your Eastwinds property",
    start_url: "/",
    display: "standalone",
    background_color: "#0f2044",
    theme_color: "#0f2044",
    icons: [
      // Listed as plain icons as well as maskable ones, matching the admin
      // manifest. Declared maskable-only, the arch was skipped on platforms
      // that do not apply a mask, and the home screen fell back to whatever
      // icon it could find instead.
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
