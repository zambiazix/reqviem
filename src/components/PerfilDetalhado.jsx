import React, { useState, useEffect } from "react";
import {
  Box, Paper, Typography, IconButton, Button, Chip, Divider,
  LinearProgress, Avatar, Badge, Tooltip, TextField
} from "@mui/material";
import { styled, keyframes } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import FavoriteIcon from "@mui/icons-material/Favorite";
import BoltIcon from "@mui/icons-material/Bolt";
import ShieldIcon from "@mui/icons-material/Shield";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import SentimentSatisfiedAltIcon from "@mui/icons-material/SentimentSatisfiedAlt";
import { db } from "../firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";

// ==================== ANIMAÇÕES ====================
const brilhoAvatar = keyframes`
  0% { box-shadow: 0 0 10px rgba(0, 224, 255, 0.3); }
  50% { box-shadow: 0 0 25px rgba(0, 224, 255, 0.7), 0 0 50px rgba(0, 224, 255, 0.3); }
  100% { box-shadow: 0 0 10px rgba(0, 224, 255, 0.3); }
`;

const pulseStatus = keyframes`
  0% { opacity: 0.7; }
  50% { opacity: 1; }
  100% { opacity: 0.7; }
`;

const floatIn = keyframes`
  0% { transform: translateY(20px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
`;

// ==================== COMPONENTES ESTILIZADOS ====================
const ProfileContainer = styled(Paper)(({ theme }) => ({
  background: "linear-gradient(145deg, #1a1a2e 0%, #0f172a 100%)",
  border: "1px solid rgba(0, 224, 255, 0.15)",
  backdropFilter: "blur(10px)",
  borderRadius: "16px",
  overflow: "hidden",
  animation: `${floatIn} 0.4s ease-out`,
}));

const AvatarGlow = styled(Avatar)({
  border: "3px solid rgba(0, 224, 255, 0.5)",
  animation: `${brilhoAvatar} 3s ease-in-out infinite`,
  cursor: "pointer",
  transition: "transform 0.3s ease",
  "&:hover": {
    transform: "scale(1.05)",
  },
});

const StatusBar = styled(LinearProgress)(({ color, bgcolor }) => ({
  height: 10,
  borderRadius: 5,
  backgroundColor: bgcolor || "rgba(255,255,255,0.1)",
  "& .MuiLinearProgress-bar": {
    backgroundColor: color || "#00e0ff",
    borderRadius: 5,
    transition: "transform 0.4s ease",
  },
}));

const AttributeChip = styled(Chip)(({ ativo }) => ({
  background: ativo
    ? "linear-gradient(135deg, rgba(0,224,255,0.2), rgba(0,224,255,0.1))"
    : "rgba(255,255,255,0.03)",
  border: ativo
    ? "1px solid rgba(0,224,255,0.4)"
    : "1px solid rgba(255,255,255,0.05)",
  color: ativo ? "#00e0ff" : "#94a3b8",
  fontWeight: ativo ? "bold" : "normal",
  "&:hover": {
    background: "rgba(0,224,255,0.15)",
  },
}));

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
        touchAction: "none",
      }}
    />
  );
}

