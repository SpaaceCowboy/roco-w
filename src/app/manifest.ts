import type { MetadataRoute } from "next";

/**
 * Web app manifest — makes the site installable and gives Android/Chrome the
 * brand colours and icons for the home-screen / task-switcher. The dark
 * `theme_color` matches the site background used across the app (and the 404).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ROCO Broker",
    short_name: "ROCO",
    description:
      "ROCO Broker — trade forex, metals, commodities, indices, stocks and crypto on MetaTrader 5.",
    start_url: "/",
    display: "standalone",
    background_color: "#12181b",
    theme_color: "#12181b",
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any", purpose: "any" },
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any", purpose: "maskable" },
    ],
  };
}
