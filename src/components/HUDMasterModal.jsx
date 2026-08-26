// src/components/HUDMasterModal.jsx
import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  TextField,
  Divider,
  IconButton,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Grid,
  Paper,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import StopIcon from "@mui/icons-material/Stop";
import CloseIcon from "@mui/icons-material/Close";
import { useGame } from "../context/GameProvider";

const PHASES = ["manhã", "tarde", "noite", "madrugada"];
const SEASONS = ["Primavera", "Verão", "Outono", "Inverno"];
const PRESETS = [60, 180, 300];

function MasterPanelInner({
  hud,
  setWorldPhase,
  setWorldSeasonDayYear,
  startTimer,
  stopTimer,
  resetTimer,
  addXP,
  setXPDirect,
  onCloseButton,
}) {
  // local copy of world values so user can edit then save
  const [phase, setPhase] = useState(hud?.world?.phase || "manhã");
  const [season, setSeason] = useState(hud?.world?.season || "Verão");
  const [day, setDay] = useState(hud?.world?.day ?? 1);
  const [year, setYear] = useState(hud?.world?.year ?? 1);

  // XP controls
  const players = Object.keys(hud?.xpMap || {});
  const [xpValue, setXpValue] = useState(10);
  const [xpTarget, setXpTarget] = useState("");
  const [xpSetValue, setXpSetValue] = useState(0);

  useEffect(() => {
    // when hud changes, sync local copy if needed
    setPhase(hud?.world?.phase || "manhã");
    setSeason(hud?.world?.season || "Verão");
    setDay(hud?.world?.day ?? 1);
    setYear(hud?.world?.year ?? 1);
    // eslint-disable-next-line
  }, [hud?.world?.phase, hud?.world?.season, hud?.world?.day, hud?.world?.year]);

  const handleSaveWorld = async () => {
    await setWorldPhase(phase);
    await setWorldSeasonDayYear({ season, day: Number(day), year: Number(year) });
    if (onCloseButton) onCloseButton();
  };

  const handleGiveXP = async () => {
    if (!xpTarget) return;
    await addXP(xpTarget, Math.abs(Number(xpValue || 0)));
  };
  const handleRemoveXP = async () => {
    if (!xpTarget) return;
    await addXP(xpTarget, -Math.abs(Number(xpValue || 0)));
  };
  const handleSetXPDirect = async () => {
    if (!xpTarget) return;
    await setXPDirect(xpTarget, Number(xpSetValue || 0), hud.xpMap?.[xpTarget]?.level || 1);
  };

  const handleStartPreset = async (sec) => {
    await startTimer(sec);
  };
  const handleStopTimer = async () => { await stopTimer(); };
  const handleResetTimer = async (sec) => { await resetTimer(sec); };

  return (
    <Box sx={{ p: 1, minWidth: 360 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Typography variant="h6">Mundo & Tempo</Typography>
              <IconButton size="small" onClick={onCloseButton}><CloseIcon /></IconButton>
            </Box>

            <Typography variant="caption" sx={{ display: "block", mt: 1 }}>Fase do dia</Typography>

            <FormControl fullWidth size="small" sx={{ mt: 1 }}>
              <InputLabel>Fase</InputLabel>
              <Select value={phase} label="Fase" onChange={(e) => setPhase(e.target.value)}>
                {PHASES.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
              </Select>
            </FormControl>

            <Divider sx={{ my: 2 }} />

            <FormControl fullWidth size="small">
              <InputLabel>Estação</InputLabel>
              <Select value={season} label="Estação" onChange={(e) => setSeason(e.target.value)}>
                {SEASONS.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </Select>
            </FormControl>

            <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
              <TextField label="Dia" type="number" value={day} onChange={(e) => setDay(Number(e.target.value))} size="small" />
              <TextField label="Ano" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} size="small" />
            </Box>

            <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
              <Button variant="contained" onClick={handleSaveWorld}>Aplicar</Button>
              <Button onClick={() => { setPhase(hud?.world?.phase || "manhã"); setSeason(hud?.world?.season || "Verão"); setDay(hud?.world?.day ?? 1); setYear(hud?.world?.year ?? 1); }}>Reverter</Button>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6">XP por Jogador</Typography>
            {players.length === 0 ? (
              <Typography variant="caption" sx={{ mt: 1 }}>Nenhum jogador registrado</Typography>
            ) : (
              <>
                <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                  <TextField label="Valor" type="number" size="small" value={xpValue} onChange={(e) => setXpValue(Number(e.target.value))} sx={{ width: 120 }} />
                  <FormControl fullWidth size="small">
                    <InputLabel>Jogador</InputLabel>
                    <Select value={xpTarget} label="Jogador" onChange={(e) => setXpTarget(e.target.value)}>
                      {players.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Box>

                <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                  <IconButton color="primary" onClick={handleGiveXP}><AddIcon /></IconButton>
                  <IconButton color="secondary" onClick={handleRemoveXP}><RemoveIcon /></IconButton>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle2">Setar XP diretamente</Typography>
                <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                  <TextField label="XP" type="number" size="small" value={xpSetValue} onChange={(e) => setXpSetValue(Number(e.target.value))} sx={{ width: 120 }} />
                  <Button variant="contained" onClick={handleSetXPDirect}>Setar</Button>
                </Box>
              </>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="h6">Cronômetro</Typography>
              <Box sx={{ ml: "auto", display: "flex", gap: 0.5 }}>
                {PRESETS.map(p => <Button key={p} onClick={() => handleStartPreset(p)} variant="contained">{p === 60 ? "1:00" : p === 180 ? "3:00" : "5:00"}</Button>)}
                <IconButton onClick={handleStopTimer}><StopIcon /></IconButton>
                <IconButton onClick={() => handleResetTimer(60)}><RestartAltIcon /></IconButton>
              </Box>
            </Box>

            <Typography sx={{ mt: 2 }}>Estado: {hud?.timer?.running ? "Rodando" : "Parado"}</Typography>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {String(Math.floor((hud.timer?.remaining ?? hud.timer?.duration ?? 0) / 60)).padStart(1, "0")}
              :
              {String((hud.timer?.remaining ?? hud.timer?.duration ?? 0) % 60).padStart(2, "0")}
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

// Dialog wrapper (backwards compatible)
export default function HUDMasterModal({ open, onClose }) {
  const {
    hud,
    setWorldPhase,
    setWorldSeasonDayYear,
    startTimer,
    stopTimer,
    resetTimer,
    addXP,
    setXPDirect,
  } = useGame();

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Painel do Mestre</DialogTitle>
      <DialogContent dividers>
        <MasterPanelInner
          hud={hud}
          setWorldPhase={setWorldPhase}
          setWorldSeasonDayYear={setWorldSeasonDayYear}
          startTimer={startTimer}
          stopTimer={stopTimer}
          resetTimer={resetTimer}
          addXP={addXP}
          setXPDirect={setXPDirect}
          onCloseButton={onClose}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fechar</Button>
      </DialogActions>
    </Dialog>
  );
}

// Named export: content-only panel for embedding into Popper
export function HUDMasterPanel(props) {
  return <MasterPanelInner {...props} />;
}
