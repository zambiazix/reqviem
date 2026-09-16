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

  // Refs de seleção retangular
  const isSelectingRef = useRef(false);
  const selStartRef = useRef(null);
  const selRectRef = useRef(null);
  const tokensRef = useRef([]);
  useEffect(() => { tokensRef.current = tokens; }, [tokens]);

  // Multi-drag
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

  // Arrastar/redimensionar JANELA
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

  // 🟢 Seleção retangular — listeners anexados UMA VEZ, controlados por isSelectingRef
  useEffect(() => {
    const handleMove = (e) => {
      if (!isSelectingRef.current) return;
      const stage = stageRef.current;
      const start = selStartRef.current;
      if (!stage || !start) return;

      const rect = stage.container().getBoundingClientRect();
      const pointerX = e.clientX - rect.left;
      const pointerY = e.clientY - rect.top;
      const stageX = (pointerX - stage.x()) / stage.scaleX();
      const stageY = (pointerY - stage.y()) / stage.scaleY();

      const x = Math.min(start.x, stageX);
      const y = Math.min(start.y, stageY);
      const width = Math.abs(stageX - start.x);
      const height = Math.abs(stageY - start.y);
      const newRect = { x, y, width, height };
      selRectRef.current = newRect;
      setSelectionRect(newRect);
    };

    const handleUp = (e) => {
      if (!isSelectingRef.current) return;
      isSelectingRef.current = false;

      const rect = selRectRef.current;
      if (rect && (rect.width > 5 || rect.height > 5)) {
        const ids = tokensRef.current
          .filter(
            (t) =>
              t.x < rect.x + rect.width &&
              t.x + t.width > rect.x &&
              t.y < rect.y + rect.height &&
              t.y + t.height > rect.y
          )
          .map((t) => t.id);
        if (e.shiftKey) {
          setSelectedIds((cur) => Array.from(new Set([...cur, ...ids])));
        } else {
          setSelectedIds(ids);
        }
      } else {
        if (!e.shiftKey) setSelectedIds([]);
      }

      selStartRef.current = null;
      selRectRef.current = null;
      setSelectionRect(null);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, []);

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

  const handleTokenDragStart = (tokenId) => {
    if (selectedIds.includes(tokenId) && selectedIds.length > 1) {
      const anchor = tokensRef.current.find((t) => t.id === tokenId);
      if (!anchor) return;
      multiDragRef.current = {
        anchorId: tokenId,
        anchorStart: { x: anchor.x, y: anchor.y },
        others: tokensRef.current
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
          if (t.id === tokenId) return t;
          const o = others.find((x) => x.id === t.id);
          if (o) return { ...t, x: o.x + dx, y: o.y + dy };
          return t;
        })
      );
      emitUpdate({ id: tokenId, x: pos.x, y: pos.y });
    }
  };

  const handleTokenDragEnd = (tokenId, pos) => {
    if (multiDragRef.current && multiDragRef.current.anchorId === tokenId) {
      const { anchorStart, others } = multiDragRef.current;
      const dx = pos.x - anchorStart.x;
      const dy = pos.y - anchorStart.y;
      const finalMoves = [
        { id: tokenId, x: pos.x, y: pos.y },
        ...others.map((o) => ({ id: o.id, x: o.x + dx, y: o.y + dy })),
      ];
      const movedById = Object.fromEntries(finalMoves.map((m) => [m.id, m]));

      setTokens((prev) =>
        prev.map((t) => {
          const m = movedById[t.id];
          return m ? { ...t, x: m.x, y: m.y } : t;
        })
      );
      finalMoves.forEach((m) => {
        const t = tokensRef.current.find((x) => x.id === m.id);
        if (t) socketRef.current?.emit("updateToken", { ...t, x: m.x, y: m.y });
      });
      multiDragRef.current = null;
    } else {
      const t = tokensRef.current.find((x) => x.id === tokenId);
      if (t) updateTokenFinal({ ...t, x: pos.x, y: pos.y });
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

            if (e.evt.button !== 0) return;

            const pointer = stage.getPointerPosition();
            if (!pointer) return;
            const shape = stage.getIntersection(pointer);

            // 🟢 Se o clique foi em algo do Transformer (âncora, borda ou back), sai fora.
            // Usa tanto o parent-check quanto o pattern do nome pra ser à prova de bala.
            if (shape) {
              const cls = shape.getClassName?.() || "";
              const nm = shape.name?.() || "";
              if (cls === "Transformer" || nm.includes("_anchor") || nm === "back" || nm === "border") {
                return;
              }
              let p = shape.getParent?.();
              while (p) {
                if (p.getClassName?.() === "Transformer") return;
                p = p.getParent?.();
              }
            }

            const name = shape?.name?.() || "";

            if (name.startsWith("token-")) {
              const id = Number(name.replace("token-", ""));
              if (e.evt.shiftKey) {
                setSelectedIds((cur) =>
                  cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
                );
              } else if (!selectedIds.includes(id)) {
                setSelectedIds([id]);
              }
              // Se já está na seleção, não mexe — deixa o multi-drag acontecer
            } else {
              // 🟢 Inicia seleção retangular
              isSelectingRef.current = true;
              const stageX = (pointer.x - stage.x()) / stage.scaleX();
              const stageY = (pointer.y - stage.y()) / stage.scaleY();
              selStartRef.current = { x: stageX, y: stageY };
              selRectRef.current = { x: stageX, y: stageY, width: 0, height: 0 };
              setSelectionRect({ x: stageX, y: stageY, width: 0, height: 0 });
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
                canResize={isMaster && selectedIds.length === 1 && selectedIds[0] === token.id}
                onDragStart={() => handleTokenDragStart(token.id)}
                onMoveDuring={(pos) => handleTokenDragMove(token.id, pos)}
                onDragEnd={(pos) => handleTokenDragEnd(token.id, pos)}
                onTransformEnd={(attrs) => isMaster && updateTokenFinal({ ...token, ...attrs })}
              />
            ))}
          </Layer>

          {/* RETÂNGULO DE SELEÇÃO */}
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
        <Rect
          name={`token-${token.id}`}
          width={token.width}
          height={token.height}
          fill="rgba(0,0,0,0.01)"
        />
        <KonvaImage image={image} width={token.width} height={token.height} listening={false} />
      </Group>

      {isSelected && canResize && (
        <Transformer
          ref={trRef}
          rotateEnabled={false}
          keepRatio={true}
          anchorSize={14}
          anchorStrokeWidth={2}
          anchorCornerRadius={3}
          borderStroke="#00e0ff"
          borderStrokeWidth={2}
          anchorStroke="#00e0ff"
          anchorFill="#0f172a"
          enabledAnchors={[
            "top-left", "top-center", "top-right",
            "middle-left", "middle-right",
            "bottom-left", "bottom-center", "bottom-right",
          ]}
          boundBoxFunc={(oldBox, newBox) => (newBox.width < 20 || newBox.height < 20 ? oldBox : newBox)}
        />
      )}
    </>
  );
}