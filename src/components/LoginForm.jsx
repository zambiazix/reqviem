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
  Fade,
  Checkbox,
  FormControlLabel
} from "@mui/material";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from "firebase/auth";
import { auth, db } from "../firebaseConfig";
import { doc, setDoc } from "firebase/firestore";
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
  
  // 🟢 NOVO: Estado para convidado e nome
  const [isConvidado, setIsConvidado] = useState(false);
  const [nomeConvidado, setNomeConvidado] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setErro("");
    
    // 🟢 Garante que o email tem o domínio correto
    const emailCompleto = email.includes('@') ? email : `${email}@reqviemrpg.com`;
    
    try {
      await signInWithEmailAndPassword(auth, emailCompleto, senha);
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

    // 🟢 Garante que o email termina com @reqviemrpg.com
    const emailLimpo = registerEmail.split('@')[0].trim();
    if (!emailLimpo) {
      setRegisterErro("Digite um nome de usuário válido");
      return;
    }
    
    const emailCompleto = `${emailLimpo}@reqviemrpg.com`;

    if (registerSenha.length < 6) {
      setRegisterErro("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    if (registerSenha !== registerConfirmSenha) {
      setRegisterErro("As senhas não coincidem");
      return;
    }
    
    // 🟢 Validação do nome para convidado
    if (isConvidado && !nomeConvidado.trim()) {
      setRegisterErro("Digite seu nome de convidado");
      return;
    }

    setRegisterErro("");
    setLoading(true);

    try {
      // Criar conta no Firebase Auth
      await createUserWithEmailAndPassword(auth, emailCompleto, registerSenha);
      
      // 🟢 Salvar dados da conta no Firestore
      await setDoc(doc(db, "contas_usuarios", emailCompleto), {
        email: emailCompleto,
        senha: registerSenha,
        isConvidado: isConvidado,
        nomeConvidado: isConvidado ? nomeConvidado.trim() : null,
        criadoEm: new Date().toISOString(),
      });
      
      // 🟢 Criar ficha básica
      const fichaInicial = {
        nome: isConvidado ? nomeConvidado.trim() : emailLimpo,
        tipoFicha: "PJ",
        dono: emailCompleto,
        isConvidado: isConvidado,
        carteiras: [{ nome: "Bolso", valor: 0 }],
        genero: "",
        idade: "",
        altura: "",
        peso: "",
        pontosVida: 0,
        pontosEnergia: 0,
        armadura: 0,
        atributos: { forca: 1, destreza: 1, agilidade: 1, constituicao: 1, inteligencia: 1, vontade: 1 },
        pericias: {},
        habilidades: [],
        equipamentos: [],
        vestes: [],
        diversos: [],
        moedas: 0,
        anotacoes: "",
        background: "",
        defeitos: "",
        tracos: "",
        caracteristicas: "",
        movimentacao: "",
        ignorarLimitePeso: false,
        ignorarLimiteHabilidades: false,
        permitirRedistribuirPontos: false,
        inventariosSecundarios: []
      };
      
      await setDoc(doc(db, "fichas", emailCompleto), fichaInicial);
      
      setRegisterSuccess(true);
      
      setTimeout(() => {
        setModalOpen(false);
        setRegisterSuccess(false);
        setRegisterEmail("");
        setRegisterSenha("");
        setRegisterConfirmSenha("");
        setIsConvidado(false);
        setNomeConvidado("");
        
        if (onRegister) {
          onRegister(emailCompleto);
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
    setIsConvidado(false);
    setNomeConvidado("");
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
              label="Usuário" 
              fullWidth 
              size="small" 
              value={email} 
              onChange={(e) => {
                // Remove @reqviemrpg.com se o usuário digitar
                const valor = e.target.value.replace('@reqviemrpg.com', '');
                setEmail(valor);
              }} 
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Typography sx={{ color: '#64748b', fontSize: '0.8rem' }}>
                      @reqviemrpg.com
                    </Typography>
                  </InputAdornment>
                ),
              }}
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
              
              {/* 🟢 CHECKBOX CONVIDADO */}
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isConvidado}
                    onChange={(e) => setIsConvidado(e.target.checked)}
                    sx={{ color: '#ff9800', '&.Mui-checked': { color: '#ff9800' } }}
                  />
                }
                label={
                  <Typography sx={{ color: '#ff9800', fontSize: '0.85rem' }}>
                    🎭 Convidado (não vai jogar o RPG de mesa)
                  </Typography>
                }
              />
              
              {/* 🟢 CAMPO NOME PARA CONVIDADO */}
              {isConvidado && (
                <TextField
                  label="Seu Nome"
                  fullWidth
                  value={nomeConvidado}
                  onChange={(e) => setNomeConvidado(e.target.value)}
                  disabled={loading}
                  placeholder="Como quer ser chamado?"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': { borderColor: '#ff9800' },
                      '&:hover fieldset': { borderColor: '#ff9800' },
                    },
                    '& .MuiInputLabel-root': { color: '#ff9800' },
                    '& .MuiInputBase-input': { color: '#fff' }
                  }}
                />
              )}
              
              <TextField
                label="Usuário"
                fullWidth
                value={registerEmail}
                onChange={(e) => {
                  // Remove @reqviemrpg.com se o usuário digitar
                  const valor = e.target.value.replace('@reqviemrpg.com', '');
                  setRegisterEmail(valor);
                }}
                disabled={loading}
                placeholder="seu_nome"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Typography sx={{ color: '#64748b', fontSize: '0.8rem' }}>
                        @reqviemrpg.com
                      </Typography>
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