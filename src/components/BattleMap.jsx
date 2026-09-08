import React, { useState, useRef, useEffect } from "react";
import { Stage, Layer, Line, Image as KonvaImage, Transformer } from "react-konva";
import useImage from "use-image";
import { createPortal } from "react-dom";
import { Box, Paper, Typography, IconButton, Button } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import MinimizeIcon from "@mui/icons-material/Minimize";
import AddIcon from "@mui/icons-material/Add";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import DeleteIcon from "@mui/icons-material/Delete";
import { io } from "socket.io-client";
import { getAuth } from "firebase/auth";

const GRID_SIZE = 50;
const MESTRE_EMAIL = "mestre@reqviemrpg.com";
const serverUrl = "https://reqviem.onrender.com";

export default function BattleMap({ visible = false, onClose = () => {} }) {
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [tokens, setTokens] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [isMaster, setIsMaster] = useState(false);
  const fileInputRef = useRef();
  const stageRef = useRef();
  const socketRef = useRef(null);
  const lastEmitRef = useRef(0);
  
  // 🟢 Estados da janela flutuante
  const [posicao, setPosicao] = useState({ x: 150, y: 80 });
  const [tamanho, setTamanho] = useState({ width: 800, height: 600 });
  const [minimizado, setMinimizado] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const [redimensionando, setRedimensionando] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  useEffect(() => {
  // Quando maximizar, verifica se o token ainda existe
  if (!minimizado && selectedId) {
    const tokenExiste = tokens.some(t => t.id === selectedId);
    if (!tokenExiste) {
      setSelectedId(null);
    }
  }
}, [minimizado, tokens, selectedId]);

  useEffect(() => {
    const auth = getAuth();
    const unsub = auth.onAuthStateChanged((user) => {
      setIsMaster(user?.email === MESTRE_EMAIL);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const s = io(serverUrl, { transports: ["websocket"] });
    socketRef.current = s;

    s.on("connect", () => console.log("🟢 Socket conectado:", s.id));
    s.on("init", (data) => setTokens(data || []));
    s.on("addToken", (token) => setTokens((prev) => prev.some((t) => t.id === token.id) ? prev : [...prev, token]));
    s.on("updateToken", (token) => setTokens((prev) => prev.map((t) => (t.id === token.id ? token : t))));
    s.on("deleteToken", (id) => {
      setTokens((prev) => prev.filter((t) => t.id !== id));
      if (selectedId === id) setSelectedId(null);
    });
    s.on("reorder", (newTokens) => setTokens(newTokens));

    return () => {
      s.disconnect();
      socketRef.current = null;
    };
  }, [visible]);

  // 🟢 Arrastar e redimensionar janela
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (arrastando) setPosicao({ x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y });
      if (redimensionando) setTamanho({ 
        width: Math.max(400, resizeStartRef.current.width + (e.clientX - resizeStartRef.current.x)),
        height: Math.max(300, resizeStartRef.current.height + (e.clientY - resizeStartRef.current.y))
      });
    };
    const handleMouseUp = () => { setArrastando(false); setRedimensionando(false); };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => { window.removeEventListener("mousemove", handleMouseMove); window.removeEventListener("mouseup", handleMouseUp); };
  }, [arrastando, redimensionando]);

  const handleFileUpload = async (e) => {
    if (!isMaster) return alert("Apenas o Mestre pode adicionar tokens.");
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const resp = await fetch(`${serverUrl}/upload`, { 
        method: "POST",
        body: formData,
        mode: 'cors',
      });
      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({ error: "Erro no servidor" }));
        throw new Error(errorData.error || 'Upload falhou');
      }
      const data = await resp.json();
      if (!data?.url) throw new Error("Upload falhou");
      const tokenObj = { id: Date.now(), src: data.url, x: 100, y: 100, width: 100, height: 100 };
      socketRef.current?.emit("addToken", tokenObj);
    } catch (err) {
      console.error("Erro no upload:", err);
      alert("Erro no upload: " + (err.message || err));
    }
  };

  const emitUpdate = (token) => {
    const now = Date.now();
    if (now - lastEmitRef.current > 60) {
      lastEmitRef.current = now;
      socketRef.current?.emit("updateToken", token);
    }
  };

  const updateTokenFinal = (token) => {
    setTokens((prev) => prev.map((t) => (t.id === token.id ? token : t)));
    socketRef.current?.emit("updateToken", token);
  };

  const bringForward = () => {
    if (!selectedId || !isMaster) return;
    setTokens((prev) => {
      const idx = prev.findIndex((t) => t.id === selectedId);
      if (idx < 0 || idx >= prev.length - 1) return prev;
      const arr = [...prev];
      const [item] = arr.splice(idx, 1);
      arr.splice(idx + 1, 0, item);
      socketRef.current?.emit("reorder", arr);
      return arr;
    });
  };

  const sendBackward = () => {
    if (!selectedId || !isMaster) return;
    setTokens((prev) => {
      const idx = prev.findIndex((t) => t.id === selectedId);
      if (idx <= 0) return prev;
      const arr = [...prev];
      const [item] = arr.splice(idx, 1);
      arr.splice(idx - 1, 0, item);
      socketRef.current?.emit("reorder", arr);
      return arr;
    });
  };

  const deleteToken = () => {
    if (!selectedId || !isMaster) return;
    socketRef.current?.emit("deleteToken", selectedId);
    setSelectedId(null);
  };

  const handleWheel = (e) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    const mousePointTo = { x: (pointer.x - stage.x()) / oldScale, y: (pointer.y - stage.y()) / oldScale };
    const newScale = e.evt.deltaY > 0 ? oldScale / 1.05 : oldScale * 1.05;
    setScale(newScale);
    setStagePos({ x: pointer.x - mousePointTo.x * newScale, y: pointer.y - mousePointTo.y * newScale });
  };

  if (!visible) return null;

  return createPortal(
    <Paper elevation={10} onContextMenu={(e) => e.preventDefault()} sx={{
      position: "fixed", left: posicao.x, top: posicao.y,
      width: minimizado ? 280 : tamanho.width,
      height: minimizado ? 48 : tamanho.height,
      bgcolor: "#0f172a", color: "#fff", borderRadius: 2,
      border: "2px solid #00e0ff", zIndex: 9990,
      display: "flex", flexDirection: "column", overflow: "hidden",
      boxShadow: "0 8px 32px rgba(0,0,0,0.8), 0 0 20px rgba(0,224,255,0.3)",
    }}>
      {/* BARRA DE TÍTULO */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 1, bgcolor: "#1a1a2e", cursor: "move", minHeight: 40, borderBottom: "1px solid #334155", flexShrink: 0 }}
        onMouseDown={(e) => { if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return; e.preventDefault(); setArrastando(true); dragStartRef.current = { x: e.clientX - posicao.x, y: e.clientY - posicao.y }; }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <span style={{ fontSize: '1.3rem' }}>🗺️</span>
          <Typography variant="subtitle2" sx={{ fontWeight: "bold", color: "#00e0ff" }}>
            {minimizado ? "Grid" : "Grid de Batalha"}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 0.5 }}>
          {isMaster && (
            <>
              <Button size="small" startIcon={<AddIcon />} onClick={() => fileInputRef.current?.click()} sx={{ minWidth: 'auto', px: 1, fontSize: '0.6rem', bgcolor: '#22c55e', color: '#fff', '&:hover': { bgcolor: '#16a34a' } }}>
                Token
              </Button>
              <input type="file" ref={fileInputRef} style={{ display: "none" }} accept="image/*" onChange={handleFileUpload} />
              {selectedId && (
                <>
                  <IconButton size="small" onClick={bringForward} sx={{ color: '#00e0ff', p: 0.5 }}><ArrowUpwardIcon fontSize="small" /></IconButton>
                  <IconButton size="small" onClick={sendBackward} sx={{ color: '#00e0ff', p: 0.5 }}><ArrowDownwardIcon fontSize="small" /></IconButton>
                  <IconButton size="small" onClick={deleteToken} sx={{ color: '#ef4444', p: 0.5 }}><DeleteIcon fontSize="small" /></IconButton>
                </>
              )}
            </>
          )}
          <IconButton size="small" onClick={() => setMinimizado(!minimizado)} sx={{ color: "#94a3b8", p: 0.5 }}>{minimizado ? "□" : "−"}</IconButton>
          <IconButton size="small" onClick={onClose} sx={{ color: "#ef4444", p: 0.5 }}><CloseIcon fontSize="small" /></IconButton>
        </Box>
      </Box>

      {!minimizado && (
        <Box sx={{ flex: 1, position: 'relative', bgcolor: '#1a1a2e' }}>
          <Stage
            ref={stageRef}
            width={tamanho.width}
            height={tamanho.height - 40}
            x={stagePos.x}
            y={stagePos.y}
            scaleX={scale}
            scaleY={scale}
            onWheel={handleWheel}
            onMouseDown={(e) => {
              if (e.evt.button === 2 && e.target === stageRef.current) {
                e.evt.preventDefault();
                stageRef.current.draggable(true);
                stageRef.current.startDrag();
                setSelectedId(null);
              }
              if (e.evt.button === 0 && e.target === stageRef.current) setSelectedId(null);
            }}
            onMouseUp={() => {
              if (stageRef.current?.draggable()) {
                stageRef.current.stopDrag();
                stageRef.current.draggable(false);
                setStagePos({ x: stageRef.current.x(), y: stageRef.current.y() });
              }
            }}
          >
            <Layer>
{tokens.map((token) => (
  <Token key={token.id} 
    token={token} 
    isSelected={selectedId === token.id} // 🟢 QUALQUER UM SELECIONA
    onSelect={() => setSelectedId(token.id)} // 🟢 QUALQUER UM SELECIONA
    canResize={isMaster} // 🟢 SÓ MESTRE REDIMENSIONA
    onMoveDuring={(attrs) => emitUpdate({ ...token, ...attrs })}
    onDragEnd={(attrs) => updateTokenFinal({ ...token, ...attrs })}
    onTransformEnd={(attrs) => isMaster && updateTokenFinal({ ...token, ...attrs })} // 🟢 SÓ MESTRE
  />
))}
            </Layer>
            <Layer>
              {Array.from({ length: 100 }).map((_, i) => (
                <Line key={`v-${i}`} points={[i * GRID_SIZE - 2500, -2500, i * GRID_SIZE - 2500, 2500]} stroke="#555" strokeWidth={1} />
              ))}
              {Array.from({ length: 100 }).map((_, i) => (
                <Line key={`h-${i}`} points={[-2500, i * GRID_SIZE - 2500, 2500, i * GRID_SIZE - 2500]} stroke="#555" strokeWidth={1} />
              ))}
            </Layer>
          </Stage>
        </Box>
      )}

      {!minimizado && (
        <Box sx={{ position: "absolute", bottom: 0, right: 0, width: 16, height: 16, cursor: "nwse-resize", zIndex: 10 }}
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setRedimensionando(true); resizeStartRef.current = { x: e.clientX, y: e.clientY, width: tamanho.width, height: tamanho.height }; }} />
      )}
    </Paper>,
    document.body
  );
}

