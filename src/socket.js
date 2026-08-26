import { io } from "socket.io-client";

// Usa variável de ambiente se existir, senão cai no Render ou localhost
const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://reqviem.onrender.com");

// Garante transporte websocket e reconexão estável
const socket = io(SERVER_URL, {
  transports: ["websocket"],
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
});

socket.on("connect", () => console.log("🟢 Socket conectado:", socket.id));
socket.on("disconnect", () => console.log("🔴 Socket desconectado"));

export default socket;
