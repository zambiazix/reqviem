import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Box, Paper, Typography, IconButton, Button, Dialog,
  DialogTitle, DialogContent, DialogActions,
  Select, MenuItem, FormControl, InputLabel,
  Avatar, TextField, Tooltip
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import { db } from "../firebaseConfig";
import { doc, onSnapshot, setDoc, deleteDoc, collection, getDocs } from "firebase/firestore";

const CORES_AURA = {
  "Titã": "#ff3b3b", "Alquimista": "#00e0ff", "Artesão": "#ffd700",
  "Fundador": "#00ff88", "Déspota": "#a855f7", "Ás": "#e5e5e5",
};

export default function Chaveamento({ isMaster = false, fichasMap = {}, onClose = () => {} }) {
  const [chaveamentos, setChaveamentos] = useState([]);
  const [abaAtiva, setAbaAtiva] = useState(null);
  const [modalCriarOpen, setModalCriarOpen] = useState(false);
  const [novoTamanho, setNovoTamanho] = useState(8);
  const [novoNome, setNovoNome] = useState("");
  const [posicao, setPosicao] = useState({ x: 150, y: 80 });
  const [tamanho, setTamanho] = useState({ width: 800, height: 600 });
  const [arrastando, setArrastando] = useState(false);
  const [redimensionando, setRedimensionando] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const [todosPersonagens, setTodosPersonagens] = useState([]);
  const [minimizado, setMinimizado] = useState(false);

  // Carregar personagens
  useEffect(() => {
    const carregarPersonagens = async () => {
      const snap = await getDocs(collection(db, "fichas"));
      const personagens = [];
      snap.forEach((doc) => {
        const data = doc.data();
        if (doc.id !== "mestre@reqviemrpg.com") {
          personagens.push({
            email: doc.id,
            nome: data.nome || doc.id,
            imagem: data.imagemPersonagem || "",
            tipoAura: data.tipoAura || null,
            tipoFicha: data.tipoFicha || "PJ",
            isConvidado: data.isConvidado || false,
          });
        }
      });
      setTodosPersonagens(personagens);
    };
    carregarPersonagens();
  }, []);

  // Carregar chaveamentos em tempo real
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "chaveamentos"), (snap) => {
      const lista = [];
      snap.forEach((docSnap) => {
        lista.push({ id: docSnap.id, ...docSnap.data() });
      });
      lista.sort((a, b) => (a.criadoEm || 0) - (b.criadoEm || 0));
      setChaveamentos(lista);
      if (lista.length > 0 && !abaAtiva) {
        setAbaAtiva(lista[0].id);
      }
    });
    return () => unsub();
  }, []);

  // Arrastar e redimensionar com requestAnimationFrame
  useEffect(() => {
    let rafId = null;
    
    const handleMouseMove = (e) => {
      if (rafId) cancelAnimationFrame(rafId);
      
      rafId = requestAnimationFrame(() => {
        if (arrastando) {
          setPosicao({
            x: e.clientX - dragStartRef.current.x,
            y: e.clientY - dragStartRef.current.y,
          });
        }
        if (redimensionando) {
          const newWidth = Math.max(500, resizeStartRef.current.width + (e.clientX - resizeStartRef.current.x));
          const newHeight = Math.max(400, resizeStartRef.current.height + (e.clientY - resizeStartRef.current.y));
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

  const criarChaveamento = async () => {
    if (!novoNome.trim()) {
      alert("Digite um nome para o chaveamento!");
      return;
    }
    const id = Date.now().toString();
    const novoChaveamento = {
      id,
      nome: novoNome.trim(),
      tamanho: novoTamanho,
      criadoEm: Date.now(),
      partidas: {},
      vencedores: {},
    };
    await setDoc(doc(db, "chaveamentos", id), novoChaveamento);
    setAbaAtiva(id);
    setModalCriarOpen(false);
    setNovoNome("");
  };

  const deletarChaveamento = async (id) => {
    if (!window.confirm("Deletar este chaveamento?")) return;
    await deleteDoc(doc(db, "chaveamentos", id));
    if (abaAtiva === id) {
      setAbaAtiva(null);
    }
  };

  const selecionarPersonagem = async (chaveamentoId, posicao, email) => {
    const chaveamento = chaveamentos.find(c => c.id === chaveamentoId);
    if (!chaveamento) return;
    const partidas = { ...chaveamento.partidas, [posicao]: email };
    await setDoc(doc(db, "chaveamentos", chaveamentoId), { partidas }, { merge: true });
  };

  const declararVencedor = async (chaveamentoId, posicao, emailVencedor) => {
    const chaveamento = chaveamentos.find(c => c.id === chaveamentoId);
    if (!chaveamento) return;
    const vencedores = { ...chaveamento.vencedores, [posicao]: emailVencedor };
    
    // Mover vencedor para a próxima posição
    const partidas = { ...chaveamento.partidas };
    const proximaPosicao = Math.floor(posicao / 2) + (chaveamento.tamanho / 2);
    if (!partidas[proximaPosicao]) {
      partidas[proximaPosicao] = emailVencedor;
    }
    
    await setDoc(doc(db, "chaveamentos", chaveamentoId), { vencedores, partidas }, { merge: true });
  };

  const chaveamentoAtivo = chaveamentos.find(c => c.id === abaAtiva);

  const getPersonagem = useCallback((email) => todosPersonagens.find(p => p.email === email), [todosPersonagens]);
  
  const getCorAura = useCallback((email) => {
    const personagem = getPersonagem(email);
    return personagem?.tipoAura ? CORES_AURA[personagem.tipoAura] : '#94a3b8';
  }, [getPersonagem]);

  // Renderizar chaveamento estilo mata-mata tradicional
  const renderChaveamento = (chaveamento) => {
    if (!chaveamento) return null;
    const { tamanho, partidas, vencedores } = chaveamento;
    const totalRodadas = Math.log2(tamanho);
    const posicaoFinal = tamanho - 2;
    
    const renderJogador = (posicao) => {
      const email = partidas[posicao];
      const personagem = getPersonagem(email);
      const cor = email ? getCorAura(email) : '#334155';
      const vencedor = vencedores[Math.floor(posicao / 2) * 2];
      const venceu = vencedor === email;
      const perdedor = vencedor && vencedor !== email;
      
      return (
        <Box sx={{ 
          p: 1, 
          bgcolor: '#1a1a2e', 
          borderRadius: 2, 
          border: `2px solid ${cor}`,
          boxShadow: venceu ? `0 0 20px ${cor}, 0 0 40px ${cor}44` : 'none',
          opacity: perdedor ? 0.3 : 1,
          transition: 'all 0.3s ease',
          minHeight: 50,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          width: 180,
          flexShrink: 0,
        }}>
          <Avatar src={personagem?.imagem} sx={{ width: 28, height: 28, border: `2px solid ${cor}`, flexShrink: 0 }}>
            {personagem?.nome?.[0] || '?'}
          </Avatar>
          <Typography sx={{ color: '#fff', fontSize: '0.65rem', fontWeight: 'bold', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {personagem?.nome || 'Selecione...'}
          </Typography>
          <FormControl size="small" sx={{ minWidth: 70, flexShrink: 0 }}>
            <Select
              value={email || ""}
              onChange={(e) => selecionarPersonagem(chaveamento.id, posicao, e.target.value)}
              sx={{ color: '#fff', fontSize: '0.6rem', height: 22 }}
              MenuProps={{ PaperProps: { sx: { bgcolor: '#1a1a2e', maxHeight: 250 } } }}
            >
              <MenuItem value="">--</MenuItem>
              {todosPersonagens.filter(p => !p.isConvidado).map(p => (
                <MenuItem key={p.email} value={p.email} sx={{ fontSize: '0.7rem', color: '#ffffff' }}>
                  {p.nome}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      );
    };
    

    
    // Organizar colunas: esquerda, centro (final), direita
    const colunasEsquerda = [];
    const colunasDireita = [];
    let inicioEsq = 0;
    let inicioDir = tamanho / 2;
    let numPorLado = tamanho / 4;
    
    for (let rodada = 0; rodada < totalRodadas - 1; rodada++) {
      const partidasEsq = [];
      const partidasDir = [];
      for (let i = 0; i < numPorLado; i++) {
        partidasEsq.push(inicioEsq + i * 2);
        partidasDir.push(inicioDir + i * 2);
      }
      colunasEsquerda.push(partidasEsq);
      colunasDireita.push(partidasDir);
      inicioEsq += numPorLado * 2;
      inicioDir += numPorLado * 2;
      numPorLado = numPorLado / 2;
    }

    // Renderizar partida EMPILHADA (um em cima do outro)
    const renderPartidaEmpilhada = (posicaoBase) => {
      const email1 = partidas[posicaoBase];
      const email2 = partidas[posicaoBase + 1];
      const vencedor = vencedores[posicaoBase];
      const cor1 = email1 ? getCorAura(email1) : '#334155';
      const cor2 = email2 ? getCorAura(email2) : '#334155';
      
      return (
        <Box key={posicaoBase} sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          gap: 0.5,
          alignItems: 'center',
        }}>
          {renderJogador(posicaoBase)}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 0.5,
            height: 20,
          }}>
            <Typography sx={{ color: vencedor ? (vencedor === email1 ? cor1 : cor2) : '#64748b', fontSize: '0.6rem', fontWeight: 'bold' }}>
              ⚔️
            </Typography>
            {email1 && email2 && !vencedor && isMaster && (
              <>
                <IconButton size="small" onClick={() => declararVencedor(chaveamento.id, posicaoBase, email1)}
                  sx={{ color: '#4caf50', p: 0.5, fontSize: '0.7rem' }}>
                  ⬆️🏆
                </IconButton>
                <IconButton size="small" onClick={() => declararVencedor(chaveamento.id, posicaoBase, email2)}
                  sx={{ color: '#4caf50', p: 0.5, fontSize: '0.7rem' }}>
                  ⬇️🏆
                </IconButton>
              </>
            )}
          </Box>
          {renderJogador(posicaoBase + 1)}
        </Box>
      );
    };

    // Renderizar coluna de partidas (empilhadas verticalmente)
    const renderColuna = (partidasLista, titulo, lado) => {
      return (
        <Box sx={{ 
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          justifyContent: 'center',
          alignItems: 'center',
          flexShrink: 0,
        }}>
          <Typography sx={{ 
            textAlign: 'center', 
            color: '#a855f7', 
            fontWeight: 'bold', 
            fontSize: '0.65rem',
            mb: 0.5,
          }}>
            {titulo}
          </Typography>
          {partidasLista.map(posicaoBase => {
            const email1 = partidas[posicaoBase];
            const email2 = partidas[posicaoBase + 1];
            const vencedor = vencedores[posicaoBase];
            const cor1 = email1 ? getCorAura(email1) : '#334155';
            const cor2 = email2 ? getCorAura(email2) : '#334155';
            
            return (
              <Box key={posicaoBase} sx={{ 
                display: 'flex', 
                flexDirection: 'column',
                gap: 0.5,
                alignItems: 'center',
              }}>
                {/* LADO ESQUERDO: jogador 1 em cima, jogador 2 embaixo */}
                {/* LADO DIREITO (ESPELHADO): jogador 2 em cima, jogador 1 embaixo */}
                {lado === 'right' ? (
                  <>
                    {renderJogador(posicaoBase + 1)}
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 0.5,
                      height: 20,
                    }}>
                      <Typography sx={{ color: vencedor ? (vencedor === email1 ? cor1 : cor2) : '#64748b', fontSize: '0.6rem', fontWeight: 'bold' }}>
                        ⚔️
                      </Typography>
                      {email1 && email2 && !vencedor && isMaster && (
                        <>
                          <IconButton size="small" onClick={() => declararVencedor(chaveamento.id, posicaoBase, email2)}
                            sx={{ color: '#4caf50', p: 0.5, fontSize: '0.7rem' }}>
                            ⬆️🏆
                          </IconButton>
                          <IconButton size="small" onClick={() => declararVencedor(chaveamento.id, posicaoBase, email1)}
                            sx={{ color: '#4caf50', p: 0.5, fontSize: '0.7rem' }}>
                            ⬇️🏆
                          </IconButton>
                        </>
                      )}
                    </Box>
                    {renderJogador(posicaoBase)}
                  </>
                ) : (
                  <>
                    {renderJogador(posicaoBase)}
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 0.5,
                      height: 20,
                    }}>
                      <Typography sx={{ color: vencedor ? (vencedor === email1 ? cor1 : cor2) : '#64748b', fontSize: '0.6rem', fontWeight: 'bold' }}>
                        ⚔️
                      </Typography>
                      {email1 && email2 && !vencedor && isMaster && (
                        <>
                          <IconButton size="small" onClick={() => declararVencedor(chaveamento.id, posicaoBase, email1)}
                            sx={{ color: '#4caf50', p: 0.5, fontSize: '0.7rem' }}>
                            ⬆️🏆
                          </IconButton>
                          <IconButton size="small" onClick={() => declararVencedor(chaveamento.id, posicaoBase, email2)}
                            sx={{ color: '#4caf50', p: 0.5, fontSize: '0.7rem' }}>
                            ⬇️🏆
                          </IconButton>
                        </>
                      )}
                    </Box>
                    {renderJogador(posicaoBase + 1)}
                  </>
                )}
              </Box>
            );
          })}
        </Box>
      );
    };

    // Renderizar final LADO A LADO
    const renderFinal = () => {
      const email1 = partidas[posicaoFinal];
      const email2 = partidas[posicaoFinal + 1];
      const vencedor = vencedores[posicaoFinal];
      const cor1 = email1 ? getCorAura(email1) : '#334155';
      const cor2 = email2 ? getCorAura(email2) : '#334155';
      
      return (
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          gap: 10,
          flexShrink: 0,
          alignSelf: 'center',
        }}>
          <Typography sx={{ 
            color: '#FFD700', 
            fontWeight: 'bold', 
            fontSize: '0.8rem',
            textShadow: '0 0 10px rgba(255,215,0,0.6)',
            mb: 0.5,
          }}>
            🏆 FINAL
          </Typography>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
          }}>
            {renderJogador(posicaoFinal)}
            <Typography sx={{ color: vencedor ? (vencedor === email1 ? cor1 : cor2) : '#64748b', fontSize: '0.7rem', fontWeight: 'bold' }}>
              VS
            </Typography>
            {renderJogador(posicaoFinal + 1)}
          </Box>
          {email1 && email2 && !vencedor && isMaster && (
            <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
              <IconButton size="small" onClick={() => declararVencedor(chaveamento.id, posicaoFinal, email1)}
                sx={{ color: '#4caf50', p: 0.5, fontSize: '0.7rem' }}>
                ⬅️🏆
              </IconButton>
              <IconButton size="small" onClick={() => declararVencedor(chaveamento.id, posicaoFinal, email2)}
                sx={{ color: '#4caf50', p: 0.5, fontSize: '0.7rem' }}>
                🏆➡️
              </IconButton>
            </Box>
          )}
        </Box>
      );
    };

    // Layout limpo: esquerda → centro ← direita (SEM linhas)
    return (
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        minWidth: 'fit-content',
        height: '100%',
        overflowX: 'auto',
        gap: 2,
      }}>
        {/* Colunas da esquerda */}
        {colunasEsquerda.map((partidasLista, idx) => (
          <Box key={`esq-${idx}`}>
            {renderColuna(partidasLista, `Rodada ${idx + 1}`, 'left')}
          </Box>
        ))}
        
        {/* FINAL */}
        {renderFinal()}
        
        {/* Colunas da direita (INVERTIDAS) */}
        {[...colunasDireita].reverse().map((partidasLista, idx) => (
          <Box key={`dir-${idx}`}>
            {renderColuna(partidasLista, `Rodada ${colunasDireita.length - idx}`, 'right')}
          </Box>
        ))}
      </Box>
    );
  };

  return createPortal(
    <Paper
      elevation={12}
      sx={{
        position: "fixed",
        left: posicao.x,
        top: posicao.y,
        width: minimizado ? 300 : tamanho.width,
        height: minimizado ? 45 : tamanho.height,
        bgcolor: "#0f172a",
        color: "#fff",
        borderRadius: 2,
        border: "2px solid #a855f7",
        zIndex: 5000,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxShadow: "0 8px 32px rgba(0,0,0,0.8), 0 0 30px rgba(168,85,247,0.4)",
        transition: minimizado ? 'height 0.3s ease, width 0.3s ease' : 'none',
      }}
    >
      {/* BARRA DE TÍTULO */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          p: 1,
          bgcolor: "rgba(168,85,247,0.2)",
          cursor: "move",
          minHeight: 40,
          borderBottom: "1px solid rgba(168,85,247,0.4)",
          flexShrink: 0,
        }}
        onMouseDown={(e) => {
          if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
          e.preventDefault();
          setArrastando(true);
          dragStartRef.current = { x: e.clientX - posicao.x, y: e.clientY - posicao.y };
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <DragIndicatorIcon sx={{ color: '#a855f7', fontSize: 18 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: "bold", color: '#a855f7' }}>
            🏆 Chaveamento
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 0.5, alignItems: 'center' }}>
          {isMaster && (
            <Button
              size="small"
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setModalCriarOpen(true)}
              sx={{ bgcolor: '#a855f7', fontSize: '0.65rem', mr: 0.5 }}
            >
              Criar
            </Button>
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
        <>
          {/* ABAS */}
          <Box sx={{ display: "flex", gap: 0.5, p: 1, borderBottom: "1px solid #334155", overflowX: "auto", flexShrink: 0 }}>
            {chaveamentos.map(ch => (
              <Paper
                key={ch.id}
                sx={{
                  px: 2,
                  py: 0.5,
                  cursor: 'pointer',
                  bgcolor: abaAtiva === ch.id ? '#a855f7' : '#1a1a2e',
                  color: abaAtiva === ch.id ? '#fff' : '#94a3b8',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  '&:hover': { bgcolor: abaAtiva === ch.id ? '#a855f7' : '#1e293b' },
                  flexShrink: 0,
                }}
                onClick={() => setAbaAtiva(ch.id)}
              >
                <Typography sx={{ fontSize: '0.7rem', fontWeight: 'bold' }}>
                  {ch.nome} ({ch.tamanho})
                </Typography>
                {isMaster && (
                  <DeleteIcon 
                    sx={{ fontSize: '0.8rem', color: '#ef4444', cursor: 'pointer' }} 
                    onClick={(e) => { e.stopPropagation(); deletarChaveamento(ch.id); }}
                  />
                )}
              </Paper>
            ))}
          </Box>

          {/* CONTEÚDO */}
          <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
            {chaveamentoAtivo ? (
              renderChaveamento(chaveamentoAtivo)
            ) : (
              <Typography sx={{ color: '#64748b', textAlign: 'center', mt: 4 }}>
                Nenhum chaveamento criado.
              </Typography>
            )}
          </Box>

          {/* ALÇA DE REDIMENSIONAMENTO */}
          <Box
            sx={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: 18,
              height: 18,
              cursor: "nwse-resize",
              zIndex: 10,
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setRedimensionando(true);
              resizeStartRef.current = { x: e.clientX, y: e.clientY, width: tamanho.width, height: tamanho.height };
            }}
          />
        </>
      )}

      {/* MODAL CRIAR */}
      <Dialog open={modalCriarOpen} onClose={() => setModalCriarOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ bgcolor: '#1a1a2e', color: '#a855f7' }}>🏆 Criar Chaveamento</DialogTitle>
        <DialogContent sx={{ bgcolor: '#1a1a2e', pt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Nome"
              fullWidth
              size="small"
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              InputProps={{ style: { color: '#fff' } }}
              InputLabelProps={{ style: { color: '#94a3b8' } }}
            />
            <FormControl fullWidth size="small">
              <InputLabel sx={{ color: '#94a3b8' }}>Tamanho</InputLabel>
              <Select
                value={novoTamanho}
                onChange={(e) => setNovoTamanho(e.target.value)}
                sx={{ color: '#fff' }}
                label="Tamanho"
              >
                <MenuItem value={2}>1x1 (2 personagens)</MenuItem>
                <MenuItem value={4}>2x2 (4 personagens)</MenuItem>
                <MenuItem value={8}>4x4 (8 personagens)</MenuItem>
                <MenuItem value={16}>8x8 (16 personagens)</MenuItem>
                <MenuItem value={32}>16x16 (32 personagens)</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#1a1a2e', borderTop: '1px solid #334155' }}>
          <Button onClick={() => setModalCriarOpen(false)} sx={{ color: '#94a3b8' }}>Cancelar</Button>
          <Button variant="contained" onClick={criarChaveamento} sx={{ bgcolor: '#a855f7' }}>Criar</Button>
        </DialogActions>
      </Dialog>
    </Paper>,
    document.body
  );
}