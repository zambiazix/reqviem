import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Box, IconButton, Tooltip } from "@mui/material";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import { db } from "../firebaseConfig";
import { doc, onSnapshot } from "firebase/firestore";
import MusicMixer from "./MusicMixer";

function MusicMixerButton() {
  const [visible, setVisible] = useState(false);
  const [temMusica, setTemMusica] = useState(false);

  // 🟢 VERIFICAR SE TEM MÚSICA TOCANDO
  useEffect(() => {
    const ref = doc(db, "sound", "current");
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const sounds = data.sounds || [];
        setTemMusica(sounds.length > 0);
      } else {
        setTemMusica(false);
      }
    });
    return () => unsub();
  }, []);

  if (!temMusica) return null;

  return (
    <>
      {/* BOTÃO FLUTUANTE NO CANTO SUPERIOR DIREITO */}
      <Tooltip title="Mixer de Músicas" placement="left">
        <IconButton
          onClick={() => setVisible(!visible)}
          sx={{
            position: "fixed",
            top: 10,
            right: 10,
            zIndex: 99998,
            bgcolor: visible ? '#1e3a5f' : '#1a1a2e',
            color: '#4caf50',
            border: '1px solid #334155',
            width: 40,
            height: 40,
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            '&:hover': { bgcolor: '#1e3a5f' },
          }}
        >
          <VolumeUpIcon />
        </IconButton>
      </Tooltip>

      <MusicMixer visible={visible} onToggle={() => setVisible(false)} />
    </>
  );
}

export default React.memo(MusicMixerButton);