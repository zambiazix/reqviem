// src/components/Chat.jsx
import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  IconButton,
  TextField,
  List,
  ListItem,
  ListItemText,
  Typography,
  Paper,
  Avatar,
  Divider,
  Fade,
  Fab,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  FormControl,
  InputLabel,
  Select,
  Checkbox,           // 🟢 ADICIONE
  FormControlLabel,
  Chip,   // 🟢 ADICIONE
} from "@mui/material";
import ImageIcon from "@mui/icons-material/Image";
import GifBoxIcon from "@mui/icons-material/GifBox";
import SendIcon from "@mui/icons-material/Send";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import CloseIcon from "@mui/icons-material/Close";
import { db } from "../firebaseConfig";
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, getDoc, doc, setDoc, where } from "firebase/firestore";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { updateDoc, deleteDoc } from "firebase/firestore";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";

const GIPHY_API_KEY = "PBsoFISvy4OFVTNfZbpB5yF79ODJyTsc";

function LightboxImage({ src, zoom, setZoom }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [start, setStart] = useState({ x: 0, y: 0 });
  const [initialDistance, setInitialDistance] = useState(null);

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

// 🟢 ESTILO PARA O NOME DO MESTRE (BRILHO DOURADO)
const masterNameStyle = {
  fontWeight: "bold",
  background: "linear-gradient(45deg, #FFD700, #FFA500, #FFD700)",
  backgroundSize: "200% 200%",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  animation: "shine 3s ease-in-out infinite",
  textShadow: "0 0 10px rgba(255,215,0,0.5)",
};

// Adiciona keyframe
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = `
    @keyframes shine {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    @keyframes pulse {
      0% { box-shadow: 0 0 5px #FFD700; }
      50% { box-shadow: 0 0 20px #FFD700; }
      100% { box-shadow: 0 0 5px #FFD700; }
    }
  `;
  document.head.appendChild(styleSheet);
}

