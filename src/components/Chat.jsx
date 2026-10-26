// src/components/Chat.jsx
import React, { useEffect, useRef, useState, memo, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Box,
  Button,
  IconButton,
  InputAdornment,
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
  Slider,
  Tooltip,
} from "@mui/material";
import ImageIcon from "@mui/icons-material/Image";
import GifBoxIcon from "@mui/icons-material/GifBox";
import SendIcon from "@mui/icons-material/Send";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import CloseIcon from "@mui/icons-material/Close";
import { db } from "../firebaseConfig";
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, getDoc, doc, setDoc, where, limit, startAfter, getDocs } from "firebase/firestore";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { updateDoc, deleteDoc } from "firebase/firestore";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";

const GIPHY_API_KEY = "PBsoFISvy4OFVTNfZbpB5yF79ODJyTsc";

// 🟢 FUNÇÃO QUE TRANSFORMA TEXTO EM CORES NO CHAT
const renderCombatText = (text) => {
  if (!text) return "";
  let safe = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  // Substitui quebras de linha reais por <br>
  safe = safe.replace(/\n/g, "<br/>");
  // Converte as tags [C:#cor]texto[/C] em HTML
  safe = safe.replace(/\[C:(#[a-fA-F0-9]{3,6})\](.*?)\[\/C\]/g, '<span style="color: $1; font-weight: bold;">$2</span>');
  return safe;
};

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
// 🟢 COMPONENTE DE MENSAGEM MEMOIZADO (evita re-render desnecessário)
const MessageItem = memo(({ 
  m, 
  prev, 
  avatars, 
  userEmail, 
  isMaster, 
  canEdit, 
  canDelete, 
  editMessage, 
  deleteMessage,
  setLightboxImage,
  setZoom,
  getDisplayNick,
  getAvatar,
  masterNameStyle,
  getInitials,
  updateDoc,
  doc,
  db
}) => {
  const showDivider = !prev || prev.userEmail !== m.userEmail;
  const dataHora = m.timestamp?.toDate ? m.timestamp.toDate() : null;
  const horaFormatada = dataHora
    ? `${dataHora.toLocaleDateString("pt-BR")} ${dataHora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
    : "";

  return (
    <React.Fragment>
      {showDivider && <Divider sx={{ my: 0.5, opacity: 0.3 }} />}
      <ListItem
        alignItems="flex-start"
        sx={{
          flexDirection: m.userEmail === userEmail ? "row-reverse" : "row",
          px: 0,
          py: 0.25,
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
            maxWidth: "80%",
            bgcolor: ["acao", "dice", "dice_morte", "dice_morte_result"].includes(m.type) 
              ? (m.userEmail === userEmail ? "rgba(156, 39, 176, 0.15)" : "rgba(0, 224, 255, 0.08)") // Fundo diferente para Ações/Dados
              : (m.userEmail === userEmail ? "rgba(30, 58, 95, 0.8)" : "rgba(42, 42, 42, 0.8)"), // Fundo padrão
            border: ["acao", "dice", "dice_morte", "dice_morte_result"].includes(m.type)
              ? `1px solid ${m.userEmail === userEmail ? "rgba(156, 39, 176, 0.5)" : "rgba(0, 224, 255, 0.4)"}`
              : "1px solid rgba(255, 255, 255, 0.05)",
            backdropFilter: "blur(10px)",
            borderRadius: 3,
            p: 2,
            boxShadow: ["acao", "dice"].includes(m.type) ? "0 4px 15px rgba(0,0,0,0.4)" : 1,
            wordBreak: "break-word",
            contentVisibility: 'auto',
            containIntrinsicSize: 'auto 100px',
            transition: 'all 0.2s ease',
            '&:hover': {
              boxShadow: ["acao", "dice"].includes(m.type) 
                ? `0 0 15px ${m.userEmail === userEmail ? "rgba(156, 39, 176, 0.3)" : "rgba(0, 224, 255, 0.3)"}`
                : '0 4px 12px rgba(0,0,0,0.5)',
              transform: 'translateY(-2px)'
            }
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
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
              loading="lazy"
              decoding="async"
              style={{ maxWidth: "100%", borderRadius: 8, cursor: "pointer" }}
              onClick={() => { setLightboxImage(m.text); setZoom(1); }}
            />
          )}

          {m.type === "image-group" && (
            <>
              {m.text && <Typography sx={{ mb: 0.5, whiteSpace: 'pre-line' }}>{m.text}</Typography>}
              {m.images?.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  loading="lazy"
                  decoding="async"
                  style={{ maxWidth: "100%", display: "block", marginTop: 6, borderRadius: 8, cursor: "pointer" }}
                  onClick={() => { setLightboxImage(img); setZoom(1); }}
                />
              ))}
            </>
          )}

          {m.type === "gif" && (
            <img
              src={m.text}
              loading="lazy"
              decoding="async"
              style={{ maxWidth: "100%", borderRadius: 8, cursor: "pointer" }}
              onClick={() => { setLightboxImage(m.text); setZoom(1); }}
            />
          )}

          {m.type === "video" && (
            <video controls src={m.text} preload="none" style={{ maxWidth: "100%", borderRadius: 8 }} />
          )}

          {m.type === "youtube" && (
            <iframe
              width="100%"
              height="135"
              src={m.text.replace("watch?v=", "embed/")}
              frameBorder="0"
              allowFullScreen
              loading="lazy"
              style={{ borderRadius: 8 }}
            />
          )}

          {m.type === "link" && (
            <a href={m.text} target="_blank" rel="noreferrer">{m.text}</a>
          )}

          {m.type === "dice" && (
            <Box>
              <Typography color="primary" sx={{ fontWeight: "bold" }}>
                {!isMaster && m.secretText ? m.secretText : m.text}
              </Typography>
              {isMaster && m.secretText && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                  <Typography variant="caption" sx={{ color: '#ef4444', fontSize: '0.65rem' }}>🔒 SECRETO</Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={async () => {
                      await updateDoc(doc(db, "chat", m.id), { secretText: null, revealed: true });
                    }}
                    sx={{ fontSize: '0.6rem', minWidth: 'auto', px: 0.5, py: 0.2, color: '#4caf50', borderColor: '#4caf50' }}
                  >
                    👁️ Revelar
                  </Button>
                </Box>
              )}
              {m.revealed && (
                <Typography variant="caption" sx={{ color: '#4caf50', display: 'block', mt: 0.5 }}>✅ Revelado pelo Mestre</Typography>
              )}
            </Box>
          )}

          {m.type === "dice_morte" && (
            <Box>
              {isMaster ? (
                <Typography sx={{ color: '#ef4444', fontWeight: 'bold' }}>{m.text}</Typography>
              ) : (
                <Typography sx={{ color: '#666', fontStyle: 'italic' }}>💀 Dado de Morte rolado...</Typography>
              )}
            </Box>
          )}

          {m.type === "dice_morte_result" && (
            <Typography sx={{ color: '#ef4444', fontWeight: 'bold', whiteSpace: 'pre-line' }}>{m.text}</Typography>
          )}

          {m.type === "acao" && (
            <Box>
              <Typography sx={{ 
                color: m.text?.includes('Furtividade') || m.text?.includes('furtividade') ? '#3b82f6' : '#00bcd4', 
                whiteSpace: 'pre-line', 
                fontWeight: 'bold' 
              }}>
                {!isMaster && m.secretText ? m.secretText : m.text}
              </Typography>

              {isMaster && m.secretText && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                  <Typography variant="caption" sx={{ color: '#ef4444', fontSize: '0.65rem' }}>🔒 SECRETO</Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={async () => {
                      await updateDoc(doc(db, "chat", m.id), { secretText: null, revealed: true });
                    }}
                    sx={{ fontSize: '0.6rem', minWidth: 'auto', px: 0.5, py: 0.2, color: '#4caf50', borderColor: '#4caf50' }}
                  >
                    👁️ Revelar
                  </Button>
                </Box>
              )}
              {m.revealed && (
                <Typography variant="caption" sx={{ color: '#4caf50', display: 'block', mt: 0.5 }}>✅ Revelado pelo Mestre</Typography>
              )}
            </Box>
          )}

          {m.type === "evento" && (
            <Box sx={{ bgcolor: '#1e1a3e', border: '1px solid #ec4899', borderRadius: 2, p: 1.5, animation: 'pulse 2s infinite' }}>
              <Typography sx={{ color: '#ec4899', whiteSpace: 'pre-line', fontWeight: 'bold', fontStyle: 'italic' }}>
                {m.text}
              </Typography>
            </Box>
          )}

          {m.type === "text" && (
            <Typography sx={{ whiteSpace: 'pre-line' }}>
              {m.text}
              {m.edited && (
                <Typography component="span" sx={{ ml: 0.5, fontSize: "0.7rem", opacity: 0.6 }}>(editado)</Typography>
              )}
            </Typography>
          )}

          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 0.5 }}>
            <Typography variant="caption" sx={{ opacity: 0.6, fontSize: "0.7rem" }}>{horaFormatada}</Typography>
          </Box>
        </Box>
      </ListItem>
    </React.Fragment>
  );
});

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
    @keyframes pulseGreen {
      0% { box-shadow: 0 0 5px #4caf50; }
      50% { box-shadow: 0 0 20px #4caf50, 0 0 30px #4caf50; }
      100% { box-shadow: 0 0 5px #4caf50; }
    }
    @keyframes slideInLeft {
      from { opacity: 0; transform: translateY(20px) scale(0.9); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes slideInRight {
      from { opacity: 0; transform: translateY(20px) scale(0.9); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes typingBounce {
      0%, 80%, 100% { transform: translateY(0); }
      40% { transform: translateY(-5px); }
    }
    @keyframes floatUp {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes glowConjunto {
      0%, 100% { box-shadow: 0 0 20px rgba(76,175,80,0.35), inset 0 0 30px rgba(76,175,80,0.08); }
      50% { box-shadow: 0 0 30px rgba(76,175,80,0.6), inset 0 0 40px rgba(76,175,80,0.15); }
    }
  `;
  document.head.appendChild(styleSheet);
}

const ORDEM_ATRIBUTOS = ["forca", "destreza", "agilidade", "constituicao", "inteligencia", "vontade"];
const ORDEM_PERICIAS = ["atletismo", "luta", "armaBranca", "armaDistancia", "furtividade", "sobrevivencia", "conhecimento", "medicina", "natureza", "percepcao", "investigacao", "labia", "performance", "intimidacao", "aura"];

// 🟢 FUNÇÃO PARA DEIXAR OS NOMES COM MAIÚSCULA E ACENTO
const formatarNome = (nome) => {
  const mapa = {
    forca: "Força", destreza: "Destreza", agilidade: "Agilidade", constituicao: "Constituição", inteligencia: "Inteligência", vontade: "Vontade",
    atletismo: "Atletismo", luta: "Luta", armaBranca: "Arma Branca", armaDistancia: "Arma à Distância", furtividade: "Furtividade",
    sobrevivencia: "Sobrevivência", conhecimento: "Conhecimento", medicina: "Medicina", natureza: "Natureza", percepcao: "Percepção",
    investigacao: "Investigação", labia: "Lábia", performance: "Performance", intimidacao: "Intimidação", aura: "Aura"
  };
  return mapa[nome] || (nome ? nome.charAt(0).toUpperCase() + nome.slice(1) : nome);
};

const CORES_ATRIBUTOS = {
  forca: "#ef4444", destreza: "#22c55e", agilidade: "#3b82f6",
  constituicao: "#f97316", inteligencia: "#e5e5e5", vontade: "#facc15",
};

const CORES_PERICIA = {
  atletismo: "#ef4444", luta: "#ef4444", armaBranca: "#ef4444",
  armaDistancia: "#22c55e", furtividade: "#3b82f6", sobrevivencia: "#f97316",
  conhecimento: "#e5e5e5", medicina: "#e5e5e5", natureza: "#e5e5e5",
  percepcao: "#e5e5e5", investigacao: "#e5e5e5", labia: "#e5e5e5",
  performance: "#e5e5e5", intimidacao: "#facc15", aura: "#facc15",
};

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
// 🟢 CUSTO DE PE DA HABILIDADE
const [acaoHabilidadeCustoPE, setAcaoHabilidadeCustoPE] = useState(0);
// 🟢 DEBUFFS (múltiplos valores para subtrair do dado final)
const [acaoDebuffs, setAcaoDebuffs] = useState([]);
// 🟢 VALOR MÍNIMO DE SUCESSO (VD - Valor de Dificuldade)
const [acaoValorDificuldade, setAcaoValorDificuldade] = useState("");
// 🟢 BÔNUS VARIÁVEL (valor positivo adicionado ao resultado)
const [acaoBonusVariavel, setAcaoBonusVariavel] = useState(0);
const [acaoBonusVariavelLista, setAcaoBonusVariavelLista] = useState([]);
// 🟢 TALENTO PÓS-CHOQUE
const [posChoquePendente, setPosChoquePendente] = useState(null);
const [posChoqueOpen, setPosChoqueOpen] = useState(false);
const [posChoqueRolls, setPosChoqueRolls] = useState([]);
const [posChoqueTotal, setPosChoqueTotal] = useState(0);
// 🟢 CONSUMÍVEL
const [acaoItemConsumivel, setAcaoItemConsumivel] = useState(false); // É consumível?
const [acaoConsumivelTipo, setAcaoConsumivelTipo] = useState(""); // PV, PE, RE
const [acaoConsumivelValor, setAcaoConsumivelValor] = useState(0); // Valor máximo
const [acaoConsumivelPercentual, setAcaoConsumivelPercentual] = useState(100); // % a usar
// 🟢 ESTADOS DO SISTEMA DE COMBATE
const [acaoModo, setAcaoModo] = useState("acao"); // "acao" = normal, "reacao" = respondendo ataque
// 🟢 JOGADA EM CONJUNTO
const [jogadoresConjunto, setJogadoresConjunto] = useState([]);
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
const [deathSegundaChanceAtiva, setDeathSegundaChanceAtiva] = useState(false);

// 🟢 DADO SECRETO
const [modoSecreto, setModoSecreto] = useState(false);
const [travaSessao, setTravaSessao] = useState({
  travados: { chat: false, grid: false, cassino: false, rede: false, roleta: false, eventos: false, comercio: false },
  sessaoAtiva: false,
  sessaoTitulo: "",
  sessaoInicio: null,
  historico: [],
});
const [sessaoDialogOpen, setSessaoDialogOpen] = useState(false);
const [tempoDecorrido, setTempoDecorrido] = useState("00:00:00");
const [tituloSessaoTemp, setTituloSessaoTemp] = useState("");

const chatTravado = !!travaSessao?.travados?.chat;
// 🟢 OTIMIZAÇÃO: SCROLL INFINITO COM PAGINAÇÃO NO FIRESTORE
// 🟢 PRESENÇA ONLINE
const [onlinePlayers, setOnlinePlayers] = useState([]);
const [typingUsers, setTypingUsers] = useState([]);
const [todasMensagens, setTodasMensagens] = useState([]); // Todas as mensagens carregadas
const [quantidadeMensagens, setQuantidadeMensagens] = useState(50); // Começa com 50
const [carregandoAntigas, setCarregandoAntigas] = useState(false);
const [ultimoDocumento, setUltimoDocumento] = useState(null); // Para paginação
const [temMaisMensagens, setTemMaisMensagens] = useState(true); // Se há mais no Firestore
const [carregamentoInicial, setCarregamentoInicial] = useState(true); // Primeira carga

// 🟢 HEARTBEAT: registra presença a cada 20s
useEffect(() => {
  if (!userEmail) return;
  const ref = doc(db, "online", userEmail);

  const updateHeartbeat = async () => {
    try {
      await setDoc(ref, {
        email: userEmail,
        nickname: userNick || userEmail,
        lastSeen: Date.now(),
        isMaster: userEmail === "mestre@reqviemrpg.com",
      }, { merge: true });
    } catch {}
  };

  updateHeartbeat();
  const interval = setInterval(updateHeartbeat, 20000);

  const handleUnload = () => {
    setDoc(ref, { lastSeen: 0 }, { merge: true }).catch(() => {});
  };
  window.addEventListener("beforeunload", handleUnload);

  return () => {
    clearInterval(interval);
    window.removeEventListener("beforeunload", handleUnload);
  };
}, [userEmail, userNick]);

// 🟢 LISTENER: quem está online (lastSeen < 90s)
useEffect(() => {
  const col = collection(db, "online");
  const unsub = onSnapshot(col, (snap) => {
    const agora = Date.now();
    const LIMITE = 90000;
    const lista = [];
    snap.forEach((docSnap) => {
      const d = docSnap.data() || {};
      if (d.lastSeen && agora - d.lastSeen < LIMITE) {
        lista.push({
          email: docSnap.id,
          nickname: d.nickname || docSnap.id,
          isMaster: !!d.isMaster,
        });
      }
    });
    setOnlinePlayers(lista);
  }, (err) => console.warn("online listener:", err));
  return () => unsub();
}, []);

// 🟢 LISTENER: quem está digitando
useEffect(() => {
  const unsub = onSnapshot(collection(db, "typing"), (snap) => {
    const agora = Date.now();
    const lista = [];
    snap.forEach((docSnap) => {
      const d = docSnap.data() || {};
      // Se digitou nos últimos 3 segundos e não é eu mesmo
      if (d.lastTyping && (agora - d.lastTyping < 3000) && docSnap.id !== userEmail) {
        lista.push({ email: docSnap.id, nickname: d.nickname });
      }
    });
    setTypingUsers(lista);
  }, (err) => console.warn("typing listener:", err));
  return () => unsub();
}, [userEmail]);

useEffect(() => {
  const ref = doc(db, "game", "travaSessao");
  const unsub = onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      const d = snap.data() || {};
      const base = { chat: false, grid: false, cassino: false, rede: false, roleta: false, eventos: false, comercio: false };
      setTravaSessao({
        travados: { ...base, ...(d.travados || {}) },
        sessaoAtiva: d.sessaoAtiva || false,
        sessaoTitulo: d.sessaoTitulo || "",
        sessaoInicio: d.sessaoInicio || null,
        historico: Array.isArray(d.historico) ? d.historico : [],
      });
      setTituloSessaoTemp((prev) => (prev ? prev : (d.sessaoTitulo || "")));
    } else {
      const inicial = {
        travados: { chat: false, grid: false, cassino: false, rede: false, roleta: false, eventos: false, comercio: false },
        sessaoAtiva: false,
        sessaoTitulo: "",
        sessaoInicio: null,
        historico: [],
      };
      setTravaSessao(inicial);
      setDoc(ref, inicial, { merge: true }).catch(() => {});
    }
  });
  return () => unsub();
}, []);

useEffect(() => {
  if (!travaSessao.sessaoAtiva || !travaSessao.sessaoInicio) {
    setTempoDecorrido("00:00:00");
    return;
  }
  const tick = () => {
    const inicio = new Date(travaSessao.sessaoInicio).getTime();
    const diff = Math.max(0, Math.floor((Date.now() - inicio) / 1000));
    const h = String(Math.floor(diff / 3600)).padStart(2, "0");
    const m = String(Math.floor((diff % 3600) / 60)).padStart(2, "0");
    const s = String(diff % 60).padStart(2, "0");
    setTempoDecorrido(`${h}:${m}:${s}`);
  };
  tick();
  const i = setInterval(tick, 1000);
  return () => clearInterval(i);
}, [travaSessao.sessaoAtiva, travaSessao.sessaoInicio]);

const toggleTravaModulo = async (modulo) => {
  if (!isMaster) return;
  const novosTravados = { ...travaSessao.travados, [modulo]: !travaSessao.travados[modulo] };
  setTravaSessao((prev) => ({ ...prev, travados: novosTravados }));
  await setDoc(doc(db, "game", "travaSessao"), { travados: novosTravados }, { merge: true });
};

const iniciarSessao = async () => {
  if (!isMaster) return;
  const titulo = (tituloSessaoTemp || "").trim() || `Sessão de ${new Date().toLocaleDateString("pt-BR")}`;
  const inicio = new Date().toISOString();
  const travados = { chat: false, grid: false, cassino: false, rede: false, roleta: false, eventos: false, comercio: false };
  setTravaSessao((prev) => ({ ...prev, travados, sessaoAtiva: true, sessaoTitulo: titulo, sessaoInicio: inicio }));
  await setDoc(doc(db, "game", "travaSessao"), { travados, sessaoAtiva: true, sessaoTitulo: titulo, sessaoInicio: inicio }, { merge: true });
  await addDoc(chatCol, {
    userNick: "SISTEMA",
    userEmail: "sistema@reqviemrpg.com",
    type: "sistema",
    text: `🎬 SESSÃO INICIADA: ${titulo}\nBom jogo a todos!`,
    timestamp: serverTimestamp(),
  });
};

const encerrarSessao = async () => {
  if (!isMaster) return;
  const inicio = travaSessao.sessaoInicio;
  const fim = new Date().toISOString();
  let duracaoSegundos = 0;
  if (inicio) duracaoSegundos = Math.max(0, Math.floor((new Date(fim).getTime() - new Date(inicio).getTime()) / 1000));
  const h = String(Math.floor(duracaoSegundos / 3600)).padStart(2, "0");
  const m = String(Math.floor((duracaoSegundos % 3600) / 60)).padStart(2, "0");
  const s = String(duracaoSegundos % 60).padStart(2, "0");
  const registro = {
    titulo: travaSessao.sessaoTitulo || "Sessão sem título",
    inicio,
    fim,
    duracao: `${h}:${m}:${s}`,
    duracaoSegundos,
  };
  const novoHistorico = [registro, ...(travaSessao.historico || [])].slice(0, 50);
  const travados = { chat: true, grid: true, cassino: true, rede: true, roleta: true, eventos: true, comercio: true };
  setTravaSessao((prev) => ({ ...prev, travados, sessaoAtiva: false, sessaoTitulo: "", sessaoInicio: null, historico: novoHistorico }));
  await setDoc(doc(db, "game", "travaSessao"), { travados, sessaoAtiva: false, sessaoTitulo: "", sessaoInicio: null, historico: novoHistorico }, { merge: true });
  await addDoc(chatCol, {
    userNick: "SISTEMA",
    userEmail: "sistema@reqviemrpg.com",
    type: "sistema",
    text: `⏹️ SESSÃO ENCERRADA: ${registro.titulo}\nDuração: ${registro.duracao}`,
    timestamp: serverTimestamp(),
  });
};

const apagarRegistroSessao = async (index) => {
  if (!isMaster) return;
  if (!window.confirm("Apagar este registro?")) return;
  const novoHistorico = travaSessao.historico.filter((_, i) => i !== index);
  setTravaSessao((prev) => ({ ...prev, historico: novoHistorico }));
  await setDoc(doc(db, "game", "travaSessao"), { historico: novoHistorico }, { merge: true });
};
// 🟢 EFEITOS DE TIPO DE DANO - CONFORME DOCUMENTO
const EFEITOS_DANO = {
  "Ácido":       { ignoraArmadura: 1.0,  desc: "🧪 Ácido: Ignora 100% da armadura!" },
  "Contundente": { chanceSoltar: 0.5,    desc: "💥 Contundente: 50% chance de soltar item" },
  "Cortante":    { ignoraArmadura: 0.5, armaduraMax: 25, desc: "🔪 Cortante: Ignora 50% armadura (≤25)" },
  "Elétrico":    { chanceParalisia: 0.25, duracao: 1, desc: "⚡ Elétrico: 25% paralisia" },
  "Digital":     { chanceCorromper: 0.5,  duracao: 1, desc: "🔌 Digital: 50% corromper equipamento" },
  "Aurano":      { bonusDano: 0.5,        desc: "✨ Aurano: +50% de dano" },
  "Gélido":      { chanceNecrose: 0.05,   desc: "❄️ Gélido: 5% chance de necrose" },
  "Térmico":     { reducaoCura: 0.5, duracao: 1, desc: "🔥 Térmico: -50% cura por 1 turno" },
  "Perfurante":  { ignoraArmadura: 0.5, armaduraMin: 26, desc: "🏹 Perfurante: Ignora 50% armadura (≥26)" },
  "Psíquico":    { chancePerderAura: 0.10, duracao: 1, desc: "🧠 Psíquico: 10% perder Aura" },
  "Trovejante":  { chanceDesorientar: 0.5, duracao: 1, desc: "💥 Trovejante: 50% desorientar (G.O)" },
  "Tóxico":      { danoPorTurno: 5, duracao: 10, desc: "☠️ Tóxico: -5 PV/turno por 10 turnos" },
};

// 🟢 EFEITOS ATIVOS PERSISTENTES - CONFORME DOCUMENTO
const EFEITOS_ATIVOS_MAP = {
  "Elétrico":   { tipo: "Paralisado",   icone: "⚡",  cor: "#facc15", descricao: "Local paralisado por 1 turno",     duracao: 1,  chance: 0.25 },
  "Digital":    { tipo: "Corrompido",   icone: "🔌",  cor: "#00ff41", descricao: "Equipamento corrompido",          duracao: 1,  chance: 0.50 },
  "Gélido":     { tipo: "Necrosado",    icone: "❄️",  cor: "#87ceeb", descricao: "Necrose - requer tratamento",     duracao: 999, chance: 0.05, permanente: true },
  "Térmico":    { tipo: "Queimado",     icone: "🔥",  cor: "#ff4500", descricao: "-50% cura por 1 turno",           duracao: 1 },
  "Psíquico":   { tipo: "SemAura",      icone: "🧠",  cor: "#ff69b4", descricao: "Perdeu conexão com Aura",         duracao: 1,  chance: 0.10 },
  "Trovejante": { tipo: "Desorientado", icone: "💥",  cor: "#4169e1", descricao: "Perde turno + oponente tem G.O",   duracao: 1,  chance: 0.50 },
  "Tóxico":     { tipo: "Envenenado",   icone: "☠️",  cor: "#8b008b", descricao: "-5 PV por turno",                duracao: 10 },
};

// 🟢 ESTADO PARA TOXINAS ATIVAS
const [toxinasAtivas, setToxinasAtivas] = useState({});
// 🟢 CORES DE AURA
const CORES_AURA_CHAT = {
  "Titã": "#ff3b3b",
  "Alquimista": "#00e0ff",
  "Artesão": "#ffd700",
  "Fundador": "#00ff88",
  "Déspota": "#a855f7",
  "Ás": "#e5e5e5",
};

// (CORES_ATRIBUTOS já definido no topo do arquivo)

// Normaliza acentos (força → forca)
const getCorAtributo = (nome) => {
  const n = (nome || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return CORES_ATRIBUTOS[n] || "#94a3b8";
};

  const openDiceMenu = Boolean(diceAnchor);

  const chatRef = useRef(null);
  const endRef = useRef(null);
  const chatCol = collection(db, "chat");

    const isMaster = userEmail === "mestre@reqviemrpg.com";
  
  // 🟢 EXPOR FICHAS MAP PARA O SOCIALBAR
  useEffect(() => {
    if (Object.keys(fichasMap).length > 0) {
      window.__fichasMapSocial = fichasMap;
      // Dispara evento para o Home saber que atualizou
      window.dispatchEvent(new CustomEvent('fichasMapUpdated', { detail: fichasMap }));
    }
  }, [fichasMap]);
  
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
    // 🟢 NORMALIZA atributos para >= 1 (fichas antigas podem ter 0)
    const atributosNorm = dados.atributos
      ? Object.fromEntries(
          Object.entries(dados.atributos).map(([k, v]) => {
            const num = Number(v);
            return [k, Number.isFinite(num) && num >= 1 ? num : 1];
          })
        )
      : {};
    setFichaJogador({ ...dados, atributos: atributosNorm });
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
    // 🟢 OTIMIZAÇÃO: Carrega apenas as 50 mensagens mais recentes
    const q = query(chatCol, orderBy("timestamp", "desc"), limit(50));
    
    const unsub = onSnapshot(q, async (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      // Inverte para ordem cronológica (mais antiga primeiro)
      const mensagensOrdenadas = data.reverse();
      
      setTodasMensagens(mensagensOrdenadas);
      setMessages(mensagensOrdenadas);
      
      // Guarda o documento mais antigo para paginação
      if (snap.docs.length > 0) {
        setUltimoDocumento(snap.docs[snap.docs.length - 1]);
      }
      
      // Se veio menos que 50, não tem mais mensagens antigas
      if (snap.docs.length < 50) {
        setTemMaisMensagens(false);
      }

      const uniqueUsers = [...new Set(mensagensOrdenadas.map((m) => m.userEmail).filter(Boolean))];
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

      // Marca que o carregamento inicial terminou
      setCarregamentoInicial(false);
      
      // Scroll para o final após carregar
      setTimeout(() => {
        endRef.current?.scrollIntoView({ behavior: "auto" });
      }, 100);

      const container = chatRef.current;
      if (container) {
        const distance = container.scrollHeight - container.scrollTop - container.clientHeight;
        const atBottom = distance < 80;
        const lastMsg = mensagensOrdenadas[mensagensOrdenadas.length - 1];
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
    let scrollTimeout = null;
    
    const handleScroll = () => {
      // 🟢 THROTTLE: Executa no máximo a cada 100ms
      if (scrollTimeout) return;
      
      scrollTimeout = setTimeout(() => {
        scrollTimeout = null;
        
        const distance = container.scrollHeight - container.scrollTop - container.clientHeight;
        const atBottom = distance < 80;
        
        // 🟢 SCROLL INFINITO: Quando chega no TOPO, carrega mais antigas do Firestore
        if (container.scrollTop < 50 && !carregandoAntigas && temMaisMensagens) {
          carregarMensagensAntigas();
        }
        
        if (atBottom) {
          setAutoScroll(true);
          setShowScrollButton(false);
          setUnreadCount(0);
        } else {
          setAutoScroll(false);
          setShowScrollButton(true);
        }
      }, 100);
    };
    
    container.addEventListener("scroll", handleScroll);
    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (scrollTimeout) clearTimeout(scrollTimeout);
    };
  }, [carregandoAntigas, temMaisMensagens]);

  // 🟢 FUNÇÃO PARA CARREGAR MENSAGENS ANTIGAS DO FIRESTORE
  const carregarMensagensAntigas = async () => {
    if (carregandoAntigas || !temMaisMensagens || !ultimoDocumento) return;
    
    setCarregandoAntigas(true);
    const container = chatRef.current;
    const alturaAntiga = container?.scrollHeight || 0;
    
    try {
      // Busca as próximas 50 mensagens mais antigas
      const q = query(
        chatCol,
        orderBy("timestamp", "desc"),
        startAfter(ultimoDocumento),
        limit(50)
      );
      
      const snap = await getDocs(q);
      
      if (snap.docs.length > 0) {
        const mensagensAntigas = snap.docs.map((d) => ({ id: d.id, ...d.data() })).reverse();
        
        // Adiciona as mensagens antigas ao início
        const novasTodasMensagens = [...mensagensAntigas, ...todasMensagens];
        setTodasMensagens(novasTodasMensagens);
        
        // Atualiza quantidade para mostrar mais
        setQuantidadeMensagens(prev => prev + mensagensAntigas.length);
        setMessages(novasTodasMensagens.slice(-quantidadeMensagens - mensagensAntigas.length));
        
        // Atualiza o último documento para próxima paginação
        setUltimoDocumento(snap.docs[snap.docs.length - 1]);
        
        // Se veio menos que 50, não tem mais mensagens
        if (snap.docs.length < 50) {
          setTemMaisMensagens(false);
        }
        
        // Mantém a posição do scroll
        setTimeout(() => {
          requestAnimationFrame(() => {
            if (container) {
              const alturaNova = container.scrollHeight;
              container.scrollTop = alturaNova - alturaAntiga;
            }
          });
        }, 100);
      } else {
        setTemMaisMensagens(false);
      }
    } catch (err) {
      console.error("Erro ao carregar mensagens antigas:", err);
    }
    
    setCarregandoAntigas(false);
  };

  useEffect(() => {
    const handlePaste = async (e) => {
      if (!e.clipboardData) return;
      const items = e.clipboardData.items;
      for (let item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            const url = await uploadImagemFullQuality(file);
            if (url) setFilePreviews((prev) => [...prev, url]);
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
// 🟢 OUVIR EVENTO DO GERADOR DE EVENTOS ALEATÓRIOS
useEffect(() => {
  const handleEventoChat = async (e) => {
    const { texto, personagem, userEmail: emailEvento, userNick: nickEvento } = e.detail;
    
    await addDoc(chatCol, {
      userNick: nickEvento || personagem || userNick,
      userEmail: emailEvento || userEmail,
      type: "evento",
      text: texto,
      timestamp: serverTimestamp(),
    });
  };
  
  window.addEventListener('enviarEventoChat', handleEventoChat);
  return () => window.removeEventListener('enviarEventoChat', handleEventoChat);
}, [userNick, userEmail, chatCol]);

// 🟢 OUVIR AÇÕES PENDENTES (contra o jogador selecionado ou logado)
// Reações expiram automaticamente em 1 hora
useEffect(() => {
  const emailAlvo = isMaster ? jogadorSelecionadoEmail : userEmail;
  
  if (!emailAlvo || emailAlvo === "mestre@reqviemrpg.com") {
    setAcoesPendentes([]);
    return;
  }
  
  // 🟢 Normaliza o timestamp (Timestamp do Firestore / {seconds} / number / ausente)
  const pegarTimestampMs = (item) => {
    if (item?.timestamp?.toMillis) return item.timestamp.toMillis();
    if (item?.timestamp?.seconds) return item.timestamp.seconds * 1000;
    if (typeof item?.timestamp === "number") return item.timestamp;
    return Date.now(); // se não tem timestamp, considera recém-criada (evita apagar por engano)
  };
  
  // 🟢 Separa válidas x expiradas, apaga as expiradas do Firestore
  const processarLista = (lista) => {
    const agora = Date.now();
    const validas = [];
    const expiradas = [];
    
    lista.forEach(item => {
      const idade = agora - pegarTimestampMs(item);
      if (idade > TEMPO_EXPIRACAO_REACAO_MS) {
        expiradas.push(item.id);
      } else {
        validas.push(item);
      }
    });
    
    // Apaga as expiradas no Firestore (silencioso)
    expiradas.forEach(id => {
      deleteDoc(doc(db, "acoesPendentes", id)).catch(() => {});
    });
    
    return validas;
  };
  
  const q = query(
    collection(db, "acoesPendentes"),
    where("alvo", "==", emailAlvo),
    where("resolvida", "==", false)
  );
  
  const unsub = onSnapshot(q, (snap) => {
    const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const validas = processarLista(lista);
    
    setAcoesPendentes(validas);
    
    if (validas.length > 0) {
      setAcaoModo("reacao");
      setAcaoPendenteId(validas[0].id);
    } else {
      // 🟢 Volta ao normal quando não tem mais nada pendente
      setAcaoModo("acao");
      setAcaoPendenteId(null);
    }
  });
  
  // 🟢 Verificação periódica (a cada 60s) — expira mesmo se o Firestore não emitir mudança
  const interval = setInterval(() => {
    setAcoesPendentes(prev => {
      const validas = processarLista(prev);
      // Se zerou depois de ter algo, volta ao normal
      if (prev.length > 0 && validas.length === 0) {
        setTimeout(() => {
          setAcaoModo("acao");
          setAcaoPendenteId(null);
        }, 0);
      }
      return validas.length === prev.length ? prev : validas;
    });
  }, 60000);
  
  return () => {
    unsub();
    clearInterval(interval);
  };
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

    // 🟢 Verifica se está em modo secreto (mestre ativou para todos)
  const isDadoSecreto = modoSecreto; // Afeta TODOS os jogadores
  
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
      window.dispatchEvent(new CustomEvent('desbloquearConquista', { detail: { conquistaId: 'sobrevivente_morte' } }));
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
    setDeathSegundaChanceAtiva(false);
  } else {
    mensagemResultado = `💀 **${nomePersonagem} MORREU!**\n` +
      `Sucessos: ${sucessos.length} | Fracassos: ${fracassos.length}\n` +
      `Dados: [${[...sucessos, ...fracassos].join(", ")}]`;
    
    if (fichaJogador?.tracos?.includes("Atleta") && !deathSegundaChanceAtiva) {
        setDeathSegundaChanceAtiva(true);
        mensagemResultado += `\n\n🏃‍♂️ **SEGUNDA-CHANCE (Traço Atleta):** Você pode rolar novamente!`;
    } else {
        await setDoc(doc(db, "fichas", jogadorSelecionadoEmail), { pontosVida: 0 }, { merge: true });
        setDeathSegundaChanceAtiva(false);
    }
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

  // 🟢 UPLOAD DE ALTA QUALIDADE PRO IMGBB (preserva qualidade original)
  async function uploadImagemFullQuality(file) {
    const IMGBB_API_KEY = "73fcf242ce0108665fa0c9e9de33bd50";
    const fd = new FormData();
    fd.append("image", file);
    try {
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (data?.success && data.data?.url) return data.data.url;
      throw new Error("Falha no upload");
    } catch (err) {
      console.error("Erro no upload:", err);
      // Fallback: comprime local e retorna base64 se ImgBB falhar
      return new Promise((resolve) => {
        const img = new Image();
        const reader = new FileReader();
        reader.onload = (e) => (img.src = e.target.result);
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let { width, height } = img;
          const maxSize = 1920;
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
          resolve(canvas.toDataURL("image/jpeg", 0.92));
        };
        reader.readAsDataURL(file);
      });
    }
  }

  async function handleFiles(files) {
    // Upload em paralelo, full quality
    const urls = await Promise.all(
      [...files].map((f) => uploadImagemFullQuality(f))
    );
    setFilePreviews((p) => [...p, ...urls.filter(Boolean)]);
  }

  async function sendMessage(e) {
  e?.preventDefault();
  if (!text && !filePreview && filePreviews.length === 0) return;
  setLastSender(userEmail);
  
  // Remove o status de digitando
  deleteDoc(doc(db, "typing", userEmail)).catch(() => {});
    // 🟢 BLOQUEAR ENVIO SE CHAT TRAVADO (jogadores)
  if (chatTravado && !isMaster) {
    alert("🔒 O chat está travado pelo Mestre. Aguarde a sessão começar!");
    return;
  }

    const dice = tryParseDice(text);
  if (dice) {
        const isDadoSecreto = modoSecreto; // Afeta TODOS os jogadores
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
    text: text,
    timestamp: serverTimestamp() 
  });
  
  // 🟢 CONTADOR DE MENSAGENS PARA CONQUISTAS
  const contadorMsgs = Number(localStorage.getItem(`msgs_${userEmail}`) || 0) + 1;
  localStorage.setItem(`msgs_${userEmail}`, contadorMsgs);
  
  if (contadorMsgs >= 100) {
    window.dispatchEvent(new CustomEvent('desbloquearConquista', { detail: { conquistaId: 'mensagens' } }));
  }
  if (contadorMsgs >= 1000) {
    window.dispatchEvent(new CustomEvent('desbloquearConquista', { detail: { conquistaId: 'falador' } }));
  }
  
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
const carregarGaleria = async () => {
  const mapaImagens = new Map();

  const normalizarUrl = (url) => {
    try {
      const u = new URL(url);
      return u.origin + u.pathname; 
    } catch {
      return url.split('?')[0]; 
    }
  };

  try {
    // 🟢 Busca TODAS as mensagens do banco de dados para não perder as antigas
    const snap = await getDocs(query(collection(db, "chat")));
    const allMessages = snap.docs.map(d => d.data());

    allMessages.forEach(msg => {
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
  } catch (err) {
    console.error("Erro ao carregar galeria:", err);
  }
  
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

// 🟢 ROLAR AÇÃO EM CONJUNTO (soma os valores de todos os participantes)
async function rolarAcaoConjunta() {
  if (rolagemEmAndamento) return;
  setRolagemEmAndamento(true);

  try {
    const participantes = [
      { email: jogadorSelecionadoEmail, ficha: fichaJogador, isPrincipal: true },
      ...jogadoresConjunto.map((email) => ({ email, ficha: fichasMap[email], isPrincipal: false })),
    ].filter((p) => p.ficha);

    if (participantes.length === 0) {
      alert("Nenhum participante válido.");
      setRolagemEmAndamento(false);
      return;
    }

    const resultados = [];

    for (const p of participantes) {
      let totalD10 = 0;
      const descParts = [];

      if (acaoAtributo && p.ficha?.atributos?.[acaoAtributo] !== undefined) {
        const v = Math.max(1, Number(p.ficha.atributos[acaoAtributo]) || 1);
        totalD10 += v;
        descParts.push(`${acaoAtributo}(${v})`);
      }
      if (acaoPericia && p.ficha?.pericias?.[acaoPericia]) {
        const v = Number(p.ficha.pericias[acaoPericia]) || 0;
        totalD10 += v;
        descParts.push(`${acaoPericia}(${v})`);
      }
      if (acaoPericia2 && p.ficha?.pericias?.[acaoPericia2]) {
        const v = Number(p.ficha.pericias[acaoPericia2]) || 0;
        totalD10 += v;
        descParts.push(`${acaoPericia2}(${v})`);
      }
      if (acaoItemDado) totalD10 += acaoItemDado;
      if (acaoCasting) totalD10 += acaoCasting;
      if (acaoEmbuicao) totalD10 += acaoEmbuicao;
      if (acaoHabilidadeDado) totalD10 += acaoHabilidadeDado;

      // Roll
      const fatorSorte = sorteAzarMap[p.email];
      const rolls = [];
      let soma = 0;
      for (let i = 0; i < totalD10; i++) {
        let valor;
        if (fatorSorte !== undefined) {
          valor = Math.random() < (fatorSorte / 10) ? Math.floor(Math.random() * 5) + 6 : Math.floor(Math.random() * 5) + 1;
        } else {
          valor = Math.floor(Math.random() * 10) + 1;
        }
        rolls.push(valor);
        soma += valor;
      }

      // Debuffs e bônus
      const totalDebuff = acaoDebuffs.reduce((s, d) => s + d.valor, 0);
      const totalBonus = acaoBonusVariavelLista.reduce((s, b) => s + b.valor, 0);
      soma = Math.max(0, soma - totalDebuff) + totalBonus;

      // Crítico por jogador
      const temDez = rolls.some((r) => r === 10);
      const temUm = rolls.some((r) => r === 1);
      const todosPos = rolls.length > 0 && rolls.every((r) => r >= 6);
      const todosNeg = rolls.length > 0 && rolls.every((r) => r <= 5);
      const isCrit = temDez && todosPos;
      const isErro = temUm && todosNeg;

      resultados.push({
        email: p.email,
        nome: p.ficha.nome || p.email,
        totalD10,
        rolls,
        total: soma,
        descricao: descParts.join(" + "),
        isCrit,
        isErro,
      });
    }

    const somaTotal = resultados.reduce((s, r) => s + r.total, 0);
    const nomePrincipal = fichaJogador?.nome || userNick;

    let mensagem = `${montarCaixa("🎭 AÇÃO EM CONJUNTO 🎭", 37)}\n\n`;
    mensagem += `👥 ${resultados.length} participante(s)\n\n`;

    for (const r of resultados) {
      mensagem += `🎲 ${r.nome}: ${r.totalD10}d10 => [${r.rolls.join(", ")}] = ${r.total}`;
      if (r.descricao) mensagem += `\n   📋 ${r.descricao}`;
      if (r.isCrit) mensagem += ` 🌟 CRÍTICO!`;
      if (r.isErro) mensagem += ` 💥 ERRO CRÍTICO!`;
      mensagem += `\n\n`;
    }

    mensagem += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    mensagem += `🎯 TOTAL COMBINADO: ${somaTotal}\n`;

    if (acaoValorDificuldade) {
      const vd = Number(acaoValorDificuldade);
      mensagem += `\n${somaTotal >= vd ? '✅ SUCESSO!' : '❌ FRACASSO!'} (VMS ${vd})`;
    }

    if (acaoAlvo) {
      mensagem += `\n\n🎯 Alvo: ${fichasMap[acaoAlvo]?.nome || acaoAlvo}`;
    }

    // 🟢 SE TEM ALVO + DANO, CRIA AÇÃO PENDENTE (mesma lógica da individual)
    if (acaoModo === "acao" && acaoAlvo && acaoTipo === "dano") {
      let tipoDanoAcao = "Nenhum";
      if (acaoHabilidadeSelecionada && fichaJogador?.habilidades) {
        const hab = fichaJogador.habilidades.find(h => h.nome === acaoHabilidadeSelecionada);
        if (hab?.tipoDano && hab.tipoDano !== "Nenhum") tipoDanoAcao = hab.tipoDano;
      }
      if (tipoDanoAcao === "Nenhum" && acaoItem) {
        const todosItens = [
          ...(fichaJogador?.equipamentos || []),
          ...(fichaJogador?.vestes || []),
          ...(fichaJogador?.diversos || [])
        ];
        const itemEncontrado = todosItens.find(it => it.nome === acaoItem);
        if (itemEncontrado?.tipoDano && itemEncontrado.tipoDano !== "Nenhum") tipoDanoAcao = itemEncontrado.tipoDano;
      }

      const pendenteRef = doc(collection(db, "acoesPendentes"));
      await setDoc(pendenteRef, {
        atacante: jogadorSelecionadoEmail,
        alvo: acaoAlvo,
        tipo: "dano",
        valorAtaque: somaTotal,
        dadosRolados: resultados.flatMap(r => r.rolls),
        itemUsado: acaoItem || null,
        habilidadeUsada: acaoHabilidadeSelecionada || null,
        tipoDanoAtaque: tipoDanoAcao,
        isCritico: resultados.some(r => r.isCrit),
        isErroCritico: resultados.every(r => r.isErro),
        ignorarArmaduraDemolidor: false,
        conjunto: true,
        participantes: resultados.map(r => r.email),
        timestamp: serverTimestamp(),
        resolvida: false,
      });
      mensagem += `\n\n⚠️ Aguardando reação do alvo...`;
    }

    const isDadoSecreto = modoSecreto;
    await addDoc(chatCol, {
      userNick: nomePrincipal,
      userEmail: jogadorSelecionadoEmail,
      type: "acao",
      text: isDadoSecreto
        ? mensagem.replace(/\[[\d,\s]+\]/g, '[***]').replace(/\*\*\d+\*\*/g, '***')
        : mensagem,
      dadosRolados: resultados.flatMap((r) => r.rolls),
      secretRolls: isDadoSecreto ? resultados.flatMap((r) => r.rolls) : null,
      secretText: isDadoSecreto
        ? mensagem.replace(/\[[\d,\s]+\]/g, '[***]').replace(/\*\*\d+\*\*/g, '***')
        : null,
      timestamp: serverTimestamp(),
    });

    // XP pra cada participante (não-mestre)
    for (const r of resultados) {
      if (r.email !== "mestre@reqviemrpg.com") {
        await adicionarXpAcao(r.email, 1);
      }
    }

    setAcaoOpen(false);
    setJogadoresConjunto([]);
  } catch (err) {
    console.error("Erro na ação conjunta:", err);
    alert("Erro: " + err.message);
  } finally {
    setRolagemEmAndamento(false);
  }
}

async function rolarAcao() {
  if (rolagemEmAndamento) return;
  
  // 🟢 Se está reagindo, verifica se a ação ainda existe (pode ter expirado)
  if (acaoModo === "reacao" && acaoPendenteId) {
    const snapPendente = await getDoc(doc(db, "acoesPendentes", acaoPendenteId));
    if (!snapPendente.exists()) {
      alert("⚠️ Esta reação expirou (mais de 1h) ou já foi resolvida. Voltando ao normal.");
      setAcaoModo("acao");
      setAcaoPendenteId(null);
      setAcaoOpen(false);
      setRolagemEmAndamento(false);
      return;
    }
  }
  
    // 🟢 Só atributo é obrigatório (ou perícia)
  if (!acaoAtributo && !acaoPericia && !acaoItemConsumivel) {
    alert("Selecione pelo menos um Atributo ou uma Perícia!");
    return;
  }
  
     // 🟢 Consumível sozinho é permitido (sem atributo/perícia)
    
    // 🟢 NOVA LÓGICA: VMS só é obrigatório se NÃO tiver alvo, dano, furtividade ou for reação
    const requiresVMS = acaoModo !== "reacao" && !acaoAlvo && acaoTipo !== "dano" && acaoTipo !== "furtividade";
    if (requiresVMS && !acaoValorDificuldade) {
      alert("Preencha o VMS (Valor Mínimo de Sucesso)!");
      return;
    }

  // 🟢 Só valida se NÃO for consumível (consumível não precisa de tipo de dano)
  if (acaoModo === "acao" && acaoAlvo && !acaoTipo && !acaoItemConsumivel) {
    alert("Selecione o tipo: ☠️ Dano");
    return;
  }
  
  if (acaoModo === "reacao" && !acaoTipo) {
    alert("Selecione: 🛡️ Esquiva ou ⚔️ Contragolpe");
    return;
  }
  
    setRolagemEmAndamento(true);
    
    // 🟢 CONSUMO DE FOME E SEDE POR AÇÃO
    try {
      const refConsumo = doc(db, "fichas", jogadorSelecionadoEmail);
      const snapConsumo = await getDoc(refConsumo);
      if (snapConsumo.exists()) {
        const dadosConsumo = snapConsumo.data();
        const fomeAtual = dadosConsumo.fome ?? 100;
        const sedeAtual = dadosConsumo.sede ?? 100;
        // Ação gasta 1% de fome e 2% de sede
        await setDoc(refConsumo, {
          fome: Math.max(0, fomeAtual - 5),
          sede: Math.max(0, sedeAtual - 8)
        }, { merge: true });
      }
    } catch (err) { console.error("Erro ao consumir fome/sede", err); }
    
    // 🟢 CHECAR E APLICAR EFEITOS ATIVOS
    const temEfeitos = fichaJogador?.efeitosAtivos || [];
    let penalidadeDados = 0;
    let bloquearAcao = false;
    let msgEfeitos = "";

    temEfeitos.forEach(ef => {
      if (ef.tipo === "Paralisado") { bloquearAcao = true; msgEfeitos += `⚡ Você está PARALISADO e não pode agir!\n`; }
      if (ef.tipo === "Desorientado" || ef.tipo === "Atordoado") { penalidadeDados += 2; msgEfeitos += `📢 Você está ${ef.tipo} (-2 dados)!\n`; }
      if (ef.tipo === "Confusão") { penalidadeDados += 1; msgEfeitos += `🧠 Você está Confuso (-1 dado)!\n`; }
    });

    if (bloquearAcao) {
      alert(msgEfeitos);
      setRolagemEmAndamento(false);
      return;
    }

    if (penalidadeDados > 0) {
      alert(msgEfeitos + `\nSua rolagem terá uma penalidade de ${penalidadeDados} dados.`);
    }

    // 🟢 DECREMENTAR TURNOS DOS EFEITOS E SALVAR NA FICHA
    if (temEfeitos.length > 0) {
      const novosEfeitos = temEfeitos.map(ef => ({ ...ef, turnosRestantes: ef.turnosRestantes - 1 })).filter(ef => ef.turnosRestantes > 0);
      await setDoc(doc(db, "fichas", jogadorSelecionadoEmail), { efeitosAtivos: novosEfeitos }, { merge: true });
    }

        // 🟢 TALENTO REGENERAÇÃO: +5 PV
    const temRegeneracao = fichaJogador?.caracteristicas?.includes("Regeneração") || false;
    const temSobrecarga = fichaJogador?.caracteristicas?.includes("Sobrecarga") || false;
    
    if (temRegeneracao && pvAtual > 5) {
      const novoPV = Math.min(pvAtual + 5, 100 + ((Number(fichaJogador?.atributos?.constituicao) || 0) + (Number(fichaJogador?.pericias?.sobrevivencia) || 0)) * 10);
      await setDoc(doc(db, "fichas", jogadorSelecionadoEmail), { pontosVida: novoPV }, { merge: true });
      await addDoc(chatCol, {
        userNick: "SISTEMA",
        userEmail: "sistema@reqviemrpg.com",
        type: "acao",
        text: `💚 **Regeneração:** ${nomePersonagem} recuperou 5 PV!`,
        timestamp: serverTimestamp(),
      });
    }
    
    if (temSobrecarga && energiaAtual > 5) {
      const novoPE = Math.min(energiaAtual + 2, 10 + ((Number(fichaJogador?.atributos?.vontade) || 0) + (Number(fichaJogador?.pericias?.aura) || 0)) * 5);
      await setDoc(doc(db, "fichas", jogadorSelecionadoEmail), { pontosEnergia: novoPE }, { merge: true });
      await addDoc(chatCol, {
        userNick: "SISTEMA",
        userEmail: "sistema@reqviemrpg.com",
        type: "acao",
        text: `⚡ **Sobrecarga:** ${nomePersonagem} recuperou 2 PE!`,
        timestamp: serverTimestamp(),
      });
    }
  // 🟢 FUNÇÃO PARA SEGUNDA ROLAGEM DO PÓS-CHOQUE
const rolarPosChoque = () => {
  if (!posChoquePendente) return;
  
  const fatorSorte = sorteAzarMap[userEmail];
  const rolls = [];
  let total = 0;
  
  for (let i = 0; i < posChoquePendente.totalD10; i++) {
    let valor;
    if (fatorSorte !== undefined) {
      valor = Math.random() < (fatorSorte / 10) ? Math.floor(Math.random() * 5) + 6 : Math.floor(Math.random() * 5) + 1;
    } else {
      valor = Math.floor(Math.random() * 10) + 1;
    }
    rolls.push(valor);
    total += valor;
  }
  
  setPosChoqueRolls(rolls);
  setPosChoqueTotal(total);
};

const confirmarPosChoque = async () => {
  if (!posChoquePendente) return;
  
  const totalFinal = posChoquePendente.total + posChoqueTotal;
  const mensagemFinal = posChoquePendente.mensagem + 
    `\n\n⚡ **PÓS-CHOQUE:** Segunda rolagem! [${posChoqueRolls.join(", ")}] = ${posChoqueTotal}` +
    `\n\n🎯 **DANO TOTAL:** ${posChoquePendente.total} + ${posChoqueTotal} = **${totalFinal}**`;
  
  // Envia mensagem com o total combinado
  const isDadoSecreto = modoSecreto;
  await addDoc(chatCol, {
    userNick: posChoquePendente.nomePersonagem,
    userEmail: jogadorSelecionadoEmail,
    type: "acao",
    text: isDadoSecreto ? mensagemFinal.replace(/\[[\d,\s]+\]/g, '[***]').replace(/\*\*\d+\*\*/g, '***') : mensagemFinal,
    dadosRolados: [...posChoquePendente.rolls, ...posChoqueRolls],
    secretRolls: isDadoSecreto ? [...posChoquePendente.rolls, ...posChoqueRolls] : null,
    secretText: isDadoSecreto ? mensagemFinal.replace(/\[[\d,\s]+\]/g, '[***]').replace(/\*\*\d+\*\*/g, '***') : null,
    timestamp: serverTimestamp(),
  });
  
  // Adiciona XP
  await adicionarXpAcao(jogadorSelecionadoEmail, 2);
  
  setPosChoquePendente(null);
  setPosChoqueOpen(false);
  setPosChoqueRolls([]);
  setPosChoqueTotal(0);
};
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
  
  // 🟢 Se tiver jogadores em conjunto, vai pra função própria
  if (jogadoresConjunto.length > 0) {
    return await rolarAcaoConjunta();
  }

  try {
    let totalD10 = 0;
    let descricao = [];
    if (typeof penalidadeDados !== 'undefined' && penalidadeDados > 0) {
      totalD10 -= penalidadeDados; // Aplica a penalidade
      descricao.push(`Penalidade de Efeitos: -${penalidadeDados} dados`);
    }
    let custoTotalEnergia = 0;
    
if (acaoAtributo && fichaJogador?.atributos?.[acaoAtributo] !== undefined) {
  const valor = Math.max(1, Number(fichaJogador.atributos[acaoAtributo]) || 1);
  totalD10 += valor;
  descricao.push(`Atributo: ${formatarNome(acaoAtributo)} (${valor})`); // 🟢 NOME BONITO
}
    
    if (acaoPericia && fichaJogador?.pericias?.[acaoPericia]) {
      const valor = fichaJogador.pericias[acaoPericia];
      totalD10 += valor;
      descricao.push(`Perícia: ${formatarNome(acaoPericia)} (${valor})`); // 🟢 NOME BONITO
      if (acaoPericia === "aura") custoTotalEnergia += 1;
    }

    if (acaoPericia2 && fichaJogador?.pericias?.[acaoPericia2]) {
      const valor2 = fichaJogador.pericias[acaoPericia2];
      totalD10 += valor2;
      descricao.push(`2ª Perícia: ${formatarNome(acaoPericia2)} (${valor2})`); // 🟢 NOME BONITO
      if (acaoPericia2 === "aura") custoTotalEnergia += 1;
    }
    
        // 🟢 ITEM - VALIDAR DURABILIDADE
            // 🟢 ITEM - VALIDAR DURABILIDADE (OU CONSUMÍVEL)
    if (acaoItem) {
      const todosItens = [
        ...(fichaJogador?.equipamentos || []),
        ...(fichaJogador?.vestes || []),
        ...(fichaJogador?.diversos || [])
      ];
      const itemEncontrado = todosItens.find(it => it.nome === acaoItem);
      
      // 🟢 Se for consumível, não adiciona dado
      if (acaoItemConsumivel) {
        descricao.push(`🧪 Consumível: ${acaoItem} (${acaoConsumivelPercentual}%)`);
      } else {
        // Item normal - verifica durabilidade
        if (itemEncontrado && (itemEncontrado.durabilidade || 100) <= 1) {
          alert(`⚠️ O item "${acaoItem}" está muito danificado e não pode ser usado!`);
          setRolagemEmAndamento(false);
          return;
        }
        totalD10 += acaoItemDado;
        descricao.push(`Item: ${acaoItem} (${acaoItemDado})`);
        await desgastarItem(jogadorSelecionadoEmail, acaoItem, 1);
      }
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
  custoTotalEnergia += acaoHabilidadeCustoPE;
  if (acaoHabilidadeCustoPE > 0) {
    descricao.push(`Custo Habilidade: ${acaoHabilidadeCustoPE} PE`);
  }
  
  // 🟢 DAR XP PARA A HABILIDADE USADA
  const habIndex = fichaJogador?.habilidades?.findIndex(h => h.nome === acaoHabilidadeSelecionada);
  if (habIndex !== undefined && habIndex >= 0) {
    await adicionarXpHabilidade(jogadorSelecionadoEmail, habIndex);
  }
}
    
    if (custoTotalEnergia > energiaAtual) {
      alert(`Energia insuficiente! Necessário: ${custoTotalEnergia} PE | Disponível: ${energiaAtual} PE`);
      setRolagemEmAndamento(false);
      return;
    }
    
    const novaEnergia = energiaAtual - custoTotalEnergia;
    setEnergiaAtual(novaEnergia);
    await setDoc(doc(db, "fichas", jogadorSelecionadoEmail), { pontosEnergia: novaEnergia }, { merge: true });
    
    let numGolpes = 1;
    let nomeTracoGolpe = "";
    const todosItens = [
        ...(fichaJogador?.equipamentos || []),
        ...(fichaJogador?.vestes || []),
        ...(fichaJogador?.diversos || [])
    ];
    const itemEncontradoGolpe = todosItens.find(it => it.nome === acaoItem);

    if (fichaJogador?.tracos?.includes("Lutador") && acaoPericia === "luta" && !acaoItem && !acaoHabilidadeSelecionada) {
        numGolpes = 2; nomeTracoGolpe = "Brigão";
    } else if (fichaJogador?.tracos?.includes("Espadachim") && (acaoPericia === "armaBranca" || itemEncontradoGolpe?.tipoDano === "Cortante")) {
        numGolpes = 2; nomeTracoGolpe = "Espadachim";
    } else if (fichaJogador?.tracos?.includes("Atirador") && (acaoPericia === "armaDistancia" || itemEncontradoGolpe?.tipoDano === "Perfurante")) {
        numGolpes = 2; nomeTracoGolpe = "Franco-Atirador";
    }

    if (numGolpes > 1) {
        descricao.push(`⚔️ Golpe Duplo (Traço ${nomeTracoGolpe})`);
    }

    const rolls = [];
    let total = 0;
    const fatorSorte = sorteAzarMap[userEmail];
    for (let g = 0; g < numGolpes; g++) {
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
    }
    
    // 🟢 APLICAR DEBUFFS (subtrai do total)
    const totalDebuff = acaoDebuffs.reduce((soma, d) => soma + d.valor, 0);
    if (totalDebuff > 0) {
      const totalAntes = total;
      total = Math.max(0, total - totalDebuff); // nunca negativo
      descricao.push(`Debuffs: -${totalDebuff} (${totalAntes} → ${total})`);
    }
        // 🟢 APLICAR BÔNUS VARIÁVEL (adiciona ao total)
    const totalBonus = acaoBonusVariavelLista.reduce((soma, b) => soma + b.valor, 0);
    if (totalBonus > 0) {
      const totalAntes = total;
      total += totalBonus;
      descricao.push(`Bônus: +${totalBonus} (${totalAntes} → ${total})`);
    }
    
        const nomePersonagem = fichaJogador?.nome || userNick;
    const partesDescricao = descricao.length > 0 ? descricao.join("; ") : "";
    
    // 🟢 ============= VERIFICAR CRÍTICO E ERRO CRÍTICO =============
    let isCritico = false;
    let isErroCritico = false;
    
    // Só verifica se tiver mais de 1 dado
    if (rolls.length >= 1) {
      const temDez = rolls.some(r => r === 10);  // Pelo menos um 10
      const temUm = rolls.some(r => r === 1);     // Pelo menos um 1
      const todosPositivos = rolls.every(r => r >= 6);  // Todos 6-10
      const todosNegativos = rolls.every(r => r <= 5);  // Todos 1-5
      
      // CRÍTICO: um ou mais 10 E todos os outros são positivos (6-10)
      if (temDez && todosPositivos) {
        isCritico = true;
      }
      
      // ERRO CRÍTICO: um ou mais 1 E todos os outros são negativos (1-5)
      if (temUm && todosNegativos) {
        isErroCritico = true;
      }
    }
    // =============================================================
    
    // 🟢 TALENTO PÓS-CHOQUE: Se crítico e tem o talento, permite rolar novamente
    const temPosChoque = fichaJogador?.caracteristicas?.includes("Pós-Choque") || false;
    if (isCritico && temPosChoque && !acaoPendenteId) {
      // Guarda os dados da rolagem para a segunda rolagem
      const dadosPrimeiraRolagem = {
        rolls,
        total,
        totalD10,
        descricao,
        nomePersonagem,
        tipoDanoMensagem,
        custoTotalEnergia,
        novaEnergia,
        mensagem,
      };
      
      // Abre modal de segunda rolagem
      setPosChoquePendente(dadosPrimeiraRolagem);
      setRolagemEmAndamento(false);
      return;
    }
    
        // 🟢 DETERMINAR TIPO DE DANO PARA A MENSAGEM
    let tipoDanoMensagem = "Nenhum";
    if (acaoHabilidadeSelecionada && fichaJogador?.habilidades) {
      const hab = fichaJogador.habilidades.find(h => h.nome === acaoHabilidadeSelecionada);
      if (hab?.tipoDano && hab.tipoDano !== "Nenhum") tipoDanoMensagem = hab.tipoDano;
    }
    if (tipoDanoMensagem === "Nenhum" && acaoItem) {
      const todosItens = [
        ...(fichaJogador?.equipamentos || []),
        ...(fichaJogador?.vestes || []),
        ...(fichaJogador?.diversos || [])
      ];
      const itemEncontrado = todosItens.find(it => it.nome === acaoItem);
      if (itemEncontrado?.tipoDano && itemEncontrado.tipoDano !== "Nenhum") tipoDanoMensagem = itemEncontrado.tipoDano;
    }
    
        let mensagem = `${montarCaixa("⚔️ AÇÃO DE COMBATE ⚔️", 37)}\n\n🎭 ${nomePersonagem}\n${partesDescricao ? `📋 ${partesDescricao}\n` : ""}\n🎲 DADOS: [${rolls.join(", ")}] = ${total}\n`;
    
    if (isCritico) {
      mensagem += `\n🌟 CRÍTICO!\nDano direto! O valor total ignora a defesa do oponente.`;
    }
    if (isErroCritico) {
      mensagem += `\n💥 ERRO CRÍTICO!\nFracasso total na ação!`;
    }
    
    if (tipoDanoMensagem !== "Nenhum") {
      mensagem += `\n🗡️ Tipo de Dano: ${tipoDanoMensagem}`;
    }
    
    if (custoTotalEnergia > 0) {
      mensagem += `\n⚡ Energia: -${custoTotalEnergia} PE (Restante: ${novaEnergia} PE)`;
    }
    
    if (acaoValorDificuldade) {
      const vd = Number(acaoValorDificuldade);
      if (total >= vd) {
        mensagem += `\n✅ SUCESSO! (Resultado ${total} ≥ VMS ${vd})`;
      } else {
        mensagem += `\n❌ FRACASSO! (Resultado ${total} < VMS ${vd})`;
      }
    }

                if (acaoModo === "acao" && acaoAlvo && acaoTipo === "dano") {
      const pendenteRef = doc(collection(db, "acoesPendentes"));
      
      // 🟢 DETERMINAR TIPO DE DANO
      let tipoDanoAcao = "Nenhum";
      
      // 1. Verifica habilidade primeiro (tem prioridade)
      if (acaoHabilidadeSelecionada && fichaJogador?.habilidades) {
        const hab = fichaJogador.habilidades.find(h => h.nome === acaoHabilidadeSelecionada);
        if (hab?.tipoDano && hab.tipoDano !== "Nenhum") {
          tipoDanoAcao = hab.tipoDano;
        }
      }
      // 🟢 FURTIVIDADE
if (acaoTipo === "furtividade" && acaoAlvo) {
  const fichaAlvo = fichasMap[acaoAlvo];
  const percepcaoAlvo = fichaAlvo?.pericias?.percepcao || 0;
  const inteligenciaAlvo = fichaAlvo?.atributos?.inteligencia || 0;
  let mensagem = `🌫️ Ação de Furtividade\n\n`;
  
  // 🟢 Verifica Terceiro Olho (Traço)
  if (fichaAlvo?.tracos?.includes("Observador")) {
    mensagem += `👁️ ${fichaAlvo?.nome || acaoAlvo} tem **TERCEIRO OLHO** (Traço)!\n`;
    mensagem += `❌ FURTIVIDADE FALHOU! O alvo é imune a golpes de oportunidade.`;
  } else if (percepcaoAlvo < 1) {
    mensagem += `👁️ ${fichaAlvo?.nome || acaoAlvo} NÃO tem Percepção!\n`;
    mensagem += `✅ FURTIVIDADE BEM-SUCEDIDA!\n`;
    mensagem += `🎯 O próximo golpe contra ${fichaAlvo?.nome || acaoAlvo} será CRÍTICO AUTOMÁTICO!`;
    
    // Marca próximo ataque como crítico
    await setDoc(doc(db, "game", "combate"), {
      [`proximoCritico.${userEmail}`]: {
        alvo: acaoAlvo,
        atacante: userEmail,
        timestamp: serverTimestamp(),
      }
    }, { merge: true });
    
} else if (percepcaoAlvo >= 5) {
  // 🟢 Alvo com Percepção nível 5 - atacante NÃO consegue
  mensagem += `👁️ ${fichaAlvo?.nome || acaoAlvo} tem PERCEPÇÃO NÍVEL 5!\n`;
  mensagem += `❌ FALHA! O alvo percebeu sua movimentação!\n`;
  mensagem += `🛡️ Você foi detectado! Nenhum efeito adicional.`;
  
} else {
  // 🟢 Testa contra Percepção do alvo
  const ataqueFurtivo = total;
  const defesaPercepcao = inteligenciaAlvo + percepcaoAlvo;
  
  mensagem += `🎯 Seu resultado: ${ataqueFurtivo}\n`;
  mensagem += `👁️ Percepção do alvo: ${defesaPercepcao}\n\n`;
  
  if (ataqueFurtivo > defesaPercepcao) {
    mensagem += `✅ FURTIVIDADE BEM-SUCEDIDA!\n`;
    mensagem += `🎯 O próximo golpe contra ${fichaAlvo?.nome || acaoAlvo} será CRÍTICO AUTOMÁTICO!`;
    
    await setDoc(doc(db, "game", "combate"), {
      [`proximoCritico.${userEmail}`]: {
        alvo: acaoAlvo,
        atacante: userEmail,
        timestamp: serverTimestamp(),
      }
    }, { merge: true });
    
  } else {
    mensagem += `❌ FURTIVIDADE FALHOU!\n`;
    mensagem += `👁️ O alvo está alerta. Nenhum efeito adicional.`;
  }
}
  
  // Envia mensagem de furtividade
  await addDoc(chatCol, {
    userNick: fichaJogador?.nome || userNick,
    userEmail: jogadorSelecionadoEmail,
    type: "acao",
    text: mensagem,
    timestamp: serverTimestamp(),
  });
  
  setAcaoOpen(false);
  setRolagemEmAndamento(false);
  // ... limpar estados ...
  return;
}
      
      // 2. Se não tem habilidade, verifica item
      if (tipoDanoAcao === "Nenhum" && acaoItem) {
        const todosItens = [
          ...(fichaJogador?.equipamentos || []),
          ...(fichaJogador?.vestes || []),
          ...(fichaJogador?.diversos || [])
        ];
        const itemEncontrado = todosItens.find(it => it.nome === acaoItem);
        if (itemEncontrado?.tipoDano && itemEncontrado.tipoDano !== "Nenhum") {
          tipoDanoAcao = itemEncontrado.tipoDano;
        }
      }
      
        console.log("🗡️ Tipo de Dano da Ação:", tipoDanoAcao, "| Item:", acaoItem, "| Habilidade:", acaoHabilidadeSelecionada);
      
      // 🟢 TALENTO DEMOLIDOR: Luta sem item ignora 50% da armadura
      const temDemolidor = fichaJogador?.caracteristicas?.includes("Demolidor") || false;
      const usaApenasLuta = acaoPericia === "luta" && !acaoItem && !acaoHabilidadeSelecionada;
      const ignorarArmaduraDemolidor = temDemolidor && usaApenasLuta;
      
            await setDoc(pendenteRef, {
        atacante: jogadorSelecionadoEmail,
        alvo: acaoAlvo,
        tipo: "dano",
        valorAtaque: total,
        dadosRolados: rolls,
        itemUsado: acaoItem || null,
        habilidadeUsada: acaoHabilidadeSelecionada || null,
        tipoDanoAtaque: tipoDanoAcao,
        isCritico: isCritico,
        isErroCritico: isErroCritico,
        ignorarArmaduraDemolidor,
        timestamp: serverTimestamp(),
        resolvida: false
      });
      if (ignorarArmaduraDemolidor) {
        mensagem += `\n\n💪 **DEMOLIDOR:** Ignorando 50% da armadura do alvo!`;
      }
      mensagem += `\n\n🎯 Alvo: **${fichasMap[acaoAlvo]?.nome || acaoAlvo}**\n⚠️ Aguardando reação...`;
    }
    // 🟢 SE FOR REAÇÃO: Envia como o personagem que reagiu
    if (acaoModo === "reacao" && acaoPendenteId && acaoTipo) {
      const resultadoCombate = await resolverCombate(acaoPendenteId, acaoTipo, total, rolls);
      
      // 🟢 ADICIONAR XP PARA O DEFENSOR
      let xpDefensor = 1;
      if (resultadoCombate?.isCriticoDefensor) xpDefensor = 2;
      if (resultadoCombate?.isErroCriticoDefensor) xpDefensor = 0;
      await adicionarXpAcao(jogadorSelecionadoEmail, xpDefensor);
      
      setAcaoModo("acao");
      setAcaoPendenteId(null);
      setAcaoOpen(false);
      setRolagemEmAndamento(false);
      return;
    }
    
            // 🟢 SE FOR CONSUMÍVEL, APLICAR EFEITO
    if (acaoItemConsumivel && acaoItem) {
      const valorReal = Math.round(acaoConsumivelValor * acaoConsumivelPercentual / 100);
      const emailAlvo = acaoAlvo || jogadorSelecionadoEmail;
      const ehOutro = acaoAlvo && acaoAlvo !== jogadorSelecionadoEmail;
      
      // Para outro jogador: precisa de 51% do total máximo
      const totalMaximo = totalD10 * 10; // máximo possível
      const percentualAcerto = totalMaximo > 0 ? (total / totalMaximo) * 100 : 0;
      
      if (ehOutro && percentualAcerto < 51) {
        // Falhou em aplicar no outro
        mensagem += `\n\n🧪 **FALHA ao usar ${acaoItem}!** (${Math.round(percentualAcerto)}% < 51% necessário)`;
                const isDadoSecreto = modoSecreto;
        await addDoc(chatCol, {
          userNick: fichaJogador?.nome || userNick,
          userEmail: jogadorSelecionadoEmail,
          type: "acao",
          text: isDadoSecreto ? mensagem.replace(/\[[\d,\s]+\]/g, '[***]').replace(/\*\*\d+\*\*/g, '***') : mensagem,
          dadosRolados: rolls,
          secretRolls: isDadoSecreto ? rolls : null,
          secretText: isDadoSecreto ? mensagem.replace(/\[[\d,\s]+\]/g, '[***]').replace(/\*\*\d+\*\*/g, '***') : null,
          timestamp: serverTimestamp(),
        });
      } else {
        // Sucesso - aplicar efeito
        const refAlvo = doc(db, "fichas", emailAlvo);
        const snapAlvo = await getDoc(refAlvo);
        
        if (snapAlvo.exists()) {
          const fichaAlvo = snapAlvo.data();
          let atualizacoes = {};
          let msgEfeito = "";
          const nomeAlvo = ehOutro ? (fichasMap[emailAlvo]?.nome || emailAlvo) : nomePersonagem;
          
          if (acaoConsumivelTipo === "PV") {
            const pvMax = 100 + (Math.max(1, Number(fichaAlvo.atributos?.constituicao) || 1) + Math.max(0, Number(fichaAlvo.pericias?.sobrevivencia) || 0)) * 10;
            const novoPV = Math.min(pvMax, (fichaAlvo.pontosVida || 0) + valorReal);
            atualizacoes.pontosVida = novoPV;
            msgEfeito = `❤️ +${valorReal} PV → ${nomeAlvo} (${fichaAlvo.pontosVida || 0} → ${novoPV})`;
          } else if (acaoConsumivelTipo === "PE") {
            const peMax = 10 + (Math.max(1, Number(fichaAlvo.atributos?.vontade) || 1) + Math.max(0, Number(fichaAlvo.pericias?.aura) || 0)) * 5;
            const novoPE = Math.min(peMax, (fichaAlvo.pontosEnergia || 0) + valorReal);
            atualizacoes.pontosEnergia = novoPE;
            msgEfeito = `⚡ +${valorReal} PE → ${nomeAlvo} (${fichaAlvo.pontosEnergia || 0} → ${novoPE})`;
          } else if (acaoConsumivelTipo === "RE") {
            msgEfeito = `🔄 Efeito removido de ${nomeAlvo}!`;
          }
          
          await setDoc(refAlvo, atualizacoes, { merge: true });
          
                    // 🟢 CONSUMO REAL DO ITEM BASEADO NA DURABILIDADE
          // A durabilidade do item representa o % restante do item
          // Ex: durabilidade 50% + usar 100% = consome os 50% restantes + 50% do próximo
          
          const categoria = Object.keys(fichaJogador).find(cat => 
            Array.isArray(fichaJogador[cat]) && fichaJogador[cat].some(it => it.nome === acaoItem)
          );
          
          if (categoria) {
            // Pega TODOS os itens com o mesmo nome (podem estar em slots diferentes)
            const itensMismoNome = fichaJogador[categoria]
              .map((it, i) => ({ ...it, __originalIndex: i }))
              .filter(it => it.nome === acaoItem);
            
            let percentualRestanteParaConsumir = acaoConsumivelPercentual;
            const itensAtualizados = [...fichaJogador[categoria]];
            
            for (const itemAtual of itensMismoNome) {
              if (percentualRestanteParaConsumir <= 0) break;
              
              const durabilidadeAtual = itemAtual.durabilidade || 100;
              const idx = itemAtual.__originalIndex;
              
              // Quanto este item ainda tem disponível (%)
              const disponivelNesteItem = durabilidadeAtual;
              
              if (percentualRestanteParaConsumir >= disponivelNesteItem) {
                // Consome TODO este item
                percentualRestanteParaConsumir -= disponivelNesteItem;
                
                // Marca este item como consumido (remove ou zera)
                if (itemAtual.quantidade > 1) {
                  itensAtualizados[idx] = {
                    ...itensAtualizados[idx],
                    quantidade: itemAtual.quantidade - 1,
                    durabilidade: 100 // Reseta durabilidade do próximo
                  };
                } else {
                  itensAtualizados[idx] = null; // Será removido
                }
              } else {
                // Consome PARCIALMENTE este item
                const novaDurabilidade = durabilidadeAtual - percentualRestanteParaConsumir;
                itensAtualizados[idx] = {
                  ...itensAtualizados[idx],
                  durabilidade: Math.max(0, novaDurabilidade)
                };
                percentualRestanteParaConsumir = 0;
              }
            }
            
            // Filtra itens nulos (removidos)
            const novosItens = itensAtualizados.filter(it => it !== null);
            
            // Atualiza no Firestore
            await setDoc(doc(db, "fichas", jogadorSelecionadoEmail), { [categoria]: novosItens }, { merge: true });
            
            // Atualiza localmente também
            setFichaJogador(prev => ({ ...prev, [categoria]: novosItens }));
          }
          
          mensagem += `\n\n🧪 **${acaoItem} usado!** ${msgEfeito}`;
          
                    const isDadoSecreto = modoSecreto;
          await addDoc(chatCol, {
            userNick: fichaJogador?.nome || userNick,
            userEmail: jogadorSelecionadoEmail,
            type: "acao",
            text: isDadoSecreto ? mensagem.replace(/\[[\d,\s]+\]/g, '[***]').replace(/\*\*\d+\*\*/g, '***') : mensagem,
            dadosRolados: rolls,
            secretRolls: isDadoSecreto ? rolls : null,
            secretText: isDadoSecreto ? mensagem.replace(/\[[\d,\s]+\]/g, '[***]').replace(/\*\*\d+\*\*/g, '***') : null,
            timestamp: serverTimestamp(),
          });
        }
      }
    } else {
      // Ação normal (não consumível)
            // 🟢 Verifica modo secreto
      const isDadoSecreto = modoSecreto;
      
      await addDoc(chatCol, {
        userNick: fichaJogador?.nome || userNick,
        userEmail: jogadorSelecionadoEmail,
        type: "acao",
        text: isDadoSecreto ? mensagem.replace(/\[[\d,\s]+\]/g, '[***]').replace(/\*\*\d+\*\*/g, '***') : mensagem,
        dadosRolados: rolls,
        secretRolls: isDadoSecreto ? rolls : null,
        secretTotal: isDadoSecreto ? total : null,
        secretText: isDadoSecreto ? mensagem.replace(/\[[\d,\s]+\]/g, '[***]').replace(/\*\*\d+\*\*/g, '***') : null,
        timestamp: serverTimestamp(),
      });
    }
    
    // 🟢 ADICIONAR XP
    let xpGanho = 1;
    if (isCritico) xpGanho = 2;
    if (isErroCritico) xpGanho = 0;
await adicionarXpAcao(jogadorSelecionadoEmail, xpGanho);

// 🟢 Adiciona XP aos atributos/perícias usados
if (acaoAtributo || acaoPericia) {
  console.log('🔍 CHAMANDO adicionarXpAtributoPericia:', {
    email: jogadorSelecionadoEmail,
    atributo: acaoAtributo,
    pericia: acaoPericia
  });
  await adicionarXpAtributoPericia(jogadorSelecionadoEmail, acaoAtributo, acaoPericia);
}

    // 🟢 CONQUISTAS
    if (isCritico) {
      window.dispatchEvent(new CustomEvent('desbloquearConquista', { detail: { conquistaId: 'critico_perfeito' } }));
    }
    if (total > 50) {
      window.dispatchEvent(new CustomEvent('desbloquearConquista', { detail: { conquistaId: 'dano_massivo' } }));
    }

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
    setAcaoHabilidadeCustoPE(0);  // 🟢 ADICIONE
    setAcaoDebuffs([]);            // 🟢 ADICIONE
    setAcaoBonusVariavelLista([]);  // 🟢 Limpa bônus
    setAcaoValorDificuldade("");    // 🟢 Limpa VD
    setAcaoItemConsumivel(false);
    setAcaoConsumivelTipo("");
    setAcaoConsumivelValor(0);
    setAcaoConsumivelPercentual(100);
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
  const isCritico = pendente.isCritico || false;
  const isErroCritico = pendente.isErroCritico || false;
    // 🟢 VERIFICAR CRÍTICO/ERRO CRÍTICO DO DEFENSOR
  let isCriticoDefensor = false;
  let isErroCriticoDefensor = false;
  
  if (dadosDefesa.length >= 1) {
    const temDezDef = dadosDefesa.some(r => r === 10);
    const temUmDef = dadosDefesa.some(r => r === 1);
    const todosPositivosDef = dadosDefesa.every(r => r >= 6);
    const todosNegativosDef = dadosDefesa.every(r => r <= 5);
    
    if (temDezDef && todosPositivosDef) {
      isCriticoDefensor = true;
    }
    if (temUmDef && todosNegativosDef) {
      isErroCriticoDefensor = true;
    }
  }
  // 🟢 Nomes dos personagens
  const nomeAtacante = fichasMap[atacante]?.nome || atacante;
  const nomeDefensor = fichasMap[alvo]?.nome || alvo;
  
  const corAtacante = "#4caf50"; // Verde para quem ataca
  const corDefensor = "#ffd700"; // Amarelo para quem defende
  
  let mensagem = "";
  let danoBrutoAtacante = 0;
  let danoBrutoAlvo = 0;
  
  const _cabecalhoCombate = `${montarCaixa("⚔️ RESOLUÇÃO DE COMBATE ⚔️", 37)}\n\n🗡️ Atacante: [C:${corAtacante}]${nomeAtacante}[/C] ➔ 🛡️ Defensor: [C:${corDefensor}]${nomeDefensor}[/C]\n`;
  const _rolagemAtacante = `🎲 ATAQUE: [C:${corAtacante}][${dadosAtacante.join(", ")}] = ${valorAtaque}[/C]`;
  const _rolagemDefensor = `🛡️ DEFESA: [C:${corDefensor}][${dadosDefesa.join(", ")}] = ${valorDefesa}[/C]`;
  const _sep = `━━━━━━━━━━━━━━━━━━━━━━━━`;

  if (tipoDefesa === "esquiva") {
    if (isErroCriticoDefensor) {
      danoBrutoAlvo = valorAtaque;
      mensagem = `${_cabecalhoCombate}🛡️ Esquiva tentada...\n\n${_rolagemAtacante}\n${_rolagemDefensor}\n\n${_sep}\n💥 ERRO CRÍTICO NA ESQUIVA!\n💔 Dano cheio aplicado: ${valorAtaque}\n`;
    }
    else if (isErroCritico) {
      danoBrutoAlvo = 0;
      mensagem = `${_cabecalhoCombate}🛡️ Esquiva tentada...\n\n${_rolagemAtacante}\n${_rolagemDefensor}\n\n${_sep}\n💥 ERRO CRÍTICO DO ATACANTE!\n✅ Esquiva automática — NENHUM DANO.\n`;
    }
    else if (isCriticoDefensor) {
      danoBrutoAlvo = 0;
      mensagem = `${_cabecalhoCombate}🛡️ Esquiva tentada...\n\n${_rolagemAtacante}\n${_rolagemDefensor}\n\n${_sep}\n🌟 CRÍTICO NA ESQUIVA!\n✅ NENHUM DANO.\n`;
    }
    else if (isCritico) {
      danoBrutoAlvo = valorAtaque;
      mensagem = `${_cabecalhoCombate}🛡️ Esquiva tentada...\n\n${_rolagemAtacante}\n${_rolagemDefensor}\n\n${_sep}\n🌟 CRÍTICO DO ATACANTE!\n💥 Dano direto: ${valorAtaque}\n`;
    }
    else {
      danoBrutoAlvo = Math.max(0, valorAtaque - valorDefesa);
      mensagem = `${_cabecalhoCombate}${_rolagemAtacante}\n${_rolagemDefensor}\n\n${_sep}\n`;
      if (danoBrutoAlvo > 0) {
        mensagem += `💥 [C:${corAtacante}]${valorAtaque}[/C] − [C:${corDefensor}]${valorDefesa}[/C] = [C:${corAtacante}]${danoBrutoAlvo}[/C] de dano bruto\n`;
      } else {
        mensagem += `✅ Esquiva bem-sucedida! Nenhum dano recebido.\n`;
      }
    }
  }
  
  if (tipoDefesa === "contragolpe") {
    if (isErroCriticoDefensor) {
      danoBrutoAlvo = valorAtaque;
      mensagem = `${_cabecalhoCombate}⚔️ Contragolpe tentado...\n\n${_rolagemAtacante}\n${_rolagemDefensor}\n\n${_sep}\n💥 ERRO CRÍTICO NO CONTRAGOLPE!\n💔 Dano cheio aplicado: ${valorAtaque}\n`;
    }
    else if (isErroCritico) {
      danoBrutoAtacante = valorDefesa;
      mensagem = `${_cabecalhoCombate}⚔️ Contragolpe!\n\n${_rolagemAtacante}\n${_rolagemDefensor}\n\n${_sep}\n💥 ERRO CRÍTICO DO ATACANTE!\n⚡ Contragolpe acertou em cheio: ${valorDefesa}\n`;
    }
    else if (isCriticoDefensor) {
      danoBrutoAtacante = valorDefesa;
      mensagem = `${_cabecalhoCombate}⚔️ Contragolpe!\n\n${_rolagemAtacante}\n${_rolagemDefensor}\n\n${_sep}\n🌟 CRÍTICO NO CONTRAGOLPE!\n⚡ Dano devolvido: ${valorDefesa}\n`;
    }
    else if (isCritico) {
      danoBrutoAlvo = valorAtaque;
      mensagem = `${_cabecalhoCombate}⚔️ Contragolpe tentado...\n\n${_rolagemAtacante}\n${_rolagemDefensor}\n\n${_sep}\n🌟 CRÍTICO DO ATACANTE!\n💥 Dano direto: ${valorAtaque}\n`;
    }
    else {
      mensagem = `${_cabecalhoCombate}${_rolagemAtacante}\n${_rolagemDefensor}\n\n${_sep}\n`;
      if (valorDefesa > valorAtaque) {
        danoBrutoAtacante = valorDefesa - valorAtaque;
        mensagem += `⚡ [C:${corDefensor}]${valorDefesa}[/C] − [C:${corAtacante}]${valorAtaque}[/C] = [C:${corDefensor}]${danoBrutoAtacante}[/C] devolvido!\n`;
      } else {
        danoBrutoAlvo = valorAtaque - valorDefesa;
        mensagem += `⚠️ Contragolpe falhou!\n💥 [C:${corAtacante}]${valorAtaque}[/C] − [C:${corDefensor}]${valorDefesa}[/C] = [C:${corAtacante}]${danoBrutoAlvo}[/C] de dano bruto\n`;
      }
    }
  }
  
  // 🟢 DETERMINAR TIPO DE DANO DO ATACANTE (APENAS UMA VEZ)
    // 🟢 DETERMINAR TIPO DE DANO DO ATACANTE
  // Prioridade: 1. tipoDanoAtaque da pendente, 2. Habilidade, 3. Item
  let tipoDanoAtacante = pendente.tipoDanoAtaque || "Nenhum";
  
  // Se não veio na pendente, tenta buscar dos dados da ficha
  if (tipoDanoAtacante === "Nenhum") {
    const fichaAtacante = fichasMap[atacante];
    if (fichaAtacante) {
      // Busca nas habilidades (prioridade sobre item)
      if (pendente.habilidadeUsada) {
        const habilidadeUsada = (fichaAtacante.habilidades || []).find(h => h.nome === pendente.habilidadeUsada);
        if (habilidadeUsada?.tipoDano && habilidadeUsada.tipoDano !== "Nenhum") {
          tipoDanoAtacante = habilidadeUsada.tipoDano;
        }
      }
      
      // Busca nos itens (se não encontrou na habilidade)
      if (tipoDanoAtacante === "Nenhum" && pendente.itemUsado) {
        const todosItens = [
          ...(fichaAtacante.equipamentos || []),
          ...(fichaAtacante.vestes || []),
          ...(fichaAtacante.diversos || [])
        ];
        const itemUsado = todosItens.find(it => it.nome === pendente.itemUsado);
        if (itemUsado?.tipoDano && itemUsado.tipoDano !== "Nenhum") {
          tipoDanoAtacante = itemUsado.tipoDano;
        }
      }
    }
  }
  
  console.log("🗡️ Tipo de Dano no Combate:", tipoDanoAtacante, "| Pendente:", pendente.tipoDanoAtaque);
  
  // Aplica dano no ALVO
  if (danoBrutoAlvo > 0) {
    const resultado = await aplicarDano(alvo, danoBrutoAlvo, tipoDanoAtacante, atacante, pendente.ignorarArmaduraDemolidor || false);
    mensagem += `\n${_sep}\n`;
    mensagem += `📊 RESULTADO DO DANO EM [C:${corDefensor}]${nomeDefensor.toUpperCase()}[/C]\n`;
    mensagem += `   💥 Dano Bruto: [C:${corAtacante}]${resultado.danoAplicado ?? danoBrutoAlvo}[/C]\n`;
    mensagem += `   🛡️ Armadura: [C:${corDefensor}]${resultado.armadura}[/C]\n`;
    if (resultado.armadura > 0 && danoBrutoAlvo > resultado.armadura) {
      mensagem += `   🔄 Absorvido: [C:${corDefensor}]${Math.min(resultado.armadura, danoBrutoAlvo)}[/C]\n`;
    }
    mensagem += `   💔 DANO FINAL: [C:${corAtacante}]${resultado.danoFinal}[/C]\n`;
    mensagem += `   ❤️ PV Restante: [C:${corDefensor}]${resultado.pvRestante}[/C]\n`;
    mensagem += `${_sep}\n`;

    if (tipoDanoAtacante !== "Nenhum") {
      mensagem += `\n🗡️ TIPO DE DANO: ${tipoDanoAtacante}\n`;
    }
    if (resultado.efeitos && resultado.efeitos.length > 0) {
      mensagem += `\n📋 EFEITOS APLICADOS:\n`;
      resultado.efeitos.forEach(ef => { mensagem += `   ${ef}\n`; });
    }
  }
    // 🟢 VERIFICAR SE O ALVO MORREU (VITÓRIA)
  if (danoBrutoAlvo > 0) {
    const fichaAlvoCheck = await getDoc(doc(db, "fichas", alvo));
    if (fichaAlvoCheck.exists() && (fichaAlvoCheck.data().pontosVida || 0) <= 0) {
      // 🟢 CONQUISTA: Primeira Vitória (o atacante venceu)
      window.dispatchEvent(new CustomEvent('desbloquearConquista', { detail: { conquistaId: 'primeira_vitoria', emailVencedor: atacante } }));
      
      // 🟢 CONTADOR DE INIMIGOS DERROTADOS (para Caçador e Exterminador)
      const contadorInimigos = Number(localStorage.getItem(`inimigos_${atacante}`) || 0) + 1;
      localStorage.setItem(`inimigos_${atacante}`, contadorInimigos);
      
      if (contadorInimigos >= 10) {
        window.dispatchEvent(new CustomEvent('desbloquearConquista', { detail: { conquistaId: 'cacador_monstros' } }));
      }
      if (contadorInimigos >= 50) {
        window.dispatchEvent(new CustomEvent('desbloquearConquista', { detail: { conquistaId: 'exterminador' } }));
      }
    }
  }
  
  // Aplica dano no ATACANTE (contragolpe bem-sucedido)
  if (danoBrutoAtacante > 0) {
    const resultado = await aplicarDano(atacante, danoBrutoAtacante);
    mensagem += `\n${_sep}\n`;
    mensagem += `📊 CONTRAGOLPE EM [C:${corAtacante}]${nomeAtacante.toUpperCase()}[/C]\n`;
    mensagem += `   🛡️ Armadura: [C:${corAtacante}]${resultado.armadura}[/C]\n`;
    if (resultado.armadura > 0 && danoBrutoAtacante > resultado.armadura) {
      mensagem += `   🔄 Absorvido: [C:${corAtacante}]${Math.min(resultado.armadura, danoBrutoAtacante)}[/C]\n`;
    }
    mensagem += `   💔 DANO FINAL: [C:${corDefensor}]${resultado.danoFinal}[/C]\n`;
    mensagem += `   ❤️ PV Restante: [C:${corAtacante}]${resultado.pvRestante}[/C]\n`;
    mensagem += `${_sep}\n`;
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
   const isDadoSecreto = modoSecreto;
  await addDoc(chatCol, {
    userNick: nomeDefensor,
    userEmail: alvo,
    type: "acao",
    text: isDadoSecreto ? mensagem.replace(/\[[\d,\s]+\]/g, '[***]').replace(/\*\*\d+\*\*/g, '***') : mensagem,
    dadosRolados: dadosDefesa,
    secretRolls: isDadoSecreto ? dadosDefesa : null,
    secretText: isDadoSecreto ? mensagem.replace(/\[[\d,\s]+\]/g, '[***]').replace(/\*\*\d+\*\*/g, '***') : null,
    timestamp: serverTimestamp(),
  });
  
  // 🟢 ADICIONAR XP PARA O ATACANTE (baseado nas flags DELE)
  let xpAtacante = 1;
  if (isCritico) xpAtacante = 2;
  if (isErroCritico) xpAtacante = 0;
  await adicionarXpAcao(atacante, xpAtacante);
  
  // 🟢 ADICIONAR XP PARA O DEFENSOR (baseado nas flags DELE)
  let xpDefensor = 1;
  if (isCriticoDefensor) xpDefensor = 2;
  if (isErroCriticoDefensor) xpDefensor = 0;
  await adicionarXpAcao(alvo, xpDefensor);
  
  return { mensagem, isCriticoDefensor, isErroCriticoDefensor };
}
// 🟢 APLICAR EFEITO ATIVO PERSISTENTE AO ALVO (usado por aplicarDano)
async function aplicarEfeitoAtivo(email, tipoDano, aplicadoPorEmail) {
  const info = EFEITOS_ATIVOS_MAP[tipoDano];
  if (!info) return null;
  if (info.chance && Math.random() > info.chance) return null;

  const fichaRef = doc(db, "fichas", email);
  const snap = await getDoc(fichaRef);
  if (!snap.exists()) return null;

  const ficha = snap.data();
  const efeitos = Array.isArray(ficha.efeitosAtivos) ? [...ficha.efeitosAtivos] : [];

  const idx = efeitos.findIndex(e => e.tipo === info.tipo);
  const novo = {
    id: `ef_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    tipo: info.tipo,
    icone: info.icone,
    cor: info.cor,
    descricao: info.descricao,
    duracao: info.duracao,
    turnosRestantes: info.duracao,
    aplicadoPor: aplicadoPorEmail || "desconhecido",
    aplicadoEm: new Date().toISOString(),
  };
  if (idx >= 0) {
    efeitos[idx] = { ...efeitos[idx], turnosRestantes: info.duracao, aplicadoEm: novo.aplicadoEm, aplicadoPor: aplicadoPorEmail };
  } else {
    efeitos.push(novo);
  }

  await setDoc(fichaRef, { efeitosAtivos: efeitos }, { merge: true });
  return novo;
}

// 🟢 FUNÇÃO PARA APLICAR DANO COM EFEITOS REAIS DE TIPO DE DANO
// 🟢 APLICAR DANO COM EFEITOS REAIS DE TIPO DE DANO (versão doc oficial)
async function aplicarDano(email, danoBruto, tipoDano = "Nenhum", atacanteEmail = null, ignorarArmaduraDemolidor = false) {
  const fichaRef = doc(db, "fichas", email);
  const snap = await getDoc(fichaRef);
  if (!snap.exists()) return { danoFinal: 0, armadura: 0, pvRestante: 0, efeitos: [] };

  const ficha = snap.data();
  let armaduraOriginal = Number(ficha.armadura || 0);
  let armadura = armaduraOriginal;
  const efeitos = [];
  let danoAplicado = Number(danoBruto) || 0;

  if (tipoDano === "Tóxico" && ficha.tracos?.includes("Sobrevivente")) {
    efeitos.push("🛡️ Imunidade: Imune a dano Tóxico (Traço Sobrevivente)!");
    danoAplicado = 0;
  }

  // 💪 DEMOLIDOR (talento): ignora 50% da armadura
  if (ignorarArmaduraDemolidor) {
    armadura = Math.floor(armadura * 0.5);
    efeitos.push("💪 Demolidor: Ignorou 50% da armadura!");
  }

  // ============================================================
  // 1) AURANO — +50% ANTES da armadura
  // ============================================================
  if (tipoDano === "Aurano") {
    const bonus = Math.ceil(danoAplicado * 0.5);
    const danoOriginal = danoAplicado;
    danoAplicado = danoAplicado + bonus;
    efeitos.push(`✨ Aurano: Canalização de Aura (+50%) → ${danoOriginal} ➜ ${danoAplicado}`);
  }

  // ============================================================
  // 2) MODIFICADORES DE ARMADURA
  // ============================================================
  if (tipoDano === "Ácido") {
    armadura = 0;
    efeitos.push("🧪 Ácido: Ignorou 100% da armadura! (dano direto nos PV)");
  }

  if (tipoDano === "Perfurante") {
    if (armaduraOriginal >= 26) {
      armadura = Math.ceil(armadura * 0.5);
      efeitos.push(`🏹 Perfurante: Penetrou armadura pesada! (${armaduraOriginal} ➜ ${armadura})`);
    } else {
      efeitos.push(`🏹 Perfurante: Armadura leve (${armaduraOriginal} < 26) - sem efeito extra.`);
    }
  }

  if (tipoDano === "Cortante") {
    if (armaduraOriginal <= 25) {
      armadura = Math.ceil(armadura * 0.5);
      efeitos.push(`🔪 Cortante: Cortou tecido! Armadura (${armaduraOriginal} ➜ ${armadura})`);
    } else {
      efeitos.push(`🔪 Cortante: Armadura pesada (${armaduraOriginal} > 25) - sem corte.`);
    }
  }

  // ============================================================
  // 3) DANO FINAL (arredondamento para cima já feito no ceil)
  // ============================================================
  const danoFinal = Math.max(0, danoAplicado - armadura);

  // ============================================================
  // 4) DESGASTE DAS VESTES (proporcional ao dano absorvido)
  // ============================================================
  const vestes = ficha.vestes || [];
  if (vestes.length > 0 && armadura > 0 && danoAplicado > 0) {
    const danoAbsorvido = Math.min(armadura, danoAplicado);
    const desgastePorItem = danoAbsorvido / vestes.length;
    const novasVestes = vestes.map(item => ({
      ...item,
      durabilidade: Math.max(0, (item.durabilidade || 100) - desgastePorItem),
    }));
    await setDoc(fichaRef, { vestes: novasVestes }, { merge: true });
  }

  // ============================================================
  // 5) ATUALIZA PV
  // ============================================================
  const pvAtual = Number(ficha.pontosVida || 0);
  const novoPV = Math.max(0, pvAtual - danoFinal);
  await setDoc(fichaRef, { pontosVida: novoPV }, { merge: true });

  // Conquistas
  if (novoPV === 1) window.dispatchEvent(new CustomEvent('desbloquearConquista', { detail: { conquistaId: 'sobrevivente' } }));
  if (novoPV === 0) localStorage.setItem(`morreu_${email}`, Date.now());
  if (novoPV > 0 && localStorage.getItem(`morreu_${email}`)) {
    window.dispatchEvent(new CustomEvent('desbloquearConquista', { detail: { conquistaId: 'renascido' } }));
    localStorage.removeItem(`morreu_${email}`);
  }

  // ============================================================
  // 6) EFEITOS PROBABILÍSTICOS / PERSISTENTES
  // ============================================================
  let efeitoAplicado = null;
  if (tipoDano && tipoDano !== "Nenhum" && EFEITOS_ATIVOS_MAP[tipoDano]) {
    // 🟢 Contundente é instantâneo (só mensagem, sem efeito persistente)
    if (tipoDano === "Contundente") {
      if (Math.random() < 0.5) {
        efeitos.push("💥 Contundente: O alvo SOLTOU o item empunhado!");
      } else {
        efeitos.push("💥 Contundente: Impacto absorvido. Item mantido.");
      }
    } else {
      try {
        efeitoAplicado = await aplicarEfeitoAtivo(email, tipoDano, atacanteEmail);
        if (efeitoAplicado) {
          const nomeAlvo = (fichasMap?.[email]?.nome) || email;
          const nomeAtacante = (fichasMap?.[atacanteEmail]?.nome) || atacanteEmail || "atacante";
          efeitos.push(`📌 EFEITO ATIVO: ${efeitoAplicado.icone} ${efeitoAplicado.tipo} em ${nomeAlvo} por ${nomeAtacante} (${efeitoAplicado.duracao === 999 ? "permanente" : `${efeitoAplicado.duracao} turno(s)`})`);
        } else {
          // resistiu
          const info = EFEITOS_ATIVOS_MAP[tipoDano];
          if (info?.chance) {
            efeitos.push(`🛡️ ${tipoDano}: Alvo resistiu (${Math.round(info.chance * 100)}% de chance).`);
          }
        }
      } catch (e) {
        console.error("Erro aplicar efeito ativo:", e);
      }
    }
  }

  return { danoFinal, armadura, pvRestante: novoPV, efeitos, efeitoAplicado, danoAplicado };
}

// 🟢 FUNÇÃO PARA ADICIONAR XP AO JOGADOR
async function adicionarXpAcao(emailJogador, quantidade = 1) {
  if (!emailJogador || emailJogador === "mestre@reqviemrpg.com" || quantidade <= 0) return;
  
  try {
    const xpRef = doc(db, "game", "hud");
    const snap = await getDoc(xpRef);
    
    let xpMap = {};
    if (snap.exists()) {
      xpMap = snap.data().xpMap || {};
    }
    
    const jogadorXP = xpMap[emailJogador] || { xp: 0, level: 1 };
    
    // Adiciona XP
    jogadorXP.xp = (jogadorXP.xp || 0) + quantidade;
    
    // Verifica se upou de nível (100 XP = 1 nível)
    while (jogadorXP.xp >= 100) {
      jogadorXP.xp -= 100;
      jogadorXP.level = (jogadorXP.level || 1) + 1;
    }
    
    xpMap[emailJogador] = jogadorXP;
    
    await setDoc(xpRef, { xpMap }, { merge: true });
    console.log(`⭐ +${quantidade} XP para ${emailJogador}: LV ${jogadorXP.level} - ${jogadorXP.xp}/100`);
  } catch (err) {
    console.error("Erro ao adicionar XP:", err);
  }
}

// 🟢 FUNÇÃO PARA ADICIONAR XP À HABILIDADE AURANA
async function adicionarXpHabilidade(emailJogador, habIndex) {
  if (!emailJogador || emailJogador === "mestre@reqviemrpg.com") return;
  
  try {
    const fichaRef = doc(db, "fichas", emailJogador);
    const snap = await getDoc(fichaRef);
    if (!snap.exists()) return;
    
    const dados = snap.data();
    const habilidades = dados.habilidades || [];
    
    if (!habilidades[habIndex]) return;
    
    const hab = habilidades[habIndex];
    const dadoAtual = Number(hab.dado) || 1;
    
    // Se já está no máximo (10), não faz nada
    if (dadoAtual >= 10) return;
    
    const xpKey = `hab_${habIndex}`;
    const habilidadesXPAtuais = dados.habilidadesXP || {}; // 🟢 OBJETO, não string
    const xpAtual = Number(habilidadesXPAtuais[xpKey] || 0);
    const xpGanho = 3;
    const novoXP = xpAtual + xpGanho;
    
    const xpNecessario = dadoAtual * 100;
    
    console.log(`🎯 Habilidade "${hab.nome}": ${xpAtual}/${xpNecessario} XP (+${xpGanho})`);
    
    if (novoXP >= xpNecessario) {
      // 🟢 SUBIU DE NÍVEL!
      const xpRestante = novoXP - xpNecessario;
      const novoDado = dadoAtual + 1;
      
      console.log(`⬆️ SUBIU PARA NÍVEL ${novoDado}! XP restante: ${xpRestante}`);
      
      // Atualiza o dado da habilidade
      habilidades[habIndex] = { ...hab, dado: novoDado };
      
      // 🟢 CORRIGIDO: Cria o objeto habilidadesXP corretamente
      const novoHabilidadesXP = { ...habilidadesXPAtuais, [xpKey]: xpRestante };
      
      await setDoc(fichaRef, {
        habilidades: habilidades,
        habilidadesXP: novoHabilidadesXP  // 🟢 Objeto aninhado, não string
      }, { merge: true });
      
      // Mensagem no chat
      const nomePersonagem = dados.nome || emailJogador;
      await addDoc(chatCol, {
        userNick: "SISTEMA",
        userEmail: "sistema@reqviemrpg.com",
        type: "acao",
        text: `⬆️ **${nomePersonagem}** - A habilidade **"${hab.nome}"** subiu para o nível **${novoDado}**! 🎉`,
        timestamp: serverTimestamp(),
      });
      
      // 🟢 Dispara evento para atualizar a ficha em tempo real
      window.dispatchEvent(new CustomEvent('xpAtualizado', { 
        detail: { 
          email: emailJogador, 
          data: { [`habilidadesXP.${xpKey}`]: xpRestante }
        } 
      }));
      
    } else {
      // Apenas acumula XP
      const novoHabilidadesXP = { ...habilidadesXPAtuais, [xpKey]: novoXP };
      
      await setDoc(fichaRef, {
        habilidadesXP: novoHabilidadesXP  // 🟢 Objeto aninhado
      }, { merge: true });
      
      // 🟢 Dispara evento para atualizar a ficha em tempo real
      window.dispatchEvent(new CustomEvent('xpAtualizado', { 
        detail: { 
          email: emailJogador, 
          data: { [`habilidadesXP.${xpKey}`]: novoXP }
        } 
      }));
    }
    
    console.log(`✅ +${xpGanho} XP para habilidade "${hab.nome}": ${xpAtual} → ${novoXP}`);
  } catch (err) {
    console.error("Erro ao adicionar XP na habilidade:", err);
  }
}

async function adicionarXpAtributoPericia(emailJogador, atributo, pericia) {
  if (!emailJogador || emailJogador === "mestre@reqviemrpg.com") return;
  
  try {
    const fichaRef = doc(db, "fichas", emailJogador);
    const snap = await getDoc(fichaRef);
    if (!snap.exists()) return;
    
    const dados = snap.data();
    const atualizacoes = {};
    
    // 🟢 Lê o valor ATUAL e SOMA +3
    if (atributo && dados.atributos?.[atributo] !== undefined) {
      const xpAtual = Number(dados.atributosXP?.[atributo] || 0);
      const novoValor = xpAtual + 3;
      atualizacoes[`atributosXP.${atributo}`] = novoValor;
      console.log(`💪 +3 XP para ${atributo}: ${xpAtual} → ${novoValor}`);
    }
    
    if (pericia && dados.pericias?.[pericia] !== undefined) {
      const xpAtual = Number(dados.periciasXP?.[pericia] || 0);
      const novoValor = xpAtual + 3;
      atualizacoes[`periciasXP.${pericia}`] = novoValor;
      console.log(`📚 +3 XP para ${pericia}: ${xpAtual} → ${novoValor}`);
    }
    
    if (Object.keys(atualizacoes).length > 0) {
      console.log('💾 SALVANDO no Firestore:', atualizacoes);
      // 🟢 USA updateDoc em vez de setDoc
      const { updateDoc } = await import("firebase/firestore");
      await updateDoc(fichaRef, atualizacoes);
      console.log('✅ SALVO com sucesso!');
      
      // Dispara evento para atualizar a ficha
      window.dispatchEvent(new CustomEvent('xpAtualizado', { 
        detail: { email: emailJogador, data: atualizacoes } 
      }));
    }
  } catch (err) {
    console.error("Erro ao adicionar XP:", err);
  }
}
// 🟢 APLICAR DANO TÓXICO NOS TURNOS
async function aplicarDanoToxico() {
  const toxinasAtualizadas = { ...toxinasAtivas };
  
  for (const [id, toxina] of Object.entries(toxinasAtivas)) {
    if (toxina.turnosRestantes > 0) {
      const fichaRef = doc(db, "fichas", toxina.email);
      const snap = await getDoc(fichaRef);
      if (snap.exists()) {
        const ficha = snap.data();
        const pvAtual = Number(ficha.pontosVida || 0);
        const novoPV = Math.max(0, pvAtual - toxina.dano);
        await setDoc(fichaRef, { pontosVida: novoPV }, { merge: true });
        
        await addDoc(chatCol, {
          userNick: "SISTEMA",
          userEmail: "sistema@reqviemrpg.com",
          type: "acao",
          text: `☠️ Tóxico: ${fichasMap[toxina.email]?.nome || toxina.email} perdeu ${toxina.dano} PV! (Turno ${toxina.turnosAplicados + 1}/10)\n❤️ PV restante: ${novoPV}`,
          timestamp: serverTimestamp(),
        });
        
        toxinasAtualizadas[id] = {
          ...toxina,
          turnosRestantes: toxina.turnosRestantes - 1,
          turnosAplicados: toxina.turnosAplicados + 1,
        };
      }
    }
  }
  
  // Remove toxinas expiradas
  const toxinasFiltradas = {};
  for (const [id, toxina] of Object.entries(toxinasAtualizadas)) {
    if (toxina.turnosRestantes > 0) {
      toxinasFiltradas[id] = toxina;
    }
  }
  
  setToxinasAtivas(toxinasFiltradas);
}

// 🟢 DISPARAR DANO TÓXICO AO ROLAR AÇÃO
useEffect(() => {
  if (Object.keys(toxinasAtivas).length > 0) {
    aplicarDanoToxico();
  }
}, [rolagemEmAndamento]); // Dispara quando alguém rola uma ação

  const getInitials = (name = "?") =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  // 🟢 OTIMIZAÇÃO: Mostra apenas a quantidade definida pelo scroll infinito
  const mensagensVisiveis = messages.slice(-quantidadeMensagens);

  return (
    <Paper elevation={6} sx={{ 
      height: "100%", 
      display: "flex", 
      flexDirection: "column", 
      p: 0, 
      position: "relative", 
      background: "linear-gradient(180deg, #07121a 0%, #0f172a 100%)",
      border: "1px solid #1e293b",
      borderRadius: 3,
      boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
      overflow: "hidden"
    }}>
      {/* 🟢 CABEÇALHO ESTILOSO (Glassmorphism) */}
      <Box sx={{ 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "space-between", 
        p: 1.5,
        px: 2,
        background: "linear-gradient(90deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95))",
        borderBottom: "1px solid rgba(0, 224, 255, 0.2)",
        backdropFilter: "blur(10px)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
        zIndex: 10
      }}>
  {/* 🟢 TÍTULO + ONLINE */}
  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0, flexWrap: "wrap" }}>
    <Typography variant="h6" sx={{ 
      fontWeight: 900, 
      background: "linear-gradient(90deg, #00e0ff, #a855f7)", 
      WebkitBackgroundClip: "text", 
      WebkitTextFillColor: "transparent",
      letterSpacing: 1
    }}>
      💬 Chat
    </Typography>
    {Array.isArray(fichaJogador?.efeitosAtivos) && fichaJogador.efeitosAtivos.length > 0 && (
      <Box sx={{ display: "flex", gap: 0.4, alignItems: "center", bgcolor: "rgba(0,0,0,0.35)", borderRadius: 2, px: 0.8, py: 0.3, border: "1px solid #334155" }}>
        <Typography variant="caption" sx={{ color: "#94a3b8", fontSize: "0.6rem", fontWeight: "bold", mr: 0.3 }}>
          EFEITOS:
        </Typography>
        {fichaJogador.efeitosAtivos.map((ef) => (
          <Tooltip
            key={ef.id}
            arrow
            title={
              <Box sx={{ p: 0.5 }}>
                <Typography sx={{ fontWeight: "bold", fontSize: "0.75rem", color: ef.cor || "#fff" }}>
                  {ef.icone} {ef.tipo}
                </Typography>
                <Typography sx={{ fontSize: "0.65rem", color: "#cbd5e1" }}>
                  {ef.descricao || ""}
                </Typography>
                <Typography sx={{ fontSize: "0.6rem", color: "#94a3b8", mt: 0.3 }}>
                  Restam: {ef.turnosRestantes ?? "?"} turno(s)
                </Typography>
              </Box>
            }
          >
            <Box
              sx={{
                width: 22, height: 22,
                borderRadius: "50%",
                bgcolor: "rgba(0,0,0,0.6)",
                border: `1.5px solid ${ef.cor || "#fff"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12,
                boxShadow: `0 0 6px ${ef.cor || "#fff"}88`,
                cursor: "help",
                position: "relative",
              }}
            >
              {ef.icone}
              <Box
                sx={{
                  position: "absolute",
                  bottom: -3, right: -3,
                  bgcolor: "#0f172a",
                  color: ef.cor || "#fff",
                  fontSize: "0.5rem",
                  fontWeight: "bold",
                  borderRadius: "50%",
                  width: 12, height: 12,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: `1px solid ${ef.cor || "#fff"}`,
                }}
              >
                {ef.turnosRestantes ?? "?"}
              </Box>
            </Box>
          </Tooltip>
        ))}
      </Box>
    )}
    {onlinePlayers.filter(p => !p.isMaster && p.email !== "mestre@reqviemrpg.com").length > 0 && (
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, ml: 1 }}>
        <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#22c55e", boxShadow: "0 0 6px #22c55e", animation: "pulse 1.5s infinite" }} />
        <Typography variant="caption" sx={{ color: "#22c55e", fontWeight: "bold", fontSize: "0.65rem", mr: 0.5 }}>
          {onlinePlayers.filter(p => !p.isMaster && p.email !== "mestre@reqviemrpg.com").length} online
        </Typography>
        <Box sx={{ display: "flex", gap: 0.3, overflow: "hidden" }}>
          {onlinePlayers.filter(p => !p.isMaster && p.email !== "mestre@reqviemrpg.com").slice(0, 6).map((p) => {
            const avatar = fichasMap[p.email]?.imagemPersonagem || "";
            const nome = p.isMaster ? "👑 Mestre" : (fichasMap[p.email]?.nome || p.nickname);
            return (
              <Tooltip key={p.email} arrow placement="bottom" title={nome}>
                <Avatar
                  src={avatar}
                  sx={{
                    width: 26, height: 26, fontSize: 11,
                    bgcolor: p.isMaster ? "#FFD700" : "#3b82f6",
                    color: p.isMaster ? "#000" : "#fff",
                    border: "2px solid " + (p.isMaster ? "#FFD700" : "#22c55e"),
                    boxShadow: "0 0 6px rgba(34,197,94,0.5)",
                    cursor: "pointer",
                  }}
                >
                  {!avatar && (nome[0] || "?").toUpperCase()}
                </Avatar>
              </Tooltip>
            );
          })}
          {onlinePlayers.length > 6 && (
            <Avatar sx={{ width: 26, height: 26, fontSize: 10, bgcolor: "#334155", color: "#94a3b8", border: "2px solid #22c55e" }}>
              +{onlinePlayers.length - 6}
            </Avatar>
          )}
        </Box>
      </Box>
    )}
  </Box>
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
      setJogadorSelecionadoEmail(null);
      setTimeout(() => {
        setJogadorSelecionadoEmail(userEmail);
        // 🟢 DISPARA EVENTO PARA A BOLSA
        window.dispatchEvent(new CustomEvent('jogadorSelecionadoChat', { detail: userEmail }));
      }, 50);
      setAcoesPendentes([]);
      setAcaoModo("acao");
      window.dispatchEvent(new CustomEvent('fichasMapUpdated', { detail: window.__fichasMapSocial || {} }));
    } else {
      const fichaData = fichasMap[selectedEmail];
      if (fichaData) {
        setFichaJogador(fichaData);
        setEnergiaAtual(fichaData.pontosEnergia || 0);
        setJogadorSelecionadoEmail(selectedEmail);
        // 🟢 DISPARA EVENTO PARA A BOLSA
        window.dispatchEvent(new CustomEvent('jogadorSelecionadoChat', { detail: selectedEmail }));
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
            container: document.body,
            PaperProps: { 
              sx: { 
                bgcolor: "#0f172a", 
                color: "#fff",
                maxHeight: 400,
              } 
            },
            anchorOrigin: { vertical: "bottom", horizontal: "left" },
            transformOrigin: { vertical: "top", horizontal: "left" },
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
  </Box>
</Box>
      {chatTravado && !isMaster && (
        <Paper sx={{ 
          p: 2, 
          mb: 1, 
          bgcolor: '#1a1a2e', 
          border: '2px solid #ef4444', 
          textAlign: 'center', 
          borderRadius: 2,
          animation: 'pulse 2s infinite',
          boxShadow: '0 0 20px rgba(239, 68, 68, 0.3)',
        }}>
          <Typography sx={{ color: '#ef4444', fontWeight: 'bold', fontSize: '0.9rem' }}>
            🔒 O Chat está Travado
          </Typography>
          <Typography sx={{ color: '#94a3b8', fontSize: '0.75rem', mt: 0.5 }}>
            Aguarde o Mestre liberar para conversar
          </Typography>
        </Paper>
      )}
      <Box
        ref={chatRef}
        sx={{ 
          flex: 1, 
          overflowY: "auto", 
          position: "relative", 
          scrollBehavior: "smooth", 
          p: 2, // 🟢 Dá respiro para as mensagens não colarem nas bordas
          backgroundColor: "rgba(7, 18, 26, 0.6)", // 🟢 Fundo mais escuro para contraste
          WebkitOverflowScrolling: 'touch',
          transform: 'translateZ(0)',
          willChange: 'transform',
          "&::-webkit-scrollbar": { width: "6px" },
          "&::-webkit-scrollbar-track": { background: "transparent" },
          "&::-webkit-scrollbar-thumb": { background: "rgba(255,255,255,0.1)", borderRadius: "10px" },
          "&:hover::-webkit-scrollbar-thumb": { background: "rgba(255,255,255,0.25)" },
          // 🟢 BLOQUEIO VISUAL PARA JOGADORES QUANDO TRAVADO
          ...(chatTravado && !isMaster && {
            filter: 'blur(10px)',
            opacity: 0.15,
            pointerEvents: 'none',
            userSelect: 'none',
            transition: 'filter 0.5s ease, opacity 0.5s ease',
            overflowY: 'hidden',
          }),
        }}
        onDrop={(e) => {
          e.preventDefault();
          handleFiles(e.dataTransfer.files);
        }}
        onDragOver={(e) => e.preventDefault()}
      >
        {/* 🟢 OVERLAY DE BLOQUEIO PARA JOGADORES */}
        {chatTravado && !isMaster && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100,
              pointerEvents: 'auto',
              cursor: 'not-allowed',
            }}
          >
            <Typography variant="h1" sx={{ fontSize: '4rem', mb: 2, animation: 'pulse 2s infinite' }}>
              🔒
            </Typography>
            <Typography variant="h6" sx={{ color: '#ef4444', fontWeight: 'bold', textAlign: 'center', px: 3 }}>
              Chat Travado pelo Mestre
            </Typography>
            <Typography variant="body2" sx={{ color: '#94a3b8', textAlign: 'center', mt: 1, px: 3 }}>
              O chat será liberado quando a sessão começar.
            </Typography>
          </Box>
        )}
        {/* 🟢 INDICADOR DE CARREGAMENTO DE MENSAGENS ANTIGAS */}
        {carregandoAntigas && (
          <Box sx={{ textAlign: 'center', py: 2, opacity: 0.7 }}>
            <Typography variant="caption" sx={{ color: '#94a3b8' }}>
              ⏳ Carregando mensagens antigas...
            </Typography>
          </Box>
        )}
        
        {/* 🟢 INDICADOR DE QUE HÁ MAIS MENSAGENS ANTIGAS */}
        {!carregandoAntigas && temMaisMensagens && (
          <Box 
            sx={{ 
              textAlign: 'center', 
              py: 2, 
              cursor: 'pointer',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' }
            }}
            onClick={carregarMensagensAntigas}
          >
            <Typography variant="caption" sx={{ color: '#4caf50', fontSize: '0.7rem' }}>
              ⬆️ Clique para carregar mensagens mais antigas
            </Typography>
          </Box>
        )}
        <List>
          {mensagensVisiveis.map((m, i) => {
            const prev = mensagensVisiveis[i - 1];
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
                    animation: `${m.userEmail === userEmail ? 'slideInRight' : 'slideInLeft'} 0.28s ease-out`,
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
                      // 🟢 CORREÇÃO: Fundo dinâmico baseado no tipo de mensagem
                      bgcolor: ["acao", "dice", "dice_morte", "dice_morte_result"].includes(m.type) 
                        ? (m.userEmail === userEmail ? "rgba(156, 39, 176, 0.15)" : "rgba(0, 224, 255, 0.08)")
                        : (m.userEmail === userEmail ? "#1e3a5f" : "#2a2a2a"),
                      borderRadius: 2,
                      p: 1.5,
                      boxShadow: 2,
                      wordBreak: "break-word",
                      contentVisibility: 'auto',
                      containIntrinsicSize: 'auto 100px',
                      transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.2s ease',
                      '&:hover': {
                        transform: 'translateY(-3px) scale(1.02)',
                        boxShadow: m.userEmail === userEmail
                          ? '0 8px 25px rgba(30, 58, 95, 0.6)'
                          : '0 8px 25px rgba(0, 0, 0, 0.6)',
                      },
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
                        loading="lazy"
                        decoding="async"
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
                            loading="lazy"
                            decoding="async"
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
                        loading="lazy"
                        decoding="async"
                        style={{ maxWidth: "100%", borderRadius: 8, cursor: "pointer" }}
                        onClick={() => {
                          setLightboxImage(m.text);
                          setZoom(1);
                        }}
                      />
                    )}
                    {m.type === "video" && (
                      <video controls src={m.text} preload="none" style={{ maxWidth: "100%", borderRadius: 8 }} />
                    )}

                    {m.type === "youtube" && (
                      <iframe
                        width="100%"
                        height="135"
                        src={m.text.replace("watch?v=", "embed/")}
                        frameBorder="0"
                        allowFullScreen
                        loading="lazy"
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
                        <Typography component="div" sx={{ 
                          color: m.text?.includes('Furtividade') || m.text?.includes('furtividade') 
                            ? '#3b82f6' 
                            : '#00bcd4', 
                          fontFamily: 'monospace', 
                          fontWeight: 'bold',
                          wordBreak: 'break-word'
                        }}>
                          {/* 🟢 AQUI ELE USA A FUNÇÃO QUE TRANSFORMA AS TAGS EM CORES */}
                          <div dangerouslySetInnerHTML={{ 
                            __html: renderCombatText(!isMaster && m.secretText ? m.secretText : m.text) 
                          }} />
                        </Typography>
    {/* 🟢 Mostra os dados rolados se existirem e não for secreto */}
    {/* 🟢 Se for secreto, mostra indicador */}
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
{m.type === "evento" && (
  <Box sx={{
    bgcolor: '#1e1a3e',
    border: '1px solid #ec4899',
    borderRadius: 2,
    p: 1.5,
    animation: 'pulse 2s infinite',
  }}>
    <Typography sx={{ 
      color: '#ec4899', 
      whiteSpace: 'pre-line', 
      fontWeight: 'bold',
      fontStyle: 'italic',
    }}>
      {m.text}
    </Typography>
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
      {/* 🟢 RODAPÉ DO CHAT (Área de digitação, botões e avisos) */}
      <Box sx={{ 
        display: "flex", 
        flexDirection: "column", 
        p: 2, 
        gap: 1.5, 
        background: "linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, #07121a 100%)",
        borderTop: "1px solid rgba(0, 224, 255, 0.15)",
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
        zIndex: 10
      }}>

        {/* 🟢 INDICADOR DE DIGITANDO */}
        {typingUsers.length > 0 && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 1, pb: 0.5, animation: 'floatUp 0.3s ease-out' }}>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              {typingUsers.map((u, i) => {
                const avatar = fichasMap[u.email]?.imagemPersonagem || "";
                return (
                  <Avatar key={u.email} src={avatar} sx={{ width: 20, height: 20, fontSize: 9, border: "2px solid #0f172a", ml: i > 0 ? -1.5 : 0, zIndex: 10 - i, bgcolor: "#00e0ff", color: "#000" }}>
                    {!avatar && (u.nickname || "?")[0].toUpperCase()}
                  </Avatar>
                );
              })}
            </Box>
            <Typography variant="caption" sx={{ color: '#00e0ff', fontSize: '0.7rem', fontWeight: 'bold' }}>digitando...</Typography>
          </Box>
        )}

        {/* 🟢 MINIATURAS DE IMAGENS */}
        {filePreviews.length > 0 && (
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", p: 1, bgcolor: "rgba(0,0,0,0.3)", borderRadius: 2, border: "1px dashed rgba(0, 224, 255, 0.2)" }}>
            {filePreviews.map((img, i) => (
              <Box key={i} sx={{ position: "relative", transition: "transform 0.2s", "&:hover": { transform: "scale(1.05)" } }}>
                <img src={img} onClick={() => { setLightboxImage(img); setZoom(1); }} style={{ width: 60, height: 60, borderRadius: 8, objectFit: "cover", border: "1px solid #00e0ff", cursor: "pointer" }} />
                <IconButton size="small" onClick={() => setFilePreviews((p) => p.filter((_, idx) => idx !== i))} sx={{ position: "absolute", top: -6, right: -6, bgcolor: "rgba(239, 68, 68, 0.9)", color: "#fff", width: 20, height: 20, "&:hover": { bgcolor: "#dc2626" } }}>
                  <CloseIcon sx={{ fontSize: 12 }} />
                </IconButton>
              </Box>
            ))}
          </Box>
        )}

        {/* 🟢 ÁREA DE DIGITAÇÃO COM BOTÃO ENVIAR DENTRO */}
        <Box component="form" onSubmit={sendMessage} sx={{ width: "100%", flexShrink: 0 }}>
          <TextField
            placeholder={chatTravado && !isMaster ? '🔒 Chat travado pelo Mestre' : 'O que você deseja fazer?...'}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (e.target.value.trim() !== "") {
                setDoc(doc(db, "typing", userEmail), { nickname: userNick, lastTyping: Date.now() }, { merge: true }).catch(() => {});
              }
            }}
            disabled={chatTravado && !isMaster}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(e); } }}
            size="medium"
            multiline
            minRows={2}
            maxRows={6}
            fullWidth
            sx={{ flex: 1, minWidth: 0 }} // 🟢 AQUI: Impede que o campo de texto seja esmagado
            InputProps={{
              sx: { 
                color: "#fff", 
                fontSize: "0.95rem",
                alignItems: "flex-start",
                padding: "12px 60px 12px 16px", // Espaço extra à direita para o botão
                bgcolor: "rgba(0, 0, 0, 0.4)",
                borderRadius: 3,
                backdropFilter: "blur(5px)",
                transition: "all 0.3s ease",
                "& fieldset": { borderColor: "rgba(0, 224, 255, 0.2)" },
                "&:hover fieldset": { borderColor: "rgba(0, 224, 255, 0.5)" },
                "&.Mui-focused fieldset": { borderColor: "#00e0ff", borderWidth: 2, boxShadow: "0 0 15px rgba(0, 224, 255, 0.15)" },
              },
              endAdornment: (
                <InputAdornment position="end" sx={{ position: "absolute", right: 12, top: '50%', transform: 'translateY(-50%)' }}>
                  <IconButton 
                    type="submit" 
                    sx={{ 
                      bgcolor: "#00e0ff", 
                      color: "#000", 
                      width: 40, height: 40, 
                      boxShadow: "0 0 15px rgba(0, 224, 255, 0.4)",
                      "&:hover": { bgcolor: "#22d3ee", transform: "scale(1.05)" },
                      transition: "all 0.2s"
                    }}
                  >
                    <SendIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
        </Box>

        {/* 🟢 LINHA DE BOTÕES UNIFICADOS (Imagem, GIF, Mestre, D10, AÇÃO) */}
        <Box sx={{ display: "flex", gap: 0.5, flexWrap: "nowrap", alignItems: "center", justifyContent: "space-between", width: "100%", opacity: chatTravado && !isMaster ? 0.5 : 1, pointerEvents: chatTravado && !isMaster ? 'none' : 'auto' }}>
          
          {/* Lado Esquerdo: Mídia e Botões do Mestre */}
          <Box sx={{ display: "flex", gap: 0.5, alignItems: "center", flexWrap: "nowrap" }}>
            <Tooltip title="Enviar Imagem">
              <IconButton component="label" sx={{ color: "#00e0ff", bgcolor: "rgba(0, 224, 255, 0.1)", border: "1px solid rgba(0, 224, 255, 0.2)", borderRadius: 2, p: 1, "&:hover": { bgcolor: "rgba(0, 224, 255, 0.2)", boxShadow: "0 0 10px rgba(0,224,255,0.3)" } }}>
                <ImageIcon fontSize="small" />
                <input hidden type="file" accept="image/*" multiple onChange={handleFileChange} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Buscar GIF">
              <IconButton onClick={() => { setGifResults([]); setGifOffset(0); setGifHasMore(true); setGifSearch(""); setGifOpen(true); searchGifs("", 0); }} sx={{ color: "#a855f7", bgcolor: "rgba(168, 85, 247, 0.1)", border: "1px solid rgba(168, 85, 247, 0.2)", borderRadius: 2, p: 1, "&:hover": { bgcolor: "rgba(168, 85, 247, 0.2)", boxShadow: "0 0 10px rgba(168,85,247,0.3)" } }}>
                <GifBoxIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            {/* BOTÕES DO MESTRE AQUI */}
            {isMaster && (
              <>
                <FormControlLabel
                  control={<Checkbox checked={modoSecreto} onChange={(e) => setModoSecreto(e.target.checked)} size="small" sx={{ color: '#ef4444', '&.Mui-checked': { color: '#ef4444' } }} />}
                  label={<Typography variant="caption" sx={{ color: '#ef4444', fontWeight: 'bold' }}>🔒 Secreto</Typography>}
                  sx={{ m: 0, ml: 1 }}
                />
                <Button variant="outlined" size="small" onClick={() => setSessaoDialogOpen(true)}
                  sx={{
                    bgcolor: travaSessao.sessaoAtiva ? 'rgba(76, 175, 80, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: travaSessao.sessaoAtiva ? '#4caf50' : '#ef4444',
                    border: `1px solid ${travaSessao.sessaoAtiva ? '#4caf50' : '#ef4444'}`,
                    fontWeight: 'bold', fontSize: '0.7rem', height: 40,
                    animation: travaSessao.sessaoAtiva ? 'pulseGreen 2s infinite' : 'none',
                    "&:hover": { bgcolor: travaSessao.sessaoAtiva ? 'rgba(76, 175, 80, 0.2)' : 'rgba(239, 68, 68, 0.2)' }
                  }}>
                  {travaSessao.sessaoAtiva ? `🟢 SESSÃO (${tempoDecorrido})` : '⏹️ SEM SESSÃO'}
                </Button>
              </>
            )}
          </Box>

          {/* Lado Direito: Dados e Ação */}
          <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "nowrap", flexShrink: 0 }}> {/* 🟢 ALINHAMENTO CENTRAL E SEM ENCOLHER */}
            <Tooltip title="Rolar D10">
              <Button variant="outlined" size="small" onClick={(e) => setDiceAnchor(e.currentTarget)} sx={{ color: "#e2e8f0", borderColor: "rgba(255,255,255,0.2)", borderRadius: 2, height: 40, px: 2, bgcolor: "rgba(255,255,255,0.05)", "&:hover": { borderColor: "#00e0ff", bgcolor: "rgba(0,224,255,0.1)" } }}>
                D10
              </Button>
            </Tooltip>
            <Tooltip title="Rolar 1D100">
              <Button variant="outlined" size="small" onClick={() => quickRollDice(1, 100)} sx={{ color: "#e2e8f0", borderColor: "rgba(255,255,255,0.2)", borderRadius: 2, height: 40, px: 2, bgcolor: "rgba(255,255,255,0.05)", "&:hover": { borderColor: "#00e0ff", bgcolor: "rgba(0,224,255,0.1)" } }}>
                1D100
              </Button>
            </Tooltip>
            {/* 🟢 BOTÃO COM BOLINHA MANUAL (ALINHAMENTO GARANTIDO) */}
            <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', height: 40, flexShrink: 0, width: '150px', justifyContent: 'center' }}>
              <Button 
                variant="contained" 
                size="medium" 
                onClick={() => { 
                  setAcaoPericia2(""); 
                  if (acoesPendentes.length > 0) {
                    setAcaoModo("reacao"); setAcaoPendenteId(acoesPendentes[0].id); setAcaoTipo("");
                  } else {
                    setAcaoModo("acao"); setAcaoPendenteId(null); setAcaoAlvo(""); setAcaoTipo("");
                  }
                  setAcaoOpen(true); 
                }}
                sx={{ 
                  bgcolor: acoesPendentes.length > 0 ? '#ef4444' : '#9c27b0', 
                  boxShadow: acoesPendentes.length > 0 ? '0 0 15px rgba(239, 68, 68, 0.5)' : '0 0 15px rgba(156, 39, 176, 0.4)',
                  borderRadius: 2, 
                  height: 40, 
                  width: "100%", // 🟢 Força o botão a respeitar os 130px do container
                  padding: 0, // 🟢 Remove o espaço vazio nas laterais
                  fontWeight: "bold", 
                  color: "#fff",
                  whiteSpace: "nowrap", 
                  flexShrink: 0,
                  minWidth: "0px", // 🟢 REMOVIDO O "max-content" QUE FURAVA O LAYOUT
                  fontSize: acoesPendentes.length > 0 ? "0.75rem" : "0.875rem", // 🟢 Fonte menor para caber REAÇÃO
                  "&:hover": { bgcolor: acoesPendentes.length > 0 ? '#dc2626' : '#7b1fa2', transform: "scale(1.02)" },
                  transition: "all 0.2s"
                }}
              >
                {acoesPendentes.length > 0 ? `⚔️ REAÇÃO` : '⚔️ AÇÃO'}
              </Button>

              {/* Bolinha Vermelha manual (Não ocupa espaço no layout) */}
              {acoesPendentes.length > 0 && (
                <Box sx={{
                  position: 'absolute',
                  top: -8, // 🟢 Posição correta no topo direito
                  right: -8, // 🟢 Posição correta no topo direito
                  bgcolor: '#ef4444',
                  color: '#fff',
                  borderRadius: '50%',
                  width: 20, 
                  height: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.7rem',
                  fontWeight: 'bold',
                  pointerEvents: 'none',
                  zIndex: 10,
                  border: '2px solid #0f172a'
                }}>
                  {acoesPendentes.length}
                </Box>
              )}
            </Box>
            <Menu anchorEl={diceAnchor} open={openDiceMenu} onClose={() => setDiceAnchor(null)} PaperProps={{ sx: { maxHeight: 320, width: 220 } }}>
              <Grid container spacing={1} sx={{ p: 1 }}>
                {Array.from({ length: 30 }, (_, i) => i + 1).map((n) => (
                  <Grid item xs={4} key={n}>
                    <Button fullWidth size="small" variant="outlined" onClick={() => { quickRollDice(n, 10); setDiceAnchor(null); }}>
                      {n}D10
                    </Button>
                  </Grid>
                ))}
              </Grid>
            </Menu>
          </Box>
        </Box>
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

      {lightboxImage && createPortal(
        <div
          onClick={() => setLightboxImage(null)}
          onWheel={(e) => {
            e.preventDefault();
            setZoom((z) => Math.min(Math.max(z + e.deltaY * -0.001, 0.5), 5));
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.92)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2147483647,
            cursor: "zoom-out",
          }}
        >
          <LightboxImage src={lightboxImage} zoom={zoom} setZoom={setZoom} />
          <button
            onClick={(e) => { e.stopPropagation(); setLightboxImage(null); }}
            style={{
              position: "fixed",
              top: 16,
              right: 16,
              background: "rgba(0,0,0,0.6)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: 8,
              width: 40,
              height: 40,
              fontSize: 20,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 2147483647,
            }}
            title="Fechar"
          >
            ✕
          </button>
        </div>,
        document.body
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
          sx={{ position: "absolute", bottom: 160, right: 16, zIndex: 2000 }} // 🟢 CORREÇÃO: Subido mais um pouco
        >
          <Badge badgeContent={unreadCount} color="error">
            <ArrowDownwardIcon />
          </Badge>
        </Fab>
      </Fade>
       {/* 🟢 MODAL DE AÇÃO - VERSÃO COMPLETA */}
      <Dialog 
        open={acaoOpen} 
        onClose={() => { setAcaoOpen(false); setJogadoresConjunto([]); }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: "#0f172a",
            border: "2px solid #9c27b0",
            borderRadius: 3,
            boxShadow: "0 0 30px rgba(156, 39, 176, 0.3)",
            background: "linear-gradient(145deg, #0f172a, #1a1a2e)",
          }
        }}
      >
        <DialogTitle sx={{ 
          color: '#fff', 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          borderBottom: '2px solid #9c27b0',
          pb: 2,
          background: 'linear-gradient(90deg, rgba(156,39,176,0.2), transparent)',
        }}>
          <span style={{ fontSize: '1.8rem' }}>{acaoModo === "reacao" ? '🛡️' : '⚔️'}</span>
          <Typography component="div" variant="h5" sx={{ fontWeight: 'bold', color: '#9c27b0' }}>
            {acaoModo === "reacao" ? 'REAGIR' : 'AÇÃO'}
          </Typography>
          <Typography component="div" variant="subtitle1" sx={{ color: '#94a3b8', ml: 1 }}>
            - {fichaJogador?.nome || userNick}
          </Typography>
          {acoesPendentes.length > 0 && acaoModo === "reacao" && (
            <Chip 
              label={`⚔️ ${fichasMap[acoesPendentes[0]?.atacante]?.nome || 'Atacante'}`}
              size="small"
              sx={{ 
                bgcolor: '#ef4444', 
                color: '#fff',
                fontWeight: 'bold',
                ml: 'auto',
                animation: 'pulse 1.5s infinite'
              }}
            />
          )}
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            
            {/* 🟢 TEXTO INFORMATIVO */}
            <Box sx={{ 
              p: 1.5, 
              bgcolor: 'rgba(156, 39, 176, 0.1)', 
              borderRadius: 2,
              border: '1px solid rgba(156, 39, 176, 0.3)',
              mb: 1
            }}>
              <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>
                ℹ️ <strong style={{ color: '#9c27b0' }}>Atributo</strong> e 
                <strong style={{ color: '#ff9800' }}> VD (Valor Mínimo para Sucesso)</strong> são obrigatórios.
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                Todos os demais campos são <strong style={{ color: '#4caf50' }}>opcionais</strong>.
              </Typography>
            </Box>

            {/* 🟢 JOGADA EM CONJUNTO */}
            <Paper sx={{
              p: 2,
              bgcolor: jogadoresConjunto.length > 0 ? 'rgba(76,175,80,0.14)' : 'rgba(76,175,80,0.03)',
              border: jogadoresConjunto.length > 0 ? '1px solid #4caf50' : '1px dashed #4caf5044',
              borderRadius: 2,
              opacity: jogadoresConjunto.length > 0 ? 1 : 0.55,
              boxShadow: jogadoresConjunto.length > 0 ? '0 0 20px rgba(76,175,80,0.35), inset 0 0 30px rgba(76,175,80,0.08)' : 'none',
              transition: 'all 0.35s ease',
              animation: jogadoresConjunto.length > 0 ? 'glowConjunto 2.5s ease-in-out infinite' : 'none',
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="subtitle2" sx={{ color: '#4caf50', fontWeight: 'bold' }}>
                  🎭 JOGADA EM CONJUNTO
                </Typography>
                <Typography variant="caption" sx={{ color: jogadoresConjunto.length > 0 ? '#4caf50' : '#64748b', fontWeight: 'bold' }}>
                  {jogadoresConjunto.length === 0 ? 'Sozinho' : `${jogadoresConjunto.length + 1} participantes`}
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mb: 1.5 }}>
                Adicione outros personagens. Cada um rola sua própria ação e os <strong style={{ color: '#4caf50' }}>valores são somados</strong> no total final.
              </Typography>

              {/* Jogador principal */}
              <Box sx={{ mb: 1, p: 1, bgcolor: '#0f172a', borderRadius: 1, border: '1px solid #4caf5066', display: 'flex', alignItems: 'center', gap: 1 }}>
                <span style={{ fontSize: '1rem' }}>⭐</span>
                <Typography sx={{ color: '#4caf50', fontWeight: 'bold', fontSize: '0.8rem' }}>
                  {fichaJogador?.nome || userNick}
                </Typography>
                <Chip label="Principal" size="small" sx={{ bgcolor: '#4caf5022', color: '#4caf50', fontSize: '0.55rem', height: 16, ml: 'auto' }} />
              </Box>

              {/* Selects progressivos */}
              {[...jogadoresConjunto, ""].map((email, i) => {
                const isLast = i === jogadoresConjunto.length;
                return (
                  <FormControl key={i} fullWidth size="small" sx={{ mt: 0.5 }}>
                    <Select
                      value={email}
                      displayEmpty
                      renderValue={(selected) => {
                        if (!selected) {
                          return (
                            <em style={{ color: '#64748b', fontSize: '0.8rem' }}>
                              {isLast ? "➕ Adicionar personagem..." : "Selecione..."}
                            </em>
                          );
                        }
                        const ficha = fichasMap[selected];
                        const corAura = CORES_AURA_CHAT[ficha?.tipoAura] || '#4caf50';
                        return (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: corAura, boxShadow: `0 0 6px ${corAura}` }} />
                            <Typography sx={{ color: corAura, fontWeight: 'bold', fontSize: '0.8rem' }}>
                              {ficha?.nome || selected}
                            </Typography>
                          </Box>
                        );
                      }}
                      onChange={(e) => {
                        if (isLast) {
                          if (e.target.value) setJogadoresConjunto([...jogadoresConjunto, e.target.value]);
                        } else {
                          if (e.target.value === "") {
                            setJogadoresConjunto(jogadoresConjunto.filter((_, k) => k !== i));
                          } else {
                            const novos = [...jogadoresConjunto];
                            novos[i] = e.target.value;
                            setJogadoresConjunto(novos);
                          }
                        }
                      }}
                      sx={{
                        color: '#fff',
                        bgcolor: '#1a1a2e',
                        fontSize: '0.8rem',
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: isLast ? '#4caf5066' : '#334155' },
                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#4caf50' },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#4caf50' },
                        '& .MuiSelect-icon': { color: '#4caf50' },
                        '& .MuiSelect-select': { display: 'flex', alignItems: 'center', minHeight: 22 },
                      }}
                      MenuProps={{ PaperProps: { sx: { bgcolor: '#1a1a2e', color: '#fff', maxHeight: 350 } } }}
                    >
                      {isLast ? (
                        <MenuItem value="" disabled>
                          <em style={{ color: '#64748b' }}>➕ Adicionar personagem...</em>
                        </MenuItem>
                      ) : (
                        <MenuItem value="">
                          <em style={{ color: '#ef4444' }}>❌ Remover</em>
                        </MenuItem>
                      )}

                      <MenuItem disabled sx={{ opacity: 1, borderBottom: '1px solid #4caf50', mt: 0.5 }}>
                        <Typography variant="caption" sx={{ color: '#4caf50', fontWeight: 'bold' }}>
                          ── PERSONAGENS DO JOGADOR ──
                        </Typography>
                      </MenuItem>

                      {Object.entries(fichasMap)
                        .filter(([e, d]) => (d.tipoFicha || "PJ") === "PJ" && e !== jogadorSelecionadoEmail && !jogadoresConjunto.includes(e))
                        .map(([e, d]) => {
                          const corAura = CORES_AURA_CHAT[d.tipoAura] || '#4caf50';
                          return (
                            <MenuItem key={e} value={e} sx={{ pl: 3 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: corAura, boxShadow: `0 0 6px ${corAura}` }} />
                                <Typography sx={{ color: corAura, fontSize: '0.8rem', fontWeight: 'bold' }}>{d.nome || e}</Typography>
                              </Box>
                            </MenuItem>
                          );
                        })}

                      {Object.entries(fichasMap).some(([e, d]) => d.tipoFicha === "PM" && e !== jogadorSelecionadoEmail && !jogadoresConjunto.includes(e)) && (
                        <MenuItem disabled sx={{ opacity: 1, borderBottom: '1px solid #ff9800', mt: 1 }}>
                          <Typography variant="caption" sx={{ color: '#ff9800', fontWeight: 'bold' }}>
                            ── PERSONAGENS DO MESTRE ──
                          </Typography>
                        </MenuItem>
                      )}

                      {Object.entries(fichasMap)
                        .filter(([e, d]) => d.tipoFicha === "PM" && e !== jogadorSelecionadoEmail && !jogadoresConjunto.includes(e))
                        .map(([e, d]) => {
                          const corAura = CORES_AURA_CHAT[d.tipoAura] || '#ff9800';
                          return (
                            <MenuItem key={e} value={e} sx={{ pl: 3 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: corAura, boxShadow: `0 0 6px ${corAura}` }} />
                                <Typography sx={{ color: corAura, fontSize: '0.8rem', fontWeight: 'bold' }}>{d.nome || e}</Typography>
                              </Box>
                            </MenuItem>
                          );
                        })}
                    </Select>
                  </FormControl>
                );
              })}
            </Paper>
            
 {/* Atributo */}