// ==================== COMPONENTE PRINCIPAL ====================
function PerfilDetalhado({ 
  isMaster = false, 
  visible = false, 
  onClose = () => {}, 
  currentUserEmail = null,
  fichaData = null,
  fichasMap = {}
}) {
  const [lightboxImage, setLightboxImage] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [expandirHistoria, setExpandirHistoria] = useState(false);
  const [expandirAnotacoes, setExpandirAnotacoes] = useState(false);
  const [editandoBiografia, setEditandoBiografia] = useState(false);
  const [biografiaTemp, setBiografiaTemp] = useState("");
  const [salvando, setSalvando] = useState(false);

  if (!visible || !fichaData) return null;

  // Dados da ficha
  const nome = fichaData.nome || "Sem nome";
  const email = currentUserEmail || "sem_email@reqviemrpg.com";
  const avatarUrl = fichaData.imagemPersonagem || fichaData.imagens?.[0] || "";
  const hp = fichaData.hp || 0;
  const hpMax = fichaData.hpMax || 100;
  const pe = fichaData.pe || 0;
  const peMax = fichaData.peMax || 100;
  const nivel = fichaData.nivel || 1;
  const classe = fichaData.classe || "Aventureiro";
  const raca = fichaData.raca || "Desconhecida";
  const biografia = fichaData.biografia || fichaData.historia || "";
  const anotacoes = fichaData.anotacoes || "";

  // Atributos
  const atributos = {
    forca: fichaData.forca || 0,
    destreza: fichaData.destreza || 0,
    constituicao: fichaData.constituicao || 0,
    inteligencia: fichaData.inteligencia || 0,
    sabedoria: fichaData.sabedoria || 0,
    carisma: fichaData.carisma || 0,
  };

  // Status
  const status = fichaData.status || [];
  const defeitos = fichaData.defeitos || [];
  const vantagens = fichaData.vantagens || [];

  const hpPorcentagem = hpMax > 0 ? (hp / hpMax) * 100 : 0;
  const pePorcentagem = peMax > 0 ? (pe / peMax) * 100 : 0;

  const getHpColor = () => {
    if (hpPorcentagem > 60) return "#4caf50";
    if (hpPorcentagem > 30) return "#ff9800";
    return "#f44336";
  };

  const getPeColor = () => {
    if (pePorcentagem > 60) return "#2196f3";
    if (pePorcentagem > 30) return "#ff9800";
    return "#f44336";
  };

  // Salvar biografia
  const salvarBiografia = async () => {
    if (!currentUserEmail) return;
    setSalvando(true);
    try {
      const ref = doc(db, "fichas", currentUserEmail);
      await setDoc(ref, { biografia: biografiaTemp }, { merge: true });
      setEditandoBiografia(false);
    } catch (error) {
      console.error("Erro ao salvar biografia:", error);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <>
      {visible && (
        <ProfileContainer
          elevation={10}
          sx={{
            position: "fixed",
            top: 80,
            right: 280,
            width: 380,
            maxHeight: "85vh",
            zIndex: 200,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* CABEÇALHO COM AVATAR E NOME */}
          <Box
            sx={{
              p: 2.5,
              textAlign: "center",
              background: "linear-gradient(180deg, rgba(0,224,255,0.1) 0%, transparent 100%)",
              borderBottom: "1px solid rgba(0,224,255,0.1)",
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "flex-end", mb: -2 }}>
              <IconButton onClick={onClose} size="small" sx={{ color: "#ef4444", '&:hover': { bgcolor: 'rgba(239,68,68,0.1)' } }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>

            <Badge
              overlap="circular"
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              badgeContent={
                <Box sx={{ 
                  bgcolor: hpPorcentagem > 60 ? "#4caf50" : hpPorcentagem > 30 ? "#ff9800" : "#f44336",
                  width: 12, height: 12, borderRadius: '50%', border: '2px solid #1a1a2e',
                  animation: hpPorcentagem < 30 ? `${pulseStatus} 1.5s ease-in-out infinite` : 'none'
                }} />
              }
            >
              <AvatarGlow
                src={avatarUrl}
                sx={{ width: 100, height: 100, fontSize: 40 }}
                onClick={() => {
                  if (avatarUrl) {
                    setLightboxImage(avatarUrl);
                    setZoom(1);
                  }
                }}
              >
                {nome[0]?.toUpperCase()}
              </AvatarGlow>
            </Badge>

            <Typography variant="h6" sx={{ color: "#fff", fontWeight: "bold", mt: 1.5, fontSize: "1.1rem" }}>
              {nome}
            </Typography>
            <Typography variant="caption" sx={{ color: "#94a3b8", display: "block", fontSize: "0.7rem" }}>
              {raca} • {classe} • Nível {nivel}
            </Typography>
          </Box>

          {/* CONTEÚDO SCROLLAVEL */}
          <Box
            sx={{
              flex: 1,
              overflowY: "auto",
              p: 2,
              "&::-webkit-scrollbar": { width: "4px" },
              "&::-webkit-scrollbar-thumb": {
                background: "rgba(0,224,255,0.2)",
                borderRadius: "10px",
              },
            }}
          >
            {/* BARRAS DE VIDA E ENERGIA */}
            <Box sx={{ mb: 2.5 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <FavoriteIcon sx={{ fontSize: 14, color: "#f44336" }} />
                  <Typography variant="caption" sx={{ color: "#fff", fontWeight: "bold", fontSize: "0.7rem" }}>
                    HP
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: "#fff", fontWeight: "bold", fontSize: "0.7rem" }}>
                  {hp} / {hpMax}
                </Typography>
              </Box>
              <StatusBar 
                variant="determinate" 
                value={hpPorcentagem} 
                color={getHpColor()}
                bgcolor="rgba(244,67,54,0.15)"
              />

              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5, mt: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <BoltIcon sx={{ fontSize: 14, color: "#2196f3" }} />
                  <Typography variant="caption" sx={{ color: "#fff", fontWeight: "bold", fontSize: "0.7rem" }}>
                    PE
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: "#fff", fontWeight: "bold", fontSize: "0.7rem" }}>
                  {pe} / {peMax}
                </Typography>
              </Box>
              <StatusBar 
                variant="determinate" 
                value={pePorcentagem} 
                color={getPeColor()}
                bgcolor="rgba(33,150,243,0.15)"
              />
            </Box>

            <Divider sx={{ borderColor: "rgba(0,224,255,0.1)", mb: 2 }} />

            {/* ATRIBUTOS */}
            <Typography variant="subtitle2" sx={{ color: "#00e0ff", mb: 1.5, fontSize: "0.8rem", fontWeight: "bold" }}>
              ⚡ Atributos
            </Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, mb: 2.5 }}>
              {Object.entries(atributos).map(([nome, valor]) => (
                <AttributeChip
                  key={nome}
                  ativo={valor > 0}
                  label={`${nome.charAt(0).toUpperCase() + nome.slice(1)}: ${valor}`}
                  size="small"
                  icon={getAttributeIcon(nome)}
                  sx={{ justifyContent: "flex-start" }}
                />
              ))}
            </Box>

            <Divider sx={{ borderColor: "rgba(0,224,255,0.1)", mb: 2 }} />

            {/* STATUS E CONDIÇÕES */}
            {status.length > 0 && (
              <>
                <Typography variant="subtitle2" sx={{ color: "#fbbf24", mb: 1, fontSize: "0.75rem", fontWeight: "bold" }}>
                  🎯 Status Ativos
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: 2 }}>
                  {status.map((s, i) => (
                    <Chip
                      key={i}
                      label={typeof s === "string" ? s : s.nome || s.efeito || "Status"}
                      size="small"
                      sx={{
                        bgcolor: "rgba(251,191,36,0.15)",
                        color: "#fbbf24",
                        border: "1px solid rgba(251,191,36,0.3)",
                        fontSize: "0.65rem",
                      }}
                    />
                  ))}
                </Box>
                <Divider sx={{ borderColor: "rgba(0,224,255,0.1)", mb: 2 }} />
              </>
            )}

            {/* BIOGRAFIA COM EXPANSÃO */}
            <Box sx={{ mb: 2.5 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                <Typography variant="subtitle2" sx={{ color: "#a855f7", fontWeight: "bold", fontSize: "0.8rem" }}>
                  📖 Biografia
                </Typography>
                <Box sx={{ display: "flex", gap: 0.5 }}>
                  {isMaster && !editandoBiografia && (
                    <IconButton
                      size="small"
                      onClick={() => {
                        setBiografiaTemp(biografia);
                        setEditandoBiografia(true);
                      }}
                      sx={{ color: "#a855f7" }}
                    >
                      <EditIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  )}
                  {(biografia.length > 150) && !editandoBiografia && (
                    <IconButton
                      size="small"
                      onClick={() => setExpandirHistoria(!expandirHistoria)}
                      sx={{ color: "#a855f7" }}
                    >
                      {expandirHistoria ? <ExpandLessIcon sx={{ fontSize: 16 }} /> : <ExpandMoreIcon sx={{ fontSize: 16 }} />}
                    </IconButton>
                  )}
                </Box>
              </Box>

              {editandoBiografia ? (
                <Box>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    value={biografiaTemp}
                    onChange={(e) => setBiografiaTemp(e.target.value)}
                    placeholder="Escreva a biografia do personagem..."
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        color: '#fff',
                        fontSize: '0.75rem',
                        '& fieldset': { borderColor: 'rgba(168,85,247,0.3)' },
                        '&:hover fieldset': { borderColor: 'rgba(168,85,247,0.5)' },
                        '&.Mui-focused fieldset': { borderColor: '#a855f7' },
                      },
                      '& .MuiOutlinedInput-input': {
                        '&::placeholder': { color: '#64748b' },
                      },
                    }}
                  />
                  <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={salvarBiografia}
                      disabled={salvando}
                      startIcon={<SaveIcon sx={{ fontSize: 14 }} />}
                      sx={{ bgcolor: "#a855f7", fontSize: "0.65rem", '&:hover': { bgcolor: "#9333ea" } }}
                    >
                      Salvar
                    </Button>
                    <Button
                      size="small"
                      onClick={() => setEditandoBiografia(false)}
                      sx={{ color: "#94a3b8", fontSize: "0.65rem" }}
                    >
                      Cancelar
                    </Button>
                  </Box>
                </Box>
              ) : biografia ? (
                <Box>
                  <Typography
                    variant="body2"
                    sx={{
                      color: "#e2e8f0",
                      fontSize: "0.75rem",
                      lineHeight: 1.5,
                      whiteSpace: "pre-line",
                      maxHeight: expandirHistoria ? "none" : 80,
                      overflow: "hidden",
                      position: "relative",
                      wordBreak: "break-word",
                      ...(expandirHistoria ? {} : {
                        maskImage: "linear-gradient(to bottom, black 60%, transparent 100%)",
                        WebkitMaskImage: "linear-gradient(to bottom, black 60%, transparent 100%)",
                      }),
                    }}
                  >
                    {biografia}
                  </Typography>
                  {!expandirHistoria && biografia.length > 150 && (
                    <Button
                      size="small"
                      onClick={() => setExpandirHistoria(true)}
                      sx={{ color: "#a855f7", fontSize: "0.6rem", mt: 0.5, textTransform: "none" }}
                    >
                      Ler mais...
                    </Button>
                  )}
                </Box>
              ) : (
                <Typography variant="caption" sx={{ color: "#64748b", fontStyle: "italic", fontSize: "0.7rem" }}>
                  Nenhuma biografia escrita...
                </Typography>
              )}
            </Box>

            <Divider sx={{ borderColor: "rgba(0,224,255,0.1)", mb: 2 }} />

            {/* VANTAGENS */}
            {vantagens.length > 0 && (
              <>
                <Typography variant="subtitle2" sx={{ color: "#4caf50", mb: 1, fontSize: "0.75rem", fontWeight: "bold" }}>
                  ✨ Vantagens
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: 2 }}>
                  {vantagens.map((v, i) => (
                    <Chip
                      key={i}
                      label={typeof v === "string" ? v : v.nome || "Vantagem"}
                      size="small"
                      sx={{
                        bgcolor: "rgba(76,175,80,0.15)",
                        color: "#4caf50",
                        border: "1px solid rgba(76,175,80,0.3)",
                        fontSize: "0.65rem",
                      }}
                    />
                  ))}
                </Box>
                <Divider sx={{ borderColor: "rgba(0,224,255,0.1)", mb: 2 }} />
              </>
            )}

            {/* DEFEITOS */}
            {defeitos.length > 0 && (
              <>
                <Typography variant="subtitle2" sx={{ color: "#ef4444", mb: 1, fontSize: "0.75rem", fontWeight: "bold" }}>
                  ⚠️ Defeitos
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: 2 }}>
                  {defeitos.map((d, i) => (
                    <Chip
                      key={i}
                      label={typeof d === "string" ? d : d.nome || "Defeito"}
                      size="small"
                      sx={{
                        bgcolor: "rgba(239,68,68,0.15)",
                        color: "#ef4444",
                        border: "1px solid rgba(239,68,68,0.3)",
                        fontSize: "0.65rem",
                      }}
                    />
                  ))}
                </Box>
              </>
            )}
          </Box>
        </ProfileContainer>
      )}

      {/* LIGHTBOX */}
      {lightboxImage && (
        <Box
          onClick={() => setLightboxImage(null)}
          sx={{
            position: "fixed",
            inset: 0,
            bgcolor: "rgba(0,0,0,0.92)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999999,
          }}
        >
          <LightboxImage src={lightboxImage} zoom={zoom} setZoom={setZoom} />
        </Box>
      )}
    </>
  );
}

// Helper para ícones dos atributos
function getAttributeIcon(atributo) {
  const icons = {
    forca: <ShieldIcon sx={{ fontSize: 12 }} />,
    destreza: <AutoFixHighIcon sx={{ fontSize: 12 }} />,
    constituicao: <FavoriteIcon sx={{ fontSize: 12 }} />,
    inteligencia: <AutoFixHighIcon sx={{ fontSize: 12 }} />,
    sabedoria: <SentimentSatisfiedAltIcon sx={{ fontSize: 12 }} />,
    carisma: <SentimentSatisfiedAltIcon sx={{ fontSize: 12 }} />,
  };
  return icons[atributo] || null;
}

export default React.memo(PerfilDetalhado);