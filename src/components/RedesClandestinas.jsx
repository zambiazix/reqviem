// src/components/RedesClandestinas.jsx
import React, { useState, useEffect } from "react";
import {
  Box, Paper, Typography, IconButton, Button, TextField,
  FormControl, InputLabel, Select, MenuItem, Dialog, DialogTitle,
  DialogContent, DialogActions, Grid, Chip, InputAdornment, Tooltip
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import { db } from "../firebaseConfig";
import {
  collection, doc, setDoc, deleteDoc, onSnapshot
} from "firebase/firestore";

const IMGBB_API_KEY = "73fcf242ce0108665fa0c9e9de33bd50";
const TAXA_PNEUMATICA = 0.25;

const TIPOS_DANO = [
  { valor: "Nenhum", label: "Nenhum", cor: "#888888" },
  { valor: "Ácido", label: "Ácido", cor: "#7fff00" },
  { valor: "Contundente", label: "Contundente", cor: "#a0522d" },
  { valor: "Cortante", label: "Cortante", cor: "#c0c0c0" },
  { valor: "Elétrico", label: "Elétrico", cor: "#ffff00" },
  { valor: "Digital", label: "Digital", cor: "#00ff41" },
  { valor: "Aurano", label: "Aurano", cor: "#00e0ff" },
  { valor: "Gélido", label: "Gélido", cor: "#87ceeb" },
  { valor: "Térmico", label: "Térmico", cor: "#ff4500" },
  { valor: "Perfurante", label: "Perfurante", cor: "#daa520" },
  { valor: "Psíquico", label: "Psíquico", cor: "#ff69b4" },
  { valor: "Trovejante", label: "Trovejante", cor: "#4169e1" },
  { valor: "Tóxico", label: "Tóxico", cor: "#8b008b" },
];

const TIPOS_CONSUMIVEL = [
  { valor: "Nenhum", label: "Nenhum", cor: "#888" },
  { valor: "PV", label: "PV", cor: "#ff4d4f" },
  { valor: "PE", label: "PE", cor: "#facc15" },
  { valor: "RE", label: "RE", cor: "#00e0ff" },
];

const normalizarUrl = (url) => {
  if (!url) return "";
  if (url.includes("i.ibb.co")) return url;
  if (url.includes("ibb.co/")) {
    const id = url.split("/").pop();
    return `https://i.ibb.co/${id}.jpg`;
  }
  return url;
};

const gerarHashLoja = () => {
  const chars = "abcdef0123456789";
  let hash = "";
  for (let i = 0; i < 16; i++) hash += chars[Math.floor(Math.random() * chars.length)];
  return hash;
};

function RedesClandestinas({ userEmail, fichasMap, isMaster }) {
  const [lojas, setLojas] = useState([]);
  const [selectedLoja, setSelectedLoja] = useState(null);
  const [itens, setItens] = useState([]);
  const [fichaLocal, setFichaLocal] = useState(null);
  const [pendentes, setPendentes] = useState([]);

  const [editandoLoja, setEditandoLoja] = useState(null);
  const [editandoItem, setEditandoItem] = useState(null);

  const [comprandoItem, setComprandoItem] = useState(null);
  const [variedadeIndex, setVariedadeIndex] = useState(0);
  const [carteiraSelecionada, setCarteiraSelecionada] = useState("");
  const [categoriaDestino, setCategoriaDestino] = useState("equipamentos");
  const [metodoEntrega, setMetodoEntrega] = useState("pneumatica");

  const [lightboxImage, setLightboxImage] = useState(null);
  const [zoom, setZoom] = useState(1);

  // CARREGAR LOJAS
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "clandestina_lojas"), (snap) => {
      setLojas(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // CARREGAR FICHA DO JOGADOR
  useEffect(() => {
    if (!userEmail) return;
    const unsub = onSnapshot(doc(db, "fichas", userEmail), (snap) => {
      if (snap.exists()) {
        const dados = { id: snap.id, ...snap.data() };
        setFichaLocal(dados);
        setPendentes(Array.isArray(dados.clandestina_pendentes) ? dados.clandestina_pendentes : []);
      }
    });
    return () => unsub();
  }, [userEmail]);

  // CARREGAR ITENS DA LOJA SELECIONADA
  useEffect(() => {
    if (!selectedLoja) {
      setItens([]);
      return;
    }
    const unsub = onSnapshot(
      collection(db, "clandestina_lojas", selectedLoja.id, "itens"),
      (snap) => {
        setItens(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }
    );
    return () => unsub();
  }, [selectedLoja]);

  // HELPERS
  const getCarteiras = () => {
    const carteiras = fichaLocal?.carteiras;
    if (Array.isArray(carteiras)) return carteiras;
    if (carteiras && typeof carteiras === "object") {
      return Object.entries(carteiras).map(([nome, valor]) => ({ nome, valor }));
    }
    return [];
  };

  const salvarCarteiras = async (novasCarteiras) => {
    const formatoOriginal = fichaLocal?.carteiras;
    const paraSalvar = Array.isArray(formatoOriginal)
      ? novasCarteiras
      : novasCarteiras.reduce((acc, c) => ({ ...acc, [c.nome]: c.valor }), {});
    await setDoc(doc(db, "fichas", userEmail), { carteiras: paraSalvar }, { merge: true });
  };

  const uploadImagem = async (file) => {
    const fd = new FormData();
    fd.append("image", file);
    try {
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (data?.success) return data.data.url;
    } catch (err) {
      console.error(err);
    }
    return null;
  };

  // CRUD LOJA
  const salvarLoja = async () => {
    if (!editandoLoja?.nome?.trim()) {
      alert("Nome da loja é obrigatório!");
      return;
    }
    const id = editandoLoja.id || `loja_${Date.now()}`;
    await setDoc(doc(db, "clandestina_lojas", id), {
      nome: editandoLoja.nome.trim(),
      descricao: editandoLoja.descricao || "",
      icone: editandoLoja.icone || "🌑",
      hash: editandoLoja.hash || gerarHashLoja(),
      reputacao: editandoLoja.reputacao || "Desconhecida",
      criadoEm: editandoLoja.criadoEm || new Date().toISOString(),
    });
    setEditandoLoja(null);
  };

  const deletarLoja = async (id) => {
    if (!window.confirm("☠️ Deletar esta loja e TODOS os itens dela?")) return;
    const itensSnap = await new Promise((res) =>
      onSnapshot(collection(db, "clandestina_lojas", id, "itens"), (s) => res(s))
    );
    for (const d of itensSnap.docs) await deleteDoc(d.ref);
    await deleteDoc(doc(db, "clandestina_lojas", id));
    if (selectedLoja?.id === id) setSelectedLoja(null);
  };

  // CRUD ITEM
  const salvarItem = async () => {
    if (!editandoItem?.nome?.trim()) {
      alert("Nome do item é obrigatório!");
      return;
    }
    const id = editandoItem.id || `item_${Date.now()}`;
    await setDoc(doc(db, "clandestina_lojas", selectedLoja.id, "itens", id), {
      nome: editandoItem.nome.trim(),
      descricao: editandoItem.descricao || "",
      valor: Number(editandoItem.valor || 0),
      dado: Number(editandoItem.dado || 1),
      durabilidade: Number(editandoItem.durabilidade || 100),
      imagem: editandoItem.imagem || "",
      tipoDano: editandoItem.tipoDano || "Nenhum",
      consumivel: editandoItem.consumivel || "Nenhum",
      consumivelValor: editandoItem.consumivelValor || 0,
      variedades: editandoItem.variedades || [],
    });
    setEditandoItem(null);
  };

  const deletarItem = async (id) => {
    if (!window.confirm("☠️ Remover este item do catálogo?")) return;
    await deleteDoc(doc(db, "clandestina_lojas", selectedLoja.id, "itens", id));
  };

  // COMPRA
  const confirmarCompra = async () => {
    if (!comprandoItem) return;
    if (!carteiraSelecionada) {
      alert("Selecione uma carteira!");
      return;
    }

    const variedades = comprandoItem.variedades || [];
    const variedadeAtual = variedades.length > 0 ? variedades[variedadeIndex] : null;

    const precoBase = Number(comprandoItem.valor || 0) + (variedadeAtual?.precoAdicional || 0);
    const precoFinal = metodoEntrega === "pneumatica"
      ? Math.ceil(precoBase * (1 + TAXA_PNEUMATICA))
      : precoBase;

    const carteiras = getCarteiras();
    const carteira = carteiras.find((c) => c.nome === carteiraSelecionada);
    if (!carteira || carteira.valor < precoFinal) {
      alert("Saldo insuficiente!");
      return;
    }

    const novasCarteiras = carteiras.map((c) =>
      c.nome === carteiraSelecionada ? { ...c, valor: c.valor - precoFinal } : c
    );

    const nomeFinal = variedadeAtual
      ? `${comprandoItem.nome} (${variedadeAtual.nome})`
      : comprandoItem.nome;

    const itemPayload = {
      nome: nomeFinal,
      quantidade: 1,
      durabilidade: variedadeAtual?.durabilidade ?? comprandoItem.durabilidade ?? 100,
      dado: variedadeAtual?.dado ?? comprandoItem.dado ?? 1,
      imagem: variedadeAtual?.imagem || comprandoItem.imagem || "",
      tipoDano: variedadeAtual?.tipoDano || comprandoItem.tipoDano || "Nenhum",
      consumivel: comprandoItem.consumivel || "Nenhum",
      consumivelValor: comprandoItem.consumivelValor || 0,
      consumivelPercentual: 100,
      insumivel: "Nenhum",
      insumivelValor: 0,
      travado: true,
      origem: "clandestina",
      lojaOrigem: selectedLoja?.nome || "",
      variedade: variedadeAtual?.nome || null,
    };

    try {
      if (metodoEntrega === "pneumatica") {
        // VAI DIRETO PRA FICHA
        const catAtual = fichaLocal[categoriaDestino] || [];
        const idxExist = catAtual.findIndex(
          (it) =>
            it.nome === itemPayload.nome &&
            (it.tipoDano || "Nenhum") === (itemPayload.tipoDano || "Nenhum") &&
            (it.dado || 1) === (itemPayload.dado || 1)
        );
        let novaCat;
        if (idxExist >= 0) {
          novaCat = catAtual.map((it, i) =>
            i === idxExist ? { ...it, quantidade: (it.quantidade || 1) + 1 } : it
          );
        } else {
          novaCat = [...catAtual, itemPayload];
        }

        await setDoc(
          doc(db, "fichas", userEmail),
          { carteiras: Array.isArray(fichaLocal.carteiras) ? novasCarteiras : novasCarteiras.reduce((a, c) => ({ ...a, [c.nome]: c.valor }), {}), [categoriaDestino]: novaCat },
          { merge: true }
        );

        alert(
          `📡 ENTREGA PNEUMÁTICA CONCLUÍDA!\n\n` +
          `📦 ${nomeFinal}\n` +
          `💸 Total pago: ${precoFinal} 💰 (inclui taxa de ${Math.round(TAXA_PNEUMATICA * 100)}%)\n\n` +
          `O item já está no seu inventário.`
        );
      } else {
        // VAI PRA LISTA DE PENDENTES
        const novoPendente = {
          id: `pend_${Date.now()}`,
          ...itemPayload,
          categoriaSugerida: categoriaDestino,
          precoPago: precoFinal,
          status: "aguardando_retirada",
          compradoEm: new Date().toISOString(),
          lojaOrigem: selectedLoja?.nome || "",
          lojaHash: selectedLoja?.hash || "",
        };

        const novosPendentes = [...pendentes, novoPendente];

        await setDoc(
          doc(db, "fichas", userEmail),
          {
            carteiras: Array.isArray(fichaLocal.carteiras) ? novasCarteiras : novasCarteiras.reduce((a, c) => ({ ...a, [c.nome]: c.valor }), {}),
            clandestina_pendentes: novosPendentes,
          },
          { merge: true }
        );

        alert(
          `📦 PEDIDO REGISTRADO!\n\n` +
          `📦 ${nomeFinal}\n` +
          `💸 Total pago: ${precoFinal} 💰\n\n` +
          `⚠️ Aguardando retirada. Procure o Mestre ou o ponto de coleta.`
        );
      }

      setComprandoItem(null);
      setCarteiraSelecionada("");
      setVariedadeIndex(0);
      setMetodoEntrega("pneumatica");
      setCategoriaDestino("equipamentos");
    } catch (err) {
      console.error(err);
      alert("Erro ao processar compra: " + err.message);
    }
  };

  const cancelarCompra = () => {
    setComprandoItem(null);
    setCarteiraSelecionada("");
    setVariedadeIndex(0);
    setMetodoEntrega("pneumatica");
  };

  return (
    <Box
      sx={{
        p: 2,
        height: "100%",
        overflowY: "auto",
        bgcolor: "#050608",
        background: `linear-gradient(180deg, #050608 0%, #0a0510 50%, #050608 100%)`,
        backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(168,85,247,0.02) 2px, rgba(168,85,247,0.02) 4px)`,
        fontFamily: "'Courier New', monospace",
        "&::-webkit-scrollbar": { width: "6px" },
        "&::-webkit-scrollbar-track": { bgcolor: "#0a0a12" },
        "&::-webkit-scrollbar-thumb": { bgcolor: "#a855f766", borderRadius: "4px" },
      }}
    >
      {/* HEADER */}
      <Box
        sx={{
          mb: 2,
          p: 2,
          bgcolor: "#0a0a12",
          border: "1px dashed #a855f7",
          borderRadius: 2,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "100%",
            background: `repeating-linear-gradient(90deg, transparent, transparent 60px, rgba(168,85,247,0.03) 60px, rgba(168,85,247,0.03) 61px)`,
            pointerEvents: "none",
          }}
        />
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 1 }}>
          <Box>
            <Typography sx={{ color: "#a855f7", fontWeight: 900, fontSize: "1.1rem", letterSpacing: 2 }}>
              🌑 DEEP_WEB://onion_network
            </Typography>
            <Typography variant="caption" sx={{ color: "#64748b", display: "block" }}>
              &gt; ROTEAMENTO ONION ATIVO • 3 RELAYS • CRIPTOGRAFIA AES-256
            </Typography>
          </Box>
          <Chip
            label={`💰 ${getCarteiras().reduce((a, c) => a + (c.valor || 0), 0).toFixed(0)}`}
            size="small"
            sx={{ bgcolor: "#fbbf2422", color: "#fbbf24", fontWeight: "bold", border: "1px solid #fbbf2466" }}
          />
        </Box>
        <Box sx={{ mt: 1, display: "flex", gap: 0.5, flexWrap: "wrap", position: "relative", zIndex: 1 }}>
          <Chip label="⚠️ USO ILEGAL" size="small" sx={{ bgcolor: "#ef444422", color: "#ef4444", fontSize: "0.6rem", height: 18, border: "1px solid #ef444466" }} />
          <Chip label="🔒 ANÔNIMO" size="small" sx={{ bgcolor: "#00ff4122", color: "#00ff41", fontSize: "0.6rem", height: 18, border: "1px solid #00ff4166" }} />
          <Chip label="📡 SEM LOGS" size="small" sx={{ bgcolor: "#a855f722", color: "#a855f7", fontSize: "0.6rem", height: 18, border: "1px solid #a855f766" }} />
        </Box>
      </Box>

      {/* LISTA DE LOJAS OU ITENS */}
      {!selectedLoja ? (
        <>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
            <Typography sx={{ color: "#a855f7", fontWeight: "bold", fontSize: "0.85rem" }}>
              🔍 {lojas.length} SERVIÇOS DISPONÍVEIS
            </Typography>
            {isMaster && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() =>
                  setEditandoLoja({ nome: "", descricao: "", icone: "🌑", reputacao: "Desconhecida" })
                }
                sx={{ color: "#a855f7", borderColor: "#a855f7", fontSize: "0.7rem" }}
              >
                Nova Loja
              </Button>
            )}
          </Box>

          {lojas.length === 0 && (
            <Paper sx={{ p: 3, bgcolor: "#0a0a12", border: "1px dashed #334155", textAlign: "center" }}>
              <Typography sx={{ color: "#64748b", fontSize: "0.85rem" }}>
                🌑 Nenhum serviço registrado ainda.
              </Typography>
              {isMaster && (
                <Typography variant="caption" sx={{ color: "#475569" }}>
                  Clique em "Nova Loja" pra criar o primeiro.
                </Typography>
              )}
            </Paper>
          )}

          <Grid container spacing={1}>
            {lojas.map((loja) => (
              <Grid item xs={12} sm={6} key={loja.id}>
                <Paper
                  onClick={() => setSelectedLoja(loja)}
                  sx={{
                    p: 1.5,
                    bgcolor: "#0a0a12",
                    border: "1px solid #a855f744",
                    borderRadius: 2,
                    cursor: "pointer",
                    position: "relative",
                    overflow: "hidden",
                    transition: "all 0.2s",
                    "&:hover": {
                      borderColor: "#a855f7",
                      bgcolor: "#12071a",
                      boxShadow: "0 0 20px #a855f744",
                      "& .glitch-text": {
                        color: "#00ff41",
                        textShadow: "0 0 8px #00ff41",
                      },
                    },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        bgcolor: "#050608",
                        borderRadius: 1,
                        border: "1px solid #a855f766",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1.5rem",
                      }}
                    >
                      {loja.icone || "🌑"}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        className="glitch-text"
                        sx={{
                          color: "#a855f7",
                          fontWeight: "bold",
                          fontSize: "0.85rem",
                          transition: "all 0.3s",
                        }}
                      >
                        {loja.nome}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#475569", display: "block", fontSize: "0.6rem", fontFamily: "monospace" }}>
                        &gt; {loja.hash ? `${loja.hash.slice(0, 16)}...onion` : "hash pendente"}
                      </Typography>
                      {loja.descricao && (
                        <Typography
                          variant="caption"
                          sx={{
                            color: "#94a3b8",
                            display: "block",
                            fontSize: "0.7rem",
                            mt: 0.3,
                            maxHeight: 30,
                            overflow: "hidden",
                          }}
                        >
                          {loja.descricao}
                        </Typography>
                      )}
                      {loja.reputacao && (
                        <Chip
                          label={loja.reputacao}
                          size="small"
                          sx={{
                            mt: 0.5,
                            height: 16,
                            fontSize: "0.55rem",
                            bgcolor: "#ef444422",
                            color: "#ef4444",
                            border: "1px solid #ef444466",
                          }}
                        />
                      )}
                    </Box>
                    {isMaster && (
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.3 }}>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditandoLoja(loja);
                          }}
                          sx={{ color: "#ff9800", p: 0.4 }}
                        >
                          <EditIcon sx={{ fontSize: "0.9rem" }} />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            deletarLoja(loja.id);
                          }}
                          sx={{ color: "#ef4444", p: 0.4 }}
                        >
                          <DeleteIcon sx={{ fontSize: "0.9rem" }} />
                        </IconButton>
                      </Box>
                    )}
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>

          {/* PENDENTES */}
          {pendentes.length > 0 && (
            <Paper sx={{ mt: 2, p: 1.5, bgcolor: "#0f0505", border: "1px dashed #ef4444", borderRadius: 2 }}>
              <Typography sx={{ color: "#ef4444", fontWeight: "bold", fontSize: "0.8rem", mb: 1 }}>
                📦 AGUARDANDO RETIRADA ({pendentes.length})
              </Typography>
              <Typography variant="caption" sx={{ color: "#94a3b8", fontSize: "0.7rem", display: "block", mb: 1 }}>
                Você pagou por estes itens. Procure o ponto de coleta ou o Mestre para retirá-los.
              </Typography>
              {pendentes.map((p) => (
                <Box key={p.id} sx={{ p: 0.8, mb: 0.5, bgcolor: "#0a0a12", borderRadius: 1, border: "1px solid #334155" }}>
                  <Typography sx={{ color: "#fbbf24", fontSize: "0.75rem", fontWeight: "bold" }}>
                    {p.nome}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#64748b", fontSize: "0.6rem" }}>
                    🏪 {p.lojaOrigem} • 💸 {p.precoPago} 💰 • 📅 {new Date(p.compradoEm).toLocaleDateString("pt-BR")}
                  </Typography>
                </Box>
              ))}
            </Paper>
          )}
        </>
      ) : (
        <>
          {/* CABEÇALHO DA LOJA */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
            <Button
              size="small"
              onClick={() => setSelectedLoja(null)}
              sx={{ color: "#94a3b8", minWidth: "auto", fontSize: "0.7rem" }}
            >
              ← Voltar
            </Button>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ color: "#a855f7", fontWeight: "bold", fontSize: "0.9rem" }}>
                {selectedLoja.icone} {selectedLoja.nome}
              </Typography>
              <Typography variant="caption" sx={{ color: "#475569", fontSize: "0.6rem", fontFamily: "monospace" }}>
                &gt; {selectedLoja.hash}.onion
              </Typography>
            </Box>
            {isMaster && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() =>
                  setEditandoItem({
                    nome: "",
                    descricao: "",
                    valor: 0,
                    dado: 1,
                    durabilidade: 100,
                    imagem: "",
                    tipoDano: "Nenhum",
                    consumivel: "Nenhum",
                    insumivel: "Nenhum",
                    variedades: [],
                  })
                }
                sx={{ color: "#a855f7", borderColor: "#a855f7", fontSize: "0.7rem" }}
              >
                Novo Item
              </Button>
            )}
          </Box>

          {itens.length === 0 && (
            <Paper sx={{ p: 3, bgcolor: "#0a0a12", border: "1px dashed #334155", textAlign: "center" }}>
              <Typography sx={{ color: "#64748b", fontSize: "0.85rem" }}>
                📦 Nenhum item catalogado nesta loja.
              </Typography>
            </Paper>
          )}

          <Grid container spacing={1}>
            {itens.map((item) => {
              const variedades = item.variedades || [];
              const precoPneu = Math.ceil(Number(item.valor || 0) * (1 + TAXA_PNEUMATICA));
              return (
                <Grid item xs={12} key={item.id}>
                  <Paper
                    sx={{
                      p: 1.5,
                      bgcolor: "#0a0a12",
                      border: "1px solid #334155",
                      borderRadius: 2,
                      transition: "all 0.2s",
                      "&:hover": { borderColor: "#a855f7", boxShadow: "0 0 15px #a855f722" },
                    }}
                  >
                    <Box sx={{ display: "flex", gap: 1.5 }}>
                      <Box sx={{ width: 70, flexShrink: 0 }}>
                        {item.imagem ? (
                          <img
                            src={normalizarUrl(item.imagem)}
                            alt={item.nome}
                            loading="lazy"
                            decoding="async"
                            style={{
                              width: 70,
                              height: 70,
                              borderRadius: 6,
                              objectFit: "cover",
                              cursor: "pointer",
                              border: "1px solid #a855f744",
                            }}
                            onClick={() => {
                              setLightboxImage(normalizarUrl(item.imagem));
                              setZoom(1);
                            }}
                          />
                        ) : (
                          <Box
                            sx={{
                              width: 70,
                              height: 70,
                              bgcolor: "#050608",
                              borderRadius: 1,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "2rem",
                              border: "1px solid #334155",
                            }}
                          >
                            📦
                          </Box>
                        )}
                        {variedades.length > 0 && (
                          <Chip
                            label={`🎨 ${variedades.length}`}
                            size="small"
                            sx={{
                              mt: 0.5,
                              width: "100%",
                              bgcolor: "#a855f722",
                              color: "#a855f7",
                              fontSize: "0.55rem",
                              height: 16,
                              fontWeight: "bold",
                            }}
                          />
                        )}
                      </Box>

                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ color: "#fff", fontWeight: "bold", fontSize: "0.85rem", mb: 0.3 }}>
                          {item.nome}
                        </Typography>
                        {item.descricao && (
                          <Typography
                            variant="caption"
                            sx={{
                              color: "#94a3b8",
                              display: "block",
                              fontSize: "0.7rem",
                              maxHeight: 50,
                              overflowY: "auto",
                            }}
                          >
                            {item.descricao}
                          </Typography>
                        )}
                        <Box sx={{ mt: 0.5, display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                          <Chip
                            label={`⚔️ ${item.dado || 1}d10`}
                            size="small"
                            sx={{ height: 16, fontSize: "0.55rem", bgcolor: "#050608", color: "#94a3b8" }}
                          />
                          <Chip
                            label={`🔧 ${item.durabilidade || 100}%`}
                            size="small"
                            sx={{ height: 16, fontSize: "0.55rem", bgcolor: "#050608", color: "#94a3b8" }}
                          />
                          {item.tipoDano && item.tipoDano !== "Nenhum" && (
                            <Chip
                              label={item.tipoDano}
                              size="small"
                              sx={{
                                height: 16,
                                fontSize: "0.55rem",
                                bgcolor: "#050608",
                                color: TIPOS_DANO.find((t) => t.valor === item.tipoDano)?.cor || "#94a3b8",
                              }}
                            />
                          )}
                        </Box>
                      </Box>

                      <Box sx={{ textAlign: "right", minWidth: 110 }}>
                        <Typography sx={{ color: "#fbbf24", fontWeight: "bold", fontSize: "0.85rem" }}>
                          💰 {item.valor}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#00ff41", display: "block", fontSize: "0.6rem" }}>
                          📡 {precoPneu} c/ pneumática
                        </Typography>
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => {
                            setComprandoItem({ ...item });
                            setCarteiraSelecionada("");
                            setVariedadeIndex(0);
                            setMetodoEntrega("pneumatica");
                            setCategoriaDestino("equipamentos");
                          }}
                          sx={{
                            mt: 0.5,
                            bgcolor: "#a855f7",
                            color: "#fff",
                            fontSize: "0.65rem",
                            fontWeight: "bold",
                            "&:hover": { bgcolor: "#7b1fa2" },
                          }}
                        >
                          ☠️ Adquirir
                        </Button>
                        {isMaster && (
                          <Box sx={{ display: "flex", gap: 0.3, mt: 0.3, justifyContent: "flex-end" }}>
                            <IconButton
                              size="small"
                              onClick={() => setEditandoItem(item)}
                              sx={{ color: "#ff9800", p: 0.3 }}
                            >
                              <EditIcon sx={{ fontSize: "0.8rem" }} />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => deletarItem(item.id)}
                              sx={{ color: "#ef4444", p: 0.3 }}
                            >
                              <DeleteIcon sx={{ fontSize: "0.8rem" }} />
                            </IconButton>
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </>
      )}

      {/* MODAL DE EDIÇÃO DE LOJA */}
      <Dialog
        open={!!editandoLoja}
        onClose={() => setEditandoLoja(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { bgcolor: "#0a0a12", border: "1px solid #a855f7", borderRadius: 2 } }}
      >
        <DialogTitle sx={{ color: "#a855f7", borderBottom: "1px solid #a855f733", fontSize: "0.9rem", fontWeight: "bold" }}>
          {editandoLoja?.id ? "✏️ Editar Loja" : "➕ Nova Loja Clandestina"}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mt: 1 }}>
            <TextField
              fullWidth
              size="small"
              label="Nome da loja"
              value={editandoLoja?.nome || ""}
              onChange={(e) => setEditandoLoja((p) => ({ ...p, nome: e.target.value }))}
              InputProps={{ sx: { color: "#fff" } }}
              InputLabelProps={{ sx: { color: "#94a3b8" } }}
            />
            <TextField
              fullWidth
              size="small"
              label="Ícone (emoji)"
              value={editandoLoja?.icone || "🌑"}
              onChange={(e) => setEditandoLoja((p) => ({ ...p, icone: e.target.value }))}
              InputProps={{ sx: { color: "#fff" } }}
              InputLabelProps={{ sx: { color: "#94a3b8" } }}
            />
            <TextField
              fullWidth
              size="small"
              label="Reputação"
              value={editandoLoja?.reputacao || ""}
              onChange={(e) => setEditandoLoja((p) => ({ ...p, reputacao: e.target.value }))}
              placeholder="Ex: Perigosa, Confiável, Desconhecida..."
              InputProps={{ sx: { color: "#fff" } }}
              InputLabelProps={{ sx: { color: "#94a3b8" } }}
            />
            <TextField
              fullWidth
              size="small"
              label="Descrição"
              multiline
              rows={2}
              value={editandoLoja?.descricao || ""}
              onChange={(e) => setEditandoLoja((p) => ({ ...p, descricao: e.target.value }))}
              InputProps={{ sx: { color: "#fff" } }}
              InputLabelProps={{ sx: { color: "#94a3b8" } }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: "1px solid #334155" }}>
          <Button onClick={() => setEditandoLoja(null)} sx={{ color: "#94a3b8" }}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={salvarLoja} sx={{ bgcolor: "#a855f7" }}>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODAL DE EDIÇÃO DE ITEM */}
      <Dialog
        open={!!editandoItem}
        onClose={() => setEditandoItem(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { bgcolor: "#0a0a12", border: "1px solid #a855f7", borderRadius: 2 } }}
      >
        <DialogTitle sx={{ color: "#a855f7", borderBottom: "1px solid #a855f733", fontSize: "0.9rem", fontWeight: "bold" }}>
          {editandoItem?.id ? "✏️ Editar Item" : "➕ Novo Item"}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mt: 1 }}>
            <TextField
              fullWidth
              size="small"
              label="Nome"
              value={editandoItem?.nome || ""}
              onChange={(e) => setEditandoItem((p) => ({ ...p, nome: e.target.value }))}
              InputProps={{ sx: { color: "#fff" } }}
              InputLabelProps={{ sx: { color: "#94a3b8" } }}
            />
            <TextField
              fullWidth
              size="small"
              label="Descrição"
              multiline
              rows={2}
              value={editandoItem?.descricao || ""}
              onChange={(e) => setEditandoItem((p) => ({ ...p, descricao: e.target.value }))}
              InputProps={{ sx: { color: "#fff" } }}
              InputLabelProps={{ sx: { color: "#94a3b8" } }}
            />
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Valor (💰)"
                  value={editandoItem?.valor || 0}
                  onChange={(e) => setEditandoItem((p) => ({ ...p, valor: Number(e.target.value) || 0 }))}
                  InputProps={{ sx: { color: "#fbbf24" } }}
                  InputLabelProps={{ sx: { color: "#94a3b8" } }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Dado (1-10)"
                  value={editandoItem?.dado || 1}
                  onChange={(e) =>
                    setEditandoItem((p) => ({
                      ...p,
                      dado: Math.min(10, Math.max(1, Number(e.target.value) || 1)),
                    }))
                  }
                  InputProps={{ sx: { color: "#fff" } }}
                  InputLabelProps={{ sx: { color: "#94a3b8" } }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Durabilidade (%)"
                  value={editandoItem?.durabilidade || 100}
                  onChange={(e) =>
                    setEditandoItem((p) => ({
                      ...p,
                      durabilidade: Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                    }))
                  }
                  InputProps={{ sx: { color: "#fff" } }}
                  InputLabelProps={{ sx: { color: "#94a3b8" } }}
                />
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel sx={{ color: "#94a3b8" }}>Tipo Dano</InputLabel>
                  <Select
                    value={editandoItem?.tipoDano || "Nenhum"}
                    onChange={(e) => setEditandoItem((p) => ({ ...p, tipoDano: e.target.value }))}
                    sx={{ color: "#fff" }}
                    label="Tipo Dano"
                  >
                    {TIPOS_DANO.map((td) => (
                      <MenuItem key={td.valor} value={td.valor} sx={{ color: td.cor }}>
                        {td.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ color: "#94a3b8" }}>Consumível</InputLabel>
              <Select
                value={editandoItem?.consumivel || "Nenhum"}
                onChange={(e) => setEditandoItem((p) => ({ ...p, consumivel: e.target.value }))}
                sx={{ color: "#fff" }}
                label="Consumível"
              >
                {TIPOS_CONSUMIVEL.map((tc) => (
                  <MenuItem key={tc.valor} value={tc.valor} sx={{ color: tc.cor }}>
                    {tc.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button size="small" variant="outlined" component="label" sx={{ color: "#94a3b8", borderColor: "#555" }}>
              📷 Upload Imagem
              <input
                hidden
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const url = await uploadImagem(file);
                  if (url) setEditandoItem((p) => ({ ...p, imagem: url }));
                }}
              />
            </Button>
            {editandoItem?.imagem && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <img
                  src={editandoItem.imagem}
                  alt="Preview"
                  style={{ width: 50, height: 50, borderRadius: 6, objectFit: "cover" }}
                />
                <Button
                  size="small"
                  onClick={() => setEditandoItem((p) => ({ ...p, imagem: "" }))}
                  sx={{ color: "#ef4444" }}
                >
                  Remover
                </Button>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: "1px solid #334155" }}>
          <Button onClick={() => setEditandoItem(null)} sx={{ color: "#94a3b8" }}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={salvarItem} sx={{ bgcolor: "#a855f7" }}>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODAL DE COMPRA — PNEUMÁTICA ou RETIRADA */}
      <Dialog
        open={!!comprandoItem}
        onClose={cancelarCompra}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { bgcolor: "#0a0a12", border: "1px dashed #a855f7", borderRadius: 2 } }}
      >
        <DialogTitle
          sx={{
            color: "#a855f7",
            borderBottom: "1px solid #a855f733",
            fontSize: "0.9rem",
            fontWeight: "bold",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>☠️ ADQUIRIR ITEM</span>
          <IconButton size="small" onClick={cancelarCompra} sx={{ color: "#94a3b8" }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: 2 }}>
          {comprandoItem &&
            (() => {
              const variedades = comprandoItem.variedades || [];
              const temVariedades = variedades.length > 0;
              const variedadeAtual = temVariedades ? variedades[variedadeIndex] : null;
              const precoBase = Number(comprandoItem.valor || 0) + (variedadeAtual?.precoAdicional || 0);
              const precoPneu = Math.ceil(precoBase * (1 + TAXA_PNEUMATICA));
              const precoFinal = metodoEntrega === "pneumatica" ? precoPneu : precoBase;
              const imgMostrar = variedadeAtual?.imagem || comprandoItem.imagem || "";
              const nomeMostrar = variedadeAtual
                ? `${comprandoItem.nome} (${variedadeAtual.nome})`
                : comprandoItem.nome;

              return (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <Box sx={{ display: "flex", gap: 1.5 }}>
                    {imgMostrar && (
                      <img
                        src={normalizarUrl(imgMostrar)}
                        alt={nomeMostrar}
                        style={{
                          width: 90,
                          height: 90,
                          objectFit: "cover",
                          borderRadius: 8,
                          border: "1px solid #a855f744",
                          cursor: "zoom-in",
                        }}
                        onClick={() => {
                          setLightboxImage(normalizarUrl(imgMostrar));
                          setZoom(1);
                        }}
                      />
                    )}
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ color: "#fff", fontWeight: "bold", fontSize: "0.9rem" }}>
                        {nomeMostrar}
                      </Typography>
                      {comprandoItem.descricao && (
                        <Typography variant="caption" sx={{ color: "#94a3b8", display: "block", fontSize: "0.7rem" }}>
                          {comprandoItem.descricao}
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  {/* VARIEDADES */}
                  {temVariedades && (
                    <Paper sx={{ p: 1.5, bgcolor: "#050608", border: "1px dashed #a855f7", borderRadius: 2 }}>
                      <Typography sx={{ color: "#a855f7", fontWeight: "bold", fontSize: "0.75rem", mb: 1 }}>
                        🎨 VARIEDADE ({variedadeIndex + 1}/{variedades.length})
                      </Typography>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <IconButton
                          size="small"
                          onClick={() => setVariedadeIndex((i) => (i - 1 + variedades.length) % variedades.length)}
                          disabled={variedades.length <= 1}
                          sx={{ bgcolor: "#a855f7", color: "#fff" }}
                        >
                          ‹
                        </IconButton>
                        <Box sx={{ flex: 1, textAlign: "center" }}>
                          <Typography sx={{ color: "#fff", fontWeight: "bold", fontSize: "0.85rem" }}>
                            {variedadeAtual?.nome || "—"}
                          </Typography>
                          {variedadeAtual?.descricao && (
                            <Typography variant="caption" sx={{ color: "#94a3b8", fontSize: "0.65rem" }}>
                              {variedadeAtual.descricao}
                            </Typography>
                          )}
                          {variedadeAtual?.precoAdicional > 0 && (
                            <Chip
                              label={`+💰 ${variedadeAtual.precoAdicional}`}
                              size="small"
                              sx={{ mt: 0.5, bgcolor: "#fbbf2422", color: "#fbbf24", fontSize: "0.6rem", height: 16 }}
                            />
                          )}
                        </Box>
                        <IconButton
                          size="small"
                          onClick={() => setVariedadeIndex((i) => (i + 1) % variedades.length)}
                          disabled={variedades.length <= 1}
                          sx={{ bgcolor: "#a855f7", color: "#fff" }}
                        >
                          ›
                        </IconButton>
                      </Box>
                    </Paper>
                  )}

                  {/* MÉTODO DE ENTREGA */}
                  <Box>
                    <Typography sx={{ color: "#a855f7", fontWeight: "bold", fontSize: "0.75rem", mb: 1 }}>
                      📡 MÉTODO DE ENTREGA
                    </Typography>
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Paper
                          onClick={() => setMetodoEntrega("pneumatica")}
                          sx={{
                            p: 1.5,
                            cursor: "pointer",
                            bgcolor: metodoEntrega === "pneumatica" ? "#0a1f10" : "#050608",
                            border: metodoEntrega === "pneumatica" ? "1px solid #00ff41" : "1px solid #334155",
                            borderRadius: 2,
                            transition: "all 0.2s",
                            "&:hover": { borderColor: "#00ff41" },
                          }}
                        >
                          <Typography sx={{ color: "#00ff41", fontWeight: "bold", fontSize: "0.8rem", mb: 0.5 }}>
                            🚀 PNEUMÁTICA
                          </Typography>
                          <Typography variant="caption" sx={{ color: "#94a3b8", fontSize: "0.65rem", display: "block" }}>
                            Chega instantaneamente pelo tubo de vácuo.
                          </Typography>
                          <Typography sx={{ color: "#fbbf24", fontWeight: "bold", fontSize: "0.7rem", mt: 0.5 }}>
                            + {Math.round(TAXA_PNEUMATICA * 100)}% de taxa
                          </Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={6}>
                        <Paper
                          onClick={() => setMetodoEntrega("retirada")}
                          sx={{
                            p: 1.5,
                            cursor: "pointer",
                            bgcolor: metodoEntrega === "retirada" ? "#1a0f05" : "#050608",
                            border: metodoEntrega === "retirada" ? "1px solid #fbbf24" : "1px solid #334155",
                            borderRadius: 2,
                            transition: "all 0.2s",
                            "&:hover": { borderColor: "#fbbf24" },
                          }}
                        >
                          <Typography sx={{ color: "#fbbf24", fontWeight: "bold", fontSize: "0.8rem", mb: 0.5 }}>
                            📦 RETIRADA
                          </Typography>
                          <Typography variant="caption" sx={{ color: "#94a3b8", fontSize: "0.65rem", display: "block" }}>
                            Você busca no ponto de coleta.
                          </Typography>
                          <Typography sx={{ color: "#00ff41", fontWeight: "bold", fontSize: "0.7rem", mt: 0.5 }}>
                            Sem taxa extra
                          </Typography>
                        </Paper>
                      </Grid>
                    </Grid>
                  </Box>

                  {/* CARTEIRA + DESTINO */}
                  <FormControl fullWidth size="small">
                    <InputLabel sx={{ color: "#94a3b8" }}>💰 Carteira</InputLabel>
                    <Select
                      value={carteiraSelecionada}
                      onChange={(e) => setCarteiraSelecionada(e.target.value)}
                      sx={{ color: "#fff" }}
                      label="💰 Carteira"
                    >
                      {getCarteiras().map((c) => (
                        <MenuItem key={c.nome} value={c.nome}>
                          {c.nome} — 💰 {c.valor}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {metodoEntrega === "pneumatica" && (
                    <FormControl fullWidth size="small">
                      <InputLabel sx={{ color: "#94a3b8" }}>Categoria Destino</InputLabel>
                      <Select
                        value={categoriaDestino}
                        onChange={(e) => setCategoriaDestino(e.target.value)}
                        sx={{ color: "#fff" }}
                        label="Categoria Destino"
                      >
                        <MenuItem value="equipamentos">⚔️ Equipamentos</MenuItem>
                        <MenuItem value="vestes">👕 Vestimentas</MenuItem>
                        <MenuItem value="diversos">📦 Diversos</MenuItem>
                      </Select>
                    </FormControl>
                  )}

                  {metodoEntrega === "retirada" && (
                    <Paper sx={{ p: 1, bgcolor: "#1a0f05", border: "1px dashed #fbbf2466", borderRadius: 1 }}>
                      <Typography variant="caption" sx={{ color: "#fbbf24", fontSize: "0.7rem" }}>
                        ⚠️ O item ficará como PENDENTE na sua ficha. Procure o Mestre ou o ponto de coleta para retirar.
                      </Typography>
                    </Paper>
                  )}

                  {/* RESUMO */}
                  <Paper sx={{ p: 1.5, bgcolor: "#050608", border: "1px solid #a855f744", borderRadius: 2 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                      <Typography variant="caption" sx={{ color: "#94a3b8" }}>Preço base:</Typography>
                      <Typography variant="caption" sx={{ color: "#fff" }}>{precoBase} 💰</Typography>
                    </Box>
                    {metodoEntrega === "pneumatica" && (
                      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                        <Typography variant="caption" sx={{ color: "#94a3b8" }}>Taxa pneumática:</Typography>
                        <Typography variant="caption" sx={{ color: "#fbbf24" }}>+{precoPneu - precoBase} 💰</Typography>
                      </Box>
                    )}
                    <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1, pt: 1, borderTop: "1px solid #334155" }}>
                      <Typography sx={{ color: "#a855f7", fontWeight: "bold", fontSize: "0.8rem" }}>TOTAL:</Typography>
                      <Typography sx={{ color: "#fbbf24", fontWeight: "bold", fontSize: "0.9rem" }}>{precoFinal} 💰</Typography>
                    </Box>
                  </Paper>
                </Box>
              );
            })()}
        </DialogContent>

        <DialogActions sx={{ p: 2, borderTop: "1px solid #334155" }}>
          <Button onClick={cancelarCompra} sx={{ color: "#94a3b8" }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={confirmarCompra}
            sx={{
              bgcolor: metodoEntrega === "pneumatica" ? "#00ff41" : "#fbbf24",
              color: "#000",
              fontWeight: "bold",
              "&:hover": { bgcolor: metodoEntrega === "pneumatica" ? "#00cc33" : "#d97706" },
            }}
          >
            {metodoEntrega === "pneumatica" ? "🚀 Confirmar Entrega" : "📦 Confirmar Pedido"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* LIGHTBOX */}
      {lightboxImage && (
        <Box
          onClick={() => setLightboxImage(null)}
          sx={{
            position: "fixed",
            inset: 0,
            bgcolor: "rgba(0,0,0,0.95)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999999,
          }}
        >
          <img
            src={lightboxImage}
            alt="ampliada"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "90%",
              maxHeight: "90%",
              borderRadius: 10,
              cursor: "zoom-out",
            }}
          />
        </Box>
      )}
    </Box>
  );
}

export default React.memo(RedesClandestinas);