import React, { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Box, Paper, Typography, IconButton, Button, TextField, Divider,
  FormControl, InputLabel, Select, MenuItem, Dialog, DialogTitle,
  DialogContent, DialogActions, Grid, Chip, Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import { db } from "../firebaseConfig";
import { collection, doc, getDocs, setDoc, deleteDoc, onSnapshot, getDoc, updateDoc } from "firebase/firestore";

// ==================== CONSTANTES ====================
const IMGBB_API_KEY = "73fcf242ce0108665fa0c9e9de33bd50";
// 🟢 TIPOS DE DANO DISPONÍVEIS
const TIPOS_DANO = [
  { valor: "Nenhum", label: "Nenhum (sem efeito)", cor: "#888888" },
  { valor: "Ácido", label: "Ácido", cor: "#7fff00" },
  { valor: "Contundente", label: "Contundente", cor: "#a0522d" },
  { valor: "Cortante", label: "Cortante", cor: "#c0c0c0" },
  { valor: "Elétrico", label: "Elétrico", cor: "#ffff00" },
  { valor: "Aurano", label: "Aurano", cor: "#00e0ff" },
  { valor: "Gélido", label: "Gélido", cor: "#87ceeb" },
  { valor: "Térmico", label: "Térmico", cor: "#ff4500" },
  { valor: "Perfurante", label: "Perfurante", cor: "#daa520" },
  { valor: "Psíquico", label: "Psíquico", cor: "#ff69b4" },
  { valor: "Trovejante", label: "Trovejante", cor: "#4169e1" },
  { valor: "Tóxico", label: "Tóxico", cor: "#8b008b" },
];

// ==================== LIGHTBOX ====================
function LightboxImage({ src, zoom, setZoom }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [start, setStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    e.preventDefault();
    setDragging(true);
    setStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!dragging) return;
      setPosition({ x: e.clientX - start.x, y: e.clientY - start.y });
    };
    const handleMouseUp = () => setDragging(false);
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
      onWheel={(e) => {
        e.preventDefault();
        setZoom((z) => Math.min(Math.max(z + e.deltaY * -0.001, 0.5), 5));
      }}
      style={{
        transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
        transition: dragging ? "none" : "transform 0.2s ease",
        maxWidth: "90%", maxHeight: "90%", borderRadius: 10,
        cursor: dragging ? "grabbing" : "grab", userSelect: "none",
      }}
    />
  );
}