<FormControl fullWidth size="small">
  <InputLabel sx={{ color: '#94a3b8', '&.Mui-focused': { color: '#9c27b0' } }}>Atributo</InputLabel>
  <Select
    value={acaoAtributo}
    onChange={(e) => setAcaoAtributo(e.target.value)}
    sx={{ 
      color: '#fff', 
      bgcolor: '#1a1a2e',
      borderRadius: 2,
      '& .MuiOutlinedInput-notchedOutline': { borderColor: '#334155', transition: 'border-color 0.3s' },
      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#9c27b0' },
      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#9c27b0', borderWidth: 2 },
      '& .MuiSelect-icon': { color: '#9c27b0' },
      transition: 'all 0.3s',
    }}
    MenuProps={{
      PaperProps: { 
        sx: { 
          bgcolor: "#1a1a2e", 
          color: "#fff",
          borderRadius: 2,
          border: '1px solid #9c27b0',
          boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
          mt: 1,
          '& .MuiMenuItem-root': {
            color: '#94a3b8',
            transition: 'all 0.2s',
            '&:hover': { bgcolor: 'rgba(156,39,176,0.2)', color: '#fff' },
            '&.Mui-selected': { bgcolor: 'rgba(156,39,176,0.3)', color: '#9c27b0', fontWeight: 'bold' },
            '&.Mui-disabled': { color: '#4caf50', fontWeight: 'bold', opacity: 1 }
          }
        } 
      },
      anchorOrigin: { vertical: "bottom", horizontal: "left" },
      transformOrigin: { vertical: "top", horizontal: "left" },
    }}
  >
