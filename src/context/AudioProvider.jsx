// src/context/AudioProvider.jsx
import React, { createContext, useContext, useRef, useState, useEffect } from "react";
import socket from "../socket";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebaseConfig";

const AudioContextGlobal = createContext();
export const useAudio = () => useContext(AudioContextGlobal);

/**
 * 🎧 AudioProvider
 * - Sincroniza músicas e ambientes via Socket.IO + Firestore
 * - Garante compatibilidade com Cloudinary, backend no Render/Vercel e fallback local
 * - Permite controle remoto (mestre controla todos)
 */
export default function AudioProvider({ children }) {
  const audioObjects = useRef({});
  const [playingTracks, setPlayingTracks] = useState([]);
  const pendingRef = useRef(new Set());
  const desiredVolumesRef = useRef({});
  const socketRef = useRef(socket);

  const audioCtxRef = useRef(null);
  const destinationRef = useRef(null);
  const musicStreamRef = useRef(null);

  const [interactionAllowed, setInteractionAllowed] = useState(false);

  // 🔓 Libera o áudio após interação do usuário
  const unlockAudio = () => {
    if (interactionAllowed) return;
    setInteractionAllowed(true);
    const pend = Array.from(pendingRef.current);
    pendingRef.current.clear();
    pend.forEach((url) => _playLocal(url));
  };

  function ensureAudioContext() {
    if (!audioCtxRef.current) {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioCtx();
        const dest = ctx.createMediaStreamDestination();
        audioCtxRef.current = ctx;
        destinationRef.current = dest;
        musicStreamRef.current = dest.stream;
        console.log("🎧 AudioContext criado e MediaStreamDestination disponível.");
      } catch (e) {
        console.warn("Falha ao criar AudioContext:", e);
      }
    }
  }

  /**
   * 🧭 getMusicUrl
   * Resolve URL de música considerando Cloudinary, backend e fallback local.
   * Mantém URLs absolutas exatamente como vieram (essencial para controle de volume/pause).
   */
  const getMusicUrl = (urlOrName) => {
    if (!urlOrName) return "";

    // 1️⃣ URL absoluta → retorna idêntica
    if (/^https?:\/\//i.test(urlOrName)) {
      return urlOrName.trim();
    }

    // 2️⃣ Já vem com /musicas/
    if (urlOrName.startsWith("/musicas/")) {
      const backend = (import.meta.env.VITE_SERVER_URL || "").replace(/\/$/, "");
      return backend ? `${backend}${urlOrName}` : urlOrName;
    }

    // 3️⃣ Nome simples
    const backend = (import.meta.env.VITE_SERVER_URL || "").replace(/\/$/, "");
    if (backend) return `${backend}/musicas/${urlOrName}`;

    // 4️⃣ Fallback local
    if (urlOrName.startsWith("/")) return urlOrName;
    return `/musicas/${urlOrName}`;
  };

  async function checkUrlAccessible(fullUrl) {
    try {
      const r = await fetch(fullUrl, { method: "HEAD", mode: "cors" });
      return r.ok;
    } catch {
      return false;
    }
  }

  // utilitário: extrai "nome curto" se houver /musicas/<nome>
  function getShortName(full) {
    try {
      return full.replace(/.*\/musicas\//, "");
    } catch {
      return full;
    }
  }

  // utilitário: extrai filename (última parte do path)
  function getFileName(url) {
    try {
      const u = url.split("?")[0];
      const parts = u.split("/");
      return parts[parts.length - 1] || url;
    } catch {
      return url;
    }
  }

  // encontra chaves em audioObjects que correspondem ao url recebido (robusto)
  function findMatchingAudioKeys(url) {
    const full = typeof url === "string" ? url : (url?.url || url);
    const fullResolved = getMusicUrl(full);
    const short = getShortName(fullResolved);
    const filename = getFileName(fullResolved).toLowerCase();

    const keys = Object.keys(audioObjects.current);
    const matches = new Set();

    // 1) match exato
    keys.forEach((k) => {
      if (k === fullResolved) matches.add(k);
    });

    // 2) match short name exact
    keys.forEach((k) => {
      if (getShortName(k) === short) matches.add(k);
    });

    // 3) match by filename (contains)
    keys.forEach((k) => {
      const fname = getFileName(k).toLowerCase();
      if (fname === filename || (fname && filename && fname.indexOf(filename) !== -1) || (filename && fname.indexOf(filename) !== -1)) {
        matches.add(k);
      }
    });

    // 4) fallback: if still empty, try includes
    if (matches.size === 0) {
      keys.forEach((k) => {
        if (k.includes(short) || short.includes(k)) matches.add(k);
        if (k.includes(filename) || filename.includes(k)) matches.add(k);
      });
    }

    return Array.from(matches);
  }

  async function _playLocal(url) {
    if (!url) return;

    if (!interactionAllowed) {
      pendingRef.current.add(url);
      console.warn("Usuário ainda não desbloqueou áudio. Pending:", url);
      return;
    }

    const fullUrl = getMusicUrl(url);
    const existing = audioObjects.current[fullUrl];

    if (!existing) {
      ensureAudioContext();

      try {
        const ok = await checkUrlAccessible(fullUrl);
        if (!ok) console.warn("⚠️ URL inacessível:", fullUrl);
      } catch (e) {
        console.warn("checkUrlAccessible erro:", e);
      }

      const audio = new Audio();
      audio.crossOrigin = "anonymous";
      audio.src = fullUrl;
      audio.loop = true;
      audio.preload = "auto";

      // aplica volume desejado caso já exista registro
      const vol = (desiredVolumesRef.current[fullUrl] ?? desiredVolumesRef.current[getShortName(fullUrl)] ?? 100) / 100;
      try {
        audio.volume = vol;
      } catch (e) {
        console.warn("Erro ao setar volume inicial no elemento audio:", e);
      }

      audio.addEventListener("error", (e) =>
        console.error("Audio error:", fullUrl, e, audio.error)
      );

      try {
        if (audioCtxRef.current) {
          const srcNode = audioCtxRef.current.createMediaElementSource(audio);
          try { srcNode.connect(audioCtxRef.current.destination); } catch {}
          if (destinationRef.current) {
            try { srcNode.connect(destinationRef.current); } catch {}
          }
          audioObjects.current[fullUrl] = { audio, sourceNode: srcNode, volume: vol };
        } else {
          audioObjects.current[fullUrl] = { audio, sourceNode: null, volume: vol };
        }
      } catch (e) {
        console.warn("Falha ao criar MediaElementSource:", e);
        audioObjects.current[fullUrl] = { audio, sourceNode: null, volume: vol };
      }

      audio
        .play()
        .then(() => console.log("▶️ Tocando:", fullUrl))
        .catch((err) => {
          console.warn("Audio play falhou:", fullUrl, err);
          pendingRef.current.add(url);
        });

      setPlayingTracks((prev) =>
        prev.includes(fullUrl) ? prev : [...prev, fullUrl]
      );
    } else {
      existing.audio
        .play()
        .then(() => console.log("▶️ Retomando:", fullUrl))
        .catch((err) => console.warn("Erro ao dar play:", err));
      // reaplica volume caso desiredVolumes tenha mudado
      const desired = desiredVolumesRef.current[fullUrl] ?? desiredVolumesRef.current[getShortName(fullUrl)];
      if (desired != null) {
        try {
          existing.audio.volume = desired / 100;
          existing.volume = desired / 100;
        } catch (err) {
          console.warn("Erro ao reaplicar volume:", err);
        }
      }
      setPlayingTracks((prev) =>
        prev.includes(fullUrl) ? prev : [...prev, fullUrl]
      );
    }
  }

  // 🎛 Interface pública
  const playMusic = (url) => {
    _playLocal(url);
    socketRef.current?.emit("play-music", url);
  };

  const pauseMusic = (url) => {
    if (!url) return;
    const fullUrl = getMusicUrl(url);

    // tenta match robusto: achando keys que correspondem
    const matches = findMatchingAudioKeys(fullUrl);
    if (matches.length === 0) {
      // se não houver match, tenta apenas remover pela chave exata (segurança)
      if (audioObjects.current[fullUrl]) {
        matches.push(fullUrl);
      }
    }

    matches.forEach((k) => {
      const item = audioObjects.current[k];
      if (item) {
        try {
          item.audio.pause();
          item.audio.currentTime = 0;
          item.sourceNode?.disconnect?.();
        } catch (err) {
          console.warn("Erro ao pausar:", err);
        }
        delete audioObjects.current[k];
      }
    });

    // atualizar playingTracks removendo todas as matches
    setPlayingTracks((prev) => prev.filter((u) => !matches.includes(u)));
    pendingRef.current.delete(url);
  };

  const stopAllMusic = () => {
    Object.keys(audioObjects.current).forEach((k) => {
      try {
        audioObjects.current[k].audio.pause();
        audioObjects.current[k].audio.currentTime = 0;
        audioObjects.current[k].sourceNode?.disconnect?.();
      } catch {}
    });
    audioObjects.current = {};
    setPlayingTracks([]);
    pendingRef.current.clear();
  };

  const setVolume = (url, value) => {
    const fullUrl = getMusicUrl(url);

    // salva volume desejado por várias chaves (full e short)
    desiredVolumesRef.current[fullUrl] = value;
    desiredVolumesRef.current[getShortName(fullUrl)] = value;
    desiredVolumesRef.current[getFileName(fullUrl)] = value;

    // procura matches robustos e aplica em todos que baterem
    const matches = findMatchingAudioKeys(fullUrl);

    if (matches.length > 0) {
      matches.forEach((k) => {
        const item = audioObjects.current[k];
        if (item) {
          try {
            item.audio.volume = value / 100;
            item.volume = value / 100;
            console.log("setVolume aplicado no cliente:", k, value);
          } catch (err) {
            console.warn("Erro setVolume:", err);
          }
        }
      });
    } else {
      console.log("setVolume: nenhum áudio ativo correspondeu — volume salvo para quando tocar.", fullUrl, value);
    }
  };

  const getVolume = (url) => {
    const fullUrl = getMusicUrl(url);
    const item = audioObjects.current[fullUrl];
    if (item) return item.volume;
    if (desiredVolumesRef.current[fullUrl] != null)
      return desiredVolumesRef.current[fullUrl] / 100;
    const short = getShortName(fullUrl);
    if (desiredVolumesRef.current[short] != null)
      return desiredVolumesRef.current[short] / 100;
    const fname = getFileName(fullUrl);
    if (desiredVolumesRef.current[fname] != null)
      return desiredVolumesRef.current[fname] / 100;
    return 1.0;
  };

  const getMusicStream = () => musicStreamRef.current || null;

  // 🔁 Socket listeners
  useEffect(() => {
    const s = socketRef.current;
    if (!s) return;

    // handlers diretos que usam refs (evitam stale closures)
    const onPlay = (url) => {
      try {
        console.log("socket -> play-music", url);
        _playLocal(url);
      } catch (e) {
        console.warn("onPlay erro:", e);
      }
    };

    const onStop = (url) => {
      try {
        console.log("socket -> stop-music", url);
        pauseMusic(url);
      } catch (e) {
        console.warn("onStop erro:", e);
      }
    };

    const onStopAll = () => {
      try {
        console.log("socket -> stop-all-music");
        stopAllMusic();
      } catch (e) {
        console.warn("onStopAll erro:", e);
      }
    };

    const onVolume = ({ url, value }) => {
      try {
        // suportar url sendo string simples ou objeto
        const u = typeof url === "string" ? url : url?.url || url;
        const full = getMusicUrl(u);

        // salva volume desejado para reaplicar se necessário
        desiredVolumesRef.current[full] = value;
        desiredVolumesRef.current[getShortName(full)] = value;
        desiredVolumesRef.current[getFileName(full)] = value;

        // aplica imediatamente em todos os matches
        const matches = findMatchingAudioKeys(full);
        if (matches.length > 0) {
          matches.forEach((k) => {
            try {
              const it = audioObjects.current[k];
              if (it) {
                it.audio.volume = value / 100;
                it.volume = value / 100;
                console.log("socket -> volume-music aplicado", k, value);
              }
            } catch (err) {
              console.warn("Erro ao aplicar volume via socket:", err);
            }
          });
        } else {
          console.log("socket -> volume-music: guardado (sem match ativo ainda)", full, value);
        }
      } catch (e) {
        console.warn("onVolume erro:", e);
      }
    };

    s.on("play-music", onPlay);
    s.on("stop-music", onStop);
    s.on("stop-all-music", onStopAll);
    s.on("volume-music", onVolume);

    s.on("connect", () => console.log("🔌 Socket conectado:", s.id));
    s.on("disconnect", () => console.log("❌ Socket desconectado"));

    return () => {
      s.off("play-music", onPlay);
      s.off("stop-music", onStop);
      s.off("stop-all-music", onStopAll);
      s.off("volume-music", onVolume);
    };
  }, [interactionAllowed]);

  // 🔥 Firestore: sincronização
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "sound", "current"), (snap) => {
      const data = snap?.data?.() ?? snap;
      if (!data) return;
      const sounds = Array.isArray(data.sounds) ? data.sounds : [];
      const playing = sounds.filter((s) => s.playing).map((s) => s.url);

      // Pausa músicas não listadas
      Object.keys(audioObjects.current).forEach((url) => {
        const shortName = getShortName(url);
        if (!playing.includes(url) && !playing.includes(shortName)) pauseMusic(shortName);
      });

      // Toca novas músicas
      playing.forEach((url) => {
        const full = getMusicUrl(url);
        if (!audioObjects.current[full]) _playLocal(url);
      });

      // Aplica volumes
      sounds.forEach((s) => {
        if (s.url && s.volume != null) {
          try {
            setVolume(s.url, s.volume);
          } catch (err) {
            console.warn("Erro ao aplicar volume do Firestore:", err);
          }
        }
      });
    });

    return () => unsub && unsub();
  }, []);


  return (
    <AudioContextGlobal.Provider
      value={{
        playMusic,
        pauseMusic,
        stopAllMusic,
        setVolume,
        getVolume,
        playingTracks,
        interactionAllowed,
        unlockAudio,
        socket: socketRef.current,
        getMusicStream,
        _internal: { audioCtxRef, destinationRef, musicStreamRef },
      }}
    >
      {children}
    </AudioContextGlobal.Provider>
  );
}
