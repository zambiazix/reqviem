// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import copyStatic from "./vite-plugin-copy-static.js"; // 👈 importa o plugin

export default defineConfig({
  base: "/",
  assetsInclude: ["**/*.mp3", "**/*.m4a"],

  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.ico",
        "robots.txt",
        "apple-touch-icon.png",
        "logo.png",
        "pwa-192x192.png",
        "pwa-512x512.png"
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
    copyStatic(), // 👈 garante cópia de tudo da pasta public
  ],

  build: {
    outDir: "dist",
  },
});
