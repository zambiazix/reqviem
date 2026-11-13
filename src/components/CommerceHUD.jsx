// src/components/CommerceHUD.jsx
import React, { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Box, Paper, Typography, IconButton, Button, TextField,
  FormControl, InputLabel, Select, MenuItem, Dialog, DialogTitle,
  DialogContent, DialogActions, Grid, Chip, InputAdornment,
  FormControlLabel, Checkbox, Tooltip,
  Autocomplete
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

// 🟢 INJETAR ESTILOS PREMIUM
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = `
    @keyframes fadeSlideUp {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes glowPulse {
      0%, 100% { box-shadow: 0 0 10px rgba(0,224,255,0.2); }
      50% { box-shadow: 0 0 20px rgba(0,224,255,0.5); }
    }
    .commerce-card {
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
    }
    .commerce-card:hover {
      transform: translateY(-3px) scale(1.01);
      box-shadow: 0 8px 25px rgba(0, 224, 255, 0.15) !important;
      border-color: #00e0ff !important;
    }
    .commerce-item-list {
      animation: fadeSlideUp 0.4s ease-out;
    }
  `;
  document.head.appendChild(styleSheet);
}
// 🟢 Função para extrair URL direta do ImgBB
const getImagemDireta = (data) => {
  if (!data?.success) return null;
  if (data.data?.image?.url) return data.data.image.url;
  if (data.data?.display_url) return data.data.display_url;
  if (data.data?.url && data.data.url.startsWith('https://i.ibb.co')) return data.data.url;
  if (data.data?.url && data.data.url.includes('ibb.co/')) {
    const id = data.data.url.split('/').pop();
    return `https://i.ibb.co/${id}.jpg`;
  }
  return data.data?.url || null;
};

