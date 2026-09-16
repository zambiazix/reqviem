import React, { useState, useRef, useEffect } from "react";
import { Stage, Layer, Line, Image as KonvaImage, Transformer, Group, Rect } from "react-konva";
import useImage from "use-image";
import { createPortal } from "react-dom";
import { Box, Paper, Typography, IconButton, Button } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
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

  const [posicao, setPosicao] = useState({ x: 150, y: 80 });
  const [tamanho, setTamanho] = useState({ width: 800, height: 600 });
  const [minimizado, setMinimizado] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const [redimensionando, setRedimensionando] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

  // Auth
  useEffect(() => {
    const auth = getAuth();
    const unsub = auth.onAuthStateChanged((user) => {
      setIsMaster(user?.email === MESTRE_EMAIL);
    });
    return () => unsub();
  }, []);

  // Socket
  useEffect(() => {
    if (!visible) return;
    const s = io(serverUrl, { transports: ["websocket"] });
    socketRef.current = s;

    s.on("connect", () => console.log("🟢 Socket conectado:", s.id));
    s.on("init", (data) => setTokens(Array.isArray(data) ? data : []));
    s.on("addToken", (token) =>
      setTokens((prev) => (prev.some((t) => t.id === token.id) ? prev : [...prev, token]))
    );
    s.on("updateToken", (token) =>
      setTokens((prev) => prev.map((t) => (t.id === token.id ? token : t)))
    );
    s.on("deleteToken", (id) => {
      setTokens((prev) => prev.filter((t) => t.id !== id));
      setSelectedId((cur) => (cur === id ? null : cur));
    });
    s.on("reorder", (newTokens) => setTokens(newTokens));

    return () => {
      s.disconnect();
      socketRef.current = null;
    };
  }, [visible]);

  // Arrastar/redimensionar janela
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (arrastando)
        setPosicao({ x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y });
      if (redimensionando)
        setTamanho({
          width: Math.max(400, resizeStartRef.current.width + (e.clientX - resizeStartRef.current.x)),
          height: Math.max(300, resizeStartRef.current.height + (e.clientY - resizeStartRef.current.y)),
        });
    };
    const handleMouseUp = () => {
      setArrastando(false);
      setRedimensionando(false);
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [arrastando, redimensionando]);

  // Upload
  const handleFileUpload = async (e) => {
    if (!isMaster) return alert("Apenas o Mestre pode adicionar tokens.");
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const resp = await fetch(`${serverUrl}/upload`, { method: "POST", body: formData, mode: "cors" });
      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({ error: "Erro no servidor" }));
        throw new Error(errorData.error || "Upload falhou");
      }
      const data = await resp.json();
      if (!data?.url) throw new Error("Upload falhou");
      const tokenObj = { id: Date.now(), src: data.url, x: 100, y: 100, width: 100, height: 100 };
      socketRef.current?.emit("addToken", tokenObj);
    } catch (err) {
      console.error("Erro no upload:", err);
      alert("Erro no upload: " + (err.message || err));
    } finally {
      e.target.value = "";
    }
  };

  // Helpers
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
    if (!pointer) return;
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };
    const newScale = e.evt.deltaY > 0 ? oldScale / 1.05 : oldScale * 1.05;
    setScale(newScale);
    setStagePos({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
  };

  if (!visible) return null;

  return createPortal(
    <Paper
      elevation={10}
      onContextMenu={(e) => e.preventDefault()}
      sx={{
        position: "fixed",
        left: posicao.x,
        top: posicao.y,
        width: minimizado ? 280 : tamanho.width,
        height: minimizado ? 48 : tamanho.height,
        bgcolor: "#0f172a",
        color: "#fff",
        borderRadius: 2,
        border: "2px solid #00e0ff",
        zIndex: 9990,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxShadow: "0 8px 32px rgba(0,0,0,0.8), 0 0 20px rgba(0,224,255,0.3)",
      }}
    >
      {/* BARRA DE TÍTULO */}
      <Box
        sx={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          p: 1, bgcolor: "#1a1a2e", cursor: "move", minHeight: 40,
          borderBottom: "1px solid #334155", flexShrink: 0,
        }}
        onMouseDown={(e) => {
          if (e.target.tagName === "BUTTON" || e.target.tagName === "INPUT") return;
          e.preventDefault();
          setArrastando(true);
          dragStartRef.current = { x: e.clientX - posicao.x, y: e.clientY - posicao.y };
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
          <span style={{ fontSize: "1.3rem" }}>🗺️</span>
          <Typography variant="subtitle2" sx={{ fontWeight: "bold", color: "#00e0ff" }}>
            {minimizado ? "Grid" : "Grid de Batalha"}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 0.5, alignItems: "center", flexShrink: 0 }}>
          {!minimizado && (
            <>
              <IconButton size="small" onClick={() => setScale((s) => Math.min(2, s + 0.1))} sx={{ color: "#94a3b8", p: 0.5 }}>
                <AddIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={() => setScale((s) => Math.max(0.5, s - 0.1))} sx={{ color: "#94a3b8", p: 0.5 }}>
                <RemoveIcon fontSize="small" />
              </IconButton>
              {isMaster && (
                <>
                  <Button
                    size="small" startIcon={<AddIcon />}
                    onClick={() => fileInputRef.current?.click()}
                    sx={{ minWidth: "auto", px: 1, fontSize: "0.6rem", bgcolor: "#22c55e", color: "#fff", "&:hover": { bgcolor: "#16a34a" } }}
                  >
                    Token
                  </Button>
                  <input type="file" ref={fileInputRef} style={{ display: "none" }} accept="image/*" onChange={handleFileUpload} />
                  {selectedId && (
                    <>
                      <IconButton size="small" onClick={bringForward} sx={{ color: "#00e0ff", p: 0.5 }} title="Trazer para frente">
                        <ArrowUpwardIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={sendBackward} sx={{ color: "#00e0ff", p: 0.5 }} title="Enviar para trás">
                        <ArrowDownwardIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={deleteToken} sx={{ color: "#ef4444", p: 0.5 }} title="Excluir">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </>
                  )}
                </>
              )}
            </>
          )}
          <IconButton size="small" onClick={() => setMinimizado(!minimizado)} sx={{ color: "#00e0ff", p: 0.5 }} title={minimizado ? "Expandir" : "Minimizar"}>
            {minimizado ? "□" : "−"}
          </IconButton>
          <IconButton size="small" onClick={onClose} sx={{ color: "#ef4444", p: 0.5 }} title="Fechar">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* CONTAINER DO STAGE — sempre montado, só escondido quando minimizado */}
      <Box
        sx={{
          flex: 1, position: "relative", bgcolor: "#1a1a2e", overflow: "hidden",
          ...(minimizado
            ? { position: "absolute", top: -99999, left: -99999, width: tamanho.width, height: tamanho.height - 40 }
            : {}),
        }}
      >
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
            const stage = stageRef.current;
            if (!stage) return;

            // Botão direito = pan
            if (e.evt.button === 2) {
              e.evt.preventDefault();
              stage.draggable(true);
              stage.startDrag();
              setSelectedId(null);
              return;
            }

            // Botão esquerdo = selecionar ou deselecionar
            if (e.evt.button === 0) {
              const pointer = stage.getPointerPosition();
              if (!pointer) return;
              const shape = stage.getIntersection(pointer);
              const name = shape?.name?.() || "";

              console.log("[Stage] clique | shape:", name || "(vazio)");

              if (name.startsWith("token-")) {
                const id = Number(name.replace("token-", ""));
                console.log("[Stage] → selecionando token:", id);
                setSelectedId(id);
              } else if (!shape) {
                console.log("[Stage] → clique no vazio");
                setSelectedId(null);
              }
              // Se clicou no Transformer ou outra coisa, não faz nada
            }
          }}
          onMouseUp={() => {
            const stage = stageRef.current;
            if (stage?.draggable()) {
              stage.stopDrag();
              stage.draggable(false);
              setStagePos({ x: stage.x(), y: stage.y() });
            }
          }}
        >
          {/* GRID (embaixo, sem capturar eventos) */}
          <Layer listening={false}>
            {Array.from({ length: 100 }).map((_, i) => (
              <Line key={`v-${i}`} points={[i * GRID_SIZE - 2500, -2500, i * GRID_SIZE - 2500, 2500]} stroke="#555" strokeWidth={1} />
            ))}
            {Array.from({ length: 100 }).map((_, i) => (
              <Line key={`h-${i}`} points={[-2500, i * GRID_SIZE - 2500, 2500, i * GRID_SIZE - 2500]} stroke="#555" strokeWidth={1} />
            ))}
          </Layer>

          {/* TOKENS (por cima) */}
          <Layer>
            {tokens.map((token) => (
              <Token
                key={token.id}
                token={token}
                isSelected={selectedId === token.id}
                canResize={isMaster}
                onMoveDuring={(attrs) => emitUpdate({ ...token, ...attrs })}
                onDragEnd={(attrs) => updateTokenFinal({ ...token, ...attrs })}
                onTransformEnd={(attrs) => isMaster && updateTokenFinal({ ...token, ...attrs })}
              />
            ))}
          </Layer>
        </Stage>
      </Box>

      {/* Handle de redimensionar janela */}
      {!minimizado && (
        <Box
          sx={{ position: "absolute", bottom: 0, right: 0, width: 16, height: 16, cursor: "nwse-resize", zIndex: 10 }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setRedimensionando(true);
            resizeStartRef.current = { x: e.clientX, y: e.clientY, width: tamanho.width, height: tamanho.height };
          }}
        />
      )}
    </Paper>,
    document.body
  );
}

