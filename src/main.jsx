import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import AudioProvider from "./context/AudioProvider.jsx";
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

// 🔹 Registro do Service Worker para permitir instalação como app
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then((registration) => {
        // Força atualização imediata ao detectar uma nova versão
registration.addEventListener('updatefound', () => {
  const newWorker = registration.installing;
  newWorker.addEventListener('statechange', () => {
    // Quando o novo service worker estiver ativado, recarrega a página com cache limpo
    if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
      window.location.reload(true); // true = hard reload (ignora cache)
    }
  });
});

// Se já houver um service worker esperando (waiting), ativa-o imediatamente
if (registration.waiting) {
  registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  window.location.reload(true);
}
        console.log("✅ Service Worker registrado com sucesso:", registration);
      })
      .catch((error) => {
        console.log("❌ Falha ao registrar o Service Worker:", error);
      });
  });
}
//