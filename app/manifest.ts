import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Atom — Personal reminder intelligence",
    short_name: "Atom",
    description: "Voice-first, offline-first reminders for Android.",
    start_url: "/",
    display: "standalone",
    background_color: "#070b09",
    theme_color: "#070b09",
    icons: [
      { src: "/atom-icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/atom-icon.png", sizes: "1024x1024", type: "image/png" },
    ],
  };
}
