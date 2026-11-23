// src/components/AnotacoesFlutuante.jsx
import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Box, Paper, Typography, IconButton, Button, TextField } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import SaveIcon from "@mui/icons-material/Save";
import DeleteIcon from "@mui/icons-material/Delete";
import ImageIcon from "@mui/icons-material/Image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { db } from "../firebaseConfig";
import { doc, setDoc, onSnapshot } from "firebase/firestore";

// Converte HTML copiado de sites como DeepSeek em Markdown
function htmlToMarkdown(html) {
  const parsed = new DOMParser().parseFromString(html, "text/html");

  const convert = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent.replace(/\u00a0/g, " ");
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return "";

    const tag = node.tagName.toLowerCase();

    const children = () =>
      Array.from(node.childNodes).map(convert).join("");

    switch (tag) {
      case "br":
        return "\n";

      case "h1":
      case "h2":
      case "h3":
      case "h4":
      case "h5":
      case "h6":
        return `${"#".repeat(Number(tag[1]))} ${children().trim()}\n\n`;

      case "p":
        return `${children().trim()}\n\n`;

      case "strong":
      case "b":
        return `**${children()}**`;

      case "em":
      case "i":
        return `*${children()}*`;

      case "u":
        return `<u>${children()}</u>`;

      case "del":
      case "s":
        return `~~${children()}~~`;

      case "a": {
        const href = node.getAttribute("href");
        const content = children();
        return href ? `[${content}](${href})` : content;
      }

      case "img": {
        const src = node.getAttribute("src");
        const alt = node.getAttribute("alt") || "Imagem";
        return src ? `![${alt}](${src})` : "";
      }

      case "table": {
        const rows = Array.from(node.querySelectorAll("tr"));

        if (!rows.length) return "";

        const convertedRows = rows.map((row) => {
          const cells = Array.from(row.children)
            .filter((cell) => ["TD", "TH"].includes(cell.tagName))
            .map((cell) =>
              Array.from(cell.childNodes)
                .map(convert)
                .join("")
                .replace(/\s*\n\s*/g, " ")
                .replace(/\|/g, "\\|")
                .trim()
            );

          return `| ${cells.join(" | ")} |`;
        });

        const firstRow = rows[0];
        const headerCells = Array.from(firstRow.children)
          .filter((cell) => ["TD", "TH"].includes(cell.tagName));

        const separator =
          `| ${headerCells.map(() => "---").join(" | ")} |`;

        convertedRows.splice(1, 0, separator);

        return `\n\n${convertedRows.join("\n")}\n\n`;
      }

      case "ul":
      case "ol": {
        const items = Array.from(node.children)
          .filter((child) => child.tagName === "LI");

        return items.map((item, index) => {
          const marker = tag === "ol" ? `${index + 1}.` : "-";
          return `${marker} ${convert(item).trim()}`;
        }).join("\n") + "\n\n";
      }

      case "li":
        return children();

      case "blockquote":
        return children().trim().split("\n")
          .map((line) => `> ${line}`)
          .join("\n") + "\n\n";

      case "hr":
        return "\n\n---\n\n";

      case "div":
      case "section":
      case "article":
        return `${children()}\n`;

      default:
        return children();
    }
  };

  return Array.from(parsed.body.childNodes)
    .map(convert)
    .join("")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const IMGBB_API_KEY = "73fcf242ce0108665fa0c9e9de33bd50";

