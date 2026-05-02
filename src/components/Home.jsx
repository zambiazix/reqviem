import React, { memo, useEffect, useState } from "react";
import { ThemeProvider, CssBaseline, Box, Grid, Paper, Button, Typography, IconButton } from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import { Link } from "react-router-dom";
import HomePage from "../pages/HomePage";
import SoundBoard from "./SoundBoard";
import FichaPersonagem from "./FichaPersonagem";
import MemoizedChat from "./Chat";
import LoginForm from "./LoginForm";
import { db } from "../firebaseConfig";
import { doc, getDoc } from "firebase/firestore";

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
  
  // 🟢 ESTADOS AQUI DENTRO!
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  
  // 🟢 Nome da ficha selecionada
  const [fichaNome, setFichaNome] = useState("");
  
  // 🟢 Buscar nome da ficha quando selecionada
  useEffect(() => {
    if (selectedFichaEmail && db) {
      const fichaRef = doc(db, "fichas", selectedFichaEmail);
      getDoc(fichaRef).then(snap => {
        if (snap.exists()) {
          setFichaNome(snap.data().nome || selectedFichaEmail);
        }
      });
    }
  }, [selectedFichaEmail]);
  
  useEffect(() => {
    const handleResize = () => setIsMobileLocal(window.innerWidth < 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMaster = role === "master";

  // 🟢 Nome a mostrar: se for mestre, usa o nome da ficha selecionada; senão, o userNick
  const displayName = isMaster 
    ? (fichaNome || userNick || "Mestre")
    : userNick;

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
                <Paper sx={{ p: 2, flexShrink: 0 }}>
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
                        <Typography variant="h6">Bem-vindo,</Typography>
                        <Typography variant="subtitle1">
  {isMaster ? `👑 MESTRE` : userNick}
</Typography>
                        <Typography variant="caption" display="block">{user?.email}</Typography>
                        <Typography variant="caption" sx={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)", display: "block" }}>
  APP Réquiem RPG — <span style={{ color: '#FFD700', fontWeight: 'bold', textShadow: '0 0 8px rgba(255,215,0,0.5)' }}>Versão 3.5</span> — By: Zambiazi
</Typography>
                      </Box>
                    </Box>
                    <IconButton color="inherit" onClick={handleLogout} title="Sair">
                      <LogoutIcon />
                    </IconButton>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "center", gap: 1.5, flexWrap: "wrap" }}>
                    <Button variant="contained" component={Link} to="/map">Grid</Button>
                    <Button variant="contained" component={Link} to="/cronica">Crônica</Button>
                    <Button variant="contained" component={Link} to="/sistema">Sistema</Button>
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
                </Paper>
                <Paper sx={{ flex: 1, display: "flex", flexDirection: "column", mt: 2, overflow: "hidden" }}>
                  <Box sx={{ flex: 1, overflowY: "auto", maxHeight: isMobileLocal ? "60vh" : "none" }}>
                    <MemoizedChat 
  userNick={displayName} 
  userEmail={isMaster ? selectedFichaEmail : user?.email} 
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
    selectedFichaEmail && selectedFichaEmail !== user?.email ? (
      <FichaPersonagem 
        key={selectedFichaEmail || 'empty'} 
        user={user} 
        fichaId={selectedFichaEmail} 
        isMestre={true} 
      />
    ) : (
      <Typography sx={{ color: '#94a3b8', textAlign: 'center', mt: 4 }}>
        👑 Selecione uma ficha de jogador para visualizar
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
      
      {/* 🟢 LIGHTBOX */}
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