<MenuItem value="">Nenhum</MenuItem>
{fichaJogador?.atributos && ORDEM_ATRIBUTOS.map((k) => {
  const v = fichaJogador.atributos[k] || 1;
  const valorSeguro = Math.max(1, Number(v) || 1);
  const cor = getCorAtributo(k);
  return (
    <MenuItem
      key={k}
      value={k}
      disabled={valorSeguro < 1}
      sx={{ color: `${cor} !important`, fontWeight: 'bold' }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{
          width: 10, height: 10, borderRadius: '50%',
          bgcolor: cor,
          boxShadow: `0 0 6px ${cor}`,
          flexShrink: 0,
        }} />
        <Typography sx={{ color: cor, fontWeight: 'bold', fontSize: '0.85rem' }}>
          {k.charAt(0).toUpperCase() + k.slice(1)} ({valorSeguro})
        </Typography>
      </Box>
    </MenuItem>
  );
})}
  </Select>
</FormControl>
{/* Perícia */}
<FormControl fullWidth size="small">
  <InputLabel sx={{ color: '#94a3b8', '&.Mui-focused': { color: '#00e0ff' } }}>Perícia</InputLabel>
  <Select
    value={acaoPericia}
    onChange={(e) => setAcaoPericia(e.target.value)}
    sx={{ 
      color: '#fff', 
      bgcolor: '#1a1a2e',
      borderRadius: 2,
      '& .MuiOutlinedInput-notchedOutline': { borderColor: '#334155', transition: 'border-color 0.3s' },
      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#00e0ff' },
      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#00e0ff', borderWidth: 2 },
      '& .MuiSelect-icon': { color: '#00e0ff' },
      transition: 'all 0.3s',
    }}
    MenuProps={{
      PaperProps: { 
        sx: { 
          bgcolor: "#1a1a2e", 
          color: "#fff",
          borderRadius: 2,
          border: '1px solid #00e0ff',
          boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
          mt: 1,
          '& .MuiMenuItem-root': {
            color: '#94a3b8',
            transition: 'all 0.2s',
            '&:hover': { bgcolor: 'rgba(0,224,255,0.2)', color: '#fff' },
            '&.Mui-selected': { bgcolor: 'rgba(0,224,255,0.3)', color: '#00e0ff', fontWeight: 'bold' },
            '&.Mui-disabled': { color: '#4caf50', fontWeight: 'bold', opacity: 1 }
          }
        } 
      },
      anchorOrigin: { vertical: "bottom", horizontal: "left" },
      transformOrigin: { vertical: "top", horizontal: "left" },
    }}
  >
    <MenuItem value="">Nenhuma</MenuItem>
    {fichaJogador?.pericias && ORDEM_PERICIAS.map((k) => {
      const v = fichaJogador.pericias[k] || 0;
      const temNivel = Number(v) >= 1;
      const cor = temNivel ? (CORES_PERICIA[k] || "#22c55e") : "#64748b";
      return (
        <MenuItem
          key={k}
          value={k}
          disabled={!temNivel}
          sx={{
            color: `${cor} !important`,
            fontWeight: temNivel ? 'bold' : 'normal',
            '&.Mui-disabled': { color: `${cor} !important`, opacity: temNivel ? 1 : 0.5 },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
            <Box sx={{
              width: 10, height: 10, borderRadius: '50%',
              bgcolor: cor,
              boxShadow: temNivel ? `0 0 6px ${cor}` : 'none',
              flexShrink: 0,
            }} />
            <Typography sx={{
              color: cor,
              fontWeight: temNivel ? 'bold' : 'normal',
              fontSize: '0.85rem',
            }}>
              {k.charAt(0).toUpperCase() + k.slice(1)} ({v})
            </Typography>
            {temNivel && (
              <Chip
                label="✓ ATIVA"
                size="small"
                sx={{
                  bgcolor: '#22c55e22',
                  color: '#22c55e',
                  height: 16,
                  fontSize: '0.55rem',
                  fontWeight: 'bold',
                  ml: 'auto',
                }}
              />
            )}
          </Box>
        </MenuItem>
      );
    })}
  </Select>
</FormControl>
{/* 🟢 Segunda Perícia (aparece se Aura = nível 5 E perícia principal for Aura) */}
{fichaJogador?.pericias?.aura >= 5 && acaoPericia === "aura" && (
  <FormControl fullWidth size="small">
    <InputLabel sx={{ color: '#94a3b8', '&.Mui-focused': { color: '#ffd700' } }}>Segunda Perícia (Aura Nv.5)</InputLabel>
    <Select
      value={acaoPericia2}
      onChange={(e) => setAcaoPericia2(e.target.value)}
      sx={{ 
        color: '#fff', 
        bgcolor: '#1a1a2e',
        borderRadius: 2,
        border: '1px solid rgba(255,215,0,0.3)',
        '& .MuiOutlinedInput-notchedOutline': { borderColor: '#ffd70044', transition: 'border-color 0.3s' },
        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#ffd700' },
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#ffd700', borderWidth: 2 },
        '& .MuiSelect-icon': { color: '#ffd700' },
        transition: 'all 0.3s',
      }}
      MenuProps={{
        PaperProps: { 
          sx: { 
            bgcolor: "#1a1a2e", 
            color: "#fff",
            borderRadius: 2,
            border: '1px solid #ffd700',
            boxShadow: '0 8px 30px rgba(255,215,0,0.2)',
            mt: 1,
            '& .MuiMenuItem-root': {
              color: '#94a3b8',
              transition: 'all 0.2s',
              '&:hover': { bgcolor: 'rgba(255,215,0,0.2)', color: '#fff' },
              '&.Mui-selected': { bgcolor: 'rgba(255,215,0,0.3)', color: '#ffd700', fontWeight: 'bold' }
            }
          } 
        },
        anchorOrigin: { vertical: "bottom", horizontal: "left" },
        transformOrigin: { vertical: "top", horizontal: "left" },
      }}
    >
      <MenuItem value="">Nenhuma</MenuItem>
    {fichaJogador?.pericias && ORDEM_PERICIAS.map((k) => {
      const v = fichaJogador.pericias[k] || 0;
      const temNivel = Number(v) >= 1 && k !== acaoPericia;
      const cor = temNivel ? (CORES_PERICIA[k] || "#22c55e") : "#64748b";
      return (
        <MenuItem
          key={k}
          value={k}
          disabled={!temNivel}
          sx={{
            color: `${cor} !important`,
            fontWeight: temNivel ? 'bold' : 'normal',
            '&.Mui-disabled': { color: `${cor} !important`, opacity: temNivel ? 1 : 0.5 },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{
              width: 10, height: 10, borderRadius: '50%',
              bgcolor: cor,
              boxShadow: temNivel ? `0 0 6px ${cor}` : 'none',
              flexShrink: 0,
            }} />
            <Typography sx={{
              color: cor,
              fontWeight: temNivel ? 'bold' : 'normal',
              fontSize: '0.85rem',
            }}>
              {k.charAt(0).toUpperCase() + k.slice(1)} ({v})
            </Typography>
          </Box>
        </MenuItem>
      );
    })}
    </Select>
  </FormControl>
)}
{/* Item */}
<FormControl fullWidth size="small">
  <InputLabel sx={{ color: '#94a3b8', '&.Mui-focused': { color: '#ff9800' } }}>Item</InputLabel>
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
      
      if (itemEncontrado?.consumivel && itemEncontrado.consumivel !== "Nenhum") {
        setAcaoItemConsumivel(true);
        setAcaoConsumivelTipo(itemEncontrado.consumivel);
        setAcaoConsumivelValor(itemEncontrado.consumivelValor || 0);
        setAcaoConsumivelPercentual(itemEncontrado.consumivelPercentual || 100);
        setAcaoItemDado(0);
        setAcaoTipo("");
      } else {
        setAcaoItemConsumivel(false);
        setAcaoConsumivelTipo("");
        setAcaoConsumivelValor(0);
        setAcaoConsumivelPercentual(100);
      }
    }}
    sx={{ 
      color: '#fff', 
      bgcolor: '#1a1a2e',
      borderRadius: 2,
      '& .MuiOutlinedInput-notchedOutline': { borderColor: '#334155', transition: 'border-color 0.3s' },
      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#ff9800' },
      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#ff9800', borderWidth: 2 },
      '& .MuiSelect-icon': { color: '#ff9800' },
      transition: 'all 0.3s',
    }}
    MenuProps={{
      PaperProps: { 
        sx: { 
          bgcolor: "#1a1a2e", 
          color: "#fff",
          borderRadius: 2,
          border: '1px solid #ff9800',
          boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
          mt: 1,
          maxHeight: 400,
          '& .MuiMenuItem-root': {
            color: '#94a3b8',
            transition: 'all 0.2s',
            '&:hover': { bgcolor: 'rgba(255,152,0,0.2)', color: '#fff' },
            '&.Mui-selected': { bgcolor: 'rgba(255,152,0,0.3)', color: '#ff9800', fontWeight: 'bold' },
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: 0.5,
            padding: '8px 16px',
          }
        } 
      },
      anchorOrigin: { vertical: "bottom", horizontal: "left" },
      transformOrigin: { vertical: "top", horizontal: "left" },
    }}
    renderValue={(selected) => {
      const todosItens = [
        ...(fichaJogador?.equipamentos || []),
        ...(fichaJogador?.vestes || []),
        ...(fichaJogador?.diversos || [])
      ];
      const item = todosItens.find(it => it.nome === selected);
      if (!item) return <Typography sx={{ color: '#94a3b8' }}>{selected}</Typography>;
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography sx={{ color: '#fff', fontWeight: 'bold' }}>{item.nome}</Typography>
          <Chip label={`🎲${item.dado || 1}`} size="small" sx={{ bgcolor: '#1e3a5f', color: '#00e0ff', height: 20, fontSize: '0.6rem' }} />
          <Chip label={`🔧${item.durabilidade || 100}%`} size="small" sx={{ bgcolor: '#1e3a5f', color: '#ff9800', height: 20, fontSize: '0.6rem' }} />
          {item.tipoDano && item.tipoDano !== "Nenhum" && (
            <Chip label={`🗡️${item.tipoDano}`} size="small" sx={{ bgcolor: '#1e3a5f', color: '#ef4444', height: 20, fontSize: '0.6rem' }} />
          )}
          {item.consumivel && item.consumivel !== "Nenhum" && (
            <Chip label={`🧪${item.consumivel}`} size="small" sx={{ bgcolor: '#1e3a5f', color: '#4caf50', height: 20, fontSize: '0.6rem' }} />
          )}
        </Box>
      );
    }}
  >
    <MenuItem value="">Nenhum</MenuItem>
    {[
      ...(fichaJogador?.equipamentos || []).map(it => ({ ...it, categoria: 'equipamentos' })),
      ...(fichaJogador?.vestes || []).map(it => ({ ...it, categoria: 'vestes' })),
      ...(fichaJogador?.diversos || []).map(it => ({ ...it, categoria: 'diversos' }))
    ].filter(n => n.nome).map((item, i) => (
      <MenuItem key={i} value={item.nome}>
        <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ color: '#fff', fontWeight: 'bold' }}>{item.nome}</Typography>
            <Chip label={`🎲${item.dado || 1}`} size="small" sx={{ bgcolor: '#1e3a5f', color: '#00e0ff', height: 18, fontSize: '0.55rem' }} />
            <Chip label={`🔧${item.durabilidade || 100}%`} size="small" sx={{ bgcolor: '#1e3a5f', color: '#ff9800', height: 18, fontSize: '0.55rem' }} />
            {item.tipoDano && item.tipoDano !== "Nenhum" && (
              <Chip label={`🗡️${item.tipoDano}`} size="small" sx={{ bgcolor: '#1e3a5f', color: '#ef4444', height: 18, fontSize: '0.55rem' }} />
            )}
            {item.consumivel && item.consumivel !== "Nenhum" && (
              <Chip label={`🧪${item.consumivel}`} size="small" sx={{ bgcolor: '#1e3a5f', color: '#4caf50', height: 18, fontSize: '0.55rem' }} />
            )}
          </Box>
          <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.6rem' }}>
            [{item.categoria}] {item.quantidade > 1 ? `Qtd: ${item.quantidade}` : ''}
          </Typography>
        </Box>
      </MenuItem>
    ))}
  </Select>
