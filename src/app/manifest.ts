import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Student Maintenance Hub",
    short_name: "Maintenance",
    description: "Report maintenance issues at your student property",
    start_url: "/",
    display: "standalone",
    background_color: "#0f2044",
    theme_color: "#0f2044",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
