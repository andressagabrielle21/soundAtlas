import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "SoundAtlas",
    short_name: "SoundAtlas",
    description: "Sua biblioteca musical e seu diário de escuta.",
    lang: "pt-BR",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#111116",
    theme_color: "#111116",
    icons: [
      { src: "/pwa/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/pwa/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/pwa/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
