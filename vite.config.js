// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/", // 🔥 importante para produção no Vercel

  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.ico",
        "robots.txt",
        "apple-touch-icon.png",
        "logo.png"
      ],
      manifest: {
        name: "Réquiem RPG",
        short_name: "RPG",
        start_url: "/",
        display: "standalone",
        background_color: "#121212",
        theme_color: "#1976d2",
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
        ],
      },
    }),
  ],

  build: {
    outDir: "dist", // Vercel usa isso
  },
});
