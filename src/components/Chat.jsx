// src/components/Chat.jsx
import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  IconButton,
  TextField,
  List,
  ListItem,
  ListItemText,
  Typography,
  Paper,
  Avatar,
  Divider,
  Fade,
  Fab,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  Grid,
} from "@mui/material";
import ImageIcon from "@mui/icons-material/Image";
import GifBoxIcon from "@mui/icons-material/GifBox";
import SendIcon from "@mui/icons-material/Send";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import CloseIcon from "@mui/icons-material/Close";
import { db } from "../firebaseConfig";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
  getDoc,
  doc,
} from "firebase/firestore";

const GIPHY_API_KEY = "PBsoFISvy4OFVTNfZbpB5yF79ODJyTsc";

// 🖱️ Componente auxiliar com arraste, zoom e suporte a toque
function LightboxImage({ src, zoom, setZoom }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [start, setStart] = useState({ x: 0, y: 0 });
  const [initialDistance, setInitialDistance] = useState(null);

  // === Mouse drag ===
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

  // === Touch events (mobile drag + pinch zoom) ===
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

export default function Chat({ userNick, userEmail }) {
  const [text, setText] = useState("");
  const [messages, setMessages] = useState([]);
  const [filePreview, setFilePreview] = useState(null);
  const [avatars, setAvatars] = useState({});
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [lastSender, setLastSender] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [gifOpen, setGifOpen] = useState(false);
  const [gifResults, setGifResults] = useState([]);
  const [gifSearch, setGifSearch] = useState("");
  const [lightboxImage, setLightboxImage] = useState(null);
  const [zoom, setZoom] = useState(1);

  const chatRef = useRef(null);
  const endRef = useRef(null);
  const chatCol = collection(db, "chat");

  // === Carrega mensagens ===
  useEffect(() => {
    const q = query(chatCol, orderBy("timestamp", "asc"));
    const unsub = onSnapshot(q, async (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMessages(data);

      const uniqueUsers = [...new Set(data.map((m) => m.userEmail).filter(Boolean))];
      for (const email of uniqueUsers) {
        if (!avatars[email]) {
          try {
            const fichaRef = doc(db, "fichas", email);
            const fichaSnap = await getDoc(fichaRef);
            if (fichaSnap.exists()) {
              const img = fichaSnap.data().imagemPersonagem || "";
              setAvatars((p) => ({ ...p, [email]: img }));
            }
          } catch {}
        }
      }

      const container = chatRef.current;
      if (container) {
        const distance = container.scrollHeight - container.scrollTop - container.clientHeight;
        const atBottom = distance < 80;
        const lastMsg = data[data.length - 1];
        if (!atBottom && lastMsg && lastMsg.userEmail !== userEmail) {
          setUnreadCount((c) => c + 1);
          setShowScrollButton(true);
        }
      }
    });
    return () => unsub();
  }, []);

  // === Scroll automático ===
  useEffect(() => {
    const container = chatRef.current;
    if (!container) return;
    const nearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 120;
    if (autoScroll || lastSender === userEmail || nearBottom) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
      setLastSender("");
      setUnreadCount(0);
    }
  }, [messages]);

  // === Detecta rolagem manual ===
  useEffect(() => {
    const container = chatRef.current;
    if (!container) return;
    const handleScroll = () => {
      const distance = container.scrollHeight - container.scrollTop - container.clientHeight;
      const atBottom = distance < 80;
      if (atBottom) {
        setAutoScroll(true);
        setShowScrollButton(false);
        setUnreadCount(0);
      } else {
        setAutoScroll(false);
        setShowScrollButton(true);
      }
    };
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  // === Dado ===
  function tryParseDice(cmd) {
    const m = cmd.trim().match(/^(\d*)d(\d+)([+-]\d+)?$/i);
    if (!m) return null;
    const num = m[1] === "" ? 1 : parseInt(m[1], 10);
    const sides = parseInt(m[2], 10);
    const mod = m[3] ? parseInt(m[3], 10) : 0;
    const rolls = Array.from({ length: num }, () => Math.floor(Math.random() * sides) + 1);
    const total = rolls.reduce((a, b) => a + b, 0) + mod;
    const expr = `${num}d${sides}${mod ? (mod > 0 ? `+${mod}` : `${mod}`) : ""}`;
    return { expr, rolls, total };
  }

  async function quickRollDice(num, sides) {
    const rolls = Array.from({ length: num }, () => Math.floor(Math.random() * sides) + 1);
    const total = rolls.reduce((a, b) => a + b, 0);
    await addDoc(chatCol, {
      userNick,
      userEmail,
      type: "dice",
      text: `${num}d${sides} => [${rolls.join(", ")}] = ${total}`,
      timestamp: serverTimestamp(),
    });
  }

  async function compressImage(file, maxSize = 800, quality = 0.7) {
    return new Promise((resolve) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = (e) => (img.src = e.target.result);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        if (width > height && width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        } else if (height > width && height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      reader.readAsDataURL(file);
    });
  }

  async function sendMessage(e) {
    e?.preventDefault();
    if (!text && !filePreview) return;
    setLastSender(userEmail);

    const dice = tryParseDice(text);
    if (dice) {
      await addDoc(chatCol, {
        userNick,
        userEmail,
        type: "dice",
        text: `${dice.expr} => [${dice.rolls.join(", ")}] = ${dice.total}`,
        timestamp: serverTimestamp(),
      });
      setText("");
      return;
    }

    if (filePreview) {
      await addDoc(chatCol, {
        userNick,
        userEmail,
        type: "image",
        text: filePreview,
        timestamp: serverTimestamp(),
      });
      setFilePreview(null);
      return;
    }

    let type = "text";
    if (text.startsWith("http")) {
      if (text.match(/\.(mp4|webm|ogg)$/i)) type = "video";
      else if (text.match(/\.(jpg|jpeg|png|gif|bmp|webp|avif|tiff)$/i)) type = "image";
      else if (text.includes("youtube.com") || text.includes("youtu.be")) type = "youtube";
      else type = "link";
    }

    await addDoc(chatCol, { userNick, userEmail, type, text, timestamp: serverTimestamp() });
    setText("");
  }

  async function handleFileChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    const compressed = await compressImage(f);
    setFilePreview(compressed);
    e.target.value = null;
  }

  async function searchGifs() {
    if (!gifSearch) return;
    const res = await fetch(
      `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(
        gifSearch
      )}&limit=24&rating=g`
    );
    const data = await res.json();
    setGifResults(data.data);
  }

  async function sendGif(url) {
    await addDoc(chatCol, {
      userNick,
      userEmail,
      type: "gif",
      text: url,
      timestamp: serverTimestamp(),
    });
    setGifOpen(false);
  }

  const getInitials = (name = "?") =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  // === Render ===
  return (
    <Paper elevation={2} sx={{ height: "100%", display: "flex", flexDirection: "column", p: 1, position: "relative" }}>
      <Typography variant="h6" sx={{ mb: 1 }}>Chat</Typography>

      {/* Área de mensagens */}
      <Box ref={chatRef} sx={{ flex: 1, overflowY: "auto", position: "relative", scrollBehavior: "smooth", pb: 1 }}>
        <List>
          {messages.map((m, i) => {
            const prev = messages[i - 1];
            const showDivider = !prev || prev.userEmail !== m.userEmail;
            const dataHora = m.timestamp?.toDate ? m.timestamp.toDate() : null;
            const horaFormatada = dataHora
              ? `${dataHora.toLocaleDateString("pt-BR")} ${dataHora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
              : "";

            return (
              <React.Fragment key={m.id}>
                {showDivider && i > 0 && <Divider sx={{ my: 0.5, opacity: 0.3 }} />}
                <ListItem alignItems="flex-start">
                  <Avatar
                    src={avatars[m.userEmail] || ""}
                    sx={{
                      width: 32,
                      height: 32,
                      mr: 1,
                      bgcolor: avatars[m.userEmail] ? "transparent" : "#333",
                      fontSize: 14,
                    }}
                  >
                    {!avatars[m.userEmail] && getInitials(m.userNick)}
                  </Avatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography variant="subtitle2">{m.userNick}</Typography>
                        <Typography variant="caption" sx={{ opacity: 0.6, fontSize: "0.7rem" }}>
                          {horaFormatada}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <>
                        {m.type === "image" && (
                          <img
                            src={m.text}
                            alt="img"
                            style={{ maxWidth: 240, borderRadius: 8, cursor: "pointer" }}
                            onClick={() => {
                              setLightboxImage(m.text);
                              setZoom(1);
                            }}
                          />
                        )}
                        {m.type === "gif" && (
                          <img
                            src={m.text}
                            alt="gif"
                            style={{ maxWidth: 240, borderRadius: 8, cursor: "pointer" }}
                            onClick={() => {
                              setLightboxImage(m.text);
                              setZoom(1);
                            }}
                          />
                        )}
                        {m.type === "video" && (
                          <video controls src={m.text} style={{ maxWidth: 240, borderRadius: 8 }} />
                        )}
                        {m.type === "youtube" && (
                          <iframe
                            width="240"
                            height="135"
                            src={m.text.replace("watch?v=", "embed/")}
                            frameBorder="0"
                            allowFullScreen
                          ></iframe>
                        )}
                        {m.type === "link" && (
                          <a href={m.text} target="_blank" rel="noreferrer">
                            {m.text}
                          </a>
                        )}
                        {m.type === "dice" && <Typography color="primary">{m.text}</Typography>}
                        {m.type === "text" && <Typography>{m.text}</Typography>}
                      </>
                    }
                  />
                </ListItem>
              </React.Fragment>
            );
          })}
          <div ref={endRef} />
        </List>
      </Box>

      {/* Scroll automático */}
      <Fade in={showScrollButton}>
        <Box sx={{ position: "absolute", bottom: 72, right: 16, zIndex: 10 }}>
          <Badge color="error" badgeContent={unreadCount > 0 ? unreadCount : 0} invisible={unreadCount === 0}>
            <Fab
              size="small"
              color="primary"
              onClick={() => {
                setAutoScroll(true);
                setUnreadCount(0);
                endRef.current?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              <ArrowDownwardIcon />
            </Fab>
          </Badge>
        </Box>
      </Fade>

      {/* Input */}
      <Box component="form" onSubmit={sendMessage} sx={{ display: "flex", gap: 1, mt: 1 }}>
        <TextField
          placeholder='Mensagem ou "1d20+3"'
          value={text}
          onChange={(e) => setText(e.target.value)}
          size="small"
          fullWidth
        />
        <IconButton component="label">
          <ImageIcon />
          <input hidden type="file" accept="image/*" onChange={handleFileChange} />
        </IconButton>
        <IconButton color="primary" onClick={() => setGifOpen(true)}>
          <GifBoxIcon />
        </IconButton>
        <Button type="submit" variant="contained" endIcon={<SendIcon />}>
          Enviar
        </Button>
      </Box>

      {/* Dados */}
      <Box sx={{ mt: 1, display: "flex", flexWrap: "wrap", gap: 1 }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
          <Button key={n} variant="outlined" size="small" onClick={() => quickRollDice(n, 10)} sx={{ minWidth: 50 }}>
            {n}D10
          </Button>
        ))}
      </Box>

      {/* Modal de GIFs */}
      <Dialog open={gifOpen} onClose={() => setGifOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Buscar GIF</DialogTitle>
        <DialogContent>
          <Box
            component="form"
            onSubmit={(e) => {
              e.preventDefault();
              searchGifs();
            }}
            sx={{ display: "flex", gap: 1, mb: 2 }}
          >
            <TextField
              fullWidth
              placeholder="Pesquisar GIF..."
              value={gifSearch}
              onChange={(e) => setGifSearch(e.target.value)}
            />
            <Button variant="contained" onClick={searchGifs}>
              Buscar
            </Button>
          </Box>
          <Grid container spacing={1}>
            {gifResults.map((g) => (
              <Grid item xs={3} key={g.id}>
                <img
                  src={g.images.fixed_width_small.url}
                  alt="gif"
                  style={{ width: "100%", cursor: "pointer", borderRadius: 6 }}
                  onClick={() => sendGif(g.images.original.url)}
                />
              </Grid>
            ))}
          </Grid>
        </DialogContent>
      </Dialog>

      {/* Lightbox com Zoom, Arraste e Gestos */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          onWheel={(e) => {
            e.preventDefault();
            setZoom((z) => Math.min(Math.max(z + e.deltaY * -0.001, 0.5), 5));
          }}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 3000,
          }}
        >
          <LightboxImage src={lightboxImage} zoom={zoom} setZoom={setZoom} />
          <IconButton
            onClick={() => setLightboxImage(null)}
            sx={{
              position: "fixed",
              top: 16,
              right: 16,
              color: "#fff",
              background: "rgba(0,0,0,0.5)",
              "&:hover": { background: "rgba(0,0,0,0.8)" },
            }}
          >
            <CloseIcon />
          </IconButton>
        </div>
      )}
    </Paper>
  );
}
