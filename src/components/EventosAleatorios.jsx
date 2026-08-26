import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Box, Paper, Typography, IconButton, Button, TextField, Checkbox, FormControlLabel, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import CasinoIcon from "@mui/icons-material/Casino";
import { db } from "../firebaseConfig";
import { doc, setDoc, onSnapshot } from "firebase/firestore";

// 🟢 EVENTOS TEMÁTICOS DO MUNDO DE RÉQUIEM
const EVENTOS_PADRAO = [
  // ===== IMPÉRIO AURANO =====
  { id: 1, texto: "Um Caçador de Aura chega à região procurando por um Fundador renegado. Ele oferece uma recompensa por informações e pede ajuda para rastrear a criatura.", ativo: true, categoria: "Império Aurano" },
  { id: 2, texto: "Rumores de que a Torre Hollow em Auraxia está recrutando cientistas para um projeto secreto. Mercenários e acadêmicos disputam as vagas.", ativo: true, categoria: "Império Aurano" },
  { id: 3, texto: "Uma caravana de Obsidiana foi saqueada na estrada para Sideris. As guildas de comerciantes exigem proteção extra do Senado.", ativo: true, categoria: "Império Aurano" },
  { id: 4, texto: "O preço do Pyridium disparou em Nexa após boatos de uma nova descoberta científica. Investidores estão desesperados.", ativo: true, categoria: "Império Aurano" },
  { id: 5, texto: "Crianças Auranas começaram a manifestar poderes espontaneamente em Laxeado. As autoridades isolam a área.", ativo: true, categoria: "Império Aurano" },
  
  // ===== KRATÓRIA =====
  { id: 6, texto: "As Forjas de Gume anunciaram uma liga secreta de Adamantina que pode mudar a guerra. Espiões de todas as nações tentam roubar a fórmula.", ativo: true, categoria: "Kratória" },
  { id: 7, texto: "O Rei Kyllian Fernsby IV convocou um torneio de guerreiros. O vencedor receberá terras e um título de nobreza.", ativo: true, categoria: "Kratória" },
  { id: 8, texto: "Uma mina em Cinzas desabou, soterrando dezenas de trabalhadores. As famílias clamam por justiça.", ativo: true, categoria: "Kratória" },
  
  // ===== FERGLACIUS =====
  { id: 9, texto: "Guerreiros do Clã Kael foram vistos patrulhando as fronteiras. Os glaciais estão mais agressivos do que o normal.", ativo: true, categoria: "Ferglacius" },
  { id: 10, texto: "Siv Hrothgar declarou uma caçada sagrada. Todos os clãs devem participar ou enfrentar as consequências.", ativo: true, categoria: "Ferglacius" },
  
  // ===== PARAX =====
  { id: 11, texto: "As fossas de Nadir emitem um brilho estranho. Os cientistas de Thalassa temem que algo esteja despertando nas profundezas.", ativo: true, categoria: "Parax" },
  { id: 12, texto: "A Família Marcone está recrutando contrabandistas para uma operação em Salaria. O pagamento é generoso... e perigoso.", ativo: true, categoria: "Parax" },
  
  // ===== VAROSIA =====
  { id: 13, texto: "A Árvore Vondaris perdeu suas folhas de repente. Os sacerdotes interpretam como um mau presságio.", ativo: true, categoria: "Varosia" },
  { id: 14, texto: "O Conselho dos Clãs de Varosia está dividido sobre a sucessão. Facções rivais se armam para o pior.", ativo: true, categoria: "Varosia" },
  
  // ===== BURGO =====
  { id: 15, texto: "As cervejarias de Lotharsberg criaram uma bebida que causa visões. A Casa Lothar quer manter a receita em segredo.", ativo: true, categoria: "Burgo" },
  { id: 16, texto: "O Reino Burgo fechou um acordo comercial com o Império Aurano. Protestos eclodem nas ruas de Burguia.", ativo: true, categoria: "Burgo" },
  
  // ===== ILHA HOLLOW =====
  { id: 17, texto: "Agatha D'Hollow anunciou um implante que promete comunicação instantânea. O preço? Sua privacidade.", ativo: true, categoria: "Ilha Hollow" },
  { id: 18, texto: "O exército privado da Corporação Hollow foi mobilizado. Ninguém sabe para onde vão.", ativo: true, categoria: "Ilha Hollow" },
  
  // ===== TERRAS BALDIAS =====
  { id: 19, texto: "Senhores da guerra de Kael'Drak e Tor'Zhan estão em trégua temporária. Todos temem o que vem depois.", ativo: true, categoria: "Terras Baldias" },
  { id: 20, texto: "Uma caravana de contrabandistas desapareceu no Deserto de Cinzas. Os sobreviventes falam de criaturas de areia.", ativo: true, categoria: "Terras Baldias" },
  
  // ===== EVENTOS GERAIS =====
  { id: 21, texto: "Um eclipse solar está previsto. Todas as nações preparam rituais para apaziguar os deuses.", ativo: true, categoria: "Geral" },
  { id: 22, texto: "Um estranho nevoeiro cobre a região. Aqueles que entram nele voltam mudados.", ativo: true, categoria: "Geral" },
  { id: 23, texto: "Uma guilda de aventureiros está recrutando para uma expedição às ruínas de uma civilização perdida.", ativo: true, categoria: "Geral" },
  { id: 24, texto: "Cartas anônimas com ameaças são entregues aos líderes locais. A tensão está no ar.", ativo: true, categoria: "Geral" },
  { id: 25, texto: "Um antigo cemitério foi profanado. Os mortos não descansam mais.", ativo: true, categoria: "Geral" },
  { id: 26, texto: "Músicos fantasmagóricos são ouvidos nas ruínas próximas. Ninguém tem coragem de investigar.", ativo: true, categoria: "Geral" },
  { id: 27, texto: "O ferreiro local forjou uma arma lendária. Agora, todos querem possuí-la.", ativo: true, categoria: "Geral" },
  { id: 28, texto: "Uma competição de caça ao tesouro é anunciada. O prêmio é um artefato de valor inestimável.", ativo: true, categoria: "Geral" },
  { id: 29, texto: "Os poços da região estão secando. Os moradores suspeitam de sabotagem.", ativo: true, categoria: "Geral" },
  { id: 30, texto: "Um circo itinerante chega com criaturas exóticas. Algumas delas parecem... humanas demais.", ativo: true, categoria: "Geral" },
];

