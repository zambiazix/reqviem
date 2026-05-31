// src/components/HUDMobile.jsx
import React, { useState, useEffect } from "react";
import { Dialog, IconButton, Box } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import FloatingHUD from "./FloatingHUD";

export default function HUDMobile({ userEmail, openCommerce, closeCommerce }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    window.__toggleHUDMobile = () => setOpen(prev => !prev);
    return () => { window.__toggleHUDMobile = null; };
  }, []);

  return (
    <Dialog 
      open={open} 
      onClose={() => setOpen(false)} 
      fullScreen
      PaperProps={{ sx: { bgcolor: "transparent", overflow: "hidden" } }}
    >
      <Box sx={{ position: "relative", width: "100%", height: "100%" }}>
        <IconButton 
          onClick={() => setOpen(false)} 
          sx={{ position: "absolute", top: 8, right: 8, zIndex: 999999, bgcolor: "rgba(0,0,0,0.6)", color: "#fff", '&:hover': { bgcolor: "rgba(0,0,0,0.8)" } }}
        >
          <CloseIcon />
        </IconButton>
        <Box sx={{ 
          position: "absolute", 
          top: "50%", 
          left: "50%", 
          transform: "translate(-50%, -50%)",
          width: "95%",
          maxWidth: 540,
          pointerEvents: "auto"
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