</FormControl>
{/* 🟢 SELEÇÃO DE ALVO */}
{acaoModo === "acao" && (
  <FormControl fullWidth size="small">
    <InputLabel sx={{ color: '#94a3b8', '&.Mui-focused': { color: '#4caf50' } }}>🎯 Alvo</InputLabel>
    <Select
      value={acaoAlvo}
      onChange={(e) => setAcaoAlvo(e.target.value)}
      sx={{ 
        color: '#fff', 
        bgcolor: '#1a1a2e',
        borderRadius: 2,
        '& .MuiOutlinedInput-notchedOutline': { borderColor: '#334155', transition: 'border-color 0.3s' },
        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#4caf50' },
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#4caf50', borderWidth: 2 },
        '& .MuiSelect-icon': { color: '#4caf50' },
        transition: 'all 0.3s',
      }}
      MenuProps={{
        container: document.body,
        PaperProps: { 
          sx: { 
            bgcolor: "#1a1a2e", 
            color: "#fff",
            borderRadius: 2,
            border: '1px solid #4caf50',
            boxShadow: '0 8px 30px rgba(76,175,80,0.3)',
            mt: 1,
            maxHeight: 400,
            '& .MuiMenuItem-root': {
              color: '#94a3b8',
              transition: 'all 0.2s',
              '&:hover': { bgcolor: 'rgba(76,175,80,0.2)', color: '#fff' },
              '&.Mui-selected': { bgcolor: 'rgba(76,175,80,0.3)', color: '#4caf50', fontWeight: 'bold' },
              '&.Mui-disabled': { opacity: 1, cursor: 'default' }
            }
          } 
        },
        anchorOrigin: { vertical: "bottom", horizontal: "left" },
        transformOrigin: { vertical: "top", horizontal: "left" },
      }}
    >
      <MenuItem value="">Nenhum (ação livre)</MenuItem>
      
      <MenuItem disabled sx={{ opacity: 1, borderBottom: '1px solid #4caf50', mt: 0.5 }}>
        <Typography variant="caption" sx={{ color: '#4caf50', fontWeight: 'bold' }}>
          ── PERSONAGENS DO JOGADOR ──
        </Typography>
      </MenuItem>
      
      {Object.entries(fichasMap)
        .filter(([email, data]) => email !== userEmail && (data.tipoFicha || "PJ") === "PJ")
        .map(([email, data]) => {
          const corAura = CORES_AURA_CHAT[data.tipoAura] || '#4caf50';
          return (
            <MenuItem key={email} value={email} sx={{ pl: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: corAura, boxShadow: `0 0 8px ${corAura}` }} />
                <Typography sx={{ color: corAura, fontSize: '0.85rem', fontWeight: 'bold' }}>
                  {data.nome || email}
                </Typography>
                {data.tipoAura && (
                  <Chip label={data.tipoAura} size="small" sx={{ bgcolor: `${corAura}22`, color: corAura, height: 18, fontSize: '0.55rem' }} />
                )}
              </Box>
            </MenuItem>
          );
        })}
      
      {Object.entries(fichasMap).some(([email, data]) => email !== userEmail && data.tipoFicha === "PM") && (
        <MenuItem disabled sx={{ opacity: 1, borderBottom: '1px solid #ff9800', mt: 1 }}>
          <Typography variant="caption" sx={{ color: '#ff9800', fontWeight: 'bold' }}>
            ── PERSONAGENS DO MESTRE ──
          </Typography>
        </MenuItem>
      )}
      
      {Object.entries(fichasMap)
        .filter(([email, data]) => email !== userEmail && data.tipoFicha === "PM")
        .map(([email, data]) => {
          const corAura = CORES_AURA_CHAT[data.tipoAura] || '#ff9800';
          return (
            <MenuItem key={email} value={email} sx={{ pl: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: corAura, boxShadow: `0 0 8px ${corAura}` }} />
                <Typography sx={{ color: corAura, fontSize: '0.85rem', fontWeight: 'bold' }}>
                  {data.nome || email}
                </Typography>
                {data.tipoAura && (
                  <Chip label={data.tipoAura} size="small" sx={{ bgcolor: `${corAura}22`, color: corAura, height: 18, fontSize: '0.55rem' }} />
                )}
              </Box>
            </MenuItem>
          );
        })}
    </Select>
  </FormControl>
)}
            {/* 🟢 TIPO DE AÇÃO */}
            {acaoModo === "acao" && (
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
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
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={acaoTipo === "furtividade"}
                      onChange={() => {
                        if (acaoTipo === "furtividade") {
                          setAcaoTipo("");
                        } else {
                          const agilidade = fichaJogador?.atributos?.agilidade || 0;
                          const furtividade = fichaJogador?.pericias?.furtividade || 0;
                          
                          if (agilidade < 1) {
                            alert("❌ Você precisa de pelo menos 1 ponto em AGILIDADE para usar Furtividade!");
                            return;
                          }
                          if (furtividade < 1) {
                            alert("❌ Você precisa de pelo menos 1 ponto em FURTIVIDADE para usar Furtividade!");
                            return;
                          }
                          
                          setAcaoAtributo("agilidade");
                          setAcaoPericia("furtividade");
                          setAcaoPericia2("");
                          setAcaoTipo("furtividade");
                        }
                      }}
                      sx={{ color: '#3b82f6' }}
                    />
                  }
                  label="🌫️ Furtividade"
                  sx={{ color: '#fff' }}
                />
              </Box>
            )}

            {/* 🟢 TIPO DE REAÇÃO */}
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
            
 {/* Habilidade */}
