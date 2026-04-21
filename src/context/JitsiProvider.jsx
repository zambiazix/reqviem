import React, { createContext, useContext, useState, useEffect } from "react";

const JitsiContext = createContext();
export const useJitsi = () => useContext(JitsiContext);

export default function JitsiProvider({ children }) {
  const [showMeeting, setShowMeeting] = useState(false);
  const [jitsiWindow, setJitsiWindow] = useState(null);

  const startMeeting = (room, user) => {
    console.log('🎯 Iniciando reunião para:', user.name);
    
    // 🟢🟢🟢 URL COMPLETA COM TODAS AS CONFIGURAÇÕES 🟢🟢🟢
    const url = `https://meet.jit.si/${room}#config.prejoinPageEnabled=false&config.enableLobby=false&userInfo.displayName=${encodeURIComponent(user.name)}&interfaceConfig.SHOW_JITSI_WATERMARK=false&interfaceConfig.SHOW_BRAND_WATERMARK=false&interfaceConfig.SHOW_WATERMARK_FOR_GUESTS=false&interfaceConfig.JITSI_WATERMARK_LINK=&interfaceConfig.HIDE_DEEP_LINKING_LOGO=true&interfaceConfig.DEFAULT_LANGUAGE=pt-BR&config.startWithAudioMuted=false&config.startWithVideoMuted=true`;
    
    const width = 1200;
    const height = 800;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    
    const newWindow = window.open(
      url, 
      'JitsiCall', 
      `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no`
    );
    
    setJitsiWindow(newWindow);
    setShowMeeting(true);
    
    const checkWindow = setInterval(() => {
      if (newWindow.closed) {
        clearInterval(checkWindow);
        setShowMeeting(false);
        setJitsiWindow(null);
      }
    }, 500);
  };

  const endMeeting = () => {
    if (jitsiWindow && !jitsiWindow.closed) {
      jitsiWindow.close();
    }
    setShowMeeting(false);
    setJitsiWindow(null);
  };

  useEffect(() => {
    window.__startJitsiMeeting = (userData) => {
      startMeeting("Reqviem-RPG-Mesa", {
        name: userData?.name || 'Jogador',
        email: userData?.email || 'jogador@reqviemrpg.com',
        avatar: userData?.avatar || null,
      });
    };
    
    return () => {
      delete window.__startJitsiMeeting;
    };
  }, []);

  return (
    <JitsiContext.Provider value={{ startMeeting, endMeeting, showMeeting }}>
      {children}
      
      {showMeeting && jitsiWindow && !jitsiWindow.closed && (
        <button 
          onClick={() => jitsiWindow.focus()}
          style={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            zIndex: 10000,
            background: '#4CAF50',
            color: 'white',
            border: 'none',
            padding: '12px 20px',
            borderRadius: 50,
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: 16,
            boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
          }}
        >
          🎙️ Voltar à Chamada
        </button>
      )}
      
      {showMeeting && (
        <button 
          onClick={endMeeting}
          style={{
            position: 'fixed',
            bottom: 20,
            left: 20,
            zIndex: 10000,
            background: '#ff0000',
            color: 'white',
            border: 'none',
            padding: '12px 20px',
            borderRadius: 50,
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: 16,
            boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
          }}
        >
          ❌ Encerrar Chamada
        </button>
      )}
    </JitsiContext.Provider>
  );
}