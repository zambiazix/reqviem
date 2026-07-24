// src/components/Home.jsx
import React, { memo, useEffect, useState, useRef } from "react";
import { ThemeProvider, CssBaseline, Box, Grid, Paper, Button, Typography, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import CloseIcon from "@mui/icons-material/Close";
import { Link } from "react-router-dom";
import HomePage from "../pages/HomePage";
import SoundBoard from "./SoundBoard";
import SocialBar from "./SocialBar";
import FichaPersonagem from "./FichaPersonagem";
import MemoizedChat from "./Chat";
import LoginForm from "./LoginForm";
import { db } from "../firebaseConfig";
import { doc, setDoc, onSnapshot, collection } from "firebase/firestore";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const Home = memo(function Home({ 
  user, 
  userNick, 
  role, 
  fichasList, 
  selectedFichaEmail, 
  setSelectedFichaEmail,
  criarContaEJogador,
  handleLogout,
  fichaAtual,
  theme, 
  onRegister,
}) {
  const [isMobileLocal, setIsMobileLocal] = useState(window.innerWidth < 1024);
  
  // 🟢 ESTADOS DO LIGHTBOX
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  
  // 🟢 Nome da ficha selecionada
  const [fichaNome, setFichaNome] = useState("");
  const [socialBarKey, setSocialBarKey] = useState(0);
  
  // 🟢 FICHAS MAP PARA SOCIAL BAR
  const [fichasMapSocial, setFichasMapSocial] = useState({});

  // 🟢 TUTORIAL E CHANGELOG
  const [modalTutorialOpen, setModalTutorialOpen] = useState(false);
  const [tutorialContent, setTutorialContent] = useState("");
  const [tutorialEditando, setTutorialEditando] = useState(false);

  const [modalChangelogOpen, setModalChangelogOpen] = useState(false);
  const [changelogContent, setChangelogContent] = useState("");
  const [changelogEditando, setChangelogEditando] = useState(false);

  const tutorialTextareaRef = useRef(null);
  const changelogTextareaRef = useRef(null);

  // Carregar fichas para SocialBar
  useEffect(() => {
    const col = collection(db, "fichas");
    const unsub = onSnapshot(col, (snap) => {
      const map = {};
      snap.forEach((docSnap) => {
        const data = docSnap.data() || {};
        map[docSnap.id] = { nome: data.nome || docSnap.id, ...data };
      });
      setFichasMapSocial(map);
    });
    return () => unsub();
  }, []);

  // Atualizar nome da ficha selecionada
  useEffect(() => {
    if (selectedFichaEmail) {
      const fichaRef = doc(db, "fichas", selectedFichaEmail);
      const unsub = onSnapshot(fichaRef, (snap) => {
        if (snap.exists()) {
          setFichaNome(snap.data().nome || selectedFichaEmail);
        }
      });
      return () => unsub();
    } else {
      setFichaNome("");
    }
  }, [selectedFichaEmail]);

  useEffect(() => {
    setSocialBarKey(prev => prev + 1);
  }, [selectedFichaEmail]);
  
  useEffect(() => {
    const handleResize = () => setIsMobileLocal(window.innerWidth < 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Carregar conteúdo do tutorial
  useEffect(() => {
    const ref = doc(db, "app_info", "tutorial");
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setTutorialContent(snap.data().content || "");
      } else {
        setTutorialContent("");
      }
    });
    return () => unsub();
  }, []);

  // Carregar conteúdo do changelog
  useEffect(() => {
    const ref = doc(db, "app_info", "changelog");
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setChangelogContent(snap.data().content || "");
      } else {
        setChangelogContent("");
      }
    });
    return () => unsub();
  }, []);

  const salvarTutorial = async () => {
    await setDoc(doc(db, "app_info", "tutorial"), { content: tutorialContent }, { merge: true });
    setTutorialEditando(false);
  };

  const salvarChangelog = async () => {
    await setDoc(doc(db, "app_info", "changelog"), { content: changelogContent }, { merge: true });
    setChangelogEditando(false);
  };

  const isMaster = role === "master";
  const displayName = isMaster ? (fichaNome || userNick || "Mestre") : userNick;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ height: "100vh", p: 2 }}>
        <Grid container direction={isMobileLocal ? "column" : "row"} wrap="nowrap" sx={{ height: "100%" }}>
          {/* Coluna do Chat */}
          <Grid item sx={{ flex: isMobileLocal ? "1 1 100%" : "1 1 33%", minWidth: 0, display: "flex", flexDirection: "column", borderRight: isMobileLocal ? "none" : "1px solid rgba(255,255,255,0.08)" }}>
            {!user ? (
              <LoginForm onLogin={() => {}} onRegister={onRegister} />
            ) : (
              <>
                {/* ========== PAPER DO CABEÇALHO COM IMAGEM DE FUNDO ========== */}
                <Paper
                  sx={{
                    p: 2,
                    flexShrink: 0,
                    position: "relative",
                    backgroundImage: 'url("/background.jpg")',   // 🟢 SUA IMAGEM DE FUNDO (coloque em public/)
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    borderRadius: 2,
                    overflow: "hidden", // para o pseudo-elemento não vazar
                    // Overlay escuro semi-transparente para melhorar legibilidade
                    "&::before": {
                      content: '""',
                      position: "absolute",
                      inset: 0,
                      backgroundColor: "rgba(0, 0, 0, 0.55)", // ajuste a opacidade conforme necessário
                      zIndex: 0,
                    },
                  }}
                >
                  {/* Conteúdo do cabeçalho (acima do overlay) */}
                  <Box sx={{ position: "relative", zIndex: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <Box 
                          onClick={() => {
                            setLightboxSrc("/logo.png");
                            setZoom(1);
                            setLightboxOpen(true);
                          }}
                          sx={{ cursor: 'pointer' }}
                        >
                          <img src="/logo.png" alt="Logo" style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "contain" }} />
                        </Box>
                        <Box>
                          <Typography variant="h6" sx={{ color: "#fff" }}>Bem-vindo,</Typography>
                          <Typography variant="subtitle1" sx={{ color: "#fff" }}>
                            {isMaster ? `👑 MESTRE` : userNick}
                          </Typography>
                          <Typography variant="caption" display="block" sx={{ color: "rgba(255,255,255,0.8)" }}>{user?.email}</Typography>
                          <Typography variant="caption" sx={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.6)", display: "block" }}>
                            APP Réquiem RPG —{' '}
                            <span
                              onClick={() => setModalChangelogOpen(true)}
                              style={{
                                color: '#FFD700',
                                fontWeight: 'bold',
                                textShadow: '0 0 8px rgba(255,215,0,0.5)',
                                cursor: 'pointer',
                                textDecoration: 'underline',
                              }}
                            >
                              Versão 4.5
                            </span>
                            {' '}— By: Zambiazi
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <IconButton color="inherit" onClick={() => setModalTutorialOpen(true)} title="Informações">
                          <span style={{ fontSize: '1.3rem' }}>ℹ️</span>
                        </IconButton>
                        <IconButton color="inherit" onClick={handleLogout} title="Sair">
                          <LogoutIcon />
                        </IconButton>
                      </Box>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "center", gap: 1.5, flexWrap: "wrap" }}>
                      <Button variant="contained" component={Link} to="/map">Grid</Button>
                      <Button variant="contained" component={Link} to="/cronica">Crônica</Button>
                      <Button variant="contained" component={Link} to="/sistema">Sistema</Button>
                      <Button 
                        variant="contained" 
                        onClick={() => {
                          if (window.__toggleHUDMobile) window.__toggleHUDMobile();
                        }}
                        sx={{ bgcolor: '#ff9800', '&:hover': { bgcolor: '#f57c00' }, minWidth: 'auto', px: 1.5 }}
                      >
                        📊 HUD
                      </Button>
                      <Button 
                        variant="contained" 
                        onClick={() => window.__startJitsiMeeting?.({ 
                          name: fichaAtual?.nome || userNick, 
                          email: user?.email, 
                          avatar: fichaAtual?.imagemPrincipal || fichaAtual?.imagemPersonagem || null 
                        })} 
                        sx={{ bgcolor: '#e74c3c', '&:hover': { bgcolor: '#c0392b' } }}
                      >
                        🎙️ Voice
                      </Button>
                    </Box>
                  </Box>

                  {/* Botão discreto para abrir a imagem de fundo no lightbox */}
                  <IconButton
                    onClick={() => {
                      setLightboxSrc("/background.jpg");
                      setZoom(1);
                      setLightboxOpen(true);
                    }}
                    sx={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      bgcolor: "rgba(0,0,0,0.5)",
                      color: "#fff",
                      zIndex: 2,
                      "&:hover": { bgcolor: "rgba(0,0,0,0.8)" },
                    }}
                    title="Ver imagem de fundo"
                  >
                    🖼️
                  </IconButton>
                </Paper>

                {/* Chat */}
                <Paper sx={{ flex: 1, display: "flex", flexDirection: "column", mt: 2, overflow: "hidden" }}>
                  <Box sx={{ flex: 1, overflowY: "auto", maxHeight: isMobileLocal ? "60vh" : "none" }}>
                    <MemoizedChat 
                      userNick={displayName} 
                      userEmail={user?.email}
                    />
                  </Box>
                </Paper>
              </>
            )}
          </Grid>

          {/* Colunas do Mestre */}
          {isMaster && (
            <>
              <Grid item sx={{ flex: "1 1 25%", minWidth: 0, display: "flex", flexDirection: "column", borderRight: "1px solid rgba(255,255,255,0.08)" }}>
                <HomePage
                  user={user}
                  role={role}
                  fichasList={fichasList}
                  selectedFichaEmail={selectedFichaEmail}
                  setSelectedFichaEmail={setSelectedFichaEmail}
                  criarContaEJogador={criarContaEJogador}
                />
                <Box sx={{ borderTop: "1px solid rgba(255,255,255,0.1)", p: 1, maxHeight: "50vh", overflowY: "auto" }}>
                  <SoundBoard isMaster={true} />
                </Box>
              </Grid>
              <Grid item sx={{ flex: "1 1 42%", minWidth: 0, display: "flex", flexDirection: "column" }}>
                <Paper sx={{ flex: 1, overflowY: "auto", p: 2 }}>
                  {user ? (
                    selectedFichaEmail ? (
                      <FichaPersonagem 
                        key={selectedFichaEmail || 'empty'} 
                        user={user} 
                        fichaId={selectedFichaEmail} 
                        isMestre={true} 
                      />
                    ) : (
                      <Typography sx={{ color: '#94a3b8', textAlign: 'center', mt: 4 }}>
                        👑 Selecione uma ficha para visualizar
                      </Typography>
                    )
                  ) : (
                    <Typography>Faça login para editar suas fichas.</Typography>
                  )}
                </Paper>
              </Grid>
            </>
          )}

          {/* Coluna do Jogador */}
          {!isMaster && (
            <Grid item sx={{ flex: "1 1 67%", minWidth: 0, display: "flex", flexDirection: "column" }}>
              <Paper sx={{ flex: 1, overflowY: "auto", p: 2 }}>
                {user ? (
                  <FichaPersonagem 
                    key={user?.email || 'player'} 
                    user={user} 
                    fichaId={user?.email} 
                    isMestre={false} 
                  />
                ) : (
                  <Typography>Faça login para editar suas fichas.</Typography>
                )}
              </Paper>
            </Grid>
          )}
        </Grid>
      </Box>

      {/* LIGHTBOX */}
      {lightboxOpen && (
        <Box
          onClick={() => setLightboxOpen(false)}
          sx={{
            position: "fixed",
            inset: 0,
            bgcolor: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <LightboxImage
            src={lightboxSrc}
            zoom={zoom}
            setZoom={setZoom}
          />
        </Box>
      )}

      {/* SOCIAL BAR */}
      {user && (
        <SocialBar 
          key={selectedFichaEmail || 'mestre-vazio'}
          userEmail={user?.email}
          userNick={displayName}
          fichasMap={fichasMapSocial}
          isMaster={isMaster}
          jogadorSelecionadoEmail={selectedFichaEmail}
        />
      )}

      {/* MODAL TUTORIAL */}
      <Dialog
        open={modalTutorialOpen}
        onClose={() => setModalTutorialOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { bgcolor: '#0f172a', border: '1px solid #1e293b', borderRadius: 2, minHeight: '60vh' } }}
      >
        <DialogTitle sx={{ color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          📖 Informações do App
          <Box>
            {isMaster && (
              <Button
                size="small"
                variant="contained"
                onClick={() => setTutorialEditando(!tutorialEditando)}
                sx={{ mr: 1, bgcolor: tutorialEditando ? '#4caf50' : '#ff9800' }}
              >
                {tutorialEditando ? 'Visualizar' : 'Editar'}
              </Button>
            )}
            <IconButton onClick={() => setModalTutorialOpen(false)} sx={{ color: '#94a3b8' }}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2 }}>
          {tutorialEditando ? (
            <>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  component="label"
                  startIcon={<span>📷</span>}
                  sx={{ color: '#94a3b8', borderColor: '#555' }}
                >
                  Inserir Imagem
                  <input
                    hidden
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const fd = new FormData();
                      fd.append('file', file);
                      const apiBase = window.location.hostname === 'localhost' ? 'http://localhost:5000' : 'https://reqviem.onrender.com';
                      const res = await fetch(`${apiBase}/upload`, { method: 'POST', body: fd });
                      const data = await res.json();
                      if (data.url) {
                        const textarea = tutorialTextareaRef.current;
                        if (textarea) {
                          const start = textarea.selectionStart;
                          const end = textarea.selectionEnd;
                          const antes = tutorialContent.substring(0, start);
                          const depois = tutorialContent.substring(end);
                          const imagemMarkdown = `\n![Imagem](${data.url})\n`;
                          setTutorialContent(antes + imagemMarkdown + depois);
                          setTimeout(() => {
                            textarea.focus();
                            textarea.selectionStart = start + imagemMarkdown.length;
                            textarea.selectionEnd = start + imagemMarkdown.length;
                          }, 100);
                        } else {
                          setTutorialContent(prev => prev + `\n![Imagem](${data.url})\n`);
                        }
                      }
                    }}
                  />
                </Button>
                <Button size="small" variant="contained" onClick={salvarTutorial} sx={{ bgcolor: '#2e7d32' }}>Salvar</Button>
              </Box>
              <TextField
                inputRef={tutorialTextareaRef}
                label="Conteúdo (Markdown)"
                fullWidth
                multiline
                minRows={12}
                maxRows={25}
                value={tutorialContent}
                onChange={(e) => setTutorialContent(e.target.value)}
                InputProps={{ style: { color: '#fff', fontFamily: 'monospace' } }}
                InputLabelProps={{ style: { color: '#94a3b8' } }}
                sx={{ '& .MuiInputBase-root': { height: '100%', overflowY: 'auto' } }}
              />
            </>
          ) : (
            <Box
              sx={{ color: '#fff', overflowY: 'auto', maxHeight: '60vh' }}
              onClick={(e) => {
                if (e.target.tagName === 'IMG') {
                  setLightboxSrc(e.target.src);
                  setZoom(1);
                  setLightboxOpen(true);
                }
              }}
            >
              {tutorialContent ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{tutorialContent}</ReactMarkdown>
              ) : (
                <Typography sx={{ color: '#94a3b8', textAlign: 'center', mt: 4 }}>
                  Nenhum conteúdo disponível.
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL CHANGELOG */}
      <Dialog
        open={modalChangelogOpen}
        onClose={() => setModalChangelogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { bgcolor: '#0f172a', border: '1px solid #1e293b', borderRadius: 2, minHeight: '60vh' } }}
      >
        <DialogTitle sx={{ color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          📋 Atualizações do App
          <Box>
            {isMaster && (
              <Button
                size="small"
                variant="contained"
                onClick={() => setChangelogEditando(!changelogEditando)}
                sx={{ mr: 1, bgcolor: changelogEditando ? '#4caf50' : '#ff9800' }}
              >
                {changelogEditando ? 'Visualizar' : 'Editar'}
              </Button>
            )}
            <IconButton onClick={() => setModalChangelogOpen(false)} sx={{ color: '#94a3b8' }}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2 }}>
          {changelogEditando ? (
            <>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  component="label"
                  startIcon={<span>📷</span>}
                  sx={{ color: '#94a3b8', borderColor: '#555' }}
                >
                  Inserir Imagem
                  <input
                    hidden
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const fd = new FormData();
                      fd.append('file', file);
                      const apiBase = window.location.hostname === 'localhost' ? 'http://localhost:5000' : 'https://reqviem.onrender.com';
                      const res = await fetch(`${apiBase}/upload`, { method: 'POST', body: fd });
                      const data = await res.json();
                      if (data.url) {
                        const textarea = changelogTextareaRef.current;
                        if (textarea) {
                          const start = textarea.selectionStart;
                          const end = textarea.selectionEnd;
                          const antes = changelogContent.substring(0, start);
                          const depois = changelogContent.substring(end);
                          const imagemMarkdown = `\n![Imagem](${data.url})\n`;
                          setChangelogContent(antes + imagemMarkdown + depois);
                          setTimeout(() => {
                            textarea.focus();
                            textarea.selectionStart = start + imagemMarkdown.length;
                            textarea.selectionEnd = start + imagemMarkdown.length;
                          }, 100);
                        } else {
                          setChangelogContent(prev => prev + `\n![Imagem](${data.url})\n`);
                        }
                      }
                    }}
                  />
                </Button>
                <Button size="small" variant="contained" onClick={salvarChangelog} sx={{ bgcolor: '#2e7d32' }}>Salvar</Button>
              </Box>
              <TextField
                inputRef={changelogTextareaRef}
                label="Conteúdo (Markdown)"
                fullWidth
                multiline
                minRows={12}
                maxRows={25}
                value={changelogContent}
                onChange={(e) => setChangelogContent(e.target.value)}
                InputProps={{ style: { color: '#fff', fontFamily: 'monospace' } }}
                InputLabelProps={{ style: { color: '#94a3b8' } }}
                sx={{ '& .MuiInputBase-root': { height: '100%', overflowY: 'auto' } }}
              />
            </>
          ) : (
            <Box
              sx={{ color: '#fff', overflowY: 'auto', maxHeight: '60vh' }}
              onClick={(e) => {
                if (e.target.tagName === 'IMG') {
                  setLightboxSrc(e.target.src);
                  setZoom(1);
                  setLightboxOpen(true);
                }
              }}
            >
              {changelogContent ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{changelogContent}</ReactMarkdown>
              ) : (
                <Typography sx={{ color: '#94a3b8', textAlign: 'center', mt: 4 }}>
                  Nenhum registro de atualização.
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </ThemeProvider>
  );
});

// 🟢 COMPONENTE LIGHTBOX
function LightboxImage({ src, zoom, setZoom }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [start, setStart] = useState({ x: 0, y: 0 });

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
      onWheel={(e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setZoom((z) => Math.min(Math.max(z + delta, 0.5), 5));
      }}
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

export default Home;