function EventosAleatorios({ isMaster, userNick, fichasMap, onClose, userEmail }) {
  const [posicao, setPosicao] = useState({ x: 250, y: 120 });
  const [tamanho, setTamanho] = useState({ width: 550, height: 550 });
  const [minimizado, setMinimizado] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const [redimensionando, setRedimensionando] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const [eventos, setEventos] = useState([]);
  const [editando, setEditando] = useState(false);
  const [girando, setGirando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [textoGirando, setTextoGirando] = useState("");
  const intervaloRef = useRef(null);
  const [modalEditOpen, setModalEditOpen] = useState(false);
  const [eventoEditando, setEventoEditando] = useState(null);
  const [novoTexto, setNovoTexto] = useState("");
  const [novoAtivo, setNovoAtivo] = useState(true);
  const [novoEventoTexto, setNovoEventoTexto] = useState("");

  useEffect(() => {
    const ref = doc(db, "eventos_aleatorios", "lista");
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists() && snap.data().eventos) {
        setEventos(snap.data().eventos);
      } else {
        setEventos(EVENTOS_PADRAO);
        setDoc(ref, { eventos: EVENTOS_PADRAO });
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (arrastando) setPosicao({ x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y });
      if (redimensionando) setTamanho({ width: Math.max(400, resizeStartRef.current.width + (e.clientX - resizeStartRef.current.x)), height: Math.max(350, resizeStartRef.current.height + (e.clientY - resizeStartRef.current.y)) });
    };
    const handleMouseUp = () => { setArrastando(false); setRedimensionando(false); };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => { window.removeEventListener("mousemove", handleMouseMove); window.removeEventListener("mouseup", handleMouseUp); };
  }, [arrastando, redimensionando]);

  const gerarEvento = async () => {
    const ativos = eventos.filter(e => e.ativo);
    if (ativos.length === 0) return;
    setGirando(true);
    setResultado(null);
    let contador = 0;
    const duracao = 2000;
    const intervalo = 60;
    intervaloRef.current = setInterval(() => {
      const aleatorio = ativos[Math.floor(Math.random() * ativos.length)];
      setTextoGirando(aleatorio.texto);
      contador += intervalo;
      if (contador >= duracao) {
        clearInterval(intervaloRef.current);
        const final = ativos[Math.floor(Math.random() * ativos.length)];
        setResultado(final.texto);
        setGirando(false);
        
        // 🟢 ENVIAR PARA O CHAT COMO MENSAGEM DO JOGADOR
        const nomePersonagem = fichasMap?.[userEmail]?.nome || userNick || "Aventureiro";
        const emailPersonagem = userEmail || "sistema@reqviemrpg.com";
        
        const mensagemChat = `⭐ **EVENTO ALEATÓRIO** ⭐\n\n${final.texto}\n\n— ${nomePersonagem}`;
        
        window.dispatchEvent(new CustomEvent('enviarEventoChat', { 
          detail: { 
            texto: mensagemChat, 
            personagem: nomePersonagem,
            userEmail: emailPersonagem,
            userNick: nomePersonagem,
            categoria: final.categoria || "Geral"
          } 
        }));
      }
    }, intervalo);
  };

  const salvarEventos = async (novaLista) => {
    await setDoc(doc(db, "eventos_aleatorios", "lista"), { eventos: novaLista });
    setEventos(novaLista);
  };

  const toggleAtivo = (id) => {
    const nova = eventos.map(e => e.id === id ? { ...e, ativo: !e.ativo } : e);
    salvarEventos(nova);
  };

  const deletarEvento = (id) => {
    const nova = eventos.filter(e => e.id !== id);
    salvarEventos(nova);
  };

  const editarEvento = (ev) => {
    setEventoEditando(ev);
    setNovoTexto(ev.texto);
    setNovoAtivo(ev.ativo);
    setModalEditOpen(true);
  };

  const salvarEdicao = () => {
    const nova = eventos.map(e => e.id === eventoEditando.id ? { ...e, texto: novoTexto, ativo: novoAtivo } : e);
    salvarEventos(nova);
    setModalEditOpen(false);
  };

  const adicionarEvento = () => {
    if (!novoEventoTexto.trim()) return;
    const nova = [...eventos, { id: Date.now(), texto: novoEventoTexto, ativo: true, categoria: "Personalizado" }];
    salvarEventos(nova);
    setNovoEventoTexto("");
  };

  return createPortal(
    <Paper elevation={10} sx={{ position: "fixed", left: posicao.x, top: posicao.y, width: minimizado ? 300 : tamanho.width, height: minimizado ? 48 : tamanho.height, bgcolor: "#0f172a", color: "#fff", borderRadius: 2, border: "2px solid #ec4899", zIndex: 9998, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.8)" }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 1, bgcolor: "#ec4899", cursor: "move", minHeight: 40 }}
        onMouseDown={(e) => { if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return; e.preventDefault(); setArrastando(true); dragStartRef.current = { x: e.clientX - posicao.x, y: e.clientY - posicao.y }; }}>
        <Typography variant="subtitle2" sx={{ color: "#fff", fontWeight: "bold" }}>⭐ {minimizado ? "Eventos" : "Eventos Aleatórios"}</Typography>
        <Box sx={{ display: "flex", gap: 0.5 }}>
          {isMaster && <IconButton size="small" onClick={() => setEditando(!editando)} sx={{ color: "#fff", p: 0.5 }}><EditIcon fontSize="small" /></IconButton>}
          <IconButton size="small" onClick={() => setMinimizado(!minimizado)} sx={{ color: "#fff", p: 0.5 }}>{minimizado ? "□" : "−"}</IconButton>
          <IconButton size="small" onClick={onClose} sx={{ color: "#fff", p: 0.5 }}><CloseIcon fontSize="small" /></IconButton>
        </Box>
      </Box>
      {!minimizado && (
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", p: 1.5, gap: 1, overflowY: "auto" }}>
          <Paper sx={{ p: 2, bgcolor: "#1a1a2e", border: "1px solid #ec4899", borderRadius: 2, textAlign: "center", minHeight: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {girando ? (
              <Typography sx={{ color: "#ec4899", fontWeight: "bold", fontSize: "1.1rem", animation: "pulse 0.3s infinite" }}>{textoGirando}</Typography>
            ) : resultado ? (
              <Typography sx={{ color: "#fff", fontSize: "1rem", fontWeight: "bold" }}>{resultado}</Typography>
            ) : (
              <Typography sx={{ color: "#64748b" }}>Clique em "Gerar Evento" para começar!</Typography>
            )}
          </Paper>
          <Button variant="contained" fullWidth startIcon={<CasinoIcon />} onClick={gerarEvento} disabled={girando}
            sx={{ bgcolor: '#ec4899', color: '#fff', fontWeight: 'bold', py: 1.2, fontSize: '1rem', '&:hover': { bgcolor: '#db2777' } }}>
            {girando ? "🎰 Girando..." : "🎲 Gerar Evento Aleatório!"}
          </Button>
          {isMaster && editando && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="subtitle2" sx={{ color: "#ec4899", mb: 1 }}>📋 Editar Eventos ({eventos.filter(e => e.ativo).length}/{eventos.length} ativos)</Typography>
              <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
                <TextField size="small" fullWidth value={novoEventoTexto} onChange={(e) => setNovoEventoTexto(e.target.value)} placeholder="Novo evento..."
                  InputProps={{ style: { color: '#fff', fontSize: '0.8rem' } }} />
                <Button variant="contained" size="small" onClick={adicionarEvento} sx={{ bgcolor: '#4caf50', minWidth: 40 }}><AddIcon /></Button>
              </Box>
              <Box sx={{ maxHeight: 200, overflowY: "auto", "&::-webkit-scrollbar": { width: "3px" }, "&::-webkit-scrollbar-thumb": { background: "#ec489944", borderRadius: "10px" } }}>
                {eventos.map(ev => (
                  <Paper key={ev.id} sx={{ p: 1, mb: 0.5, bgcolor: "#1a1a2e", border: "1px solid #334155", display: "flex", alignItems: "center", gap: 1 }}>
                    <FormControlLabel control={<Checkbox checked={ev.ativo} onChange={() => toggleAtivo(ev.id)} size="small" sx={{ color: '#ec4899', '&.Mui-checked': { color: '#ec4899' } }} />} label="" />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" sx={{ color: ev.ativo ? "#fff" : "#64748b", fontSize: "0.75rem", display: 'block' }}>{ev.texto}</Typography>
                      <Typography variant="caption" sx={{ color: '#ec4899', fontSize: '0.6rem', display: 'block' }}>{ev.categoria || "Geral"}</Typography>
                    </Box>
                    <IconButton size="small" onClick={() => editarEvento(ev)} sx={{ color: '#ff9800' }}><EditIcon sx={{ fontSize: 14 }} /></IconButton>
                    <IconButton size="small" onClick={() => deletarEvento(ev.id)} sx={{ color: '#ef4444' }}><DeleteIcon sx={{ fontSize: 14 }} /></IconButton>
                  </Paper>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      )}
      {!minimizado && <Box sx={{ position: "absolute", bottom: 0, right: 0, width: 16, height: 16, cursor: "nwse-resize", zIndex: 10 }}
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setRedimensionando(true); resizeStartRef.current = { x: e.clientX, y: e.clientY, width: tamanho.width, height: tamanho.height }; }} />}
      <Dialog open={modalEditOpen} onClose={() => setModalEditOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: "#0f172a", color: "#fff", border: "1px solid #1e293b" } }}>
        <DialogTitle>Editar Evento</DialogTitle>
        <DialogContent>
          <TextField fullWidth multiline minRows={3} value={novoTexto} onChange={(e) => setNovoTexto(e.target.value)} sx={{ mt: 1 }} InputProps={{ style: { color: '#fff' } }} />
          <FormControlLabel control={<Checkbox checked={novoAtivo} onChange={(e) => setNovoAtivo(e.target.checked)} sx={{ color: '#ec4899', '&.Mui-checked': { color: '#ec4899' } }} />} label="Ativo" sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions><Button onClick={() => setModalEditOpen(false)} sx={{ color: '#94a3b8' }}>Cancelar</Button><Button variant="contained" onClick={salvarEdicao} sx={{ bgcolor: '#ec4899' }}>Salvar</Button></DialogActions>
      </Dialog>
    </Paper>, document.body
  );
}

export default React.memo(EventosAleatorios);