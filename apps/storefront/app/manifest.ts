import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Perfume Aura",
    short_name: "Perfume Aura",
    description:
      "An India-focused fragrance house helping people choose perfume by mood, intensity, occasion, and composition.",
    start_url: "/",
    display: "standalone",
    background_color: "#100b06",
    theme_color: "#100b06",
    lang: "en-IN",
    icons: [
      {
        src: "/favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
