import { useEffect, useRef, useState, useCallback } from "react";

export default function useFloatingWindow({
  id,
  larguraInicial = 900,
  alturaInicial = 640,
  larguraMinima = 380,
  alturaMinima = 260,
  xInicial,
  yInicial,
} = {}) {
  const [posicao, setPosicao] = useState({
    x: typeof xInicial === "number" ? xInicial : Math.max(20, window.innerWidth - larguraInicial - 40),
    y: typeof yInicial === "number" ? yInicial : 80,
  });
  const [tamanho, setTamanho] = useState({ width: larguraInicial, height: alturaInicial });
  const [minimizado, setMinimizado] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const [redimensionando, setRedimensionando] = useState(false);

  const refBox = useRef(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const idUnico = useRef(id || `flw_${Math.random().toString(36).slice(2, 8)}`).current;

  useEffect(() => {
    let rafId = null;
    const onMove = (e) => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (arrastando) {
          const nx = e.clientX - dragOffset.current.x;
          const ny = e.clientY - dragOffset.current.y;
          setPosicao({
            x: Math.min(Math.max(-tamanho.width + 200, nx), window.innerWidth - 80),
            y: Math.min(Math.max(0, ny), window.innerHeight - 60),
          });
        }
        if (redimensionando) {
          const nw = Math.max(larguraMinima, resizeStart.current.w + (e.clientX - resizeStart.current.x));
          const nh = Math.max(alturaMinima, resizeStart.current.h + (e.clientY - resizeStart.current.y));
          setTamanho({ width: nw, height: nh });
        }
      });
    };
    const onUp = () => { setArrastando(false); setRedimensionando(false); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [arrastando, redimensionando, tamanho.width, larguraMinima, alturaMinima]);

  const handleTituloMouseDown = useCallback((e) => {
    if (
      e.target.tagName === "BUTTON" ||
      e.target.closest("button") ||
      e.target.closest("svg") ||
      e.target.closest("input") ||
      e.target.closest("select") ||
      e.target.closest("a")
    ) return;
    e.preventDefault();
    setArrastando(true);
    dragOffset.current = { x: e.clientX - posicao.x, y: e.clientY - posicao.y };
  }, [posicao.x, posicao.y]);

  const handleResizeMouseDown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setRedimensionando(true);
    resizeStart.current = { x: e.clientX, y: e.clientY, w: tamanho.width, h: tamanho.height };
  }, [tamanho.width, tamanho.height]);

  const toggleMinimizado = useCallback(() => setMinimizado((v) => !v), []);

  return {
    idUnico,
    refBox,
    posicao,
    tamanho,
    minimizado,
    setMinimizado,
    toggleMinimizado,
    arrastando,
    redimensionando,
    handleTituloMouseDown,
    handleResizeMouseDown,
  };
}