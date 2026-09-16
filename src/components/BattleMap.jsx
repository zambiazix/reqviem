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
import ClearAllIcon from "@mui/icons-material/ClearAll";
import { io } from "socket.io-client";
import { getAuth } from "firebase/auth";

const GRID_SIZE = 50;
const MESTRE_EMAIL = "mestre@reqviemrpg.com";
const serverUrl = "https://reqviem.onrender.com";

export default function BattleMap({ visible = false, onClose = () => {} }) {
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [tokens, setTokens] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isMaster, setIsMaster] = useState(false);
  const [selectionRect, setSelectionRect] = useState(null);

  const fileInputRef = useRef();
  const stageRef = useRef();
  const socketRef = useRef(null);
  const lastEmitRef = useRef(0);
  const selStartRef = useRef(null);
  const multiDragRef = useRef(null);

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
      setSelectedIds((cur) => cur.filter((sid) => sid !== id));
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
    if (!selectedIds.length || !isMaster) return;
    setTokens((prev) => {
      const id = selectedIds[0];
      const idx = prev.findIndex((t) => t.id === id);
      if (idx < 0 || idx >= prev.length - 1) return prev;
      const arr = [...prev];
      const [item] = arr.splice(idx, 1);
      arr.splice(idx + 1, 0, item);
      socketRef.current?.emit("reorder", arr);
      return arr;
    });
  };

  const sendBackward = () => {
    if (!selectedIds.length || !isMaster) return;
    setTokens((prev) => {
      const id = selectedIds[0];
      const idx = prev.findIndex((t) => t.id === id);
      if (idx <= 0) return prev;
      const arr = [...prev];
      const [item] = arr.splice(idx, 1);
      arr.splice(idx - 1, 0, item);
      socketRef.current?.emit("reorder", arr);
      return arr;
    });
  };

  const deleteSelected = () => {
    if (!selectedIds.length || !isMaster) return;
    selectedIds.forEach((id) => socketRef.current?.emit("deleteToken", id));
    setSelectedIds([]);
  };

  // 🟢 NOVO: apagar tudo
  const clearAll = () => {
    if (!isMaster) return;
    if (!tokens.length) {
      alert("Não há nenhum token no grid.");
      return;
    }
    if (!window.confirm(`Apagar TODOS os ${tokens.length} tokens do grid? Essa ação é irreversível.`)) return;
    tokens.forEach((t) => socketRef.current?.emit("deleteToken", t.id));
    setTokens([]);
    setSelectedIds([]);
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

  // 🟢 NOVO: drag de múltiplos tokens juntos
  const handleTokenDragStart = (tokenId) => {
    if (selectedIds.includes(tokenId) && selectedIds.length > 1) {
      const anchor = tokens.find((t) => t.id === tokenId);
      if (!anchor) return;
      multiDragRef.current = {
        anchorId: tokenId,
        anchorStart: { x: anchor.x, y: anchor.y },
        others: tokens
          .filter((t) => selectedIds.includes(t.id) && t.id !== tokenId)
          .map((t) => ({ id: t.id, x: t.x, y: t.y })),
      };
    } else {
      multiDragRef.current = null;
    }
  };

  const handleTokenDragMove = (tokenId, pos) => {
    if (multiDragRef.current && multiDragRef.current.anchorId === tokenId) {
      const { anchorStart, others } = multiDragRef.current;
      const dx = pos.x - anchorStart.x;
      const dy = pos.y - anchorStart.y;
      setTokens((prev) =>
        prev.map((t) => {
          if (t.id === tokenId) return { ...t, x: pos.x, y: pos.y };
          const other = others.find((o) => o.id === t.id);
          if (other) return { ...t, x: other.x + dx, y: other.y + dy };
          return t;
        })
      );
      // Emite só o anchor durante o drag (throttled)
      const anchorTok = tokens.find((t) => t.id === tokenId);
      if (anchorTok) emitUpdate({ ...anchorTok, x: pos.x, y: pos.y });
    } else {
      const tk = tokens.find((t) => t.id === tokenId);
      if (tk) emitUpdate({ ...tk, x: pos.x, y: pos.y });
    }
  };

  const handleTokenDragEnd = (tokenId, pos) => {
    if (multiDragRef.current && multiDragRef.current.anchorId === tokenId) {
      const { anchorStart, others } = multiDragRef.current;
      const dx = pos.x - anchorStart.x;
      const dy = pos.y - anchorStart.y;
      const finalMoved = [
        { id: tokenId, x: pos.x, y: pos.y },
        ...others.map((o) => ({ id: o.id, x: o.x + dx, y: o.y + dy })),
      ];
      setTokens((prev) =>
        prev.map((t) => {
          const m = finalMoved.find((fm) => fm.id === t.id);
          return m ? { ...t, x: m.x, y: m.y } : t;
        })
      );
      // Emite update para todos os que moveram
      finalMoved.forEach((m) => {
        const tk = tokens.find((t) => t.id === m.id);
        if (tk) socketRef.current?.emit("updateToken", { ...tk, x: m.x, y: m.y });
      });
      multiDragRef.current = null;
    } else {
      const tk = tokens.find((t) => t.id === tokenId);
      if (tk) updateTokenFinal({ ...tk, x: pos.x, y: pos.y });
    }
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
                  {/* 🟢 NOVO: botão Limpar tudo */}
                  <Button
                    size="small" startIcon={<ClearAllIcon />}
                    onClick={clearAll}
                    title="Apagar tudo do grid"
                    sx={{ minWidth: "auto", px: 1, fontSize: "0.6rem", bgcolor: "#dc2626", color: "#fff", "&:hover": { bgcolor: "#b91c1c" } }}
                  >
                    Limpar
                  </Button>
                  <input type="file" ref={fileInputRef} style={{ display: "none" }} accept="image/*" onChange={handleFileUpload} />
                  {selectedIds.length > 0 && (
                    <>
                      <IconButton size="small" onClick={bringForward} sx={{ color: "#00e0ff", p: 0.5 }} title="Trazer para frente">
                        <ArrowUpwardIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={sendBackward} sx={{ color: "#00e0ff", p: 0.5 }} title="Enviar para trás">
                        <ArrowDownwardIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={deleteSelected} sx={{ color: "#ef4444", p: 0.5 }} title="Excluir selecionados">
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

      {/* CONTAINER DO STAGE */}
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
              setSelectedIds([]);
              return;
            }

            // Botão esquerdo
            if (e.evt.button === 0) {
              const pointer = stage.getPointerPosition();
              if (!pointer) return;
              const shape = stage.getIntersection(pointer);
              const name = shape?.name?.() || "";

              if (name.startsWith("token-")) {
                const id = Number(name.replace("token-", ""));
                if (e.evt.shiftKey) {
                  setSelectedIds((cur) =>
                    cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
                  );
                } else {
                  setSelectedIds((cur) => (cur.includes(id) ? cur : [id]));
                }
              } else if (!shape || shape === stage) {
                // 🟢 Inicia seleção retangular no vazio
                const stageX = (pointer.x - stage.x()) / stage.scaleX();
                const stageY = (pointer.y - stage.y()) / stage.scaleY();
                selStartRef.current = { x: stageX, y: stageY };
                setSelectionRect({ x: stageX, y: stageY, width: 0, height: 0 });
                if (!e.evt.shiftKey) setSelectedIds([]);
              }
            }
          }}
          onMouseMove={(e) => {
            if (!selStartRef.current) return;
            const stage = stageRef.current;
            if (!stage) return;
            const pointer = stage.getPointerPosition();
            if (!pointer) return;
            const stageX = (pointer.x - stage.x()) / stage.scaleX();
            const stageY = (pointer.y - stage.y()) / stage.scaleY();
            const x = Math.min(selStartRef.current.x, stageX);
            const y = Math.min(selStartRef.current.y, stageY);
            const width = Math.abs(stageX - selStartRef.current.x);
            const height = Math.abs(stageY - selStartRef.current.y);
            setSelectionRect({ x, y, width, height });
          }}
          onMouseUp={(e) => {
            const stage = stageRef.current;
            if (!stage) return;

            // Finaliza seleção retangular
            if (selStartRef.current) {
              const rect = selectionRect;
              if (rect && (rect.width > 5 || rect.height > 5)) {
                const ids = tokens
                  .filter(
                    (t) =>
                      t.x < rect.x + rect.width &&
                      t.x + t.width > rect.x &&
                      t.y < rect.y + rect.height &&
                      t.y + t.height > rect.y
                  )
                  .map((t) => t.id);
                if (e.evt.shiftKey) {
                  setSelectedIds((cur) => Array.from(new Set([...cur, ...ids])));
                } else {
                  setSelectedIds(ids);
                }
              }
              selStartRef.current = null;
              setSelectionRect(null);
            }

            if (stage.draggable()) {
              stage.stopDrag();
              stage.draggable(false);
              setStagePos({ x: stage.x(), y: stage.y() });
            }
          }}
        >
          {/* GRID */}
          <Layer listening={false}>
            {Array.from({ length: 100 }).map((_, i) => (
              <Line key={`v-${i}`} points={[i * GRID_SIZE - 2500, -2500, i * GRID_SIZE - 2500, 2500]} stroke="#555" strokeWidth={1} />
            ))}
            {Array.from({ length: 100 }).map((_, i) => (
              <Line key={`h-${i}`} points={[-2500, i * GRID_SIZE - 2500, 2500, i * GRID_SIZE - 2500]} stroke="#555" strokeWidth={1} />
            ))}
          </Layer>

          {/* TOKENS */}
          <Layer>
            {tokens.map((token) => (
              <Token
                key={token.id}
                token={token}
                isSelected={selectedIds.includes(token.id)}
                canResize={isMaster && selectedIds.length === 1}
                onDragStart={() => handleTokenDragStart(token.id)}
                onMoveDuring={(pos) => handleTokenDragMove(token.id, pos)}
                onDragEnd={(pos) => handleTokenDragEnd(token.id, pos)}
                onTransformEnd={(attrs) => isMaster && updateTokenFinal({ ...token, ...attrs })}
              />
            ))}
          </Layer>

          {/* 🟢 RETÂNGULO DE SELEÇÃO */}
          {selectionRect && (
            <Layer listening={false}>
              <Rect
                x={selectionRect.x}
                y={selectionRect.y}
                width={selectionRect.width}
                height={selectionRect.height}
                fill="rgba(0, 224, 255, 0.15)"
                stroke="#00e0ff"
                strokeWidth={1 / scale}
                dash={[6 / scale, 4 / scale]}
              />
            </Layer>
          )}
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
// TOKEN
// ============================================================
function Token({ token, isSelected, canResize, onDragStart, onMoveDuring, onDragEnd, onTransformEnd }) {
  const [image] = useImage(token.src, "anonymous");
  const groupRef = useRef();
  const trRef = useRef();

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
        onDragStart={onDragStart}
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
        {/* Rect: recebe clique/drag. Borda ciano quando selecionado (visual p/ multi-select) */}
        <Rect
          name={`token-${token.id}`}
          width={token.width}
          height={token.height}
          fill="rgba(0,0,0,0.01)"
          stroke={isSelected && !canResize ? "#00e0ff" : undefined}
          strokeWidth={isSelected && !canResize ? 2 : 0}
        />
        <KonvaImage image={image} width={token.width} height={token.height} listening={false} />
      </Group>

      {isSelected && canResize && (
        <Transformer
          ref={trRef}
          rotateEnabled={false}
          keepRatio={false}
          anchorSize={12}
          borderStroke="#00e0ff"
          anchorStroke="#00e0ff"
          anchorFill="#0f172a"
          boundBoxFunc={(oldBox, newBox) => (newBox.width < 20 || newBox.height < 20 ? oldBox : newBox)}
        />
      )}
    </>
  );
}