export default function Chat({ userNick, userEmail }) {
  const [text, setText] = useState("");
  const [messages, setMessages] = useState([]);
  const [filePreview, setFilePreview] = useState(null);
  const [filePreviews, setFilePreviews] = useState([]);
  const [avatars, setAvatars] = useState({});
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [lastSender, setLastSender] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [gifOpen, setGifOpen] = useState(false);
  const [gifResults, setGifResults] = useState([]);
  const [gifSearch, setGifSearch] = useState("");
  const [gifOffset, setGifOffset] = useState(0);
  const [gifLoading, setGifLoading] = useState(false);
  const [gifHasMore, setGifHasMore] = useState(true);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [diceAnchor, setDiceAnchor] = useState(null);
  const [sorteAzarMap, setSorteAzarMap] = useState({});
  // 🟢 ESTADOS PARA O MODAL DE AÇÃO
const [acaoOpen, setAcaoOpen] = useState(false);
const [acaoAtributo, setAcaoAtributo] = useState("");
const [acaoPericia, setAcaoPericia] = useState("");
const [acaoPericia2, setAcaoPericia2] = useState("");
const [acaoItem, setAcaoItem] = useState("");
const [acaoItemDado, setAcaoItemDado] = useState(0);
const [acaoCasting, setAcaoCasting] = useState(0);
const [acaoEmbuicao, setAcaoEmbuicao] = useState(0);
const [acaoHabilidadeSelecionada, setAcaoHabilidadeSelecionada] = useState("");
const [acaoHabilidadeDado, setAcaoHabilidadeDado] = useState(0);
// 🟢 ESTADOS DO SISTEMA DE COMBATE
const [acaoModo, setAcaoModo] = useState("acao"); // "acao" = normal, "reacao" = respondendo ataque
const [acaoAlvo, setAcaoAlvo] = useState(""); // email do alvo
const [acaoTipo, setAcaoTipo] = useState(""); // "dano", "esquiva", "contragolpe"
const [acaoPendenteId, setAcaoPendenteId] = useState(null); // ID da ação pendente
const [acoesPendentes, setAcoesPendentes] = useState([]); // lista de ações pendentes contra este jogador
const [fichasMap, setFichasMap] = useState({}); // nomes de todos os jogadores
// 🟢 ADICIONE APÓS OS OUTROS ESTADOS (aproximadamente linha 60-70)
const [galeriaOpen, setGaleriaOpen] = useState(false);
const [galeriaImagens, setGaleriaImagens] = useState([]);
// 🟢 IMAGENS OCULTAS DA GALERIA (localStorage)
const [imagensOcultas, setImagensOcultas] = useState(() => {
  try {
    return JSON.parse(localStorage.getItem('galeria_ocultas') || '[]');
  } catch {
    return [];
  }
});
// 🟢 DADOS DA FICHA DO JOGADOR
const [fichaJogador, setFichaJogador] = useState(null);
const [energiaAtual, setEnergiaAtual] = useState(0);
const [jogadorSelecionadoEmail, setJogadorSelecionadoEmail] = useState(userEmail);
const [rolagemEmAndamento, setRolagemEmAndamento] = useState(false);
// 🟢 DADO DE MORTE
const [modoMorte, setModoMorte] = useState(false);
const [dadosMorte, setDadosMorte] = useState([]);
const [resultadoMorte, setResultadoMorte] = useState(null);
const [rolagemMorteIndex, setRolagemMorteIndex] = useState(-1);

// 🟢 DADO SECRETO
const [modoSecreto, setModoSecreto] = useState(false);
  const openDiceMenu = Boolean(diceAnchor);

  const chatRef = useRef(null);
  const endRef = useRef(null);
  const chatCol = collection(db, "chat");

  const isMaster = userEmail === "mestre@reqviemrpg.com";
  const MASTER_AVATAR = "https://cdn-icons-png.flaticon.com/512/3171/3171927.png";

  const getDisplayNick = (email, nick) => {
    if (email === "mestre@reqviemrpg.com") return "👑 MESTRE";
    return nick;
  };

  const getAvatar = (email, normalAvatar) => {
    if (email === "mestre@reqviemrpg.com") {
      return normalAvatar || MASTER_AVATAR;
    }
    return normalAvatar;
  };

  function canEdit(msg) {
  if (msg.type === "dice" || msg.type === "acao") return false; // 🟢 Adicionado "acao"
  return isMaster || msg.userEmail === userEmail;
}

function canDelete(msg) {
  if (msg.type === "dice" || msg.type === "acao") return false; // 🟢 Adicionado "acao"
  return isMaster || msg.userEmail === userEmail;
}

  async function deleteMessage(msg) {
  if (msg.type === "dice" || msg.type === "acao") { // 🟢 Adicionado "acao"
    alert("Mensagens de dados/ação não podem ser apagadas.");
    return;
  }
  if (!window.confirm("Apagar esta mensagem?")) return;
  await deleteDoc(doc(db, "chat", msg.id));
}

  async function editMessage(msg) {
  if (msg.type === "acao") { // 🟢 Bloqueia edição de ações
    alert("Mensagens de ação não podem ser editadas.");
    return;
  }
  const novoTexto = prompt("Editar mensagem:", msg.text || "");
  if (novoTexto === null) return;
  await updateDoc(doc(db, "chat", msg.id), {
    text: novoTexto,
    edited: true,
  });
}

  // 🟢 CARREGAR FICHA DO JOGADOR
useEffect(() => {
  if (!userEmail) return;
  const emailParaBuscar = isMaster ? jogadorSelecionadoEmail : userEmail;
  if (!emailParaBuscar || (isMaster && emailParaBuscar === "mestre@reqviemrpg.com")) return;
  
  const fichaRef = doc(db, "fichas", emailParaBuscar);
  
  const unsub = onSnapshot(fichaRef, (snap) => {
    if (snap.exists()) {
      const dados = snap.data();
      setFichaJogador(dados);
      setEnergiaAtual(dados.pontosEnergia || 0);
    }
  });
  
  return () => unsub();
}, [userEmail, jogadorSelecionadoEmail]);

// 🟢 OUVIR SORTE/AZAR
useEffect(() => {
  const unsub = onSnapshot(doc(db, "game", "sorteAzar"), (snap) => {
    if (snap.exists()) {
      setSorteAzarMap(snap.data().jogadores || {});
    } else {
      setSorteAzarMap({});
    }
  });
  return () => unsub();
}, []);

  useEffect(() => {
    const q = query(chatCol, orderBy("timestamp", "asc"));
    const unsub = onSnapshot(q, async (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMessages(data);

      const uniqueUsers = [...new Set(data.map((m) => m.userEmail).filter(Boolean))];
      for (const email of uniqueUsers) {
        if (!avatars[email]) {
          try {
            const fichaRef = doc(db, "fichas", email);
            const fichaSnap = await getDoc(fichaRef);
            if (fichaSnap.exists()) {
              const img = fichaSnap.data().imagemPersonagem || "";
              setAvatars((p) => ({ ...p, [email]: img }));
            }
          } catch {}
        }
      }

      const container = chatRef.current;
      if (container) {
        const distance = container.scrollHeight - container.scrollTop - container.clientHeight;
        const atBottom = distance < 80;
        const lastMsg = data[data.length - 1];
        if (!atBottom && lastMsg && lastMsg.userEmail !== userEmail) {
          setUnreadCount((c) => c + 1);
          setShowScrollButton(true);
        }
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const container = chatRef.current;
    if (!container) return;
    const nearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120;
    if (autoScroll || lastSender === userEmail || nearBottom) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
      setLastSender("");
      setUnreadCount(0);
    }
  }, [messages]);

  useEffect(() => {
    const container = chatRef.current;
    if (!container) return;
    const handleScroll = () => {
      const distance = container.scrollHeight - container.scrollTop - container.clientHeight;
      const atBottom = distance < 80;
      if (atBottom) {
        setAutoScroll(true);
        setShowScrollButton(false);
        setUnreadCount(0);
      } else {
        setAutoScroll(false);
        setShowScrollButton(true);
      }
    };
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handlePaste = async (e) => {
      if (!e.clipboardData) return;
      const items = e.clipboardData.items;
      for (let item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            const img = await compressImage(file);
            setFilePreviews((prev) => [...prev, img]);
          }
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  // 🟢 CARREGAR LISTA DE JOGADORES PARA ALVO
useEffect(() => {
  const col = collection(db, "fichas");
  const unsub = onSnapshot(col, (snap) => {
    const map = {};
    snap.forEach((docSnap) => {
      const data = docSnap.data() || {};
      map[docSnap.id] = {
        nome: data.nome || docSnap.id,
        ...data
      };
    });
    setFichasMap(map);
  });
  return () => unsub();
}, []);

// 🟢 OUVIR AÇÕES PENDENTES (contra o jogador selecionado ou logado)
useEffect(() => {
  const emailAlvo = isMaster ? jogadorSelecionadoEmail : userEmail;
  
  console.log("🔍 DEBUG AÇÕES PENDENTES:", {
    isMaster,
    userEmail,
    jogadorSelecionadoEmail,
    emailAlvo,
    condicao: !emailAlvo || emailAlvo === "mestre@reqviemrpg.com"
  });
  
  if (!emailAlvo || emailAlvo === "mestre@reqviemrpg.com") {
    console.log("⏭️ Pulando - sem alvo válido");
    setAcoesPendentes([]);
    return;
  }
  
  console.log("👂 Ouvindo ações para:", emailAlvo);
  
  const q = query(
    collection(db, "acoesPendentes"),
    where("alvo", "==", emailAlvo),
    where("resolvida", "==", false)
  );
  
  const unsub = onSnapshot(q, (snap) => {
    const pendentes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    console.log("📬 Ações pendentes recebidas:", pendentes.length, pendentes);
    setAcoesPendentes(pendentes);
    
    if (pendentes.length > 0) {
      setAcaoModo("reacao");
      setAcaoPendenteId(pendentes[0].id);
    }
  });
  
  return () => unsub();
}, [userEmail, jogadorSelecionadoEmail, isMaster]);

  function tryParseDice(cmd) {
    const m = cmd.trim().match(/^(\d*)d(\d+)([+-]\d+)?$/i);
    if (!m) return null;
    const num = m[1] === "" ? 1 : parseInt(m[1], 10);
    const sides = parseInt(m[2], 10);
    const mod = m[3] ? parseInt(m[3], 10) : 0;
    const rolls = Array.from({ length: num }, () => Math.floor(Math.random() * sides) + 1);
    const total = rolls.reduce((a, b) => a + b, 0) + mod;
    const expr = `${num}d${sides}${mod ? (mod > 0 ? `+${mod}` : `${mod}`) : ""}`;
    return { expr, rolls, total };
  }

    async function quickRollDice(num, sides) {
  const fatorSorte = sorteAzarMap[userEmail];
  const rolls = [];
  let total = 0;
  for (let i = 0; i < num; i++) {
    let valor;
    if (fatorSorte !== undefined) {
      const chanceBoa = fatorSorte / 10;
      if (Math.random() < chanceBoa) {
        valor = Math.floor(Math.random() * 5) + 6;
      } else {
        valor = Math.floor(Math.random() * 5) + 1;
      }
    } else {
      valor = Math.floor(Math.random() * sides) + 1;
    }
    rolls.push(valor);
    total += valor;
  }

  // 🟢 Verifica se está em modo secreto (mestre)
  const isDadoSecreto = isMaster && modoSecreto;
  
  await addDoc(chatCol, {
    userNick,
    userEmail,
    type: "dice",
    text: `${num}d${sides} => [${rolls.join(", ")}] = ${total}`,
    secretRolls: isDadoSecreto ? rolls : null,
    secretTotal: isDadoSecreto ? total : null,
    secretText: isDadoSecreto ? `${num}d${sides} => [${rolls.map(() => "*").join(", ")}] = ***` : null,
    timestamp: serverTimestamp(),
  });
}

// 🟢 FUNÇÃO DO DADO DE MORTE (FORA do quickRollDice)
async function rolarDadoMorte() {
  setModoMorte(true);
  setDadosMorte([]);
  setResultadoMorte(null);
  
  const sucessos = [];
  const fracassos = [];
  let resultadoFinal = null;
  
  for (let i = 0; i < 3; i++) {
    setRolagemMorteIndex(i);
    
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    const valor = Math.floor(Math.random() * 10) + 1;
    const resultado = valor >= 6 ? "✅ Sucesso" : "❌ Fracasso";
    
    if (valor >= 6) {
      sucessos.push(valor);
    } else {
      fracassos.push(valor);
    }
    
    setDadosMorte(prev => [...prev, { valor, resultado, index: i }]);
    
    await addDoc(chatCol, {
      userNick: fichaJogador?.nome || userNick,
      userEmail: jogadorSelecionadoEmail,
      type: "dice_morte",
      text: `💀 **Dado de Morte ${i + 1}/3:** ${valor} (${resultado})`,
      visibleOnlyMaster: true,
      timestamp: serverTimestamp(),
    });
    
    if (sucessos.length >= 2) {
      resultadoFinal = "sobreviveu";
      break;
    }
    if (fracassos.length >= 2) {
      resultadoFinal = "morreu";
      break;
    }
  }
  
  if (!resultadoFinal) {
    resultadoFinal = sucessos.length > fracassos.length ? "sobreviveu" : "morreu";
  }
  
  setResultadoMorte(resultadoFinal);
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const nomePersonagem = fichaJogador?.nome || userNick;
  let mensagemResultado = "";
  
  if (resultadoFinal === "sobreviveu") {
    mensagemResultado = `💚 **${nomePersonagem} SOBREVIVEU!**\n` +
      `Sucessos: ${sucessos.length} | Fracassos: ${fracassos.length}\n` +
      `Dados: [${[...sucessos, ...fracassos].join(", ")}]`;
  } else {
    mensagemResultado = `💀 **${nomePersonagem} MORREU!**\n` +
      `Sucessos: ${sucessos.length} | Fracassos: ${fracassos.length}\n` +
      `Dados: [${[...sucessos, ...fracassos].join(", ")}]`;
    
    await setDoc(doc(db, "fichas", jogadorSelecionadoEmail), { pontosVida: 0 }, { merge: true });
  }
  
  await addDoc(chatCol, {
    userNick: nomePersonagem,
    userEmail: jogadorSelecionadoEmail,
    type: "dice_morte_result",
    text: mensagemResultado,
    timestamp: serverTimestamp(),
  });
  
  setTimeout(() => {
    setModoMorte(false);
    setDadosMorte([]);
    setResultadoMorte(null);
    setRolagemMorteIndex(-1);
  }, 3000);
}

  async function compressImage(file, maxSize = 800, quality = 0.7) {
    return new Promise((resolve) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = (e) => (img.src = e.target.result);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        if (width > height && width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        } else if (height > width && height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      reader.readAsDataURL(file);
    });
  }

  async function handleFiles(files) {
    const imgs = await Promise.all([...files].map((f) => compressImage(f)));
    setFilePreviews((p) => [...p, ...imgs]);
  }

  async function sendMessage(e) {
  e?.preventDefault();
  if (!text && !filePreview && filePreviews.length === 0) return;
  setLastSender(userEmail);

    const dice = tryParseDice(text);
  if (dice) {
    const isDadoSecreto = isMaster && modoSecreto;
    await addDoc(chatCol, {
      userNick,
      userEmail,
      type: "dice",
      text: `${dice.expr} => [${dice.rolls.join(", ")}] = ${dice.total}`,
      secretRolls: isDadoSecreto ? dice.rolls : null,
      secretTotal: isDadoSecreto ? dice.total : null,
      secretText: isDadoSecreto ? `${dice.expr} => [${dice.rolls.map(() => "*").join(", ")}] = ***` : null,
      timestamp: serverTimestamp(),
    });
    setText("");
    return;
  }

  if (filePreviews.length > 0) {
    await addDoc(chatCol, {
      userNick,
      userEmail,
      type: "image-group",
      text: text || "", // 🟢 Mantém o texto com quebras
      images: filePreviews,
      timestamp: serverTimestamp(),
    });
    setFilePreviews([]);
    setText("");
    return;
  }

  if (filePreview) {
    await addDoc(chatCol, {
      userNick,
      userEmail,
      type: "image",
      text: filePreview,
      timestamp: serverTimestamp(),
    });
    setFilePreview(null);
    return;
  }

  let type = "text";
  if (text.startsWith("http")) {
    if (text.match(/\.(mp4|webm|ogg)$/i)) type = "video";
    else if (text.match(/\.(jpg|jpeg|png|gif|bmp|webp|avif|tiff)$/i)) type = "image";
    else if (text.includes("youtube.com") || text.includes("youtu.be")) type = "youtube";
    else type = "link";
  }

  // 🟢 Envia o texto preservando quebras de linha
  await addDoc(chatCol, { 
    userNick, 
    userEmail, 
    type, 
    text: text, // Já contém as quebras de linha
    timestamp: serverTimestamp() 
  });
  setText("");
}

  async function handleFileChange(e) {
    const f = e.target.files;
    if (!f) return;
    handleFiles(f);
    e.target.value = null;
  }

  async function searchGifs(query = gifSearch, offset = 0) {
    if (gifLoading) return;
    if (!gifHasMore && offset !== 0) return;
    setGifLoading(true);
    const endpoint = query
      ? "https://api.giphy.com/v1/gifs/search"
      : "https://api.giphy.com/v1/gifs/trending";
    try {
      const res = await fetch(
        `${endpoint}?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(
          query || ""
        )}&limit=25&offset=${offset}&rating=g&lang=pt`
      );
      const data = await res.json();
      if (!data.data || data.data.length === 0) {
        setGifHasMore(false);
        setGifLoading(false);
        return;
      }
      if (offset === 0) {
        setGifResults(data.data);
      } else {
        setGifResults((prev) => [...prev, ...data.data]);
      }
      setGifOffset(offset + 25);
      setGifHasMore(true);
    } catch (err) {
      console.error("Erro ao buscar GIF:", err);
    }
    setGifLoading(false);
  }

  async function searchStickers() {
    const res = await fetch(
      `https://api.giphy.com/v1/stickers/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(
        gifSearch
      )}&limit=50`
    );
    const data = await res.json();
    setGifResults(data.data);
  }

  async function randomGif() {
    try {
      const res = await fetch(
        `https://api.giphy.com/v1/gifs/random?api_key=${GIPHY_API_KEY}&tag=${encodeURIComponent(
          gifSearch
        )}&rating=g`
      );
      const data = await res.json();
      if (data.data) {
        setGifResults((prev) => [data.data, ...prev]);
      }
    } catch (err) {
      console.error("Erro GIF aleatório:", err);
    }
  }

  // 🟢 FUNÇÃO PARA CARREGAR GALERIA DE IMAGENS
const carregarGaleria = () => {
  const mapaImagens = new Map();

  
  // Função para normalizar URL (remove parâmetros)
  const normalizarUrl = (url) => {
    try {
      const u = new URL(url);
      return u.origin + u.pathname; // Remove query strings
    } catch {
      return url.split('?')[0]; // Fallback simples
    }
  };


  messages.forEach(msg => {
    const processarImagem = (url, nick, timestamp) => {
      if (!url) return;
      const chave = normalizarUrl(url);
      if (!mapaImagens.has(chave)) {
        mapaImagens.set(chave, { url, userNick: nick, timestamp });
      }
    };
    
    if (msg.type === "image") {
      processarImagem(msg.text, msg.userNick, msg.timestamp);
    }
    
    if (msg.type === "image-group" && msg.images) {
      msg.images.forEach(img => {
        processarImagem(img, msg.userNick, msg.timestamp);
      });
    }
  });
  
  const imagensUnicas = Array.from(mapaImagens.values())
    .sort((a, b) => {
      const timeA = a.timestamp?.toDate?.() || new Date(0);
      const timeB = b.timestamp?.toDate?.() || new Date(0);
      return timeB - timeA;
    });
  
  setGaleriaImagens(imagensUnicas);
  setGaleriaOpen(true);
};

    // 🟢 OCULTAR IMAGEM DA GALERIA
const ocultarImagemGaleria = (url) => {
  const novasOcultas = [...imagensOcultas, url];
  setImagensOcultas(novasOcultas);
  localStorage.setItem('galeria_ocultas', JSON.stringify(novasOcultas));
};

  async function sendGif(url) {
    await addDoc(chatCol, {
      userNick,
      userEmail,
      type: "gif",
      text: url,
      timestamp: serverTimestamp(),
    });
    setGifOpen(false);
  }

  // 🟢 DESGASTAR DURABILIDADE DO ITEM
async function desgastarItem(email, nomeItem, quantidade = 1) {
  const fichaRef = doc(db, "fichas", email);
  const snap = await getDoc(fichaRef);
  if (!snap.exists()) return;
  
  const ficha = snap.data();
  const categorias = ['equipamentos', 'vestes', 'diversos'];
  
  for (const cat of categorias) {
    const itens = ficha[cat] || [];
    const index = itens.findIndex(item => item.nome === nomeItem);
    
    if (index !== -1) {
      const novosItens = itens.map((item, i) => {
        if (i === index) {
          return {
            ...item,
            durabilidade: Math.max(0, (item.durabilidade || 100) - quantidade)
          };
        }
        return item;
      });
      
      await setDoc(fichaRef, { [cat]: novosItens }, { merge: true });
      return;
    }
  }
}


async function rolarAcao() {
  if (rolagemEmAndamento) return;
  
  if (!acaoAtributo && !acaoPericia) {
    alert("Selecione pelo menos um Atributo ou uma Perícia!");
    return;
  }
  
  if (acaoModo === "acao" && acaoAlvo && !acaoTipo) {
    alert("Selecione o tipo: ☠️ Dano");
    return;
  }
  
  if (acaoModo === "reacao" && !acaoTipo) {
    alert("Selecione: 🛡️ Esquiva ou ⚔️ Contragolpe");
    return;
  }
  
    setRolagemEmAndamento(true);
  
  // 🟢 VALIDAR PV MÍNIMO (precisa ter mais de 1)
  const pvAtual = Number(fichaJogador?.pontosVida || 0);
  if (pvAtual <= 1) {
    alert("⚠️ PV insuficiente! É necessário ter mais de 1 ponto de vida para realizar uma ação.");
    setRolagemEmAndamento(false);
    return;
  }
  
  // 🟢 VALIDAR PE MÍNIMO (precisa ter mais de 1)
  if (energiaAtual <= 1) {
    alert("⚠️ PE insuficiente! É necessário ter mais de 1 ponto de energia para realizar uma ação.");
    setRolagemEmAndamento(false);
    return;
  }
  
  try {
    let totalD10 = 0;
    let descricao = [];
    let custoTotalEnergia = 0;
    
    if (acaoAtributo && fichaJogador?.atributos?.[acaoAtributo]) {
      const valor = fichaJogador.atributos[acaoAtributo];
      totalD10 += valor;
      descricao.push(`Atributo: ${acaoAtributo} (${valor})`);
    }
    
    if (acaoPericia && fichaJogador?.pericias?.[acaoPericia]) {
      const valor = fichaJogador.pericias[acaoPericia];
      totalD10 += valor;
      descricao.push(`Perícia: ${acaoPericia} (${valor})`);
      if (acaoPericia === "aura") custoTotalEnergia += 1;
    }

    if (acaoPericia2 && fichaJogador?.pericias?.[acaoPericia2]) {
      const valor2 = fichaJogador.pericias[acaoPericia2];
      totalD10 += valor2;
      descricao.push(`2ª Perícia: ${acaoPericia2} (${valor2})`);
      if (acaoPericia2 === "aura") custoTotalEnergia += 1;
    }
    
        // 🟢 ITEM - VALIDAR DURABILIDADE
    if (acaoItem) {
      // Busca o item para verificar durabilidade
      const todosItens = [
        ...(fichaJogador?.equipamentos || []),
        ...(fichaJogador?.vestes || []),
        ...(fichaJogador?.diversos || [])
      ];
      const itemEncontrado = todosItens.find(it => it.nome === acaoItem);
      
      if (itemEncontrado && (itemEncontrado.durabilidade || 100) <= 1) {
        alert(`⚠️ O item "${acaoItem}" está muito danificado (durabilidade ${itemEncontrado.durabilidade || 0}) e não pode ser usado!`);
        setRolagemEmAndamento(false);
        return;
      }
      
      totalD10 += acaoItemDado;
      descricao.push(`Item: ${acaoItem} (${acaoItemDado})`);
      await desgastarItem(jogadorSelecionadoEmail, acaoItem, 1);
    }
    
    if (acaoCasting > 0) {
      totalD10 += acaoCasting;
      descricao.push(`Casting: ${acaoCasting}`);
      custoTotalEnergia += acaoCasting;
    }
    
    if (acaoEmbuicao > 0) {
      totalD10 += acaoEmbuicao;
      descricao.push(`Embuição: ${acaoEmbuicao}`);
      custoTotalEnergia += acaoEmbuicao * 5;
    }
    
        // 🟢 HABILIDADE SELECIONADA
    if (acaoHabilidadeSelecionada) {
      totalD10 += acaoHabilidadeDado;
      descricao.push(`Habilidade: ${acaoHabilidadeSelecionada} (${acaoHabilidadeDado})`);
    }
    
    if (custoTotalEnergia > energiaAtual) {
      alert(`Energia insuficiente! Necessário: ${custoTotalEnergia} PE | Disponível: ${energiaAtual} PE`);
      setRolagemEmAndamento(false);
      return;
    }
    
    const novaEnergia = energiaAtual - custoTotalEnergia;
    setEnergiaAtual(novaEnergia);
    await setDoc(doc(db, "fichas", jogadorSelecionadoEmail), { pontosEnergia: novaEnergia }, { merge: true });
    
    const rolls = [];
    let total = 0;
    const fatorSorte = sorteAzarMap[userEmail];
    for (let i = 0; i < totalD10; i++) {
      let valor;
      if (fatorSorte !== undefined) {
        valor = Math.random() < (fatorSorte / 10) ? Math.floor(Math.random() * 5) + 6 : Math.floor(Math.random() * 5) + 1;
      } else {
        valor = Math.floor(Math.random() * 10) + 1;
      }
      rolls.push(valor);
      total += valor;
    }
    
    const nomePersonagem = fichaJogador?.nome || userNick;
    const partesDescricao = descricao.length > 0 ? descricao.join("; ") : "";
    
    let mensagem = `⚔️ **AÇÃO** ⚔️\n` +
      `O personagem **${nomePersonagem}** rodou sua Ação${partesDescricao ? ` com:\n${partesDescricao}` : "!"}\n\n` +
      `${totalD10}d10 => [${rolls.join(", ")}] = **${total}**`;
    
    if (custoTotalEnergia > 0) {
      mensagem += `\n\n⚡ Energia gasta: ${custoTotalEnergia} PE (Restante: ${novaEnergia} PE)`;
    }

        if (acaoModo === "acao" && acaoAlvo && acaoTipo === "dano") {
      const pendenteRef = doc(collection(db, "acoesPendentes"));
      await setDoc(pendenteRef, {
  atacante: jogadorSelecionadoEmail, // 🟢 USA O EMAIL DO JOGADOR SELECIONADO
  alvo: acaoAlvo,
        tipo: "dano",
        valorAtaque: total,
        dadosRolados: rolls, // 🟢 SALVA OS DADOS ROLADOS
        timestamp: serverTimestamp(),
        resolvida: false
      });
      mensagem += `\n\n🎯 Alvo: **${fichasMap[acaoAlvo]?.nome || acaoAlvo}**\n⚠️ Aguardando reação...`;
    }
    
        // 🟢 SE FOR REAÇÃO: Envia como o personagem que reagiu
    if (acaoModo === "reacao" && acaoPendenteId && acaoTipo) {
      await resolverCombate(acaoPendenteId, acaoTipo, total, rolls);
      setAcaoModo("acao");
      setAcaoPendenteId(null);
      setAcaoOpen(false);
      setRolagemEmAndamento(false);
      return;
    }
    
    await addDoc(chatCol, {
  userNick: fichaJogador?.nome || userNick,
  userEmail: jogadorSelecionadoEmail, // 🟢 USA O EMAIL DO JOGADOR
  type: "acao",
      text: mensagem,
      dadosRolados: rolls, // 🟢 ADICIONA OS DADOS
      timestamp: serverTimestamp(),
    });
    
    setAcaoOpen(false);
    } finally {
    setRolagemEmAndamento(false);
    setAcaoAtributo("");
    setAcaoPericia("");
    setAcaoPericia2("");
    setAcaoItem("");
    setAcaoItemDado(0);
    setAcaoCasting(0);
    setAcaoEmbuicao(0);
    setAcaoHabilidadeSelecionada("");
    setAcaoHabilidadeDado(0);
  }
}

// 🟢 FUNÇÃO PARA RESOLVER COMBATE - VERSÃO CORRIGIDA
async function resolverCombate(pendenteId, tipoDefesa, valorDefesa, dadosDefesa = []) {
  const pendenteRef = doc(db, "acoesPendentes", pendenteId);
  const snap = await getDoc(pendenteRef);
  
  if (!snap.exists()) return;
  
  const pendente = snap.data();
  const valorAtaque = pendente.valorAtaque;
  const atacante = pendente.atacante;
  const alvo = pendente.alvo;
  const dadosAtacante = pendente.dadosRolados || [];
  
  // 🟢 Nomes dos personagens
  const nomeAtacante = fichasMap[atacante]?.nome || atacante;
  const nomeDefensor = fichasMap[alvo]?.nome || alvo;
  
  let mensagem = "";
  let danoBrutoAtacante = 0;
  let danoBrutoAlvo = 0;
  
  if (tipoDefesa === "esquiva") {
    danoBrutoAlvo = Math.max(0, valorAtaque - valorDefesa);
    mensagem = `🛡️ **${nomeDefensor}** tentou esquivar!\n\n`;
    mensagem += `🎲 **Dados do Ataque** (${nomeAtacante}): [${dadosAtacante.join(", ")}] = **${valorAtaque}**\n`;
    mensagem += `🎲 **Dados da Esquiva** (${nomeDefensor}): [${dadosDefesa.join(", ")}] = **${valorDefesa}**\n\n`;
    
    if (danoBrutoAlvo > 0) {
      mensagem += `💥 **${valorAtaque}** - **${valorDefesa}** = **${danoBrutoAlvo}** de dano bruto\n`;
    } else {
      mensagem += `✅ **Esquiva bem-sucedida!** Nenhum dano recebido.\n`;
    }
  }
  
  if (tipoDefesa === "contragolpe") {
    mensagem = `⚔️ **${nomeDefensor}** tentou contra-golpear!\n\n`;
    mensagem += `🎲 **Dados do Ataque** (${nomeAtacante}): [${dadosAtacante.join(", ")}] = **${valorAtaque}**\n`;
    mensagem += `🎲 **Dados do Contragolpe** (${nomeDefensor}): [${dadosDefesa.join(", ")}] = **${valorDefesa}**\n\n`;
    
    if (valorDefesa > valorAtaque) {
      danoBrutoAtacante = valorDefesa - valorAtaque;
      mensagem += `⚡ **${valorDefesa}** - **${valorAtaque}** = **${danoBrutoAtacante}** de dano devolvido!\n`;
    } else {
      danoBrutoAlvo = valorAtaque - valorDefesa;
      mensagem += `⚠️ Contragolpe falhou!\n`;
      mensagem += `💥 **${valorAtaque}** - **${valorDefesa}** = **${danoBrutoAlvo}** de dano bruto\n`;
    }
  }
  
  // Aplica dano no ALVO
  if (danoBrutoAlvo > 0) {
    const resultado = await aplicarDano(alvo, danoBrutoAlvo);
    mensagem += `\n🛡️ **Armadura de ${nomeDefensor}:** ${resultado.armadura}\n`;
    if (resultado.armadura > 0) {
      const absorvido = Math.min(resultado.armadura, danoBrutoAlvo);
      mensagem += `🔄 Absorveu: **${absorvido}** de dano\n`;
    }
    mensagem += `💔 **Dano Final em ${nomeDefensor}:** **${resultado.danoFinal}**\n`;
    mensagem += `❤️ PV restante: **${resultado.pvRestante}**\n`;
  }
  
  // Aplica dano no ATACANTE (contragolpe bem-sucedido)
  if (danoBrutoAtacante > 0) {
    const resultado = await aplicarDano(atacante, danoBrutoAtacante);
    mensagem += `\n🛡️ **Armadura de ${nomeAtacante}:** ${resultado.armadura}\n`;
    if (resultado.armadura > 0) {
      const absorvido = Math.min(resultado.armadura, danoBrutoAtacante);
      mensagem += `🔄 Absorveu: **${absorvido}** de dano\n`;
    }
    mensagem += `💔 **Dano Final em ${nomeAtacante}:** **${resultado.danoFinal}**\n`;
    mensagem += `❤️ PV restante: **${resultado.pvRestante}**\n`;
  }

  // Desgasta vestimentas de quem defendeu
  if (tipoDefesa === "esquiva" || tipoDefesa === "contragolpe") {
    const fichaRef = doc(db, "fichas", alvo);
    const snapDefensor = await getDoc(fichaRef);
    
    if (snapDefensor.exists()) {
      const fichaDefensor = snapDefensor.data();
      const vestes = fichaDefensor.vestes || [];
      
      if (vestes.length > 0) {
        const novasVestes = vestes.map(item => ({
          ...item,
          durabilidade: Math.max(0, (item.durabilidade || 100) - 1)
        }));
        
        await setDoc(fichaRef, { vestes: novasVestes }, { merge: true });
      }
    }
  }
  
  // Marca como resolvida
  await setDoc(pendenteRef, { resolvida: true }, { merge: true });
  
  // 🟢 Envia mensagem como o DEFENSOR (quem reagiu)
  await addDoc(chatCol, {
    userNick: nomeDefensor,
    userEmail: alvo,
    type: "acao",
    text: mensagem,
    dadosRolados: dadosDefesa,
    timestamp: serverTimestamp(),
  });
  
  return { mensagem };
}
// 🟢 FUNÇÃO PARA APLICAR DANO (PV + ARMADURA) - AGORA RETORNA RESULTADO
async function aplicarDano(email, danoBruto) {
  const fichaRef = doc(db, "fichas", email);
  const snap = await getDoc(fichaRef);
  if (!snap.exists()) return { danoFinal: 0, armadura: 0 };
  
  const ficha = snap.data();
  const armadura = Number(ficha.armadura || 0);
  
  // Armadura absorve dano
  const danoFinal = Math.max(0, danoBruto - armadura);
  
  console.log(`🛡️ APLICAR DANO: ${email}`, { danoBruto, armadura, danoFinal });
  
  // Desgasta durabilidade das vestes (proporcional ao dano absorvido)
  const vestes = ficha.vestes || [];
  if (vestes.length > 0 && armadura > 0 && danoBruto > 0) {
    const danoAbsorvido = Math.min(armadura, danoBruto);
    const desgastePorItem = danoAbsorvido / vestes.length;
    
    const novasVestes = vestes.map(item => ({
      ...item,
      durabilidade: Math.max(0, (item.durabilidade || 100) - desgastePorItem)
    }));
    
    await setDoc(fichaRef, { vestes: novasVestes }, { merge: true });
  }
  
  // Atualiza PV
  const pvAtual = Number(ficha.pontosVida || 0);
  const novoPV = Math.max(0, pvAtual - danoFinal);
  
  await setDoc(fichaRef, { pontosVida: novoPV }, { merge: true });
  
  // 🟢 RETORNA o resultado para usar na mensagem
    return { danoFinal, armadura, pvRestante: novoPV };
}

  const getInitials = (name = "?") =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  return (
    <Paper elevation={2} sx={{ height: "100%", display: "flex", flexDirection: "column", p: 1, position: "relative", bgcolor: "#07121a" }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
  <Typography variant="h6">💬 Chat</Typography>
   {/* 🟢 SELETOR DE JOGADOR ATIVO PARA O MESTRE */}
    {isMaster && (
      <FormControl size="small" sx={{ minWidth: 180, ml: 2 }}>
                <Select
          value={jogadorSelecionadoEmail === "mestre@reqviemrpg.com" ? "mestre" : jogadorSelecionadoEmail}
          onChange={(e) => {
  const selectedEmail = e.target.value;
  if (selectedEmail === "mestre") {
    setFichaJogador(null);
    setEnergiaAtual(0);
    setJogadorSelecionadoEmail(userEmail); // volta para o mestre
    setAcoesPendentes([]); // 🟢 LIMPA PENDÊNCIAS
  setAcaoModo("acao"); // 🟢 VOLTA AO MODO NORMAL
  } else {
    const fichaData = fichasMap[selectedEmail];
    if (fichaData) {
      setFichaJogador(fichaData);
      setEnergiaAtual(fichaData.pontosEnergia || 0);
      setJogadorSelecionadoEmail(selectedEmail); // 🟢 SALVA O EMAIL DO JOGADOR
    }
  }
}}
          displayEmpty
          sx={{ 
            color: '#fff', 
            fontSize: '0.75rem',
            '& .MuiOutlinedInput-notchedOutline': { borderColor: '#334155' },
          }}
          MenuProps={{
            PaperProps: { 
              sx: { 
                bgcolor: "#0f172a", 
                color: "#fff",
                maxHeight: 400,
              } 
            }
          }}
        >
          <MenuItem value="mestre" sx={{ color: '#FFD700' }}>
            👑 Mestre (sem ficha)
          </MenuItem>
          
          {/* 🟢 SEPARAÇÃO PJ/PM */}
          <MenuItem disabled sx={{ opacity: 1, borderBottom: '1px solid #4caf50', mt: 0.5 }}>
            <Typography variant="caption" sx={{ color: '#4caf50', fontWeight: 'bold' }}>
              ── PERSONAGENS DO JOGADOR ──
            </Typography>
          </MenuItem>
          
          {Object.entries(fichasMap)
            .filter(([email, data]) => (data.tipoFicha || "PJ") === "PJ")
            .map(([email, data]) => (
              <MenuItem key={email} value={email} sx={{ pl: 3 }}>
                📋 {data.nome || email}
              </MenuItem>
            ))}
          
          {Object.entries(fichasMap).some(([email, data]) => data.tipoFicha === "PM") && (
            <MenuItem disabled sx={{ opacity: 1, borderBottom: '1px solid #ff9800', mt: 1 }}>
              <Typography variant="caption" sx={{ color: '#ff9800', fontWeight: 'bold' }}>
                ── PERSONAGENS DO MESTRE ──
              </Typography>
            </MenuItem>
          )}
          
          {Object.entries(fichasMap)
            .filter(([email, data]) => data.tipoFicha === "PM")
            .map(([email, data]) => (
              <MenuItem key={email} value={email} sx={{ pl: 3 }}>
                📋 {data.nome || email}
              </MenuItem>
            ))}
        </Select>
      </FormControl>
    )}
  
  <Box sx={{ display: "flex", gap: 1 }}>
    {/* 🟢 BOTÃO GALERIA - TODOS VEEM */}
    <Button
      variant="outlined"
      size="small"
      onClick={carregarGaleria}
      sx={{ color: '#fff', borderColor: '#9c27b0' }}
    >
      🖼️ Galeria
    </Button>
    
    {/* 🟢 BOTÃO AVATAR - SÓ MESTRE */}
    {isMaster && (
      <Button
        variant="outlined"
        size="small"
        component="label"
        startIcon={<ImageIcon />}
      >
        Trocar avatar
        <input
          hidden
          type="file"
          accept="image/*"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              const formData = new FormData();
              formData.append("file", file);
              const res = await fetch("https://reqviem.onrender.com/upload", {
                method: "POST",
                body: formData,
              });
              const data = await res.json();
              if (data.url) {
                await setDoc(doc(db, "fichas", "mestre@reqviemrpg.com"), { imagemPersonagem: data.url }, { merge: true });
                setAvatars(prev => ({ ...prev, "mestre@reqviemrpg.com": data.url }));
              }
            } catch (err) {
              console.error("Erro ao enviar imagem:", err);
              alert("Erro ao enviar imagem.");
            }
          }}
        />
      </Button>
    )}
  </Box>
</Box>

      <Box
        ref={chatRef}
        sx={{ flex: 1, overflowY: "auto", position: "relative", scrollBehavior: "smooth", pb: 1 }}
        onDrop={(e) => {
          e.preventDefault();
          handleFiles(e.dataTransfer.files);
        }}
        onDragOver={(e) => e.preventDefault()}
      >
        <List>
          {messages.map((m, i) => {
            const prev = messages[i - 1];
            const showDivider = !prev || prev.userEmail !== m.userEmail;
            const dataHora = m.timestamp?.toDate ? m.timestamp.toDate() : null;
            const horaFormatada = dataHora
              ? `${dataHora.toLocaleDateString("pt-BR")} ${dataHora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
              : "";

            return (
              <React.Fragment key={m.id}>
                {showDivider && i > 0 && <Divider sx={{ my: 0.5, opacity: 0.3 }} />}
                <ListItem
                  alignItems="flex-start"
                  sx={{
                    flexDirection: m.userEmail === userEmail ? "row-reverse" : "row",
                    px: 0,
                  }}
                >
                  <Avatar
                    src={getAvatar(m.userEmail, avatars[m.userEmail] || "")}
                    onClick={() => {
                      if (avatars[m.userEmail]) {
                        setLightboxImage(avatars[m.userEmail]);
                        setZoom(1);
                      }
                    }}
                    sx={{
                      width: 32,
                      height: 32,
                      cursor: avatars[m.userEmail] ? "pointer" : "default",
                      bgcolor: avatars[m.userEmail] ? "transparent" : "#333",
                      fontSize: 14,
                      mr: m.userEmail === userEmail ? 0 : 1,
                      ml: m.userEmail === userEmail ? 1 : 0,
                      ...(m.userEmail === "mestre@reqviemrpg.com" && {
                        border: "2px solid #FFD700",
                        boxShadow: "0 0 15px #FFD700",
                        animation: "pulse 2s infinite",
                      }),
                    }}
                  >
                    {!avatars[m.userEmail] && getInitials(m.userNick)}
                  </Avatar>

                  <Box
                    sx={{
                      maxWidth: "75%",
                      bgcolor: m.userEmail === userEmail ? "#1e3a5f" : "#2a2a2a",
                      borderRadius: 2,
                      p: 1.5,
                      boxShadow: 2,
                      wordBreak: "break-word",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 0.5,
                      }}
                    >
                      <Typography 
                        variant="subtitle2" 
                        sx={m.userEmail === "mestre@reqviemrpg.com" ? masterNameStyle : { fontWeight: "bold" }}
                      >
                        {getDisplayNick(m.userEmail, m.userNick)}
                      </Typography>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        {canEdit(m) && (
                          <IconButton size="small" onClick={() => editMessage(m)}>
                            <EditIcon fontSize="inherit" />
                          </IconButton>
                        )}
                        {canDelete(m) && (
                          <IconButton size="small" onClick={() => deleteMessage(m)}>
                            <DeleteIcon fontSize="inherit" />
                          </IconButton>
                        )}
                      </Box>
                    </Box>

                    {m.type === "image" && (
                      <img
                        src={m.text}
                        style={{ maxWidth: "100%", borderRadius: 8, cursor: "pointer" }}
                        onClick={() => {
                          setLightboxImage(m.text);
                          setZoom(1);
                        }}
                      />
                    )}

                    {m.type === "image-group" && (
  <>
    {m.text && <Typography sx={{ mb: 0.5, whiteSpace: 'pre-line' }}>{m.text}</Typography>}
    {m.images?.map((img, idx) => (
                          <img
                            key={idx}
                            src={img}
                            style={{
                              maxWidth: "100%",
                              display: "block",
                              marginTop: 6,
                              borderRadius: 8,
                              cursor: "pointer",
                            }}
                            onClick={() => {
                              setLightboxImage(img);
                              setZoom(1);
                            }}
                          />
                        ))}
                      </>
                    )}

                    {m.type === "gif" && (
                      <img
                        src={m.text}
                        style={{ maxWidth: "100%", borderRadius: 8, cursor: "pointer" }}
                        onClick={() => {
                          setLightboxImage(m.text);
                          setZoom(1);
                        }}
                      />
                    )}

                    {m.type === "video" && (
                      <video controls src={m.text} style={{ maxWidth: "100%", borderRadius: 8 }} />
                    )}

                    {m.type === "youtube" && (
                      <iframe
                        width="100%"
                        height="135"
                        src={m.text.replace("watch?v=", "embed/")}
                        frameBorder="0"
                        allowFullScreen
                        style={{ borderRadius: 8 }}
                      />
                    )}

                    {m.type === "link" && (
                      <a href={m.text} target="_blank" rel="noreferrer">
                        {m.text}
                      </a>
                    )}

                                        {m.type === "dice" && (
                      <Box>
                        <Typography color="primary" sx={{ fontWeight: "bold" }}>
                          {!isMaster && m.secretText ? m.secretText : m.text}
                        </Typography>
                        {isMaster && m.secretText && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                            <Typography variant="caption" sx={{ color: '#ef4444', fontSize: '0.65rem' }}>
                              🔒 SECRETO
                            </Typography>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={async () => {
                                await updateDoc(doc(db, "chat", m.id), {
                                  secretText: null,
                                  revealed: true
                                });
                              }}
                              sx={{ 
                                fontSize: '0.6rem', 
                                minWidth: 'auto', 
                                px: 0.5, 
                                py: 0.2,
                                color: '#4caf50',
                                borderColor: '#4caf50'
                              }}
                            >
                              👁️ Revelar
                            </Button>
                          </Box>
                        )}
                        {m.revealed && (
                          <Typography variant="caption" sx={{ color: '#4caf50', display: 'block', mt: 0.5 }}>
                            ✅ Revelado pelo Mestre
                          </Typography>
                        )}
                      </Box>
                    )}

                    {m.type === "dice_morte" && (
                      <Box>
                        {isMaster ? (
                          <Typography sx={{ color: '#ef4444', fontWeight: 'bold' }}>
                            {m.text}
                          </Typography>
                        ) : (
                          <Typography sx={{ color: '#666', fontStyle: 'italic' }}>
                            💀 Dado de Morte rolado...
                          </Typography>
                        )}
                      </Box>
                    )}

                    {m.type === "dice_morte_result" && (
                      <Typography sx={{ color: '#ef4444', fontWeight: 'bold', whiteSpace: 'pre-line' }}>
                        {m.text}
                      </Typography>
                    )}

                                        {m.type === "acao" && (
  <Box>
    <Typography sx={{ color: '#00bcd4', whiteSpace: 'pre-line', fontWeight: 'bold' }}>
      {m.text}
    </Typography>
    {/* 🟢 Mostra os dados rolados se existirem */}
    {m.dadosRolados && m.dadosRolados.length > 0 && (
      <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mt: 0.5 }}>
        🎲 Dados: [{m.dadosRolados.join(", ")}]
      </Typography>
    )}
  </Box>
)}

                    {m.type === "text" && (
  <Typography sx={{ whiteSpace: 'pre-line' }}>
    {m.text}
    {m.edited && (
      <Typography
        component="span"
        sx={{ ml: 0.5, fontSize: "0.7rem", opacity: 0.6 }}
      >
        (editado)
      </Typography>
    )}
  </Typography>
)}

                    <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 0.5 }}>
                      <Typography variant="caption" sx={{ opacity: 0.6, fontSize: "0.7rem" }}>
                        {horaFormatada}
                      </Typography>
                    </Box>
                  </Box>
                </ListItem>
              </React.Fragment>
            );
          })}
          <div ref={endRef} />
        </List>
      </Box>

      {filePreviews.length > 0 && (
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1 }}>
          {filePreviews.map((img, i) => (
            <Box key={i} sx={{ position: "relative" }}>
              <img src={img} style={{ width: 64, height: 64, borderRadius: 8 }} />
              <IconButton
                size="small"
                onClick={() => setFilePreviews((p) => p.filter((_, idx) => idx !== i))}
                sx={{
                  position: "absolute",
                  top: -6,
                  right: -6,
                  bgcolor: "rgba(0,0,0,0.7)",
                  color: "#fff",
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
        </Box>
      )}

      <Box component="form" onSubmit={sendMessage} sx={{ display: "flex", gap: 1, mt: 1 }}>
        <TextField
  placeholder='Mensagem ou "1d20+3" (Shift+Enter para nova linha)'
  value={text}
  onChange={(e) => setText(e.target.value)}
  onKeyDown={(e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e);
    }
  }}
  size="small"
  fullWidth
  multiline
  minRows={1}
  maxRows={4}
  sx={{
    '& .MuiInputBase-root': {
      maxHeight: '100px',
      overflowY: 'auto',
    }
  }}
/>
        <IconButton component="label">
          <ImageIcon />
          <input hidden type="file" accept="image/*" multiple onChange={handleFileChange} />
        </IconButton>
        <IconButton
          color="primary"
          onClick={() => {
            setGifResults([]);
            setGifOffset(0);
            setGifHasMore(true);
            setGifSearch("");
            setGifOpen(true);
            searchGifs("", 0);
          }}
        >
          <GifBoxIcon />
        </IconButton>
        <Button type="submit" variant="contained" endIcon={<SendIcon />}>
          Enviar
        </Button>
      </Box>

            <Box sx={{ mt: 1, display: "flex", gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
  <Button variant="outlined" size="small" onClick={(e) => setDiceAnchor(e.currentTarget)}>
    D10
  </Button>
  <Button variant="outlined" size="small" onClick={() => quickRollDice(1, 100)}>
    1D100
  </Button>
  
  {/* 🟢 CHECKBOX DADO SECRETO - SÓ MESTRE */}
  {isMaster && (
    <FormControlLabel
      control={
        <Checkbox
          checked={modoSecreto}
          onChange={(e) => setModoSecreto(e.target.checked)}
          size="small"
          sx={{ 
            color: '#ef4444',
            '&.Mui-checked': { color: '#ef4444' }
          }}
        />
      }
      label={
        <Typography variant="caption" sx={{ color: '#ef4444', fontWeight: 'bold' }}>
          🔒 Secreto
        </Typography>
      }
      sx={{ mr: 1 }}
    />
  )}
  {/* 🟢 BOTÃO AÇÃO */}
  <Badge 
  badgeContent={acoesPendentes.length} 
  color="error"
  invisible={acoesPendentes.length === 0}
>
  <Button 
    variant="contained" 
    size="small" 
    onClick={() => { 
      setAcaoPericia2(""); 
      // Se tem ação pendente, abre em modo reação
      if (acoesPendentes.length > 0) {
        setAcaoModo("reacao");
        setAcaoPendenteId(acoesPendentes[0].id);
        setAcaoTipo(""); // limpa tipo para forçar escolha
      } else {
        setAcaoModo("acao");
        setAcaoPendenteId(null);
        setAcaoAlvo("");
        setAcaoTipo("");
      }
      setAcaoOpen(true); 
    }}
    sx={{ 
      bgcolor: acoesPendentes.length > 0 ? '#ef4444' : '#9c27b0', 
      '&:hover': { bgcolor: acoesPendentes.length > 0 ? '#dc2626' : '#7b1fa2' } 
    }}
  >
    {acoesPendentes.length > 0 ? `⚔️ REAGIR (${acoesPendentes.length})` : '⚔️ AÇÃO'}
  </Button>
</Badge>
  {/* 🟢 BOTÃO DADO DE MORTE - Aparece quando PV <= 1 */}
  {(Number(fichaJogador?.pontosVida) <= 1 && fichaJogador?.pontosVida !== undefined && !isMaster) && (
    <Button
      variant="contained"
      size="small"
      onClick={() => setModoMorte(true)}
      sx={{
        bgcolor: '#000',
        color: '#ef4444',
        border: '2px solid #ef4444',
        fontWeight: 'bold',
        '&:hover': {
          bgcolor: '#1a0000',
          border: '2px solid #ff0000',
        }
      }}
    >
      💀 Dado de Morte
    </Button>
  )}
        <Menu
          anchorEl={diceAnchor}
          open={openDiceMenu}
          onClose={() => setDiceAnchor(null)}
          PaperProps={{ sx: { maxHeight: 320, width: 220 } }}
        >
          <Grid container spacing={1} sx={{ p: 1 }}>
            {Array.from({ length: 30 }, (_, i) => i + 1).map((n) => (
              <Grid item xs={4} key={n}>
                <Button
                  fullWidth
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    quickRollDice(n, 10);
                    setDiceAnchor(null);
                  }}
                >
                  {n}D10
                </Button>
              </Grid>
            ))}
          </Grid>
        </Menu>
      </Box>

      <Dialog open={gifOpen} onClose={() => setGifOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Buscar GIF</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={(e) => { e.preventDefault(); searchGifs(); }} sx={{ display: "flex", gap: 1, mb: 2 }}>
            <TextField
              fullWidth
              placeholder="Pesquisar GIF..."
              value={gifSearch}
              onChange={(e) => setGifSearch(e.target.value)}
            />
            <Button variant="contained" onClick={() => { setGifOffset(0); setGifHasMore(true); searchGifs(gifSearch, 0); }}>
              Buscar
            </Button>
          </Box>
          <Box sx={{ mb: 2, display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Button size="small" variant="outlined" onClick={randomGif}>🎲 Aleatório</Button>
            <Button size="small" variant="outlined" onClick={searchStickers}>⭐ Stickers</Button>
            {["rpg", "magic", "explosion", "anime", "fight", "laugh"].map((tag) => (
              <Button key={tag} size="small" variant="outlined" onClick={() => { setGifSearch(tag); setGifOffset(0); searchGifs(tag, 0); }}>
                {tag}
              </Button>
            ))}
          </Box>
          <Grid
            container
            spacing={1}
            sx={{ maxHeight: 400, overflowY: "auto" }}
            onScroll={(e) => {
              const el = e.currentTarget;
              const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 100;
              if (nearBottom && !gifLoading && gifHasMore) {
                searchGifs(gifSearch, gifOffset);
              }
            }}
          >
            {gifResults.map((g) => (
              <Grid item xs={3} key={g.id}>
                <img
                  src={g.images.fixed_height?.url || g.images.downsized?.url || g.images.original?.url}
                  style={{ width: "100%", cursor: "pointer", borderRadius: 6 }}
                  onClick={() => sendGif(g.images.original?.url || g.images.downsized?.url)}
                />
              </Grid>
            ))}
          </Grid>
        </DialogContent>
      </Dialog>

      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          onWheel={(e) => {
            e.preventDefault();
            setZoom((z) => Math.min(Math.max(z + e.deltaY * -0.001, 0.5), 5));
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 3000,
          }}
        >
          <LightboxImage src={lightboxImage} zoom={zoom} setZoom={setZoom} />
        </div>
      )}

      <Fade in={showScrollButton}>
        <Fab
          color="primary"
          size="small"
          onClick={() => {
            endRef.current?.scrollIntoView({ behavior: "smooth" });
            setShowScrollButton(false);
            setUnreadCount(0);
            setAutoScroll(true);
          }}
          sx={{ position: "absolute", bottom: 90, right: 16, zIndex: 2000 }}
        >
          <Badge badgeContent={unreadCount} color="error">
            <ArrowDownwardIcon />
          </Badge>
        </Fab>
      </Fade>
            {/* 🟢 MODAL DE AÇÃO */}
      <Dialog 
        open={acaoOpen} 
        onClose={() => setAcaoOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: 2
          }
        }}
      >
        <DialogTitle sx={{ color: '#fff', display: 'flex', alignItems: 'center', gap: 1 }}>
  <span style={{ fontSize: '1.5rem' }}>{acaoModo === "reacao" ? '🛡️' : '⚔️'}</span>
  {acaoModo === "reacao" ? 'REAGIR' : 'Ação'} - {fichaJogador?.nome || userNick}
  {acoesPendentes.length > 0 && acaoModo === "reacao" && (
    <Typography variant="caption" sx={{ color: '#ef4444', ml: 2 }}>
      Atacante: {fichasMap[acoesPendentes[0]?.atacante]?.nome || acoesPendentes[0]?.atacante}
    </Typography>
  )}
</DialogTitle>
        
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            
            {/* Atributo */}
            <FormControl fullWidth size="small">
              <InputLabel sx={{ color: '#94a3b8' }}>Atributo</InputLabel>
              <Select
                value={acaoAtributo}
                onChange={(e) => setAcaoAtributo(e.target.value)}
                sx={{ color: '#fff', bgcolor: '#1a1a2e' }}
              >
                <MenuItem value="">Nenhum</MenuItem>
                {fichaJogador?.atributos && Object.entries(fichaJogador.atributos).map(([k, v]) => (
                  <MenuItem key={k} value={k} disabled={v < 1}>
                    {k.charAt(0).toUpperCase() + k.slice(1)} ({v})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            {/* Perícia */}
            <FormControl fullWidth size="small">
              <InputLabel sx={{ color: '#94a3b8' }}>Perícia</InputLabel>
              <Select
                value={acaoPericia}
                onChange={(e) => setAcaoPericia(e.target.value)}
                sx={{ color: '#fff', bgcolor: '#1a1a2e' }}
              >
                <MenuItem value="">Nenhuma</MenuItem>
                {fichaJogador?.pericias && Object.entries(fichaJogador.pericias).map(([k, v]) => (
                  <MenuItem key={k} value={k} disabled={v < 1}>
                    {k.charAt(0).toUpperCase() + k.slice(1)} ({v})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* 🟢 Segunda Perícia (aparece se Aura = nível 5) */}
{fichaJogador?.pericias?.aura >= 5 && acaoPericia && (
  <FormControl fullWidth size="small">
    <InputLabel sx={{ color: '#94a3b8' }}>Segunda Perícia (Aura Nv.5)</InputLabel>
    <Select
      value={acaoPericia2}
      onChange={(e) => setAcaoPericia2(e.target.value)}
      sx={{ color: '#fff', bgcolor: '#1a1a2e' }}
    >
      <MenuItem value="">Nenhuma</MenuItem>
      {fichaJogador?.pericias && Object.entries(fichaJogador.pericias).map(([k, v]) => (
        <MenuItem key={k} value={k} disabled={v < 1 || k === acaoPericia}>
          {k.charAt(0).toUpperCase() + k.slice(1)} ({v})
        </MenuItem>
      ))}
    </Select>
  </FormControl>
)}
            
            {/* Item */}
            <FormControl fullWidth size="small">
              <InputLabel sx={{ color: '#94a3b8' }}>Item</InputLabel>
              <Select
                value={acaoItem}
                onChange={(e) => {
                  setAcaoItem(e.target.value);
                  const todosItens = [
                    ...(fichaJogador?.equipamentos || []),
                    ...(fichaJogador?.vestes || []),
                    ...(fichaJogador?.diversos || [])
                  ];
                  const itemEncontrado = todosItens.find(it => it.nome === e.target.value);
                  setAcaoItemDado(itemEncontrado?.dado || 0);
                }}
                sx={{ color: '#fff', bgcolor: '#1a1a2e' }}
              >
                <MenuItem value="">Nenhum</MenuItem>
                {[
                  ...(fichaJogador?.equipamentos || []).map(it => it.nome),
                  ...(fichaJogador?.vestes || []).map(it => it.nome),
                  ...(fichaJogador?.diversos || []).map(it => it.nome)
                ].filter(n => n).map((nome, i) => (
                  <MenuItem key={i} value={nome}>{nome}</MenuItem>
                ))}
              </Select>
            </FormControl>
            {/* 🟢 SELEÇÃO DE ALVO (apenas modo ação normal) */}
{acaoModo === "acao" && (
  <FormControl fullWidth size="small">
    <InputLabel sx={{ color: '#94a3b8' }}>🎯 Alvo (opcional)</InputLabel>
    <Select
      value={acaoAlvo}
      onChange={(e) => setAcaoAlvo(e.target.value)}
      sx={{ color: '#fff', bgcolor: '#1a1a2e' }}
    >
      <MenuItem value="">Nenhum (ação livre)</MenuItem>
      {Object.entries(fichasMap)
        .filter(([email]) => email !== userEmail) // exclui a si mesmo
        .map(([email, data]) => (
          <MenuItem key={email} value={email}>
            {data.nome || email}
          </MenuItem>
        ))}
    </Select>
  </FormControl>
)}

{/* 🟢 TIPO DE AÇÃO (CHECKBOX) */}
{acaoModo === "acao" && (
  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
    <FormControlLabel
      control={
        <Checkbox
          checked={acaoTipo === "dano"}
          onChange={() => setAcaoTipo(acaoTipo === "dano" ? "" : "dano")}
          sx={{ color: '#ef4444' }}
        />
      }
      label="☠️ Dano"
      sx={{ color: '#fff' }}
    />
  </Box>
)}

{/* 🟢 TIPO DE REAÇÃO (apenas modo reação) */}
{acaoModo === "reacao" && (
  <Box sx={{ p: 2, bgcolor: '#1a1a2e', borderRadius: 1, border: '1px solid #ef4444' }}>
    <Typography variant="subtitle2" sx={{ color: '#ef4444', mb: 1 }}>
      ⚠️ Você está sob ataque! Escolha sua reação:
    </Typography>
    <Box sx={{ display: 'flex', gap: 2 }}>
      <FormControlLabel
        control={
          <Checkbox
            checked={acaoTipo === "esquiva"}
            onChange={() => setAcaoTipo(acaoTipo === "esquiva" ? "" : "esquiva")}
            sx={{ color: '#4caf50' }}
          />
        }
        label="🛡️ Esquiva"
        sx={{ color: '#fff' }}
      />
      <FormControlLabel
        control={
          <Checkbox
            checked={acaoTipo === "contragolpe"}
            onChange={() => setAcaoTipo(acaoTipo === "contragolpe" ? "" : "contragolpe")}
            sx={{ color: '#ff9800' }}
          />
        }
        label="⚔️ Contragolpe"
        sx={{ color: '#fff' }}
      />
    </Box>
  </Box>
)}
            
            {/* Casting */}
            <TextField
              label="Casting (turnos carregados)"
              type="number"
              size="small"
              value={acaoCasting}
              onChange={(e) => setAcaoCasting(Math.max(0, Number(e.target.value) || 0))}
              InputProps={{ inputProps: { min: 0 }, sx: { color: '#fff' } }}
              sx={{ bgcolor: '#1a1a2e', '& .MuiInputLabel-root': { color: '#94a3b8' } }}
              helperText="Cada turno = +1d10"
              FormHelperTextProps={{ sx: { color: '#64748b' } }}
            />
            
            {/* Embuição */}
            <TextField
              label={`Embuição (${energiaAtual} PE disponíveis)`}
              type="number"
              size="small"
              value={acaoEmbuicao}
              onChange={(e) => {
                const val = Number(e.target.value) || 0;
                const maxEmbuicao = Math.floor(energiaAtual / 5);
                if (val <= maxEmbuicao) {
                  setAcaoEmbuicao(val);
                }
              }}
              InputProps={{ 
                inputProps: { min: 0, max: Math.floor(energiaAtual / 5) }, 
                sx: { color: '#fff' } 
              }}
              sx={{ bgcolor: '#1a1a2e', '& .MuiInputLabel-root': { color: '#94a3b8' } }}
              helperText={`Cada ponto = +1d10 (custa 5 PE) | Máximo: ${Math.floor(energiaAtual / 5)}`}
              FormHelperTextProps={{ sx: { color: '#64748b' } }}
            />
            
                        {/* 🟢 HABILIDADE (SUBSTITUI VARIÁVEL DE HABILIDADE) */}
            <FormControl fullWidth size="small">
              <InputLabel sx={{ color: '#94a3b8' }}>Habilidade</InputLabel>
              <Select
                value={acaoHabilidadeSelecionada}
                onChange={(e) => {
                  const nomeHabilidade = e.target.value;
                  setAcaoHabilidadeSelecionada(nomeHabilidade);
                  
                  // Busca o dado da habilidade selecionada
                  if (nomeHabilidade && fichaJogador?.habilidades) {
                    const hab = fichaJogador.habilidades.find(h => h.nome === nomeHabilidade);
                    setAcaoHabilidadeDado(hab?.dado || 0);
                  } else {
                    setAcaoHabilidadeDado(0);
                  }
                }}
                sx={{ color: '#fff', bgcolor: '#1a1a2e' }}
              >
                <MenuItem value="">Nenhuma</MenuItem>
                {fichaJogador?.habilidades?.map((hab, i) => (
                  <MenuItem key={i} value={hab.nome} disabled={!hab.nome}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ color: '#fff' }}>
                        {hab.nome || `Habilidade ${i + 1}`}
                      </Typography>
                      <Chip 
                        label={`d${hab.dado || 1}`} 
                        size="small" 
                        sx={{ 
                          bgcolor: '#1e3a5f', 
                          color: '#00e0ff',
                          fontSize: '0.7rem',
                          height: 20,
                        }} 
                      />
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {acaoHabilidadeSelecionada && (
              <Typography variant="caption" sx={{ color: '#00e0ff' }}>
                ⚡ Dado da habilidade: <strong>+{acaoHabilidadeDado}d10</strong>
              </Typography>
            )}
            
            {/* Resumo */}
            {fichaJogador && (
              <Paper sx={{ p: 2, bgcolor: '#16213e', border: '1px solid #334155' }}>
                <Typography variant="subtitle2" sx={{ color: '#00e0ff', mb: 1 }}>
                  📊 Resumo da Rolagem
                </Typography>
                <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                                    Total de d10: <strong style={{ color: '#fff' }}>
                    {(acaoAtributo && fichaJogador?.atributos?.[acaoAtributo] || 0) + 
                     (acaoPericia && fichaJogador?.pericias?.[acaoPericia] || 0) +
(acaoPericia2 && fichaJogador?.pericias?.[acaoPericia2] || 0) +
                     acaoItemDado + acaoCasting + acaoEmbuicao + acaoHabilidadeDado}
                  </strong>
                </Typography>
                {acaoEmbuicao > 0 && (
                  <Typography variant="caption" sx={{ color: '#facc15' }}>
                    ⚡ Custo de Energia: {acaoEmbuicao * 5} PE
                  </Typography>
                )}
              </Paper>
            )}
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ p: 2, borderTop: '1px solid #334155' }}>
          <Button onClick={() => setAcaoOpen(false)} sx={{ color: '#94a3b8' }}>
            Cancelar
          </Button>
          <Button 
  variant="contained"
  onClick={rolarAcao}
  disabled={rolagemEmAndamento}
  sx={{ bgcolor: '#9c27b0', '&:hover': { bgcolor: '#7b1fa2' } }}
>
  {rolagemEmAndamento ? '🔄 Rolando...' : '⚔️ Rolar Ação'}
</Button>
        </DialogActions>
      </Dialog>
      {/* 🟢 MODAL GALERIA DE IMAGENS */}
            {/* 🟢 MODAL GALERIA DE IMAGENS */}
      <Dialog 
        open={galeriaOpen} 
        onClose={() => setGaleriaOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: 2,
            minHeight: "70vh"
          }
        }}
      >
        <DialogTitle sx={{ color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <span style={{ fontSize: '1.5rem' }}>🖼️</span>
            Galeria de Imagens do Chat
          </Box>
          <IconButton onClick={() => setGaleriaOpen(false)} sx={{ color: '#94a3b8' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent>
          {galeriaImagens.filter(img => !imagensOcultas.includes(img.url)).length === 0 ? (
            <Typography sx={{ color: '#94a3b8', textAlign: 'center', mt: 4 }}>
              Nenhuma imagem disponível na galeria.
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center' }}>
              {galeriaImagens
                .filter(img => !imagensOcultas.includes(img.url))
                .map((img, index) => (
                <Box
                  key={index}
                  sx={{
                    position: 'relative',
                    width: 150,
                    height: 150,
                    cursor: 'pointer',
                    borderRadius: 2,
                    overflow: 'hidden',
                    border: '2px solid #334155',
                    '&:hover': {
                      border: '2px solid #9c27b0',
                      transform: 'scale(1.05)',
                      transition: 'all 0.2s',
                      zIndex: 1
                    }
                  }}
                  onClick={() => {
                    setLightboxImage(img.url);
                    setZoom(1);
                    setGaleriaOpen(false);
                  }}
                >
                  <img
                    src={img.url}
                    alt={`Imagem ${index + 1}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      bgcolor: 'rgba(0,0,0,0.7)',
                      p: 0.5,
                    }}
                  >
                    <Typography variant="caption" sx={{ color: '#fff', fontSize: '0.65rem' }}>
                      {img.userNick}
                    </Typography>
                  </Box>
                  
                  {/* 🟢 BOTÃO OCULTAR (SÓ MESTRE) */}
                  {isMaster && (
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        ocultarImagemGaleria(img.url);
                      }}
                      sx={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        bgcolor: 'rgba(0,0,0,0.7)',
                        color: '#ef4444',
                        width: 24,
                        height: 24,
                        '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.5)' }
                      }}
                      title="Ocultar da galeria"
                    >
                      <CloseIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  )}
                  
                  {/* 🟢 TAG GIF (se for GIF) */}
                  {img.isGif && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 4,
                        left: 4,
                        bgcolor: 'rgba(0,0,0,0.7)',
                        px: 0.5,
                        borderRadius: 1,
                      }}
                    >
                      <Typography variant="caption" sx={{ color: '#00e0ff', fontSize: '0.6rem' }}>
                        GIF
                      </Typography>
                    </Box>
                  )}
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ p: 2, borderTop: '1px solid #334155' }}>
          <Typography variant="caption" sx={{ color: '#64748b', flex: 1 }}>
            {galeriaImagens.filter(img => !imagensOcultas.includes(img.url)).length} imagem(ns) • Clique para ampliar
            {imagensOcultas.length > 0 && ` (${imagensOcultas.length} ocultas)`}
          </Typography>
          {isMaster && imagensOcultas.length > 0 && (
            <Button 
              size="small" 
              onClick={() => {
                setImagensOcultas([]);
                localStorage.removeItem('galeria_ocultas');
              }}
              sx={{ color: '#ff9800', mr: 1 }}
            >
              🔄 Mostrar todas
            </Button>
          )}
          <Button onClick={() => setGaleriaOpen(false)} sx={{ color: '#94a3b8' }}>
            Fechar
          </Button>
        </DialogActions>
      </Dialog>
            
      {/* 🟢 SOBREPOSIÇÃO DO DADO DE MORTE */}
      {modoMorte && (
        <Box
          onClick={(e) => e.stopPropagation()}
          sx={{
            position: 'fixed',
            inset: 0,
            bgcolor: 'rgba(0, 0, 0, 0.9)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'default',
          }}
        >
          <Box
            sx={{
              textAlign: 'center',
              p: 4,
              borderRadius: 4,
              bgcolor: '#0a0a0a',
              border: '3px solid #ef4444',
              maxWidth: 400,
              width: '90%',
            }}
          >
            <Typography variant="h4" sx={{ mb: 2 }}>
              💀
            </Typography>
            <Typography variant="h5" sx={{ color: '#ef4444', fontWeight: 'bold', mb: 3 }}>
              DADO DE MORTE
            </Typography>
            
            {rolagemMorteIndex === -1 && dadosMorte.length === 0 && (
              <Button
                variant="contained"
                onClick={rolarDadoMorte}
                sx={{
                  bgcolor: '#000',
                  color: '#ef4444',
                  border: '2px solid #ef4444',
                  fontSize: '1.2rem',
                  fontWeight: 'bold',
                  px: 4,
                  py: 1.5,
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: '#1a0000',
                    border: '2px solid #ff0000',
                  },
                }}
              >
                💀 ROLAR DADO DE MORTE 💀
              </Button>
            )}
            
            {dadosMorte.map((dado, idx) => (
              <Box key={idx} sx={{ mb: 2 }}>
                <Typography variant="h3" sx={{ 
                  color: dado.valor >= 6 ? '#4caf50' : '#ef4444',
                  fontWeight: 'bold'
                }}>
                  {dado.valor}
                </Typography>
                <Typography variant="body1" sx={{ 
                  color: dado.valor >= 6 ? '#4caf50' : '#ef4444'
                }}>
                  {dado.resultado}
                </Typography>
              </Box>
            ))}
            
            {resultadoMorte && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h4" sx={{
                  color: resultadoMorte === 'sobreviveu' ? '#4caf50' : '#ef4444',
                  fontWeight: 'bold',
                  mb: 1
                }}>
                  {resultadoMorte === 'sobreviveu' ? '💚 SOBREVIVEU!' : '💀 MORREU!'}
                </Typography>
              </Box>
            )}
            
            <Typography variant="caption" sx={{ color: '#666', mt: 2, display: 'block' }}>
              {dadosMorte.length}/3 dados rolados
            </Typography>
          </Box>
        </Box>
      )}
    </Paper>
  );
}