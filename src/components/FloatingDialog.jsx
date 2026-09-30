import React from "react";
import { createPortal } from "react-dom";
import { Box, Paper, Typography, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import useFloatingWindow from "../hooks/useFloatingWindow";

const V3 = {
  bg: "#1a1512",
  bg2: "#2a2018",
  paper: "#e8dcc0",
  paperDark: "#d4c4a0",
  gold: "#b8945a",
  goldLight: "#c9a961",
  ink: "#3a2e20",
};

export default function FloatingDialog({
  open,
  onClose,
  titulo,
  subtitulo,
  cor,
  id,
  larguraInicial = 720,
  alturaInicial = 520,
  larguraMinima = 420,
  alturaMinima = 280,
  zIndex = 10500,
  children,
  footer,
}) {
  const {
    refBox, posicao, tamanho, minimizado,
    toggleMinimizado, arrastando, redimensionando,
    handleTituloMouseDown, handleResizeMouseDown,
  } = useFloatingWindow({
    id: id || `floating_${titulo}`,
    larguraInicial,
    alturaInicial,
    larguraMinima,
    alturaMinima,
  });

  if (!open) return null;

  return createPortal(
    <Paper
      ref={refBox}
      elevation={20}
      sx={{
        position: "fixed",
        left: posicao.x,
        top: posicao.y,
        width: minimizado ? 340 : tamanho.width,
        height: minimizado ? 46 : tamanho.height,
        bgcolor: V3.paper,
        border: `2px solid ${cor || V3.gold}`,
        borderRadius: 2,
        zIndex,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxShadow: `0 0 40px ${(cor || V3.gold)}44, 0 12px 40px rgba(0,0,0,0.8)`,
        transition: arrastando || redimensionando ? "none" : "width 0.2s ease, height 0.2s ease",
      }}
    >
      <Box
        onMouseDown={handleTituloMouseDown}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          p: 1,
          bgcolor: V3.bg2,
          borderBottom: `2px solid ${cor || V3.gold}`,
          cursor: arrastando ? "grabbing" : "grab",
          userSelect: "none",
          flexShrink: 0,
        }}
      >
        <DragIndicatorIcon sx={{ color: cor || V3.gold, fontSize: 20 }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="subtitle2"
            sx={{
              color: cor || V3.gold,
              fontWeight: 900,
              fontFamily: "Georgia, serif",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              lineHeight: 1.2,
            }}
          >
            {titulo}
          </Typography>
          {!minimizado && subtitulo && (
            <Typography
              variant="caption"
              sx={{
                color: `${cor || V3.gold}99`,
                fontSize: "0.6rem",
                display: "block",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {subtitulo}
            </Typography>
          )}
        </Box>
        <IconButton
          size="small"
          onClick={toggleMinimizado}
          sx={{ color: cor || V3.gold }}
          title={minimizado ? "Expandir" : "Minimizar"}
        >
          {minimizado ? <ExpandMoreIcon fontSize="small" /> : <ExpandLessIcon fontSize="small" />}
        </IconButton>
        <IconButton size="small" onClick={onClose} sx={{ color: cor || V3.gold }} title="Fechar">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {!minimizado && (
        <>
          <Box
            sx={{
              flex: 1,
              overflowY: "auto",
              p: 2,
              color: V3.ink,
              "&::-webkit-scrollbar": { width: 6 },
              "&::-webkit-scrollbar-thumb": { background: `${cor || V3.gold}44`, borderRadius: 3 },
            }}
          >
            {children}
          </Box>

          {footer && (
            <Box
              sx={{
                borderTop: `1px solid ${V3.ink}33`,
                bgcolor: V3.bg2,
                p: 1,
                display: "flex",
                justifyContent: "flex-end",
                gap: 1,
                flexShrink: 0,
              }}
            >
              {footer}
            </Box>
          )}

          <Box
            onMouseDown={handleResizeMouseDown}
            sx={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: 18,
              height: 18,
              cursor: "nwse-resize",
              zIndex: 20,
              "&::after": {
                content: '""',
                position: "absolute",
                right: 3,
                bottom: 3,
                width: 8,
                height: 8,
                borderRight: `2px solid ${cor || V3.gold}`,
                borderBottom: `2px solid ${cor || V3.gold}`,
              },
            }}
          />
        </>
      )}
    </Paper>,
    document.body
  );
}