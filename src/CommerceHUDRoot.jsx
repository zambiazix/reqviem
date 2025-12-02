import { createRoot } from "react-dom/client";
import React from "react";
import CommerceHUD from "./components/CommerceHUD";

// Criamos um container FIXO no body:
const container = document.createElement("div");
container.id = "commerce-hud-root";
container.style.position = "fixed";
container.style.zIndex = "9999999"; // acima de tudo
container.style.top = "0";
container.style.left = "0";
container.style.width = "100%";
container.style.height = "100%";
container.style.pointerEvents = "none"; // HUD decide quando aceitar eventos
document.body.appendChild(container);

// Criamos um root separado do React principal:
const hudRoot = createRoot(container);

// Estado global manual
let currentProps = {
  visible: false,
  isMaster: false,
  onClose: () => {},
  currentUserEmail: null,
};

// Flag global: diz se está visível
window.__commerceVisible = false;

// Atualiza HUD sem desmontar
export function updateCommerceHUD(props) {
  currentProps = { ...currentProps, ...props };
  hudRoot.render(<CommerceHUD {...currentProps} />);
}

// FECHA HUD
export function closeCommerceHUD() {
  window.__commerceVisible = false;

  updateCommerceHUD({
    visible: false,
  });

  // dispara o callback onClose se existir
  try {
    currentProps?.onClose?.();
  } catch (err) {
    console.error("Erro ao executar onClose:", err);
  }
}

// ABRE HUD
export function openCommerceHUD(extraProps = {}) {
  window.__commerceVisible = true;

  updateCommerceHUD({
    visible: true,
    ...extraProps,
  });
}

// Primeira renderização (HUD oculto)
updateCommerceHUD({});

// Expor globalmente para o FloatingHUD e botões
window.openCommerceHUD = openCommerceHUD;
window.closeCommerceHUD = closeCommerceHUD;