function Token({ token, isSelected, onSelect, onMoveDuring, onDragEnd, onTransformEnd, canResize }) {
  const [image] = useImage(token.src, "anonymous");
  const shapeRef = useRef();
  const trRef = useRef();

useEffect(() => {
  if (isSelected && trRef.current && shapeRef.current) {
    trRef.current.nodes([shapeRef.current]);
    trRef.current.getLayer().batchDraw();
  }
}, [isSelected, token.id]); // 🟢 ADICIONOU token.id AQUI!

  if (!image) return null;

  return (
    <>
      <KonvaImage
        image={image}
        x={token.x}
        y={token.y}
        width={token.width}
        height={token.height}
        draggable={true} // 🟢 QUALQUER UM ARRASTA
        onClick={onSelect}
        ref={shapeRef}
        onDragMove={(e) => onMoveDuring?.({ x: e.target.x(), y: e.target.y() })}
        onDragEnd={(e) => onDragEnd?.({ x: e.target.x(), y: e.target.y() })}
        onTransformEnd={() => {
          if (!canResize) return; // 🟢 SÓ MESTRE REDIMENSIONA
          const node = shapeRef.current;
          const newAttrs = { x: node.x(), y: node.y(), width: node.width() * node.scaleX(), height: node.height() * node.scaleY() };
          node.scaleX(1);
          node.scaleY(1);
          onTransformEnd?.(newAttrs);
        }}
      />
      {isSelected && <Transformer ref={trRef} />} {/* 🟢 TODOS VEEM A CAIXINHA */}
    </>
  );
}