// ==================== COMMERCE HUD PRINCIPAL ====================
function CommerceHUD({ isMaster = false, visible = false, onClose = () => {}, currentUserEmail = null }) {
  if (!visible) return null;

  // 🟢 ESTADOS DE NAVEGAÇÃO
  const [paises, setPaises] = useState([]);
  const [cidades, setCidades] = useState([]);
  const [lojas, setLojas] = useState([]);
  const [itens, setItens] = useState([]);
  const [fichasMap, setFichasMap] = useState({});

  const [selectedPais, setSelectedPais] = useState(null);
  const [selectedCidade, setSelectedCidade] = useState(null);
  const [selectedLoja, setSelectedLoja] = useState(null);

  // 🟢 ESTADOS DE EDIÇÃO (MESTRE)
  const [editandoPais, setEditandoPais] = useState(null);
  const [editandoCidade, setEditandoCidade] = useState(null);
  const [editandoLoja, setEditandoLoja] = useState(null);
  const [editandoItem, setEditandoItem] = useState(null);

  // 🟢 CAMPOS DE FORMULÁRIO
  const [novoPaisNome, setNovoPaisNome] = useState("");
  const [novaCidadeNome, setNovaCidadeNome] = useState("");
  const [novaLojaNome, setNovaLojaNome] = useState("");

  // 🟢 LIGHTBOX
  const [lightboxImage, setLightboxImage] = useState(null);
  const [zoom, setZoom] = useState(1);

  // 🟢 COMPRA
  const [comprandoItem, setComprandoItem] = useState(null);
  const [carteiraSelecionada, setCarteiraSelecionada] = useState("");
  const [categoriaDestinoCompra, setCategoriaDestinoCompra] = useState("equipamentos");

  // ==================== CARREGAR FICHAS ====================
  useEffect(() => {
    if (!currentUserEmail) return;
    const unsub = onSnapshot(collection(db, "fichas"), (snap) => {
      const map = {};
      snap.forEach((d) => { map[d.id] = d.data(); });
      setFichasMap(map);
    });
    return () => unsub();
  }, [currentUserEmail]);

  // ==================== CARREGAR PAÍSES ====================
  const carregarPaises = useCallback(async () => {
  const snap = await getDocs(collection(db, "comercio_paises"));
  setPaises(snap.docs.map(d => ({ id: d.id, ...d.data() })));
}, []);

  useEffect(() => { carregarPaises(); }, [carregarPaises]);

  // ==================== CARREGAR CIDADES ====================
  const carregarCidades = useCallback(async (paisId) => {
  if (!paisId) { setCidades([]); return; }
  const snap = await getDocs(collection(db, "comercio_paises", paisId, "cidades"));
  setCidades(snap.docs.map(d => ({ id: d.id, ...d.data() })));
}, []);

  // ==================== CARREGAR LOJAS ====================
  const carregarLojas = useCallback(async (paisId, cidadeId) => {
  if (!paisId || !cidadeId) { setLojas([]); return; }
  const snap = await getDocs(collection(db, "comercio_paises", paisId, "cidades", cidadeId, "lojas"));
  setLojas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
}, []);

  // ==================== CARREGAR ITENS ====================
    const carregarItens = useCallback(async (paisId, cidadeId, lojaId) => {
  if (!paisId || !cidadeId || !lojaId) { setItens([]); return; }
  const unsub = onSnapshot(
    collection(db, "comercio_paises", paisId, "cidades", cidadeId, "lojas", lojaId, "itens"),
      (snap) => {
        const dados = snap.docs.map(d => ({ 
          id: d.id, 
          ...d.data(),
          tipoDano: d.data().tipoDano || "Nenhum" // 🟢 Garante tipoDano
        }));
        dados.sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
        setItens(dados);
      }
    );
    return () => unsub();
  }, []);

  // ==================== NAVEGAÇÃO ====================
  const selecionarPais = (pais) => {
    setSelectedPais(pais);
    setSelectedCidade(null);
    setSelectedLoja(null);
    setItens([]);
    carregarCidades(pais.id);
  };

  const selecionarCidade = (cidade) => {
    setSelectedCidade(cidade);
    setSelectedLoja(null);
    setItens([]);
    carregarLojas(selectedPais.id, cidade.id);
  };

  const selecionarLoja = (loja) => {
    setSelectedLoja(loja);
    carregarItens(selectedPais.id, selectedCidade.id, loja.id);
  };

  // ==================== CRUD PAÍS ====================
  const salvarPais = async () => {
  if (!novoPaisNome.trim()) {
    alert("Digite um nome para o país!");
    return;
  }
  
  try {
    const id = novoPaisNome.trim().toLowerCase().replace(/\s+/g, '_');
    console.log("🌍 Salvando país:", id, novoPaisNome);
    
    await setDoc(doc(db, "comercio_paises", id), {
      nome: novoPaisNome.trim(),
      bandeira: "",
    });
    
    console.log("✅ País salvo com sucesso!");
    setNovoPaisNome("");
    await carregarPaises();
  } catch (err) {
    console.error("❌ Erro ao salvar país:", err);
    alert("Erro ao salvar país: " + err.message);
  }
};

  const deletarPais = async (id) => {
  if (!window.confirm("Deletar este país e TODAS as cidades, lojas e itens?")) return;
  await deleteDoc(doc(db, "comercio_paises", id));
  if (selectedPais?.id === id) { setSelectedPais(null); setSelectedCidade(null); setSelectedLoja(null); }
  carregarPaises();
};

  const uploadBandeira = async (paisId) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: fd });
      const data = await res.json();
      if (data?.success) {
        await setDoc(doc(db, "comercio_paises", paisId), { bandeira: data.data.url }, { merge: true });
        carregarPaises();
      }
    };
    input.click();
  };

  // ==================== CRUD CIDADE ====================
  const salvarCidade = async () => {
    if (!novaCidadeNome.trim() || !selectedPais) return;
    const id = editandoCidade?.id || novaCidadeNome.trim().toLowerCase().replace(/\s+/g, '_');
    await setDoc(doc(db, "comercio_paises", selectedPais.id, "cidades", id), {
  nome: novaCidadeNome.trim(),
});
    setEditandoCidade(null);
    setNovaCidadeNome("");
    carregarCidades(selectedPais.id);
  };

  const deletarCidade = async (id) => {
    if (!window.confirm("Deletar esta cidade e TODAS as lojas e itens?")) return;
    await deleteDoc(doc(db, "comercio_paises", selectedPais.id, "cidades", id));
    if (selectedCidade?.id === id) { setSelectedCidade(null); setSelectedLoja(null); }
    carregarCidades(selectedPais.id);
  };

  // ==================== CRUD LOJA ====================
  const salvarLoja = async () => {
    if (!novaLojaNome.trim() || !selectedPais || !selectedCidade) return;
    const id = editandoLoja?.id || novaLojaNome.trim().toLowerCase().replace(/\s+/g, '_');
    await setDoc(doc(db, "comercio_paises", selectedPais.id, "cidades", selectedCidade.id, "lojas", id), {
      nome: novaLojaNome.trim(),
      donoNome: editandoLoja?.donoNome || "",
      donoImagem: editandoLoja?.donoImagem || "",
      donoDescricao: editandoLoja?.donoDescricao || "",
    });
    setEditandoLoja(null);
    setNovaLojaNome("");
    carregarLojas(selectedPais.id, selectedCidade.id);
  };

  const deletarLoja = async (id) => {
    if (!window.confirm("Deletar esta loja e TODOS os itens?")) return;
    await deleteDoc(doc(db, "comercio_paises", selectedPais.id, "cidades", selectedCidade.id, "lojas", id));
    if (selectedLoja?.id === id) setSelectedLoja(null);
    carregarLojas(selectedPais.id, selectedCidade.id);
  };

  // ==================== CRUD ITEM ====================
  const salvarItem = async (e) => {
    e?.preventDefault();
    if (!selectedPais || !selectedCidade || !selectedLoja) return;

    const nome = e?.target?.nome?.value || editandoItem?.nome;
    if (!nome?.trim()) return alert("Nome do item é obrigatório!");

    const id = editandoItem?.id || Date.now().toString();
        const payload = {
      nome: nome.trim(),
      descricao: e?.target?.descricao?.value || editandoItem?.descricao || "",
      valor: Number(e?.target?.valor?.value || editandoItem?.valor || 0),
      dado: Number(e?.target?.dado?.value || editandoItem?.dado || 1),
      durabilidade: Number(e?.target?.durabilidade?.value || editandoItem?.durabilidade || 100),
      estoque: Number(e?.target?.estoque?.value || editandoItem?.estoque || 1),
      imagem: editandoItem?.imagem || "",
      ordem: editandoItem?.ordem || itens.length,
      comprasRecentes: editandoItem?.comprasRecentes || 0,
      tipoDano: editandoItem?.tipoDano || "Nenhum", // 🟢 ADICIONADO
    };

        await setDoc(
      doc(db, "comercio_paises", selectedPais.id, "cidades", selectedCidade.id, "lojas", selectedLoja.id, "itens", id),
      payload
    );
    setEditandoItem(null);
  };

    const deletarItem = async (id) => {
    if (!window.confirm("Remover este item?")) return;
    await deleteDoc(doc(db, "comercio_paises", selectedPais.id, "cidades", selectedCidade.id, "lojas", selectedLoja.id, "itens", id));
  };

  const uploadImagemItem = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: fd });
      const data = await res.json();
      if (data?.success) {
        setEditandoItem(prev => ({ ...prev, imagem: data.data.url }));
      }
    };
    input.click();
  };

  // ==================== COMPRA ====================
  const comprarItem = async () => {
    if (!comprandoItem || !currentUserEmail) return;
    if (!carteiraSelecionada) { alert("Selecione uma carteira!"); return; }

    const ficha = fichasMap[currentUserEmail];
    if (!ficha) { alert("Ficha não encontrada!"); return; }

    const carteiras = ficha.carteiras || [];
    const carteira = carteiras.find(c => c.nome === carteiraSelecionada);
    if (!carteira || carteira.valor < comprandoItem.precoFinal) {
      alert("Saldo insuficiente!");
      return;
    }

    // Desconta dinheiro
    const novasCarteiras = carteiras.map(c =>
      c.nome === carteiraSelecionada ? { ...c, valor: c.valor - comprandoItem.precoFinal } : c
    );

        // Adiciona item ao inventário
    const novoItem = {
      nome: comprandoItem.nome,
      quantidade: 1,
      durabilidade: comprandoItem.durabilidade || 100,
      dado: comprandoItem.dado || 1,
      imagem: comprandoItem.imagem || "",
      tipoDano: comprandoItem.tipoDano || "Nenhum", // 🟢 ADICIONADO
    };

    const categoriaItens = [...(ficha[categoriaDestinoCompra] || []), novoItem];

    // Atualiza Firestore
    await updateDoc(doc(db, "fichas", currentUserEmail), {
      carteiras: novasCarteiras,
      [categoriaDestinoCompra]: categoriaItens,
    });

    // Diminui estoque em 1
    const novoEstoque = (comprandoItem.estoque || 1) - 1;
    const comprasRecentes = (comprandoItem.comprasRecentes || 0) + 1;

        if (novoEstoque <= 0) {
      await deleteDoc(doc(db, "comercio_paises", selectedPais.id, "cidades", selectedCidade.id, "lojas", selectedLoja.id, "itens", comprandoItem.id));
    } else {
      await updateDoc(doc(db, "comercio_paises", selectedPais.id, "cidades", selectedCidade.id, "lojas", selectedLoja.id, "itens", comprandoItem.id), {
        estoque: novoEstoque,
        comprasRecentes,
      });
    }

    alert(`✅ "${comprandoItem.nome}" comprado por ${comprandoItem.precoFinal} 💰!`);
    setComprandoItem(null);
    setCarteiraSelecionada("");
  };

  // ==================== RENDER ====================
  const hud = (
    <Paper
      elevation={10}
      sx={{
        position: "fixed", top: 80, left: 280, width: 480, maxHeight: "85vh",
        p: 2, overflowY: "auto", zIndex: 200,
        bgcolor: "#1a1a2e", color: "#fff", borderRadius: 2,
        border: "1px solid #334155",
      }}
    >
      {/* CABEÇALHO */}
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
        <Typography variant="h6">🏪 Comércio</Typography>
        <IconButton onClick={onClose} sx={{ color: "#ef4444" }}><CloseIcon /></IconButton>
      </Box>
      <Divider sx={{ mb: 2, borderColor: "#334155" }} />

      {/* ============================================================ */}
      {/* CAMADA 1 - PAÍSES */}
      {/* ============================================================ */}
      {!selectedPais && (
        <>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>🌍 Selecione um País:</Typography>
          {isMaster && (
            <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
              <TextField 
  size="small" 
  label="Novo país" 
  value={novoPaisNome} 
  onChange={e => setNovoPaisNome(e.target.value)} 
  fullWidth 
  InputProps={{ style: { color: '#fff' } }}
  InputLabelProps={{ style: { color: '#94a3b8' } }}
  sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#334155' }, '&:hover fieldset': { borderColor: '#475569' } } }}
/>
              <Button variant="contained" onClick={salvarPais}><AddIcon /></Button>
            </Box>
          )}
          <Grid container spacing={1}>
            {paises.map(p => (
              <Grid item xs={6} key={p.id}>
                <Paper sx={{ p: 1.5, cursor: "pointer", bgcolor: "#0f172a", "&:hover": { bgcolor: "#1e3a5f" } }} onClick={() => selecionarPais(p)}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {p.bandeira ? <img src={p.bandeira} alt="" style={{ width: 32, height: 24, borderRadius: 2 }} /> : <span>🏳️</span>}
                    <Typography variant="body2" sx={{ flex: 1, color: '#fff' }}>{p.nome}</Typography>
                    {isMaster && (
                      <Box>
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); setEditandoPais(p); setNovoPaisNome(p.nome); }}><EditIcon fontSize="small" /></IconButton>
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); deletarPais(p.id); }}><DeleteIcon fontSize="small" color="error" /></IconButton>
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); uploadBandeira(p.id); }}>🏳️</IconButton>
                      </Box>
                    )}
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </>
      )}

      {/* ============================================================ */}
      {/* CAMADA 2 - CIDADES */}
      {/* ============================================================ */}
      {selectedPais && !selectedCidade && (
        <>
          <Button onClick={() => { setSelectedPais(null); setCidades([]); }}>← Voltar</Button>
          <Typography variant="h6" sx={{ mt: 1, mb: 2, color: '#fff' }}>🏙️ Cidades de {selectedPais.nome}</Typography>
          {isMaster && (
            <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
              <TextField 
  size="small" 
  label="Nova cidade" 
  value={novaCidadeNome} 
  onChange={e => setNovaCidadeNome(e.target.value)} 
  fullWidth 
  InputProps={{ style: { color: '#fff' } }}
  InputLabelProps={{ style: { color: '#94a3b8' } }}
  sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#334155' }, '&:hover fieldset': { borderColor: '#475569' } } }}
/>
              <Button variant="contained" onClick={salvarCidade}><AddIcon /></Button>
            </Box>
          )}
          <Grid container spacing={1}>
            {cidades.map(c => (
              <Grid item xs={6} key={c.id}>
                <Paper sx={{ p: 1.5, cursor: "pointer", bgcolor: "#0f172a", "&:hover": { bgcolor: "#1e3a5f" } }} onClick={() => selecionarCidade(c)}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Typography variant="body2" sx={{ color: '#fff' }}>🏙️ {c.nome}</Typography>
                    {isMaster && (
                      <Box>
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); setEditandoCidade(c); setNovaCidadeNome(c.nome); }}><EditIcon fontSize="small" /></IconButton>
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); deletarCidade(c.id); }}><DeleteIcon fontSize="small" color="error" /></IconButton>
                      </Box>
                    )}
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </>
      )}

      {/* ============================================================ */}
      {/* CAMADA 3 - LOJAS */}
      {/* ============================================================ */}
      {selectedPais && selectedCidade && !selectedLoja && (
        <>
          <Button onClick={() => { setSelectedCidade(null); setLojas([]); }}>← Voltar</Button>
          <Typography variant="h6" sx={{ mt: 1, mb: 2, color: '#fff' }}>🏪 Lojas de {selectedCidade.nome}</Typography>
          {isMaster && (
            <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
              <TextField 
  size="small" 
  label="Nova loja" 
  value={novaLojaNome} 
  onChange={e => setNovaLojaNome(e.target.value)} 
  fullWidth 
  InputProps={{ style: { color: '#fff' } }}
  InputLabelProps={{ style: { color: '#94a3b8' } }}
  sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#334155' }, '&:hover fieldset': { borderColor: '#475569' } } }}
/>
              <Button variant="contained" onClick={() => { setEditandoLoja({}); setNovaLojaNome(""); }}><AddIcon /></Button>
            </Box>
          )}
          <Grid container spacing={1}>
            {lojas.map(l => (
              <Grid item xs={12} key={l.id}>
                <Paper sx={{ p: 2, cursor: "pointer", bgcolor: "#0f172a", "&:hover": { bgcolor: "#1e3a5f" } }} onClick={() => selecionarLoja(l)}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    {l.donoImagem ? (
                      <img src={l.donoImagem} alt="" style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", cursor: "pointer" }}
                        onClick={(e) => { e.stopPropagation(); setLightboxImage(l.donoImagem); setZoom(1); }} />
                    ) : (
                      <Box sx={{ width: 48, height: 48, borderRadius: "50%", bgcolor: "#334155", display: "flex", alignItems: "center", justifyContent: "center" }}>👤</Box>
                    )}
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: "bold", color: '#fff' }}>{l.nome}</Typography>
                      {l.donoNome && <Typography variant="caption" sx={{ color: "#94a3b8" }}>👤 {l.donoNome}</Typography>}
                    </Box>
                    {isMaster && (
                      <Box>
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); setEditandoLoja(l); setNovaLojaNome(l.nome); }}><EditIcon fontSize="small" /></IconButton>
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); deletarLoja(l.id); }}><DeleteIcon fontSize="small" color="error" /></IconButton>
                      </Box>
                    )}
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>

          {/* Modal editar loja */}
          {editandoLoja && (
            <Dialog open={!!editandoLoja} onClose={() => setEditandoLoja(null)} maxWidth="sm" fullWidth
  PaperProps={{ sx: { bgcolor: '#1a1a2e', color: '#fff' } }}>
              <DialogTitle>{editandoLoja.id ? "Editar Loja" : "Nova Loja"}</DialogTitle>
              <DialogContent>
                <TextField label="Nome da loja" fullWidth value={novaLojaNome} onChange={e => setNovaLojaNome(e.target.value)} sx={{ mt: 1 }} 
  InputProps={{ style: { color: '#fff' } }} InputLabelProps={{ style: { color: '#94a3b8' } }} />
               <TextField label="Nome do dono" fullWidth value={editandoLoja?.donoNome || ""} onChange={e => setEditandoLoja(p => ({ ...p, donoNome: e.target.value }))} sx={{ mt: 2 }}
  InputProps={{ style: { color: '#fff' } }} InputLabelProps={{ style: { color: '#94a3b8' } }} />
               <TextField label="Descrição do dono" fullWidth multiline rows={2} value={editandoLoja?.donoDescricao || ""} onChange={e => setEditandoLoja(p => ({ ...p, donoDescricao: e.target.value }))} sx={{ mt: 2 }}
  InputProps={{ style: { color: '#fff' } }} InputLabelProps={{ style: { color: '#94a3b8' } }} />
                <Box sx={{ mt: 2 }}>
                  <Button variant="outlined" onClick={async () => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = "image/*";
                    input.onchange = async () => {
                      const file = input.files[0];
                      if (!file) return;
                      const fd = new FormData();
                      fd.append("image", file);
                      const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: fd });
                      const data = await res.json();
                      if (data?.success) setEditandoLoja(p => ({ ...p, donoImagem: data.data.url }));
                    };
                    input.click();
                  }}>📷 Foto do Dono</Button>
                  {editandoLoja?.donoImagem && <img src={editandoLoja.donoImagem} alt="" style={{ width: 64, height: 64, borderRadius: "50%", marginTop: 8, cursor: "pointer" }} onClick={() => { setLightboxImage(editandoLoja.donoImagem); setZoom(1); }} />}
                </Box>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setEditandoLoja(null)}>Cancelar</Button>
                <Button variant="contained" onClick={salvarLoja}>Salvar</Button>
              </DialogActions>
            </Dialog>
          )}
        </>
      )}

      {/* ============================================================ */}
      {/* CAMADA 4 - ITENS */}
      {/* ============================================================ */}
      {selectedPais && selectedCidade && selectedLoja && (
        <>
          <Button onClick={() => { setSelectedLoja(null); setItens([]); }}>← Voltar</Button>

          {/* INFO DO DONO */}
          {selectedLoja.donoNome && (
            <Paper sx={{ p: 2, mt: 2, mb: 2, bgcolor: "#16213e", display: "flex", gap: 2, alignItems: "center" }}>
              {selectedLoja.donoImagem ? (
                <img src={selectedLoja.donoImagem} alt="" style={{ width: 56, height: 56, borderRadius: "50%", cursor: "pointer" }} onClick={() => { setLightboxImage(selectedLoja.donoImagem); setZoom(1); }} />
              ) : (
                <Box sx={{ width: 56, height: 56, borderRadius: "50%", bgcolor: "#334155", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem" }}>👤</Box>
              )}
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: "bold", color: '#fff' }}>{selectedLoja.donoNome}</Typography>
                <Typography variant="caption" sx={{ color: "#94a3b8" }}>{selectedLoja.donoDescricao || "Bem-vindo à minha loja!"}</Typography>
              </Box>
            </Paper>
          )}

          <Typography variant="h6" sx={{ mb: 2, color: '#fff' }}>🛒 {selectedLoja.nome} - Itens</Typography>

          {isMaster && (
            <Button variant="contained" startIcon={<AddIcon />} sx={{ mb: 2 }} onClick={() => setEditandoItem({ id: null, nome: "", descricao: "", valor: 0, dado: 1, durabilidade: 100, estoque: 1, imagem: "" })}>
              Adicionar Item
            </Button>
          )}

          <Grid container spacing={2}>
            {itens.map((item) => {
              // 🟢 OFERTA E DEMANDA
              const comprasRecentes = item.comprasRecentes || 0;
              const fatorDemanda = 1 + (comprasRecentes * 0.05); // +5% por compra recente
              const variacao = 0.3; // ±30%
              const fatorVariacao = 1 + (Math.sin(Date.now() / 3600000) * variacao);
              const precoFinal = Math.round((item.valor || 0) * fatorDemanda * fatorVariacao);

              return (
                <Grid item xs={12} key={item.id}>
                  <Paper sx={{ p: 2, bgcolor: "#0f172a", border: "1px solid #334155" }}>
                    <Box sx={{ display: "flex", gap: 2 }}>
                      {item.imagem ? (
                        <img src={item.imagem} alt="" style={{ width: 80, height: 80, borderRadius: 8, objectFit: "cover", cursor: "pointer" }}
                          onClick={() => { setLightboxImage(item.imagem); setZoom(1); }} />
                      ) : (
                        <Box sx={{ width: 80, height: 80, borderRadius: 2, bgcolor: "#1e293b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem" }}>📦</Box>
                      )}
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: "bold", color: '#fff' }}>{item.nome}</Typography>
                        <Typography variant="caption" sx={{ color: "#94a3b8", display: "block" }}>{item.descricao}</Typography>
                        <Box sx={{ display: "flex", gap: 1, mt: 1, flexWrap: "wrap" }}>
                                                    <Chip label={`⚔️ Dado: ${item.dado || 1}`} size="small" sx={{ bgcolor: "#1e3a5f" }} />
                          <Chip label={`🔧 Dur: ${item.durabilidade || 100}%`} size="small" sx={{ bgcolor: "#1e3a5f" }} />
                          {item.tipoDano && item.tipoDano !== "Nenhum" && (
                            <Chip 
                              label={`🗡️ ${item.tipoDano}`} 
                              size="small" 
                              sx={{ 
                                bgcolor: TIPOS_DANO.find(t => t.valor === item.tipoDano)?.cor + "33" || "#1e3a5f",
                                color: TIPOS_DANO.find(t => t.valor === item.tipoDano)?.cor || "#fff",
                                border: `1px solid ${TIPOS_DANO.find(t => t.valor === item.tipoDano)?.cor || "#334155"}`,
                              }} 
                            />
                          )}
                          <Chip label={`📦 Estoque: ${item.estoque || 0}`} size="small" sx={{ bgcolor: item.estoque > 0 ? "#1b5e20" : "#5e1b1b" }} />
                        </Box>
                      </Box>
                      <Box sx={{ textAlign: "right", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                        <Box>
                          <Typography variant="h6" sx={{ color: "#fbbf24", fontWeight: "bold" }}>
                            💰 {precoFinal}
                          </Typography>
                          {precoFinal !== (item.valor || 0) && (
                            <Typography variant="caption" sx={{ color: precoFinal > (item.valor || 0) ? "#ef4444" : "#4caf50" }}>
                              {precoFinal > (item.valor || 0) ? "📈" : "📉"} Base: {item.valor}
                            </Typography>
                          )}
                        </Box>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<ShoppingCartIcon />}
                          disabled={(item.estoque || 0) <= 0}
                          onClick={() => {
                            setComprandoItem({ ...item, precoFinal });
                            setCarteiraSelecionada("");
                            setCategoriaDestinoCompra("equipamentos");
                          }}
                          sx={{ bgcolor: "#2e7d32", "&:hover": { bgcolor: "#1b5e20" } }}
                        >
                          Comprar
                        </Button>
                        {isMaster && (
                          <Box sx={{ display: "flex", gap: 0.5, mt: 0.5 }}>
                            <IconButton size="small" onClick={() => setEditandoItem(item)}><EditIcon fontSize="small" /></IconButton>
                            <IconButton size="small" onClick={() => deletarItem(item.id)}><DeleteIcon fontSize="small" color="error" /></IconButton>
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>

          {itens.length === 0 && <Typography sx={{ color: "#94a3b8", textAlign: "center", mt: 2 }}>Nenhum item disponível.</Typography>}

          {/* Modal comprar item */}
          {comprandoItem && (
            <Dialog open={!!comprandoItem} onClose={() => setComprandoItem(null)} maxWidth="xs" fullWidth
  PaperProps={{ sx: { bgcolor: '#1a1a2e', color: '#fff' } }}>
              <DialogTitle>🛒 Comprar: {comprandoItem.nome}</DialogTitle>
              <DialogContent>
                <Typography variant="h5" sx={{ color: "#fbbf24", mb: 2 }}>💰 {comprandoItem.precoFinal}</Typography>
                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
  <InputLabel sx={{ color: '#94a3b8' }}>Carteira</InputLabel>
  <Select value={carteiraSelecionada} onChange={e => setCarteiraSelecionada(e.target.value)}
    sx={{ color: '#fff', '.MuiOutlinedInput-notchedOutline': { borderColor: '#334155' } }}>
                    {(fichasMap[currentUserEmail]?.carteiras || []).map(c => (
                      <MenuItem key={c.nome} value={c.nome}>{c.nome} (💰 {c.valor})</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth size="small">
  <InputLabel sx={{ color: '#94a3b8' }}>Categoria</InputLabel>
  <Select value={categoriaDestinoCompra} onChange={e => setCategoriaDestinoCompra(e.target.value)}
    sx={{ color: '#fff', '.MuiOutlinedInput-notchedOutline': { borderColor: '#334155' } }}>
                    <MenuItem value="equipamentos">⚔️ Equipamentos</MenuItem>
                    <MenuItem value="vestes">👕 Vestimentas</MenuItem>
                    <MenuItem value="diversos">📦 Diversos</MenuItem>
                  </Select>
                </FormControl>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setComprandoItem(null)}>Cancelar</Button>
                <Button variant="contained" onClick={comprarItem} sx={{ bgcolor: "#2e7d32" }}>Confirmar Compra</Button>
              </DialogActions>
            </Dialog>
          )}

          {/* Modal editar item */}
          {editandoItem && (
            <Dialog open={!!editandoItem} onClose={() => setEditandoItem(null)} maxWidth="sm" fullWidth
  PaperProps={{ sx: { bgcolor: '#1a1a2e', color: '#fff' } }}>
              <DialogTitle>{editandoItem.id ? "Editar Item" : "Novo Item"}</DialogTitle>
              <DialogContent>
                <form id="form-item" onSubmit={salvarItem}>
                  <TextField 
  label="Nome" 
  name="nome" 
  fullWidth 
  defaultValue={editandoItem.nome} 
  sx={{ mt: 1 }} 
  InputProps={{ style: { color: '#fff' } }}
  InputLabelProps={{ style: { color: '#94a3b8' } }}
/>
                  <TextField label="Descrição" name="descricao" fullWidth multiline rows={2} defaultValue={editandoItem.descricao} sx={{ mt: 2 }}
  InputProps={{ style: { color: '#fff' } }} InputLabelProps={{ style: { color: '#94a3b8' } }} />
                  <TextField label="Valor base (💰)" name="valor" fullWidth type="number" defaultValue={editandoItem.valor} sx={{ mt: 2 }}
  InputProps={{ style: { color: '#fff' } }} InputLabelProps={{ style: { color: '#94a3b8' } }} />
                  <TextField label="Dado" name="dado" fullWidth type="number" defaultValue={editandoItem.dado || 1} sx={{ mt: 2 }}
  InputProps={{ style: { color: '#fff' } }} InputLabelProps={{ style: { color: '#94a3b8' } }} />
                 <TextField label="Durabilidade (%)" name="durabilidade" fullWidth type="number" defaultValue={editandoItem.durabilidade || 100} sx={{ mt: 2 }}
  InputProps={{ style: { color: '#fff' } }} InputLabelProps={{ style: { color: '#94a3b8' } }} />
                  <TextField label="Estoque" name="estoque" fullWidth type="number" defaultValue={editandoItem.estoque || 1} sx={{ mt: 2 }}
  InputProps={{ style: { color: '#fff' } }} InputLabelProps={{ style: { color: '#94a3b8' } }} />
                                    {/* 🟢 TIPO DE DANO */}
                  <FormControl fullWidth size="small" sx={{ mt: 2 }}>
                    <InputLabel sx={{ color: '#94a3b8' }}>Tipo de Dano</InputLabel>
                    <Select
                      value={editandoItem?.tipoDano || "Nenhum"}
                      label="Tipo de Dano"
                      onChange={(e) => setEditandoItem(prev => ({ ...prev, tipoDano: e.target.value }))}
                      sx={{ 
                        color: TIPOS_DANO.find(t => t.valor === (editandoItem?.tipoDano || "Nenhum"))?.cor || '#888',
                        '.MuiOutlinedInput-notchedOutline': { borderColor: '#334155' },
                      }}
                      MenuProps={{
                        PaperProps: { 
                          sx: { 
                            bgcolor: "#0f172a", 
                            color: "#fff",
                            maxHeight: 300,
                          } 
                        }
                      }}
                    >
                      {TIPOS_DANO.map(td => (
                        <MenuItem key={td.valor} value={td.valor}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: td.cor }} />
                            <Typography sx={{ color: td.cor, fontWeight: 'bold' }}>
                              {td.label}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  
                  <Box sx={{ mt: 2 }}>
                    <Button variant="outlined" onClick={uploadImagemItem}>📷 Upload Imagem</Button>
                    {editandoItem.imagem && <img src={editandoItem.imagem} alt="" style={{ width: 80, height: 80, borderRadius: 8, marginTop: 8, cursor: "pointer" }} onClick={() => { setLightboxImage(editandoItem.imagem); setZoom(1); }} />}
                  </Box>
                </form>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setEditandoItem(null)}>Cancelar</Button>
                <Button variant="contained" type="submit" form="form-item">Salvar</Button>
              </DialogActions>
            </Dialog>
          )}
        </>
      )}

      {/* Lightbox */}
      {lightboxImage && (
        <Box onClick={() => setLightboxImage(null)} sx={{ position: "fixed", inset: 0, bgcolor: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <LightboxImage src={lightboxImage} zoom={zoom} setZoom={setZoom} />
        </Box>
      )}
    </Paper>
  );

  if (typeof document !== "undefined") return createPortal(hud, document.body);
  return hud;
}

export default React.memo(CommerceHUD);