import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Aula 1B · Organización académica",
    short_name: "Aula 1B",
    description: "Organización académica gamificada para 1.º de Bachillerato",
    start_url: "/app",
    display: "standalone",
    background_color: "#f7f8fa",
    theme_color: "#0a84ff",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
