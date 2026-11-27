import type { MetadataRoute } from "next";

// Makes NutriGoal installable on phones ("Add to Home Screen").
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NutriGoal — Health · Balance · Success",
    short_name: "NutriGoal",
    description: "Nutrition answers by the ticket, from real physicians and dietitians.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#0c2b15",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/brand/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
