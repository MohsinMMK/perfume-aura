import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Perfume Aura",
    short_name: "Perfume Aura",
    description:
      "Perfume Aura is a fragrance store in Kondapur, Hyderabad, helping people choose perfume by mood, intensity, occasion, and composition.",
    start_url: "/",
    display: "standalone",
    background_color: "#100b06",
    theme_color: "#100b06",
    lang: "en-IN",
    icons: [
      {
        src: "/brand/perfume-aura-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/perfume-aura-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
