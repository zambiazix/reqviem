// src/components/HUDMobile.jsx
import React, { useState, useEffect, useRef } from "react";
import { Dialog, IconButton, Box } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import FloatingHUD from "./FloatingHUD";

export default function HUDMobile({ userEmail, openCommerce, closeCommerce }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    window.__toggleHUDMobile = () => setOpen(prev => !prev);
    return () => { window.__toggleHUDMobile = null; };
  }, []);

  return (
    <Dialog 
      open={open} 
      onClose={() => setOpen(false)} 
      fullScreen
      PaperProps={{ 
        sx: { 
          bgcolor: "rgba(0,0,0,0.85)", 
          overflow: "hidden",
          m: 0,
          p: 0,
        } 
      }}
    >
      <Box 
        ref={containerRef}
        sx={{ 
          position: "relative", 
          width: "100%", 
          height: "100%",
          display: "flex",
          flexDirection: "column",
          pt: 6, // espaço pro botão fechar
          pb: 2,
          px: 1,
          overflow: "auto",
          "&::-webkit-scrollbar": {
            width: "4px",
          },
          "&::-webkit-scrollbar-track": {
            background: "rgba(255,255,255,0.1)",
          },
          "&::-webkit-scrollbar-thumb": {
            background: "rgba(0,224,255,0.3)",
            borderRadius: "10px",
          },
        }}
      >
        <IconButton 
          onClick={() => setOpen(false)} 
          sx={{ 
            position: "fixed", 
            top: 8, 
            right: 8, 
            zIndex: 999999, 
            bgcolor: "rgba(0,0,0,0.6)", 
            color: "#fff", 
            '&:hover': { bgcolor: "rgba(0,0,0,0.8)" } 
          }}
        >
          <CloseIcon />
        </IconButton>
        
        <Box sx={{ 
          width: "100%",
          maxWidth: 540,
          mx: "auto",
          minHeight: "100%",
          display: "flex",
          flexDirection: "column",
        }}>
          <FloatingHUD 
            userEmail={userEmail} 
            openCommerce={openCommerce} 
            closeCommerce={closeCommerce} 
          />
        </Box>
      </Box>
    </Dialog>
  );
}