function AnotacoesFlutuante({ userEmail, userNick, onClose }) {
const [posicao, setPosicao] = useState({ x: 100, y: 60 });
const [tamanho, setTamanho] = useState({ width: 900, height: 720 });
  const [minimizado, setMinimizado] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const [redimensionando, setRedimensionando] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const [capitulos, setCapitulos] = useState([]);
  const [editandoIndex, setEditandoIndex] = useState(null);

// Capítulo atualmente selecionado
const [capituloSelecionado, setCapituloSelecionado] = useState(null);

// Inicia sempre no modo de leitura
const [modoEdicao, setModoEdicao] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const [lightboxImage, setLightboxImage] = useState(null);
  const [zoom, setZoom] = useState(1);
  const textAreaRef = useRef(null);
const [enviandoImagem, setEnviandoImagem] = useState(false);

  useEffect(() => {
    if (!userEmail) return;
    // 🟢 Agora lê da MESMA fonte que a ficha: fichas/{email}.anotacoes
    const ref = doc(db, "fichas", userEmail);
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) {
        setCapitulos([]);
        return;
      }
      const dados = snap.data();
      if (dados.anotacoes) {
        try {
          const parsed = JSON.parse(dados.anotacoes);
          if (Array.isArray(parsed)) {
            setCapitulos(parsed);
          } else {
            setCapitulos([{ titulo: "Anotação", texto: dados.anotacoes || "" }]);
          }
        } catch {
          // Compatibilidade com o formato antigo (texto puro)
          setCapitulos([{ titulo: "Anotação", texto: dados.anotacoes || "" }]);
        }
      } else {
        setCapitulos([]);
      }
    });
    return () => unsub();
  }, [userEmail]);
  // Seleciona automaticamente o primeiro capítulo ao abrir
useEffect(() => {
  if (
    capituloSelecionado === null &&
    capitulos.length > 0 &&
    !modoEdicao
  ) {
    setCapituloSelecionado(0);
    setEditandoIndex(0);
    setTitulo(capitulos[0].titulo || "");
    setTexto(capitulos[0].texto || "");
  }
}, [capitulos, capituloSelecionado, modoEdicao]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (arrastando) setPosicao({ x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y });
      if (redimensionando) setTamanho({ width: Math.max(500, resizeStartRef.current.width + (e.clientX - resizeStartRef.current.x)), height: Math.max(350, resizeStartRef.current.height + (e.clientY - resizeStartRef.current.y)) });
    };
    const handleMouseUp = () => { setArrastando(false); setRedimensionando(false); };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => { window.removeEventListener("mousemove", handleMouseMove); window.removeEventListener("mouseup", handleMouseUp); };
  }, [arrastando, redimensionando]);

  const salvar = async (novosCapitulos) => {
    // 🟢 Salva na MESMA fonte que a ficha: fichas/{email}.anotacoes (JSON)
    await setDoc(
      doc(db, "fichas", userEmail),
      {
        anotacoes: JSON.stringify(novosCapitulos),
        atualizadoEm: new Date().toISOString(),
      },
      { merge: true }
    );
  };

const novoCapitulo = () => {
  setEditandoIndex(null);
  setCapituloSelecionado(null);
  setTitulo("");
  setTexto("");
  setModoEdicao(true);
};

const salvarCapitulo = async () => {
  let novos;
  let indiceSalvo;

  if (editandoIndex !== null) {
    novos = [...capitulos];

    indiceSalvo = editandoIndex;

    novos[indiceSalvo] = {
      titulo: titulo || `Capítulo ${indiceSalvo + 1}`,
      texto
    };

  } else {
    novos = [
      ...capitulos,
      {
        titulo: titulo || `Capítulo ${capitulos.length + 1}`,
        texto
      }
    ];

    indiceSalvo = novos.length - 1;
  }

  setCapitulos(novos);

  await salvar(novos);

  setEditandoIndex(indiceSalvo);
  setCapituloSelecionado(indiceSalvo);

  setTitulo(novos[indiceSalvo].titulo);
  setTexto(novos[indiceSalvo].texto);

  setModoEdicao(false);
};

const deletarCapitulo = async (idx) => {
  const novos = capitulos.filter((_, i) => i !== idx);

  setCapitulos(novos);
  await salvar(novos);

  if (capituloSelecionado === idx || novos.length === 0) {
    setCapituloSelecionado(null);
    setEditandoIndex(null);
    setTitulo("");
    setTexto("");
    setModoEdicao(false);
  } else if (capituloSelecionado > idx) {
    const novoIndice = capituloSelecionado - 1;

    setCapituloSelecionado(novoIndice);
    setEditandoIndex(novoIndice);
    setTitulo(novos[novoIndice].titulo || "");
    setTexto(novos[novoIndice].texto || "");
  }
};

