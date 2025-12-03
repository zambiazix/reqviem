// src/context/GameProvider.jsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import {
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { useAudio } from "./AudioProvider";

const GameContext = createContext();
export const useGame = () => useContext(GameContext);

const HUD_DOC = doc(db, "game", "hud"); // único doc para HUD

export default function GameProvider({ children, currentUserEmail, isMaster }) {
  const [loading, setLoading] = useState(true);

  // Estado inicial completo e consistente
  const [hud, setHud] = useState({
    turn: null,
    xpMap: {},
    world: { season: "Verão", day: 1, year: 829, phase: "manhã" },
    timer: { running: false, duration: 60, remaining: 60, startedAt: null },
    floatingPos: { x: 20, y: 20 },
    updatedAt: null,
  });

  const timerRef = useRef(null);
  const { playMusic } = useAudio?.() || {};
  const sfxCall = "/musicas/turn_call.mp3";
  const sfxXP = "/musicas/xp_pickup.mp3";

  // -------------------------------------------------------------
  // Garantir que o documento existe (somente mestre)
  // -------------------------------------------------------------
  const ensureDoc = useCallback(
    async () => {
      try {
        const snap = await getDoc(HUD_DOC);
        if (!snap.exists() && isMaster) {
          await setDoc(HUD_DOC, {
            turn: null,
            xpMap: {},
            world: { season: "Verão", day: 1, year: 829, phase: "manhã" },
            timer: {
              running: false,
              duration: 60,
              remaining: 60,
              startedAt: null,
            },
            floatingPos: { x: 20, y: 20 },
            updatedAt: serverTimestamp(),
          });
        }
      } catch (e) {
        console.warn("GameProvider.ensureDoc erro:", e);
      }
    },
    [isMaster]
  );

  // -------------------------------------------------------------
  // Snapshot Firestore (real-time) — com log de depuração
  // -------------------------------------------------------------
  useEffect(() => {
  // Não começa o snapshot se não houver user ainda,
  // mas GARANTIMOS que o effect re-executará quando currentUserEmail mudar.
  if (!currentUserEmail) return;

  let unsub;

  (async () => {
    try {
      await ensureDoc();
    } catch (e) {
      console.warn("ensureDoc falhou antes de onSnapshot:", e);
    }

    unsub = onSnapshot(
      HUD_DOC,
      (snap) => {
        const data = snap.exists() ? snap.data() : null;
        if (!data) return;

        // Debug: mostrar snapshot recebido (mestre e jogadores)
        try {
          // eslint-disable-next-line no-console
          console.log("GameProvider: HUD snapshot:", data);
        } catch {}

        // Normalização segura COMPLETA
        const normalized = {
          ...data,
          turn: data.turn ?? null,
          xpMap: data.xpMap || {},
          world: data.world || {
            season: "Verão",
            day: 1,
            year: 829,
            phase: "manhã",
          },
          timer: {
            running: data.timer?.running ?? false,
            duration: data.timer?.duration ?? 60,
            remaining: data.timer?.remaining ?? 60,
            startedAt: data.timer?.startedAt ?? null,
          },
          floatingPos: data.floatingPos || { x: 20, y: 20 },
          updatedAt: data.updatedAt || null,
        };

        setHud(normalized);
        setLoading(false);
      },
      (err) => {
        console.error("GameProvider onSnapshot erro:", err);
        setLoading(false);
      }
    );
  })();

  return () => unsub && unsub();
}, [ensureDoc, currentUserEmail]); // <- crucial: re-executa quando currentUserEmail mudar

  // -------------------------------------------------------------
  // Timer local do cliente
  // -------------------------------------------------------------
  useEffect(() => {
    // limpar se existir
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const t = hud.timer || {};

    if (t.running) {
      timerRef.current = setInterval(() => {
        setHud((prev) => {
          const tt = prev.timer || t;

          const now = Date.now();

          // started pode ser:
          // - um Timestamp do Firestore (com toMillis)
          // - um número ms (Date.now())
          // - null
          let started = null;
          try {
            if (tt.startedAt && typeof tt.startedAt === "object" && typeof tt.startedAt.toMillis === "function") {
              started = tt.startedAt.toMillis();
            } else if (typeof tt.startedAt === "number") {
              started = tt.startedAt;
            } else if (tt.startedAt && typeof tt.startedAt.seconds === "number") {
              // caso venha { seconds: X } (compatibilidade)
              started = tt.startedAt.seconds * 1000;
            } else {
              started = null;
            }
          } catch (e) {
            started = null;
          }

          // Recalcular remaining
          let remaining = tt.remaining ?? tt.duration ?? 60;

          if (started) {
            const elapsed = Math.floor((now - started) / 1000);
            remaining = Math.max(0, (tt.duration ?? 60) - elapsed);
          } else {
            remaining = Math.max(0, (tt.remaining == null ? tt.duration ?? 60 : tt.remaining) - 1);
          }

          if (remaining <= 0) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }

          return {
            ...prev,
            timer: {
              ...tt,
              remaining,
              running: remaining > 0 && !!tt.running,
              duration: tt.duration ?? 60,
              startedAt: tt.startedAt ?? null,
            },
          };
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // NOTE: dependemos de hud.timer.running para ligar/desligar o loop
  }, [hud.timer?.running]);

  // -------------------------------------------------------------
  // Helper genérico de escrita – usar merge para evitar races
  // -------------------------------------------------------------
  const writeHud = useCallback(async (patch) => {
    try {
      // Usar setDoc com merge evita race conditions entre get+set
      await setDoc(HUD_DOC, { ...patch, updatedAt: serverTimestamp() }, { merge: true });
    } catch (e) {
      console.error("GameProvider.writeHud erro:", e);
    }
  }, []);

  // -------------------------------------------------------------
  // SET TURN (mestre)
  // -------------------------------------------------------------
  const setTurn = async (turnObj) => {
    if (!isMaster) return;

    try {
      // debug
      // eslint-disable-next-line no-console
      console.log("GameProvider.setTurn chamado:", turnObj);
    } catch {}

    await writeHud({ turn: turnObj });

    try {
      playMusic && playMusic(sfxCall);
    } catch {}
  };

  // -------------------------------------------------------------
  // XP operations
  // -------------------------------------------------------------
  const addXP = async (email, xpDelta) => {
    if (!isMaster) return;

    try {
      // ler snapshot atual pode ser redundante com merge, mas para calcular
      // corretamente vamos pegar os dados atuais de quem escreveu no servidor
      const snap = await getDoc(HUD_DOC);
      const data = snap.exists() ? snap.data() : {};
      const xpMap = data.xpMap || {};

      const entry = xpMap[email] || { xp: 0, level: 1 };
      let newXP = (entry.xp || 0) + xpDelta;
let newLevel = entry.level || 1;

// SUBIR LEVEL
while (newXP >= 100) {
  newXP -= 100;
  newLevel++;
}

// DESCER LEVEL
while (newXP < 0) {
  if (newLevel > 1) {
    newXP += 100;
    newLevel--;
  } else {
    newXP = 0;
    break;
  }
}

// SALVAR
xpMap[email] = { xp: newXP, level: newLevel };


      // debug
      // eslint-disable-next-line no-console
      console.log("GameProvider.addXP escrevendo xpMap for", email, newXP);

      await writeHud({ xpMap });

      try {
        playMusic && playMusic(sfxXP);
      } catch {}

      // Atualizar ficha correspondente (se existir)
      try {
        const fichaRef = doc(db, "fichas", email);
        const fichaSnap = await getDoc(fichaRef);

        if (fichaSnap.exists()) {
          const ficha = fichaSnap.data();
          await setDoc(
            fichaRef,
            {
              ...ficha,
              xp: xpMap[email].xp,
              level: xpMap[email].level,
            },
            { merge: true }
          );
        }
      } catch (e) {
        console.debug("GameProvider: não salvou xp em ficha:", e);
      }
    } catch (e) {
      console.error("GameProvider.addXP erro:", e);
    }
  };

  const setXPDirect = async (email, xp, level) => {
    if (!isMaster) return;

    try {
      const snap = await getDoc(HUD_DOC);
      const data = snap.exists() ? snap.data() : {};
      const xpMap = data.xpMap || {};

      xpMap[email] = {
        xp: Math.max(0, Math.min(100, xp || 0)),
        level: level || xpMap[email]?.level || 1,
      };

      // debug
      // eslint-disable-next-line no-console
      console.log("GameProvider.setXPDirect:", email, xpMap[email]);

      await writeHud({ xpMap });
    } catch (e) {
      console.error("GameProvider.setXPDirect erro:", e);
    }
  };

  // -------------------------------------------------------------
  // World ops
  // -------------------------------------------------------------
  const setWorldPhase = async (phase) => {
    if (!isMaster) return;

    const world = { ...(hud.world || {}) };
    world.phase = phase;

    await writeHud({ world });
  };

  const setWorldSeasonDayYear = async ({ season, day, year }) => {
    if (!isMaster) return;

    const world = { ...(hud.world || {}) };

    if (season) world.season = season;
    if (day != null) world.day = day;
    if (year != null) world.year = year;

    await writeHud({ world });
  };

  // -------------------------------------------------------------
  // Timer ops
  // -------------------------------------------------------------
  const startTimer = async (durationSeconds) => {
    if (!isMaster) return;

    // Salvar startedAt como número ms para evitar problemas de toMillis
    const startedAt = Date.now();

    try {
      // debug
      // eslint-disable-next-line no-console
      console.log("GameProvider.startTimer: startedAt(ms) =", startedAt, "duration =", durationSeconds);
    } catch {}

    await writeHud({
      timer: {
        running: true,
        duration: durationSeconds,
        remaining: durationSeconds,
        startedAt,
      },
    });
  };

  const stopTimer = async () => {
    if (!isMaster) return;

    await writeHud({
      timer: {
        running: false,
        duration: hud.timer?.duration ?? 60,
        remaining: hud.timer?.remaining ?? 0,
        startedAt: null,
      },
    });
  };

  const resetTimer = async (durationSeconds) => {
    if (!isMaster) return;

    await writeHud({
      timer: {
        running: false,
        duration: durationSeconds,
        remaining: durationSeconds,
        startedAt: null,
      },
    });
  };

  // -------------------------------------------------------------
  // Floating HUD Position
  // -------------------------------------------------------------
  const setFloatingPosLocal = (pos) => {
    setHud((prev) => ({ ...prev, floatingPos: pos }));

    try {
      localStorage.setItem("hudFloatingPos", JSON.stringify(pos));
    } catch {}
  };

  const saveFloatingPosGlobal = async (pos) => {
    if (!isMaster) return;

    await writeHud({ floatingPos: pos });
  };

  // Carregar posição local
  useEffect(() => {
    try {
      const local = localStorage.getItem("hudFloatingPos");
      if (local) {
        const parsed = JSON.parse(local);
        if (
          parsed &&
          typeof parsed.x === "number" &&
          typeof parsed.y === "number"
        ) {
          setHud((p) => ({ ...p, floatingPos: parsed }));
        }
      }
    } catch {}
  }, []);
  

  // -------------------------------------------------------------
  // EXPORTAÇÃO DO CONTEXTO
  // -------------------------------------------------------------
  return (
    <GameContext.Provider
      value={{
        hud,
        loading,
        isMaster,
        currentUserEmail,

        setTurn,
        addXP,
        setXPDirect,

        setWorldPhase,
        setWorldSeasonDayYear,

        startTimer,
        stopTimer,
        resetTimer,

        setFloatingPosLocal,
        saveFloatingPosGlobal,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}
