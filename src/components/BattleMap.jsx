// src/components/BattleMap.jsx
import React, { useState, useRef, useEffect } from "react";
import { Stage, Layer, Line, Image as KonvaImage, Transformer, Group, Rect } from "react-konva";
import useImage from "use-image";
import { createPortal } from "react-dom";
import {
  Box, Paper, Typography, IconButton, Button,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem, Grid, Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import DeleteIcon from "@mui/icons-material/Delete";
import ClearAllIcon from "@mui/icons-material/ClearAll";
import CreateNewFolderIcon from "@mui/icons-material/CreateNewFolder";
import EditIcon from "@mui/icons-material/Edit";
import DriveFileMoveIcon from "@mui/icons-material/DriveFileMove";
import CollectionsIcon from "@mui/icons-material/Collections";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { io } from "socket.io-client";
import { getAuth } from "firebase/auth";
import { db } from "../firebaseConfig";
import { doc, setDoc, onSnapshot } from "firebase/firestore";

const GRID_SIZE = 50;
const MESTRE_EMAIL = "mestre@reqviemrpg.com";
const serverUrl = "https://reqviem.onrender.com";
const IMGBB_API_KEY = "73fcf242ce0108665fa0c9e9de33bd50";
const PASTA_TODAS = "__todas__";

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

  // ============================================================
  // GALERIA DE TOKENS
  // ============================================================
  const [galeriaOpen, setGaleriaOpen] = useState(false);
  const [galeriaPastas, setGaleriaPastas] = useState([]);
  const [pastaAtualId, setPastaAtualId] = useState(PASTA_TODAS);
  const [novaPastaNome, setNovaPastaNome] = useState("");
  const [editandoNomePasta, setEditandoNomePasta] = useState({ id: null, nome: "" });
  const [editandoNomeImagem, setEditandoNomeImagem] = useState({ pastaId: null, imagemId: null, nome: "" });
  const [moverImagemDialog, setMoverImagemDialog] = useState(null); // { pastaId, imagemId, nome }
  const [moverDestino, setMoverDestino] = useState("");
  const [galeriaLightbox, setGaleriaLightbox] = useState(null); // { src, nome }
  const [galeriaZoom, setGaleriaZoom] = useState(1);
  const [salvarTokenDialog, setSalvarTokenDialog] = useState(null); // { token, pastaId, nome }

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

  // 🟢 GALERIA — sincroniza com Firestore em tempo real
  useEffect(() => {
    if (!visible) return;
    const ref = doc(db, "battle_tokens_galeria", "dados");
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const dados = snap.data();
          setGaleriaPastas(Array.isArray(dados.pastas) ? dados.pastas : []);
        } else {
          setGaleriaPastas([]);
        }
      },
      (err) => console.warn("Erro ao carregar galeria:", err)
    );
    return () => unsub();
  }, [visible]);

  const salvarGaleriaFirestore = async (novasPastas) => {
    try {
      await setDoc(
        doc(db, "battle_tokens_galeria", "dados"),
        { pastas: novasPastas },
        { merge: true }
      );
    } catch (err) {
      console.error("Erro ao salvar galeria:", err);
      alert("Erro ao salvar galeria: " + err.message);
    }
  };

  const criarPasta = async () => {
    if (!novaPastaNome.trim()) return;
    const nova = { id: `p_${Date.now()}`, nome: novaPastaNome.trim(), imagens: [] };
    const novasPastas = [...galeriaPastas, nova];
    setGaleriaPastas(novasPastas);
    setNovaPastaNome("");
    await salvarGaleriaFirestore(novasPastas);
  };

  const deletarPasta = async (id) => {
    const pasta = galeriaPastas.find((p) => p.id === id);
    if (!pasta) return;
    if (!window.confirm(`Deletar a pasta "${pasta.nome}" e TODAS as ${pasta.imagens?.length || 0} imagens dentro?`)) return;
    const novasPastas = galeriaPastas.filter((p) => p.id !== id);
    setGaleriaPastas(novasPastas);
    if (pastaAtualId === id) setPastaAtualId(PASTA_TODAS);
    await salvarGaleriaFirestore(novasPastas);
  };

  const renomearPasta = async (id, novoNome) => {
    if (!novoNome.trim()) return;
    const novasPastas = galeriaPastas.map((p) => (p.id === id ? { ...p, nome: novoNome.trim() } : p));
    setGaleriaPastas(novasPastas);
    setEditandoNomePasta({ id: null, nome: "" });
    await salvarGaleriaFirestore(novasPastas);
  };

  const renomearImagemGaleria = async (pastaId, imagemId, novoNome) => {
    if (!novoNome.trim()) return;
    const novasPastas = galeriaPastas.map((p) =>
      p.id === pastaId
        ? { ...p, imagens: p.imagens.map((i) => (i.id === imagemId ? { ...i, nome: novoNome.trim() } : i)) }
        : p
    );
    setGaleriaPastas(novasPastas);
    setEditandoNomeImagem({ pastaId: null, imagemId: null, nome: "" });
    await salvarGaleriaFirestore(novasPastas);
  };

  const deletarImagemGaleria = async (pastaId, imagemId) => {
    if (!window.confirm("Deletar esta imagem da galeria? (não afeta o grid)")) return;
    const novasPastas = galeriaPastas.map((p) =>
      p.id === pastaId
        ? { ...p, imagens: p.imagens.filter((i) => i.id !== imagemId) }
        : p
    );
    setGaleriaPastas(novasPastas);
    await salvarGaleriaFirestore(novasPastas);
  };

  const moverImagemGaleria = async (pastaOrigemId, imagemId, pastaDestinoId) => {
    if (pastaOrigemId === pastaDestinoId) return;
    let imagemMovida = null;
    let novasPastas = galeriaPastas.map((p) => {
      if (p.id === pastaOrigemId) {
        imagemMovida = p.imagens.find((i) => i.id === imagemId);
        return { ...p, imagens: p.imagens.filter((i) => i.id !== imagemId) };
      }
      return p;
    });
    if (!imagemMovida) return;
    novasPastas = novasPastas.map((p) =>
      p.id === pastaDestinoId ? { ...p, imagens: [...p.imagens, imagemMovida] } : p
    );
    setGaleriaPastas(novasPastas);
    setMoverImagemDialog(null);
    setMoverDestino("");
    await salvarGaleriaFirestore(novasPastas);
  };

  const uploadImagemParaGaleria = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;
    input.onchange = async () => {
      const files = Array.from(input.files || []);
      if (files.length === 0) return;

      // Se não há pasta selecionada específica, usa a primeira ou cria "Geral"
      let pastaDestinoId = pastaAtualId;
      let pastasAtuais = [...galeriaPastas];

      if (pastaDestinoId === PASTA_TODAS || !pastasAtuais.some((p) => p.id === pastaDestinoId)) {
        if (pastasAtuais.length === 0) {
          const novaPasta = { id: `p_${Date.now()}`, nome: "Geral", imagens: [] };
          pastasAtuais.push(novaPasta);
          pastaDestinoId = novaPasta.id;
        } else {
          pastaDestinoId = pastasAtuais[0].id;
        }
      }

      const novasImagens = [];
      for (const file of files) {
        try {
          const fd = new FormData();
          fd.append("image", file);
          const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: "POST",
            body: fd,
          });
          const data = await res.json();
          if (!data?.success) throw new Error("Upload falhou");
          const url = data.data.display_url || data.data.image?.url || data.data.url;
          const nomeSemExt = file.name.replace(/\.[^/.]+$/, "");
          novasImagens.push({ id: `i_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, nome: nomeSemExt, src: url });
        } catch (err) {
          console.error("Erro upload:", err);
        }
      }

      const pastasFinalizadas = pastasAtuais.map((p) =>
        p.id === pastaDestinoId ? { ...p, imagens: [...p.imagens, ...novasImagens] } : p
      );

      setGaleriaPastas(pastasFinalizadas);
      await salvarGaleriaFirestore(pastasFinalizadas);
      alert(`✅ ${novasImagens.length} imagem(ns) adicionada(s) à pasta.`);
    };
    input.click();
  };

  const adicionarImagemAoGrid = (img) => {
    const tokenObj = {
      id: Date.now(),
      src: img.src,
      nome: img.nome || "Token",
      x: 100,
      y: 100,
      width: 100,
      height: 100,
    };
    socketRef.current?.emit("addToken", tokenObj);
    setGaleriaOpen(false);
    setGaleriaLightbox(null);
  };

  const abrirDialogSalvarToken = () => {
    if (!isMaster || selectedIds.length === 0) return;
    const token = tokens.find((t) => t.id === selectedIds[0]);
    if (!token) return;
    setSalvarTokenDialog({
      token,
      pastaId: pastaAtualId === PASTA_TODAS ? (galeriaPastas[0]?.id || "__nova__") : pastaAtualId,
      nome: token.nome || "Token",
    });
  };

  const confirmarSalvarToken = async () => {
    if (!salvarTokenDialog) return;
    const { token, pastaId, nome } = salvarTokenDialog;
    const nomeFinal = (nome || "Token").trim();
    let pastasAtuais = [...galeriaPastas];
    const novaImagem = { id: `i_${Date.now()}`, nome: nomeFinal, src: token.src };

    if (pastaId === "__nova__") {
      const novaPasta = { id: `p_${Date.now()}`, nome: nomeFinal || "Geral", imagens: [novaImagem] };
      pastasAtuais.push(novaPasta);
    } else {
      pastasAtuais = pastasAtuais.map((p) =>
        p.id === pastaId ? { ...p, imagens: [...p.imagens, novaImagem] } : p
      );
    }

    setGaleriaPastas(pastasAtuais);
    await salvarGaleriaFirestore(pastasAtuais);
    setSalvarTokenDialog(null);
    alert(`✅ "${nomeFinal}" adicionado à galeria!`);
  };

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

  // Upload de token direto no grid
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
      const nomeSemExt = file.name.replace(/\.[^/.]+$/, "");
      const tokenObj = {
        id: Date.now(),
        src: data.url,
        nome: nomeSemExt,
        x: 100,
        y: 100,
        width: 100,
        height: 100,
      };
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

  // Lista de imagens da pasta atual (ou todas)
  const imagensVisiveis = (() => {
    if (pastaAtualId === PASTA_TODAS) {
      return galeriaPastas.flatMap((p) => p.imagens.map((img) => ({ ...img, _pastaId: p.id, _pastaNome: p.nome })));
    }
    const pasta = galeriaPastas.find((p) => p.id === pastaAtualId);
    return pasta ? pasta.imagens.map((img) => ({ ...img, _pastaId: pasta.id, _pastaNome: pasta.nome })) : [];
  })();

  if (!visible) return null;

  return createPortal(
    <>
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
          <Box sx={{ display: "flex", gap: 0.5, alignItems: "center", flexShrink: 0, flexWrap: "wrap" }}>
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
                    {/* 🟢 BOTÃO GALERIA */}
                    <Button
                      size="small" startIcon={<CollectionsIcon />}
                      onClick={() => setGaleriaOpen(true)}
                      sx={{ minWidth: "auto", px: 1, fontSize: "0.6rem", bgcolor: "#a855f7", color: "#fff", "&:hover": { bgcolor: "#7b1fa2" } }}
                    >
                      Galeria
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
                        {/* 🟢 BOTÃO ADICIONAR À GALERIA (aparece quando token selecionado) */}
                        <Button
                          size="small" startIcon={<PhotoLibraryIcon />}
                          onClick={abrirDialogSalvarToken}
                          title="Salvar token selecionado na galeria"
                          sx={{ minWidth: "auto", px: 1, fontSize: "0.6rem", bgcolor: "#0891b2", color: "#fff", "&:hover": { bgcolor: "#0e7490" } }}
                        >
                          Salvar na Galeria
                        </Button>
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
              } else {
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
      </Paper>

      {/* ============================================================ */}
      {/* MODAL: SALVAR TOKEN NA GALERIA */}
      {/* ============================================================ */}
      <Dialog
        open={!!salvarTokenDialog}
        onClose={() => setSalvarTokenDialog(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { bgcolor: "#0f172a", border: "1px solid #0891b2", borderRadius: 2 } }}
      >
        <DialogTitle sx={{ color: "#0891b2", fontWeight: "bold" }}>
          💾 Salvar Token na Galeria
        </DialogTitle>
        <DialogContent>
          {salvarTokenDialog && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
              <Box sx={{ textAlign: "center" }}>
                <img
                  src={salvarTokenDialog.token.src}
                  alt="Token"
                  style={{ maxWidth: 120, maxHeight: 120, borderRadius: 8, border: "1px solid #334155" }}
                />
              </Box>
              <TextField
                fullWidth
                size="small"
                label="Nome do token"
                value={salvarTokenDialog.nome}
                onChange={(e) => setSalvarTokenDialog((prev) => ({ ...prev, nome: e.target.value }))}
                InputProps={{ style: { color: "#fff" } }}
                InputLabelProps={{ style: { color: "#94a3b8" } }}
              />
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: "#94a3b8" }}>Pasta destino</InputLabel>
                <Select
                  value={salvarTokenDialog.pastaId}
                  onChange={(e) => setSalvarTokenDialog((prev) => ({ ...prev, pastaId: e.target.value }))}
                  sx={{ color: "#fff" }}
                  label="Pasta destino"
                >
                  {galeriaPastas.map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      📁 {p.nome}
                    </MenuItem>
                  ))}
                  <MenuItem value="__nova__" sx={{ color: "#22c55e", fontWeight: "bold" }}>
                    ➕ Nova pasta (com esse nome)
                  </MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSalvarTokenDialog(null)} sx={{ color: "#94a3b8" }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={confirmarSalvarToken}
            sx={{ bgcolor: "#0891b2", "&:hover": { bgcolor: "#0e7490" } }}
          >
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      {/* ============================================================ */}
      {/* MODAL: GALERIA DE TOKENS */}
      {/* ============================================================ */}
      <Dialog
        open={galeriaOpen}
        onClose={() => setGaleriaOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: "#0f172a",
            border: "2px solid #a855f7",
            borderRadius: 2,
            minHeight: "80vh",
            maxHeight: "92vh",
          },
        }}
      >
        <DialogTitle
          sx={{
            color: "#a855f7",
            borderBottom: "2px solid #a855f744",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CollectionsIcon />
            <Typography variant="h6" sx={{ fontWeight: "bold" }}>
              Galeria de Tokens
            </Typography>
            <Typography variant="caption" sx={{ color: "#94a3b8", ml: 1 }}>
              {imagensVisiveis.length} imagem(ns) · {galeriaPastas.length} pasta(s)
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              size="small"
              variant="contained"
              startIcon={<CloudUploadIcon />}
              onClick={uploadImagemParaGaleria}
              sx={{ bgcolor: "#22c55e", "&:hover": { bgcolor: "#16a34a" }, fontSize: "0.7rem" }}
            >
              Upload
            </Button>
            <IconButton onClick={() => setGaleriaOpen(false)} sx={{ color: "#94a3b8" }}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 0, display: "flex", height: "70vh" }}>
          {/* SIDEBAR - PASTAS */}
          <Box
            sx={{
              width: 220,
              borderRight: "1px solid #334155",
              p: 1.5,
              overflowY: "auto",
              bgcolor: "#0a0a12",
              flexShrink: 0,
            }}
          >
            <Typography variant="caption" sx={{ color: "#a855f7", fontWeight: "bold", display: "block", mb: 1 }}>
              📁 PASTAS
            </Typography>

            {/* Botão "Todas" */}
            <Paper
              onClick={() => setPastaAtualId(PASTA_TODAS)}
              sx={{
                p: 1,
                mb: 0.5,
                cursor: "pointer",
                bgcolor: pastaAtualId === PASTA_TODAS ? "#a855f733" : "#1a1a2e",
                border: pastaAtualId === PASTA_TODAS ? "1px solid #a855f7" : "1px solid #334155",
                borderRadius: 1,
                "&:hover": { bgcolor: "#1e293b" },
              }}
            >
              <Typography variant="body2" sx={{ color: "#fff", fontWeight: "bold", fontSize: "0.8rem" }}>
                🗂️ Todas as imagens
              </Typography>
            </Paper>

            {/* Lista de pastas */}
            {galeriaPastas.map((p) => (
              <Paper
                key={p.id}
                onClick={() => setPastaAtualId(p.id)}
                sx={{
                  p: 1,
                  mb: 0.5,
                  cursor: "pointer",
                  bgcolor: pastaAtualId === p.id ? "#a855f733" : "#1a1a2e",
                  border: pastaAtualId === p.id ? "1px solid #a855f7" : "1px solid #334155",
                  borderRadius: 1,
                  "&:hover": { bgcolor: "#1e293b" },
                }}
              >
                {editandoNomePasta.id === p.id ? (
                  <TextField
                    size="small"
                    fullWidth
                    autoFocus
                    value={editandoNomePasta.nome}
                    onChange={(e) => setEditandoNomePasta((prev) => ({ ...prev, nome: e.target.value }))}
                    onBlur={() => renomearPasta(p.id, editandoNomePasta.nome)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") renomearPasta(p.id, editandoNomePasta.nome);
                      if (e.key === "Escape") setEditandoNomePasta({ id: null, nome: "" });
                    }}
                    InputProps={{ style: { color: "#fff", fontSize: "0.8rem" } }}
                  />
                ) : (
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Typography
                      variant="body2"
                      sx={{
                        color: "#fff",
                        fontSize: "0.8rem",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        flex: 1,
                      }}
                    >
                      📁 {p.nome} <span style={{ color: "#64748b", fontSize: "0.7rem" }}>({p.imagens?.length || 0})</span>
                    </Typography>
                    <Box sx={{ display: "flex", gap: 0.2 }}>
                      <IconButton
                        size="small"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setEditandoNomePasta({ id: p.id, nome: p.nome });
                        }}
                        sx={{ color: "#a855f7", p: 0.3 }}
                      >
                        <EditIcon sx={{ fontSize: 12 }} />
                      </IconButton>
                      <IconButton
                        size="small"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          deletarPasta(p.id);
                        }}
                        sx={{ color: "#ef4444", p: 0.3 }}
                      >
                        <DeleteIcon sx={{ fontSize: 12 }} />
                      </IconButton>
                    </Box>
                  </Box>
                )}
              </Paper>
            ))}

            {/* Nova pasta */}
            <Box sx={{ mt: 1.5 }}>
              <TextField
                size="small"
                fullWidth
                placeholder="Nome da nova pasta"
                value={novaPastaNome}
                onChange={(e) => setNovaPastaNome(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") criarPasta();
                }}
                InputProps={{ style: { color: "#fff", fontSize: "0.75rem" } }}
                sx={{ mb: 0.5 }}
              />
              <Button
                size="small"
                fullWidth
                variant="outlined"
                startIcon={<CreateNewFolderIcon />}
                onClick={criarPasta}
                sx={{ color: "#22c55e", borderColor: "#22c55e", fontSize: "0.7rem" }}
              >
                Nova Pasta
              </Button>
            </Box>
          </Box>

          {/* ÁREA PRINCIPAL - IMAGENS */}
          <Box sx={{ flex: 1, p: 2, overflowY: "auto" }}>
            {imagensVisiveis.length === 0 ? (
              <Box sx={{ textAlign: "center", mt: 6 }}>
                <Typography variant="h6" sx={{ color: "#64748b", mb: 1 }}>
                  📭 Nenhuma imagem nesta pasta
                </Typography>
                <Typography variant="body2" sx={{ color: "#475569" }}>
                  Use o botão "Upload" no topo para adicionar imagens.
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={1.5}>
                {imagensVisiveis.map((img) => (
                  <Grid item xs={6} sm={4} md={3} key={`${img._pastaId}-${img.id}`}>
                    <Paper
                      sx={{
                        p: 1,
                        bgcolor: "#1a1a2e",
                        border: "1px solid #334155",
                        borderRadius: 2,
                        position: "relative",
                        "&:hover": { border: "1px solid #a855f7" },
                      }}
                    >
                      <Box
                        sx={{
                          width: "100%",
                          aspectRatio: "1 / 1",
                          bgcolor: "#0a0a12",
                          borderRadius: 1,
                          overflow: "hidden",
                          mb: 0.5,
                          cursor: "zoom-in",
                        }}
                        onClick={() => {
                          setGaleriaLightbox({ src: img.src, nome: img.nome });
                          setGaleriaZoom(1);
                        }}
                      >
                        <img
                          src={img.src}
                          alt={img.nome}
                          loading="lazy"
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      </Box>

                      {/* Nome (editável) */}
                      {editandoNomeImagem.imagemId === img.id && editandoNomeImagem.pastaId === img._pastaId ? (
                        <TextField
                          size="small"
                          fullWidth
                          autoFocus
                          value={editandoNomeImagem.nome}
                          onChange={(e) => setEditandoNomeImagem((prev) => ({ ...prev, nome: e.target.value }))}
                          onBlur={() => renomearImagemGaleria(img._pastaId, img.id, editandoNomeImagem.nome)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") renomearImagemGaleria(img._pastaId, img.id, editandoNomeImagem.nome);
                            if (e.key === "Escape") setEditandoNomeImagem({ pastaId: null, imagemId: null, nome: "" });
                          }}
                          InputProps={{ style: { color: "#fff", fontSize: "0.7rem" } }}
                        />
                      ) : (
                        <Typography
                          variant="caption"
                          sx={{
                            color: "#fff",
                            display: "block",
                            fontSize: "0.7rem",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            textAlign: "center",
                            fontWeight: "bold",
                          }}
                          title={img.nome}
                        >
                          {img.nome}
                        </Typography>
                      )}

                      {pastaAtualId === PASTA_TODAS && (
                        <Typography
                          variant="caption"
                          sx={{ color: "#64748b", display: "block", textAlign: "center", fontSize: "0.6rem" }}
                        >
                          📁 {img._pastaNome}
                        </Typography>
                      )}

                      {/* Botões de ação */}
                      <Box sx={{ display: "flex", gap: 0.3, mt: 0.5, justifyContent: "center", flexWrap: "wrap" }}>
                        <Tooltip title="Adicionar ao grid">
                          <IconButton
                            size="small"
                            onClick={() => adicionarImagemAoGrid(img)}
                            sx={{ bgcolor: "#22c55e33", color: "#22c55e", p: 0.4 }}
                          >
                            <AddIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Renomear">
                          <IconButton
                            size="small"
                            onClick={() =>
                              setEditandoNomeImagem({ pastaId: img._pastaId, imagemId: img.id, nome: img.nome })
                            }
                            sx={{ bgcolor: "#a855f733", color: "#a855f7", p: 0.4 }}
                          >
                            <EditIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Mover para pasta">
                          <IconButton
                            size="small"
                            disabled={galeriaPastas.length === 0}
                            onClick={() => {
                              setMoverImagemDialog({ pastaId: img._pastaId, imagemId: img.id, nome: img.nome });
                              setMoverDestino("");
                            }}
                            sx={{ bgcolor: "#3b82f633", color: "#3b82f6", p: 0.4 }}
                          >
                            <DriveFileMoveIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Deletar da galeria">
                          <IconButton
                            size="small"
                            onClick={() => deletarImagemGaleria(img._pastaId, img.id)}
                            sx={{ bgcolor: "#ef444433", color: "#ef4444", p: 0.4 }}
                          >
                            <DeleteIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* MODAL: MOVER IMAGEM PARA OUTRA PASTA */}
      {/* ============================================================ */}
      <Dialog
        open={!!moverImagemDialog}
        onClose={() => setMoverImagemDialog(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { bgcolor: "#0f172a", border: "1px solid #3b82f6", borderRadius: 2 } }}
      >
        <DialogTitle sx={{ color: "#3b82f6", fontWeight: "bold" }}>
          📁 Mover "{moverImagemDialog?.nome}"
        </DialogTitle>
        <DialogContent>
          <FormControl fullWidth size="small" sx={{ mt: 1 }}>
            <InputLabel sx={{ color: "#94a3b8" }}>Pasta destino</InputLabel>
            <Select
              value={moverDestino}
              onChange={(e) => setMoverDestino(e.target.value)}
              sx={{ color: "#fff" }}
              label="Pasta destino"
            >
              {galeriaPastas
                .filter((p) => p.id !== moverImagemDialog?.pastaId)
                .map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    📁 {p.nome}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMoverImagemDialog(null)} sx={{ color: "#94a3b8" }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            disabled={!moverDestino}
            onClick={() => moverImagemGaleria(moverImagemDialog.pastaId, moverImagemDialog.imagemId, moverDestino)}
            sx={{ bgcolor: "#3b82f6", "&:hover": { bgcolor: "#2563eb" } }}
          >
            Mover
          </Button>
        </DialogActions>
      </Dialog>

      {/* ============================================================ */}
      {/* LIGHTBOX DA GALERIA */}
      {/* ============================================================ */}
      {galeriaLightbox && (
        <Box
          onClick={() => setGaleriaLightbox(null)}
          onWheel={(e) => {
            e.preventDefault();
            setGaleriaZoom((z) => Math.min(Math.max(z + e.deltaY * -0.001, 0.5), 5));
          }}
          sx={{
            position: "fixed",
            inset: 0,
            bgcolor: "rgba(0,0,0,0.92)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
          }}
        >
          <Typography
            variant="h6"
            sx={{
              color: "#a855f7",
              fontWeight: "bold",
              position: "absolute",
              top: 20,
              left: 0,
              right: 0,
              textAlign: "center",
            }}
          >
            {galeriaLightbox.nome}
          </Typography>
          <Box sx={{ display: "flex", gap: 1, position: "absolute", top: 16, right: 16 }}>
            <Button
              size="small"
              variant="contained"
              startIcon={<AddIcon />}
              onClick={(e) => {
                e.stopPropagation();
                adicionarImagemAoGrid(galeriaLightbox);
              }}
              sx={{ bgcolor: "#22c55e", "&:hover": { bgcolor: "#16a34a" }, fontSize: "0.7rem" }}
            >
              Adicionar ao Grid
            </Button>
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                setGaleriaLightbox(null);
              }}
              sx={{ color: "#fff", bgcolor: "rgba(255,255,255,0.1)" }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
          <GaleriaLightboxImage
            src={galeriaLightbox.src}
            zoom={galeriaZoom}
            setZoom={setGaleriaZoom}
          />
        </Box>
      )}
    </>,
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

// ============================================================
// LIGHTBOX IMAGE (com drag + zoom)
// ============================================================
function GaleriaLightboxImage({ src, zoom, setZoom }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [start, setStart] = useState({ x: 0, y: 0 });
  const [initialDistance, setInitialDistance] = useState(null);

  const handleMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
    setStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };
  const handleMouseMove = (e) => {
    if (!dragging) return;
    setPosition({ x: e.clientX - start.x, y: e.clientY - start.y });
  };
  const handleMouseUp = () => setDragging(false);

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setDragging(true);
      setStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setInitialDistance(dist);
    }
  };
  const handleTouchMove = (e) => {
    if (e.touches.length === 1 && dragging) {
      const touch = e.touches[0];
      setPosition({ x: touch.clientX - start.x, y: touch.clientY - start.y });
    } else if (e.touches.length === 2 && initialDistance) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = dist / initialDistance;
      setZoom((z) => Math.min(Math.max(z * delta, 0.5), 5));
      setInitialDistance(dist);
    }
  };
  const handleTouchEnd = () => {
    setDragging(false);
    setInitialDistance(null);
  };

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, start]);

  return (
    <img
      src={src}
      alt="ampliada"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      draggable={false}
      style={{
        transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
        transition: dragging ? "none" : "transform 0.2s ease",
        maxWidth: "90%",
        maxHeight: "80%",
        borderRadius: 10,
        cursor: dragging ? "grabbing" : "grab",
        userSelect: "none",
        touchAction: "none",
      }}
    />
  );
}