const handleUploadImagem = async (e) => {
  const input = e.target;
  const file = input.files?.[0];

  if (!file) return;

  try {
    if (!file.type.startsWith("image/")) {
      alert("Selecione um arquivo de imagem válido.");
      return;
    }

    if (file.size > 32 * 1024 * 1024) {
      alert("A imagem ultrapassa o limite de 32 MB.");
      return;
    }

    setEnviandoImagem(true);

    const fd = new FormData();
    fd.append("image", file);

    const res = await fetch(
      `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,
      {
        method: "POST",
        body: fd
      }
    );

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(
        data?.error?.message ||
        `Erro HTTP ${res.status} ao enviar imagem.`
      );
    }

    const url = data.data.display_url || data.data.url;

    if (!url) {
      throw new Error("O ImgBB não retornou o endereço da imagem.");
    }

    const imagemMarkdown = `\n\n![Imagem](${url})\n\n`;

    setTexto((prev) => {
      const separador = prev.trim() ? "\n\n" : "";
      return prev + separador + imagemMarkdown.trim() + "\n\n";
    });

    alert("Imagem enviada com sucesso!");

  } catch (err) {
    console.error("Erro no upload da imagem:", err);

    alert(
      `Não foi possível enviar a imagem.\n\nMotivo: ${err.message}`
    );

  } finally {
    setEnviandoImagem(false);
    input.value = "";
  }
};


// COLAGEM INTELIGENTE DO DEEPSEEK NAS ANOTAÇÕES
const handlePasteAnotacoes = (e) => {
  const clipboard = e.clipboardData;
  const html = clipboard.getData("text/html");

  // Se não houver HTML, permite a colagem normal.
  if (!html) return;

  const markdown = htmlToMarkdown(html);

  if (!markdown) return;

  e.preventDefault();

  const textarea = textAreaRef.current;

  if (!textarea) return;

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const atual = textarea.value;

  const antes = atual.slice(0, start);
  const depois = atual.slice(end);

  const novoTexto = antes + markdown + depois;

  setTexto(novoTexto);

  const novaPosicao = antes.length + markdown.length;

  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(novaPosicao, novaPosicao);
  });
};


  return createPortal(
    <Paper elevation={10} sx={{ position: "fixed", left: posicao.x, top: posicao.y, width: minimizado ? 300 : tamanho.width,
height: minimizado ? 48 : tamanho.height,
maxWidth: 'calc(100vw - 24px)',
maxHeight: 'calc(100vh - 24px)',
boxSizing: 'border-box', bgcolor: "#0f172a", color: "#fff", borderRadius: 2, border: "2px solid #fbbf24", zIndex: 9998, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.8)" }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 1, bgcolor: "#fbbf24", cursor: "move", minHeight: 40 }}
        onMouseDown={(e) => { if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return; e.preventDefault(); setArrastando(true); dragStartRef.current = { x: e.clientX - posicao.x, y: e.clientY - posicao.y }; }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <span>📝</span>
          <Typography variant="subtitle2" sx={{ color: "#000", fontWeight: "bold" }}>{minimizado ? "Anotações" : `Anotações - ${userNick || "Mestre"}`}</Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <IconButton size="small" onClick={() => setMinimizado(!minimizado)} sx={{ color: "#000", p: 0.5 }}>{minimizado ? "□" : "−"}</IconButton>
          <IconButton size="small" onClick={onClose} sx={{ color: "#000", p: 0.5 }}><CloseIcon fontSize="small" /></IconButton>
        </Box>
      </Box>
      {!minimizado && (
        <Box sx={{
  flex: 1,
  minHeight: 0,
  minWidth: 0,
  display: "flex",
  gap: 1,
  p: 1.5,
  overflow: "hidden"
}}>
          {/* Lista de capítulos (igual à ficha) */}
          <Box sx={{ width: 200, borderRight: "1px solid #fbbf2433", pr: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 0.5 }}>
            <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={novoCapitulo} sx={{ bgcolor: '#fbbf24', color: '#000', fontSize: '0.7rem', mb: 1 }}>Novo</Button>
            {capitulos.map((cap, idx) => (
<Paper
  key={idx}
  sx={{
    p: 1,
    bgcolor: capituloSelecionado === idx
      ? '#1e3a5f'
      : '#1a1a2e',
    cursor: 'pointer',
    border: capituloSelecionado === idx
      ? '1px solid #fbbf24'
      : '1px solid #334155'
  }}
  onClick={() => {
    setCapituloSelecionado(idx);
    setEditandoIndex(idx);
    setTitulo(cap.titulo);
    setTexto(cap.texto);
    setModoEdicao(false);
  }}
>
  <Box sx={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  }}>
    <Typography
      variant="caption"
      sx={{
        color: "#fff",
        fontWeight: "bold",
        overflowWrap: "anywhere"
      }}
    >
      {cap.titulo}
    </Typography>

    <IconButton
      size="small"
      onClick={(e) => {
        e.stopPropagation();
        deletarCapitulo(idx);
      }}
      sx={{ color: '#ef4444', p: 0.3 }}
    >
      <DeleteIcon sx={{ fontSize: 12 }} />
    </IconButton>
  </Box>

  <Typography
    variant="caption"
    sx={{
      color: "#64748b",
      display: "block",
      maxHeight: 25,
      overflow: "hidden",
      fontSize: "0.6rem"
    }}
  >
    {cap.texto?.substring(0, 40)}...
  </Typography>
</Paper>
            ))}
          </Box>

{/* EDITOR / VISUALIZADOR DE ANOTAÇÕES */}
<Box sx={{
  flex: 1,
  minWidth: 0,
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
  gap: 1
}}>

  {/* CABEÇALHO FIXO */}
  <Box sx={{
    display: "flex",
    alignItems: "center",
    gap: 1,
    flexShrink: 0
  }}>

    {modoEdicao ? (
      <TextField
        size="small"
        fullWidth
        placeholder="Título da anotação"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        InputProps={{
          style: {
            color: '#fff',
            fontSize: '0.9rem',
            fontWeight: 'bold'
          }
        }}
        sx={{
          '& .MuiOutlinedInput-root fieldset': {
            borderColor: '#334155'
          }
        }}
      />
    ) : (
      <Typography sx={{
        flex: 1,
        minWidth: 0,
        color: '#fff',
        fontWeight: 'bold',
        fontSize: '1rem',
        overflowWrap: 'anywhere'
      }}>
        {titulo || "Selecione uma anotação"}
      </Typography>
    )}

    {!modoEdicao ? (
      <IconButton
        size="small"
        title="Editar anotação"
        onClick={() => setModoEdicao(true)}
        sx={{
          color: '#fbbf24',
          border: '1px solid #fbbf24',
          flexShrink: 0
        }}
      >
        ✏️
      </IconButton>
    ) : (
      <Button
        size="small"
        onClick={() => {
          if (capituloSelecionado !== null) {
            const cap = capitulos[capituloSelecionado];

            setTitulo(cap.titulo || "");
            setTexto(cap.texto || "");
          } else if (capitulos.length > 0) {
            setCapituloSelecionado(0);
            setEditandoIndex(0);
            setTitulo(capitulos[0].titulo || "");
            setTexto(capitulos[0].texto || "");
          } else {
            setTitulo("");
            setTexto("");
          }

          setModoEdicao(false);
        }}
        sx={{ color: '#94a3b8', flexShrink: 0 }}
      >
        Cancelar
      </Button>
    )}

  </Box>

  {/* BOTÕES DE EDIÇÃO */}
  {modoEdicao && (
    <Box sx={{
      display: "flex",
      gap: 0.5,
      flexShrink: 0,
      flexWrap: "wrap"
    }}>

      <Button
        size="small"
        component="label"
        disabled={enviandoImagem}
        startIcon={<ImageIcon sx={{ fontSize: 14 }} />}
        sx={{
          color: '#94a3b8',
          fontSize: '0.7rem'
        }}
      >
        {enviandoImagem ? "Enviando..." : "Imagem"}

        <input
          type="file"
          accept="image/*"
          hidden
          disabled={enviandoImagem}
          onChange={handleUploadImagem}
        />
      </Button>

      <Button
        size="small"
        variant="contained"
        startIcon={<SaveIcon sx={{ fontSize: 14 }} />}
        onClick={salvarCapitulo}
        sx={{
          bgcolor: '#fbbf24',
          color: '#000',
          fontSize: '0.7rem',
          '&:hover': {
            bgcolor: '#f59e0b'
          }
        }}
      >
        Salvar
      </Button>

    </Box>
  )}

  {/* CONTEÚDO: EDITÁVEL OU SOMENTE LEITURA */}
  <Box sx={{
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    overflowX: "hidden",
    p: 1.5,
    bgcolor: '#111827',
    border: '1px solid #334155',
    borderRadius: 1
  }}>

    {modoEdicao ? (

      <TextField
        multiline
        fullWidth
        minRows={12}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onPaste={handlePasteAnotacoes}
        inputRef={textAreaRef}
        placeholder="Conteúdo (Markdown)..."
        variant="standard"
        InputProps={{
          disableUnderline: true,
          style: {
            color: '#fff',
            fontSize: '0.85rem',
            fontFamily: 'monospace',
            lineHeight: 1.7
          }
        }}
        sx={{
          '& textarea': {
            resize: 'vertical'
          }
        }}
      />

    ) : (

      <Box
        className="markdown-content"
        sx={{
          color: '#e2e8f0',
          fontSize: '0.85rem',
          lineHeight: 1.7,
          overflowWrap: 'anywhere',

          '& p': {
            margin: '10px 0'
          },

          '& h1, & h2, & h3, & h4': {
            color: '#fff',
            marginTop: '20px',
            marginBottom: '10px'
          },

          '& strong': {
            color: '#fff'
          },

          '& table': {
            width: '100%',
            borderCollapse: 'collapse',
            margin: '15px 0'
          },

          '& th, & td': {
            border: '1px solid #475569',
            padding: '8px',
            textAlign: 'left'
          },

          '& th': {
            backgroundColor: '#1e293b',
            color: '#fbbf24'
          },

          '& img': {
            maxWidth: '100%',
            height: 'auto',
            display: 'block',
            margin: '14px auto',
            borderRadius: '8px',
            cursor: 'pointer'
          },

          '& ul, & ol': {
            paddingLeft: '25px'
          },

          '& blockquote': {
            borderLeft: '3px solid #fbbf24',
            paddingLeft: '12px',
            color: '#94a3b8',
            margin: '12px 0'
          },

          '& pre': {
            overflowX: 'auto',
            padding: '12px',
            backgroundColor: '#0b1120',
            borderRadius: '6px'
          },

          '& code': {
            overflowWrap: 'anywhere'
          }
        }}
        onClick={(e) => {
          if (e.target.tagName === 'IMG') {
            setLightboxImage(e.target.src);
            setZoom(1);
          }
        }}
      >
        {texto ? (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {texto}
          </ReactMarkdown>
        ) : (
          <Typography color="text.secondary">
            Esta anotação está vazia.
          </Typography>
        )}
      </Box>

    )}

  </Box>

</Box>

        </Box>
      )}
      {!minimizado && <Box sx={{ position: "absolute", bottom: 0, right: 0, width: 16, height: 16, cursor: "nwse-resize", zIndex: 10 }}
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setRedimensionando(true); resizeStartRef.current = { x: e.clientX, y: e.clientY, width: tamanho.width, height: tamanho.height }; }} />}
      {lightboxImage && (
        <Box onClick={() => setLightboxImage(null)} sx={{ position: "fixed", inset: 0, bgcolor: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999999 }}>
          <img src={lightboxImage} alt="ampliada" style={{ maxWidth: "90%", maxHeight: "90%", borderRadius: 10, cursor: "zoom-out" }} />
        </Box>
      )}
    </Paper>, document.body
  );
}

export default React.memo(AnotacoesFlutuante);