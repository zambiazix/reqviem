// src/pages/MapaMundi.jsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import svgPanZoom from "svg-pan-zoom";
import {
  Box,
  Button,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import UploadIcon from "@mui/icons-material/Upload";
import CloseIcon from "@mui/icons-material/Close";
import { useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { db } from "../firebaseConfig";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import LZString from "lz-string";

const MESTRE_EMAIL = "mestre@reqviemrpg.com";
const CHUNK_SIZE = 800000;

const MAPS = [
  { id: "MapaMundi", title: "Mapa Político" },
  { id: "Mapa2", title: "Mapa de Biomas" },
  { id: "Mapa3", title: "Mapa de Culturas" },
  { id: "Mapa4", title: "Mapa de Religiões" },
];

const EMOJIS_MARCADORES = [
  "📍", "🏰", "🏯", "🏠", "🏘️", "🏙️", "🏚️", "🏛️", "🏟️", "🏦", "🏨", "🏩", "🏪", "🏫", "🏬", "🏭", "🏯", "🏰",
  "⛪", "🕌", "🕍", "⛩️", "🕋", "🏔️", "⛰️", "🌋", "🗻", "🏕️", "🏖️", "🏜️", "🏝️", "🏞️",
  "🌲", "🌳", "🌴", "🌵", "🌾", "🌿", "🍀", "🌊", "🌋", "🗿", "🏆", "🎯", "⚔️", "🛡️",
  "👑", "💀", "☠️", "👻", "🐉", "🐲", "🦄", "🐎", "🦅", "🦉", "🐺", "🦊", "🐻", "🐗",
  "⭐", "🌟", "✨", "🔥", "💧", "❄️", "🌪️", "🌈", "☀️", "🌙", "⚡", "💎", "🔮", "📜",
  "🗡️", "🏹", "🪓", "🔨", "⛏️", "🕯️", "🏮", "🎪", "🎭", "🎨", "🎵",
  "🍺", "🍷", "🍞", "🧀", "🪙", "💎", "👁️", "🧿", "🪬", "💠",
  "🚪", "🚶", "🏃", "🧭", "🗺️", "📿", "🔔", "📯", "🎺",
  "💒", "💍", "🤝", "✋", "🫶", "❤️", "💔", "🏁", "🚩", "🎌",
  "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟",
];

export default function MapaMundi() {
  const [isMestre, setIsMestre] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [svgContent, setSvgContent] = useState("");
  const [chaptersMap, setChaptersMap] = useState({});
  const [openDialog, setOpenDialog] = useState(false);
  const [editIndex, setEditIndex] = useState(null);
  const [chapterTitle, setChapterTitle] = useState("");
  const [chapterText, setChapterText] = useState("");
  const [currentMapEditing, setCurrentMapEditing] = useState(null);

  const [globalChapters, setGlobalChapters] = useState([]);
  const [openGlobalDialog, setOpenGlobalDialog] = useState(false);
  const [editGlobalIndex, setEditGlobalIndex] = useState(null);
  const [globalTitle, setGlobalTitle] = useState("");
  const [globalText, setGlobalText] = useState("");
// 🟢 ESTADOS PARA MARCADORES
const [marcadores, setMarcadores] = useState({}); // { mapId: [{ id, nome, descricao, x, y }] }
const [marcadorDialogOpen, setMarcadorDialogOpen] = useState(false);
const [marcadorEditando, setMarcadorEditando] = useState(null); // { mapId, marcadorId }
const [marcadorNome, setMarcadorNome] = useState("");
const [marcadorDescricao, setMarcadorDescricao] = useState("");
const [marcadorX, setMarcadorX] = useState(0);
const [marcadorY, setMarcadorY] = useState(0);
const [marcadorIcone, setMarcadorIcone] = useState("📍");
const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
// 🟢 ESTADOS PARA CAMINHOS/ROTAS
const [caminhos, setCaminhos] = useState({});
const [caminhoAtivo, setCaminhoAtivo] = useState(null);
const [modoCriarCaminho, setModoCriarCaminho] = useState(false);
const [caminhoDialogOpen, setCaminhoDialogOpen] = useState(false);
const [caminhoNome, setCaminhoNome] = useState("");
const [caminhoCor, setCaminhoCor] = useState("#00e0ff");
// 🟢 ESTADO DO BALÃO ABERTO
const [marcadorBalãoAberto, setMarcadorBalãoAberto] = useState(null); // { mapId, marcador, x, y }
// 🟢 ESTADOS PARA MARCADOR TIPO CIDADE
const [marcadorTipo, setMarcadorTipo] = useState("local");
const [marcadorCidadeSvg, setMarcadorCidadeSvg] = useState(null);

// 🟢 ESTADOS PARA MAPA DA CIDADE (DENTRO DO BALÃO)
const [cidadeMarcadores, setCidadeMarcadores] = useState({});
const [cidadeCaminhos, setCidadeCaminhos] = useState({});
const [cidadeModoCriarCaminho, setCidadeModoCriarCaminho] = useState(false);
const [cidadeCaminhoAtivo, setCidadeCaminhoAtivo] = useState(null);
const [cidadeCaminhoNome, setCidadeCaminhoNome] = useState("");
const [cidadeCaminhoCor, setCidadeCaminhoCor] = useState("#00e0ff");
const [cidadeCaminhoDialogOpen, setCidadeCaminhoDialogOpen] = useState(false);
const [cidadeMarcadorDialogOpen, setCidadeMarcadorDialogOpen] = useState(false);
const [cidadeMarcadorNome, setCidadeMarcadorNome] = useState("");
const [cidadeMarcadorDescricao, setCidadeMarcadorDescricao] = useState("");
const [cidadeMarcadorX, setCidadeMarcadorX] = useState(0);
const [cidadeMarcadorY, setCidadeMarcadorY] = useState(0);
const [cidadeMarcadorIcone, setCidadeMarcadorIcone] = useState("📍");
const [cidadeMarcadorEditando, setCidadeMarcadorEditando] = useState(null);
const [cidadeEmojiPickerOpen, setCidadeEmojiPickerOpen] = useState(false);
const [cidadeMarcadorBalãoAberto, setCidadeMarcadorBalãoAberto] = useState(null);
const cidadeSvgRef = useRef(null);
const cidadePanZoomRef = useRef(null);
  // 🖼️ Lightbox (igual ao Chat) — zoom with wheel, click outside to close, click on image stops propagation
  const [lightboxImage, setLightboxImage] = useState(null);
  const [zoom, setZoom] = useState(1);

  const mapSvgRefs = useRef({});
  const panZoomRef = useRef(null);
  const navigate = useNavigate();

  const markdownStyles = `
    .markdown-content img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      display: block;
      margin: 10px 0;
      cursor: pointer;
      transition: transform 0.2s ease;
    }
    .markdown-content img:hover {
      transform: scale(1.02);
    }
    .markdown-content video {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 10px 0;
      border-radius: 8px;
    }
    .markdown-content p,
    .markdown-content li,
    .markdown-content span,
    .markdown-content strong,
    .markdown-content em,
    .markdown-content a {
      color: #ffffff !important;
      word-break: break-word;
      white-space: pre-wrap;
      line-height: 1.5;
    }
    .markdown-content a { color: #66b3ff !important; text-decoration: underline; }

    /* Lightbox */
    .lightbox-overlay {
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.85);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 3000;
      cursor: zoom-in;
    }
    .lightbox-overlay img {
      transform-origin: center center;
      max-width: 90%;
      max-height: 90%;
      border-radius: 10px;
      transition: transform 0.1s ease;
      box-shadow: 0 0 15px rgba(0,0,0,0.6);
    }
  `;

  // 🔹 Verifica se é mestre
  useEffect(() => {
    const auth = getAuth();
    const unsub = auth.onAuthStateChanged((user) => {
      setIsMestre(user?.email === MESTRE_EMAIL);
    });
    return () => unsub();
  }, []);

  // 🟢 HANDLER GLOBAL PARA CLIQUES NOS MARCADORES
useEffect(() => {
  window.__clickMarcador = (mapId, id, nome, descricao, x, y, tipo) => {
    // Encontra o marcador completo nos estados
    const lista = marcadores[mapId] || [];
    const marcadorCompleto = lista.find(m => m.id === id);
    
    setMarcadorBalãoAberto({
      mapId,
      id,
      nome,
      descricao,
      x: parseInt(x),
      y: parseInt(y),
      marcador: marcadorCompleto || { id, nome, descricao, x: parseInt(x), y: parseInt(y), tipo: tipo || "local" }
    });
  };
  return () => { delete window.__clickMarcador; };
}, []);

// 🟢 CALCULAR DISTÂNCIA ENTRE DOIS PONTOS (em pixels SVG)
const calcularDistancia = (p1, p2) => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
};

// 🟢 CONVERTER PIXELS SVG PARA KM (ESCALA DO MAPA)
const pixelsParaKm = (pixels) => {
  const ESCALA_PX_POR_KM = 0.2336; // 10 pixels = 1 km (ajuste aqui!)
  return (pixels / ESCALA_PX_POR_KM).toFixed(1);
};

// 🟢 CALCULAR DISTÂNCIA TOTAL DE UM CAMINHO
const calcularDistanciaTotal = (pontos) => {
  if (!pontos || pontos.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < pontos.length; i++) {
    total += calcularDistancia(pontos[i-1], pontos[i]);
  }
  return total;
};

  // 🔹 Snapshot Firestore (mapas e crônica global)
  useEffect(() => {
    const unsubscribers = MAPS.map((m) => {
      const ref = doc(db, "world", `Chapters_${m.id}`);
      return onSnapshot(ref, (snap) => {
        if (!snap.exists()) {
          setChaptersMap((prev) => ({ ...prev, [m.id]: [] }));
          return;
        }
        const data = snap.data();
        setChaptersMap((prev) => ({ ...prev, [m.id]: data.list || [] }));
      });
    });

    const globalRef = doc(db, "world", "Chapters");
    const unsubGlobal = onSnapshot(globalRef, (snap) => {
      if (!snap.exists()) {
        setGlobalChapters([]);
        return;
      }
      setGlobalChapters(snap.data().list || []);
    });

    return () => {
      unsubscribers.forEach((u) => u && u());
      unsubGlobal();
    };
  }, []);

  const loadSvgForMap = useCallback(async (mapId) => {
  try {
    const dRef = doc(db, "world", `Map_${mapId}`);
    const snap = await getDoc(dRef);
    if (!snap.exists()) {
      setSvgContent("");
      return;
    }
    const data = snap.data();
    const parts = Object.keys(data)
      .filter((k) => k.startsWith("part_"))
      .sort((a, b) => parseInt(a.split("_")[1]) - parseInt(b.split("_")[1]))
      .map((k) => data[k]);
    const compressed = parts.join("");
    let decompressed = LZString.decompressFromUTF16(compressed) || "";
    
    // 🟢 INJETA MARCADORES
    const lista = marcadores[mapId] || [];
    if (lista.length > 0) {
            const mSvg = lista.map(m => {
  const nomeEscaped = m.nome.replace(/'/g, "\\'").replace(/"/g, '&quot;');
  const descEscaped = (m.descricao || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
  const icone = m.icone || "📍";
  const tipo = m.tipo || "local";
  return `<circle cx="${m.x}" cy="${m.y}" r="${tipo === 'cidade' ? 16 : 12}" fill="transparent" stroke="${tipo === 'cidade' ? '#ff9800' : '#00e0ff'}" stroke-width="2" style="cursor:pointer" onclick="window.__clickMarcador('${mapId}','${m.id}','${nomeEscaped}','${descEscaped}','${m.x}','${m.y}','${tipo}')"/>
  <text x="${m.x}" y="${m.y + 4}" fill="${tipo === 'cidade' ? '#ff9800' : '#fff'}" font-size="${tipo === 'cidade' ? 24 : 18}" text-anchor="middle" style="text-shadow:0 0 3px rgba(0,0,0,0.9);pointer-events:none">${icone}</text>
  <text x="${m.x + (tipo === 'cidade' ? 20 : 14)}" y="${m.y + 8}" fill="#fff" font-size="11" font-weight="bold" style="text-shadow:0 0 3px rgba(0,0,0,0.9);pointer-events:none">${m.nome}</text>`;
}).join('');
      decompressed = decompressed.replace('</svg>', `<g id="marcadores">${mSvg}</g></svg>`);
        // 🟢 INJETA CAMINHOS
  const listaCaminhos = caminhos[mapId] || [];
  if (listaCaminhos.length > 0) {
    const caminhosSvg = listaCaminhos.map(caminho => {
      if (caminho.pontos.length < 2) return '';
      
      const pathD = caminho.pontos.map((p, i) => 
        `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
      ).join(' ');
      
      const distanciaTotal = calcularDistanciaTotal(caminho.pontos);
      const kmTotal = pixelsParaKm(distanciaTotal);
      
      return `
        <path d="${pathD}" 
          fill="none" 
          stroke="${caminho.cor || '#00e0ff'}" 
          stroke-width="3" 
          stroke-dasharray="8,6" 
          stroke-linecap="round"
          opacity="0.8">
          <title>${caminho.nome} - ${kmTotal} km</title>
        </path>
        ${caminho.pontos.map((p, i) => `
          <circle cx="${p.x}" cy="${p.y}" r="${i === 0 ? 6 : 4}" 
            fill="${caminho.cor || '#00e0ff'}" 
            stroke="#fff" stroke-width="2" 
            opacity="0.9">
            <title>Ponto ${i + 1}: ${caminho.nome}</title>
          </circle>
        `).join('')}
        ${caminho.pontos.length >= 2 ? `
          <text x="${caminho.pontos[Math.floor(caminho.pontos.length/2)].x}" 
            y="${caminho.pontos[Math.floor(caminho.pontos.length/2)].y - 10}" 
            fill="${caminho.cor || '#00e0ff'}" 
            font-size="12" font-weight="bold" 
            text-anchor="middle"
            style="text-shadow:0 0 4px rgba(0,0,0,0.9)">
            ${kmTotal} km
          </text>
        ` : ''}
      `;
    }).join('');
    
    decompressed = decompressed.replace('</svg>', `<g id="caminhos">${caminhosSvg}</g></svg>`);
  }
    }
    
    setSvgContent(decompressed);
    
    // 🟢 Aplica SVG ao DOM
    const host = mapSvgRefs.current[mapId];
    if (host) {
      host.innerHTML = decompressed;
      const svgEl = host.querySelector("svg");
      if (svgEl) {
        if (panZoomRef.current?.destroy) panZoomRef.current.destroy();
        panZoomRef.current = svgPanZoom(svgEl, {
          zoomEnabled: true,
          controlIconsEnabled: true,
          fit: true,
          center: true,
          minZoom: 0.2,
          maxZoom: 40,
        });
      }
    }
  } catch (err) {
    console.error("Erro SVG:", err);
  }
}, [marcadores, isMestre]);

// 🟢 CARREGAR SVG DA CIDADE NO BALÃO
useEffect(() => {
  if (!marcadorBalãoAberto?.marcador?.cidadeSvg || !cidadeSvgRef.current) return;
  
  const svgContent = marcadorBalãoAberto.marcador.cidadeSvg;
  cidadeSvgRef.current.innerHTML = svgContent;
  
  const svgEl = cidadeSvgRef.current.querySelector("svg");
  if (svgEl) {
    svgEl.style.width = "100%";
    svgEl.style.height = "100%";
    if (cidadePanZoomRef.current?.destroy) cidadePanZoomRef.current.destroy();
    try {
      cidadePanZoomRef.current = svgPanZoom(svgEl, {
        zoomEnabled: true,
        controlIconsEnabled: true,
        fit: true,
        center: true,
        minZoom: 0.2,
        maxZoom: 40,
      });
    } catch (e) { console.warn("svg-pan-zoom na cidade:", e); }
  }
}, [marcadorBalãoAberto]);

  // 🟢 ADICIONAR MARCADOR COM BOTÃO DIREITO
const handleMapaContextMenu = (e, mapId) => {
  e.preventDefault();
  if (!isMestre) return;
  
  const host = mapSvgRefs.current[mapId];
  if (!host) return;
  
  const svgEl = host.querySelector("svg");
  if (!svgEl) return;
  
  // Pega a posição do SVG na tela
  const rect = svgEl.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  
  // Pega os dados de zoom/pan do svg-pan-zoom
  let svgX, svgY;
  
  if (panZoomRef.current && panZoomRef.current.getPan && panZoomRef.current.getZoom) {
    const pan = panZoomRef.current.getPan();
    const zoom = panZoomRef.current.getZoom();
    const sizes = panZoomRef.current.getSizes();
    
    // Calcula coordenadas SVG reais considerando zoom e pan
    svgX = Math.round((mouseX - pan.x) / zoom + sizes.viewBox.x);
    svgY = Math.round((mouseY - pan.y) / zoom + sizes.viewBox.y);
  } else {
    // Fallback se não conseguir do svg-pan-zoom
    try {
      const viewBox = svgEl.viewBox.baseVal;
      const scaleX = viewBox.width / rect.width;
      const scaleY = viewBox.height / rect.height;
      svgX = Math.round(viewBox.x + mouseX * scaleX);
      svgY = Math.round(viewBox.y + mouseY * scaleY);
    } catch {
      svgX = Math.round(mouseX);
      svgY = Math.round(mouseY);
    }
  }
  
  // 🟢 SE ESTIVER EM MODO CRIAR CAMINHO, ADICIONA PONTO
  if (modoCriarCaminho && caminhoAtivo?.id) {
    adicionarPontoAoCaminho(mapId, caminhoAtivo.id, svgX, svgY);
    return;
  }
  
  console.log("🎯 Marcador em:", svgX, svgY);
  
  setMarcadorX(svgX);
  setMarcadorY(svgY);
  setMarcadorNome("");
  setMarcadorDescricao("");
  setMarcadorIcone("📍");
  setMarcadorEditando({ mapId, marcadorId: null });
  setMarcadorDialogOpen(true);
};
// 🟢 RENDERIZAR MARCADORES NO SVG
const renderizarMarcadores = (mapId) => {
  const lista = marcadores[mapId] || [];
  
  return lista.map((m) => (
    <g key={m.id} style={{ cursor: 'pointer' }}>
      <circle
        cx={m.x}
        cy={m.y}
        r={8}
        fill={isMestre ? "#ff4444" : "#00e0ff"}
        stroke="#fff"
        strokeWidth={2}
        opacity={0.9}
        onClick={(e) => {
          e.stopPropagation();
          setMarcadorBalãoAberto({
            mapId,
            id: m.id,
            nome: m.nome,
            descricao: m.descricao,
            x: m.x,
            y: m.y
          });
        }}
      />
      <text
        x={m.x + 12}
        y={m.y + 4}
        fill="#fff"
        fontSize={11}
        fontWeight="bold"
        style={{ textShadow: '0 0 3px rgba(0,0,0,0.9)' }}
        pointerEvents="none"
      >
        {m.nome}
      </text>
    </g>
  ));
};

const salvarMarcador = async () => {
  const { mapId, marcadorId } = marcadorEditando || {};
  if (!mapId) return;
  
  const listaAtual = marcadores[mapId] ? [...marcadores[mapId]] : [];
  
  const marcadorData = {
    id: marcadorId || Date.now().toString(),
    nome: marcadorNome || "",
    descricao: marcadorDescricao || "",
    x: Number(marcadorX) || 0,
    y: Number(marcadorY) || 0,
    icone: marcadorIcone || "📍",
    tipo: marcadorTipo || "local",
    cidadeSvg: marcadorTipo === "cidade" ? (marcadorCidadeSvg || "") : "",
  };
  
  let novaLista;
  if (marcadorId) {
    novaLista = listaAtual.map(m => m.id === marcadorId ? marcadorData : m);
  } else {
    novaLista = [...listaAtual, marcadorData];
  }
  
  // Constrói objeto SIMPLES para Firestore
  const mapasParaSalvar = {};
  
  // Copia todos os mapas existentes
  Object.keys(marcadores).forEach(key => {
    if (key !== mapId) {
      // Outros mapas - mantém como estão
      mapasParaSalvar[key] = (marcadores[key] || []).map(m => ({
        id: String(m.id || ""),
        nome: String(m.nome || ""),
        descricao: String(m.descricao || ""),
        x: Number(m.x) || 0,
        y: Number(m.y) || 0,
        icone: String(m.icone || "📍"),
        tipo: String(m.tipo || "local"),
        cidadeSvg: String(m.cidadeSvg || ""),
      }));
    }
  });
  
  // Adiciona o mapa atual com a nova lista
  mapasParaSalvar[mapId] = novaLista.map(m => ({
    id: String(m.id || ""),
    nome: String(m.nome || ""),
    descricao: String(m.descricao || ""),
    x: Number(m.x) || 0,
    y: Number(m.y) || 0,
    icone: String(m.icone || "📍"),
    tipo: String(m.tipo || "local"),
    cidadeSvg: String(m.cidadeSvg || ""),
  }));
  
  // Atualiza estado local com dados limpos
  const estadoLimpo = {};
  Object.keys(mapasParaSalvar).forEach(key => {
    estadoLimpo[key] = mapasParaSalvar[key];
  });
  setMarcadores(estadoLimpo);
  
  // Salva no Firestore
  try {
    const ref = doc(db, "world", "Marcadores");
    // Usa set() em vez de setDoc com merge para SOBRESCREVER completamente
    await setDoc(ref, { mapas: mapasParaSalvar }, { merge: false });
    console.log("✅ Marcador salvo com sucesso!");
  } catch (err) {
    console.error("Erro ao salvar:", err);
    // Tenta com merge: true como fallback
    try {
      await setDoc(ref, { mapas: mapasParaSalvar }, { merge: true });
      console.log("✅ Marcador salvo (fallback merge)");
    } catch (err2) {
      console.error("Erro fatal:", err2);
      alert("Erro ao salvar. Tente recarregar a página.");
      return;
    }
  }
  
  setMarcadorDialogOpen(false);
  setMarcadorTipo("local");
  setMarcadorCidadeSvg(null);
  
  if (expanded) {
    setTimeout(() => loadSvgForMap(expanded), 500);
  }
};

// 🟢 DELETAR MARCADOR
const deletarMarcador = async () => {
  const { mapId, marcadorId } = marcadorEditando || {};
  if (!mapId || !marcadorId) return;
  
  const novosMarcadores = { ...marcadores };
  novosMarcadores[mapId] = novosMarcadores[mapId].filter(m => m.id !== marcadorId);
  
  setMarcadores(novosMarcadores);
  await setDoc(doc(db, "world", "Marcadores"), { mapas: novosMarcadores }, { merge: true });
  setMarcadorDialogOpen(false);
  
  if (expanded) loadSvgForMap(expanded);
};

// 🟢 INICIAR NOVO CAMINHO
const iniciarNovoCaminho = (mapId) => {
  setModoCriarCaminho(true);
  setCaminhoAtivo({ mapId, id: null });
  setCaminhoDialogOpen(true);
  setCaminhoNome("");
  setCaminhoCor("#00e0ff");
};

// 🟢 CRIAR CAMINHO
const criarCaminho = async () => {
  if (!caminhoNome.trim()) return;
  
  const mapId = expanded;
  if (!mapId) return;
  
  const novoCaminho = {
    id: Date.now().toString(),
    nome: caminhoNome,
    cor: caminhoCor,
    pontos: []
  };
  
  const novosCaminhos = { ...caminhos };
  if (!novosCaminhos[mapId]) novosCaminhos[mapId] = [];
  novosCaminhos[mapId].push(novoCaminho);
  
  setCaminhos(novosCaminhos);
  setCaminhoAtivo({ mapId, id: novoCaminho.id });
  setModoCriarCaminho(true);
  setCaminhoDialogOpen(false);
  
  await setDoc(doc(db, "world", "Caminhos"), { mapas: novosCaminhos }, { merge: true });
};

// 🟢 ADICIONAR PONTO AO CAMINHO ATIVO
const adicionarPontoAoCaminho = async (mapId, caminhoId, x, y) => {
  const novosCaminhos = { ...caminhos };
  const caminho = novosCaminhos[mapId]?.find(c => c.id === caminhoId);
  if (!caminho) return;
  
  caminho.pontos.push({ x, y });
  setCaminhos(novosCaminhos);
  
  await setDoc(doc(db, "world", "Caminhos"), { mapas: novosCaminhos }, { merge: true });
  
  // 🟢 CORRIGIDO: Recarrega SVG se o mapa estiver expandido
  if (expanded === mapId) {
    loadSvgForMap(mapId);
  }
};

// 🟢 FINALIZAR CAMINHO
const finalizarCaminho = async () => {
  setModoCriarCaminho(false);
  setCaminhoAtivo(null);
};

// 🟢 DELETAR CAMINHO
const deletarCaminho = async (mapId, caminhoId) => {
  if (!window.confirm('Deletar este caminho?')) return;
  
  const novosCaminhos = { ...caminhos };
  if (novosCaminhos[mapId]) {
    novosCaminhos[mapId] = novosCaminhos[mapId].filter(c => c.id !== caminhoId);
  }
  
  // Atualiza estado local
  setCaminhos(novosCaminhos);
  
  // Salva no Firestore
  await setDoc(doc(db, "world", "Caminhos"), { mapas: novosCaminhos }, { merge: true });
  
  // Reseta modo de criação se for o caminho ativo
  if (caminhoAtivo?.id === caminhoId) {
    setCaminhoAtivo(null);
    setModoCriarCaminho(false);
  }
  
  // 🟢 CORRIGIDO: Recarrega SVG se o mapa estiver expandido
  if (expanded === mapId) {
    loadSvgForMap(mapId);
  }
};

  useEffect(() => {
    if (expanded) loadSvgForMap(expanded);
    else {
      setSvgContent("");
      if (panZoomRef.current?.destroy) {
        try {
          panZoomRef.current.destroy();
        } catch {}
        panZoomRef.current = null;
      }
    }
  }, [expanded, loadSvgForMap]);

  // 🟢 CARREGAR MARCADORES
useEffect(() => {
  const unsub = onSnapshot(doc(db, "world", "Marcadores"), (snap) => {
    if (snap.exists()) {
      setMarcadores(snap.data().mapas || {});
    } else {
      setMarcadores({});
    }
  });
  return () => unsub();
}, []);

// 🟢 CARREGAR CAMINHOS
useEffect(() => {
  const unsub = onSnapshot(doc(db, "world", "Caminhos"), (snap) => {
    if (snap.exists()) {
      setCaminhos(snap.data().mapas || {});
    } else {
      setCaminhos({});
    }
  });
  return () => unsub();
}, []);

  // --- Upload de imagem (Cloudinary)
  const handleImageUpload = async (e, targetSetter) => {
    if (!isMestre) return;
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "reqviem_upload");
      const res = await fetch("https://api.cloudinary.com/v1_1/dwaxw0l83/image/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.secure_url) {
        targetSetter((prev) => (prev ? prev + `\n\n![](${data.secure_url})\n` : `![](${data.secure_url})\n`));
      } else alert("Erro ao enviar imagem.");
    } catch {
      alert("Erro ao enviar imagem. Verifique a conexão.");
    }
  };

  // 🔹 Upload de SVG
  const handleFileUpload = async (e, mapId) => {
    if (!isMestre) return;
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const svgData = evt.target.result.trim();
        const compressed = LZString.compressToUTF16(svgData);
        const chunks = [];
        for (let i = 0; i < compressed.length; i += CHUNK_SIZE) {
          chunks.push(compressed.substring(i, i + CHUNK_SIZE));
        }
        const docData = {};
        chunks.forEach((c, idx) => (docData[`part_${idx + 1}`] = c));
        await setDoc(doc(db, "world", `Map_${mapId}`), docData);
        await loadSvgForMap(mapId);
      } catch (err) {
        console.error("Erro upload SVG:", err);
      }
    };
    reader.readAsText(file);
  };

  // 🔹 Funções para capítulos dos mapas
  const openChapterDialog = (mapId, index = null, e) => {
    if (e?.stopPropagation) e.stopPropagation();
    setCurrentMapEditing(mapId);
    setEditIndex(index);
    const list = chaptersMap[mapId] || [];
    setChapterTitle(index !== null ? list[index].title : "");
    setChapterText(index !== null ? list[index].text : "");
    setOpenDialog(true);
  };

  const saveChapterForMap = async () => {
    if (!currentMapEditing) return;
    const mapId = currentMapEditing;
    const existing = Array.isArray(chaptersMap[mapId]) ? [...chaptersMap[mapId]] : [];
    if (editIndex !== null) existing[editIndex] = { title: chapterTitle, text: chapterText };
    else existing.push({ title: chapterTitle, text: chapterText });
    await setDoc(doc(db, "world", `Chapters_${mapId}`), { list: existing });
    setOpenDialog(false);
  };

  const deleteChapterForMap = async (mapId, idx, e) => {
    if (e?.stopPropagation) e.stopPropagation();
    const existing = [...(chaptersMap[mapId] || [])];
    existing.splice(idx, 1);
    await setDoc(doc(db, "world", `Chapters_${mapId}`), { list: existing });
  };

  // 🔹 Crônica Global
  const openGlobalChapterDialog = (index = null, e) => {
    if (e?.stopPropagation) e.stopPropagation();
    setEditGlobalIndex(index);
    setGlobalTitle(index !== null ? globalChapters[index].title : "");
    setGlobalText(index !== null ? globalChapters[index].text : "");
    setOpenGlobalDialog(true);
  };

  const saveGlobalChapter = async () => {
    const existing = [...(globalChapters || [])];
    if (editGlobalIndex !== null) existing[editGlobalIndex] = { title: globalTitle, text: globalText };
    else existing.push({ title: globalTitle, text: globalText });
    await setDoc(doc(db, "world", "Chapters"), { list: existing });
    setOpenGlobalDialog(false);
  };

  const deleteGlobalChapter = async (idx, e) => {
    if (e?.stopPropagation) e.stopPropagation();
    const existing = [...(globalChapters || [])];
    existing.splice(idx, 1);
    await setDoc(doc(db, "world", "Chapters"), { list: existing });
  };

  const handleExpand = (mapId) => setExpanded((prev) => (prev === mapId ? null : mapId));

  // 🔹 Markdown com suporte ao lightbox (click on image opens lightbox)
  const renderMarkdown = (text) => (
    <div
      className="markdown-content"
      onClick={(e) => {
        if (e.target.tagName === "IMG") {
          setLightboxImage(e.target.src);
          setZoom(1);
        }
      }}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );

  // === Lightbox handlers (igual ao chat) ===
  const handleLightboxWheel = (e) => {
    e.preventDefault();
    setZoom((z) => Math.min(Math.max(z + e.deltaY * -0.001, 0.5), 5));
  };

  // --- RENDERIZAÇÃO PRINCIPAL ---
  return (
    <Box sx={{ bgcolor: "#1e1e1e", minHeight: "100vh", color: "#fff", p: 2 }}>
      <style>{markdownStyles}</style>

      <Box sx={{ display: "flex", gap: 2, alignItems: "center", mb: 2 }}>
        <Button variant="contained" color="secondary" onClick={() => navigate("/")}>
          Voltar para Início
        </Button>
        <Typography variant="subtitle1" sx={{ color: "#fff" }}>
          Mapas recolhíveis — Clique para expandir!
        </Typography>
      </Box>

      {/* === MAPAS === */}
      {MAPS.map((m) => (
        <Accordion
          key={m.id}
          expanded={expanded === m.id}
          onChange={() => handleExpand(m.id)}
          sx={{ bgcolor: "#252525", mb: 1 }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: "#fff" }} />}>
            <Typography sx={{ flex: 1, color: "#fff" }}>{m.title}</Typography>
            {isMestre && (
  <>
    <Button
      variant="outlined"
      size="small"
      component="label"
      sx={{ ml: 1 }}
      onClick={(e) => e.stopPropagation()}
    >
      Upload SVG
      <input
        hidden
        accept=".svg"
        type="file"
        onChange={(e) => {
          e.stopPropagation();
          handleFileUpload(e, m.id);
        }}
      />
    </Button>
    
    {/* 🟢 BOTÃO CRIAR CAMINHO */}
    <Button
      variant="outlined"
      size="small"
      color={modoCriarCaminho && caminhoAtivo?.mapId === m.id ? "error" : "info"}
      sx={{ ml: 1 }}
      onClick={(e) => {
        e.stopPropagation();
        if (modoCriarCaminho && caminhoAtivo?.mapId === m.id) {
          finalizarCaminho();
        } else {
          iniciarNovoCaminho(m.id);
        }
      }}
    >
      {modoCriarCaminho && caminhoAtivo?.mapId === m.id ? "🛑 Finalizar Rota" : "📏 Criar Rota"}
    </Button>
  </>
)}
          </AccordionSummary>

          <AccordionDetails
            sx={{
              bgcolor: "#1e1e1e",
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              gap: 2,
              height: { xs: "auto", md: "75vh" },
            }}
          >
            {/* Mapa */}
<Box sx={{ flexBasis: { md: "70%" }, bgcolor: "#222", borderRadius: 1, overflow: "hidden", p: 1 }}>
  {expanded === m.id && (
    <div 
      ref={(el) => { mapSvgRefs.current[m.id] = el; }}
      style={{ width: "100%", height: "100%" }}
      onContextMenu={(e) => handleMapaContextMenu(e, m.id)}
    />
  )}
</Box>

            {/* Anotações */}
            <Box
              sx={{
                flexBasis: { md: "30%" },
                bgcolor: "#232323",
                p: 2,
                borderRadius: 1,
                overflow: "hidden",
                height: { md: "100%" },
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1, alignItems: "center" }}>
                <Typography variant="h6" sx={{ color: "#fff" }}>
                  Anotações — {m.title}
                </Typography>
                {isMestre && (
                  <Button
                    startIcon={<AddIcon />}
                    size="small"
                    variant="contained"
                    onClick={(e) => openChapterDialog(m.id, null, e)}
                  >
                    Novo
                  </Button>
                )}
              </Box>
              <Divider sx={{ mb: 1 }} />

              <Box sx={{ overflowY: "auto", flex: 1 }}>
                {(chaptersMap[m.id] || []).length === 0 ? (
                  <Typography sx={{ color: "#999" }}>Nenhuma anotação.</Typography>
                ) : (
                  (chaptersMap[m.id] || []).map((ch, idx) => (
                    <Box key={idx} sx={{ mb: 1, p: 1, bgcolor: "#1a1a1a", borderRadius: 1 }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Typography sx={{ fontWeight: "bold", color: "#fff" }}>{ch.title}</Typography>
                        {isMestre && (
                          <Box>
                            <IconButton size="small" color="info" onClick={(e) => openChapterDialog(m.id, idx, e)}>
                              <EditIcon />
                            </IconButton>
                            <IconButton size="small" color="error" onClick={(e) => deleteChapterForMap(m.id, idx, e)}>
                              <DeleteIcon />
                            </IconButton>
                                      
                          </Box>
                        )}
                      </Box>
                      <Box sx={{ mt: 1, maxHeight: "calc(100vh - 350px)", overflowY: "auto" }}>
                        {renderMarkdown(ch.text)}
                      </Box>
                    </Box>
                  ))
                )}
              </Box>
                  {/* 🟢 CAMINHOS/ROTAS */}
              <Box sx={{ mt: 2, borderTop: '1px solid #333', pt: 2 }}>
                <Typography variant="subtitle2" sx={{ color: '#00e0ff', mb: 1 }}>
                  📏 Rotas e Caminhos
                </Typography>
                {(caminhos[m.id] || []).map(caminho => (
                  <Box key={caminho.id} sx={{ mb: 1, p: 1, bgcolor: '#1a1a1a', borderRadius: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 12, height: 12, bgcolor: caminho.cor, borderRadius: '50%' }} />
                        <Typography variant="caption" sx={{ color: '#fff' }}>
                          {caminho.nome}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: '#94a3b8', mr: 1 }}>
                          {pixelsParaKm(calcularDistanciaTotal(caminho.pontos))} km
                        </Typography>
                        {isMestre && (
                          <IconButton size="small" onClick={() => deletarCaminho(m.id, caminho.id)} sx={{ color: '#ef4444' }}>
                            <DeleteIcon fontSize="inherit" />
                          </IconButton>
                        )}
                      </Box>
                    </Box>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                      {caminho.pontos.length} pontos
                    </Typography>
                  </Box>
                ))}
                {(caminhos[m.id] || []).length === 0 && (
                  <Typography variant="caption" sx={{ color: '#64748b' }}>
                    Nenhum caminho criado ainda
                  </Typography>
                )}
              </Box>
            </Box>
          </AccordionDetails>
        </Accordion>
      ))}

      {/* === CRÔNICA GLOBAL === */}
      <Box sx={{ bgcolor: "#2a2a2a", p: 2, mt: 3, borderRadius: 1, mb: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
          <Typography variant="h6" sx={{ color: "#fff" }}>
            Crônica Geral
          </Typography>
          {isMestre && (
            <Button startIcon={<AddIcon />} variant="contained" size="small" onClick={(e) => openGlobalChapterDialog(null, e)}>
              Novo
            </Button>
          )}
        </Box>

        {globalChapters.length === 0 ? (
          <Typography sx={{ color: "#aaa" }}>Nenhuma crônica global cadastrada.</Typography>
        ) : (
          globalChapters.map((ch, i) => (
            <Accordion key={i} sx={{ bgcolor: "#333", color: "#fff", mb: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: "#fff" }} />}>
                <Typography sx={{ flex: 1, color: "#fff" }}>{ch.title}</Typography>
                {isMestre && (
                  <>
                    <IconButton size="small" color="info" onClick={(e) => openGlobalChapterDialog(i, e)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={(e) => deleteGlobalChapter(i, e)}>
                      <DeleteIcon />
                    </IconButton>
                  </>
                )}
              </AccordionSummary>
              <AccordionDetails>{renderMarkdown(ch.text)}</AccordionDetails>
            </Accordion>
          ))
        )}
      </Box>

      {/* === DIALOGOS === */}
      {/* Capítulos do Mapa */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} fullWidth maxWidth="md">
        <DialogTitle sx={{ bgcolor: "#1e1e1e", color: "#fff" }}>
          {editIndex !== null ? "Editar Capítulo" : "Novo Capítulo"}
        </DialogTitle>
        <DialogContent sx={{ bgcolor: "#1e1e1e" }}>
          <TextField
            label="Título"
            fullWidth
            value={chapterTitle}
            onChange={(e) => setChapterTitle(e.target.value)}
            sx={{ mb: 2 }}
            InputProps={{ style: { color: "#fff" } }}
            InputLabelProps={{ style: { color: "#ccc" } }}
          />
          <TextField
            label="Texto (Markdown, imagens)"
            fullWidth
            multiline
            minRows={8}
            value={chapterText}
            onChange={(e) => setChapterText(e.target.value)}
            InputProps={{ style: { color: "#fff" } }}
            InputLabelProps={{ style: { color: "#ccc" } }}
          />
          {isMestre && (
            <Box sx={{ mt: 2 }}>
              <Button variant="contained" component="label" startIcon={<UploadIcon />}>
                Upload Imagem
                <input hidden type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setChapterText)} />
              </Button>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ bgcolor: "#1e1e1e" }}>
          <Button onClick={() => setOpenDialog(false)} sx={{ color: "#ccc" }}>
            Cancelar
          </Button>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={saveChapterForMap}>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Crônica Global */}
      <Dialog open={openGlobalDialog} onClose={() => setOpenGlobalDialog(false)} fullWidth maxWidth="md">
        <DialogTitle sx={{ bgcolor: "#1e1e1e", color: "#fff" }}>
          {editGlobalIndex !== null ? "Editar Crônica Global" : "Nova Crônica Global"}
        </DialogTitle>
        <DialogContent sx={{ bgcolor: "#1e1e1e" }}>
          <TextField
            label="Título"
            fullWidth
            value={globalTitle}
            onChange={(e) => setGlobalTitle(e.target.value)}
            sx={{ mb: 2 }}
            InputProps={{ style: { color: "#fff" } }}
            InputLabelProps={{ style: { color: "#ccc" } }}
          />
          <TextField
            label="Texto (Markdown, imagens)"
            fullWidth
            multiline
            minRows={8}
            value={globalText}
            onChange={(e) => setGlobalText(e.target.value)}
            InputProps={{ style: { color: "#fff" } }}
            InputLabelProps={{ style: { color: "#ccc" } }}
          />
          {isMestre && (
            <Box sx={{ mt: 2 }}>
              <Button variant="contained" component="label" startIcon={<UploadIcon />}>
                Upload Imagem
                <input hidden type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setGlobalText)} />
              </Button>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ bgcolor: "#1e1e1e" }}>
          <Button onClick={() => setOpenGlobalDialog(false)} sx={{ color: "#ccc" }}>
            Cancelar
          </Button>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={saveGlobalChapter}>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      {/* === LIGHTBOX (igual ao Chat) === */}
{/* === LIGHTBOX (igual ao Chat, com arrastar) === */}
{lightboxImage && (
  <div
    onClick={() => setLightboxImage(null)}
    onWheel={handleLightboxWheel}
    className="lightbox-overlay"
    onMouseDown={(e) => {
      e.preventDefault();
      e.stopPropagation();
      const img = e.currentTarget.querySelector("img");
      const startX = e.clientX - (parseFloat(img.dataset.x || "0"));
      const startY = e.clientY - (parseFloat(img.dataset.y || "0"));

      const handleMouseMove = (ev) => {
        ev.preventDefault();
        const x = ev.clientX - startX;
        const y = ev.clientY - startY;
        img.style.transform = `translate(${x}px, ${y}px) scale(${zoom})`;
        img.dataset.x = x;
        img.dataset.y = y;
      };

      const handleMouseUp = () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }}
  >
    <img
      src={lightboxImage}
      alt="ampliada"
      style={{
        transform: `scale(${zoom})`,
        transition: "transform 0.1s ease",
        maxWidth: "90%",
        maxHeight: "90%",
        borderRadius: 10,
        cursor: "grab",
        userSelect: "none",
      }}
      onClick={(e) => e.stopPropagation()}
      draggable={false}
      data-x="0"
      data-y="0"
    />
    <IconButton
      onClick={() => setLightboxImage(null)}
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
)}
{/* 🟢 MODAL EDITAR MARCADOR */}
<Dialog 
  open={marcadorDialogOpen} 
  onClose={() => setMarcadorDialogOpen(false)} 
  maxWidth="sm" 
  fullWidth
  PaperProps={{ sx: { bgcolor: '#1e1e1e', color: '#fff' } }}
>
  <DialogTitle>
    {marcadorEditando?.marcadorId ? 'Editar Marcador' : 'Novo Marcador'}
  </DialogTitle>
  <DialogContent>
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
      <TextField
        label="Nome do local"
        fullWidth
        value={marcadorNome}
        onChange={(e) => setMarcadorNome(e.target.value)}
        InputProps={{ style: { color: '#fff' } }}
        InputLabelProps={{ style: { color: '#ccc' } }}
        sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#555' } } }}
      />
      
      <Typography variant="caption" sx={{ color: '#94a3b8' }}>
        Descrição (Markdown - use ![](url) para imagens)
      </Typography>
      <TextField
        label="Descrição"
        fullWidth
        multiline
        minRows={4}
        maxRows={8}
        value={marcadorDescricao}
        onChange={(e) => setMarcadorDescricao(e.target.value)}
        InputProps={{ style: { color: '#fff' } }}
        InputLabelProps={{ style: { color: '#ccc' } }}
        sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#555' } } }}
      />
      {/* ÍCONE */}
<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
  <Typography variant="caption" sx={{ color: '#94a3b8' }}>Ícone:</Typography>
  <Button size="small" variant="outlined" onClick={() => setEmojiPickerOpen(true)}
    sx={{ color: '#fff', borderColor: '#555', fontSize: '1.2rem', minWidth: 50, height: 36 }}>
    {marcadorIcone || "📍"}
  </Button>
  <Typography variant="caption" sx={{ color: '#64748b' }}>Clique para trocar</Typography>
</Box>

      {isMestre && (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button
            variant="outlined"
            component="label"
            size="small"
            startIcon={<UploadIcon />}
            sx={{ color: '#94a3b8', borderColor: '#555' }}
          >
            Upload Imagem
            <input
              hidden
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const apiBase = window.location.hostname === "localhost"
                    ? "http://localhost:5000"
                    : "https://app-rpg.onrender.com";
                  const fd = new FormData();
                  fd.append("file", file);
                  const res = await fetch(`${apiBase}/upload`, { method: "POST", body: fd });
                  const data = await res.json();
                  if (data.url) {
                    setMarcadorDescricao(prev => prev + `\n\n![](${data.url})`);
                  }
                } catch (err) {
                  alert("Erro ao enviar imagem");
                }
              }}
            />
          </Button>
        </Box>
      )}
      
            {/* 🟢 TIPO DE MARCADOR */}
      <FormControl fullWidth>
        <InputLabel sx={{ color: '#94a3b8' }}>Tipo de Marcador</InputLabel>
        <Select
          value={marcadorTipo}
          label="Tipo de Marcador"
          onChange={(e) => setMarcadorTipo(e.target.value)}
          sx={{ color: '#fff', '.MuiOutlinedInput-notchedOutline': { borderColor: '#555' } }}
        >
          <MenuItem value="local">📍 Local Comum</MenuItem>
          <MenuItem value="cidade">🏙️ Cidade (com mapa interno)</MenuItem>
        </Select>
      </FormControl>

      {/* 🟢 SE FOR CIDADE, MOSTRA UPLOAD DE SVG */}
      {marcadorTipo === "cidade" && (
        <Box sx={{ mt: 2, p: 2, bgcolor: '#1a1a2e', borderRadius: 1, border: '1px solid #334155' }}>
          <Typography variant="caption" sx={{ color: '#ff9800', display: 'block', mb: 1 }}>
            🏙️ Mapa da Cidade (SVG)
          </Typography>
          <Button variant="outlined" component="label" size="small" startIcon={<UploadIcon />} fullWidth
            sx={{ color: '#94a3b8', borderColor: '#555' }}>
            {marcadorCidadeSvg ? "Trocar SVG da Cidade" : "Enviar SVG da Cidade"}
            <input hidden type="file" accept=".svg" onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = (evt) => setMarcadorCidadeSvg(evt.target.result);
              reader.readAsText(file);
            }} />
          </Button>
          {marcadorCidadeSvg && (
            <Typography variant="caption" sx={{ color: '#4caf50', display: 'block', mt: 0.5 }}>
              ✅ SVG carregado!
            </Typography>
          )}
        </Box>
      )}

      <Typography variant="caption" sx={{ color: '#64748b' }}>
        Posição SVG: X={marcadorX}, Y={marcadorY}
      </Typography>
    </Box>
  </DialogContent>
  <DialogActions sx={{ borderTop: '1px solid #333' }}>
    {marcadorEditando?.marcadorId && (
      <Button onClick={deletarMarcador} sx={{ color: '#ef4444', mr: 'auto' }}>
        🗑️ Deletar
      </Button>
    )}
    <Button onClick={() => setMarcadorDialogOpen(false)} sx={{ color: '#ccc' }}>
      Cancelar
    </Button>
    <Button variant="contained" onClick={salvarMarcador} disabled={!marcadorNome.trim()}>
      Salvar
    </Button>
  </DialogActions>
</Dialog>
{/* MODAL EMOJI */}
<Dialog open={emojiPickerOpen} onClose={() => setEmojiPickerOpen(false)} maxWidth="sm" fullWidth
  PaperProps={{ sx: { bgcolor: '#1e1e1e', color: '#fff' } }}>
  <DialogTitle>Escolha um ícone</DialogTitle>
  <DialogContent>
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center', maxHeight: 300, overflowY: 'auto' }}>
      {EMOJIS_MARCADORES.map((emoji, idx) => (
        <Button key={idx} onClick={() => { setMarcadorIcone(emoji); setEmojiPickerOpen(false); }}
          sx={{ fontSize: '1.5rem', minWidth: 40, height: 40, bgcolor: marcadorIcone === emoji ? '#333' : 'transparent',
            border: marcadorIcone === emoji ? '1px solid #ff9800' : '1px solid transparent', '&:hover': { bgcolor: '#333' } }}>
          {emoji}
        </Button>
      ))}
    </Box>
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setEmojiPickerOpen(false)} sx={{ color: '#ccc' }}>Fechar</Button>
  </DialogActions>
      </Dialog>
      
      {/* 🟢 MODAL CRIAR CAMINHO */}
      <Dialog 
        open={caminhoDialogOpen} 
        onClose={() => setCaminhoDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { bgcolor: '#1e1e1e', color: '#fff' } }}
      >
        <DialogTitle>📏 Nova Rota/Caminho</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Nome da rota (ex: Estrada Real)"
              fullWidth
              value={caminhoNome}
              onChange={(e) => setCaminhoNome(e.target.value)}
              InputProps={{ style: { color: '#fff' } }}
              InputLabelProps={{ style: { color: '#ccc' } }}
              sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#555' } } }}
            />
            <Box>
              <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mb: 0.5 }}>
                Cor do caminho
              </Typography>
              <input
                type="color"
                value={caminhoCor}
                onChange={(e) => setCaminhoCor(e.target.value)}
                style={{ width: '100%', height: 40, cursor: 'pointer', border: '1px solid #555', borderRadius: 4 }}
              />
            </Box>
            <Typography variant="caption" sx={{ color: '#ff9800' }}>
              Após criar, clique com botão direito no mapa para adicionar pontos à rota.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCaminhoDialogOpen(false)} sx={{ color: '#ccc' }}>Cancelar</Button>
          <Button variant="contained" onClick={criarCaminho} disabled={!caminhoNome.trim()}>
            Criar Rota
          </Button>
        </DialogActions>
      </Dialog>
      {/* 🟢 BALÃO DO MARCADOR (COM MAPA DA CIDADE) */}
{marcadorBalãoAberto && (
  <Box
    sx={{
      position: 'fixed',
      top: 80,
      right: 20,
      width: marcadorBalãoAberto.marcador?.tipo === "cidade" ? 500 : 320,
      maxHeight: '80vh',
      bgcolor: 'rgba(15, 23, 42, 0.97)',
      border: '1px solid #334155',
      borderRadius: 2,
      p: 2,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      overflow: 'hidden',
    }}
  >
    {/* CABEÇALHO */}
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexShrink: 0 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#fff' }}>
        {marcadorBalãoAberto.marcador?.icone || "📍"} {marcadorBalãoAberto.nome}
      </Typography>
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        {isMestre && (
          <>
            <IconButton size="small" onClick={() => {
              const m = marcadorBalãoAberto.marcador;
              setMarcadorX(m.x); setMarcadorY(m.y);
              setMarcadorNome(m.nome); setMarcadorDescricao(m.descricao || '');
              setMarcadorIcone(m.icone || "📍");
              setMarcadorTipo(m.tipo || "local");
              setMarcadorCidadeSvg(m.cidadeSvg || null);
              setMarcadorEditando({ mapId: marcadorBalãoAberto.mapId, marcadorId: m.id });
              setMarcadorDialogOpen(true);
              setMarcadorBalãoAberto(null);
            }} sx={{ color: '#94a3b8' }}><EditIcon fontSize="small" /></IconButton>
            <IconButton size="small" onClick={() => {
              if (window.confirm('Deletar marcador?')) {
                const mapId = marcadorBalãoAberto.mapId;
                const mId = marcadorBalãoAberto.marcador?.id;
                const novos = { ...marcadores };
                if (novos[mapId]) novos[mapId] = novos[mapId].filter(mr => mr.id !== mId);
                setMarcadores(novos);
                setDoc(doc(db, "world", "Marcadores"), { mapas: novos }, { merge: true });
                setMarcadorBalãoAberto(null);
                if (expanded) loadSvgForMap(expanded);
              }
            }} sx={{ color: '#ef4444' }}><DeleteIcon fontSize="small" /></IconButton>
          </>
        )}
        <IconButton size="small" onClick={() => setMarcadorBalãoAberto(null)} sx={{ color: '#94a3b8' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>

    {/* DESCRIÇÃO */}
    <Box sx={{ flexShrink: 0, mb: 1, maxHeight: 120, overflowY: 'auto' }}>
      {marcadorBalãoAberto.descricao ? (
        <Box className="markdown-content" onClick={(e) => { if (e.target.tagName === "IMG") { setLightboxImage(e.target.src); setZoom(1); } }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{marcadorBalãoAberto.descricao}</ReactMarkdown>
        </Box>
      ) : (
        <Typography variant="body2" sx={{ color: '#64748b', fontStyle: 'italic' }}>Sem descrição</Typography>
      )}
    </Box>

    {/* 🟢 MAPA DA CIDADE */}
    {marcadorBalãoAberto.marcador?.tipo === "cidade" && marcadorBalãoAberto.marcador?.cidadeSvg && (
      <Box sx={{ flex: 1, minHeight: 250, border: '1px solid #334155', borderRadius: 1, overflow: 'hidden', position: 'relative' }}>
        {isMestre && (
          <Box sx={{ position: 'absolute', top: 4, left: 4, zIndex: 10, display: 'flex', gap: 0.5 }}>
            <Button size="small" variant="contained" sx={{ fontSize: '0.6rem', bgcolor: '#1976d2' }}
              onClick={(e) => {
                e.stopPropagation();
                setCidadeMarcadorX(100); setCidadeMarcadorY(100);
                setCidadeMarcadorNome(""); setCidadeMarcadorDescricao("");
                setCidadeMarcadorIcone("📍");
                setCidadeMarcadorEditando({ cidadeId: marcadorBalãoAberto.marcador.id, marcadorId: null });
                setCidadeMarcadorDialogOpen(true);
              }}>+ Marcador</Button>
            <Button size="small" variant="contained" sx={{ fontSize: '0.6rem', bgcolor: cidadeModoCriarCaminho ? '#ef4444' : '#ff9800' }}
              onClick={(e) => {
                e.stopPropagation();
                if (cidadeModoCriarCaminho) {
                  setCidadeModoCriarCaminho(false);
                  setCidadeCaminhoAtivo(null);
                } else {
                  setCidadeCaminhoDialogOpen(true);
                }
              }}>{cidadeModoCriarCaminho ? "🛑 Finalizar" : "📏 Rota"}</Button>
          </Box>
        )}
        <div ref={cidadeSvgRef} style={{ width: '100%', height: '100%' }}
          onClick={(e) => {
            if (!isMestre || !cidadeModoCriarCaminho) return;
            const rect = cidadeSvgRef.current?.getBoundingClientRect();
            if (!rect) return;
            const x = Math.round(e.clientX - rect.left);
            const y = Math.round(e.clientY - rect.top);
            if (cidadeCaminhoAtivo) {
              const cidadeId = marcadorBalãoAberto.marcador.id;
              const novos = { ...cidadeCaminhos };
              const caminho = novos[cidadeId]?.find(c => c.id === cidadeCaminhoAtivo);
              if (caminho) {
                caminho.pontos.push({ x, y });
                setCidadeCaminhos(novos);
                setDoc(doc(db, "world", `Cidade_${cidadeId}`), { 
                  marcadores: cidadeMarcadores[cidadeId] || [],
                  caminhos: novos[cidadeId],
                  svg: marcadorBalãoAberto.marcador.cidadeSvg
                }, { merge: true });
              }
            }
          }} />
      </Box>
    )}
  </Box>
)}
    </Box>
  );
}