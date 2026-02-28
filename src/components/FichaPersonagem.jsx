  // src/components/FichaPersonagem.jsx
  import React, { useEffect, useState } from "react";
  import {
    Box,
    Button,
    Grid,
    Paper,
    TextField,
    Typography,
    Slider,
    IconButton,
  } from "@mui/material";
  import AddIcon from "@mui/icons-material/Add";
  import DeleteIcon from "@mui/icons-material/Delete";
  import { db } from "../firebaseConfig";
  import { doc, getDoc, setDoc } from "firebase/firestore";
  import { Checkbox, FormControlLabel } from "@mui/material";

  export default function FichaPersonagem({ user, fichaId, isMestre }) {
    const [ficha, setFicha] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [mostrarBackground, setMostrarBackground] = useState(false);
    const [lightboxOpen, setLightboxOpen] = useState(false);
  const [zoom, setZoom] = useState(1);


    const modelo = {
      nome: "",
      genero: "",
      idade: "",
      altura: "",
      peso: "",
      movimentacao: "",
      defeitos: "",
      tracos: "",
      pontosVida: 0,
  pontosEnergia: 0,
  armadura: 0,
      caracteristicas: "",
      imagemPersonagem: "",
      imagens: [],
  imagemPrincipalIndex: 0,
      background: "",
  tipoAura: "",


      atributos: {
        forca: 0,
        destreza: 0,
        agilidade: 0,
        constituicao: 0,
        inteligencia: 0,
        vontade: 0,
      },

      pericias: {
        atletismo: 0,
        luta: 0,
        armaBranca: 0,
        armaDistancia: 0,
        furtividade: 0,
        sobrevivencia: 0,
        conhecimento: 0,
        medicina: 0,
        natureza: 0,
        percepcao: 0,
        investigacao: 0,
        labia: 0,
        performance: 0,
        intimidacao: 0,
        aura: 0,
      },

      habilidades: [],
      moedas: 0,
      equipamentos: [],
      vestes: [],
      diversos: [],
      anotacoes: "",
      dono: user?.email || "",

      ignorarLimitePeso: false,
      ignorarLimiteHabilidades: false,
    };

    const LABELS = {
      titulo: "● FICHA RPG RÉQUIEM ●",
      atributosTitulo: "● ATRIBUTOS ●",
      periciasTitulo: "● PERÍCIAS ●",
      habilidadesTitulo: "● HABILIDADES AURANAS ●",
      itensTitulo: "● ITENS ●",
      anotacoesTitulo: "● ANOTAÇÕES ●",
      backgroundTitulo: "● BACKGROUND ●",
    };

    const TIPOS_AURA = [
    "Titã",
    "Alquimista",
    "Artesão",
    "Fundador",
    "Déspota",
    "Ás",
  ];

  const CORES_AURA = {
    "Titã": "#ff3b3b",
    "Alquimista": "#00e0ff",
    "Artesão": "#ffd700",
    "Fundador": "#00ff88",
    "Déspota": "#a855f7",
    "Ás": "#e5e5e5",
  };
    // Mapeamento textual com acentos e espaços bonitos
    const LABEL_MAP = {
      // Campos principais
      nome: "Nome",
      genero: "Gênero",
      idade: "Idade",
      altura: "Altura",
      peso: "Peso",
      movimentacao: "Movimentação",
      defeitos: "Defeitos",
      tracos: "Traços",
      pontosVida: "Pontos de Vida",
      pontosEnergia: "Pontos de Energia",
      armadura: "Armadura",
      caracteristicas: "Características",
      imagemPersonagem: "Imagem do Personagem",
      background: "História do Personagem",
      anotacoes: "Anotações",

      // Atributos
      forca: "Força",
      destreza: "Destreza",
      agilidade: "Agilidade",
      constituicao: "Constituição",
      inteligencia: "Inteligência",
      vontade: "Vontade",

      // Perícias
      atletismo: "Atletismo",
      luta: "Luta",
      armaBranca: "Arma Branca",
      armaDistancia: "Arma à Distância",
      furtividade: "Furtividade",
      sobrevivencia: "Sobrevivência",
      conhecimento: "Conhecimento",
      medicina: "Medicina",
      natureza: "Natureza",
      percepcao: "Percepção",
      investigacao: "Investigação",
      labia: "Lábia",
      performance: "Performance",
      intimidacao: "Intimidação",
      aura: "Aura",

      // Itens e outros
      equipamentos: "Equipamentos",
      vestes: "Vestuário",
      diversos: "Diversos",
      moedas: "Moedas",
      cobre: "Cobre",
      prata: "Prata",
      ouro: "Ouro",
    };

    useEffect(() => {
      let mounted = true;
      async function carregar() {
        setLoading(true);
        try {
          if (!fichaId) {
            if (mounted) setFicha({ ...modelo });
            return;
          }
          const ref = doc(db, "fichas", fichaId);
          const snap = await getDoc(ref);
          if (snap.exists()) {
            const dados = snap.data();
            if (!dados.imagens && dados.imagemPersonagem) {
    dados.imagens = [dados.imagemPersonagem];
    dados.imagemPrincipalIndex = 0;
  }
            const combinado = {
              ...modelo,
              ...dados,
              atributos: { ...modelo.atributos, ...(dados.atributos || {}) },
              pericias: { ...modelo.pericias, ...(dados.pericias || {}) },
              habilidades: Array.isArray(dados.habilidades)
                ? dados.habilidades
                : [],
              moedas: { ...modelo.moedas, ...(dados.moedas || {}) },
              equipamentos: Array.isArray(dados.equipamentos)
                ? dados.equipamentos
                : [],
              vestes: Array.isArray(dados.vestes) ? dados.vestes : [],
              diversos: Array.isArray(dados.diversos) ? dados.diversos : [],
            };
            if (mounted) setFicha(combinado);
          } else {
            await setDoc(ref, modelo);
            if (mounted) setFicha({ ...modelo });
          }
        } catch (err) {
          console.error("Erro carregar ficha:", err);
          if (mounted) setFicha({ ...modelo });
        } finally {
          if (mounted) setLoading(false);
        }
      }
      carregar();
      return () => (mounted = false);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fichaId]);


    function setCampo(chave, valor) {
      setFicha((p) => ({ ...p, [chave]: valor }));
    }
    function setSubCampo(obj, chave, valor) {
      setFicha((p) => ({ ...p, [obj]: { ...p[obj], [chave]: valor } }));
    }

    function adicionarHabilidade() {
      setFicha((p) => ({
        ...p,
        habilidades: [
          ...(p.habilidades || []),
          { nome: "", descricao: "", condicoes: "", limitacoes: "" },
        ],
      }));
    }
    function atualizarHabilidade(i, campo, valor) {
      setFicha((p) => {
        const arr = [...(p.habilidades || [])];
        arr[i] = { ...arr[i], [campo]: valor };
        return { ...p, habilidades: arr };
      });
    }
    function removerHabilidade(i) {
      setFicha((p) => ({
        ...p,
        habilidades: p.habilidades.filter((_, idx) => idx !== i),
      }));
    }

    function adicionarItem(tipo) {
      setFicha((p) => ({
        ...p,
        [tipo]: [
          ...(p[tipo] || []),
          { quantidade: 1, nome: "", durabilidade: 100 },
        ],
      }));
    }

    function atualizarItem(tipo, i, campo, valor) {
      setFicha((p) => {
        const arr = [...(p[tipo] || [])];
        arr[i] = { ...arr[i], [campo]: valor };
        return { ...p, [tipo]: arr };
      });
    }
    function removerItem(tipo, i) {
      setFicha((p) => ({
        ...p,
        [tipo]: p[tipo].filter((_, idx) => idx !== i),
      }));
    }

    async function salvarFicha() {
      if (!fichaId) return alert("FichaId inválido.");
      setSaving(true);
      try {
        const ref = doc(db, "fichas", fichaId);
        const toSave = {
          ...ficha,
          atributos: Object.fromEntries(
            Object.entries(ficha.atributos || {}).map(([k, v]) => [k, Number(v || 0)])
          ),
          pericias: Object.fromEntries(
            Object.entries(ficha.pericias || {}).map(([k, v]) => [k, Number(v || 0)])
          ),
          moedas: Number(ficha.moedas || 0),
        };
        await setDoc(ref, toSave, { merge: true });
        alert("Ficha salva com sucesso!");
      } catch (err) {
        console.error(err);
        alert("Erro ao salvar.");
      } finally {
        setSaving(false);
      }
    }

    async function handleUploadImagem(e) {
    const file = e.target.files?.[0];
    if (!file || !fichaId) return;

    if ((ficha.imagens?.length || 0) >= 5) {
      alert("Limite máximo de 5 imagens atingido.");
      return;
    }

    let apiBase = "";
    try {
      apiBase = import.meta?.env?.VITE_SERVER_URL || "";
    } catch {
      apiBase = "";
    }

    if (!apiBase) {
      apiBase =
        window.location.hostname === "localhost"
          ? "http://localhost:5000"
          : "https://app-rpg.onrender.com";
    }

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch(`${apiBase}/upload`, {
        method: "POST",
        body: fd,
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      if (!data?.url) throw new Error("Sem URL");

      const novasImagens = [...(ficha.imagens || []), data.url];

      const novoIndex =
        ficha.imagens?.length === 0 ? 0 : ficha.imagemPrincipalIndex || 0;

      const novaFicha = {
        ...ficha,
        imagens: novasImagens,
        imagemPrincipalIndex: novoIndex,
        imagemPersonagem: novasImagens[novoIndex],
      };

      setFicha(novaFicha);

      const ref = doc(db, "fichas", fichaId);
      await setDoc(ref, novaFicha, { merge: true });

    } catch (err) {
      alert("Erro no upload: " + err.message);
    }
  }


    if (loading)
      
      return (
        <Box p={2}>
          <Typography component="div">Carregando ficha...</Typography>
        </Box>
      );
  // ================= PESO AUTOMÁTICO =================

  // Peso atual (cada item conta 1 independente da quantidade)
  const pesoAtual =
    (ficha.equipamentos?.length || 0) +
    (ficha.vestes?.length || 0) +
    (ficha.diversos?.length || 0);

  // Atributos relevantes
  const forca = Number(ficha.atributos?.forca || 0);
  const atletismo = Number(ficha.pericias?.atletismo || 0);

  // Fórmula
  const pesoMaximo = 10 + (forca * 2) + (atletismo * 2);

  // Verificação
  const sobrecarregado =
    !ficha?.ignorarLimitePeso && pesoAtual >= pesoMaximo;

    // ================= STATUS AUTOMÁTICOS =================

  // ===== VIDA =====
  const constituicao = Number(ficha?.atributos?.constituicao || 0);
  const sobrevivencia = Number(ficha?.pericias?.sobrevivencia || 0);
  const pontosVidaMax = 100 + (constituicao + sobrevivencia) * 10;

  // ===== ENERGIA =====
  const vontade = Number(ficha?.atributos?.vontade || 0);
  const aura = Number(ficha?.pericias?.aura || 0);
  const limiteHabilidades = Math.min(aura, 5);
  const podeIgnorarLimiteHab = ficha?.ignorarLimiteHabilidades || false;
  const habilidadesNoLimite =
    !podeIgnorarLimiteHab &&
    ficha.habilidades.length >= limiteHabilidades;
  const pontosEnergiaMax = 10 + (vontade + aura) * 5;

  // ===== MOVIMENTAÇÃO =====
  const agilidade = Number(ficha?.atributos?.agilidade || 0);
  const furtividade = Number(ficha?.pericias?.furtividade || 0);
  const movimentacaoCalculada = 10 + (agilidade + furtividade) * 5;

  // ===== ARMADURA =====
  const armaduraMax = 50;

    return (
      <Paper sx={{ p: 2, bgcolor: "#07121a", color: "#fff", height: "100%", overflowY: "auto" }}>
        {/* título como h5 (mantém sem p) */}
        <Typography variant="h5" gutterBottom component="h2">{LABELS.titulo}</Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} md={9}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                {["nome", "genero", "idade", "altura", "peso"].map((campo) => (
                  
                  <Box key={campo} sx={{ mb: 1 }}>
                    {/* label como div para evitar <p> aninhado */}
                    <Typography component="div">{LABEL_MAP[campo] || campo}</Typography>
                    <TextField fullWidth size="small" value={ficha[campo]} onChange={(e) => setCampo(campo, e.target.value)} />
                  </Box>
                ))}
                <Box sx={{ mb: 1 }}>
    <Typography component="div">Movimentação</Typography>
    <TextField
      fullWidth
      size="small"
      value={`${movimentacaoCalculada} m/t`}
      InputProps={{ readOnly: true }}
    />
  </Box>
              </Grid>
              <Grid item xs={12} md={6}>

                
                {/* Campos normais */}
  {["defeitos", "tracos", "caracteristicas"].map((campo) => (
    <Box key={campo} sx={{ mb: 1 }}>
      <Typography component="div">{LABEL_MAP[campo]}</Typography>
      <TextField
        fullWidth
        size="small"
        value={ficha[campo]}
        onChange={(e) => setCampo(campo, e.target.value)}
      />
    </Box>
  ))}

  {/* Pontos de Vida */}
  <Box sx={{ mb: 1 }}>
    <Typography component="div">Pontos de Vida</Typography>
    <Grid container spacing={1} alignItems="center">
      <Grid item xs={6}>
        <TextField
          fullWidth
          size="small"
          type="number"
          value={ficha.pontosVida}
          onChange={async (e) => {
  const valor = Math.min(Number(e.target.value), pontosVidaMax);

  setCampo("pontosVida", valor);

  const ref = doc(db, "fichas", fichaId);
  await setDoc(ref, { pontosVida: valor }, { merge: true });
}}
        />
      </Grid>
      <Grid item xs={6}>
        <Typography>
    / <span style={{ color: "#ff4d4f", fontWeight: 600 }}>
        {pontosVidaMax}
      </span>
  </Typography>
      </Grid>
    </Grid>
  </Box>

  {/* Pontos de Energia */}
  <Box sx={{ mb: 1 }}>
    <Typography component="div">Pontos de Energia</Typography>
    <Grid container spacing={1} alignItems="center">
      <Grid item xs={6}>
        <TextField
          fullWidth
          size="small"
          type="number"
          value={ficha.pontosEnergia}
          onChange={async (e) => {
  const valor = Math.min(Number(e.target.value), pontosEnergiaMax);

  setCampo("pontosEnergia", valor);

  const ref = doc(db, "fichas", fichaId);
  await setDoc(ref, { pontosEnergia: valor }, { merge: true });
}}
        />
      </Grid>
      <Grid item xs={6}>
        <Typography>
    / <span style={{ color: "#facc15", fontWeight: 600 }}>
        {pontosEnergiaMax}
      </span>
  </Typography>
      </Grid>
    </Grid>
  </Box>

  {/* Armadura */}
  <Box sx={{ mb: 1 }}>
    <Typography component="div">Armadura</Typography>
    <Grid container spacing={1} alignItems="center">
      <Grid item xs={6}>
        <TextField
          fullWidth
          size="small"
          type="number"
          value={ficha.armadura}
          onChange={(e) => {
    const valor = Math.min(Number(e.target.value), armaduraMax);
    setCampo("armadura", valor);
  }}
        />
      </Grid>
      <Grid item xs={6}>
        <Typography>
          / {armaduraMax}
        </Typography>
      </Grid>
    </Grid>
  </Box>
              </Grid>
            </Grid>

            <Box mt={2}>
              <Typography component="div">{LABELS.atributosTitulo}</Typography>
              {Object.entries(ficha.atributos).map(([k, v]) => (
                <Box key={k} sx={{ mb: 1 }}>
                  <Typography component="div" sx={{ fontSize: 14 }}>{LABEL_MAP[k] || k}</Typography>
                  <Slider value={Number(v || 0)} min={0} max={5} step={1} onChange={(e, val) => setSubCampo("atributos", k, val)} valueLabelDisplay="auto" />
                </Box>
              ))}
            </Box>

            <Box mt={2}>
              <Typography component="div">{LABELS.periciasTitulo}</Typography>
              {Object.entries(ficha.pericias).map(([k, v]) => (
                <Box key={k} sx={{ mb: 1 }}>
                  <Typography component="div" sx={{ fontSize: 14 }}>{LABEL_MAP[k] || k}</Typography>
                  <Slider value={Number(v || 0)} min={0} max={5} step={1} onChange={(e, val) => setSubCampo("pericias", k, val)} valueLabelDisplay="auto" />
                </Box>
              ))}
            </Box>
            <Box mt={2}>
              {/* usar div para evitar p-nested */}
              <Box
    display="flex"
    justifyContent="space-between"
    alignItems="center"
    sx={{
      borderBottom: `2px solid ${CORES_AURA[ficha.tipoAura] || "#00e0ff"}`,
      pb: 1,
      mb: 1,
    }}
  >
    <Typography component="div" sx={{ fontWeight: "bold" }}>
      {LABELS.habilidadesTitulo}
    </Typography>

    {isMestre ? (
  <>
    <TextField
      select
      size="small"
      value={ficha.tipoAura || ""}
      onChange={(e) => setCampo("tipoAura", e.target.value)}
      SelectProps={{ native: true }}
      sx={{
        minWidth: 160,
        bgcolor: "#021319",
        borderRadius: 1,
      }}
    >
      <option value=""></option>
      {TIPOS_AURA.map((t) => (
        <option key={t} value={t}>{t}</option>
      ))}
    </TextField>

    <FormControlLabel
      control={
        <Checkbox
          checked={ficha.ignorarLimiteHabilidades || false}
          onChange={async (e) => {
            const novoValor = e.target.checked;

            setFicha((prev) => ({
              ...prev,
              ignorarLimiteHabilidades: novoValor,
            }));

            const ref = doc(db, "fichas", fichaId);
            await setDoc(
              ref,
              { ignorarLimiteHabilidades: novoValor },
              { merge: true }
            );
          }}
          size="small"
        />
      }
      label="Ignorar limite"
    />
  </>
) : (
  <Typography
    sx={{
      fontWeight: "bold",
      color: CORES_AURA[ficha.tipoAura] || "#00e0ff",
      textDecoration: "underline",
      textShadow: `0 0 6px ${CORES_AURA[ficha.tipoAura] || "#00e0ff"}`,
      fontSize: 16,
    }}
  >
    ✨ {ficha.tipoAura || "—"}
  </Typography>
)}
  </Box>
              {ficha.habilidades.map((h, i) => (
                <Paper key={i} sx={{ p: 1, mb: 1 }}>
                  <Grid container spacing={1}>
                    <Grid item xs={11}>
                      {["nome", "descricao", "condicoes", "limitacoes"].map((campo) => (
                        <TextField
                          key={campo}
                          label={campo.charAt(0).toUpperCase() + campo.slice(1)}
                          fullWidth
                          size="small"
                          multiline={["descricao", "condicoes", "limitacoes"].includes(campo)}
                          value={h[campo]}
                          onChange={(e) => atualizarHabilidade(i, campo, e.target.value)}
                          sx={{ mb: 1 }}
                        />
                      ))}
                    </Grid>
                    <Grid item xs={1}>
                      <IconButton color="error" onClick={() => removerHabilidade(i)}>
                        <DeleteIcon />
                      </IconButton>
                    </Grid>
                  </Grid>
                </Paper>
              ))}
              <Button
    variant="outlined"
    startIcon={<AddIcon />}
    disabled={habilidadesNoLimite}
    onClick={() => {
      if (habilidadesNoLimite) {
        alert("Limite de habilidades atingido pela Perícia Aura.");
        return;
      }
      adicionarHabilidade();
    }}
  >
                Adicionar Habilidade
              </Button>
            </Box>

            <Box mt={2}>
              <Box
    display="flex"
    justifyContent="space-between"
    alignItems="center"
    sx={{
      borderBottom: `2px solid ${
        ficha?.ignorarLimitePeso
          ? "#00ffff"
          : sobrecarregado
          ? "#ff0000"
          : "#ffaa00"
      }`,
      pb: 1,
      mb: 1,
    }}
  >
    <Typography component="div" sx={{ fontWeight: "bold" }}>
      {LABELS.itensTitulo}
    </Typography>

    <Box display="flex" alignItems="center" gap={2}>
      <Typography
        sx={{
          fontWeight: "bold",
          color: ficha?.ignorarLimitePeso
            ? "#00ffff"
            : sobrecarregado
            ? "#ff4444"
            : "#ffaa00",
          textDecoration: "underline",
          fontSize: 16,
        }}
      >
        🏋️ {pesoAtual} / {pesoMaximo}
      </Typography>

      {isMestre && (
        <FormControlLabel
          control={
            <Checkbox
              checked={ficha.ignorarLimitePeso || false}
  onChange={async (e) => {
    const novoValor = e.target.checked;

    // Atualiza estado local
    setFicha((prev) => ({
      ...prev,
      ignorarLimitePeso: novoValor,
    }));

    // Salva no Firestore
    const ref = doc(db, "fichas", fichaId);
    await setDoc(ref, { ignorarLimitePeso: novoValor }, { merge: true });
  }}
              size="small"
            />
          }
          label="Ignorar limite"
        />
      )}
    </Box>
  </Box>
              {["equipamentos", "vestes", "diversos"].map((tipo) => (
                <Box mt={2} key={tipo}>
                  <Typography component="div">{LABEL_MAP[tipo] || tipo}</Typography>
                  {ficha[tipo].map((it, i) => (
                    <Grid
                      container
                      key={i}
                      spacing={1}
                      alignItems="center"
                      sx={{ mt: 1 }}
                    >
                      <Grid item xs={2}>
                        <TextField
                          label="Quantidade"
                          type="number"
                          size="small"
                          value={it.quantidade}
                          onChange={(e) =>
                            atualizarItem(tipo, i, "quantidade", Number(e.target.value))
                          }
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          label="Nome"
                          fullWidth
                          size="small"
                          value={it.nome}
                          onChange={(e) => atualizarItem(tipo, i, "nome", e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={3}>
                        <TextField
                          label="Durabilidade"
                          type="number"
                          size="small"
                          value={it.durabilidade}
                          onChange={(e) =>
                            atualizarItem(
                              tipo,
                              i,
                              "durabilidade",
                              Number(e.target.value)
                            )
                          }
                        />
                      </Grid>
                      <Grid item xs={1}>
                        <IconButton color="error" onClick={() => removerItem(tipo, i)}>
                          <DeleteIcon />
                        </IconButton>
                      </Grid>
                    </Grid>
                  ))}
                  <Button
    startIcon={<AddIcon />}
    variant="outlined"
    sx={{ mt: 1 }}
  disabled={!ficha?.ignorarLimitePeso && pesoAtual >= pesoMaximo}
    onClick={() => {
      if (!ficha?.ignorarLimitePeso && pesoAtual >= pesoMaximo) {
    alert("Peso máximo atingido");
    return;
  }
      adicionarItem(tipo);
    }}
  >
                    Adicionar {LABEL_MAP[tipo] || tipo}
                  </Button>
                </Box>
              ))}
            </Box>

            {/* Anotações */}
            <Box mt={2}>
              <Typography component="div">{LABELS.anotacoesTitulo}</Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                value={ficha.anotacoes}
                onChange={(e) => setCampo("anotacoes", e.target.value)}
              />
            </Box>

            {/* Background */}
            <Box mt={2}>
              <Button
                variant="outlined"
                onClick={() => setMostrarBackground(!mostrarBackground)}
                sx={{ mb: 1 }}
              >
                {mostrarBackground ? "Esconder Background" : "Mostrar Background"}
              </Button>
              {mostrarBackground && (
                <TextField
                  fullWidth
                  multiline
                  rows={6}
                  value={ficha.background}
                  onChange={(e) => setCampo("background", e.target.value)}
                  placeholder="Escreva aqui a história do personagem..."
                />
              )}
            </Box>

            {/* Salvar */}
            <Box mt={2} sx={{ display: "flex", justifyContent: "flex-end" }}>
              <Button
                variant="contained"
                color="primary"
                onClick={salvarFicha}
                disabled={saving}
              >
                {saving ? "Salvando..." : "Salvar Ficha"}
              </Button>
            </Box>
          </Grid>

          {/* Painel da imagem */}
          <Grid item xs={12} md={3}>
            <Paper
    sx={{
      p: 2,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 1,
    }}
  >
    <Typography component="div">Personagem</Typography>

    {/* IMAGEM PRINCIPAL */}
    {ficha.imagens?.length > 0 ? (
      <img
    src={ficha.imagens[ficha.imagemPrincipalIndex || 0]}
    onClick={() => {
      setZoom(1);
      setLightboxOpen(true);
    }}
    style={{
      width: "100%",
      borderRadius: 8,
      objectFit: "cover",
      cursor: "zoom-in",
    }}
  />
    ) : (
      <Box
        sx={{
          width: "100%",
          height: 180,
          bgcolor: "#021319",
          borderRadius: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography>Sem imagem</Typography>
      </Box>
    )}

    {/* MINIATURAS COM DRAG */}
    <Box
      sx={{
        display: "flex",
        gap: 1,
        flexWrap: "wrap",
        mt: 1,
      }}
    >
    {(ficha.imagens || []).map((url, index) => (
    <Box
      key={url}
      sx={{
        position: "relative",
        width: 70,
        height: 70,
      }}
    >
      <img
        src={url}
        draggable
        onClick={async () => {
    const novaFicha = {
      ...ficha,
      imagemPrincipalIndex: index,
      imagemPersonagem: ficha.imagens[index],
    };

    setFicha(novaFicha);

    const ref = doc(db, "fichas", fichaId);
    await setDoc(ref, {
      imagemPrincipalIndex: index,
      imagemPersonagem: ficha.imagens[index],
    }, { merge: true });
  }}
        onDragStart={(e) => {
          e.dataTransfer.setData("index", index);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={async (e) => {
          const from = Number(e.dataTransfer.getData("index"));
          const to = index;

          const novas = [...ficha.imagens];
          const [movida] = novas.splice(from, 1);
          novas.splice(to, 0, movida);

          const novaFicha = {
            ...ficha,
            imagens: novas,
            imagemPrincipalIndex: 0,
            imagemPersonagem: novas[0],
          };

          setFicha(novaFicha);

          const ref = doc(db, "fichas", fichaId);
          await setDoc(ref, novaFicha, { merge: true });
        }}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          borderRadius: 6,
          cursor: "grab",
          border:
            index === (ficha.imagemPrincipalIndex || 0)
              ? "3px solid gold"
              : "1px solid #333",
        }}
      />

      {/* BOTÃO DEFINIR PRINCIPAL */}
      {index !== ficha.imagemPrincipalIndex && (
        <Button
          size="small"
          variant="contained"
          sx={{
            position: "absolute",
            bottom: 2,
            left: 2,
            fontSize: 10,
            minWidth: 0,
            px: 1,
          }}
          onClick={async () => {
            const novaFicha = {
              ...ficha,
              imagemPrincipalIndex: index,
              imagemPersonagem: ficha.imagens[index],
            };

            setFicha(novaFicha);

            const ref = doc(db, "fichas", fichaId);
            await setDoc(ref, {
              imagemPrincipalIndex: index,
              imagemPersonagem: ficha.imagens[index],
            }, { merge: true });
          }}
        >
          ⭐
        </Button>
      )}

      {/* BOTÃO REMOVER */}
      <IconButton
        size="small"
        color="error"
        sx={{
          position: "absolute",
          top: -10,
          right: -10,
          bgcolor: "#111",
        }}
        onClick={async () => {
          const novas = ficha.imagens.filter((_, i) => i !== index);

          const novoIndex =
            index === ficha.imagemPrincipalIndex ? 0 : ficha.imagemPrincipalIndex;

          const novaFicha = {
            ...ficha,
            imagens: novas,
            imagemPrincipalIndex: novas.length ? novoIndex : 0,
            imagemPersonagem: novas.length ? novas[novoIndex] : "",
          };

          setFicha(novaFicha);

          const ref = doc(db, "fichas", fichaId);
          await setDoc(ref, novaFicha, { merge: true });
        }}
      >
        <DeleteIcon fontSize="small" />
      </IconButton>
    </Box>
  ))}
    </Box>

    <Button
      variant="outlined"
      component="label"
      sx={{ mt: 1, width: "100%" }}
    >
      Upload Imagem
      <input
        type="file"
        accept="image/*"
        hidden
        onChange={handleUploadImagem}
      />
    </Button>
  </Paper>
                  </Grid>
        </Grid>

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
              src={ficha.imagens[ficha.imagemPrincipalIndex || 0]}
              zoom={zoom}
              setZoom={setZoom}
            />
          </Box>
        )}

      </Paper>
    );
  }
  // ================= LIGHTBOX IMAGE =================
  function LightboxImage({ src, zoom, setZoom }) {
    const [position, setPosition] = React.useState({ x: 0, y: 0 });
    const [dragging, setDragging] = React.useState(false);
    const [start, setStart] = React.useState({ x: 0, y: 0 });
    const [initialDistance, setInitialDistance] = React.useState(null);

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

    const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((z) => Math.min(Math.max(z + delta, 0.5), 5));
  };

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

    React.useEffect(() => {
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
          onWheel={handleWheel}
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