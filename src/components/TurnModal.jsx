// src/components/TurnModal.jsx
import React from "react";
import {
  Paper,
  Box,
  Typography,
  IconButton,
  Divider,
  MenuItem,
  ListItemText,
  ListItemSecondaryAction,
  ClickAwayListener,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

export default function TurnModal({
  open,
  anchorRect,
  placement,
  mergedEmails,
  displayNameFor,
  hudXpMap,
  onClose,
  onSelect,
  width = 420,
}) {
  if (!open) return null;

  // compute style for popper-like box around anchorRect
  const GAP = 8; // spacing between hud and modal
  const style = { position: "fixed", zIndex: 5000, width };

  if (!anchorRect) {
    // fallback center-top
    style.top = "10%";
    style.left = `calc(50% - ${width / 2}px)`;
  } else {
    const { left, top, width: aW, height } = anchorRect;
    // placement strings: bottom, top, right, left (we append -start/-end via placement arg)
    if (placement.startsWith("bottom")) {
      style.top = Math.min(window.innerHeight - 64, top + height + GAP) + "px";
      style.left = Math.max(8, left) + "px";
    } else if (placement.startsWith("top")) {
      style.top = Math.max(8, top - GAP - 8 - 420) + "px";
      style.left = Math.max(8, left) + "px";
    } else if (placement.startsWith("right")) {
      style.left = Math.min(window.innerWidth - width - 8, left + aW + GAP) + "px";
      style.top = Math.max(8, top) + "px";
    } else {
      // left
      style.left = Math.max(8, left - width - GAP) + "px";
      style.top = Math.max(8, top) + "px";
    }
  }

  return (
    <ClickAwayListener onClickAway={onClose}>
      <Paper elevation={18} sx={{ ...style, borderRadius: 1.5, overflow: "auto", maxHeight: 480 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 1, pt: 0.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Selecionar jogador</Typography>
          <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
        </Box>
        <Divider />
        <Box sx={{ p: 1 }}>
          {mergedEmails.length === 0 ? (
            <Typography variant="caption">Nenhuma ficha encontrada.</Typography>
          ) : (
            mergedEmails.map((email) => (
              <MenuItem key={email} onClick={() => onSelect(email)} sx={{ cursor: "pointer" }}>
                <ListItemText primary={displayNameFor(email)} />
                <ListItemSecondaryAction>
                  <Typography variant="caption" sx={{ pr: 1 }}>
                    {hudXpMap?.[email] ? `Lv ${hudXpMap[email].level}` : ""}
                  </Typography>
                </ListItemSecondaryAction>
              </MenuItem>
            ))
          )}
        </Box>
      </Paper>
    </ClickAwayListener>
  );
}
