import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { User, Mail, Key, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import type { ProfileOutletContextType } from '../App'; // Importar el tipo del contexto
import {
  Container,
  TextField,
  Button,
  Typography,
  Box,
  Paper,
  IconButton,
  InputAdornment,
  Alert,
  Grid,
  Divider,
} from '@mui/material';

const ProfileEditPage: React.FC = () => {
  const navigate = useNavigate();
  const { userProfile: currentUser, handleProfileUpdate } = useOutletContext<ProfileOutletContextType>();

  const [username, setUsername] = useState(currentUser.username);
  const [email, setEmail] = useState(currentUser.email);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    setUsername(currentUser.username);
    setEmail(currentUser.email);
  }, [currentUser]);

  const handleSave = async () => {
    setError(null);
    setSuccessMessage(null);
    setIsSaving(true);

    if (!username.trim() || !email.trim()) {
      setError('El nombre de usuario y el correo electrónico no pueden estar vacíos.');
      setIsSaving(false);
      return;
    }
    if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
      setError('El formato del correo electrónico no es válido.');
      setIsSaving(false);
      return;
    }

    let passwordsProvided = false;
    if (newPassword || currentPassword || confirmNewPassword) {
      passwordsProvided = true;
      if (!currentPassword) {
        setError('Por favor, introduce tu contraseña actual para cambiarla.');
        setIsSaving(false);
        return;
      }
      if (newPassword.length > 0 && newPassword.length < 6) {
         setError('La nueva contraseña debe tener al menos 6 caracteres.');
         setIsSaving(false);
         return;
      }
      if (newPassword !== confirmNewPassword) {
        setError('Las nuevas contraseñas no coinciden.');
        setIsSaving(false);
        return;
      }
    }
    
    try {
      if (passwordsProvided) {
        await handleProfileUpdate(username, email, currentPassword, newPassword);
      } else {
        await handleProfileUpdate(username, email);
      }
      setSuccessMessage('¡Perfil actualizado con éxito!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');

      // Redirigir a /equipos después de un breve retraso para que el usuario vea el mensaje
      setTimeout(() => {
        navigate('/equipos');
      }, 1500); // 1.5 segundos de retraso

    } catch (apiError: any) {
      console.error("Error al actualizar el perfil:", apiError);
      setError(apiError.message || "Ocurrió un error al actualizar el perfil.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    navigate(-1); 
  };
  
  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, sm: 3, md: 4 } }}>
      <Paper elevation={0} sx={{ p: { xs: 2, sm: 3, md: 4 }, borderRadius: '12px', backgroundColor: 'transparent' }}> {/* Quitamos el fondo del Paper o lo hacemos transparente */}
        
        <Box sx={{ display: 'flex', alignItems: 'center', mb: { xs: 3, md: 4 } }}>
          <IconButton onClick={handleCancel} sx={{ mr: 1.5 }} aria-label="Volver">
            <ArrowLeft />
          </IconButton>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', flexGrow: 1 }}>
            Editar Perfil
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        {successMessage && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {successMessage}
          </Alert>
        )}

        <Box component="form" onSubmit={(e) => { e.preventDefault(); handleSave(); }} noValidate>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 500 }}>
                Información de la Cuenta
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                id="username"
                label="Nombre de Usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                variant="outlined"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <User size={20} />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                id="email"
                label="Correo Electrónico"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                variant="outlined"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Mail size={20} />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 3 }} />
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 500 }}>
                Cambiar Contraseña (opcional)
              </Typography>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                id="currentPassword"
                label="Contraseña Actual"
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                variant="outlined"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Key size={20} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle current password visibility"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        edge="end"
                      >
                        {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                id="newPassword"
                label="Nueva Contraseña"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                helperText="Mínimo 6 caracteres"
                variant="outlined"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Key size={20} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle new password visibility"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        edge="end"
                      >
                        {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                id="confirmNewPassword"
                label="Confirmar Nueva Contraseña"
                type={showConfirmNewPassword ? 'text' : 'password'}
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                variant="outlined"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Key size={20} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle confirm new password visibility"
                        onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                        edge="end"
                      >
                        {showConfirmNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button variant="outlined" onClick={handleCancel} disabled={isSaving}>
              Cancelar
                </Button>
                <Button type="submit" variant="contained" color="primary" disabled={isSaving}>
                  {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Container>
  );
};

export default ProfileEditPage; 