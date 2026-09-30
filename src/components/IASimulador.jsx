import React, { useState } from "react";
import {
  Box, Paper, Typography, TextField, Button, Chip, Divider, CircularProgress,
} from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { db } from "../firebaseConfig";
import { doc, setDoc, getDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";

const V3 = {
  paper: "#e8dcc0",
  paperDark: "#d4c4a0",
  gold: "#b8945a",
  goldLight: "#c9a961",
  ink: "#3a2e20",
  red: "#8b2f2f",
  green: "#4a6b3a",
  blue: "#5a6b7a",
};

const API_BASE = window.location.hostname === "localhost"
  ? "http://localhost:5000"
  : "https://reqviem.onrender.com";

function IASimulador({ paises = {}, cidades = {}, commodities = {}, igs = {} }) {
  const [texto, setTexto] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [aplicando, setAplicando] = useState(false);
  const [erro, setErro] = useState("");

  const interpretar = async () => {
    if (!texto.trim()) return;
    setLoading(true);
    setErro("");
    setPreview(null);
    try {
      const contexto = {
        paises: Object.values(paises).map((p) => ({ id: p.id, nome: p.nome })),
        cidades: Object.values(cidades).map((c) => ({ id: c.id, nome: c.nome })),
        commodities: Object.values(commodities).map((c) => ({ id: c.id, nome: c.nome })),
        igs: Object.values(igs).map((i) => ({ id: i.id, nome: i.nome })),
      };
      const resp = await fetch(`${API_BASE}/api/ia-simular`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto, contexto }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.erro || "Erro na IA");
      setPreview(data);
    } catch (e) {
      setErro(e.message);
    } finally {
      setLoading(false);
    }
  };

  const aplicar = async () => {
    if (!preview?.efeitos) return;
    setAplicando(true);
    try {
      const ef = preview.efeitos;

      if (ef.cidadeId && cidades[ef.cidadeId] && ef.camposCidade) {
        const c = cidades[ef.cidadeId];
        const updates = {};
        Object.entries(ef.camposCidade).forEach(([k, v]) => {
          if (v) updates[k] = Math.max(0, Math.min(100, (c[k] || 0) + Number(v)));
        });
        if (Object.keys(updates).length > 0) {
          await setDoc(doc(db, "sim_cidades", ef.cidadeId), updates, { merge: true });
        }
      }

      if (ef.paisId && paises[ef.paisId]) {
        const p = paises[ef.paisId];
        const paisUpdates = {};

        if (ef.camposPais?.cofre) {
          paisUpdates.cofre = Math.max(0, (p.cofre || 0) + Number(ef.camposPais.cofre));
        }

        if (ef.pops && p.pops) {
          const newPops = { ...p.pops };
          Object.entries(ef.pops).forEach(([popTipo, deltas]) => {
            if (newPops[popTipo]) {
              newPops[popTipo] = {
                ...newPops[popTipo],
                lealdade: Math.max(0, Math.min(100, (newPops[popTipo].lealdade || 50) + (Number(deltas.lealdade) || 0))),
                radicalizacao: Math.max(0, Math.min(100, (newPops[popTipo].radicalizacao || 20) + (Number(deltas.radicalizacao) || 0))),
              };
            }
          });
          paisUpdates.pops = newPops;
        }
        if (Object.keys(paisUpdates).length > 0) {
          await setDoc(doc(db, "sim_paises", ef.paisId), paisUpdates, { merge: true });
        }
      }

      if (Array.isArray(ef.igs)) {
        for (const igDelta of ef.igs) {
          if (!igs[igDelta.id]) continue;
          const atual = igs[igDelta.id];
          const upd = {};
          if (igDelta.poder) upd.poder = Math.max(0, Math.min(100, (atual.poder || 50) + Number(igDelta.poder)));
          if (igDelta.humor) upd.humor = Math.max(0, Math.min(100, (atual.humor || 60) + Number(igDelta.humor)));
          if (Object.keys(upd).length > 0) {
            await setDoc(doc(db, "sim_igs", igDelta.id), upd, { merge: true });
          }
        }
      }

      if (Array.isArray(ef.commodities)) {
        for (const cmd of ef.commodities) {
          if (!commodities[cmd.id]) continue;
          const atual = commodities[cmd.id];
          const upd = {};
          if (cmd.oferta) upd.oferta = Math.max(1, (atual.oferta || 100) + Number(cmd.oferta));
          if (cmd.demanda) upd.demanda = Math.max(1, (atual.demanda || 100) + Number(cmd.demanda));
          if (Object.keys(upd).length > 0) {
            await setDoc(doc(db, "sim_commodities", cmd.id), upd, { merge: true });
          }
        }
      }

      await addDoc(collection(db, "sim_historico"), {
        tipo: "ia_narrador",
        textoOriginal: texto,
        titulo: preview.titulo,
        noticia: preview.noticia,
        efeitos: ef,
        criadoEm: new Date().toISOString(),
        criadoPor: "mestre@reqviemrpg.com",
      });

      const redeRef = doc(db, "rede_cyberpunk", "dados");
      const redeSnap = await getDoc(redeRef);
      const noticiasAtuais = redeSnap.exists() ? (redeSnap.data().noticias || []) : [];
      const novaNoticia = {
        id: `n_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
        titulo: preview.titulo || "Acontecimento no Mundo",
        subtitulo: preview.noticia || texto,
        categoria: "📊 Economia",
        dataRPG: localStorage.getItem("reqviem_world_date") || "Verão — 1/1/879",
        timestamp: Date.now(),
        empresasAfetadas: [],
        variacaoPercentual: 0,
        afetarImoveis: false,
        cidadeAlvo: "",
        variacaoImoveis: 0,
      };
      const listaFinal = [novaNoticia, ...noticiasAtuais].slice(0, 40);
      await setDoc(redeRef, { noticias: listaFinal }, { merge: true });

      setPreview(null);
      setTexto("");
      alert("✅ Simulação aplicada e notícia publicada na Rede Neural!");
    } catch (e) {
      alert("Erro ao aplicar: " + e.message);
    } finally {
      setAplicando(false);
    }
  };

  return (
    <Box>
      <Typography variant="caption" sx={{ color: V3.gold, fontWeight: 900, letterSpacing: 1, fontSize: "0.65rem", display: "block", mb: 1 }}>
        🧠 IA NARRADOR (Modo C)
      </Typography>

      <Paper sx={{ p: 1.5, bgcolor: V3.paperDark, border: `1px solid ${V3.gold}66`, mb: 1 }}>
        <TextField
          fullWidth
          multiline
          minRows={3}
          maxRows={6}
          size="small"
          placeholder='Descreva um acontecimento. Ex: "Os operários de Sideris entraram em greve após corte de salários."'
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          sx={{ bgcolor: V3.paper }}
          InputProps={{ sx: { color: V3.ink, fontFamily: "Georgia, serif", fontSize: "0.8rem" } }}
        />
        <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={14} sx={{ color: V3.ink }} /> : <AutoAwesomeIcon />}
            onClick={interpretar}
            disabled={loading || !texto.trim()}
            sx={{ bgcolor: V3.gold, color: V3.ink, fontWeight: 900, "&:hover": { bgcolor: V3.goldLight } }}
          >
            {loading ? "Interpretando..." : "Interpretar com IA"}
          </Button>
        </Box>
        {erro && (
          <Typography variant="caption" sx={{ color: V3.red, display: "block", mt: 1, fontWeight: 800 }}>
            ❌ {erro}
          </Typography>
        )}
      </Paper>

      {preview && (
        <Paper sx={{ p: 1.5, bgcolor: V3.paper, border: `2px solid ${V3.gold}`, mb: 1 }}>
          <Typography variant="subtitle2" sx={{ color: V3.ink, fontWeight: 900, fontFamily: "Georgia, serif" }}>
            {preview.titulo}
          </Typography>
          <Typography variant="caption" sx={{ color: V3.ink, display: "block", mt: 0.5, fontStyle: "italic" }}>
            {preview.noticia}
          </Typography>

          <Divider sx={{ my: 1, borderColor: `${V3.ink}33` }} />

          <Typography variant="caption" sx={{ color: V3.gold, fontWeight: 900, letterSpacing: 1, fontSize: "0.6rem" }}>
            EFEITOS
          </Typography>

          {preview.efeitos?.cidadeId && (
            <Box sx={{ mt: 0.5 }}>
              <Chip label={`🏙️ ${cidades[preview.efeitos.cidadeId]?.nome || preview.efeitos.cidadeId}`} size="small" sx={{ bgcolor: V3.blue, color: V3.paper, fontSize: "0.6rem", mb: 0.5 }} />
              {Object.entries(preview.efeitos.camposCidade || {}).map(([k, v]) =>
                v ? (
                  <Typography key={k} variant="caption" sx={{ color: v > 0 ? V3.green : V3.red, display: "block", fontSize: "0.7rem", fontWeight: 800 }}>
                    {k}: {v > 0 ? "+" : ""}{v}
                  </Typography>
                ) : null
              )}
            </Box>
          )}

          {preview.efeitos?.paisId && (
            <Box sx={{ mt: 0.5 }}>
              <Chip label={`🌍 ${paises[preview.efeitos.paisId]?.nome || preview.efeitos.paisId}`} size="small" sx={{ bgcolor: V3.gold, color: V3.ink, fontSize: "0.6rem", mb: 0.5 }} />
              {preview.efeitos.camposPais?.cofre && (
                <Typography variant="caption" sx={{ color: preview.efeitos.camposPais.cofre > 0 ? V3.green : V3.red, display: "block", fontSize: "0.7rem", fontWeight: 800 }}>
                  💰 cofre: {preview.efeitos.camposPais.cofre > 0 ? "+" : ""}{preview.efeitos.camposPais.cofre}
                </Typography>
              )}
              {preview.efeitos.pops && Object.entries(preview.efeitos.pops).map(([pop, d]) => (
                <Typography key={pop} variant="caption" sx={{ color: V3.ink, display: "block", fontSize: "0.7rem" }}>
                  👥 {pop}: {d.lealdade ? `L ${d.lealdade > 0 ? "+" : ""}${d.lealdade}` : ""} {d.radicalizacao ? `R ${d.radicalizacao > 0 ? "+" : ""}${d.radicalizacao}` : ""}
                </Typography>
              ))}
            </Box>
          )}

          {preview.efeitos?.igs?.length > 0 && (
            <Box sx={{ mt: 0.5 }}>
              {preview.efeitos.igs.map((ig, i) => (
                <Typography key={i} variant="caption" sx={{ color: V3.ink, display: "block", fontSize: "0.7rem" }}>
                  🏛️ {igs[ig.id]?.nome || ig.id}: {ig.poder ? `poder ${ig.poder > 0 ? "+" : ""}${ig.poder}` : ""} {ig.humor ? `humor ${ig.humor > 0 ? "+" : ""}${ig.humor}` : ""}
                </Typography>
              ))}
            </Box>
          )}

          {preview.efeitos?.commodities?.length > 0 && (
            <Box sx={{ mt: 0.5 }}>
              {preview.efeitos.commodities.map((c, i) => (
                <Typography key={i} variant="caption" sx={{ color: V3.ink, display: "block", fontSize: "0.7rem" }}>
                  📦 {commodities[c.id]?.nome || c.id}: {c.oferta ? `oferta ${c.oferta > 0 ? "+" : ""}${c.oferta}` : ""} {c.demanda ? `demanda ${c.demanda > 0 ? "+" : ""}${c.demanda}` : ""}
                </Typography>
              ))}
            </Box>
          )}

          <Box sx={{ display: "flex", gap: 1, mt: 1.5 }}>
            <Button
              variant="contained"
              onClick={aplicar}
              disabled={aplicando}
              sx={{ bgcolor: V3.green, color: V3.paper, fontWeight: 900, "&:hover": { bgcolor: "#3a5a2a" } }}
            >
              {aplicando ? "Aplicando..." : "✓ Aplicar e Publicar"}
            </Button>
            <Button onClick={() => setPreview(null)} sx={{ color: V3.red }}>
              Descartar
            </Button>
          </Box>
        </Paper>
      )}
    </Box>
  );
}

export default IASimulador;