<FormControl fullWidth size="small">
  <InputLabel sx={{ color: '#94a3b8', '&.Mui-focused': { color: '#a855f7' } }}>Habilidade</InputLabel>
  <Select
    value={acaoHabilidadeSelecionada}
    onChange={(e) => {
      const nomeHabilidade = e.target.value;
      setAcaoHabilidadeSelecionada(nomeHabilidade);
      
      if (nomeHabilidade && fichaJogador?.habilidades) {
        const hab = fichaJogador.habilidades.find(h => h.nome === nomeHabilidade);
        setAcaoHabilidadeDado(hab?.dado || 0);
        setAcaoHabilidadeCustoPE(hab?.custoPE || 0);
      } else {
        setAcaoHabilidadeDado(0);
        setAcaoHabilidadeCustoPE(0);
      }
    }}
    sx={{ 
      color: '#fff', 
      bgcolor: '#1a1a2e',
      borderRadius: 2,
      '& .MuiOutlinedInput-notchedOutline': { borderColor: '#334155', transition: 'border-color 0.3s' },
      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#a855f7' },
      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#a855f7', borderWidth: 2 },
      '& .MuiSelect-icon': { color: '#a855f7' },
      transition: 'all 0.3s',
    }}
    MenuProps={{
      PaperProps: { 
        sx: { 
          bgcolor: "#1a1a2e", 
          color: "#fff",
          borderRadius: 2,
          border: '1px solid #a855f7',
          boxShadow: '0 8px 30px rgba(168,85,247,0.3)',
          mt: 1,
          maxHeight: 400,
          '& .MuiMenuItem-root': {
            color: '#94a3b8',
            transition: 'all 0.2s',
            '&:hover': { bgcolor: 'rgba(168,85,247,0.2)', color: '#fff' },
            '&.Mui-selected': { bgcolor: 'rgba(168,85,247,0.3)', color: '#a855f7', fontWeight: 'bold' },
          }
        } 
      },
      anchorOrigin: { vertical: "bottom", horizontal: "left" },
      transformOrigin: { vertical: "top", horizontal: "left" },
    }}
    renderValue={(selected) => {
      if (!selected) return <Typography sx={{ color: '#94a3b8' }}>Nenhuma</Typography>;
      const hab = fichaJogador?.habilidades?.find(h => h.nome === selected);
      if (!hab) return <Typography sx={{ color: '#fff' }}>{selected}</Typography>;
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ color: '#fff', fontWeight: 'bold' }}>{hab.nome}</Typography>
          <Chip label={`🎲${hab.dado || 1}`} size="small" sx={{ bgcolor: '#1e3a5f', color: '#00e0ff', height: 20, fontSize: '0.6rem' }} />
          {hab.custoPE > 0 && (
            <Chip label={`⚡${hab.custoPE} PE`} size="small" sx={{ bgcolor: '#1e3a5f', color: '#facc15', height: 20, fontSize: '0.6rem' }} />
          )}
        </Box>
      );
    }}
  >
    <MenuItem value="">Nenhuma</MenuItem>
    {fichaJogador?.habilidades?.map((hab, i) => (
      <MenuItem key={i} value={hab.nome} disabled={!hab.nome}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
          <Typography sx={{ color: '#fff', fontWeight: 'bold' }}>{hab.nome || `Habilidade ${i + 1}`}</Typography>
          <Chip label={`🎲${hab.dado || 1}`} size="small" sx={{ bgcolor: '#1e3a5f', color: '#00e0ff', height: 18, fontSize: '0.55rem' }} />
          {hab.custoPE > 0 && (
            <Chip label={`⚡${hab.custoPE} PE`} size="small" sx={{ bgcolor: '#1e3a5f', color: '#facc15', height: 18, fontSize: '0.55rem' }} />
          )}
          {hab.tipoDano && hab.tipoDano !== "Nenhum" && (
            <Chip label={`🗡️${hab.tipoDano}`} size="small" sx={{ bgcolor: '#1e3a5f', color: '#ef4444', height: 18, fontSize: '0.55rem' }} />
          )}
        </Box>
      </MenuItem>
    ))}
  </Select>
