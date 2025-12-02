// src/components/CommerceHUD.jsx
import React, { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Button,
  TextField,
  Divider,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";


import { db } from "../firebaseConfig";
import { collection, doc, getDocs, setDoc, deleteDoc } from "firebase/firestore";

/* ========= LOJAS FIXAS =========== */
const LOJAS_FIXAS = [
  { nome: "Padaria", emoji: "🥐" },
  { nome: "Fruteira", emoji: "🍎" },
  { nome: "Açougue", emoji: "🥩" },
  { nome: "Agropecuária", emoji: "🌾" },
  { nome: "Loja do Aventureiro", emoji: "🗡" },
  { nome: "Loja do Alquimista", emoji: "⚗" },
  { nome: "Taverna", emoji: "🍺" },
  { nome: "Estalagem", emoji: "🛏" },
  { nome: "Bordel", emoji: "💋" },
  { nome: "Marcenaria", emoji: "🪵" },
  { nome: "Ferraria", emoji: "⚒" },
  { nome: "Porto", emoji: "⚓" },
  { nome: "Estábulo", emoji: "🐴" },
];

/* ---------------- LightboxImage (drag + pinch) -------------- */
function LightboxImage({ src, zoom, setZoom }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [start, setStart] = useState({ x: 0, y: 0 });
  const [initialDistance, setInitialDistance] = useState(null);

  // mouse handlers
  const handleMouseDown = (e) => {
    e.preventDefault();
    setDragging(true);
    setStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };
  const handleMouseMove = (e) => {
    if (!dragging) return;
    setPosition({ x: e.clientX - start.x, y: e.clientY - start.y });
  };
  const handleMouseUp = () => setDragging(false);

  // touch handlers (drag + pinch)
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      setDragging(true);
      setStart({ x: t.clientX - position.x, y: t.clientY - position.y });
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
      const t = e.touches[0];
      setPosition({ x: t.clientX - start.x, y: t.clientY - start.y });
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
    // intentionally not adding start/position to deps to avoid spurious removals
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging]);

  return (
    <img
      src={src}
      alt="ampliada"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
        transition: dragging ? "none" : "transform 0.2s ease",
        maxWidth: "90%",
        maxHeight: "90%",
        borderRadius: 10,
        cursor: dragging ? "grabbing" : "grab",
        userSelect: "none",
        touchAction: "none",
      }}
    />
  );
}

/* ---------------- Lightbox Modal wrapper ---------------- */
function LightboxModal({ image, zoom, setZoom, onClose }) {
  return (
    <div
      onClick={onClose}
      onWheel={(e) => {
        e.preventDefault();
        setZoom((z) => Math.min(Math.max(z + e.deltaY * -0.001, 0.5), 5));
      }}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "rgba(0,0,0,0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 3000,
      }}
    >
      <LightboxImage src={image} zoom={zoom} setZoom={setZoom} />
      <IconButton
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        sx={{
          position: "fixed",
          top: 16,
          right: 16,
          color: "#fff",
          background: "rgba(0,0,0,0.5)",
          "&:hover": { background: "rgba(0,0,0,0.8)" },
        }}
      >
        <CloseIcon />
      </IconButton>
    </div>
  );
}