const TIPOS_DANO = [
  { valor: "Nenhum", label: "Nenhum (sem efeito)", cor: "#888888" },
  { valor: "Ácido", label: "Ácido", cor: "#7fff00" },
  { valor: "Contundente", label: "Contundente", cor: "#a0522d" },
  { valor: "Cortante", label: "Cortante", cor: "#c0c0c0" },
  { valor: "Elétrico", label: "Elétrico", cor: "#ffff00" },
  { valor: "Digital", label: "Digital", cor: "#00ff41" }, // 🟢 NOVO
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

// 🟢 Normaliza URLs do ImgBB para exibição
const normalizarUrlImagem = (url) => {
  if (!url) return "";
  if (url.includes('i.ibb.co') || url.includes('image.ibb.co')) return url;
  if (url.includes('ibb.co/')) {
    const id = url.split('/').pop();
    return `https://i.ibb.co/${id}.jpg`;
  }
  return url;
};

// 🟢 HELPERS DE ESCAMBO
const calcularFatorDurabilidade = (dur) => {
  const d = Number(dur ?? 100);
  if (d <= 25) return 0;
  return Math.pow(d / 100, 2);
};

const gerarHashOfertaEscambo = (oferta) => {
  return (oferta || [])
    .filter(o => o && o._uid)
    .map(o => `${o.categoria}:${o._uid}:${o.quantidade || 1}`)
    .sort()
    .join("|");
};

const calcularFatorVariacaoTempo = (itemId) => {
  const seed = (itemId || "0").split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const horaAtual = new Date().getHours();
  const variacaoItem = Math.sin(seed * 7.3 + horaAtual * 2.1) * 0.4;
  const variacaoDiaria = Math.sin(horaAtual * 0.5 + seed * 0.3) * 0.15;
  return 1 + variacaoItem + variacaoDiaria;
};

const calcularQuantidadeEscamboEfetiva = (item, demandaMap) => {
  const base = Number(item.escamboQuantidade || 1);
  if (!item.escamboVariacaoAuto) return base;
  const dem = demandaMap?.[item.id];
  const fatorDemanda = (dem && dem.expiraEm > Date.now()) ? 1 + (dem.aumento / 100) : 1;
  const fatorTempo = calcularFatorVariacaoTempo(item.id);
  return Math.max(1, Math.ceil(base * fatorDemanda * fatorTempo));
};

const calcularValorItemOferecido = (itemOfertado, valorMercadoBase, isMoedaDaLoja) => {
  const qtd = Number(itemOfertado?.quantidade || 1);
  const fatorDur = calcularFatorDurabilidade(itemOfertado?.durabilidade ?? 100);
  const multMoeda = isMoedaDaLoja ? 1 : 0.5;
  const valorUnit = Number(valorMercadoBase || 0) * multMoeda * fatorDur;
  return Math.floor(valorUnit * qtd);
};

// 🟢 Normaliza texto para busca (ignora maiúscula/minúscula e acento)
const normalizarTexto = (t) =>
  (t || "").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// 🟢 CATEGORIAS DE LOJA
const CATEGORIAS_LOJA = [
  "Alfaiataria",
  "Estábulo",
  "Biblioteca",
  "Mercearia",
  "Estalagem",
  "Forja",
  "Oficina",
  "Feira",
  "Restaurante",
  "Taverna",
  "Farmácia",
  "Transporte",
  "Caça & Pesca",
  "Carpintaria",
  "Central-Pneumática",
  "Penhores",
  "Corporação",
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
      loading="eager"
      decoding="sync"
      style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`, transition: dragging ? "none" : "transform 0.2s ease", maxWidth: "90%", maxHeight: "90%", borderRadius: 10, cursor: dragging ? "grabbing" : "grab", userSelect: "none" }}
    />
  );
}

function CommerceHUD({ isMaster = false, visible = false, onClose = () => {}, currentUserEmail = null }) {

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
  const [lojaBaseId, setLojaBaseId] = useState("");
  const [itemBaseId, setItemBaseId] = useState("");
  const [editandoItem, setEditandoItem] = useState(null);
  const [novoPaisNome, setNovoPaisNome] = useState("");
  const [novaCidadeNome, setNovaCidadeNome] = useState("");
  const [novaLojaNome, setNovaLojaNome] = useState("");

  const [lightboxImage, setLightboxImage] = useState(null);
  const [zoom, setZoom] = useState(1);

  const [comprandoItem, setComprandoItem] = useState(null);
  const [carteiraSelecionada, setCarteiraSelecionada] = useState("");
  const [categoriaDestinoCompra, setCategoriaDestinoCompra] = useState("equipamentos");
  const [variedadeIndex, setVariedadeIndex] = useState(0);

  // 🟢 ESTADOS: TRANSFERÊNCIA MESTRE
  const [transferindoItem, setTransferindoItem] = useState(null); // { item, categoria }
  const [transferenciaDestino, setTransferenciaDestino] = useState("");
  const [transferenciaCategoria, setTransferenciaCategoria] = useState("diversos");
  const [transferenciaQuantidade, setTransferenciaQuantidade] = useState(1);
  const [transferenciaDescontarEstoque, setTransferenciaDescontarEstoque] = useState(true);

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
  const [buscando, setBuscando] = useState(false);
  const [resultadosBusca, setResultadosBusca] = useState([]);
  const cacheBuscaRef = useRef({});
  const debounceRef = useRef(null);
  const [demandaMap, setDemandaMap] = useState({});
  const scrollPosRef = useRef(0);

  // 🟢 ESTADOS DE ESCAMBO
  const [indiceComercio, setIndiceComercio] = useState({}); // { nomeItem: valorMaximo }
  const [ofertaEscambo, setOfertaEscambo] = useState([null, null, null]);
  const [resultadoEscambo, setResultadoEscambo] = useState(null); // { sucesso, tipo, mensagem }
  const [manipulacaoOpen, setManipulacaoOpen] = useState(false);
  const [rolagemManipulacao, setRolagemManipulacao] = useState(null);
  const [carregandoIndice, setCarregandoIndice] = useState(false);
  const [carregandoEscambo, setCarregandoEscambo] = useState(false);

  // 🟢 FUNÇÃO: TRANSFERÊNCIA MESTRE -> JOGADOR
  const executarTransferenciaMaster = async () => {
    if (!transferindoItem || !transferenciaDestino) return alert("Selecione um jogador!");
    if (transferenciaQuantidade <= 0) return alert("Quantidade inválida!");
    
    const { item } = transferindoItem;
    const fichaDestino = fichasMap[transferenciaDestino];
    if (!fichaDestino) return alert("Ficha do jogador não encontrada.");

    try {
      const categoriaAtual = fichaDestino[transferenciaCategoria] || [];
      const itemNovo = { ...item, quantidade: transferenciaQuantidade };
      
      // Remove campos da loja que não devem ir para a ficha
      delete itemNovo.estoque;
      delete itemNovo.estoqueIlimitado;
      delete itemNovo.estoqueFixo;
      delete itemNovo.valor;
      delete itemNovo.ordem;
      delete itemNovo.variedades;
      delete itemNovo.comprasRecentes;
      // usosTotais e sumirAoConsumir DEVEM ser mantidos, por isso não são deletados aqui.
      
      // Tenta empilhar item se já existir
      const existenteIndex = categoriaAtual.findIndex(it => 
        it.nome === itemNovo.nome &&
        (it.tipoDano || "Nenhum") === (itemNovo.tipoDano || "Nenhum") &&
        (it.dado || 1) === (itemNovo.dado || 1) &&
        (it.consumivel || "Nenhum") === (itemNovo.consumivel || "Nenhum") &&
        (it.insumivel || "Nenhum") === (itemNovo.insumivel || "Nenhum")
      );

      let novaCategoria;
      if (existenteIndex >= 0) {
        novaCategoria = categoriaAtual.map((it, idx) => 
          idx === existenteIndex ? { ...it, quantidade: (it.quantidade || 1) + transferenciaQuantidade } : it
        );
      } else {
        novaCategoria = [...categoriaAtual, itemNovo];
      }

      // Atualiza Ficha Destino
      await updateDoc(doc(db, "fichas", transferenciaDestino), {
        [transferenciaCategoria]: novaCategoria
      });

      // Atualiza Estoque da Loja (se marcado)
      if (transferenciaDescontarEstoque && !item.estoqueIlimitado && !item.estoqueFixo) {
        const novoEstoque = Math.max(0, (item.estoque || 1) - transferenciaQuantidade);
        await updateDoc(doc(db, "comercio_paises", selectedPais.id, "cidades", selectedCidade.id, "lojas", selectedLoja.id, "itens", item.id), {
          estoque: novoEstoque
        });
      }

      alert(`✅ ${transferenciaQuantidade}x ${item.nome} enviado para ${fichaDestino.nome || transferenciaDestino}!`);
      setTransferindoItem(null);
      setTransferenciaDestino("");
      setTransferenciaQuantidade(1);
    } catch (err) {
      console.error(err);
      alert("Erro ao transferir: " + err.message);
    }
  };

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

  // 🟢 RESET DIÁRIO DE ESTOQUE — fallback client-side
  // Se o server dormiu no Render e o cron não rodou, qualquer jogador que abrir
  // o HUD após o horário dispara o reset (só roda uma vez por dia).
  useEffect(() => {
    if (!currentUserEmail) return;
    const apiBase = window.location.hostname === 'localhost'
      ? 'http://localhost:5000'
      : 'https://reqviem.onrender.com';

    fetch(`${apiBase}/api/resetar-estoque-se-necessario`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: currentUserEmail }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.executado) {
          console.log(`✅ Reset diário executado: ${data.totalAtualizados} itens em ${data.totalLojas} lojas`);
        }
      })
      .catch((err) => console.warn('⚠️ Falha ao verificar reset de estoque:', err));
  }, [currentUserEmail]);

  const carregarPaises = useCallback(async () => {
    const snap = await getDocs(collection(db, "comercio_paises"));
    setPaises(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }, []);
  useEffect(() => { carregarPaises(); }, [carregarPaises]);

  // 🟢 CARREGA ÍNDICE DE COMÉRCIO (nome do item → MAIOR valor encontrado)
  const carregarIndiceComercio = useCallback(async () => {
    if (Object.keys(indiceComercio).length > 0) return;
    setCarregandoIndice(true);
    try {
      const novoIndice = {};
      const paisesSnap = await getDocs(collection(db, "comercio_paises"));
      for (const p of paisesSnap.docs) {
        const cidadesSnap = await getDocs(collection(db, "comercio_paises", p.id, "cidades"));
        for (const c of cidadesSnap.docs) {
          const lojasSnap = await getDocs(collection(db, "comercio_paises", p.id, "cidades", c.id, "lojas"));
          for (const l of lojasSnap.docs) {
            const itensSnap = await getDocs(collection(db, "comercio_paises", p.id, "cidades", c.id, "lojas", l.id, "itens"));
            for (const it of itensSnap.docs) {
              const data = it.data();
              const nome = data?.nome;
              const valor = Number(data?.valor || 0);
              if (nome && valor > 0) {
                if (!novoIndice[nome] || novoIndice[nome] < valor) {
                  novoIndice[nome] = valor;
                }
              }
            }
          }
        }
      }
      setIndiceComercio(novoIndice);
    } catch (err) {
      console.error("Erro ao carregar índice de comércio:", err);
    } finally {
      setCarregandoIndice(false);
    }
  }, [indiceComercio]);

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
          variedades: Array.isArray(d.data().variedades) ? d.data().variedades : [],
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
      setBuscando(false);
      return;
    }
    
    const termoLower = termo.toLowerCase();
    
    if (cacheBuscaRef.current[termoLower]) {
      setResultadosBusca(cacheBuscaRef.current[termoLower]);
      setMostrarNav(false);
      setBuscando(false);
      return;
    }
    
    setBuscando(true);
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
    cacheBuscaRef.current[termoLower] = resultados;
    
    setResultadosBusca(resultados);
    setMostrarNav(resultados.length === 0);
    setBuscando(false);
  };

  const scrollAteItem = (itemId) => {
    setTimeout(() => {
      const elemento = document.getElementById(`item-${itemId}`);
      if (elemento) {
        elemento.scrollIntoView({ behavior: 'smooth', block: 'center' });
        elemento.style.transition = 'box-shadow 0.5s ease';
        elemento.style.boxShadow = '0 0 20px #00e0ff';
        setTimeout(() => {
          elemento.style.boxShadow = '';
        }, 2000);
      }
    }, 500);
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
        scrollAteItem(resultado.data.id);
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
      categoria: editandoLoja?.categoria || "",
      oculta: editandoLoja?.oculta || false,
      permiteManipulacao: editandoLoja?.permiteManipulacao ?? true,
    });
    
    if (!editandoLoja?.id && lojaBaseId) {
      try {
        const itensOrigemSnap = await getDocs(
          collection(db, "comercio_paises", selectedPais.id, "cidades", selectedCidade.id, "lojas", lojaBaseId, "itens")
        );
        
        for (const itemDoc of itensOrigemSnap.docs) {
          const itemData = itemDoc.data();
          const novoItemId = Date.now().toString() + "_" + itemDoc.id;
          await setDoc(
            doc(db, "comercio_paises", selectedPais.id, "cidades", selectedCidade.id, "lojas", id, "itens", novoItemId),
            itemData
          );
        }
        console.log(`✅ ${itensOrigemSnap.size} itens copiados da loja base`);
      } catch (err) {
        console.error("Erro ao copiar itens da loja base:", err);
      }
    }
    
    setEditandoLoja(null);
    setNovaLojaNome("");
    setLojaBaseId("");
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
    const container = document.querySelector('.MuiDialogContent-root');
    if (container) scrollPosRef.current = container.scrollTop;
    const payload = {
      nome: editandoItem.nome.trim(),
      descricao: editandoItem.descricao || "",
      valor: Number(editandoItem.valor || 0),
      dado: Number(editandoItem.dado || 1),
      durabilidade: Number(editandoItem.durabilidade || 100),
      estoque: Number(editandoItem.estoque || 1),
      estoqueIlimitado: editandoItem.estoqueIlimitado || false,
      estoqueFixo: editandoItem.estoqueFixo || false,
      imagem: editandoItem.imagem || "",
      ordem: editandoItem.ordem || itens.length,
      comprasRecentes: editandoItem.comprasRecentes || 0,
      tipoDano: editandoItem.tipoDano || "Nenhum",
      consumivel: editandoItem.consumivel || "Nenhum",
      consumivelValor: editandoItem.consumivelValor || 0,
      consumivelPercentual: editandoItem.consumivelPercentual || 100,
      insumivel: editandoItem.insumivel || "Nenhum",
      insumivelValor: editandoItem.insumivelValor || 0,
      variedades: editandoItem.variedades || [],
      // 🟢 NOVOS CAMPOS DE COMIDA/BEBIDA
      isComida: editandoItem.isComida || false,
      isBebida: editandoItem.isBebida || false,
      recuperacaoFome: editandoItem.recuperacaoFome || 0,
      recuperacaoSede: editandoItem.recuperacaoSede || 0,
      validadeDias: editandoItem.validadeDias || 15,
      // 🟢 NOVOS CAMPOS DE ESCAMBO
      isEscambo: editandoItem.isEscambo || false,
      escamboItemNome: editandoItem.escamboItemNome || "",
      escamboQuantidade: Number(editandoItem.escamboQuantidade || 1),
      escamboVariacaoAuto: editandoItem.escamboVariacaoAuto ?? true,
      // 🟢 NOVOS CAMPOS DE USOS
      usosTotais: Number(editandoItem.usosTotais || 0),
      sumirAoConsumir: editandoItem.sumirAoConsumir ?? true,
    };
    
    await setDoc(doc(db, "comercio_paises", selectedPais.id, "cidades", selectedCidade.id, "lojas", selectedLoja.id, "itens", id), payload);
    setEditandoItem(null);
    setTimeout(() => {
      const container = document.querySelector('.MuiDialogContent-root');
      if (container) container.scrollTop = scrollPosRef.current;
    }, 100);
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
      const urlDireta = getImagemDireta(data);
      if (urlDireta) setEditandoItem(prev => ({ ...prev, imagem: urlDireta }));
    };
    input.click();
  };

  // 🟢 COMPRAR ITEM (com suporte a variedades e itens inclusos)
  const comprarItem = async () => {
    if (!comprandoItem || !currentUserEmail) return;
    if (!carteiraSelecionada) { alert("Selecione uma carteira!"); return; }
    // 🟢 Busca a ficha pelo email do jogador (pode ser diferente do auth.email no caso do mestre)
    const ficha = fichasMap[currentUserEmail];
    if (!ficha) { alert("Ficha não encontrada! Verifique se a ficha do Mestre existe."); return; }
    const carteiras = Array.isArray(ficha.carteiras) ? ficha.carteiras : [];
    const carteira = carteiras.find(c => c.nome === carteiraSelecionada);
    const quantidadeComprada = comprandoItem.quantidadeCompra || 1;

    // 🟢 VARIEDADE SELECIONADA (se houver)
    const variedades = comprandoItem.variedades || [];
    const variedade = variedades.length > 0 ? variedades[variedadeIndex] : null;
    const precoUnitarioFinal = comprandoItem.precoUnitario + (variedade?.precoAdicional || 0);
    const precoTotal = precoUnitarioFinal * quantidadeComprada;

    if (!carteira || carteira.valor < precoTotal) { alert("Saldo insuficiente!"); return; }
    const novasCarteiras = carteiras.map(c =>
      c.nome === carteiraSelecionada ? { ...c, valor: c.valor - precoTotal } : c
    );

    // 🟢 DADOS FINAIS DO ITEM (aplicando a variedade)
    const nomeFinal = variedade ? `${comprandoItem.nome} (${variedade.nome})` : comprandoItem.nome;
    const dadoFinal = variedade?.dado ?? comprandoItem.dado ?? 1;
    const tipoDanoFinal = variedade?.tipoDano ?? comprandoItem.tipoDano ?? "Nenhum";
    const durabilidadeFinal = variedade?.durabilidade ?? comprandoItem.durabilidade ?? 100;
    const imagemFinal = variedade?.imagem || comprandoItem.imagem || "";

    const categoriaAtual = ficha[categoriaDestinoCompra] || [];
    const itemExistenteIndex = categoriaAtual.findIndex(it =>
      it.nome === nomeFinal &&
      (it.tipoDano || "Nenhum") === (tipoDanoFinal || "Nenhum") &&
      (it.consumivel || "Nenhum") === (comprandoItem.consumivel || "Nenhum") &&
      (it.consumivelValor || 0) === (comprandoItem.consumivelValor || 0) &&
      (it.insumivel || "Nenhum") === (comprandoItem.insumivel || "Nenhum") &&
      (it.insumivelValor || 0) === (comprandoItem.insumivelValor || 0) &&
      (it.dado || 1) === (dadoFinal || 1)
    );

    let categoriaItens;
    if (itemExistenteIndex >= 0) {
      categoriaItens = categoriaAtual.map((it, idx) => {
        if (idx === itemExistenteIndex) return { ...it, quantidade: (it.quantidade || 1) + quantidadeComprada, travado: true, origem: "loja" };
        return it;
      });
    } else {
      const novoItem = {
        nome: nomeFinal,
        quantidade: quantidadeComprada,
        durabilidade: durabilidadeFinal,
        dado: dadoFinal,
        imagem: imagemFinal,
        tipoDano: tipoDanoFinal,
        consumivel: comprandoItem.consumivel || "Nenhum",
        consumivelValor: comprandoItem.consumivelValor || 0,
        consumivelPercentual: comprandoItem.consumivelPercentual || 100,
        insumivel: comprandoItem.insumivel || "Nenhum",
        insumivelValor: comprandoItem.insumivelValor || 0,
        travado: true,
        origem: "loja",
        variedade: variedade?.nome || null,
        isComida: comprandoItem.isComida || false,
        isBebida: comprandoItem.isBebida || false,
        recuperacaoFome: comprandoItem.recuperacaoFome || 0,
        recuperacaoSede: comprandoItem.recuperacaoSede || 0,
        validadeDias: comprandoItem.validadeDias || 15,
        usosTotais: comprandoItem.usosTotais || 0,
        sumirAoConsumir: comprandoItem.sumirAoConsumir ?? true,
      };
      categoriaItens = [...categoriaAtual, novoItem];
    }

    // 🟢 ITENS INCLUSOS DA VARIEDADE — vão pra categoria destino também
    const itensInclusos = variedade?.itensInclusos || [];
    itensInclusos.forEach((incluso) => {
      if (!incluso?.nome) return;
      const qtd = (incluso.quantidade || 1) * quantidadeComprada;
      const idxInc = categoriaItens.findIndex(it =>
        it.nome === incluso.nome &&
        (it.tipoDano || "Nenhum") === (incluso.tipoDano || "Nenhum") &&
        (it.dado || 1) === (incluso.dado || 1)
      );
      if (idxInc >= 0) {
        categoriaItens[idxInc] = { ...categoriaItens[idxInc], quantidade: (categoriaItens[idxInc].quantidade || 1) + qtd };
      } else {
        categoriaItens.push({
          nome: incluso.nome,
          quantidade: qtd,
          durabilidade: 100,
          dado: incluso.dado || 1,
          imagem: incluso.imagem || "",
          tipoDano: incluso.tipoDano || "Nenhum",
          consumivel: "Nenhum",
          consumivelValor: 0,
          consumivelPercentual: 100,
          insumivel: "Nenhum",
          insumivelValor: 0,
          travado: true,
          origem: "variedade",
        });
      }
    });

    try {
      await setDoc(doc(db, "fichas", currentUserEmail), { carteiras: novasCarteiras, [categoriaDestinoCompra]: categoriaItens }, { merge: true });
      // 🟢 DISPARA EVENTO PARA O INVENTÁRIO LIMPAR TRAVAS E ACEITAR O ITEM
      window.dispatchEvent(new CustomEvent('itemComprado', { detail: { fichaId: currentUserEmail, categoria: categoriaDestinoCompra } }));
    } catch (err) {
      console.error("Erro ao salvar compra:", err);
      alert("Erro ao salvar a compra: " + err.message + "\n\nVerifique se você tem permissão para editar esta ficha.");
      return;
    }

    let novoEstoque = comprandoItem.estoque;
    if (!comprandoItem.estoqueIlimitado && !comprandoItem.estoqueFixo) {
      novoEstoque = Math.max(0, (comprandoItem.estoque || 1) - quantidadeComprada);
    }
    const aumentoDemanda = Math.floor(Math.random() * 30) + 1;
    const agora = Date.now();
    const expiraEm = agora + (60 * 60 * 1000);
    setDemandaMap(prev => ({ ...prev, [comprandoItem.id]: { aumento: aumentoDemanda, expiraEm } }));
    await updateDoc(doc(db, "comercio_paises", selectedPais.id, "cidades", selectedCidade.id, "lojas", selectedLoja.id, "itens", comprandoItem.id), {
      estoque: novoEstoque, ultimaCompraTimestamp: agora, aumentoDemanda: aumentoDemanda,
    });

    const msgVariedade = variedade ? `\n🎨 Variedade: ${variedade.nome}` : "";
    const msgInclusos = itensInclusos.length > 0 ? `\n🎁 Inclusos: ${itensInclusos.map(i => `${i.quantidade || 1}x ${i.nome}`).join(", ")}` : "";
    alert(`✅ "${quantidadeComprada}x ${nomeFinal}" comprado por ${precoTotal} 💰!${msgVariedade}${msgInclusos}\n🔥 Demanda aumentou +${aumentoDemanda}% por 1 hora!`);

    setComprandoItem(null);
    setCarteiraSelecionada("");
    setVariedadeIndex(0);
  };

  // 🟢 ============ FUNÇÕES DE ESCAMBO ============
  const calcularValorNecessarioEscambo = () => {
    if (!comprandoItem?.isEscambo) return 0;
    const valorUnit = indiceComercio[comprandoItem.escamboItemNome] || 0;
    const qtd = calcularQuantidadeEscamboEfetiva(comprandoItem, demandaMap);
    return valorUnit * qtd;
  };

  const calcularValorOfertaEscambo = () => {
    const ficha = fichasMap[currentUserEmail];
    if (!ficha) return 0;
    let total = 0;
    ofertaEscambo.forEach(slot => {
      if (!slot) return;
      const itemOfertado = ficha[slot.categoria]?.[slot.index];
      if (!itemOfertado) return;
      const valorMercado = indiceComercio[itemOfertado.nome] || 0;
      const isMoedaDaLoja = itemOfertado.nome === comprandoItem?.escamboItemNome;
      total += calcularValorItemOferecido(
        { ...itemOfertado, quantidade: slot.quantidade },
        valorMercado,
        isMoedaDaLoja
      );
    });
    return total;
  };

  const calcularPercentualEscambo = () => {
    const necessario = calcularValorNecessarioEscambo();
    if (necessario <= 0) return 0;
    const ofertado = calcularValorOfertaEscambo();
    return Math.min(100, Math.floor((ofertado / necessario) * 100));
  };

  const podeManipular = () => {
    if (!comprandoItem?.isEscambo) return false;
    if (selectedLoja?.permiteManipulacao === false) return false;
    const ficha = fichasMap[currentUserEmail];
    if (!ficha) return false;
    if ((ficha.pericias?.labia || 0) < 1) return false;
    const pct = calcularPercentualEscambo();
    return pct > 0 && pct < 100;
  };

  const entregarItemEscambo = async (itemLoja, quantidade = 1) => {
    const ficha = fichasMap[currentUserEmail];
    if (!ficha) return;
    const categoriaDestino = categoriaDestinoCompra || "diversos";
    const categoriaAtual = ficha[categoriaDestino] || [];
    const itemNovo = {
      _uid: `it_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      nome: itemLoja.nome,
      quantidade: quantidade,
      durabilidade: itemLoja.durabilidade || 100,
      dado: itemLoja.dado || 1,
      imagem: itemLoja.imagem || "",
      tipoDano: itemLoja.tipoDano || "Nenhum",
      consumivel: itemLoja.consumivel || "Nenhum",
      consumivelValor: itemLoja.consumivelValor || 0,
      consumivelPercentual: itemLoja.consumivelPercentual || 100,
      insumivel: itemLoja.insumivel || "Nenhum",
      insumivelValor: itemLoja.insumivelValor || 0,
      travado: true,
      origem: "loja",
      isComida: itemLoja.isComida || false,
      isBebida: itemLoja.isBebida || false,
      recuperacaoFome: itemLoja.recuperacaoFome || 0,
      recuperacaoSede: itemLoja.recuperacaoSede || 0,
      validadeDias: itemLoja.validadeDias || 15,
      usosTotais: itemLoja.usosTotais || 0,
      sumirAoConsumir: itemLoja.sumirAoConsumir ?? true,
    };
    const idx = categoriaAtual.findIndex(it =>
      it.nome === itemNovo.nome &&
      (it.tipoDano || "Nenhum") === (itemNovo.tipoDano || "Nenhum") &&
      (it.dado || 1) === (itemNovo.dado || 1) &&
      (it.consumivel || "Nenhum") === (itemNovo.consumivel || "Nenhum") &&
      (it.insumivel || "Nenhum") === (itemNovo.insumivel || "Nenhum")
    );
    let novaCategoria;
    if (idx >= 0) {
      novaCategoria = categoriaAtual.map((it, k) =>
        k === idx ? { ...it, quantidade: (it.quantidade || 1) + quantidade } : it
      );
    } else {
      novaCategoria = [...categoriaAtual, itemNovo];
    }
    await setDoc(doc(db, "fichas", currentUserEmail), { [categoriaDestino]: novaCategoria }, { merge: true });
    window.dispatchEvent(new CustomEvent('itemComprado', { detail: { fichaId: currentUserEmail, categoria: categoriaDestino } }));
  };

  const consumirOfertaEscambo = async (oferta) => {
    const ficha = fichasMap[currentUserEmail];
    if (!ficha) return;
    const porCategoria = {};
    oferta.forEach(slot => {
      if (!slot) return;
      if (!porCategoria[slot.categoria]) porCategoria[slot.categoria] = [];
      porCategoria[slot.categoria].push(slot);
    });
    const atualizacoes = {};
    Object.entries(porCategoria).forEach(([categoria, slots]) => {
      let novaLista = [...(ficha[categoria] || [])];
      const indices = slots.map(s => s.index).sort((a, b) => b - a);
      indices.forEach(idx => {
        const itemOriginal = novaLista[idx];
        if (!itemOriginal) return;
        const qtdRemover = slots.find(s => s.index === idx)?.quantidade || 1;
        const novaQtd = (itemOriginal.quantidade || 1) - qtdRemover;
        if (novaQtd > 0) {
          novaLista[idx] = { ...itemOriginal, quantidade: novaQtd };
        } else {
          novaLista.splice(idx, 1);
        }
      });
      atualizacoes[categoria] = novaLista;
    });
    if (Object.keys(atualizacoes).length > 0) {
      await setDoc(doc(db, "fichas", currentUserEmail), atualizacoes, { merge: true });
    }
  };

  const gravarLockEscambo = async (itemLojaId, hash) => {
    const ficha = fichasMap[currentUserEmail];
    const atual = { ...(ficha?.escamboFalhas || {}) };
    atual[itemLojaId] = hash;
    await setDoc(doc(db, "fichas", currentUserEmail), { escamboFalhas: atual }, { merge: true });
  };

  const limparLockEscambo = async (itemLojaId) => {
    const ficha = fichasMap[currentUserEmail];
    const atual = { ...(ficha?.escamboFalhas || {}) };
    delete atual[itemLojaId];
    await setDoc(doc(db, "fichas", currentUserEmail), { escamboFalhas: atual }, { merge: true });
  };

  const aplicarEscambo = async (viaManipulacao = false) => {
    if (!comprandoItem || !selectedPais || !selectedCidade || !selectedLoja) return;
    setCarregandoEscambo(true);
    try {
      await consumirOfertaEscambo(ofertaEscambo);
      await entregarItemEscambo(comprandoItem, 1);
      let novoEstoque = comprandoItem.estoque;
      if (!comprandoItem.estoqueIlimitado && !comprandoItem.estoqueFixo) {
        novoEstoque = Math.max(0, (comprandoItem.estoque || 1) - 1);
      }
      const aumentoDemanda = Math.floor(Math.random() * 30) + 1;
      const agora = Date.now();
      const expiraEm = agora + (60 * 60 * 1000);
      setDemandaMap(prev => ({ ...prev, [comprandoItem.id]: { aumento: aumentoDemanda, expiraEm } }));
      await updateDoc(
        doc(db, "comercio_paises", selectedPais.id, "cidades", selectedCidade.id, "lojas", selectedLoja.id, "itens", comprandoItem.id),
        { estoque: novoEstoque, ultimaCompraTimestamp: agora, aumentoDemanda: aumentoDemanda }
      );
      await limparLockEscambo(comprandoItem.id);
      alert(`✅ Escambo concluído${viaManipulacao ? " (via Manipulação)" : ""}!\nVocê adquiriu "${comprandoItem.nome}".`);
      setComprandoItem(null);
      setOfertaEscambo([null, null, null]);
      setResultadoEscambo({ sucesso: true, mensagem: "Escambo realizado!" });
    } catch (err) {
      console.error("Erro no escambo:", err);
      alert("Erro: " + err.message);
    } finally {
      setCarregandoEscambo(false);
    }
  };

  const executarTentativaEscambo = async () => {
    if (!comprandoItem) return;
    const pct = calcularPercentualEscambo();
    if (pct <= 0) { alert("Ofereça pelo menos 1 item válido."); return; }
    const hashAtual = gerarHashOfertaEscambo(ofertaEscambo);
    const hashLock = fichasMap[currentUserEmail]?.escamboFalhas?.[comprandoItem.id];
    if (hashLock && hashLock === hashAtual) {
      alert("🔒 Você já falhou com esses itens. Troque ao menos 1 para tentar de novo.");
      return;
    }
    if (pct >= 100) {
      await aplicarEscambo(false);
      return;
    }
    const d100 = Math.floor(Math.random() * 100) + 1;
    if (d100 <= pct) {
      await aplicarEscambo(false);
      alert(`🎲 1d100 = ${d100} (≤ ${pct}%) → ✅ SUCESSO!`);
    } else {
      await gravarLockEscambo(comprandoItem.id, hashAtual);
      alert(`🎲 1d100 = ${d100} (> ${pct}%) → ❌ FALHOU.\n\nTroque ao menos 1 item para tentar de novo.`);
    }
  };

  const abrirManipulacao = () => {
    const ficha = fichasMap[currentUserEmail];
    if (!ficha) return;
    const labia = ficha.pericias?.labia || 0;
    const inteligencia = ficha.atributos?.inteligencia || 0;
    if (labia < 1) { alert("Você precisa de ao menos 1 ponto em Lábia."); return; }
    const totalDados = labia + inteligencia;
    if (totalDados < 1) { alert("Sem dados para rolar."); return; }
    const alvo = Math.ceil(totalDados * 10 * 0.51);
    const rolls = [];
    let total = 0;
    for (let i = 0; i < totalDados; i++) {
      const v = Math.floor(Math.random() * 10) + 1;
      rolls.push(v);
      total += v;
    }
    setRolagemManipulacao({ rolls, total, alvo, sucesso: total >= alvo, labia, inteligencia, totalDados });
    setManipulacaoOpen(true);
  };

  const confirmarManipulacao = async () => {
    if (!rolagemManipulacao) return;
    if (!rolagemManipulacao.sucesso) {
      setManipulacaoOpen(false);
      setRolagemManipulacao(null);
      alert("❌ O vendedor não foi convencido. A oferta continua de pé.");
      return;
    }
    setManipulacaoOpen(false);
    await aplicarEscambo(true);
    setRolagemManipulacao(null);
  };
  // 🟢 ============ FIM DAS FUNÇÕES DE ESCAMBO ============

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
    let rafId = null;
    
    const handleMouseMove = (e) => {
      if (!arrastando && !redimensionando) return;
      
      if (rafId) cancelAnimationFrame(rafId);
      
      rafId = requestAnimationFrame(() => {
        if (arrastando) {
          setPosicao({ 
            x: e.clientX - dragStartRef.current.x, 
            y: e.clientY - dragStartRef.current.y 
          });
        }
        if (redimensionando) {
          const newWidth = Math.max(400, resizeStartRef.current.width + (e.clientX - resizeStartRef.current.x));
          const newHeight = Math.max(300, resizeStartRef.current.height + (e.clientY - resizeStartRef.current.y));
          setTamanho({ width: newWidth, height: newHeight });
        }
      });
    };
    
    const handleMouseUp = () => { 
      if (rafId) cancelAnimationFrame(rafId);
      setArrastando(false); 
      setRedimensionando(false); 
    };
    
    if (arrastando || redimensionando) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [arrastando, redimensionando]);

  // 🟢 NÃO desmonta o componente — só esconde o HUD quando invisível
  if (!visible) return null;

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
          background: "linear-gradient(145deg, #0a0a14 0%, #1a1a2e 100%)",
          color: "#fff",
          borderRadius: 3,
          border: "1px solid rgba(168, 85, 247, 0.4)",
          zIndex: 200,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          transition: "none",
          boxShadow: "0 10px 40px rgba(0,0,0,0.9), 0 0 20px rgba(168,85,247,0.15), inset 0 0 60px rgba(168,85,247,0.05)",
        }}
      >
        <Box
          sx={{ 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "space-between", 
            p: 1.5, 
            background: "linear-gradient(90deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95))",
            cursor: "move", 
            minHeight: 48, 
            borderBottom: "1px solid rgba(168, 85, 247, 0.3)",
            boxShadow: "0 4px 15px rgba(0,0,0,0.4)"
          }}
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
            {isMaster && !minimizado && (
              <IconButton
                size="small"
                title="Forçar reset de estoque agora"
                onClick={async () => {
                  if (!window.confirm('🔄 Forçar reset de TODO o estoque agora?\n\nTodos os itens de todas as lojas terão estoque sorteado entre 0 e 50.')) return;
                  try {
                    const apiBase = window.location.hostname === 'localhost'
                      ? 'http://localhost:5000'
                      : 'https://reqviem.onrender.com';
                    const resp = await fetch(`${apiBase}/api/admin/resetar-estoque-agora`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ mestreEmail: 'mestre@reqviemrpg.com' }),
                    });
                    const data = await resp.json();
                    if (data?.ok) {
                      alert(`✅ Reset concluído!\n${data.totalAtualizados} itens em ${data.totalLojas} lojas.`);
                    } else {
                      alert('❌ Erro: ' + (data?.error || 'desconhecido'));
                    }
                  } catch (err) {
                    alert('❌ Erro ao chamar o servidor: ' + err.message);
                  }
                }}
                sx={{ color: '#ff9800', p: 0.5 }}
              >
                🔄
              </IconButton>
            )}
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
              onChange={(e) => {
                const valor = e.target.value;
                setTermoBusca(valor);
                
                if (debounceRef.current) clearTimeout(debounceRef.current);
                debounceRef.current = setTimeout(() => {
                  realizarBusca(valor);
                }, 300);
              }}
              fullWidth
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#94a3b8' }} /></InputAdornment>,
                style: { color: '#fff', fontSize: '0.8rem' },
              }}
              sx={{ mb: 1, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#334155' }, '&:hover fieldset': { borderColor: '#475569' } } }}
            />
            {buscando && (
              <Typography variant="caption" sx={{ color: '#94a3b8', mb: 1, textAlign: 'center' }}>
                🔍 Buscando...
              </Typography>
            )}
            {!buscando && termoBusca && resultadosBusca.length === 0 && (
              <Typography variant="caption" sx={{ color: '#94a3b8', mb: 1, textAlign: 'center' }}>
                Nenhum resultado encontrado para "{termoBusca}"
              </Typography>
            )}
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
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ color: '#fff', fontWeight: 'bold' }}>{r.nome}</Typography>
                        <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                          {r.tipo === 'pais' && 'País'}
                          {r.tipo === 'cidade' && `Cidade em ${r.data.paisNome}`}
                          {r.tipo === 'loja' && `Loja em ${r.data.cidadeNome}, ${r.data.paisNome}`}
                          {r.tipo === 'item' && `🏪 ${r.data.lojaNome} • 🏙️ ${r.data.cidadeNome} • 🌍 ${r.data.paisNome} • 💰 ${r.data.valor || 0}`}
                        </Typography>
                      </Box>
                      {r.tipo === 'item' && (
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setComprandoItem({ 
                              ...r.data, 
                              precoUnitario: r.data.valor || 0, 
                              quantidadeCompra: 1 
                            });
                            setCarteiraSelecionada("");
                            setCategoriaDestinoCompra("equipamentos");
                            setVariedadeIndex(0);
                          }}
                          sx={{ bgcolor: '#2e7d32', color: '#fff', '&:hover': { bgcolor: '#1b5e20' } }}
                          title="Comprar"
                        >
                          <ShoppingCartIcon sx={{ fontSize: '0.9rem' }} />
                        </IconButton>
                      )}
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
                            {p.bandeira ? <img src={normalizarUrlImagem(p.bandeira)} alt="" loading="lazy" decoding="async" style={{ width: 24, height: 24, borderRadius: 4, objectFit: 'cover', cursor: 'pointer' }}
                              onClick={(e) => { e.stopPropagation(); setLightboxImage(normalizarUrlImagem(p.bandeira)); setZoom(1); }} /> :
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
                        onClick={() => { setEditandoLoja({ id: null, nome: "", donoNome: "", donoImagem: "", donoDescricao: "", categoria: "" }); setNovaLojaNome(""); setLojaBaseId(""); }}>
                        Nova Loja
                      </Button>
                    )}
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: 1 }}>
                      {lojas
                        .filter(l => isMaster || !l.oculta) // 🟢 FILTRO DE LOJA OCULTA
                        .sort((a, b) => {
                          const catA = a.categoria || "";
                          const catB = b.categoria || "";
                          if (catA !== catB) return catA.localeCompare(catB);
                          return (a.nome || "").localeCompare(b.nome || "");
                        })
                        .map(l => (
                        <Paper key={l.id} className="commerce-card" sx={{ 
                          p: 1.5, 
                          cursor: "pointer", 
                          bgcolor: "rgba(15, 23, 42, 0.7)", 
                          borderradius: 2,
                          border: l.oculta ? '1px dashed #ef4444' : '1px solid rgba(51, 65, 85, 0.8)',
                          opacity: l.oculta ? 0.6 : 1,
                          transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                          width: "100%",
                          backdropFilter: "blur(8px)",
                          "&:hover": { 
                            bgcolor: "rgba(30, 58, 95, 0.8)", 
                            transform: "translateY(-2px)",
                            borderColor: "#a855f7",
                            boxShadow: "0 6px 20px rgba(168, 85, 247, 0.2)"
                          } 
                        }} onClick={() => selecionarLoja(l)}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                            {l.donoImagem ? <img src={normalizarUrlImagem(l.donoImagem)} alt="" loading="lazy" decoding="async" style={{ width: 42, height: 42, borderRadius: "50%", objectFit: "cover", cursor: "pointer", border: "2px solid rgba(168,85,247,0.3)" }}
                              onClick={(e) => { e.stopPropagation(); setLightboxImage(normalizarUrlImagem(l.donoImagem)); setZoom(1); }} /> :
                              <Box sx={{ width: 42, height: 42, borderRadius: "50%", bgcolor: "rgba(51, 65, 85, 0.8)", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid rgba(168,85,247,0.3)" }}>👤</Box>}
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.3 }}>
                                <Typography sx={{ fontWeight: "bold", color: '#fff', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.nome}</Typography>
                                {l.categoria && (
                                  <Chip 
                                    label={l.categoria} 
                                    size="small" 
                                    sx={{ 
                                      bgcolor: 'rgba(168, 85, 247, 0.15)', 
                                      color: '#e9d5ff', 
                                      fontSize: '0.6rem', 
                                      height: 20,
                                      fontWeight: 'bold',
                                      maxWidth: 120,
                                      border: '1px solid rgba(168, 85, 247, 0.3)',
                                      '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
                                    }} 
                                  />
                                )}
                              </Box>
                              {l.donoNome && <Typography variant="caption" sx={{ color: "#94a3b8", display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>👤 {l.donoNome}</Typography>}
                            </Box>
                              {isMaster && (
                                <Box sx={{ display: 'flex', gap: 0.3 }} onClick={(e) => e.stopPropagation()}>
                                  <IconButton 
                                    size="small" 
                                    onClick={async (e) => { 
                                      e.stopPropagation(); 
                                      const novoStatus = !l.oculta;
                                      // 1. Atualiza no banco de dados
                                      await updateDoc(doc(db, "comercio_paises", selectedPais.id, "cidades", selectedCidade.id, "lojas", l.id), { oculta: novoStatus });
                                      // 2. Atualiza a tela na hora
                                      setLojas(prev => prev.map(loja => loja.id === l.id ? { ...loja, oculta: novoStatus } : loja));
                                    }} 
                                    title={l.oculta ? "Mostrar Loja" : "Ocultar Loja"}
                                  >
                                    <span style={{ fontSize: '1rem' }}>{l.oculta ? '🙈' : '👁️'}</span>
                                  </IconButton>
                                  <IconButton size="small" onClick={(e) => { e.stopPropagation(); setEditandoLoja(l); setNovaLojaNome(l.nome); }}>
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                  <IconButton size="small" onClick={(e) => { e.stopPropagation(); deletarLoja(l.id); }}>
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
                {selectedPais && selectedCidade && selectedLoja && (
                  <>
                    <Button onClick={() => { setSelectedLoja(null); setItens([]); }} size="small" sx={{ color: '#94a3b8' }}>← Voltar</Button>
                    <Typography variant="subtitle1" sx={{ mb: 1, color: '#fff' }}>🛒 {selectedLoja.nome} - Itens</Typography>
                    {isMaster && (
                      <Button variant="contained" startIcon={<AddIcon />} size="small" sx={{ mb: 1, bgcolor: '#2e7d32' }}
                        onClick={() => setEditandoItem({ id: null, nome: "", descricao: "", valor: 0, dado: 1, durabilidade: 100, estoque: 1, imagem: "", tipoDano: "Nenhum", consumivel: "Nenhum", insumivel: "Nenhum", variedades: [] })}>
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
                        const temMendigo = fichasMap[currentUserEmail]?.caracteristicas?.includes("Mendigo") || false;
                        const precoBase = Math.round((item.valor || 0) * fatorDemanda * fatorVariacao);
                        const precoFinal = temMendigo ? Math.ceil(precoBase / 2) : precoBase;
                        const precoExibicao = (item.valor || 0) > 0 ? Math.max(1, precoFinal) : 0;
                        return (
                          <Grid item xs={12} key={item.id} id={`item-${item.id}`}>
                            <Paper sx={{ 
                              p: 1.5, 
                              bgcolor: "rgba(15, 23, 42, 0.7)", 
                              borderRadius: 2,
                              backdropFilter: "blur(8px)",
                              border: demandaAtiva ? "1px solid #ff9800" : "1px solid rgba(51, 65, 85, 0.8)",
                              transition: 'all 0.3s ease',
                              "&:hover": {
                                transform: "translateY(-2px)",
                                boxShadow: "0 6px 20px rgba(0, 0, 0, 0.4)",
                                borderColor: demandaAtiva ? "#ffb74d" : "rgba(168, 85, 247, 0.5)"
                              }
                            }}>
                              <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
                                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5, minWidth: 65 }}>
                                  <Box sx={{ position: 'relative', width: 60, height: 60 }}>
                                    {item.imagem ? <img src={normalizarUrlImagem(item.imagem)} alt="" loading="lazy" decoding="async" style={{ width: 60, height: 60, borderRadius: 8, objectFit: "cover", cursor: "pointer" }}
                                      onClick={() => { setLightboxImage(normalizarUrlImagem(item.imagem)); setZoom(1); }} /> :
                                      <Box sx={{ width: 60, height: 60, borderRadius: 2, bgcolor: "#1e293b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem" }}>📦</Box>}
                                    {(item.estoque || 0) <= 0 && (
                                      <Box sx={{
                                        position: 'absolute',
                                        inset: 0,
                                        bgcolor: 'rgba(0,0,0,0.72)',
                                        borderRadius: 2,
                                        overflow: 'hidden',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        pointerEvents: 'none',
                                      }}>
                                        <Typography sx={{
                                          color: '#ef4444',
                                          fontWeight: 900,
                                          fontSize: '0.6rem',
                                          letterSpacing: 1,
                                          transform: 'rotate(-45deg)',
                                          textShadow: '0 0 6px rgba(239,68,68,0.8), 0 1px 2px rgba(0,0,0,0.9)',
                                          border: '1px solid #ef4444',
                                          px: 0.5,
                                          py: 0.2,
                                          borderRadius: 0.5,
                                        }}>
                                          ESGOTADO
                                        </Typography>
                                      </Box>
                                    )}
                                  </Box>
                                  <Chip label={`⚔️ ${item.dado || 1}`} size="small" sx={{ bgcolor: "#1e3a5f", fontSize: "0.55rem", height: 18, width: "100%" }} />
                                  <Chip 
                                    label={item.estoqueIlimitado ? "📦 ∞" : item.estoqueFixo ? `📦 ${item.estoque || 0} (Fixo)` : `📦 ${item.estoque || 0}`} 
                                    size="small" 
                                    sx={{ bgcolor: "#1e293b", color: item.estoqueIlimitado ? '#00e0ff' : item.estoqueFixo ? '#ff9800' : '#94a3b8', fontSize: "0.55rem", height: 18, width: "100%" }} 
                                  />
                                  <Chip label={`🔧 ${item.durabilidade || 100}%`} size="small" sx={{ bgcolor: "#1e293b", color: '#94a3b8', fontSize: "0.55rem", height: 18, width: "100%" }} />
                                  {/* 🟢 CHIP DE COMIDA/BEBIDA */}
                                  {item.isComida && (
                                    <Chip label={`🍽️ +${item.recuperacaoFome || 0}%`} size="small" sx={{ bgcolor: "#ff980022", color: "#ff9800", fontSize: "0.55rem", height: 18, width: "100%", fontWeight: 'bold' }} />
                                  )}
                                  {item.isBebida && (
                                    <Chip label={`🥤 +${item.recuperacaoSede || 0}%`} size="small" sx={{ bgcolor: "#3b82f622", color: "#3b82f6", fontSize: "0.55rem", height: 18, width: "100%", fontWeight: 'bold' }} />
                                  )}
                                  {/* 🟢 CHIP DE VARIEDADES */}
                                  {item.variedades && item.variedades.length > 0 && (
                                    <Chip label={`🎨 ${item.variedades.length}`} size="small" sx={{ bgcolor: "#1e3a5f", color: '#a855f7', fontSize: "0.55rem", height: 18, width: "100%", fontWeight: 'bold' }} />
                                  )}
                                </Box>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Typography variant="subtitle2" sx={{ fontWeight: "bold", color: '#fff', mb: 0.3 }}>{item.nome}</Typography>
                                  <Typography variant="caption" sx={{ color: "#94a3b8", display: "block", maxHeight: 80, overflowY: "auto", whiteSpace: "pre-line", wordBreak: "break-word" }}>
                                    {item.descricao}
                                  </Typography>
                                </Box>
                                <Box sx={{ textAlign: "right", display: "flex", flexDirection: "column", justifyContent: "space-between", minWidth: 70 }}>
                                  <Box>
                                    {item.isEscambo ? (
                                      <>
                                        <Typography variant="body2" sx={{ color: "#fbbf24", fontWeight: "bold", fontSize: '0.7rem' }}>
                                          🔁 {calcularQuantidadeEscamboEfetiva(item, demandaMap)}x
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: '#e9d5ff', display: 'block', fontSize: '0.6rem', fontWeight: 'bold' }}>
                                          {item.escamboItemNome || '—'}
                                        </Typography>
                                        {item.escamboVariacaoAuto && (
                                          <Typography variant="caption" sx={{ color: "#ff9800", display: "block", fontSize: '0.55rem' }}>📈 varia</Typography>
                                        )}
                                      </>
                                    ) : (
                                      <>
                                        <Typography variant="body2" sx={{ color: "#fbbf24", fontWeight: "bold" }}>💰 {precoExibicao}</Typography>
                                        {item.valor > 0 && (
                                          <Typography variant="caption" sx={{ 
                                            color: precoFinal > item.valor ? '#ef4444' : precoFinal < item.valor ? '#4caf50' : '#94a3b8',
                                            display: 'block',
                                            fontWeight: 'bold',
                                            fontSize: '0.6rem'
                                          }}>
                                            {precoFinal > item.valor ? '▲' : precoFinal < item.valor ? '▼' : '—'} {Math.abs(Math.round((precoFinal - item.valor) / item.valor * 100))}%
                                          </Typography>
                                        )}
                                        {demandaAtiva && (
                                          <Typography variant="caption" sx={{ color: "#ff9800", display: "block" }}>🔥 +{demandaAtiva.aumento}%</Typography>
                                        )}
                                      </>
                                    )}
                                  </Box>
                                  {(item.estoque || 0) <= 0 ? (
                                    <Button variant="contained" size="small" disabled sx={{ bgcolor: "#5e1b1b", color: "#ff8a80", fontSize: '0.65rem', "&.Mui-disabled": { color: "#ff8a80", bgcolor: "#5e1b1b" } }}>Esgotado</Button>
                                  ) : item.isEscambo ? (
                                    <Button variant="contained" size="small"
                                      onClick={() => {
                                        setComprandoItem({ ...item });
                                        setOfertaEscambo([null, null, null]);
                                        setResultadoEscambo(null);
                                        setCategoriaDestinoCompra("equipamentos");
                                        if (Object.keys(indiceComercio).length === 0) carregarIndiceComercio();
                                      }}
                                      sx={{ bgcolor: "#a855f7", "&:hover": { bgcolor: "#7b1fa2" }, fontSize: '0.65rem' }}>🔁 Trocar</Button>
                                  ) : (
                                    <Button variant="contained" size="small" startIcon={<ShoppingCartIcon sx={{ fontSize: '0.8rem' }} />}
                                      onClick={() => { setComprandoItem({ ...item, precoUnitario: precoExibicao, quantidadeCompra: 1 }); setCarteiraSelecionada(""); setCategoriaDestinoCompra("equipamentos"); setVariedadeIndex(0); }}
                                      sx={{ bgcolor: "#2e7d32", "&:hover": { bgcolor: "#1b5e20" }, fontSize: '0.65rem' }}>Comprar</Button>
                                  )}
                                  {isMaster && (
                                    <Box sx={{ display: "flex", gap: 0.5, mt: 1, justifyContent: 'flex-end', bgcolor: 'rgba(0,0,0,0.2)', p: 0.5, borderRadius: 1 }}>
                                      <Tooltip title="Transferir para Jogador">
                                        <IconButton size="small" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setTransferindoItem({ item }); setTransferenciaQuantidade(1); setTransferenciaDescontarEstoque(true); }} sx={{ color: '#a855f7', bgcolor: 'rgba(168,85,247,0.1)', '&:hover': { bgcolor: 'rgba(168,85,247,0.3)' } }}>
                                          <span style={{ fontSize: '0.9rem' }}>📤</span>
                                        </IconButton>
                                      </Tooltip>
                                      <IconButton size="small" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setEditandoItem(item); }} sx={{ color: '#00e0ff', bgcolor: 'rgba(0,224,255,0.1)', '&:hover': { bgcolor: 'rgba(0,224,255,0.3)' } }}><EditIcon sx={{ fontSize: '0.8rem' }} /></IconButton>
                                      <IconButton size="small" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); deletarItem(item.id); }} sx={{ color: '#ef4444', bgcolor: 'rgba(239,68,68,0.1)', '&:hover': { bgcolor: 'rgba(239,68,68,0.3)' } }}><DeleteIcon sx={{ fontSize: '0.8rem' }} /></IconButton>
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
      <Dialog open={!!editandoLoja} onClose={() => { setEditandoLoja(null); setLojaBaseId(""); }} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#1a1a2e', color: '#fff' }}>
          {editandoLoja?.id ? "✏️ Editar Loja" : "➕ Nova Loja"}
        </DialogTitle>
        <DialogContent sx={{ bgcolor: '#1a1a2e', pt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField fullWidth size="small" label="Nome da Loja" value={novaLojaNome} onChange={(e) => setNovaLojaNome(e.target.value)}
              InputProps={{ style: { color: '#fff' } }} InputLabelProps={{ style: { color: '#94a3b8' } }} />

            <FormControl fullWidth size="small">
              <InputLabel sx={{ color: '#94a3b8' }}>Categoria</InputLabel>
              <Select
                value={editandoLoja?.categoria || ""}
                onChange={(e) => setEditandoLoja(prev => ({ ...prev, categoria: e.target.value }))}
                sx={{ color: '#fff' }}
                label="Categoria"
              >
                <MenuItem value="">
                  <em style={{ color: '#64748b' }}>Sem categoria</em>
                </MenuItem>
                {CATEGORIAS_LOJA.map(cat => (
                  <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControlLabel
              control={<Checkbox checked={editandoLoja?.oculta || false} onChange={(e) => setEditandoLoja(prev => ({ ...prev, oculta: e.target.checked }))} sx={{ color: '#ef4444', '&.Mui-checked': { color: '#ef4444' } }} />}
              label={<Typography sx={{ color: '#fff', fontWeight: 'bold' }}>🙈 Ocultar Loja dos Jogadores</Typography>}
            />

            <FormControlLabel
              control={<Checkbox checked={editandoLoja?.permiteManipulacao ?? true} onChange={(e) => setEditandoLoja(prev => ({ ...prev, permiteManipulacao: e.target.checked }))} sx={{ color: '#9c27b0', '&.Mui-checked': { color: '#9c27b0' } }} />}
              label={<Typography sx={{ color: '#fff', fontWeight: 'bold' }}>🎭 Permitir Manipulação de Preço (Lábia)</Typography>}
            />

            {!editandoLoja?.id && (
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: '#94a3b8' }}>📋 Copiar de loja existente</InputLabel>
                <Select
                  value={lojaBaseId}
                  onChange={(e) => {
                    const lojaOrigem = lojas.find(l => l.id === e.target.value);
                    if (lojaOrigem) {
                      setLojaBaseId(e.target.value);
                      setEditandoLoja(prev => ({
                        ...prev,
                        nome: lojaOrigem.nome + " (cópia)",
                        donoNome: lojaOrigem.donoNome || "",
                        donoImagem: lojaOrigem.donoImagem || "",
                        donoDescricao: lojaOrigem.donoDescricao || "",
                        categoria: lojaOrigem.categoria || "",
                      }));
                      setNovaLojaNome(lojaOrigem.nome + " (cópia)");
                    }
                  }}
                  sx={{ color: '#fff' }}
                  label="Copiar de loja existente"
                >
                  <MenuItem value="">
                    <em style={{ color: '#64748b' }}>Nenhuma (loja vazia)</em>
                  </MenuItem>
                  {lojas.filter(l => l.id !== editandoLoja?.id).map(l => (
                    <MenuItem key={l.id} value={l.id}>
                      {l.nome} {l.categoria ? `(${l.categoria})` : ""}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

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
                  const urlDireta = getImagemDireta(data);
                  if (urlDireta) setEditandoLoja(prev => ({ ...prev, donoImagem: urlDireta }));
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
          <Button onClick={() => { setEditandoLoja(null); setNovaLojaNome(""); setLojaBaseId(""); }} sx={{ color: '#94a3b8' }}>Cancelar</Button>
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

            {!editandoItem?.id && (
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: '#94a3b8' }}>📋 Copiar de item existente</InputLabel>
                <Select
                  value={itemBaseId}
                  onChange={(e) => {
                    const itemOrigem = itens.find(i => i.id === e.target.value);
                    if (itemOrigem) {
                      setItemBaseId(e.target.value);
                      setEditandoItem({
                        ...editandoItem,
                        nome: itemOrigem.nome + " (cópia)",
                        descricao: itemOrigem.descricao || "",
                        valor: itemOrigem.valor || 0,
                        dado: itemOrigem.dado || 1,
                        durabilidade: itemOrigem.durabilidade || 100,
                        estoque: itemOrigem.estoque || 1,
                        imagem: itemOrigem.imagem || "",
                        tipoDano: itemOrigem.tipoDano || "Nenhum",
                        consumivel: itemOrigem.consumivel || "Nenhum",
                        consumivelValor: itemOrigem.consumivelValor || 0,
                        insumivel: itemOrigem.insumivel || "Nenhum",
                        insumivelValor: itemOrigem.insumivelValor || 0,
                        variedades: itemOrigem.variedades || [],
                      });
                    }
                  }}
                  sx={{ color: '#fff' }}
                  label="Copiar de item existente"
                >
                  <MenuItem value="">
                    <em style={{ color: '#64748b' }}>Nenhum (item vazio)</em>
                  </MenuItem>
                  {itens.filter(i => i.id !== editandoItem?.id).map(i => (
                    <MenuItem key={i.id} value={i.id}>
                      {i.nome}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            <TextField fullWidth size="small" label="Descrição" value={editandoItem?.descricao || ""}
              onChange={(e) => setEditandoItem(prev => ({ ...prev, descricao: e.target.value }))}
              InputProps={{ style: { color: '#fff' } }} InputLabelProps={{ style: { color: '#94a3b8' } }} multiline rows={2} />
            {/* 🟢 TOGGLE ESCAMBO */}
            <FormControlLabel
              control={
                <Checkbox
                  checked={editandoItem?.isEscambo || false}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setEditandoItem(prev => ({
                      ...prev,
                      isEscambo: checked,
                      ...(checked ? { valor: 0, escamboQuantidade: prev.escamboQuantidade || 1, escamboVariacaoAuto: prev.escamboVariacaoAuto ?? true } : {})
                    }));
                    if (checked && Object.keys(indiceComercio).length === 0) {
                      carregarIndiceComercio();
                    }
                  }}
                  sx={{ color: '#fbbf24', '&.Mui-checked': { color: '#fbbf24' } }}
                />
              }
              label={<Typography sx={{ color: '#fff', fontWeight: 'bold' }}>🔁 Aceitar Escambo?</Typography>}
            />

            <Grid container spacing={1}>
              <Grid item xs={6}>
                {editandoItem?.isEscambo ? (
                  <TextField fullWidth size="small" label="Quantidade (Escambo)" type="number"
                    value={editandoItem?.escamboQuantidade || 1}
                    onChange={(e) => setEditandoItem(prev => ({ ...prev, escamboQuantidade: Math.max(1, Number(e.target.value) || 1) }))}
                    InputProps={{ style: { color: '#fbbf24' } }} InputLabelProps={{ style: { color: '#94a3b8' } }} />
                ) : (
                  <TextField fullWidth size="small" label="Valor (💰)" type="number" value={editandoItem?.valor || 0}
                    onChange={(e) => setEditandoItem(prev => ({ ...prev, valor: Number(e.target.value) || 0 }))}
                    InputProps={{ style: { color: '#fbbf24' } }} InputLabelProps={{ style: { color: '#94a3b8' } }} />
                )}
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
                <TextField fullWidth size="small" label="Estoque" type="number" 
                  disabled={editandoItem?.estoqueIlimitado || editandoItem?.estoqueFixo}
                  value={editandoItem?.estoque || 0}
                  onChange={(e) => setEditandoItem(prev => ({ ...prev, estoque: Math.max(0, Number(e.target.value) || 0) }))}
                  InputProps={{ style: { color: '#fff' } }} InputLabelProps={{ style: { color: '#94a3b8' } }} />
              </Grid>
            </Grid>

            {/* 🟢 CAMPOS DE ESCAMBO (item-moeda + toggle variação) */}
            {editandoItem?.isEscambo && (
              <Box sx={{ p: 1.5, bgcolor: 'rgba(251,191,36,0.08)', border: '1px dashed #fbbf24', borderRadius: 1 }}>
                <Autocomplete
                  options={Object.entries(indiceComercio).map(([nome, valor]) => ({ nome, valor }))}
                  getOptionLabel={(opt) => (typeof opt === 'string' ? opt : `${opt.nome} (💰 ${opt.valor})`)}
                  value={
                    editandoItem?.escamboItemNome
                      ? { nome: editandoItem.escamboItemNome, valor: indiceComercio[editandoItem.escamboItemNome] || 0 }
                      : null
                  }
                  onChange={(e, novoValor) => {
                    setEditandoItem(prev => ({ ...prev, escamboItemNome: novoValor?.nome || "" }));
                  }}
                  filterOptions={(options, { inputValue }) => {
                    const busca = normalizarTexto(inputValue);
                    if (!busca) return options;
                    return options.filter(opt => normalizarTexto(opt.nome).includes(busca));
                  }}
                  isOptionEqualToValue={(opt, val) => opt.nome === val?.nome}
                  loading={carregandoIndice}
                  loadingText="⏳ Carregando itens..."
                  noOptionsText={carregandoIndice ? "⏳ Carregando..." : "Nenhum item encontrado"}
                  size="small"
                  fullWidth
                  sx={{ mb: 1 }}
                  componentsProps={{
                    paper: {
                      sx: {
                        bgcolor: "#0f172a",
                        color: "#fff",
                        border: '1px solid #a855f7',
                        boxShadow: '0 8px 30px rgba(168,85,247,0.3)',
                        '& .MuiAutocomplete-option': {
                          color: '#fff',
                          borderBottom: '1px solid rgba(255,255,255,0.05)',
                          '&:hover, &.Mui-focused': { bgcolor: 'rgba(168,85,247,0.2)' },
                          '&[aria-selected="true"]': { bgcolor: 'rgba(168,85,247,0.35)' },
                        },
                      },
                    },
                  }}
                  renderOption={(props, opt) => (
                    <li {...props}>
                      <span>{opt.nome}</span>
                      <span style={{ marginLeft: 8, color: '#94a3b8', fontSize: '0.75rem' }}>💰 {opt.valor}</span>
                    </li>
                  )}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="🔍 Buscar Item-Moeda"
                      placeholder="Digite para filtrar..."
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          color: '#fff',
                          bgcolor: '#0f172a',
                          '& fieldset': { borderColor: '#a855f766' },
                          '&:hover fieldset': { borderColor: '#a855f7' },
                          '&.Mui-focused fieldset': { borderColor: '#a855f7', borderWidth: 2 },
                        },
                        '& .MuiInputBase-input::placeholder': { color: '#64748b', opacity: 1 },
                      }}
                      InputLabelProps={{ ...params.InputLabelProps, sx: { color: '#94a3b8' } }}
                    />
                  )}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={editandoItem?.escamboVariacaoAuto ?? true}
                      onChange={(e) => setEditandoItem(prev => ({ ...prev, escamboVariacaoAuto: e.target.checked }))}
                      sx={{ color: '#4caf50', '&.Mui-checked': { color: '#4caf50' } }}
                    />
                  }
                  label={<Typography sx={{ color: '#fff', fontSize: '0.85rem' }}>📈 Variação automática de quantidade (demanda + tempo)</Typography>}
                />
              </Box>
            )}
            {/* 🟢 CHECKBOXES DE ESTOQUE ILIMITADO/FIXO */}
            <Box sx={{ display: 'flex', gap: 2, p: 1.5, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2, border: '1px dashed #555' }}>
              <FormControlLabel
                control={<Checkbox checked={editandoItem?.estoqueIlimitado || false} onChange={(e) => setEditandoItem(prev => ({ ...prev, estoqueIlimitado: e.target.checked, estoqueFixo: false }))} sx={{ color: '#00e0ff', '&.Mui-checked': { color: '#00e0ff' } }} />}
                label={<Typography sx={{ color: '#fff', fontWeight: 'bold' }}>♾️ Ilimitado</Typography>}
              />
              <FormControlLabel
                control={<Checkbox checked={editandoItem?.estoqueFixo || false} onChange={(e) => setEditandoItem(prev => ({ ...prev, estoqueFixo: e.target.checked, estoqueIlimitado: false }))} sx={{ color: '#ff9800', '&.Mui-checked': { color: '#ff9800' } }} />}
                label={<Typography sx={{ color: '#fff', fontWeight: 'bold' }}>📌 Fixo (Não altera)</Typography>}
              />
            </Box>
            {/* 🟢 NOVOS CAMPOS DE USOS E SUMIR */}
            <Grid container spacing={2} sx={{ mb: 1 }}>
              <Grid item xs={6}>
                <TextField
                  label="Usos Totais (0 = Infinito)" type="number" fullWidth size="small"
                  value={editandoItem?.usosTotais || 0}
                  onChange={(e) => setEditandoItem(prev => ({ ...prev, usosTotais: Math.max(0, Number(e.target.value) || 0) }))}
                  InputProps={{ inputProps: { min: 0 }, style: { color: '#fff' } }} 
                  InputLabelProps={{ style: { color: '#94a3b8' } }}
                  helperText="Cada uso gasta 100/Usos% de durabilidade."
                  FormHelperTextProps={{ sx: { color: '#64748b' } }}
                />
              </Grid>
              <Grid item xs={6} sx={{ display: 'flex', alignItems: 'center' }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={editandoItem?.sumirAoConsumir ?? true}
                      onChange={(e) => setEditandoItem(prev => ({ ...prev, sumirAoConsumir: e.target.checked }))}
                      sx={{ color: '#ef4444', '&.Mui-checked': { color: '#ef4444' } }}
                    />
                  }
                  label={<Typography sx={{ color: '#fff', fontWeight: 'bold' }}>🗑️ Sumir ao Consumir (Dur. 0)</Typography>}
                />
              </Grid>
            </Grid>

            {/* 🟢 NOVOS CHECKBOXES DE COMIDA/BEBIDA */}
            <Box sx={{ display: 'flex', gap: 2, p: 1.5, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2, border: '1px dashed #555' }}>
              <FormControlLabel
                control={<Checkbox checked={editandoItem?.isComida || false} onChange={(e) => setEditandoItem(prev => ({ ...prev, isComida: e.target.checked, isBebida: false, tipoDano: "Nenhum", consumivel: "Nenhum", insumivel: "Nenhum" }))} sx={{ color: '#4caf50', '&.Mui-checked': { color: '#4caf50' } }} />}
                label={<Typography sx={{ color: '#fff', fontWeight: 'bold' }}>🍽️ É Comida?</Typography>}
              />
              <FormControlLabel
                control={<Checkbox checked={editandoItem?.isBebida || false} onChange={(e) => setEditandoItem(prev => ({ ...prev, isBebida: e.target.checked, isComida: false, tipoDano: "Nenhum", consumivel: "Nenhum", insumivel: "Nenhum" }))} sx={{ color: '#3b82f6', '&.Mui-checked': { color: '#3b82f6' } }} />}
                label={<Typography sx={{ color: '#fff', fontWeight: 'bold' }}>🥤 É Bebida?</Typography>}
              />
            </Box>

            {(editandoItem?.isComida || editandoItem?.isBebida) && (
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="Recupera (%)"
                  type="number"
                  value={editandoItem?.isComida ? (editandoItem?.recuperacaoFome || 0) : (editandoItem?.recuperacaoSede || 0)}
                  onChange={(e) => {
                    const val = Math.max(0, Number(e.target.value) || 0);
                    setEditandoItem(prev => ({ ...prev, [prev.isComida ? 'recuperacaoFome' : 'recuperacaoSede']: val }));
                  }}
                  fullWidth size="small"
                  InputProps={{ style: { color: '#fff' } }} InputLabelProps={{ style: { color: '#94a3b8' } }}
                />
                <TextField
                  label="Validade (Dias)"
                  type="number"
                  value={editandoItem?.validadeDias || 15}
                  onChange={(e) => setEditandoItem(prev => ({ ...prev, validadeDias: Math.max(1, Number(e.target.value) || 15) }))}
                  fullWidth size="small"
                  InputProps={{ style: { color: '#fff' } }} InputLabelProps={{ style: { color: '#94a3b8' } }}
                />
              </Box>
            )}

            <FormControl fullWidth size="small" disabled={editandoItem?.isComida || editandoItem?.isBebida}>
              <InputLabel sx={{ color: '#94a3b8' }}>Tipo de Dano</InputLabel>
              <Select value={editandoItem?.tipoDano || "Nenhum"} onChange={(e) => setEditandoItem(prev => ({ ...prev, tipoDano: e.target.value }))}
                sx={{ color: '#fff' }} label="Tipo de Dano">
                {TIPOS_DANO.map(td => <MenuItem key={td.valor} value={td.valor} sx={{ color: td.cor }}>{td.label}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small" disabled={editandoItem?.isComida || editandoItem?.isBebida}>
              <InputLabel sx={{ color: '#94a3b8' }}>Consumível</InputLabel>
              <Select value={editandoItem?.consumivel || "Nenhum"} onChange={(e) => setEditandoItem(prev => ({ ...prev, consumivel: e.target.value }))}
                sx={{ color: '#fff' }} label="Consumível">
                {TIPOS_CONSUMIVEL.map(tc => <MenuItem key={tc.valor} value={tc.valor} sx={{ color: tc.cor }}>{tc.label}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small" disabled={editandoItem?.isComida || editandoItem?.isBebida}>
              <InputLabel sx={{ color: '#94a3b8' }}>Insumível</InputLabel>
              <Select value={editandoItem?.insumivel || "Nenhum"} onChange={(e) => setEditandoItem(prev => ({ ...prev, insumivel: e.target.value }))}
                sx={{ color: '#fff' }} label="Insumível">
                {TIPOS_INSUMIVEL.map(ti => <MenuItem key={ti.valor} value={ti.valor} sx={{ color: ti.cor }}>{ti.label}</MenuItem>)}
              </Select>
            </FormControl>
            {/* 🟢 SISTEMA DE VARIEDADES */}
            <Paper sx={{ p: 1.5, bgcolor: '#0f172a', border: '1px solid #a855f766', borderRadius: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="caption" sx={{ color: '#a855f7', fontWeight: 'bold' }}>
                  🎨 VARIEDADES (opcional)
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => setEditandoItem(prev => ({
                    ...prev,
                    variedades: [
                      ...(prev.variedades || []),
                      {
                        id: `v_${Date.now()}`,
                        nome: "",
                        descricao: "",
                        imagem: "",
                        dado: null,
                        tipoDano: null,
                        durabilidade: null,
                        precoAdicional: 0,
                        itensInclusos: [],
                      }
                    ]
                  }))}
                  sx={{ color: '#a855f7', borderColor: '#a855f7', fontSize: '0.65rem', minWidth: 'auto' }}
                >
                  Adicionar
                </Button>
              </Box>

              {(!editandoItem?.variedades || editandoItem.variedades.length === 0) && (
                <Typography variant="caption" sx={{ color: '#64748b', fontStyle: 'italic', fontSize: '0.7rem' }}>
                  Nenhuma variedade. Deixe vazio para o item ter só a versão base.
                </Typography>
              )}

              {(editandoItem?.variedades || []).map((var_, vi) => (
                <Paper key={var_.id} sx={{ p: 1.5, mb: 1, bgcolor: '#1a1a2e', border: '1px solid #334155' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="caption" sx={{ color: '#a855f7', fontWeight: 'bold' }}>
                      Variedade {vi + 1}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => setEditandoItem(prev => ({
                        ...prev,
                        variedades: (prev.variedades || []).filter(v => v.id !== var_.id)
                      }))}
                      sx={{ color: '#ef4444' }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <TextField
                      fullWidth size="small"
                      label="Nome da variedade (ex: Tamanho Grande, Cor Azul)"
                      value={var_.nome || ""}
                      onChange={(e) => setEditandoItem(prev => ({
                        ...prev,
                        variedades: prev.variedades.map(v => v.id === var_.id ? { ...v, nome: e.target.value } : v)
                      }))}
                      InputProps={{ style: { color: '#fff' } }} InputLabelProps={{ style: { color: '#94a3b8' } }}
                    />

                    <TextField
                      fullWidth size="small" multiline rows={2}
                      label="Descrição (opcional)"
                      value={var_.descricao || ""}
                      onChange={(e) => setEditandoItem(prev => ({
                        ...prev,
                        variedades: prev.variedades.map(v => v.id === var_.id ? { ...v, descricao: e.target.value } : v)
                      }))}
                      InputProps={{ style: { color: '#fff' } }} InputLabelProps={{ style: { color: '#94a3b8' } }}
                    />

                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth size="small" type="number"
                          label="Preço Adicional (💰)"
                          value={var_.precoAdicional || 0}
                          onChange={(e) => setEditandoItem(prev => ({
                            ...prev,
                            variedades: prev.variedades.map(v => v.id === var_.id ? { ...v, precoAdicional: Math.max(0, Number(e.target.value) || 0) } : v)
                          }))}
                          InputProps={{ style: { color: '#fbbf24' } }} InputLabelProps={{ style: { color: '#94a3b8' } }}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth size="small" type="number"
                          label="Dado (opcional)"
                          placeholder="Manter base"
                          value={var_.dado ?? ""}
                          onChange={(e) => {
                            const raw = e.target.value;
                            setEditandoItem(prev => ({
                              ...prev,
                              variedades: prev.variedades.map(v => v.id === var_.id ? { ...v, dado: raw === "" ? null : Math.min(10, Math.max(1, Number(raw) || 1)) } : v)
                            }));
                          }}
                          InputProps={{ style: { color: '#fff' } }} InputLabelProps={{ style: { color: '#94a3b8' } }}
                        />
                      </Grid>
                    </Grid>

                    <FormControl fullWidth size="small">
                      <InputLabel sx={{ color: '#94a3b8' }}>Tipo de Dano (opcional)</InputLabel>
                      <Select
                        value={var_.tipoDano || "__herdar__"}
                        onChange={(e) => setEditandoItem(prev => ({
                          ...prev,
                          variedades: prev.variedades.map(v => v.id === var_.id ? { ...v, tipoDano: e.target.value === "__herdar__" ? null : e.target.value } : v)
                        }))}
                        sx={{ color: '#fff' }} label="Tipo de Dano (opcional)"
                      >
                        <MenuItem value="__herdar__" sx={{ color: '#94a3b8', fontStyle: 'italic' }}>— Manter do item base —</MenuItem>
                        {TIPOS_DANO.map(td => <MenuItem key={td.valor} value={td.valor} sx={{ color: td.cor }}>{td.label}</MenuItem>)}
                      </Select>
                    </FormControl>

                    {/* Imagem da variedade */}
                    <Button
                      size="small" variant="outlined" component="label"
                      sx={{ color: '#94a3b8', borderColor: '#555', fontSize: '0.65rem' }}
                    >
                      📷 Imagem da variedade (opcional)
                      <input hidden type="file" accept="image/*" onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const fd = new FormData(); fd.append("image", file);
                        try {
                          const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: fd });
                          const data = await res.json();
                          const urlDireta = getImagemDireta(data);
                          if (urlDireta) setEditandoItem(prev => ({
                            ...prev,
                            variedades: prev.variedades.map(v => v.id === var_.id ? { ...v, imagem: urlDireta } : v)
                          }));
                        } catch (err) { alert("Erro no upload"); }
                      }} />
                    </Button>
                    {var_.imagem && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <img src={var_.imagem} alt="Preview" style={{ width: 50, height: 50, borderRadius: 8, objectFit: 'cover' }} />
                        <Button size="small" onClick={() => setEditandoItem(prev => ({
                          ...prev,
                          variedades: prev.variedades.map(v => v.id === var_.id ? { ...v, imagem: "" } : v)
                        }))} sx={{ color: '#ef4444', fontSize: '0.65rem' }}>Remover</Button>
                      </Box>
                    )}

                    {/* 🟢 ITENS INCLUSOS */}
                    <Paper sx={{ p: 1, bgcolor: '#0a0a12', border: '1px dashed #a855f744', borderRadius: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Typography variant="caption" sx={{ color: '#a855f7', fontWeight: 'bold', fontSize: '0.65rem' }}>
                          🎁 ITENS INCLUSOS (vêm junto)
                        </Typography>
                        <Button
                          size="small"
                          onClick={() => setEditandoItem(prev => ({
                            ...prev,
                            variedades: prev.variedades.map(v => v.id === var_.id ? {
                              ...v,
                              itensInclusos: [...(v.itensInclusos || []), { nome: "", dado: 1, tipoDano: "Nenhum", quantidade: 1, imagem: "" }]
                            } : v)
                          }))}
                          sx={{ color: '#a855f7', fontSize: '0.6rem', minWidth: 'auto', p: 0.5 }}
                        >
                          + Item
                        </Button>
                      </Box>

                      {(var_.itensInclusos || []).map((inc, iIdx) => (
                        <Box key={iIdx} sx={{ display: 'flex', gap: 0.5, mb: 0.5, alignItems: 'center' }}>
                          <TextField
                            size="small" placeholder="Nome do item"
                            value={inc.nome}
                            onChange={(e) => setEditandoItem(prev => ({
                              ...prev,
                              variedades: prev.variedades.map(v => v.id === var_.id ? {
                                ...v,
                                itensInclusos: v.itensInclusos.map((it, k) => k === iIdx ? { ...it, nome: e.target.value } : it)
                              } : v)
                            }))}
                            InputProps={{ style: { color: '#fff', fontSize: '0.75rem' } }}
                            sx={{ flex: 2 }}
                          />
                          <TextField
                            size="small" type="number" placeholder="Qtd"
                            value={inc.quantidade || 1}
                            onChange={(e) => setEditandoItem(prev => ({
                              ...prev,
                              variedades: prev.variedades.map(v => v.id === var_.id ? {
                                ...v,
                                itensInclusos: v.itensInclusos.map((it, k) => k === iIdx ? { ...it, quantidade: Math.max(1, Number(e.target.value) || 1) } : it)
                              } : v)
                            }))}
                            InputProps={{ style: { color: '#fff', fontSize: '0.75rem' } }}
                            sx={{ width: 55 }}
                          />
                          <FormControl size="small" sx={{ flex: 1.5 }}>
                            <Select
                              value={inc.tipoDano || "Nenhum"}
                              onChange={(e) => setEditandoItem(prev => ({
                                ...prev,
                                variedades: prev.variedades.map(v => v.id === var_.id ? {
                                  ...v,
                                  itensInclusos: v.itensInclusos.map((it, k) => k === iIdx ? { ...it, tipoDano: e.target.value } : it)
                                } : v)
                              }))}
                              sx={{ color: '#fff', fontSize: '0.7rem' }}
                            >
                              {TIPOS_DANO.map(td => <MenuItem key={td.valor} value={td.valor} sx={{ color: td.cor, fontSize: '0.75rem' }}>{td.label}</MenuItem>)}
                            </Select>
                          </FormControl>
                          <IconButton
                            size="small"
                            onClick={() => setEditandoItem(prev => ({
                              ...prev,
                              variedades: prev.variedades.map(v => v.id === var_.id ? {
                                ...v,
                                itensInclusos: v.itensInclusos.filter((_, k) => k !== iIdx)
                              } : v)
                            }))}
                            sx={{ color: '#ef4444' }}
                          >
                            <DeleteIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Box>
                      ))}

                      {(var_.itensInclusos || []).length === 0 && (
                        <Typography variant="caption" sx={{ color: '#475569', fontSize: '0.6rem', fontStyle: 'italic' }}>
                          Nenhum item incluso nesta variedade.
                        </Typography>
                      )}
                    </Paper>
                  </Box>
                </Paper>
              ))}
            </Paper>

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
      <Dialog open={!!comprandoItem && !comprandoItem?.isEscambo} onClose={() => setComprandoItem(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#1a1a2e', color: '#fff' }}>🛒 Comprar Item</DialogTitle>
        <DialogContent sx={{ bgcolor: '#1a1a2e', pt: 2 }}>
          {comprandoItem && (() => {
            const variedades = comprandoItem.variedades || [];
            const temVariedades = variedades.length > 0;
            const variedadeAtual = temVariedades ? variedades[variedadeIndex] : null;
            const precoUnit = comprandoItem.precoUnitario + (variedadeAtual?.precoAdicional || 0);
            const imgMostrar = variedadeAtual?.imagem || comprandoItem.imagem || "";
            const nomeMostrar = variedadeAtual ? `${comprandoItem.nome} (${variedadeAtual.nome})` : comprandoItem.nome;

            return (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

                {/* 🟢 NAVEGADOR DE VARIEDADES */}
                {temVariedades && (
                  <Paper sx={{ p: 1.5, bgcolor: '#0f172a', border: '1px solid #a855f766', borderRadius: 2 }}>
                    <Typography variant="caption" sx={{ color: '#a855f7', fontWeight: 'bold', display: 'block', mb: 1 }}>
                      🎨 ESCOLHA UMA VARIEDADE ({variedadeIndex + 1}/{variedades.length})
                    </Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <IconButton
                        size="small"
                        onClick={() => setVariedadeIndex((i) => (i - 1 + variedades.length) % variedades.length)}
                        disabled={variedades.length <= 1}
                        sx={{
                          bgcolor: '#a855f7', color: '#fff', width: 32, height: 32,
                          '&:hover': { bgcolor: '#7b1fa2' },
                          '&.Mui-disabled': { bgcolor: '#334155', color: '#64748b' }
                        }}
                      >
                        ‹
                      </IconButton>

                      <Box sx={{ flex: 1, textAlign: 'center' }}>
                        <Typography sx={{ color: '#fff', fontWeight: 'bold', fontSize: '0.9rem' }}>
                          {variedadeAtual?.nome || '—'}
                        </Typography>
                        {variedadeAtual?.descricao && (
                          <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>
                            {variedadeAtual.descricao}
                          </Typography>
                        )}
                        {variedadeAtual?.precoAdicional > 0 && (
                          <Chip
                            label={`+💰 ${variedadeAtual.precoAdicional}`}
                            size="small"
                            sx={{ mt: 0.5, bgcolor: '#fbbf2422', color: '#fbbf24', fontSize: '0.65rem', height: 18 }}
                          />
                        )}
                      </Box>

                      <IconButton
                        size="small"
                        onClick={() => setVariedadeIndex((i) => (i + 1) % variedades.length)}
                        disabled={variedades.length <= 1}
                        sx={{
                          bgcolor: '#a855f7', color: '#fff', width: 32, height: 32,
                          '&:hover': { bgcolor: '#7b1fa2' },
                          '&.Mui-disabled': { bgcolor: '#334155', color: '#64748b' }
                        }}
                      >
                        ›
                      </IconButton>
                    </Box>

                    {imgMostrar && (
                      <Box sx={{ mt: 1, textAlign: 'center' }}>
                        <img
                          src={imgMostrar}
                          alt={variedadeAtual?.nome}
                          style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8, cursor: 'zoom-in' }}
                          onClick={() => { setLightboxImage(imgMostrar); setZoom(1); }}
                        />
                      </Box>
                    )}

                    {variedadeAtual?.itensInclusos && variedadeAtual.itensInclusos.length > 0 && (
                      <Box sx={{ mt: 1.5, p: 1, bgcolor: '#1e1a2e', borderRadius: 1, border: '1px dashed #a855f766' }}>
                        <Typography variant="caption" sx={{ color: '#a855f7', fontWeight: 'bold', display: 'block', mb: 0.5 }}>
                          🎁 VEM JUNTO:
                        </Typography>
                        {variedadeAtual.itensInclusos.map((inc, idx) => (
                          <Typography key={idx} variant="caption" sx={{ color: '#fff', display: 'block', fontSize: '0.7rem' }}>
                            • {inc.quantidade || 1}x {inc.nome}
                            {inc.tipoDano && inc.tipoDano !== "Nenhum" && ` (${inc.tipoDano})`}
                            {inc.dado && inc.dado > 1 && ` · ${inc.dado}d10`}
                          </Typography>
                        ))}
                      </Box>
                    )}
                  </Paper>
                )}

                <Typography variant="body1" sx={{ color: '#fff', fontWeight: 'bold' }}>{nomeMostrar}</Typography>
                <Typography variant="body2" sx={{ color: '#fbbf24' }}>
                  Preço unitário: 💰 {precoUnit}
                  {variedadeAtual?.precoAdicional > 0 && (
                    <span style={{ color: '#94a3b8', marginLeft: 6, fontSize: '0.75rem' }}>
                      (base {comprandoItem.precoUnitario} + {variedadeAtual.precoAdicional})
                    </span>
                  )}
                </Typography>

                <FormControl fullWidth size="small">
                  <InputLabel sx={{ color: '#94a3b8' }}>Quantidade</InputLabel>
                  <Select value={comprandoItem.quantidadeCompra || 1} onChange={(e) => setComprandoItem(prev => ({ ...prev, quantidadeCompra: Number(e.target.value) }))}
                    sx={{ color: '#fff' }} label="Quantidade">
                    {[1,2,3,4,5,10,20].map(q => <MenuItem key={q} value={q}>{q}</MenuItem>)}
                  </Select>
                </FormControl>

                <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                  Total: <strong style={{ color: '#fbbf24' }}>💰 {precoUnit * (comprandoItem.quantidadeCompra || 1)}</strong>
                </Typography>

                <FormControl fullWidth size="small">
                  <InputLabel sx={{ color: '#94a3b8' }}>Carteira</InputLabel>
                  <Select value={carteiraSelecionada} onChange={(e) => setCarteiraSelecionada(e.target.value)} sx={{ color: '#fff' }} label="Carteira">
                    {(Array.isArray(fichasMap[currentUserEmail]?.carteiras) ? fichasMap[currentUserEmail].carteiras : []).map(c => (
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
            );
          })()}
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#1a1a2e', borderTop: '1px solid #334155' }}>
          <Button onClick={() => setComprandoItem(null)} sx={{ color: '#94a3b8' }}>Cancelar</Button>
          <Button variant="contained" onClick={comprarItem} sx={{ bgcolor: '#2e7d32' }}>Confirmar Compra</Button>
        </DialogActions>
      </Dialog>

      {/* 🟢 MODAL DE ESCAMBO */}
      <Dialog
        open={!!comprandoItem && !!comprandoItem?.isEscambo}
        onClose={() => { setComprandoItem(null); setOfertaEscambo([null, null, null]); setResultadoEscambo(null); }}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { bgcolor: "#0f172a", border: "2px solid #a855f7", borderRadius: 3, background: "linear-gradient(145deg, #0f172a, #1a1a2e)" } }}
      >
        <DialogTitle sx={{ color: '#e9d5ff', display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: '1px solid #a855f744', background: 'linear-gradient(90deg, rgba(168,85,247,0.15), transparent)' }}>
          <span style={{ fontSize: '1.5rem' }}>🔁</span>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Escambo</Typography>
          {comprandoItem && (
            <Chip label={comprandoItem.nome} size="small" sx={{ ml: 'auto', bgcolor: '#a855f733', color: '#e9d5ff', fontWeight: 'bold' }} />
          )}
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {comprandoItem && (() => {
            const valorNecessario = calcularValorNecessarioEscambo();
            const valorOfertado = calcularValorOfertaEscambo();
            const pct = calcularPercentualEscambo();
            const qtdNecessaria = calcularQuantidadeEscamboEfetiva(comprandoItem, demandaMap);
            const valorUnitMoeda = indiceComercio[comprandoItem.escamboItemNome] || 0;
            const hashAtual = gerarHashOfertaEscambo(ofertaEscambo);
            const travado = fichasMap[currentUserEmail]?.escamboFalhas?.[comprandoItem.id] === hashAtual && hashAtual !== "";
            const ficha = fichasMap[currentUserEmail];
            const todosItens = [
              ...((ficha?.equipamentos || []).map((it, i) => ({ ...it, _cat: 'equipamentos', _idx: i }))),
              ...((ficha?.vestes || []).map((it, i) => ({ ...it, _cat: 'vestes', _idx: i }))),
              ...((ficha?.diversos || []).map((it, i) => ({ ...it, _cat: 'diversos', _idx: i }))),
            ].filter(it => it.nome);
            const indicesOcupados = ofertaEscambo.filter(Boolean).map(s => `${s.categoria}-${s.index}`);

            return (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Paper sx={{ p: 2, bgcolor: 'rgba(168,85,247,0.08)', border: '1px solid #a855f744', borderRadius: 2 }}>
                  <Typography sx={{ color: '#e9d5ff', fontWeight: 'bold', fontSize: '0.9rem', mb: 0.5 }}>
                    📋 O vendedor quer:
                  </Typography>
                  <Typography sx={{ color: '#fff', fontSize: '1.1rem', fontWeight: 'bold' }}>
                    🔁 {qtdNecessaria}x {comprandoItem.escamboItemNome || '(sem item definido)'}
                  </Typography>
                  {valorUnitMoeda > 0 ? (
                    <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                      💰 {valorUnitMoeda} cada · Total: <strong style={{ color: '#fbbf24' }}>💰 {valorNecessario}</strong>
                      {comprandoItem.escamboVariacaoAuto && ' (varia com demanda/tempo)'}
                    </Typography>
                  ) : (
                    <Typography variant="caption" sx={{ color: '#ef4444' }}>
                      ⚠️ Item-moeda não encontrado no comércio (índice não carregado). Recarregue a loja.
                    </Typography>
                  )}
                </Paper>

                <Typography sx={{ color: '#e9d5ff', fontWeight: 'bold', fontSize: '0.9rem' }}>💼 Sua oferta (até 3 itens):</Typography>
                {[0, 1, 2].map(slotIdx => {
                  const slot = ofertaEscambo[slotIdx];
                  if (!slot) {
                    const opcoes = todosItens.filter(it => !indicesOcupados.includes(`${it._cat}-${it._idx}`));
                    return (
                      <Autocomplete
                        key={slotIdx}
                        options={opcoes}
                        getOptionLabel={(opt) => typeof opt === 'string' ? opt : `${opt.nome} ×${opt.quantidade || 1} (🔧${opt.durabilidade ?? 100}%)`}
                        value={null}
                        onChange={(e, novo) => {
                          if (!novo) return;
                          const nova = [...ofertaEscambo];
                          nova[slotIdx] = { categoria: novo._cat, index: novo._idx, quantidade: 1 };
                          setOfertaEscambo(nova);
                        }}
                        filterOptions={(options, { inputValue }) => {
                          const busca = normalizarTexto(inputValue);
                          if (!busca) return options;
                          return options.filter(opt => normalizarTexto(opt.nome).includes(busca));
                        }}
                        isOptionEqualToValue={(opt, val) => opt._cat === val?._cat && opt._idx === val?._idx}
                        noOptionsText={opcoes.length === 0 ? "Inventário vazio ou todos itens já na oferta" : "Nenhum item encontrado"}
                        size="small"
                        fullWidth
                        componentsProps={{
                          paper: {
                            sx: {
                              bgcolor: "#0f172a",
                              color: "#fff",
                              border: '1px solid #a855f7',
                              boxShadow: '0 8px 30px rgba(168,85,247,0.3)',
                              '& .MuiAutocomplete-option': {
                                color: '#fff',
                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                '&:hover, &.Mui-focused': { bgcolor: 'rgba(168,85,247,0.2)' },
                                '&[aria-selected="true"]': { bgcolor: 'rgba(168,85,247,0.35)' },
                              },
                            },
                          },
                        }}
                        renderOption={(props, opt) => (
                          <li {...props} key={`${opt._cat}-${opt._idx}`}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                              <span>{opt.nome}</span>
                              <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>
                                ×{opt.quantidade || 1} · 🔧{opt.durabilidade ?? 100}%
                                {indiceComercio[opt.nome] ? ` · 💰 ${indiceComercio[opt.nome]}` : ''}
                              </span>
                            </Box>
                          </li>
                        )}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            placeholder={`🔍 Slot ${slotIdx + 1} · Buscar item do inventário...`}
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                color: '#fff',
                                bgcolor: '#0f172a',
                                borderStyle: 'dashed',
                                '& fieldset': { borderColor: '#a855f766', borderStyle: 'dashed' },
                                '&:hover fieldset': { borderColor: '#a855f7' },
                                '&.Mui-focused fieldset': { borderColor: '#a855f7', borderWidth: 2 },
                              },
                              '& .MuiInputBase-input::placeholder': { color: '#64748b', opacity: 1, fontSize: '0.85rem' },
                            }}
                          />
                        )}
                      />
                    );
                  }
                  const itemFicha = ficha?.[slot.categoria]?.[slot.index];
                  if (!itemFicha) {
                    return (
                      <Paper key={slotIdx} sx={{ p: 1.5, bgcolor: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography sx={{ color: '#ef4444', fontSize: '0.85rem', flex: 1 }}>
                            ⚠️ Item removido do inventário. Remova e escolha outro.
                          </Typography>
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => { const nova = [...ofertaEscambo]; nova[slotIdx] = null; setOfertaEscambo(nova); }}
                            sx={{ bgcolor: '#ef4444', fontSize: '0.7rem' }}
                          >
                            Limpar slot
                          </Button>
                        </Box>
                      </Paper>
                    );
                  }
                  const isMoeda = itemFicha.nome === comprandoItem.escamboItemNome;
                  const valorMercado = indiceComercio[itemFicha.nome] || 0;
                  const valorEste = calcularValorItemOferecido({ ...itemFicha, quantidade: slot.quantidade }, valorMercado, isMoeda);
                  const dur = itemFicha.durabilidade ?? 100;
                  const fatorDur = calcularFatorDurabilidade(dur);
                  return (
                    <Paper key={slotIdx} sx={{ p: 1.5, bgcolor: '#0f172a', border: `1px solid ${isMoeda ? '#4caf50' : '#a855f766'}`, borderRadius: 2 }}>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
                        <Typography sx={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 'bold', mr: 0.5 }}>
                          SLOT {slotIdx + 1}
                        </Typography>
                        <Typography sx={{ color: '#fff', fontWeight: 'bold', flex: 1 }}>{itemFicha.nome}</Typography>
                        {isMoeda && <Chip label="✔ desejado" size="small" sx={{ bgcolor: '#4caf5033', color: '#4caf50', fontWeight: 'bold', height: 20 }} />}
                        <IconButton size="small" onClick={() => { const nova = [...ofertaEscambo]; nova[slotIdx] = null; setOfertaEscambo(nova); }} sx={{ color: '#ef4444' }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <TextField
                          size="small"
                          type="number"
                          label="Qtd"
                          value={slot.quantidade}
                          onChange={(e) => {
                            const nova = [...ofertaEscambo];
                            nova[slotIdx] = { ...slot, quantidade: Math.max(1, Math.min(itemFicha.quantidade || 1, Number(e.target.value) || 1)) };
                            setOfertaEscambo(nova);
                          }}
                          inputProps={{ min: 1, max: itemFicha.quantidade || 1 }}
                          InputProps={{ sx: { color: '#fff', width: 70 } }}
                          InputLabelProps={{ sx: { color: '#94a3b8' } }}
                          helperText={`Máx: ${itemFicha.quantidade || 1}`}
                          FormHelperTextProps={{ sx: { color: '#64748b', fontSize: '0.6rem' } }}
                        />
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>
                            🔧 Dur: {dur}% {fatorDur < 1 && `(× ${fatorDur.toFixed(2)})`}
                          </Typography>
                          <Typography variant="caption" sx={{ color: isMoeda ? '#4caf50' : '#ff9800', display: 'block', fontWeight: 'bold' }}>
                            {isMoeda ? '100% do valor' : '50% do valor (não é a moeda)'} → 💰 {valorEste}
                          </Typography>
                        </Box>
                      </Box>
                    </Paper>
                  );
                })}

                <Paper sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.4)', border: '1px solid #334155', borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography sx={{ color: '#94a3b8' }}>💰 Valor ofertado:</Typography>
                    <Typography sx={{ color: '#fbbf24', fontWeight: 'bold' }}>💰 {valorOfertado} / {valorNecessario}</Typography>
                  </Box>
                  <Box sx={{ height: 14, bgcolor: '#0f172a', borderRadius: 7, overflow: 'hidden', mb: 1.5 }}>
                    <Box sx={{ width: `${pct}%`, height: '100%', bgcolor: pct >= 100 ? '#4caf50' : pct >= 50 ? '#ff9800' : '#ef4444', transition: 'width 0.3s' }} />
                  </Box>
                  <Typography sx={{ color: pct >= 100 ? '#4caf50' : '#fbbf24', fontWeight: 'bold', fontSize: '1.1rem', textAlign: 'center' }}>
                    🎲 Chance: {pct}%
                  </Typography>
                  {travado && (
                    <Typography variant="caption" sx={{ color: '#ef4444', display: 'block', mt: 1, textAlign: 'center', fontWeight: 'bold' }}>
                      🔒 Você já falhou com esses itens. Troque ao menos 1.
                    </Typography>
                  )}
                </Paper>

                <FormControl fullWidth size="small">
                  <InputLabel sx={{ color: '#94a3b8' }}>Categoria de Destino do Item</InputLabel>
                  <Select value={categoriaDestinoCompra} onChange={(e) => setCategoriaDestinoCompra(e.target.value)} sx={{ color: '#fff', bgcolor: '#0f172a' }} label="Categoria de Destino do Item">
                    <MenuItem value="equipamentos">⚔️ Equipamentos</MenuItem>
                    <MenuItem value="vestes">👕 Vestimentas</MenuItem>
                    <MenuItem value="diversos">📦 Diversos</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            );
          })()}
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #334155', flexWrap: 'wrap', gap: 1 }}>
          <Button onClick={() => { setComprandoItem(null); setOfertaEscambo([null, null, null]); setResultadoEscambo(null); }} sx={{ color: '#94a3b8' }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={executarTentativaEscambo}
            disabled={carregandoEscambo || calcularPercentualEscambo() <= 0 || fichasMap[currentUserEmail]?.escamboFalhas?.[comprandoItem?.id] === gerarHashOfertaEscambo(ofertaEscambo) && gerarHashOfertaEscambo(ofertaEscambo) !== ""}
            sx={{ bgcolor: calcularPercentualEscambo() >= 100 ? '#4caf50' : '#a855f7', fontWeight: 'bold', '&:hover': { bgcolor: calcularPercentualEscambo() >= 100 ? '#388e3c' : '#7b1fa2' } }}
          >
            {calcularPercentualEscambo() >= 100 ? '🤝 Adquirir Direto' : `🎲 Tentar (${calcularPercentualEscambo()}%)`}
          </Button>
          {podeManipular() && (
            <Button
              variant="outlined"
              onClick={abrirManipulacao}
              sx={{ color: '#ff9800', borderColor: '#ff9800', fontWeight: 'bold' }}
            >
              🎭 Manipular
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* 🟢 MODAL DE MANIPULAÇÃO */}
      <Dialog
        open={manipulacaoOpen}
        onClose={() => { setManipulacaoOpen(false); setRolagemManipulacao(null); }}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { bgcolor: "#0f172a", border: "2px solid #ff9800", borderRadius: 3 } }}
      >
        <DialogTitle sx={{ color: '#ff9800', display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid #ff980044' }}>
          <span style={{ fontSize: '1.5rem' }}>🎭</span>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Manipulação de Preço</Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {rolagemManipulacao && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Paper sx={{ p: 2, bgcolor: '#1a1a2e', border: '1px solid #334155', borderRadius: 2 }}>
                <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>🎭 Lábia: {rolagemManipulacao.labia} · 🧠 Inteligência: {rolagemManipulacao.inteligencia}</Typography>
                <Typography sx={{ color: '#fff', fontWeight: 'bold' }}>🎲 Pool: {rolagemManipulacao.totalDados}d10</Typography>
                <Typography sx={{ color: '#ff9800', fontWeight: 'bold' }}>🎯 Alvo: {rolagemManipulacao.alvo}+ (51% de {rolagemManipulacao.totalDados * 10})</Typography>
              </Paper>
              <Paper sx={{ p: 2, bgcolor: rolagemManipulacao.sucesso ? 'rgba(76,175,80,0.15)' : 'rgba(239,68,68,0.15)', border: `1px solid ${rolagemManipulacao.sucesso ? '#4caf50' : '#ef4444'}`, borderRadius: 2 }}>
                <Typography sx={{ color: '#fff', fontFamily: 'monospace', mb: 1 }}>
                  [{rolagemManipulacao.rolls.join(', ')}] = {rolagemManipulacao.total}
                </Typography>
                <Typography sx={{ color: rolagemManipulacao.sucesso ? '#4caf50' : '#ef4444', fontWeight: 'bold', fontSize: '1.1rem' }}>
                  {rolagemManipulacao.sucesso ? '✅ SUCESSO! O vendedor aceitou a oferta.' : '❌ FALHOU! O vendedor recusou.'}
                </Typography>
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #334155' }}>
          <Button onClick={() => { setManipulacaoOpen(false); setRolagemManipulacao(null); }} sx={{ color: '#94a3b8' }}>
            {rolagemManipulacao?.sucesso ? 'Cancelar' : 'Fechar'}
          </Button>
          {rolagemManipulacao?.sucesso && (
            <Button variant="contained" onClick={confirmarManipulacao} sx={{ bgcolor: '#4caf50', '&:hover': { bgcolor: '#388e3c' }, fontWeight: 'bold' }}>
              ✅ Aplicar Escambo
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* 🟢 MODAL: TRANSFERIR ITEM DA LOJA PARA JOGADOR */}
      <Dialog open={!!transferindoItem} onClose={() => setTransferindoItem(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#1a1a2e', color: '#fff', borderBottom: '1px solid #334155' }}>
          📤 Transferir Item para Jogador
        </DialogTitle>
        <DialogContent sx={{ bgcolor: '#1a1a2e', pt: 2 }}>
          {transferindoItem && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography sx={{ color: '#fff', fontWeight: 'bold' }}>
                Item: {transferindoItem.item.nome}
              </Typography>
              <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                Estoque atual: {transferindoItem.item.estoqueIlimitado ? '∞ (Ilimitado)' : transferindoItem.item.estoqueFixo ? `${transferindoItem.item.estoque} (Fixo)` : transferindoItem.item.estoque}
              </Typography>

              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: '#94a3b8' }}>Jogador Destino</InputLabel>
                <Select 
                  value={transferenciaDestino} 
                  onChange={(e) => setTransferenciaDestino(e.target.value)} 
                  sx={{ color: '#fff', bgcolor: '#0f172a' }}
                  MenuProps={{ PaperProps: { sx: { bgcolor: "#0f172a", color: "#fff", maxHeight: 400 } } }}
                >
                  <MenuItem value="">-- Selecione --</MenuItem>
                  <MenuItem disabled sx={{ opacity: 1, borderBottom: '1px solid #4caf50', mt: 0.5 }}>
                    <Typography variant="caption" sx={{ color: '#4caf50', fontWeight: 'bold' }}>── PJs ──</Typography>
                  </MenuItem>
                  {Object.entries(fichasMap).filter(([_, d]) => (d.tipoFicha || "PJ") === "PJ").map(([email, data]) => (
                    <MenuItem key={email} value={email}>📋 {data.nome || email}</MenuItem>
                  ))}
                  <MenuItem disabled sx={{ opacity: 1, borderBottom: '1px solid #ff9800', mt: 1 }}>
                    <Typography variant="caption" sx={{ color: '#ff9800', fontWeight: 'bold' }}>── PMs ──</Typography>
                  </MenuItem>
                  {Object.entries(fichasMap).filter(([_, d]) => d.tipoFicha === "PM").map(([email, data]) => (
                    <MenuItem key={email} value={email}>📋 {data.nome || email}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: '#94a3b8' }}>Categoria no Inventário</InputLabel>
                <Select value={transferenciaCategoria} onChange={(e) => setTransferenciaCategoria(e.target.value)} sx={{ color: '#fff', bgcolor: '#0f172a' }}>
                  <MenuItem value="equipamentos">⚔️ Equipamentos</MenuItem>
                  <MenuItem value="vestes">👕 Vestimentas</MenuItem>
                  <MenuItem value="diversos">📦 Diversos</MenuItem>
                </Select>
              </FormControl>

              <TextField 
                label="Quantidade" 
                type="number" 
                size="small"
                value={transferenciaQuantidade}
                onChange={(e) => setTransferenciaQuantidade(Math.max(1, Number(e.target.value) || 1))}
                InputProps={{ sx: { color: '#fff', bgcolor: '#0f172a' } }}
                InputLabelProps={{ sx: { color: '#94a3b8' } }}
              />

              <FormControlLabel
                control={<Checkbox checked={transferenciaDescontarEstoque} onChange={(e) => setTransferenciaDescontarEstoque(e.target.checked)} disabled={transferindoItem.item.estoqueIlimitado || transferindoItem.item.estoqueFixo} sx={{ color: '#ef4444', '&.Mui-checked': { color: '#ef4444' } }} />}
                label={<Typography sx={{ color: '#fff', fontWeight: 'bold' }}>Descontar do estoque da loja?</Typography>}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#1a1a2e', borderTop: '1px solid #334155', p: 2 }}>
          <Button onClick={() => setTransferindoItem(null)} sx={{ color: '#94a3b8' }}>Cancelar</Button>
          <Button variant="contained" onClick={executarTransferenciaMaster} sx={{ bgcolor: '#a855f7', color: '#fff', '&:hover': { bgcolor: '#7b1fa2' } }}>
            Transferir
          </Button>
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