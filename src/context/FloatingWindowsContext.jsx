// src/context/FloatingWindowsContext.jsx
import React, { createContext, useContext, useState } from "react";

const FloatingWindowsContext = createContext();

export function FloatingWindowsProvider({ children }) {
  const [chatOpen, setChatOpen] = useState(false);
  const [fichaOpen, setFichaOpen] = useState(false);
  const [chatMinimized, setChatMinimized] = useState(false);
  const [fichaMinimized, setFichaMinimized] = useState(false);
  
  // Posições das janelas
  const [chatPos, setChatPos] = useState({ x: 100, y: 100 });
  const [fichaPos, setFichaPos] = useState({ x: 400, y: 100 });
  
  const toggleChat = () => setChatOpen(prev => !prev);
  const toggleFicha = () => setFichaOpen(prev => !prev);
  const toggleChatMinimize = () => setChatMinimized(prev => !prev);
  const toggleFichaMinimize = () => setFichaMinimized(prev => !prev);
  
  return (
    <FloatingWindowsContext.Provider value={{
      chatOpen, setChatOpen, toggleChat,
      fichaOpen, setFichaOpen, toggleFicha,
      chatMinimized, toggleChatMinimize,
      fichaMinimized, toggleFichaMinimize,
      chatPos, setChatPos,
      fichaPos, setFichaPos,
    }}>
      {children}
    </FloatingWindowsContext.Provider>
  );
}

export const useFloatingWindows = () => useContext(FloatingWindowsContext);