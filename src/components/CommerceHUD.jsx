// src/components/CommerceHUD.jsx
import React, { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Box, Paper, Typography, IconButton, Button, TextField,
  FormControl, InputLabel, Select, MenuItem, Dialog, DialogTitle,
  DialogContent, DialogActions, Grid, Chip, InputAdornment,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import SearchIcon from "@mui/icons-material/Search";
import { db } from "../firebaseConfig";
import { collection, doc, getDocs, setDoc, deleteDoc, onSnapshot, updateDoc } from "firebase/firestore";

const IMGBB_API_KEY = "73fcf242ce0108665fa0c9e9de33bd50";

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

const TIPOS_CONSUMIVEL = [
  { valor: "Nenhum", label: "Nenhum", cor: "#888888" },
  { valor: "PV", label: "PV (Vida)", cor: "#ff4d4f" },
  { valor: "PE", label: "PE (Energia)", cor: "#facc15" },
  { valor: "RE", label: "R.E (Remover Efeito)", cor: "#00e0ff" },
];

const TIPOS_INSUMIVEL = [
  { valor: "Nenhum", label: "Nenhum", cor: "#888888" },
  { valor: "Cortante/Perfurante", label: "🪨 Pedra de Amolar", cor: "#c0c0c0" },
  { valor: "Elétrico", label: "🔋 Bateria", cor: "#ffff00" },
  { valor: "Térmico", label: "⛽ Combustível", cor: "#ff4500" },
  { valor: "Vestimenta_Leve", label: "🧵 Remendo (até 15)", cor: "#8B4513" },
  { valor: "Vestimenta_Pesada", label: "🔨 Kit de Forja (16-50)", cor: "#A0522D" },
  { valor: "Todos", label: "🔄 Regenerar Tudo", cor: "#00ff88" },
];

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
    <img src={src} alt="ampliada" onClick={(e) => e.stopPropagation()} onMouseDown={handleMouseDown}
      onWheel={(e) => { e.preventDefault(); setZoom((z) => Math.min(Math.max(z + e.deltaY * -0.001, 0.5), 5)); }}
      style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`, transition: dragging ? "none" : "transform 0.2s ease", maxWidth: "90%", maxHeight: "90%", borderRadius: 10, cursor: dragging ? "grabbing" : "grab", userSelect: "none" }}
    />
  );
}

function CommerceHUD({ isMaster = false, visible = false, onClose = () => {}, currentUserEmail = null }) {

  if (!visible) return null;

  const [paises, setPaises] = useState([]);
  const [cidades, setCidades] = useState([]);
  const [lojas, setLojas] = useState([]);
  const [itens, setItens] = useState([]);
  const [fichasMap, setFichasMap] = useState({});
  const [selectedPais, setSelectedPais] = useState(null);
  const [selectedCidade, setSelectedCidade] = useState(null);
  const [selectedLoja, setSelectedLoja] = useState(null);

  const [editandoPais, setEditandoPais] = useState(null);
  const [editandoCidade, setEditandoCidade] = useState(null);
  const [editandoLoja, setEditandoLoja] = useState(null);
  const [editandoItem, setEditandoItem] = useState(null);
  const [novoPaisNome, setNovoPaisNome] = useState("");
  const [novaCidadeNome, setNovaCidadeNome] = useState("");
  const [novaLojaNome, setNovaLojaNome] = useState("");

  const [lightboxImage, setLightboxImage] = useState(null);
  const [zoom, setZoom] = useState(1);

  const [comprandoItem, setComprandoItem] = useState(null);
  const [carteiraSelecionada, setCarteiraSelecionada] = useState("");
  const [categoriaDestinoCompra, setCategoriaDestinoCompra] = useState("equipamentos");

  const [minimizado, setMinimizado] = useState(() => {
    try { return JSON.parse(localStorage.getItem('commerceHUD_minimizado') || 'false'); } catch { return false; }
  });
  const [posicao, setPosicao] = useState(() => {
    try { return JSON.parse(localStorage.getItem('commerceHUD_posicao') || 'null') || { x: 280, y: 80 }; } catch { return { x: 280, y: 80 }; }
  });
  const [tamanho, setTamanho] = useState(() => {
    try { return JSON.parse(localStorage.getItem('commerceHUD_tamanho') || 'null') || { width: 520, height: 600 }; } catch { return { width: 520, height: 600 }; }
  });
  const [arrastando, setArrastando] = useState(false);
  const [redimensionando, setRedimensionando] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const [mostrarNav, setMostrarNav] = useState(true);

  const [termoBusca, setTermoBusca] = useState("");
  const [resultadosBusca, setResultadosBusca] = useState([]);
  const [demandaMap, setDemandaMap] = useState({});

  useEffect(() => { localStorage.setItem('commerceHUD_posicao', JSON.stringify(posicao)); }, [posicao]);
  useEffect(() => { localStorage.setItem('commerceHUD_tamanho', JSON.stringify(tamanho)); }, [tamanho]);
  useEffect(() => { localStorage.setItem('commerceHUD_minimizado', JSON.stringify(minimizado)); }, [minimizado]);

  useEffect(() => {
    if (!currentUserEmail) return;
    const unsub = onSnapshot(collection(db, "fichas"), (snap) => {
      const map = {};
      snap.forEach((d) => { map[d.id] = d.data(); });
      setFichasMap(map);
    });
    return () => unsub();
  }, [currentUserEmail]);

  const carregarPaises = useCallback(async () => {
    const snap = await getDocs(collection(db, "comercio_paises"));
    setPaises(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }, []);
  useEffect(() => { carregarPaises(); }, [carregarPaises]);

  const carregarCidades = useCallback(async (paisId) => {
    if (!paisId) { setCidades([]); return; }
    const snap = await getDocs(collection(db, "comercio_paises", paisId, "cidades"));
    setCidades(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }, []);

  const carregarLojas = useCallback(async (paisId, cidadeId) => {
    if (!paisId || !cidadeId) { setLojas([]); return; }
    const snap = await getDocs(collection(db, "comercio_paises", paisId, "cidades", cidadeId, "lojas"));
    setLojas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }, []);

  const carregarItens = useCallback(async (paisId, cidadeId, lojaId) => {
    if (!paisId || !cidadeId || !lojaId) { setItens([]); return; }
    const unsub = onSnapshot(
      collection(db, "comercio_paises", paisId, "cidades", cidadeId, "lojas", lojaId, "itens"),
      (snap) => {
        const dados = snap.docs.map(d => ({
          id: d.id, ...d.data(),
          tipoDano: d.data().tipoDano || "Nenhum",
          consumivel: d.data().consumivel || "Nenhum",
          consumivelValor: d.data().consumivelValor || 0,
          consumivelPercentual: d.data().consumivelPercentual || 100,
          insumivel: d.data().insumivel || "Nenhum",
          insumivelValor: d.data().insumivelValor || 0,
        }));
        dados.sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
        setItens(dados);
      }
    );
    return () => unsub();
  }, []);

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

  const realizarBusca = async (termo) => {
    if (!termo || termo.length < 1) {
      setResultadosBusca([]);
      setMostrarNav(true);
      return;
    }
    const termoLower = termo.toLowerCase();
    const resultados = [];
    let idCounter = 0;
    for (const p of paises) {
      if (p.nome?.toLowerCase().startsWith(termoLower)) {
        resultados.push({ id: `pais_${idCounter++}`, tipo: 'pais', nome: p.nome, data: p, icone: '🌍' });
      }
      const cidadesSnap = await getDocs(collection(db, "comercio_paises", p.id, "cidades"));
      for (const cd of cidadesSnap.docs) {
        const cidadeData = cd.data();
        if (cidadeData.nome?.toLowerCase().startsWith(termoLower)) {
          resultados.push({ id: `cidade_${idCounter++}`, tipo: 'cidade', nome: cidadeData.nome, data: { ...cidadeData, id: cd.id, paisId: p.id, paisNome: p.nome }, icone: '🏙️' });
        }
        const lojasSnap = await getDocs(collection(db, "comercio_paises", p.id, "cidades", cd.id, "lojas"));
        for (const lj of lojasSnap.docs) {
          const lojaData = lj.data();
          if (lojaData.nome?.toLowerCase().startsWith(termoLower) || lojaData.donoNome?.toLowerCase().startsWith(termoLower)) {
            resultados.push({ id: `loja_${idCounter++}`, tipo: 'loja', nome: lojaData.nome, data: { ...lojaData, id: lj.id, paisId: p.id, cidadeId: cd.id, cidadeNome: cidadeData.nome, paisNome: p.nome }, icone: '🏪' });
          }
          const itensSnap = await getDocs(collection(db, "comercio_paises", p.id, "cidades", cd.id, "lojas", lj.id, "itens"));
          for (const it of itensSnap.docs) {
            const itemData = it.data();
            if (itemData.nome?.toLowerCase().startsWith(termoLower)) {
              resultados.push({ id: `item_${idCounter++}`, tipo: 'item', nome: itemData.nome, data: { ...itemData, id: it.id, paisId: p.id, cidadeId: cd.id, lojaId: lj.id, lojaNome: lojaData.nome, cidadeNome: cidadeData.nome, paisNome: p.nome }, icone: '📦' });
            }
          }
        }
      }
    }
    setResultadosBusca(resultados);
    setMostrarNav(resultados.length === 0);
  };

  const navegarParaResultado = async (resultado) => {
    setTermoBusca("");
    setResultadosBusca([]);
    setMostrarNav(true);
    if (resultado.tipo === 'pais') {
      selecionarPais(resultado.data);
    } else if (resultado.tipo === 'cidade') {
      const pais = paises.find(p => p.id === resultado.data.paisId);
      if (pais) {
        setSelectedPais(pais);
        await carregarCidades(pais.id);
        setSelectedCidade({ id: resultado.data.id, ...resultado.data });
        carregarLojas(pais.id, resultado.data.id);
      }
    } else if (resultado.tipo === 'loja') {
      const pais = paises.find(p => p.id === resultado.data.paisId);
      if (pais) {
        setSelectedPais(pais);
        await carregarCidades(pais.id);
        setSelectedCidade({ id: resultado.data.cidadeId, nome: resultado.data.cidadeNome });
        await carregarLojas(pais.id, resultado.data.cidadeId);
        setSelectedLoja({ id: resultado.data.id, ...resultado.data });
        carregarItens(pais.id, resultado.data.cidadeId, resultado.data.id);
      }
    } else if (resultado.tipo === 'item') {
      const pais = paises.find(p => p.id === resultado.data.paisId);
      if (pais) {
        setSelectedPais(pais);
        await carregarCidades(pais.id);
        setSelectedCidade({ id: resultado.data.cidadeId, nome: resultado.data.cidadeNome });
        await carregarLojas(pais.id, resultado.data.cidadeId);
        setSelectedLoja({ id: resultado.data.lojaId, nome: resultado.data.lojaNome });
        carregarItens(pais.id, resultado.data.cidadeId, resultado.data.lojaId);
      }
    }
  };

  const salvarPais = async () => {
    if (!novoPaisNome.trim()) { alert("Digite um nome para o país!"); return; }
    try {
      const id = editandoPais?.id || novoPaisNome.trim().toLowerCase().replace(/\s+/g, '_');
      await setDoc(doc(db, "comercio_paises", id), { nome: novoPaisNome.trim(), bandeira: editandoPais?.bandeira || "" });
      setNovoPaisNome("");
      setEditandoPais(null);
      await carregarPaises();
    } catch (err) { alert("Erro ao salvar país: " + err.message); }
  };

  const deletarPais = async (id) => {
    if (!window.confirm("Deletar este país e TODAS as cidades, lojas e itens?")) return;
    await deleteDoc(doc(db, "comercio_paises", id));
    if (selectedPais?.id === id) { setSelectedPais(null); setSelectedCidade(null); setSelectedLoja(null); }
    carregarPaises();
  };

  const salvarCidade = async () => {
    if (!novaCidadeNome.trim() || !selectedPais) return;
    const id = editandoCidade?.id || novaCidadeNome.trim().toLowerCase().replace(/\s+/g, '_');
    await setDoc(doc(db, "comercio_paises", selectedPais.id, "cidades", id), { nome: novaCidadeNome.trim() });
    setEditandoCidade(null); setNovaCidadeNome("");
    carregarCidades(selectedPais.id);
  };

  const deletarCidade = async (id) => {
    if (!window.confirm("Deletar esta cidade e TODAS as lojas e itens?")) return;
    await deleteDoc(doc(db, "comercio_paises", selectedPais.id, "cidades", id));
    if (selectedCidade?.id === id) { setSelectedCidade(null); setSelectedLoja(null); }
    carregarCidades(selectedPais.id);
  };

  const salvarLoja = async () => {
    if (!novaLojaNome.trim() || !selectedPais || !selectedCidade) return;
    const id = editandoLoja?.id || novaLojaNome.trim().toLowerCase().replace(/\s+/g, '_');
    await setDoc(doc(db, "comercio_paises", selectedPais.id, "cidades", selectedCidade.id, "lojas", id), {
      nome: novaLojaNome.trim(),
      donoNome: editandoLoja?.donoNome || "",
      donoImagem: editandoLoja?.donoImagem || "",
      donoDescricao: editandoLoja?.donoDescricao || "",
    });
    setEditandoLoja(null); setNovaLojaNome("");
    carregarLojas(selectedPais.id, selectedCidade.id);
  };

  const deletarLoja = async (id) => {
    if (!window.confirm("Deletar esta loja e TODOS os itens?")) return;
    await deleteDoc(doc(db, "comercio_paises", selectedPais.id, "cidades", selectedCidade.id, "lojas", id));
    if (selectedLoja?.id === id) setSelectedLoja(null);
    carregarLojas(selectedPais.id, selectedCidade.id);
  };

  const salvarItem = async () => {
    if (!selectedPais || !selectedCidade || !selectedLoja || !editandoItem) return;
    if (!editandoItem.nome?.trim()) { alert("Nome do item é obrigatório!"); return; }
    const id = editandoItem.id || Date.now().toString();
    const payload = {
      nome: editandoItem.nome.trim(),
      descricao: editandoItem.descricao || "",
      valor: Number(editandoItem.valor || 0),
      dado: Number(editandoItem.dado || 1),
      durabilidade: Number(editandoItem.durabilidade || 100),
      estoque: Number(editandoItem.estoque || 1),
      imagem: editandoItem.imagem || "",
      ordem: editandoItem.ordem || itens.length,
      comprasRecentes: editandoItem.comprasRecentes || 0,
      tipoDano: editandoItem.tipoDano || "Nenhum",
      consumivel: editandoItem.consumivel || "Nenhum",
      consumivelValor: editandoItem.consumivelValor || 0,
      consumivelPercentual: editandoItem.consumivelPercentual || 100,
      insumivel: editandoItem.insumivel || "Nenhum",
      insumivelValor: editandoItem.insumivelValor || 0,
    };
    await setDoc(doc(db, "comercio_paises", selectedPais.id, "cidades", selectedCidade.id, "lojas", selectedLoja.id, "itens", id), payload);
    setEditandoItem(null);
  };

  const deletarItem = async (id) => {
    if (!window.confirm("Remover este item?")) return;
    await deleteDoc(doc(db, "comercio_paises", selectedPais.id, "cidades", selectedCidade.id, "lojas", selectedLoja.id, "itens", id));
  };

  const uploadImagemItem = async () => {
    const input = document.createElement("input"); input.type = "file"; input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files[0]; if (!file) return;
      const fd = new FormData(); fd.append("image", file);
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: fd });
            const data = await res.json();
      if (data?.success) setEditandoItem(prev => ({ ...prev, imagem: data.data.image?.url || data.data.url }));
    };
    input.click();
  };

  const comprarItem = async () => {
    if (!comprandoItem || !currentUserEmail) return;
    if (!carteiraSelecionada) { alert("Selecione uma carteira!"); return; }
    const ficha = fichasMap[currentUserEmail];
    if (!ficha) { alert("Ficha não encontrada!"); return; }
    const carteiras = ficha.carteiras || [];
    const carteira = carteiras.find(c => c.nome === carteiraSelecionada);
    const quantidadeComprada = comprandoItem.quantidadeCompra || 1;
    const precoTotal = comprandoItem.precoUnitario * quantidadeComprada;
    if (!carteira || carteira.valor < precoTotal) { alert("Saldo insuficiente!"); return; }
    const novasCarteiras = carteiras.map(c =>
      c.nome === carteiraSelecionada ? { ...c, valor: c.valor - precoTotal } : c
    );
    const categoriaAtual = ficha[categoriaDestinoCompra] || [];
    const itemExistenteIndex = categoriaAtual.findIndex(it => it.nome === comprandoItem.nome);
    let categoriaItens;
    if (itemExistenteIndex >= 0) {
      categoriaItens = categoriaAtual.map((it, idx) => {
        if (idx === itemExistenteIndex) return { ...it, quantidade: (it.quantidade || 1) + quantidadeComprada };
        return it;
      });
    } else {
      const novoItem = {
        nome: comprandoItem.nome, quantidade: quantidadeComprada, durabilidade: comprandoItem.durabilidade || 100,
        dado: comprandoItem.dado || 1, imagem: comprandoItem.imagem || "", tipoDano: comprandoItem.tipoDano || "Nenhum",
        consumivel: comprandoItem.consumivel || "Nenhum", consumivelValor: comprandoItem.consumivelValor || 0,
        consumivelPercentual: comprandoItem.consumivelPercentual || 100, insumivel: comprandoItem.insumivel || "Nenhum", insumivelValor: comprandoItem.insumivelValor || 0,
      };
      categoriaItens = [...categoriaAtual, novoItem];
    }
    await setDoc(doc(db, "fichas", currentUserEmail), { carteiras: novasCarteiras, [categoriaDestinoCompra]: categoriaItens }, { merge: true });
    const novoEstoque = Math.max(0, (comprandoItem.estoque || 1) - quantidadeComprada);
    const aumentoDemanda = Math.floor(Math.random() * 30) + 1;
    const agora = Date.now();
    const expiraEm = agora + (60 * 60 * 1000);
    setDemandaMap(prev => ({ ...prev, [comprandoItem.id]: { aumento: aumentoDemanda, expiraEm } }));
    await updateDoc(doc(db, "comercio_paises", selectedPais.id, "cidades", selectedCidade.id, "lojas", selectedLoja.id, "itens", comprandoItem.id), {
      estoque: novoEstoque, ultimaCompraTimestamp: agora, aumentoDemanda: aumentoDemanda,
    });
    alert(`✅ "${quantidadeComprada}x ${comprandoItem.nome}" comprado por ${precoTotal} 💰!\n🔥 Demanda aumentou +${aumentoDemanda}% por 1 hora!`);
    setComprandoItem(null);
    setCarteiraSelecionada("");
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const agora = Date.now();
      setDemandaMap(prev => {
        const novo = { ...prev };
        let mudou = false;
        for (const key in novo) {
          if (novo[key].expiraEm < agora) { delete novo[key]; mudou = true; }
        }
        return mudou ? { ...novo } : prev;
      });
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (arrastando) {
        setPosicao({ x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y });
      }
      if (redimensionando) {
        const newWidth = Math.max(400, resizeStartRef.current.width + (e.clientX - resizeStartRef.current.x));
        const newHeight = Math.max(300, resizeStartRef.current.height + (e.clientY - resizeStartRef.current.y));
        setTamanho({ width: newWidth, height: newHeight });
      }
    };
    const handleMouseUp = () => { setArrastando(false); setRedimensionando(false); };
    if (arrastando || redimensionando) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [arrastando, redimensionando]);

  return createPortal(
    <>
      <Paper
        elevation={10}
        sx={{
          position: "fixed",
          left: posicao.x,
          top: posicao.y,
          width: minimizado ? 300 : tamanho.width,
          height: minimizado ? 48 : tamanho.height,
          bgcolor: "#1a1a2e",
          color: "#fff",
          borderRadius: 2,
          border: "1px solid #334155",
          zIndex: 200,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          transition: "none",
          boxShadow: "0 8px 32px rgba(0,0,0,0.8)",
        }}
      >
        <Box
          sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 1, bgcolor: "#0f172a", cursor: "move", minHeight: 40, borderBottom: "1px solid #334155" }}
          onMouseDown={(e) => {
            if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
            e.preventDefault();
            setArrastando(true);
            dragStartRef.current = { x: e.clientX - posicao.x, y: e.clientY - posicao.y };
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <span>🏪</span>
            <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
              {minimizado ? "Comércio" : "Comércio"}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 0.5 }}>
            <IconButton size="small" onClick={() => setMinimizado(!minimizado)} sx={{ color: "#fff", p: 0.5 }}>
              {minimizado ? "□" : "−"}
            </IconButton>
            <IconButton size="small" onClick={onClose} sx={{ color: "#ef4444", p: 0.5 }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        {!minimizado && (
          <Box sx={{ flex: 1, overflowY: "auto", p: 1.5, display: "flex", flexDirection: "column" }}>
            <TextField
              size="small"
              placeholder="🔍 Pesquisar países, cidades, lojas ou itens..."
              value={termoBusca}
              onChange={(e) => { setTermoBusca(e.target.value); realizarBusca(e.target.value); }}
              fullWidth
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#94a3b8' }} /></InputAdornment>,
                style: { color: '#fff', fontSize: '0.8rem' },
              }}
              sx={{ mb: 1, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#334155' }, '&:hover fieldset': { borderColor: '#475569' } } }}
            />

            {resultadosBusca.length > 0 && (
              <Box sx={{ mb: 1, maxHeight: 300, overflowY: 'auto' }}>
                <Typography variant="caption" sx={{ color: '#94a3b8', mb: 0.5, display: 'block' }}>
                  {resultadosBusca.length} resultado(s) para "{termoBusca}"
                </Typography>
                {resultadosBusca.map(r => (
                  <Paper key={r.id} sx={{ p: 1, mb: 0.5, bgcolor: '#0f172a', cursor: 'pointer', '&:hover': { bgcolor: '#1e3a5f' } }}
                    onClick={() => navegarParaResultado(r)}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <span>{r.icone}</span>
                      <Box>
                        <Typography variant="body2" sx={{ color: '#fff', fontWeight: 'bold' }}>{r.nome}</Typography>
                        <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                          {r.tipo === 'pais' && 'País'}
                          {r.tipo === 'cidade' && `Cidade em ${r.data.paisNome}`}
                          {r.tipo === 'loja' && `Loja em ${r.data.cidadeNome}, ${r.data.paisNome}`}
                          {r.tipo === 'item' && `Item em ${r.data.lojaNome}, ${r.data.cidadeNome}`}
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                ))}
              </Box>
            )}

            {mostrarNav && (
              <>
                {!selectedPais && (
                  <>
                    <Typography variant="subtitle1" sx={{ mb: 1 }}>🌍 Selecione um País:</Typography>
                    {isMaster && (
                      <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
                        <TextField size="small" label="Novo país" value={novoPaisNome} onChange={e => setNovoPaisNome(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') salvarPais(); }} fullWidth
                          InputProps={{ style: { color: '#fff' } }} InputLabelProps={{ style: { color: '#94a3b8' } }} />
                        <Button variant="contained" onClick={salvarPais} sx={{ bgcolor: '#2e7d32' }}>Adicionar</Button>
                      </Box>
                    )}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {paises.map(p => (
                        <Paper key={p.id} sx={{ p: 1, cursor: "pointer", bgcolor: "#0f172a", "&:hover": { bgcolor: "#1e3a5f" } }}
                          onClick={() => selecionarPais(p)}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            {p.bandeira ? <img src={p.bandeira} alt="" style={{ width: 24, height: 24, borderRadius: 4, objectFit: 'cover', cursor: 'pointer' }}
                              onClick={(e) => { e.stopPropagation(); setLightboxImage(p.bandeira); setZoom(1); }} /> :
                              <Box sx={{ width: 24, height: 24, borderRadius: 1, bgcolor: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>🏳️</Box>}
                            <Typography variant="body2" sx={{ flex: 1, color: '#fff' }}>{p.nome}</Typography>
                            {isMaster && (
                              <Box sx={{ display: 'flex', gap: 0.3 }}>
                                                                <IconButton size="small" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setEditandoPais(p); setNovoPaisNome(p.nome); }}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                                                                <IconButton size="small" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); deletarPais(p.id); }}>
                                  <DeleteIcon fontSize="small" color="error" />
                                </IconButton>
                              </Box>
                            )}
                          </Box>
                        </Paper>
                      ))}
                    </Box>
                  </>
                )}

                {selectedPais && !selectedCidade && (
                  <>
                    <Button onClick={() => { setSelectedPais(null); setCidades([]); }} size="small" sx={{ color: '#94a3b8' }}>← Voltar</Button>
                    <Typography variant="subtitle1" sx={{ mt: 1, mb: 1, color: '#fff' }}>🏙️ Cidades de {selectedPais.nome}</Typography>
                    {isMaster && (
                      <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
                        <TextField size="small" label="Nova cidade" value={novaCidadeNome} onChange={e => setNovaCidadeNome(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') salvarCidade(); }} fullWidth
                          InputProps={{ style: { color: '#fff' } }} InputLabelProps={{ style: { color: '#94a3b8' } }} />
                        <Button variant="contained" onClick={salvarCidade} sx={{ bgcolor: '#2e7d32' }}>Adicionar</Button>
                      </Box>
                    )}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {cidades.map(c => (
                        <Paper key={c.id} sx={{ p: 1, cursor: "pointer", bgcolor: "#0f172a", "&:hover": { bgcolor: "#1e3a5f" } }}
                          onClick={() => selecionarCidade(c)}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Typography variant="body2" sx={{ flex: 1, color: '#fff' }}>{c.nome}</Typography>
                            {isMaster && (
                              <Box sx={{ display: 'flex', gap: 0.3 }}>
                                                                <IconButton size="small" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setEditandoCidade(c); setNovaCidadeNome(c.nome); }}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                                                                <IconButton size="small" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); deletarCidade(c.id); }}>
                                  <DeleteIcon fontSize="small" color="error" />
                                </IconButton>
                              </Box>
                            )}
                          </Box>
                        </Paper>
                      ))}
                    </Box>
                  </>
                )}

                {selectedPais && selectedCidade && !selectedLoja && (
                  <>
                    <Button onClick={() => { setSelectedCidade(null); setLojas([]); }} size="small" sx={{ color: '#94a3b8' }}>← Voltar</Button>
                    <Typography variant="subtitle1" sx={{ mt: 1, mb: 1, color: '#fff' }}>🏪 Lojas de {selectedCidade.nome}</Typography>
                    {isMaster && (
                      <Button variant="contained" startIcon={<AddIcon />} size="small" sx={{ mb: 1, bgcolor: '#2e7d32' }}
                        onClick={() => { setEditandoLoja({ id: null, nome: "", donoNome: "", donoImagem: "", donoDescricao: "" }); setNovaLojaNome(""); }}>
                        Nova Loja
                      </Button>
                    )}
                    <Grid container spacing={0.5}>
                      {lojas.map(l => (
                        <Grid item xs={12} key={l.id}>
                          <Paper sx={{ p: 1.5, cursor: "pointer", bgcolor: "#0f172a", "&:hover": { bgcolor: "#1e3a5f" } }} onClick={() => selecionarLoja(l)}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              {l.donoImagem ? <img src={l.donoImagem} alt="" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", cursor: "pointer" }}
                                onClick={(e) => { e.stopPropagation(); setLightboxImage(l.donoImagem); setZoom(1); }} /> :
                                <Box sx={{ width: 32, height: 32, borderRadius: "50%", bgcolor: "#334155", display: "flex", alignItems: "center", justifyContent: "center" }}>👤</Box>}
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="body2" sx={{ fontWeight: "bold", color: '#fff' }}>{l.nome}</Typography>
                                {l.donoNome && <Typography variant="caption" sx={{ color: "#94a3b8" }}>👤 {l.donoNome}</Typography>}
                              </Box>
                              {isMaster && (
                                <Box sx={{ display: 'flex', gap: 0.3 }}>
                                                                  <IconButton size="small" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setEditandoLoja(l); setNovaLojaNome(l.nome); }}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                                                                  <IconButton size="small" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); deletarLoja(l.id); }}>
                                  <DeleteIcon fontSize="small" color="error" />
                                </IconButton>
                                </Box>
                              )}
                            </Box>
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  </>
                )}

                {selectedPais && selectedCidade && selectedLoja && (
                  <>
                    <Button onClick={() => { setSelectedLoja(null); setItens([]); }} size="small" sx={{ color: '#94a3b8' }}>← Voltar</Button>
                    <Typography variant="subtitle1" sx={{ mb: 1, color: '#fff' }}>🛒 {selectedLoja.nome} - Itens</Typography>
                    {isMaster && (
                      <Button variant="contained" startIcon={<AddIcon />} size="small" sx={{ mb: 1, bgcolor: '#2e7d32' }}
                        onClick={() => setEditandoItem({ id: null, nome: "", descricao: "", valor: 0, dado: 1, durabilidade: 100, estoque: 1, imagem: "", tipoDano: "Nenhum", consumivel: "Nenhum", insumivel: "Nenhum" })}>
                        Adicionar Item
                      </Button>
                    )}
                    <Grid container spacing={1}>
                      {itens.map((item) => {
                        const demandaAtiva = demandaMap[item.id];
                        let fatorDemanda = 1;
                        if (demandaAtiva && demandaAtiva.expiraEm > Date.now()) {
                          fatorDemanda = 1 + (demandaAtiva.aumento / 100);
                        }
                        const seed = (item.id || "0").split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
                        const horaAtual = new Date().getHours();
                        const variacaoItem = Math.sin(seed * 7.3 + horaAtual * 2.1) * 0.4;
                        const variacaoDiaria = Math.sin(horaAtual * 0.5 + seed * 0.3) * 0.15;
                        const fatorVariacao = 1 + variacaoItem + variacaoDiaria;
                        const precoFinal = Math.round((item.valor || 0) * fatorDemanda * fatorVariacao);
                        const precoExibicao = (item.valor || 0) > 0 ? Math.max(1, precoFinal) : 0;
                        return (
                          <Grid item xs={12} key={item.id}>
                            <Paper sx={{ p: 1.5, bgcolor: "#0f172a", border: demandaAtiva ? "1px solid #ff9800" : "1px solid #334155" }}>
                              <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5, minWidth: 65 }}>
                                  {item.imagem ? <img src={item.imagem} alt="" style={{ width: 60, height: 60, borderRadius: 8, objectFit: "cover", cursor: "pointer" }}
                                    onClick={() => { setLightboxImage(item.imagem); setZoom(1); }} /> :
                                    <Box sx={{ width: 60, height: 60, borderRadius: 2, bgcolor: "#1e293b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem" }}>📦</Box>}
                                  <Chip label={`⚔️ ${item.dado || 1}`} size="small" sx={{ bgcolor: "#1e3a5f", fontSize: "0.55rem", height: 18, width: "100%" }} />
                                </Box>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Typography variant="subtitle2" sx={{ fontWeight: "bold", color: '#fff', mb: 0.3 }}>{item.nome}</Typography>
                                  <Typography variant="caption" sx={{ color: "#94a3b8", display: "block", maxHeight: 80, overflowY: "auto", whiteSpace: "pre-line", wordBreak: "break-word" }}>
                                    {item.descricao}
                                  </Typography>
                                </Box>
                                <Box sx={{ textAlign: "right", display: "flex", flexDirection: "column", justifyContent: "space-between", minWidth: 70 }}>
                                  <Box>
                                    <Typography variant="body2" sx={{ color: "#fbbf24", fontWeight: "bold" }}>💰 {precoExibicao}</Typography>
                                    {demandaAtiva && (
                                      <Typography variant="caption" sx={{ color: "#ff9800", display: "block" }}>🔥 +{demandaAtiva.aumento}%</Typography>
                                    )}
                                  </Box>
                                  {(item.estoque || 0) <= 0 ? (
                                    <Button variant="contained" size="small" disabled sx={{ bgcolor: "#5e1b1b", color: "#ff8a80", fontSize: '0.65rem', "&.Mui-disabled": { color: "#ff8a80", bgcolor: "#5e1b1b" } }}>Esgotado</Button>
                                  ) : (
                                    <Button variant="contained" size="small" startIcon={<ShoppingCartIcon sx={{ fontSize: '0.8rem' }} />}
                                      onClick={() => { setComprandoItem({ ...item, precoUnitario: precoExibicao, quantidadeCompra: 1 }); setCarteiraSelecionada(""); setCategoriaDestinoCompra("equipamentos"); }}
                                      sx={{ bgcolor: "#2e7d32", "&:hover": { bgcolor: "#1b5e20" }, fontSize: '0.65rem' }}>Comprar</Button>
                                  )}
                                  {isMaster && (
                                    <Box sx={{ display: "flex", gap: 0.3, mt: 0.3, justifyContent: 'flex-end' }}>
                                                                            <IconButton size="small" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setEditandoItem(item); }}><EditIcon sx={{ fontSize: '0.8rem' }} /></IconButton>
                                                                            <IconButton size="small" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); deletarItem(item.id); }}><DeleteIcon sx={{ fontSize: '0.8rem' }} color="error" /></IconButton>
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
                  </>
                )}
              </>
            )}
          </Box>
        )}

        {!minimizado && (
          <Box sx={{ position: "absolute", bottom: 0, right: 0, width: 16, height: 16, cursor: "nwse-resize", zIndex: 10 }}
            onMouseDown={(e) => {
              e.preventDefault(); e.stopPropagation();
              setRedimensionando(true);
              resizeStartRef.current = { x: e.clientX, y: e.clientY, width: tamanho.width, height: tamanho.height };
            }} />
        )}
      </Paper>

      {/* MODAL DE EDIÇÃO DE PAÍS */}
      <Dialog open={!!editandoPais} onClose={() => setEditandoPais(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ bgcolor: '#1a1a2e', color: '#fff' }}>✏️ Editar País</DialogTitle>
        <DialogContent sx={{ bgcolor: '#1a1a2e', pt: 2 }}>
          <TextField fullWidth size="small" label="Nome do país" value={novoPaisNome} onChange={(e) => setNovoPaisNome(e.target.value)}
            InputProps={{ style: { color: '#fff' } }} InputLabelProps={{ style: { color: '#94a3b8' } }} />
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#1a1a2e', borderTop: '1px solid #334155' }}>
          <Button onClick={() => { setEditandoPais(null); setNovoPaisNome(""); }} sx={{ color: '#94a3b8' }}>Cancelar</Button>
          <Button variant="contained" onClick={salvarPais} sx={{ bgcolor: '#2e7d32' }}>Salvar</Button>
        </DialogActions>
      </Dialog>

      {/* MODAL DE EDIÇÃO DE CIDADE */}
      <Dialog open={!!editandoCidade} onClose={() => setEditandoCidade(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ bgcolor: '#1a1a2e', color: '#fff' }}>✏️ Editar Cidade</DialogTitle>
        <DialogContent sx={{ bgcolor: '#1a1a2e', pt: 2 }}>
          <TextField fullWidth size="small" label="Nome da cidade" value={novaCidadeNome} onChange={(e) => setNovaCidadeNome(e.target.value)}
            InputProps={{ style: { color: '#fff' } }} InputLabelProps={{ style: { color: '#94a3b8' } }} />
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#1a1a2e', borderTop: '1px solid #334155' }}>
          <Button onClick={() => { setEditandoCidade(null); setNovaCidadeNome(""); }} sx={{ color: '#94a3b8' }}>Cancelar</Button>
          <Button variant="contained" onClick={salvarCidade} sx={{ bgcolor: '#2e7d32' }}>Salvar</Button>
        </DialogActions>
      </Dialog>

      {/* MODAL DE EDIÇÃO DE LOJA */}
      <Dialog open={!!editandoLoja} onClose={() => setEditandoLoja(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#1a1a2e', color: '#fff' }}>
          {editandoLoja?.id ? "✏️ Editar Loja" : "➕ Nova Loja"}
        </DialogTitle>
        <DialogContent sx={{ bgcolor: '#1a1a2e', pt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField fullWidth size="small" label="Nome da Loja" value={novaLojaNome} onChange={(e) => setNovaLojaNome(e.target.value)}
              InputProps={{ style: { color: '#fff' } }} InputLabelProps={{ style: { color: '#94a3b8' } }} />
            <TextField fullWidth size="small" label="Nome do Dono" value={editandoLoja?.donoNome || ""}
              onChange={(e) => setEditandoLoja(prev => ({ ...prev, donoNome: e.target.value }))}
              InputProps={{ style: { color: '#fff' } }} InputLabelProps={{ style: { color: '#94a3b8' } }} />
            <TextField fullWidth size="small" label="Descrição do Dono" value={editandoLoja?.donoDescricao || ""}
              onChange={(e) => setEditandoLoja(prev => ({ ...prev, donoDescricao: e.target.value }))}
              InputProps={{ style: { color: '#fff' } }} InputLabelProps={{ style: { color: '#94a3b8' } }} multiline rows={2} />
            <Button size="small" variant="outlined" component="label" sx={{ color: '#94a3b8', borderColor: '#555' }}>
              📷 Upload Imagem do Dono
              <input hidden type="file" accept="image/*" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const fd = new FormData(); fd.append("image", file);
                try {
                  const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: fd });
                                    const data = await res.json();
                  if (data?.success) setEditandoLoja(prev => ({ ...prev, donoImagem: data.data.image?.url || data.data.url }));
                } catch (err) { alert("Erro no upload"); }
              }} />
            </Button>
            {editandoLoja?.donoImagem && (
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <img src={editandoLoja.donoImagem} alt="Preview" style={{ width: 50, height: 50, borderRadius: '50%', objectFit: 'cover' }} />
                <Button size="small" onClick={() => setEditandoLoja(prev => ({ ...prev, donoImagem: "" }))} sx={{ color: '#ef4444' }}>Remover</Button>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#1a1a2e', borderTop: '1px solid #334155' }}>
          <Button onClick={() => { setEditandoLoja(null); setNovaLojaNome(""); }} sx={{ color: '#94a3b8' }}>Cancelar</Button>
          <Button variant="contained" onClick={salvarLoja} sx={{ bgcolor: '#2e7d32' }}>Salvar</Button>
        </DialogActions>
      </Dialog>

      {/* MODAL DE EDIÇÃO DE ITEM */}
      <Dialog open={!!editandoItem} onClose={() => setEditandoItem(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#1a1a2e', color: '#fff' }}>
          {editandoItem?.id ? "✏️ Editar Item" : "➕ Novo Item"}
        </DialogTitle>
        <DialogContent sx={{ bgcolor: '#1a1a2e', pt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField fullWidth size="small" label="Nome do Item" value={editandoItem?.nome || ""}
              onChange={(e) => setEditandoItem(prev => ({ ...prev, nome: e.target.value }))}
              InputProps={{ style: { color: '#fff' } }} InputLabelProps={{ style: { color: '#94a3b8' } }} />
            <TextField fullWidth size="small" label="Descrição" value={editandoItem?.descricao || ""}
              onChange={(e) => setEditandoItem(prev => ({ ...prev, descricao: e.target.value }))}
              InputProps={{ style: { color: '#fff' } }} InputLabelProps={{ style: { color: '#94a3b8' } }} multiline rows={2} />
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <TextField fullWidth size="small" label="Valor (💰)" type="number" value={editandoItem?.valor || 0}
                  onChange={(e) => setEditandoItem(prev => ({ ...prev, valor: Number(e.target.value) || 0 }))}
                  InputProps={{ style: { color: '#fbbf24' } }} InputLabelProps={{ style: { color: '#94a3b8' } }} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth size="small" label="Dado (1-10)" type="number" value={editandoItem?.dado || 1}
                  onChange={(e) => setEditandoItem(prev => ({ ...prev, dado: Math.min(10, Math.max(1, Number(e.target.value) || 1)) }))}
                  InputProps={{ style: { color: '#fff' } }} InputLabelProps={{ style: { color: '#94a3b8' } }} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth size="small" label="Durabilidade (%)" type="number" value={editandoItem?.durabilidade || 100}
                  onChange={(e) => setEditandoItem(prev => ({ ...prev, durabilidade: Math.min(100, Math.max(0, Number(e.target.value) || 0)) }))}
                  InputProps={{ style: { color: '#fff' } }} InputLabelProps={{ style: { color: '#94a3b8' } }} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth size="small" label="Estoque" type="number" value={editandoItem?.estoque || 1}
                  onChange={(e) => setEditandoItem(prev => ({ ...prev, estoque: Math.max(0, Number(e.target.value) || 0) }))}
                  InputProps={{ style: { color: '#fff' } }} InputLabelProps={{ style: { color: '#94a3b8' } }} />
              </Grid>
            </Grid>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ color: '#94a3b8' }}>Tipo de Dano</InputLabel>
              <Select value={editandoItem?.tipoDano || "Nenhum"} onChange={(e) => setEditandoItem(prev => ({ ...prev, tipoDano: e.target.value }))}
                sx={{ color: '#fff' }} label="Tipo de Dano">
                {TIPOS_DANO.map(td => <MenuItem key={td.valor} value={td.valor} sx={{ color: td.cor }}>{td.label}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ color: '#94a3b8' }}>Consumível</InputLabel>
              <Select value={editandoItem?.consumivel || "Nenhum"} onChange={(e) => setEditandoItem(prev => ({ ...prev, consumivel: e.target.value }))}
                sx={{ color: '#fff' }} label="Consumível">
                {TIPOS_CONSUMIVEL.map(tc => <MenuItem key={tc.valor} value={tc.valor} sx={{ color: tc.cor }}>{tc.label}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ color: '#94a3b8' }}>Insumível</InputLabel>
              <Select value={editandoItem?.insumivel || "Nenhum"} onChange={(e) => setEditandoItem(prev => ({ ...prev, insumivel: e.target.value }))}
                sx={{ color: '#fff' }} label="Insumível">
                {TIPOS_INSUMIVEL.map(ti => <MenuItem key={ti.valor} value={ti.valor} sx={{ color: ti.cor }}>{ti.label}</MenuItem>)}
              </Select>
            </FormControl>
            <Button size="small" variant="outlined" onClick={uploadImagemItem} sx={{ color: '#94a3b8', borderColor: '#555' }}>
              📷 Upload Imagem
            </Button>
            {editandoItem?.imagem && (
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <img src={editandoItem.imagem} alt="Preview" style={{ width: 50, height: 50, borderRadius: 8, objectFit: 'cover' }} />
                <Button size="small" onClick={() => setEditandoItem(prev => ({ ...prev, imagem: "" }))} sx={{ color: '#ef4444' }}>Remover</Button>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#1a1a2e', borderTop: '1px solid #334155' }}>
          <Button onClick={() => setEditandoItem(null)} sx={{ color: '#94a3b8' }}>Cancelar</Button>
          <Button variant="contained" onClick={salvarItem} sx={{ bgcolor: '#2e7d32' }}>Salvar</Button>
        </DialogActions>
      </Dialog>

      {/* MODAL DE COMPRA */}
      <Dialog open={!!comprandoItem} onClose={() => setComprandoItem(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#1a1a2e', color: '#fff' }}>🛒 Comprar Item</DialogTitle>
        <DialogContent sx={{ bgcolor: '#1a1a2e', pt: 2 }}>
          {comprandoItem && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="body1" sx={{ color: '#fff', fontWeight: 'bold' }}>{comprandoItem.nome}</Typography>
              <Typography variant="body2" sx={{ color: '#fbbf24' }}>Preço unitário: 💰 {comprandoItem.precoUnitario}</Typography>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: '#94a3b8' }}>Quantidade</InputLabel>
                <Select value={comprandoItem.quantidadeCompra || 1} onChange={(e) => setComprandoItem(prev => ({ ...prev, quantidadeCompra: Number(e.target.value) }))}
                  sx={{ color: '#fff' }} label="Quantidade">
                  {[1,2,3,4,5,10,20].map(q => <MenuItem key={q} value={q}>{q}</MenuItem>)}
                </Select>
              </FormControl>
              <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                Total: <strong style={{ color: '#fbbf24' }}>💰 {comprandoItem.precoUnitario * (comprandoItem.quantidadeCompra || 1)}</strong>
              </Typography>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: '#94a3b8' }}>Carteira</InputLabel>
                <Select value={carteiraSelecionada} onChange={(e) => setCarteiraSelecionada(e.target.value)} sx={{ color: '#fff' }} label="Carteira">
                  {(fichasMap[currentUserEmail]?.carteiras || []).map(c => (
                    <MenuItem key={c.nome} value={c.nome}>{c.nome} (💰 {c.valor})</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: '#94a3b8' }}>Categoria Destino</InputLabel>
                <Select value={categoriaDestinoCompra} onChange={(e) => setCategoriaDestinoCompra(e.target.value)} sx={{ color: '#fff' }} label="Categoria">
                  <MenuItem value="equipamentos">⚔️ Equipamentos</MenuItem>
                  <MenuItem value="vestes">👕 Vestimentas</MenuItem>
                  <MenuItem value="diversos">📦 Diversos</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#1a1a2e', borderTop: '1px solid #334155' }}>
          <Button onClick={() => setComprandoItem(null)} sx={{ color: '#94a3b8' }}>Cancelar</Button>
          <Button variant="contained" onClick={comprarItem} sx={{ bgcolor: '#2e7d32' }}>Confirmar Compra</Button>
        </DialogActions>
      </Dialog>

      {/* LIGHTBOX */}
      {lightboxImage && (
        <Box onClick={() => setLightboxImage(null)} sx={{ position: "fixed", inset: 0, bgcolor: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999999 }}>
          <LightboxImage src={lightboxImage} zoom={zoom} setZoom={setZoom} />
        </Box>
      )}
    </>,
    document.body
  );
}

export default React.memo(CommerceHUD);