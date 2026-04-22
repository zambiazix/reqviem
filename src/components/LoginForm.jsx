// src/components/LoginForm.jsx
import React, { memo, useState } from "react";
import { 
  Paper, 
  Box, 
  Typography, 
  TextField, 
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  InputAdornment,
  Alert,
  Zoom,
  Fade
} from "@mui/material";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from "firebase/auth";
import { auth } from "../firebaseConfig";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import CloseIcon from "@mui/icons-material/Close";
import PersonAddIcon from "@mui/icons-material/PersonAdd";

const LoginForm = memo(function LoginForm({ onLogin, onRegister }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  
  // Estados para o modal de cadastro
  const [modalOpen, setModalOpen] = useState(false);
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerSenha, setRegisterSenha] = useState("");
  const [registerConfirmSenha, setRegisterConfirmSenha] = useState("");
  const [registerErro, setRegisterErro] = useState("");
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setErro("");
    try {
      await signInWithEmailAndPassword(auth, email, senha);
      if (onLogin) onLogin();
    } catch (err) {
      console.error("Login error:", err);
      setErro("Email ou senha incorretos");
    }
  };

  const handleRegister = async () => {
    // Validações
    if (!registerEmail || !registerSenha || !registerConfirmSenha) {
      setRegisterErro("Todos os campos são obrigatórios");
      return;
    }

    if (!registerEmail.includes('@') || !registerEmail.includes('.')) {
      setRegisterErro("Email inválido");
      return;
    }

    if (registerSenha.length < 6) {
      setRegisterErro("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    if (registerSenha !== registerConfirmSenha) {
      setRegisterErro("As senhas não coincidem");
      return;
    }

    setRegisterErro("");
    setLoading(true);

    try {
      // Criar conta no Firebase Auth
      await createUserWithEmailAndPassword(auth, registerEmail, registerSenha);
      
      setRegisterSuccess(true);
      
      // Fechar modal após sucesso e notificar componente pai
      setTimeout(() => {
        setModalOpen(false);
        setRegisterSuccess(false);
        setRegisterEmail("");
        setRegisterSenha("");
        setRegisterConfirmSenha("");
        
        // Se tiver callback onRegister, chama ele
        if (onRegister) {
          onRegister(registerEmail);
        }
      }, 2000);
      
    } catch (err) {
      console.error("Erro ao criar conta:", err);
      if (err.code === 'auth/email-already-in-use') {
        setRegisterErro("Este email já está cadastrado");
      } else if (err.code === 'auth/invalid-email') {
        setRegisterErro("Email inválido");
      } else if (err.code === 'auth/weak-password') {
        setRegisterErro("Senha muito fraca (use pelo menos 6 caracteres)");
      } else {
        setRegisterErro("Erro ao criar conta: " + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setRegisterEmail("");
    setRegisterSenha("");
    setRegisterConfirmSenha("");
    setRegisterErro("");
    setRegisterSuccess(false);
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  return (
    <>
      <Paper 
        sx={{ 
          p: 3, 
          m: "auto", 
          maxWidth: 450, 
          display: "flex", 
          flexDirection: "row", 
          alignItems: "center", 
          gap: 2,
          bgcolor: "#0f172a",
          border: "1px solid #1e293b"
        }}
      >
        <Box sx={{ flexShrink: 0 }}>
          <img 
            src="/logo.png" 
            alt="Logo Réquiem RPG" 
            style={{ 
              width: "80px", 
              height: "80px", 
              borderRadius: "50%", 
              objectFit: "contain", 
              boxShadow: "0 0 6px rgba(255,255,255,0.4), 0 0 10px rgba(255,255,255,0.2)" 
            }} 
          />
        </Box>
        
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" sx={{ mb: 2, color: "#fff", fontWeight: "bold" }}>
            Fazer Login
          </Typography>
          
          {erro && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {erro}
            </Alert>
          )}
          
          <form onSubmit={handleSubmit}>
            <TextField 
              label="E-mail" 
              fullWidth 
              size="small" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              sx={{ 
                mb: 2,
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#334155' },
                  '&:hover fieldset': { borderColor: '#475569' },
                },
                '& .MuiInputLabel-root': { color: '#94a3b8' },
                '& .MuiInputBase-input': { color: '#fff' }
              }}
            />
            
            <TextField 
              label="Senha" 
              fullWidth 
              size="small" 
              type="password" 
              value={senha} 
              onChange={(e) => setSenha(e.target.value)} 
              sx={{ 
                mb: 2,
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#334155' },
                  '&:hover fieldset': { borderColor: '#475569' },
                },
                '& .MuiInputLabel-root': { color: '#94a3b8' },
                '& .MuiInputBase-input': { color: '#fff' }
              }}
            />
            
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button 
                variant="contained" 
                type="submit" 
                fullWidth
                sx={{ 
                  bgcolor: "#1976d2",
                  '&:hover': { bgcolor: "#115293" }
                }}
              >
                Entrar
              </Button>
              
              <Button 
                variant="outlined" 
                onClick={() => setModalOpen(true)}
                startIcon={<PersonAddIcon />}
                sx={{ 
                  color: "#fff",
                  borderColor: "#334155",
                  '&:hover': { 
                    borderColor: "#475569",
                    bgcolor: "rgba(255,255,255,0.05)"
                  }
                }}
              >
                Criar Conta
              </Button>
            </Box>
          </form>
        </Box>
      </Paper>

      {/* Modal de Cadastro */}
      <Dialog 
        open={modalOpen} 
        onClose={loading ? undefined : handleCloseModal}
        maxWidth="sm"
        fullWidth
        TransitionComponent={Zoom}
        PaperProps={{
          sx: {
            bgcolor: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: 2
          }
        }}
      >
        <DialogTitle sx={{ 
          color: "#fff", 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          borderBottom: "1px solid #1e293b"
        }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <PersonAddIcon sx={{ color: "#1976d2" }} />
            <Typography variant="h6" sx={{ fontWeight: "bold" }}>
              Criar Nova Conta
            </Typography>
          </Box>
          <IconButton 
            onClick={handleCloseModal} 
            disabled={loading}
            sx={{ color: "#94a3b8" }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ pt: 3 }}>
          {registerSuccess ? (
            <Fade in={registerSuccess}>
              <Box sx={{ 
                display: "flex", 
                flexDirection: "column", 
                alignItems: "center", 
                justifyContent: "center",
                minHeight: 200
              }}>
                <Typography variant="h6" sx={{ color: "#4caf50", mb: 2 }}>
                  ✅ Conta criada com sucesso!
                </Typography>
                <Typography sx={{ color: "#94a3b8" }}>
                  Você já pode fazer login com seu email e senha.
                </Typography>
              </Box>
            </Fade>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {registerErro && (
                <Alert severity="error" sx={{ mb: 1 }}>
                  {registerErro}
                </Alert>
              )}
              
              <TextField
                label="Email"
                fullWidth
                value={registerEmail}
                onChange={(e) => setRegisterEmail(e.target.value)}
                disabled={loading}
                placeholder="seu@email.com"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: '#334155' },
                    '&:hover fieldset': { borderColor: '#475569' },
                  },
                  '& .MuiInputLabel-root': { color: '#94a3b8' },
                  '& .MuiInputBase-input': { color: '#fff' }
                }}
              />
              
              <TextField
                label="Senha"
                type={showPassword ? "text" : "password"}
                fullWidth
                value={registerSenha}
                onChange={(e) => setRegisterSenha(e.target.value)}
                disabled={loading}
                helperText="Mínimo de 6 caracteres"
                FormHelperTextProps={{ sx: { color: '#64748b' } }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        sx={{ color: '#94a3b8' }}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: '#334155' },
                    '&:hover fieldset': { borderColor: '#475569' },
                  },
                  '& .MuiInputLabel-root': { color: '#94a3b8' },
                  '& .MuiInputBase-input': { color: '#fff' }
                }}
              />
              
              <TextField
                label="Confirmar Senha"
                type={showConfirmPassword ? "text" : "password"}
                fullWidth
                value={registerConfirmSenha}
                onChange={(e) => setRegisterConfirmSenha(e.target.value)}
                disabled={loading}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        edge="end"
                        sx={{ color: '#94a3b8' }}
                      >
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: '#334155' },
                    '&:hover fieldset': { borderColor: '#475569' },
                  },
                  '& .MuiInputLabel-root': { color: '#94a3b8' },
                  '& .MuiInputBase-input': { color: '#fff' }
                }}
              />
              
              <Typography variant="caption" sx={{ color: "#64748b", mt: 1 }}>
                Ao criar uma conta, você concorda com os termos de uso do Réquiem RPG.
              </Typography>
            </Box>
          )}
        </DialogContent>
        
        {!registerSuccess && (
          <DialogActions sx={{ p: 3, borderTop: "1px solid #1e293b" }}>
            <Button 
              onClick={handleCloseModal} 
              disabled={loading}
              sx={{ color: "#94a3b8" }}
            >
              Cancelar
            </Button>
            <Button 
              variant="contained" 
              onClick={handleRegister}
              disabled={loading}
              sx={{ 
                bgcolor: "#1976d2",
                '&:hover': { bgcolor: "#115293" },
                minWidth: 120
              }}
            >
              {loading ? "Criando..." : "Criar Conta"}
            </Button>
          </DialogActions>
        )}
      </Dialog>
    </>
  );
});

export default LoginForm;