// ============================================================
// TOKEN — Rect + Image dentro de um Group
// ============================================================
function Token({ token, isSelected, onMoveDuring, onDragEnd, onTransformEnd, canResize }) {
  const [image] = useImage(token.src, "anonymous");
  const groupRef = useRef();
  const trRef = useRef();

  // Anexa o Transformer ao Group quando selecionado
  useEffect(() => {
    if (!isSelected) return;
    if (!trRef.current || !groupRef.current) return;
    trRef.current.nodes([groupRef.current]);
    trRef.current.getLayer()?.batchDraw();
  }, [isSelected, image]);

  if (!image) return null;

  return (
    <>
      <Group
        ref={groupRef}
        x={token.x}
        y={token.y}
        draggable
        onDragMove={(e) => onMoveDuring?.({ x: e.target.x(), y: e.target.y() })}
        onDragEnd={(e) => onDragEnd?.({ x: e.target.x(), y: e.target.y() })}
        onTransformEnd={() => {
          if (!canResize) return;
          const node = groupRef.current;
          if (!node) return;
          const newAttrs = {
            x: node.x(),
            y: node.y(),
            width: Math.max(20, token.width * node.scaleX()),
            height: Math.max(20, token.height * node.scaleY()),
          };
          node.scaleX(1);
          node.scaleY(1);
          onTransformEnd?.(newAttrs);
        }}
      >
        {/* Rect transparente — é ele que recebe o clique e o drag */}
        <Rect
          name={`token-${token.id}`}
          width={token.width}
          height={token.height}
          fill="rgba(0,0,0,0.01)"
        />
        {/* Imagem só visual */}
        <KonvaImage
          image={image}
          width={token.width}
          height={token.height}
          listening={false}
        />
      </Group>

      {isSelected && (
        <Transformer
          ref={trRef}
          rotateEnabled={false}
          keepRatio={false}
          anchorSize={12}
          borderStroke="#00e0ff"
          anchorStroke="#00e0ff"
          anchorFill="#0f172a"
          enabledAnchors={canResize ? undefined : []}
          boundBoxFunc={(oldBox, newBox) => (newBox.width < 20 || newBox.height < 20 ? oldBox : newBox)}
        />
      )}
    </>
  );
}