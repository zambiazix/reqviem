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
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { updateDoc, deleteDoc } from "firebase/firestore";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { setDoc } from "firebase/firestore";

const GIPHY_API_KEY = "PBsoFISvy4OFVTNfZbpB5yF79ODJyTsc";

function LightboxImage({ src, zoom, setZoom }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [start, setStart] = useState({ x: 0, y: 0 });
  const [initialDistance, setInitialDistance] = useState(null);

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

// 🟢 ESTILO PARA O NOME DO MESTRE (BRILHO DOURADO)
const masterNameStyle = {
  fontWeight: "bold",
  background: "linear-gradient(45deg, #FFD700, #FFA500, #FFD700)",
  backgroundSize: "200% 200%",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  animation: "shine 3s ease-in-out infinite",
  textShadow: "0 0 10px rgba(255,215,0,0.5)",
};

// Adiciona keyframe
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = `
    @keyframes shine {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    @keyframes pulse {
      0% { box-shadow: 0 0 5px #FFD700; }
      50% { box-shadow: 0 0 20px #FFD700; }
      100% { box-shadow: 0 0 5px #FFD700; }
    }
  `;
  document.head.appendChild(styleSheet);
}

export default function Chat({ userNick, userEmail }) {
  const [text, setText] = useState("");
  const [messages, setMessages] = useState([]);
  const [filePreview, setFilePreview] = useState(null);
  const [filePreviews, setFilePreviews] = useState([]);
  const [avatars, setAvatars] = useState({});
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [lastSender, setLastSender] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [gifOpen, setGifOpen] = useState(false);
  const [gifResults, setGifResults] = useState([]);
  const [gifSearch, setGifSearch] = useState("");
  const [gifOffset, setGifOffset] = useState(0);
  const [gifLoading, setGifLoading] = useState(false);
  const [gifHasMore, setGifHasMore] = useState(true);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [diceAnchor, setDiceAnchor] = useState(null);
  const openDiceMenu = Boolean(diceAnchor);

  const chatRef = useRef(null);
  const endRef = useRef(null);
  const chatCol = collection(db, "chat");

  const isMaster = userEmail === "mestre@reqviemrpg.com";
  const MASTER_AVATAR = "https://cdn-icons-png.flaticon.com/512/3171/3171927.png";

  const getDisplayNick = (email, nick) => {
    if (email === "mestre@reqviemrpg.com") return "👑 MESTRE";
    return nick;
  };

  const getAvatar = (email, normalAvatar) => {
    if (email === "mestre@reqviemrpg.com") {
      return normalAvatar || MASTER_AVATAR;
    }
    return normalAvatar;
  };

  function canEdit(msg) {
    if (msg.type === "dice") return false;
    return isMaster || msg.userEmail === userEmail;
  }

  function canDelete(msg) {
    if (msg.type === "dice") return false;
    return isMaster || msg.userEmail === userEmail;
  }

  async function deleteMessage(msg) {
    if (msg.type === "dice") {
      alert("Dados não podem ser apagados.");
      return;
    }
    if (!window.confirm("Apagar esta mensagem?")) return;
    await deleteDoc(doc(db, "chat", msg.id));
  }

  async function editMessage(msg) {
    const novoTexto = prompt("Editar mensagem:", msg.text || "");
    if (novoTexto === null) return;
    await updateDoc(doc(db, "chat", msg.id), {
      text: novoTexto,
      edited: true,
    });
  }

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

  useEffect(() => {
    const container = chatRef.current;
    if (!container) return;
    const nearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120;
    if (autoScroll || lastSender === userEmail || nearBottom) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
      setLastSender("");
      setUnreadCount(0);
    }
  }, [messages]);

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

  useEffect(() => {
    const handlePaste = async (e) => {
      if (!e.clipboardData) return;
      const items = e.clipboardData.items;
      for (let item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            const img = await compressImage(file);
            setFilePreviews((prev) => [...prev, img]);
          }
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

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

  async function handleFiles(files) {
    const imgs = await Promise.all([...files].map((f) => compressImage(f)));
    setFilePreviews((p) => [...p, ...imgs]);
  }

  async function sendMessage(e) {
    e?.preventDefault();
    if (!text && !filePreview && filePreviews.length === 0) return;
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

    if (filePreviews.length > 0) {
      await addDoc(chatCol, {
        userNick,
        userEmail,
        type: "image-group",
        text,
        images: filePreviews,
        timestamp: serverTimestamp(),
      });
      setFilePreviews([]);
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
    const f = e.target.files;
    if (!f) return;
    handleFiles(f);
    e.target.value = null;
  }

  async function searchGifs(query = gifSearch, offset = 0) {
    if (gifLoading) return;
    if (!gifHasMore && offset !== 0) return;
    setGifLoading(true);
    const endpoint = query
      ? "https://api.giphy.com/v1/gifs/search"
      : "https://api.giphy.com/v1/gifs/trending";
    try {
      const res = await fetch(
        `${endpoint}?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(
          query || ""
        )}&limit=25&offset=${offset}&rating=g&lang=pt`
      );
      const data = await res.json();
      if (!data.data || data.data.length === 0) {
        setGifHasMore(false);
        setGifLoading(false);
        return;
      }
      if (offset === 0) {
        setGifResults(data.data);
      } else {
        setGifResults((prev) => [...prev, ...data.data]);
      }
      setGifOffset(offset + 25);
      setGifHasMore(true);
    } catch (err) {
      console.error("Erro ao buscar GIF:", err);
    }
    setGifLoading(false);
  }

  async function searchStickers() {
    const res = await fetch(
      `https://api.giphy.com/v1/stickers/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(
        gifSearch
      )}&limit=50`
    );
    const data = await res.json();
    setGifResults(data.data);
  }

  async function randomGif() {
    try {
      const res = await fetch(
        `https://api.giphy.com/v1/gifs/random?api_key=${GIPHY_API_KEY}&tag=${encodeURIComponent(
          gifSearch
        )}&rating=g`
      );
      const data = await res.json();
      if (data.data) {
        setGifResults((prev) => [data.data, ...prev]);
      }
    } catch (err) {
      console.error("Erro GIF aleatório:", err);
    }
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

  return (
    <Paper elevation={2} sx={{ height: "100%", display: "flex", flexDirection: "column", p: 1, position: "relative", bgcolor: "#07121a" }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
        <Typography variant="h6">💬 Chat</Typography>
        {isMaster && (
          <Button
            variant="outlined"
            size="small"
            component="label"
            startIcon={<ImageIcon />}
          >
            Trocar avatar
            <input
              hidden
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const formData = new FormData();
                  formData.append("file", file);
                  const res = await fetch("https://reqviem.onrender.com/upload", {
                    method: "POST",
                    body: formData,
                  });
                  const data = await res.json();
                  if (data.url) {
                    await setDoc(doc(db, "fichas", "mestre@reqviemrpg.com"), { imagemPersonagem: data.url }, { merge: true });
                    setAvatars(prev => ({ ...prev, "mestre@reqviemrpg.com": data.url }));
                  }
                } catch (err) {
                  console.error("Erro ao enviar imagem:", err);
                  alert("Erro ao enviar imagem.");
                }
              }}
            />
          </Button>
        )}
      </Box>

      <Box
        ref={chatRef}
        sx={{ flex: 1, overflowY: "auto", position: "relative", scrollBehavior: "smooth", pb: 1 }}
        onDrop={(e) => {
          e.preventDefault();
          handleFiles(e.dataTransfer.files);
        }}
        onDragOver={(e) => e.preventDefault()}
      >
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
                <ListItem
                  alignItems="flex-start"
                  sx={{
                    flexDirection: m.userEmail === userEmail ? "row-reverse" : "row",
                    px: 0,
                  }}
                >
                  <Avatar
                    src={getAvatar(m.userEmail, avatars[m.userEmail] || "")}
                    onClick={() => {
                      if (avatars[m.userEmail]) {
                        setLightboxImage(avatars[m.userEmail]);
                        setZoom(1);
                      }
                    }}
                    sx={{
                      width: 32,
                      height: 32,
                      cursor: avatars[m.userEmail] ? "pointer" : "default",
                      bgcolor: avatars[m.userEmail] ? "transparent" : "#333",
                      fontSize: 14,
                      mr: m.userEmail === userEmail ? 0 : 1,
                      ml: m.userEmail === userEmail ? 1 : 0,
                      ...(m.userEmail === "mestre@reqviemrpg.com" && {
                        border: "2px solid #FFD700",
                        boxShadow: "0 0 15px #FFD700",
                        animation: "pulse 2s infinite",
                      }),
                    }}
                  >
                    {!avatars[m.userEmail] && getInitials(m.userNick)}
                  </Avatar>

                  <Box
                    sx={{
                      maxWidth: "75%",
                      bgcolor: m.userEmail === userEmail ? "#1e3a5f" : "#2a2a2a",
                      borderRadius: 2,
                      p: 1.5,
                      boxShadow: 2,
                      wordBreak: "break-word",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 0.5,
                      }}
                    >
                      <Typography 
                        variant="subtitle2" 
                        sx={m.userEmail === "mestre@reqviemrpg.com" ? masterNameStyle : { fontWeight: "bold" }}
                      >
                        {getDisplayNick(m.userEmail, m.userNick)}
                      </Typography>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        {canEdit(m) && (
                          <IconButton size="small" onClick={() => editMessage(m)}>
                            <EditIcon fontSize="inherit" />
                          </IconButton>
                        )}
                        {canDelete(m) && (
                          <IconButton size="small" onClick={() => deleteMessage(m)}>
                            <DeleteIcon fontSize="inherit" />
                          </IconButton>
                        )}
                      </Box>
                    </Box>

                    {m.type === "image" && (
                      <img
                        src={m.text}
                        style={{ maxWidth: "100%", borderRadius: 8, cursor: "pointer" }}
                        onClick={() => {
                          setLightboxImage(m.text);
                          setZoom(1);
                        }}
                      />
                    )}

                    {m.type === "image-group" && (
                      <>
                        {m.text && <Typography sx={{ mb: 0.5 }}>{m.text}</Typography>}
                        {m.images?.map((img, idx) => (
                          <img
                            key={idx}
                            src={img}
                            style={{
                              maxWidth: "100%",
                              display: "block",
                              marginTop: 6,
                              borderRadius: 8,
                              cursor: "pointer",
                            }}
                            onClick={() => {
                              setLightboxImage(img);
                              setZoom(1);
                            }}
                          />
                        ))}
                      </>
                    )}

                    {m.type === "gif" && (
                      <img
                        src={m.text}
                        style={{ maxWidth: "100%", borderRadius: 8, cursor: "pointer" }}
                        onClick={() => {
                          setLightboxImage(m.text);
                          setZoom(1);
                        }}
                      />
                    )}

                    {m.type === "video" && (
                      <video controls src={m.text} style={{ maxWidth: "100%", borderRadius: 8 }} />
                    )}

                    {m.type === "youtube" && (
                      <iframe
                        width="100%"
                        height="135"
                        src={m.text.replace("watch?v=", "embed/")}
                        frameBorder="0"
                        allowFullScreen
                        style={{ borderRadius: 8 }}
                      />
                    )}

                    {m.type === "link" && (
                      <a href={m.text} target="_blank" rel="noreferrer">
                        {m.text}
                      </a>
                    )}

                    {m.type === "dice" && (
                      <Typography color="primary" sx={{ fontWeight: "bold" }}>
                        {m.text}
                      </Typography>
                    )}

                    {m.type === "text" && (
                      <Typography>
                        {m.text}
                        {m.edited && (
                          <Typography
                            component="span"
                            sx={{ ml: 0.5, fontSize: "0.7rem", opacity: 0.6 }}
                          >
                            (editado)
                          </Typography>
                        )}
                      </Typography>
                    )}

                    <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 0.5 }}>
                      <Typography variant="caption" sx={{ opacity: 0.6, fontSize: "0.7rem" }}>
                        {horaFormatada}
                      </Typography>
                    </Box>
                  </Box>
                </ListItem>
              </React.Fragment>
            );
          })}
          <div ref={endRef} />
        </List>
      </Box>

      {filePreviews.length > 0 && (
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1 }}>
          {filePreviews.map((img, i) => (
            <Box key={i} sx={{ position: "relative" }}>
              <img src={img} style={{ width: 64, height: 64, borderRadius: 8 }} />
              <IconButton
                size="small"
                onClick={() => setFilePreviews((p) => p.filter((_, idx) => idx !== i))}
                sx={{
                  position: "absolute",
                  top: -6,
                  right: -6,
                  bgcolor: "rgba(0,0,0,0.7)",
                  color: "#fff",
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
        </Box>
      )}

      <Box component="form" onSubmit={sendMessage} sx={{ display: "flex", gap: 1, mt: 1 }}>
        <TextField
          placeholder='Mensagem ou "1d20+3" (Shift+Enter para nova linha)'
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage(e);
            }
          }}
          size="small"
          fullWidth
          multiline
          maxRows={4}
        />
        <IconButton component="label">
          <ImageIcon />
          <input hidden type="file" accept="image/*" multiple onChange={handleFileChange} />
        </IconButton>
        <IconButton
          color="primary"
          onClick={() => {
            setGifResults([]);
            setGifOffset(0);
            setGifHasMore(true);
            setGifSearch("");
            setGifOpen(true);
            searchGifs("", 0);
          }}
        >
          <GifBoxIcon />
        </IconButton>
        <Button type="submit" variant="contained" endIcon={<SendIcon />}>
          Enviar
        </Button>
      </Box>

      <Box sx={{ mt: 1, display: "flex", gap: 1 }}>
        <Button variant="outlined" size="small" onClick={(e) => setDiceAnchor(e.currentTarget)}>
          D10
        </Button>
        <Button variant="outlined" size="small" onClick={() => quickRollDice(1, 100)}>
          1D100
        </Button>
        <Menu
          anchorEl={diceAnchor}
          open={openDiceMenu}
          onClose={() => setDiceAnchor(null)}
          PaperProps={{ sx: { maxHeight: 320, width: 220 } }}
        >
          <Grid container spacing={1} sx={{ p: 1 }}>
            {Array.from({ length: 30 }, (_, i) => i + 1).map((n) => (
              <Grid item xs={4} key={n}>
                <Button
                  fullWidth
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    quickRollDice(n, 10);
                    setDiceAnchor(null);
                  }}
                >
                  {n}D10
                </Button>
              </Grid>
            ))}
          </Grid>
        </Menu>
      </Box>

      <Dialog open={gifOpen} onClose={() => setGifOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Buscar GIF</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={(e) => { e.preventDefault(); searchGifs(); }} sx={{ display: "flex", gap: 1, mb: 2 }}>
            <TextField
              fullWidth
              placeholder="Pesquisar GIF..."
              value={gifSearch}
              onChange={(e) => setGifSearch(e.target.value)}
            />
            <Button variant="contained" onClick={() => { setGifOffset(0); setGifHasMore(true); searchGifs(gifSearch, 0); }}>
              Buscar
            </Button>
          </Box>
          <Box sx={{ mb: 2, display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Button size="small" variant="outlined" onClick={randomGif}>🎲 Aleatório</Button>
            <Button size="small" variant="outlined" onClick={searchStickers}>⭐ Stickers</Button>
            {["rpg", "magic", "explosion", "anime", "fight", "laugh"].map((tag) => (
              <Button key={tag} size="small" variant="outlined" onClick={() => { setGifSearch(tag); setGifOffset(0); searchGifs(tag, 0); }}>
                {tag}
              </Button>
            ))}
          </Box>
          <Grid
            container
            spacing={1}
            sx={{ maxHeight: 400, overflowY: "auto" }}
            onScroll={(e) => {
              const el = e.currentTarget;
              const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 100;
              if (nearBottom && !gifLoading && gifHasMore) {
                searchGifs(gifSearch, gifOffset);
              }
            }}
          >
            {gifResults.map((g) => (
              <Grid item xs={3} key={g.id}>
                <img
                  src={g.images.fixed_height?.url || g.images.downsized?.url || g.images.original?.url}
                  style={{ width: "100%", cursor: "pointer", borderRadius: 6 }}
                  onClick={() => sendGif(g.images.original?.url || g.images.downsized?.url)}
                />
              </Grid>
            ))}
          </Grid>
        </DialogContent>
      </Dialog>

      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          onWheel={(e) => {
            e.preventDefault();
            setZoom((z) => Math.min(Math.max(z + e.deltaY * -0.001, 0.5), 5));
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 3000,
          }}
        >
          <LightboxImage src={lightboxImage} zoom={zoom} setZoom={setZoom} />
        </div>
      )}

      <Fade in={showScrollButton}>
        <Fab
          color="primary"
          size="small"
          onClick={() => {
            endRef.current?.scrollIntoView({ behavior: "smooth" });
            setShowScrollButton(false);
            setUnreadCount(0);
            setAutoScroll(true);
          }}
          sx={{ position: "absolute", bottom: 90, right: 16, zIndex: 2000 }}
        >
          <Badge badgeContent={unreadCount} color="error">
            <ArrowDownwardIcon />
          </Badge>
        </Fab>
      </Fade>
    </Paper>
  );
}