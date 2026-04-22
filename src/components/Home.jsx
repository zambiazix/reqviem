import React, { memo, useEffect, useState } from "react";
import { ThemeProvider, CssBaseline, Box, Grid, Paper, Button, Typography, IconButton } from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import { Link } from "react-router-dom";
import HomePage from "../pages/HomePage";
import SoundBoard from "./SoundBoard";
import FichaPersonagem from "./FichaPersonagem";
import MemoizedChat from "./Chat"; // ou import Chat e use memo aqui
import LoginForm from "./LoginForm"; // extraia também

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
  
  useEffect(() => {
    const handleResize = () => setIsMobileLocal(window.innerWidth < 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMaster = role === "master";

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
                      <img src="/logo.png" alt="Logo" style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "contain" }} />
                      <Box>
                        <Typography variant="h6">Bem-vindo,</Typography>
                        <Typography variant="subtitle1">{userNick}</Typography>
                        <Typography variant="caption" display="block">{user?.email}</Typography>
                        <Typography variant="caption" sx={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)", display: "block" }}>APP Réquiem RPG — versão 3.0 — By: Zambiazi</Typography>
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
                    <MemoizedChat userNick={userNick} userEmail={user?.email} />
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
                    <FichaPersonagem 
                      key={selectedFichaEmail || 'empty'} 
                      user={user} 
                      fichaId={selectedFichaEmail} 
                      isMestre={true} 
                    />
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
    </ThemeProvider>
  );
});

export default Home;