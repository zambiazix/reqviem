import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Box, Paper, Typography, IconButton, Button, TextField } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { db } from "../firebaseConfig";
import { doc, setDoc, onSnapshot } from "firebase/firestore";

const CORES = [
  "#e74c3c", "#f39c12", "#2ecc71", "#3498db", "#9b59b6",
  "#e91e63", "#ff6b6b", "#00cec9", "#fdcb6e", "#a29bfe",
  "#fd79a8", "#00b894", "#e17055", "#6c5ce7", "#fdcb6e",
];

function RoletaSincronizada({ isMaster, onClose }) {
  const [posicao, setPosicao] = useState({ x: 300, y: 100 });
  const [tamanho, setTamanho] = useState({ width: 550, height: 550 });
  const [minimizado, setMinimizado] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const [redimensionando, setRedimensionando] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

  const [opcoes, setOpcoes] = useState([
    "Ataque Surpresa", "Tesouro Raro", "Emboscada", "Aliado Inesperado",
    "Armadilha Mágica", "Portal Dimensional", "Chuva de Meteoros", "Bênção Divina"
  ]);
  const [girando, setGirando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [anguloAtual, setAnguloAtual] = useState(0);
  const [editando, setEditando] = useState(false);
  const [novoItem, setNovoItem] = useState("");
  const canvasRef = useRef(null);
  const animacaoRef = useRef(null);

  // 🟢 ESCUTAR MUDANÇAS DO FIRESTORE
  useEffect(() => {
    const ref = doc(db, "roleta", "dados");
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        if (d.opcoes && JSON.stringify(d.opcoes) !== JSON.stringify(opcoes)) {
          setOpcoes(d.opcoes);
        }
        if (d.girando && d.anguloAlvo !== undefined) {
          setGirando(true);
          setResultado(null);
          iniciarAnimacao(d.anguloAlvo, d.resultadoFinal);
        }
        if (d.resultado && !d.girando) {
          setGirando(false);
          setResultado(d.resultado);
        }
      }
    });
    return () => unsub();
  }, []);

  // 🟢 FUNÇÃO DE ANIMAÇÃO SUAVE
  const iniciarAnimacao = useCallback((anguloAlvoGraus, resultadoFinal) => {
    if (animacaoRef.current) cancelAnimationFrame(animacaoRef.current);
    
    const inicio = performance.now();
    const duracao = 4000; // 4 segundos
    const voltas = 8; // 8 voltas completas
    const anguloFinal = (voltas * 360) + anguloAlvoGraus;
    
    const animar = (agora) => {
      const decorrido = agora - inicio;
      const progresso = Math.min(decorrido / duracao, 1);
      
      // Easing: easeOutQuart (desacelera suavemente no final)
      const eased = 1 - Math.pow(1 - progresso, 4);
      const angulo = anguloFinal * eased;
      
      setAnguloAtual(angulo % 360);
      
      if (progresso < 1) {
        animacaoRef.current = requestAnimationFrame(animar);
      } else {
        // Animação terminou
        setAnguloAtual(anguloAlvoGraus);
        setGirando(false);
        if (resultadoFinal) setResultado(resultadoFinal);
        setDoc(doc(db, "roleta", "dados"), { girando: false, resultado: resultadoFinal, anguloAlvo: null }, { merge: true });
      }
    };
    
    animacaoRef.current = requestAnimationFrame(animar);
  }, []);

  // 🟢 CALCULAR ÍNDICE EXATO BASEADO NO ÂNGULO
  const calcularIndiceExato = (anguloGraus, totalOpcoes) => {
    const fatia = 360 / totalOpcoes;
    // A seta está no topo (12h = 270° no canvas)
    // Ajusta para que o ângulo 0 fique no topo
    const anguloNormalizado = ((360 - (anguloGraus % 360)) % 360);
    const indice = Math.floor(anguloNormalizado / fatia) % totalOpcoes;
    return indice;
  };

  // 🟢 GIRAR ROLETA
  const girarRoleta = async () => {
    if (girando || opcoes.length === 0) return;
    
    // Escolhe um índice aleatório
    const indiceSorteado = Math.floor(Math.random() * opcoes.length);
    const fatia = 360 / opcoes.length;
    
    // 🟢 CORREÇÃO: A seta está no TOPO do canvas (12h)
    // No canvas, o TOPO corresponde a -90° (ou 270°)
    // Para a fatia 'i' cair na seta:
    // O centro da fatia 'i' está em: (i * fatia + fatia/2) graus a partir do ângulo inicial
    // A seta está em 270° (topo)
    // Então: anguloAlvo = 270° - (i * fatia + fatia/2)
    // Normalizado para 0-360:
    const anguloCentroFatia = (indiceSorteado * fatia) + (fatia / 2);
    const anguloAlvo = ((270 - anguloCentroFatia) + 360) % 360;
    const resultadoFinal = opcoes[indiceSorteado];
    
    setGirando(true);
    setResultado(null);
    
    // Salva no Firestore para sincronizar
    await setDoc(doc(db, "roleta", "dados"), {
      opcoes,
      girando: true,
      anguloAlvo,
      resultadoFinal,
      inicioGiro: Date.now(),
    }, { merge: true });
    
    // Inicia animação localmente
    iniciarAnimacao(anguloAlvo, resultadoFinal);
  };

  // 🟢 DESENHAR ROLETA
  const desenharRoleta = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const raio = Math.min(cx, cy) - 15;
    
    ctx.clearRect(0, 0, w, h);
    
    if (opcoes.length === 0) {
      ctx.fillStyle = "#1e293b";
      ctx.beginPath();
      ctx.arc(cx, cy, raio, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = "#64748b";
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Sem opções", cx, cy);
      return;
    }
    
    const fatia = (2 * Math.PI) / opcoes.length;
    
    // Desenha cada fatia
    opcoes.forEach((op, i) => {
      const inicio = i * fatia + (anguloAtual * Math.PI) / 180;
      const fim = inicio + fatia;
      
      // Cor da fatia
      const cor = CORES[i % CORES.length];
      
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, raio, inicio, fim);
      ctx.closePath();
      
      // Gradiente para dar profundidade
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, raio);
      grad.addColorStop(0, cor);
      grad.addColorStop(1, cor + "cc");
      ctx.fillStyle = grad;
      ctx.fill();
      
      // Borda
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      
      // Texto
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(inicio + fatia / 2);
      ctx.textAlign = "right";
      ctx.fillStyle = "#fff";
      
      // Tamanho da fonte adaptativo
      const fontSize = opcoes.length > 12 ? 10 : opcoes.length > 8 ? 12 : 14;
      ctx.font = `bold ${fontSize}px sans-serif`;
      
      const texto = op.length > 20 ? op.substring(0, 18) + ".." : op;
      ctx.fillText(texto, raio - 20, 5);
      ctx.restore();
    });
    
    // Círculo central
    const gradCentro = ctx.createRadialGradient(cx, cy, 0, cx, cy, 25);
    gradCentro.addColorStop(0, "#fff");
    gradCentro.addColorStop(1, "#ddd");
    ctx.beginPath();
    ctx.arc(cx, cy, 20, 0, 2 * Math.PI);
    ctx.fillStyle = gradCentro;
    ctx.fill();
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // 🟢 SETA NO TOPO (12h) - FORA do canvas, desenhada no container
    // A seta é desenhada via Box sobreposto, não no canvas
  }, [opcoes, anguloAtual]);

  useEffect(() => {
    desenharRoleta();
  }, [desenharRoleta]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (arrastando) setPosicao({ x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y });
      if (redimensionando) setTamanho({ width: Math.max(400, resizeStartRef.current.width + (e.clientX - resizeStartRef.current.x)), height: Math.max(400, resizeStartRef.current.height + (e.clientY - resizeStartRef.current.y)) });
    };
    const handleMouseUp = () => { setArrastando(false); setRedimensionando(false); };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => { window.removeEventListener("mousemove", handleMouseMove); window.removeEventListener("mouseup", handleMouseUp); };
  }, [arrastando, redimensionando]);

  const adicionarOpcao = async () => {
    if (!novoItem.trim()) return;
    const nova = [...opcoes, novoItem.trim()];
    setOpcoes(nova);
    await setDoc(doc(db, "roleta", "dados"), { opcoes: nova, girando: false, resultado: null }, { merge: true });
    setNovoItem("");
  };

  const removerOpcao = async (idx) => {
    const nova = opcoes.filter((_, i) => i !== idx);
    setOpcoes(nova);
    await setDoc(doc(db, "roleta", "dados"), { opcoes: nova, girando: false, resultado: null }, { merge: true });
  };

  return createPortal(
    <Paper elevation={10} sx={{ position: "fixed", left: posicao.x, top: posicao.y, width: minimizado ? 300 : tamanho.width, height: minimizado ? 48 : tamanho.height, bgcolor: "#0f172a", color: "#fff", borderRadius: 2, border: "2px solid #f44336", zIndex: 9998, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.8)" }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 1, bgcolor: "#f44336", cursor: "move", minHeight: 40 }}
        onMouseDown={(e) => { if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return; e.preventDefault(); setArrastando(true); dragStartRef.current = { x: e.clientX - posicao.x, y: e.clientY - posicao.y }; }}>
        <Typography variant="subtitle2" sx={{ color: "#fff", fontWeight: "bold" }}>🎰 {minimizado ? "Roleta" : "Roleta da Sorte"}</Typography>
        <Box sx={{ display: "flex", gap: 0.5 }}>
          {isMaster && <IconButton size="small" onClick={() => setEditando(!editando)} sx={{ color: "#fff", p: 0.5 }}><EditIcon fontSize="small" /></IconButton>}
          <IconButton size="small" onClick={() => setMinimizado(!minimizado)} sx={{ color: "#fff", p: 0.5 }}>{minimizado ? "□" : "−"}</IconButton>
          <IconButton size="small" onClick={onClose} sx={{ color: "#fff", p: 0.5 }}><CloseIcon fontSize="small" /></IconButton>
        </Box>
      </Box>
      {!minimizado && (
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", p: 1.5, gap: 1, overflowY: "auto" }}>
          
          {/* 🟢 CONTAINER COM SETA NO TOPO */}
          <Box sx={{ position: "relative", width: 350, height: 350, flexShrink: 0 }}>
            <canvas 
              ref={canvasRef} 
              width={350} 
              height={350} 
              style={{ borderRadius: "50%", width: "100%", height: "100%" }} 
            />
            {/* 🟢 SETA NO TOPO (12h) - Sempre aponta para baixo */}
            <Box sx={{
              position: "absolute",
              top: -8,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 10,
              filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))",
            }}>
              <svg width="30" height="40" viewBox="0 0 30 40">
                <polygon 
                  points="15,40 0,0 30,0" 
                  fill="#ff0000" 
                  stroke="#fff" 
                  strokeWidth="2"
                />
              </svg>
            </Box>
          </Box>
          
          {/* Resultado */}
          {resultado && !girando && (
            <Typography variant="h6" sx={{ 
              color: "#fbbf24", 
              fontWeight: "bold", 
              textAlign: "center", 
              textShadow: "0 0 10px rgba(251,191,36,0.7)",
              animation: "pulse 1.5s infinite",
            }}>
              🎉 {resultado} 🎉
            </Typography>
          )}
          
          {isMaster && (
            <Button variant="contained" fullWidth onClick={girarRoleta} disabled={girando || opcoes.length === 0}
              sx={{ bgcolor: '#f44336', color: '#fff', fontWeight: 'bold', py: 1.2, fontSize: '1rem', '&:hover': { bgcolor: '#dc2626' } }}>
              {girando ? "🎰 Girando..." : "🎲 Girar Roleta!"}
            </Button>
          )}
          
          {isMaster && editando && (
            <Box sx={{ width: "100%", mt: 1 }}>
              <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
                <TextField size="small" fullWidth value={novoItem} onChange={(e) => setNovoItem(e.target.value)} placeholder="Nova opção..."
                  onKeyDown={(e) => { if (e.key === 'Enter') adicionarOpcao(); }}
                  InputProps={{ style: { color: '#fff', fontSize: '0.8rem' } }} />
                <Button variant="contained" size="small" onClick={adicionarOpcao} sx={{ bgcolor: '#4caf50', minWidth: 40 }}><AddIcon /></Button>
              </Box>
              <Box sx={{ maxHeight: 150, overflowY: "auto" }}>
                {opcoes.map((op, idx) => (
                  <Paper key={idx} sx={{ p: 0.5, mb: 0.3, bgcolor: "#1a1a2e", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="caption" sx={{ color: "#fff" }}>{op}</Typography>
                    <IconButton size="small" onClick={() => removerOpcao(idx)} sx={{ color: '#ef4444' }}><DeleteIcon sx={{ fontSize: 14 }} /></IconButton>
                  </Paper>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      )}
      {!minimizado && <Box sx={{ position: "absolute", bottom: 0, right: 0, width: 16, height: 16, cursor: "nwse-resize", zIndex: 10 }}
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setRedimensionando(true); resizeStartRef.current = { x: e.clientX, y: e.clientY, width: tamanho.width, height: tamanho.height }; }} />}
    </Paper>, document.body
  );
}

export default React.memo(RoletaSincronizada);