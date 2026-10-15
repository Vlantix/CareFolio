import type { MetadataRoute } from "next";

// Makes CareFolio installable ("Add to home screen").
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CareFolio",
    short_name: "CareFolio",
    description: "Request and download your official lab results from the hospital — no trip, no queue.",
    start_url: "/home",
    display: "standalone",
    background_color: "#F3F6F5",
    theme_color: "#0B6E69",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
