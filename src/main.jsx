import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { AudioProvider } from "./context/AudioProvider.jsx";
import VoiceProvider from "./context/VoiceProvider.jsx";

// 🔹 Renderização principal
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AudioProvider>
      <VoiceProvider>
        <App />
      </VoiceProvider>
    </AudioProvider>
  </React.StrictMode>
);

// 🔹 Registro do Service Worker (reload único por sessão de aba)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then((registration) => {
        // 🟢 Só recarrega UMA VEZ por sessão de aba
        const RELOAD_KEY = "__sw_reload_done__";
        if (sessionStorage.getItem(RELOAD_KEY)) {
          console.log("✅ Service Worker já registrado nesta sessão.");
          return;
        }

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "activated" && navigator.serviceWorker.controller) {
              sessionStorage.setItem(RELOAD_KEY, "1");
              console.log("🔄 Nova versão detectada — recarregando uma vez.");
              // Reload limpo: só reescreve a URL com cache-buster
              const url = new URL(window.location.href);
              url.searchParams.set("_v", Date.now());
              window.location.replace(url.toString());
            }
          });
        });

        // Se já houver SW esperando, ativa e recarrega UMA VEZ
        if (registration.waiting) {
          sessionStorage.setItem(RELOAD_KEY, "1");
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
          const url = new URL(window.location.href);
          url.searchParams.set("_v", Date.now());
          window.location.replace(url.toString());
        }

        console.log("✅ Service Worker registrado:", registration);
      })
      .catch((error) => {
        console.log("❌ Falha ao registrar o Service Worker:", error);
      });
  });
}