</FormControl>
            
            {acaoHabilidadeSelecionada && (
              <Box>
                <Typography variant="caption" sx={{ color: '#00e0ff', display: 'block' }}>
                  ⚡ Dado da habilidade: <strong>+{acaoHabilidadeDado}d10</strong>
                </Typography>
                {acaoHabilidadeCustoPE > 0 && (
                  <Typography variant="caption" sx={{ color: '#facc15', display: 'block' }}>
                    💛 Custo de PE: <strong>{acaoHabilidadeCustoPE} PE</strong>
                  </Typography>
                )}
              </Box>
            )}
            
            {/* Debuffs */}
            <Paper sx={{ p: 2, bgcolor: '#1a1a2e', border: '1px solid #ef4444' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ color: '#ef4444' }}>
                  🔻 Debuffs
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setAcaoDebuffs([...acaoDebuffs, { id: Date.now(), valor: 1 }])}
                  sx={{ 
                    color: '#ef4444', 
                    borderColor: '#ef4444',
                    fontSize: '0.65rem',
                    minWidth: 'auto',
                    px: 1
                  }}
                >
                  + Adicionar
                </Button>
              </Box>
              
              {acaoDebuffs.length === 0 && (
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  Nenhum debuff.
                </Typography>
              )}
              
              {acaoDebuffs.map((debuff, idx) => (
                <Box key={debuff.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Typography variant="caption" sx={{ color: '#ef4444', minWidth: 60 }}>
                    Debuff {idx + 1}:
                  </Typography>
                  <TextField
                    size="small"
                    type="number"
                    value={debuff.valor}
                    onChange={(e) => {
                      const val = Math.min(100, Math.max(1, Number(e.target.value) || 1));
                      const novos = [...acaoDebuffs];
                      novos[idx] = { ...novos[idx], valor: val };
                      setAcaoDebuffs(novos);
                    }}
                    InputProps={{ 
                      inputProps: { min: 1, max: 100 },
                      sx: { color: '#ef4444', fontSize: '0.8rem' }
                    }}
                    sx={{ 
                      width: 70, 
                      bgcolor: '#0f172a',
                      '& input': { textAlign: 'center' }
                    }}
                  />
                  <Typography variant="caption" sx={{ color: '#64748b' }}>
                    (-{debuff.valor})
                  </Typography>
                  <IconButton 
                    size="small" 
                    onClick={() => setAcaoDebuffs(acaoDebuffs.filter((_, i) => i !== idx))}
                    sx={{ color: '#ef4444', ml: 'auto' }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
              
              {acaoDebuffs.length > 0 && (
                <Typography variant="caption" sx={{ color: '#ef4444', display: 'block', mt: 1, fontWeight: 'bold' }}>
                  🔻 Total: -{acaoDebuffs.reduce((soma, d) => soma + d.valor, 0)}
                </Typography>
              )}
            </Paper>
            
            {/* Bônus */}
            <Paper sx={{ p: 2, bgcolor: '#1a1a2e', border: '1px solid #4caf50' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ color: '#4caf50' }}>
                  🟢 Bônus
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setAcaoBonusVariavelLista([...acaoBonusVariavelLista, { id: Date.now(), valor: 1 }])}
                  sx={{ 
                    color: '#4caf50', 
                    borderColor: '#4caf50',
                    fontSize: '0.65rem',
                    minWidth: 'auto',
                    px: 1
                  }}
                >
                  + Adicionar
                </Button>
              </Box>
              
              {acaoBonusVariavelLista.length === 0 && (
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  Nenhum bônus.
                </Typography>
              )}
              
              {acaoBonusVariavelLista.map((bonus, idx) => (
                <Box key={bonus.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Typography variant="caption" sx={{ color: '#4caf50', minWidth: 60 }}>
                    Bônus {idx + 1}:
                  </Typography>
                  <TextField
                    size="small"
                    type="number"
                    value={bonus.valor}
                    onChange={(e) => {
                      const val = Math.min(100, Math.max(1, Number(e.target.value) || 1));
                      const novos = [...acaoBonusVariavelLista];
                      novos[idx] = { ...novos[idx], valor: val };
                      setAcaoBonusVariavelLista(novos);
                    }}
                    InputProps={{ 
                      inputProps: { min: 1, max: 100 },
                      sx: { color: '#4caf50', fontSize: '0.8rem' }
                    }}
                    sx={{ 
                      width: 70, 
                      bgcolor: '#0f172a',
                      '& input': { textAlign: 'center' }
                    }}
                  />
                  <Typography variant="caption" sx={{ color: '#64748b' }}>
                    (+{bonus.valor})
                  </Typography>
                  <IconButton 
                    size="small" 
                    onClick={() => setAcaoBonusVariavelLista(acaoBonusVariavelLista.filter((_, i) => i !== idx))}
                    sx={{ color: '#4caf50', ml: 'auto' }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
              
              {acaoBonusVariavelLista.length > 0 && (
                <Typography variant="caption" sx={{ color: '#4caf50', display: 'block', mt: 1, fontWeight: 'bold' }}>
                  🟢 Total: +{acaoBonusVariavelLista.reduce((soma, b) => soma + b.valor, 0)}
                </Typography>
              )}
            </Paper>

            {/* VD */}
            <TextField
              label="🎯 VMS (Valor Mínimo de Sucesso)"
              type="number"
              size="small"
              value={acaoValorDificuldade}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (val >= 1 && val <= 1000) {
                  setAcaoValorDificuldade(val);
                } else if (e.target.value === "") {
                  setAcaoValorDificuldade("");
                }
              }}
              InputProps={{ 
                inputProps: { min: 1, max: 1000 },
                sx: { color: '#fff' } 
              }}
              sx={{ bgcolor: '#1a1a2e', '& .MuiInputLabel-root': { color: '#94a3b8' } }}
              helperText="Definido pelo Mestre. Sucesso se resultado ≥ VD (1-1000)."
              FormHelperTextProps={{ sx: { color: '#64748b' } }}
            />
            
            {/* Configuração de Consumível */}
            {acaoItemConsumivel && (
              <Paper sx={{ p: 2, bgcolor: '#1e1a2e', border: '1px solid #4caf50' }}>
                <Typography variant="subtitle2" sx={{ color: '#4caf50', mb: 1 }}>
                  🧪 Item Consumível: {acaoItem}
                </Typography>
                <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>
                  Tipo: <strong style={{ color: '#fff' }}>{acaoConsumivelTipo}</strong> | 
                  Valor: <strong style={{ color: '#fff' }}>{acaoConsumivelValor}</strong>
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                    Percentual: <strong style={{ color: '#4caf50' }}>{acaoConsumivelPercentual}%</strong>
                  </Typography>
                  <Slider
                    value={acaoConsumivelPercentual}
                    onChange={(e, val) => setAcaoConsumivelPercentual(val)}
                    min={1}
                    max={100}
                    step={1}
                    size="small"
                    sx={{ color: '#4caf50' }}
                  />
                </Box>
                <Typography variant="caption" sx={{ color: '#facc15' }}>
                  Efeito: <strong>+{Math.round(acaoConsumivelValor * acaoConsumivelPercentual / 100)} {acaoConsumivelTipo}</strong>
                </Typography>
                {acaoConsumivelPercentual < 100 && (
                  <Typography variant="caption" sx={{ color: '#ff9800', display: 'block' }}>
                    ⚠️ Consumo parcial - durabilidade reduzida
                  </Typography>
                )}
              </Paper>
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
                    ⚡ Custo: {acaoEmbuicao * 5} PE
                  </Typography>
                )}
                {acaoHabilidadeCustoPE > 0 && (
                  <Typography variant="caption" sx={{ color: '#facc15', display: 'block' }}>
                    💛 Custo Habilidade: {acaoHabilidadeCustoPE} PE
                  </Typography>
                )}
                {acaoDebuffs.length > 0 && (
                  <Typography variant="caption" sx={{ color: '#ef4444', display: 'block' }}>
                    🔻 Penalidade: -{acaoDebuffs.reduce((soma, d) => soma + d.valor, 0)}
                  </Typography>
                )}
                {acaoBonusVariavelLista.length > 0 && (
                  <Typography variant="caption" sx={{ color: '#4caf50', display: 'block' }}>
                    🟢 Bônus: +{acaoBonusVariavelLista.reduce((soma, b) => soma + b.valor, 0)}
                  </Typography>
                )}
                {acaoValorDificuldade && (
                  <Typography variant="caption" sx={{ color: '#ff9800', display: 'block' }}>
                    🎯 VD: {acaoValorDificuldade}
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
            
      {/* 🟢 MODAL CONTROLE DE SESSÃO */}
      <Dialog
        open={sessaoDialogOpen}
        onClose={() => setSessaoDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: "#0f172a",
            border: "2px solid #00e0ff",
            borderRadius: 3,
            background: "linear-gradient(145deg, #0f172a, #1a1a2e)",
            boxShadow: "0 0 40px rgba(0, 224, 255, 0.3)",
          },
        }}
      >
        <DialogTitle sx={{
          color: '#00e0ff',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          borderBottom: '1px solid rgba(0, 224, 255, 0.3)',
          background: 'linear-gradient(90deg, rgba(0,224,255,0.15), transparent)',
        }}>
          <span style={{ fontSize: '1.5rem' }}>🎬</span>
          <Typography variant="h6" sx={{ fontWeight: 'bold', flex: 1 }}>
            Controle de Sessão
          </Typography>
          <IconButton onClick={() => setSessaoDialogOpen(false)} sx={{ color: '#94a3b8' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Paper sx={{
            p: 2,
            mb: 2,
            bgcolor: travaSessao.sessaoAtiva ? 'rgba(76,175,80,0.1)' : 'rgba(239,68,68,0.1)',
            border: `2px solid ${travaSessao.sessaoAtiva ? '#4caf50' : '#ef4444'}`,
            borderRadius: 2,
            textAlign: 'center',
          }}>
            <Typography variant="h6" sx={{
              color: travaSessao.sessaoAtiva ? '#4caf50' : '#ef4444',
              fontWeight: 'bold',
              mb: 0.5,
            }}>
              {travaSessao.sessaoAtiva ? '🟢 SESSÃO EM ANDAMENTO' : '⏹️ NENHUMA SESSÃO ATIVA'}
            </Typography>
            {travaSessao.sessaoAtiva && (
              <>
                <Typography variant="body2" sx={{ color: '#94a3b8', mb: 0.5 }}>
                  Título: <strong style={{ color: '#fff' }}>{travaSessao.sessaoTitulo}</strong>
                </Typography>
                <Typography variant="h4" sx={{
                  color: '#00e0ff',
                  fontFamily: 'monospace',
                  fontWeight: 'bold',
                  textShadow: '0 0 20px rgba(0, 224, 255, 0.5)',
                }}>
                  {tempoDecorrido}
                </Typography>
              </>
            )}
          </Paper>

          <TextField
            fullWidth
            size="small"
            label="Título da Sessão"
            value={tituloSessaoTemp}
            onChange={(e) => setTituloSessaoTemp(e.target.value)}
            disabled={travaSessao.sessaoAtiva}
            placeholder="Ex: A Queda de Auraxia"
            sx={{
              mb: 2,
              '& .MuiOutlinedInput-root': {
                color: '#fff',
                '& fieldset': { borderColor: '#334155' },
                '&:hover fieldset': { borderColor: '#00e0ff' },
                '&.Mui-focused fieldset': { borderColor: '#00e0ff' },
              },
              '& .MuiInputLabel-root': { color: '#94a3b8' },
              '& .MuiInputLabel-root.Mui-focused': { color: '#00e0ff' },
            }}
          />

          <Typography variant="subtitle2" sx={{ color: '#00e0ff', mb: 1, fontWeight: 'bold' }}>
            🔒 Travar funcionalidades:
          </Typography>
          <Paper sx={{
            p: 1.5,
            bgcolor: '#1a1a2e',
            border: '1px solid #334155',
            borderRadius: 2,
            mb: 2,
          }}>
            {[
              { key: 'chat', label: '💬 Chat Principal' },
              { key: 'grid', label: '🗺️ Grid de Batalha' },
              { key: 'cassino', label: '🎰 Cassino' },
              { key: 'rede', label: '🌐 Rede' },
              { key: 'roleta', label: '🎲 Roleta' },
              { key: 'eventos', label: '⭐ Eventos Aleatórios' },
              { key: 'comercio', label: '🏪 Comércio' },
            ].map((mod) => (
              <FormControlLabel
                key={mod.key}
                control={
                  <Checkbox
                    checked={!!travaSessao.travados[mod.key]}
                    onChange={() => toggleTravaModulo(mod.key)}
                    sx={{
                      color: '#4caf50',
                      '&.Mui-checked': { color: '#ef4444' },
                    }}
                  />
                }
                label={
                  <Typography sx={{
                    color: travaSessao.travados[mod.key] ? '#ef4444' : '#4caf50',
                    fontWeight: 'bold',
                    fontSize: '0.85rem',
                  }}>
                    {mod.label}
                  </Typography>
                }
                sx={{ display: 'flex', width: '100%', mr: 0 }}
              />
            ))}
          </Paper>

          <Typography variant="subtitle2" sx={{ color: '#00e0ff', mb: 1, fontWeight: 'bold' }}>
            📜 Histórico de Sessões ({travaSessao.historico.length})
          </Typography>
          <Box sx={{
            maxHeight: 200,
            overflowY: 'auto',
            pr: 1,
            '&::-webkit-scrollbar': { width: '6px' },
            '&::-webkit-scrollbar-thumb': { background: '#00e0ff44', borderRadius: '10px' },
          }}>
            {travaSessao.historico.length === 0 && (
              <Typography variant="caption" sx={{ color: '#64748b', display: 'block', textAlign: 'center', py: 2 }}>
                Nenhuma sessão registrada.
              </Typography>
            )}
            {travaSessao.historico.map((h, i) => (
              <Paper key={i} sx={{
                p: 1.5,
                mb: 0.5,
                bgcolor: '#1a1a2e',
                border: '1px solid #334155',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ color: '#fff', fontWeight: 'bold' }}>
                    {h.titulo}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>
                    📅 {h.inicio ? new Date(h.inicio).toLocaleString('pt-BR') : '—'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#4caf50', fontWeight: 'bold', fontFamily: 'monospace' }}>
                    ⏱️ {h.duracao}
                  </Typography>
                </Box>
                {isMaster && (
                  <IconButton size="small" onClick={() => apagarRegistroSessao(i)} sx={{ color: '#ef4444' }}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )}
              </Paper>
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(0, 224, 255, 0.3)' }}>
          {isMaster && !travaSessao.sessaoAtiva && (
            <Button
              variant="contained"
              onClick={iniciarSessao}
              sx={{
                bgcolor: '#4caf50',
                fontWeight: 'bold',
                flex: 1,
                '&:hover': { bgcolor: '#388e3c' },
              }}
            >
              🎬 INICIAR SESSÃO
            </Button>
          )}
          {isMaster && travaSessao.sessaoAtiva && (
            <Button
              variant="contained"
              onClick={encerrarSessao}
              sx={{
                bgcolor: '#ef4444',
                fontWeight: 'bold',
                flex: 1,
                '&:hover': { bgcolor: '#dc2626' },
              }}
            >
              ⏹️ ENCERRAR SESSÃO
            </Button>
          )}
          <Button onClick={() => setSessaoDialogOpen(false)} sx={{ color: '#94a3b8' }}>
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
                {deathSegundaChanceAtiva && (
                  <Button
                    variant="contained"
                    onClick={() => {
                      setDeathSegundaChanceAtiva(false);
                      setDadosMorte([]);
                      setResultadoMorte(null);
                      rolarDadoMorte();
                    }}
                    sx={{ mt: 2, bgcolor: '#4caf50', '&:hover': { bgcolor: '#388e3c' } }}
                  >
                    🏃‍♂️ Usar Segunda-Chance
                  </Button>
                )}
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