/* ---------------- CommerceHUD principal ---------------- */
function CommerceHUD({ isMaster = false, visible = false, onClose = () => {}, currentUserEmail = null }) {
    // Se não está visível, NÃO RENDERIZE NADA (evita camada invisível cobrindo a tela)
  if (!visible) return null;

  // Países e seleção
  const [paises, setPaises] = useState([]);
  const [selectedPais, setSelectedPais] = useState(null); // {id, nome, bandeira}
  const [selectedLoja, setSelectedLoja] = useState(null); // string
  const [novoPais, setNovoPais] = useState("");

  // Itens
  const [itens, setItens] = useState([]);
  const [editandoItem, setEditandoItem] = useState(null);
  const [carregandoItens, setCarregandoItens] = useState(false);

  // lightbox
  const [lightboxImage, setLightboxImage] = useState(null);
  const [zoom, setZoom] = useState(1);

  // DEBUG minimal
  useEffect(() => {
    console.log("CommerceHUD mounted — visible:", visible);
    return () => console.log("CommerceHUD unmounted");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    console.log("CommerceHUD visible changed ->", visible);
  }, [visible]);

  /* ---------------- IMGBB UPLOAD DE BANDEIRA ---------------- */
  const handleUploadFlag = useCallback(async (paisId) => {
    try {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.click();

      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("image", file);

        const res = await fetch(
          "https://api.imgbb.com/1/upload?key=73fcf242ce0108665fa0c9e9de33bd50",
          { method: "POST", body: formData }
        );

        const data = await res.json();
        if (!data?.success) {
          alert("Erro ao enviar a bandeira.");
          return;
        }

        const url = data.data.url;
        await setDoc(doc(db, "comercio", "paises", "lista", paisId), { bandeira: url }, { merge: true });
        carregarPaises();
      };
    } catch (err) {
      console.error("Erro upload bandeira:", err);
      alert("Erro ao enviar bandeira.");
    }
  }, []);

  /* ---------------- FIREBASE: PAISES ---------------- */
  const carregarPaises = useCallback(async () => {
    try {
      const snap = await getDocs(collection(db, "comercio", "paises", "lista"));
      const dados = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setPaises(dados);
    } catch (err) {
      console.error("Erro ao carregar países:", err);
    }
  }, []);

  useEffect(() => {
    carregarPaises();
  }, [carregarPaises]);

  const adicionarPais = useCallback(async () => {
    if (!novoPais.trim()) return;
    try {
      await setDoc(doc(db, "comercio", "paises", "lista", novoPais), { nome: novoPais, bandeira: "" });
      setNovoPais("");
      carregarPaises();
    } catch (err) {
      console.error("Erro ao adicionar país:", err);
      alert("Erro ao adicionar país.");
    }
  }, [novoPais, carregarPaises]);

  const removerPais = useCallback(async (id) => {
    try {
      await deleteDoc(doc(db, "comercio", "paises", "lista", id));
      carregarPaises();
      setSelectedPais(null);
      setSelectedLoja(null);
    } catch (err) {
      console.error("Erro ao remover país:", err);
      alert("Erro ao remover país.");
    }
  }, [carregarPaises]);

  /* ========== ITENS: carregar / salvar / remover / mover ========== */
  function genId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  const carregarItens = useCallback(async () => {
    if (!selectedPais || !selectedLoja) {
      setItens([]);
      return;
    }
    setCarregandoItens(true);
    try {
      const snap = await getDocs(
        collection(db, "comercio", "paises", "lista", selectedPais.id, "lojas", selectedLoja, "itens")
      );
      const dados = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      dados.sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
      setItens(dados);
    } catch (err) {
      console.error("Erro ao carregar itens:", err);
      setItens([]);
    } finally {
      setCarregandoItens(false);
    }
  }, [selectedPais, selectedLoja]);

  useEffect(() => {
    carregarItens();
  }, [carregarItens]);

  const abrirEditorItem = useCallback((item) => {
    setEditandoItem(
      item
        ? { ...item }
        : { id: null, nome: "", desc: "", valor: "", img: "", ordem: itens.length || 0 }
    );
    // stop propagation is handled by click handlers in the UI
  }, [itens.length]);

  const salvarItem = useCallback(
    async (e) => {
      e.preventDefault?.();
      // When called programmatically (not from form submit), e might be undefined.
      if (!selectedPais || !selectedLoja) {
        alert("Selecione um país e uma loja antes.");
        return;
      }
      try {
        // support both form submit (event.target) and programmatic call (editandoItem)
        const nome =
          (e?.target?.nome?.value?.trim?.()) ||
          editandoItem?.nome?.trim?.();
        const desc =
          (e?.target?.desc?.value?.trim?.()) ||
          (editandoItem?.desc || "");
        const valor =
          (e?.target?.valor?.value?.trim?.()) ||
          (editandoItem?.valor || "");

        if (!nome) return alert("Digite um nome para o item.");

        const id = editandoItem?.id || genId();
        const ordem = typeof editandoItem?.ordem === "number" ? editandoItem.ordem : itens.length;

        await setDoc(
          doc(db, "comercio", "paises", "lista", selectedPais.id, "lojas", selectedLoja, "itens", id),
          {
            nome,
            desc,
            valor,
            img: editandoItem?.img || "",
            ordem,
          },
          { merge: true }
        );

        setEditandoItem(null);
        carregarItens();
      } catch (err) {
        console.error("Erro ao salvar item:", err);
        alert("Erro ao salvar item.");
      }
    },
    [selectedPais, selectedLoja, editandoItem, itens.length, carregarItens]
  );

  const removerItem = useCallback(
    async (itemId) => {
      if (!window.confirm("Remover item?")) return;
      try {
        await deleteDoc(
          doc(db, "comercio", "paises", "lista", selectedPais.id, "lojas", selectedLoja, "itens", itemId)
        );
        carregarItens();
      } catch (err) {
        console.error("Erro ao remover item:", err);
        alert("Erro ao remover item.");
      }
    },
    [selectedPais, selectedLoja, carregarItens]
  );

  const moverItem = useCallback(
    async (index, direcao) => {
      const novoIndex = index + direcao;
      if (novoIndex < 0 || novoIndex >= itens.length) return;
      const clone = [...itens];
      // swap
      const tmp = clone[index];
      clone[index] = clone[novoIndex];
      clone[novoIndex] = tmp;

      try {
        await Promise.all(
          clone.map((it, i) =>
            setDoc(
              doc(db, "comercio", "paises", "lista", selectedPais.id, "lojas", selectedLoja, "itens", it.id),
              { ordem: i },
              { merge: true }
            )
          )
        );
        setItens(clone);
      } catch (err) {
        console.error("Erro ao reordenar itens:", err);
        alert("Erro ao mover item.");
      }
    },
    [itens, selectedPais, selectedLoja]
  );

  /* ---------- upload imagem para item (IMGBB) ---------- */
  const uploadImagemParaItem = useCallback(async () => {
    if (!editandoItem) return;
    try {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.click();

      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("image", file);

        const res = await fetch(
          "https://api.imgbb.com/1/upload?key=73fcf242ce0108665fa0c9e9de33bd50",
          { method: "POST", body: formData }
        );
        const data = await res.json();
        if (!data?.success) {
          alert("Erro ao enviar imagem.");
          return;
        }

        const url = data.data.url;
        setEditandoItem((prev) => ({ ...(prev || {}), img: url }));
      };
    } catch (err) {
      console.error("Erro upload imagem item:", err);
      alert("Erro ao enviar imagem.");
    }
  }, [editandoItem]);

  /* ----------------- HELPERS: stop propagation (centralizado) ----------------- */
  const stopAll = (e) => {
    try {
      if (e && typeof e.stopPropagation === "function") e.stopPropagation();
      if (e && e.nativeEvent && typeof e.nativeEvent.stopImmediatePropagation === "function")
        e.nativeEvent.stopImmediatePropagation();
    } catch (err) {
      // swallow
    }
  };

  /* ----------------- RENDER ----------------- */
  const hud = (
    <Paper
      onClick={stopAll}
      onMouseDown={stopAll}
      onTouchStart={stopAll}
      onWheel={(e) => {
        try {
          e.stopPropagation();
        } catch {}
      }}
      elevation={10}
      sx={{
        position: "fixed",
        top: 110,
        left: 310,
        width: 450,
        height: "80vh",
        p: 2,
        backgroundImage: "url('/pergaminho.png') !important",
        backgroundSize: "cover !important",
        backgroundRepeat: "no-repeat !important",
        backgroundPosition: "center !important",
        backgroundColor: "transparent !important",
        border: "2px solid rgba(84,64,22,0.9)",
        boxShadow: "0 0 25px rgba(0,0,0,0.7)",
        overflowY: "auto",
        zIndex: visible ? 200 : -1,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
        transition: "opacity .25s ease",
      }}
      aria-hidden={!visible}
    >
      {/* HEADER */}
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
        <Typography
          variant="h5"
          sx={{
            fontFamily: "'Cinzel', serif",
            color: "#2a1f0d",
            textShadow: "1px 1px 3px rgba(0,0,0,0.7)",
          }}
        >
          Comércio
        </Typography>

        <IconButton
  color="error"
  onClick={(e) => {
    // evita que clique feche coisas por cima
    stopAll(e);

    try {
      // chama a prop se foi passada (compatibilidade)
      try { if (typeof onClose === "function") onClose(); } catch (err) { /* swallow */ }

      // garante que a função global exista e atualiza flag global
      if (typeof window !== "undefined") {
        try {
          window.closeCommerceHUD?.();
          window.__commerceVisible = false;
        } catch (err) {
          console.error("Erro ao chamar closeCommerceHUD global:", err);
        }
      }
    } catch (err) {
      console.error("Erro ao fechar HUD:", err);
    }
  }}
  aria-label="fechar-comercio"
>
  <CloseIcon />
</IconButton>


      </Box>

      <Divider sx={{ mb: 2, borderColor: "rgba(0,0,0,0.4)" }} />

      {/* ================= CAMADA 1 — PAÍSES ================= */}
      {!selectedPais && (
        <>
          <Typography variant="h6" sx={{ fontFamily: "'Cinzel', serif", mb: 1, color: "#2a1f0d" }}>
            Países
          </Typography>

          {isMaster && (
            <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
              <TextField
                size="small"
                label="Novo país"
                value={novoPais}
                onChange={(e) => setNovoPais(e.target.value)}
                fullWidth
                sx={{ backgroundColor: "rgba(255,255,255,0.06)" }}
              />
              <Button
                type="button"
                variant="contained"
                onClick={(e) => {
                  stopAll(e);
                  adicionarPais();
                }}
              >
                Adicionar
              </Button>
            </Box>
          )}

          <Box sx={{ mt: 2 }}>
            {paises.map((p) => (
              <Paper
                key={p.id}
                sx={{
                  p: 1,
                  mb: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "transparent",
                  border: "1px solid rgba(58,42,10,0.6)",
                }}
              >
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 1, cursor: "pointer" }}
                  onClick={() => setSelectedPais(p)}
                >
                  {p.bandeira ? (
                    <img
                      src={p.bandeira}
                      alt="bandeira"
                      onClick={(e) => {
                        stopAll(e);
                        setLightboxImage(p.bandeira);
                        setZoom(1);
                      }}
                      style={{
                        height: 32,
                        width: "auto",
                        borderRadius: 4,
                        border: "1px solid rgba(0,0,0,0.3)",
                        objectFit: "cover",
                        cursor: "pointer",
                      }}
                    />
                  ) : (
                    <Box
                      sx={{
                        height: 32,
                        width: 48,
                        background: "rgba(0,0,0,0.25)",
                        borderRadius: 4,
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        color: "#ddd",
                        fontSize: "0.7rem",
                        border: "1px solid rgba(58,42,10,0.6)",
                      }}
                    >
                      sem
                    </Box>
                  )}

                  <Typography sx={{ fontFamily: "'Cinzel', serif", fontSize: "1.05rem", color: "#2a1f0d", textShadow: "1px 1px 2px rgba(0,0,0,0.45)" }}>
                    {p.nome}
                  </Typography>
                </Box>

                {isMaster && (
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <Button
                      type="button"
                      variant="outlined"
                      size="small"
                      onClick={(e) => {
                        stopAll(e);
                        handleUploadFlag(p.id);
                      }}
                      sx={{ backgroundColor: "rgba(255,255,255,0.04)", borderColor: "rgba(58,42,10,0.6)" }}
                    >
                      Bandeira
                    </Button>

                    <IconButton
                      color="error"
                      onClick={(e) => {
                        stopAll(e);
                        removerPais(p.id);
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                )}
              </Paper>
            ))}
          </Box>
        </>
      )}

      {/* ================= CAMADA 2 — LOJAS ================= */}
      {selectedPais && !selectedLoja && (
        <>
          <Button
            type="button"
            onClick={(e) => {
              stopAll(e);
              setSelectedPais(null);
            }}
          >
            ← Voltar
          </Button>

          <Typography variant="h5" sx={{ fontFamily: "'Cinzel', serif", mt: 2, color: "#2a1f0d", textShadow: "1px 1px 2px rgba(0,0,0,0.45)" }}>
            {selectedPais.nome}
          </Typography>

          {LOJAS_FIXAS.map((l) => (
            <Paper
              key={l.nome}
              sx={{ p: 1, my: 1, cursor: "pointer", background: "transparent", border: "1px solid rgba(58,42,10,0.6)" }}
              onClick={() => setSelectedLoja(l.nome)}
            >
              {l.emoji} {l.nome}
            </Paper>
          ))}
        </>
      )}

      {/* ================= CAMADA 3 — ITENS ================= */}
      {selectedPais && selectedLoja && (
        <>
          <Button
            type="button"
            onClick={(e) => {
              stopAll(e);
              setSelectedLoja(null);
            }}
          >
            ← Voltar
          </Button>

          <Typography variant="h5" sx={{ fontFamily: "'Cinzel', serif", mt: 2, color: "#2a1f0d", textShadow: "1px 1px 2px rgba(0,0,0,0.45)" }}>
            {selectedLoja} — Itens
          </Typography>

          {isMaster && (
            <Button
              type="button"
              variant="contained"
              sx={{ mt: 2, mb: 2 }}
              onClick={(e) => {
                stopAll(e);
                abrirEditorItem(null);
              }}
            >
              Adicionar Item
            </Button>
          )}

          <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
            {carregandoItens && <Typography>Carregando itens...</Typography>}
            {!carregandoItens && itens.length === 0 && <Typography sx={{ color: "#2a1f0d" }}>Nenhum item cadastrado.</Typography>}

            {itens.map((item, index) => (
              <Paper key={item.id} sx={{ p: 2, background: "rgba(255,255,255,0.35)", border: "1px solid rgba(0,0,0,0.3)", borderRadius: "6px" }}>
                <Box sx={{ display: "flex", gap: 2 }}>
                  {item.img ? (
                    <img
                      src={item.img}
                      alt={item.nome}
                      onClick={(e) => {
                        stopAll(e);
                        setLightboxImage(item.img);
                        setZoom(1);
                      }}
                      style={{ width: 80, height: 80, borderRadius: 6, objectFit: "cover", border: "1px solid rgba(0,0,0,0.25)", cursor: "pointer" }}
                    />
                  ) : (
                    <Box sx={{ width: 80, height: 80, background: "rgba(0,0,0,0.2)", borderRadius: 2, display: "flex", justifyContent: "center", alignItems: "center", color: "#333" }}>
                      sem img
                    </Box>
                  )}

                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontFamily: "'Cinzel', serif", fontSize: "1.1rem" }}>{item.nome}</Typography>

                    <Typography sx={{ fontSize: "0.9rem", opacity: 0.85 }}>{item.desc}</Typography>

                    <Typography sx={{ mt: 1, fontWeight: "bold" }}>💰 {item.valor}</Typography>
                  </Box>

                  {isMaster && (
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      <Button
                        type="button"
                        variant="outlined"
                        size="small"
                        onClick={(e) => {
                          stopAll(e);
                          abrirEditorItem(item);
                        }}
                      >
                        Editar
                      </Button>

                      <Button
                        type="button"
                        variant="outlined"
                        color="error"
                        size="small"
                        onClick={(e) => {
                          stopAll(e);
                          removerItem(item.id);
                        }}
                      >
                        Excluir
                      </Button>

                      <Button
                        type="button"
                        variant="outlined"
                        size="small"
                        onClick={(e) => {
                          stopAll(e);
                          moverItem(index, -1);
                        }}
                        disabled={index === 0}
                      >
                        ↑
                      </Button>

                      <Button
                        type="button"
                        variant="outlined"
                        size="small"
                        onClick={(e) => {
                          stopAll(e);
                          moverItem(index, 1);
                        }}
                        disabled={index === itens.length - 1}
                      >
                        ↓
                      </Button>
                    </Box>
                  )}
                </Box>
              </Paper>
            ))}
          </Box>
        </>
      )}

      {/* ========== MODAL DE EDIÇÃO / ADIÇÃO ========== */}
      {editandoItem && (
        <Box
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.6)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            p: 2,
          }}
          onClick={(e) => {
            stopAll(e);
            setEditandoItem(null);
          }}
        >
          <Paper sx={{ width: 420, p: 3 }} onClick={(e) => e.stopPropagation()}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              {editandoItem.id ? "Editar Item" : "Novo Item"}
            </Typography>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                // ensure form values are read correctly
                salvarItem(e);
              }}
            >
              <TextField fullWidth label="Nome" name="nome" defaultValue={editandoItem?.nome || ""} sx={{ mt: 1 }} />

              <TextField fullWidth label="Descrição" name="desc" defaultValue={editandoItem?.desc || ""} sx={{ mt: 2 }} multiline rows={3} />

              <TextField fullWidth label="Valor" name="valor" defaultValue={editandoItem?.valor || ""} sx={{ mt: 2 }} />

              <Box sx={{ display: "flex", gap: 1, alignItems: "center", mt: 2 }}>
                {editandoItem?.img ? (
                  <img
                    src={editandoItem.img}
                    alt="preview"
                    onClick={(e) => {
                      stopAll(e);
                      setLightboxImage(editandoItem.img);
                      setZoom(1);
                    }}
                    style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 6, border: "1px solid rgba(0,0,0,0.2)", cursor: "pointer" }}
                  />
                ) : (
                  <Box sx={{ width: 80, height: 80, background: "rgba(0,0,0,0.1)", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    sem img
                  </Box>
                )}

                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Button
                    type="button"
                    variant="outlined"
                    onClick={(e) => {
                      stopAll(e);
                      uploadImagemParaItem();
                    }}
                  >
                    Enviar Imagem
                  </Button>
                  <Typography variant="caption" sx={{ color: "#666" }}>
                    (A imagem será enviada para o servidor e salva no item.)
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: "flex", justifyContent: "space-between", mt: 3 }}>
                <Button
                  type="button"
                  variant="outlined"
                  onClick={(e) => {
                    stopAll(e);
                    setEditandoItem(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button variant="contained" type="submit">
                  Salvar
                </Button>
              </Box>
            </form>
          </Paper>
        </Box>
      )}

      {/* Lightbox Modal */}
      {lightboxImage && <LightboxModal image={lightboxImage} zoom={zoom} setZoom={setZoom} onClose={() => setLightboxImage(null)} />}
    </Paper>
  );

  // Always mounted but isolated via portal to body to avoid bubbling issues.
  if (typeof document !== "undefined") {
    try {
      return createPortal(hud, document.body);
    } catch (err) {
      // In unlikely SSR or test env fallback
      return hud;
    }
  }
  return hud;
}

export default React.memo(CommerceHUD);
