import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
// Reintroducir useParams y useNavigate
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  TextField,
  Button,
  Typography,
  Grid,
  Paper,
  CircularProgress,
  Alert,
  Box,
  Divider,
  InputAdornment,
  FormControl,
  InputLabel,
  OutlinedInput,
  Switch,
  FormControlLabel,
  Snackbar,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
} from '@mui/material';
import { Save, X, ArrowLeft, ChevronDown } from 'lucide-react';
import { CostoPerfilData } from '../types';
import { api } from '../services/api';

// Helper para formatear números
const formatNumberForInput = (value: number | string | boolean | undefined | null): string => {
  if (value === null || value === undefined) return '';
  return String(value);
};

// Props opcionales para flexibilidad
interface PerfilEditFormProps {
  profileId?: string; // ID opcional pasado como prop
  onSaveSuccess?: () => void; // Callback opcional
  onCancel?: () => void; // Callback opcional
}

const PerfilEditForm: React.FC<PerfilEditFormProps> = ({ profileId, onSaveSuccess, onCancel }) => {
  // Obtener ID de la URL si no se pasa como prop
  const { id: idFromUrl } = useParams<{ id: string }>();
  const navigate = useNavigate(); // Necesario si se usa como página

  // Determinar qué ID usar (prop > url)
  const idToUse = profileId || idFromUrl;

  const [perfilData, setPerfilData] = useState<Partial<CostoPerfilData>>({});
  const [loading, setLoading] = useState<boolean>(!!idToUse); // True if editing, false if new
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  // Estado para Snackbar
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  useEffect(() => {
    const fetchPerfil = async () => {
      if (!idToUse) { // Should not happen if loading is true initially only for idToUse
        setLoading(false);
        return;
      }
      setLoading(true); // Ensure loading is true when fetching
      setError(null);
      try {
        console.log(`[PerfilEditForm] Fetching profile with ID: ${idToUse}`);
        const data = await api.fetchProfileData(idToUse);
        if (data) {
          console.log(`[PerfilEditForm] Profile data received:`, data);
          setPerfilData(data);
        } else {
          setError(`No se encontró un perfil con ID: ${idToUse}`);
          setPerfilData({}); // Clear data if not found
        }
      } catch (err: any) {
        console.error('[PerfilEditForm] Error fetching profile:', err);
        setError(err.message || 'Error al cargar los datos del perfil.');
        setPerfilData({}); // Clear data on error
      } finally {
        setLoading(false);
      }
    };

    if (idToUse) {
      fetchPerfil();
    } else {
      // For new profile, initialize with empty or default data
      setPerfilData({}); // Or some default structure if needed
      setLoading(false); // Not loading if it's a new profile
    }
  }, [idToUse]);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = event.target;
    const checked = (event.target as HTMLInputElement).checked; // Cast for checkbox

    let parsedValue: string | number | boolean = value;
    if (type === 'number') {
      parsedValue = parseFloat(value); // Don't default to 0, let validation handle it
      if (name.endsWith('_pct')) {
        parsedValue = (parseFloat(value) || 0) / 100; // Keep /100 for backend
      }
    } else if (type === 'checkbox') {
      parsedValue = checked;
    }

    setPerfilData(prevData => ({
      ...prevData,
      [name]: parsedValue,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Basic validation: if creating, ensure nombre_perfil exists
    if (!idToUse && !perfilData?.nombre_perfil) {
        setError('El nombre del perfil es obligatorio para crear un nuevo perfil.');
        return;
    }
    if (!perfilData || Object.keys(perfilData).length === 0 && !idToUse) {
        setError('No hay datos de perfil para guardar o el perfil está vacío.');
        return;
    }

    setIsSaving(true);
    setError(null);

    try {
      console.log(`[PerfilEditForm] Attempting to ${idToUse ? 'update' : 'create'} profile:`, perfilData );
      // Exclude fields that should not be sent on create/update directly by frontend
      const { _id, createdAt, updatedAt, ...updatePayload } = perfilData;

      if (idToUse) { // Editing existing profile
        await api.updateProfile(idToUse, updatePayload);
      } else { // Creating new profile
        // This part needs to be implemented if you have a createProfile API endpoint
        // For now, let's assume it's not fully implemented and log, or throw error
        console.log('[PerfilEditForm] Creating new profile with payload:', updatePayload);
        // const newProfile = await api.createProfile(updatePayload); // Uncomment and adapt if API exists
        // setSnackbarMessage('Perfil creado exitosamente! Navegando...');
        // navigate(`/admin/perfiles/editar/${newProfile._id}`); // Example navigation
        throw new Error("La creación de perfiles aún no está implementada en este formulario.");
      }
      
      setSnackbarMessage(`Perfil ${idToUse ? 'actualizado' : 'guardado'} exitosamente!`);
      setSnackbarOpen(true);

      if (onSaveSuccess) {
        setTimeout(() => onSaveSuccess(), 1500);
      } else if (idToUse) { // If it's a standalone page and was an edit
        // Optionally, you can navigate or just show the message
        // setTimeout(() => navigate('/admin/perfiles'), 1500);
      }

    } catch (err: any) {
      console.error('[PerfilEditForm] Error saving profile:', err);
      setError(err.response?.data?.message || err.message || 'Error al guardar el perfil.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate('/admin/perfiles'); // Default back navigation for standalone page
    }
  };

  const handleCloseSnackbar = (event?: React.SyntheticEvent | Event, reason?: string) => {
     if (reason === 'clickaway') {
       return;
     }
     setSnackbarOpen(false);
  };

  // Función renderizadora simplificada para CostoPerfilData
  const renderTextField = (
    fieldName: keyof Omit<CostoPerfilData, '_id' | 'createdAt' | 'updatedAt'>, 
    label: string, 
    type: string = 'text', 
    required: boolean = false, 
    adornment?: string,
    gridProps?: { xs?: number, sm?: number, md?: number }
  ) => {
      let valueToDisplay: string | number = formatNumberForInput(perfilData?.[fieldName]);
      let currentInputType = type;

      if (fieldName.endsWith('_pct') && typeof perfilData?.[fieldName] === 'number') {
          valueToDisplay = ( (perfilData[fieldName] as number) * 100 ).toFixed(2); // Show as 10.50
          currentInputType = 'number';
      } else if (type === 'number' && perfilData?.[fieldName] === null) {
        valueToDisplay = ''; // Show empty string for null numbers
      }

      return (
          <Grid item xs={12} {...gridProps}>
            <TextField
                fullWidth
                variant="outlined"
                label={label}
                name={fieldName}
                type={currentInputType}
                value={valueToDisplay}
                onChange={handleInputChange}
                required={required}
                InputProps={adornment ? {
                    endAdornment: <InputAdornment position="end">{adornment}</InputAdornment>,
                } : undefined}
                InputLabelProps={{ shrink: true }}
                inputProps={{ 
                    step: currentInputType === 'number' ? (fieldName.endsWith('_pct') ? '0.01' : '0.01') : undefined 
                    // step any for non-pct numbers, 0.01 for pct to allow two decimal places
                }}
                disabled={isSaving || (loading && !!idToUse)}
            />
          </Grid>
      );
  };

  // Determinar si se está usando como página o modal para renderizar
  const isStandalonePage = !onCancel && !onSaveSuccess;

  if (!idToUse && !isStandalonePage && !profileId) { 
      return <Alert severity="warning">No se ha proporcionado un ID de perfil para editar en modo modal.</Alert>;
  }

  const actualFormContent = (
    <Box component="form" onSubmit={handleSubmit} sx={{width: '100%', mt: 1 }}>
      <Accordion defaultExpanded sx={{ mb: 3.5, boxShadow: 'none', '&::before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<ChevronDown />} aria-controls="general-content" id="general-header">
          <Typography variant="h6" sx={{ fontWeight: 500 }}>Datos Generales</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 2, pb: 3 }}>
          <Grid container spacing={3.5}>
            {renderTextField('nombre_perfil', 'Nombre del Perfil', 'text', true, undefined, { md: 6 })}
            {renderTextField('descripcion', 'Descripción', 'text', false, undefined, { md: 6 })}
            <Grid item xs={12} sx={{pt: 2, display: 'flex', alignItems: 'center' }}>
              <FormControlLabel
                control={<Switch 
                            checked={!!perfilData?.activo} 
                            onChange={handleInputChange} 
                            name="activo" 
                            disabled={isSaving || (loading && !!idToUse)} 
                         />}
                label="Perfil Activo"
                sx={{ color: perfilData?.activo ? 'text.primary' : 'text.secondary' }}
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
      
      <Accordion sx={{ boxShadow: 'none', '&::before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<ChevronDown />} aria-controls="logistica-content" id="logistica-header">
          <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>Logistica y seguro</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0, pb: 1 }}>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={4} md={3}>{renderTextField('costo_logistica_origen_eur', 'Costo Origen', 'number', false, 'EUR')}</Grid>
            <Grid item xs={6} sm={4} md={3}>{renderTextField('flete_maritimo_usd', 'Flete Marítimo P.', 'number', false, 'USD')}</Grid>
            <Grid item xs={6} sm={4} md={3}>{renderTextField('recargos_destino_usd', 'Recargos Destino', 'number', false, 'USD')}</Grid>
            <Grid item xs={6} sm={4} md={3}>{renderTextField('tasa_seguro_pct', 'Tasa Seguro', 'number', false, '%')}</Grid>
            <Grid item xs={6} sm={4} md={3}>{renderTextField('transporte_nacional_clp', 'Transp. Nacional', 'number', false, 'CLP')}</Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      <Accordion sx={{ boxShadow: 'none', '&::before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<ChevronDown />} aria-controls="importacion-content" id="importacion-header">
          <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>Costos de Importación</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0, pb: 1 }}>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={4} md={3}>{renderTextField('costo_agente_aduana_usd', 'Costo Ag. Aduana', 'number', false, 'USD')}</Grid>
            <Grid item xs={6} sm={4} md={3}>{renderTextField('gastos_portuarios_otros_usd', 'Gastos Puerto/Otros', 'number', false, 'USD')}</Grid>
            <Grid item xs={6} sm={4} md={3}>{renderTextField('derecho_advalorem_pct', 'Derecho AdValorem', 'number', false, '%')}</Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      <Accordion sx={{ boxShadow: 'none', '&::before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<ChevronDown />} aria-controls="conversion-content" id="conversion-header">
          <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>Conversión a CLP y Margen</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0, pb: 1 }}>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={4} md={3}>{renderTextField('margen_adicional_pct', '% Adicional Total', 'number', false, '%')}</Grid>
            <Grid item xs={6} sm={4} md={3}>{renderTextField('buffer_usd_clp_pct', 'Buffer USD/CLP', 'number', false, '%')}</Grid>
            <Grid item xs={6} sm={4} md={3}>{renderTextField('buffer_eur_usd_pct', 'Buffer EUR/USD', 'number', false, '%')}</Grid>
            <Grid item xs={6} sm={4} md={3}>{renderTextField('iva_pct', 'IVA', 'number', false, '%')}</Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
      
      <Accordion sx={{ boxShadow: 'none', '&::before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<ChevronDown />} aria-controls="cliente-content" id="cliente-header">
          <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>Precios para Cliente</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0, pb: 1 }}>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={4} md={3}>{renderTextField('descuento_fabrica_pct', 'Desc. Fábrica', 'number', false, '%')}</Grid>
            <Grid item xs={6} sm={4} md={3}>{renderTextField('descuento_cliente_pct', 'Desc. Cliente', 'number', false, '%')}</Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        {(isStandalonePage || onCancel) && (
          <Button variant="outlined" onClick={handleCancel} startIcon={<X />} disabled={isSaving}>
            Cancelar
          </Button>
        )}
        <Button
          type="submit"
          variant="contained"
          color="primary"
          startIcon={<Save />}
          disabled={isSaving || (loading && !idToUse && !perfilData?.nombre_perfil) || (loading && !!idToUse) }
        >
          {isSaving ? 'Guardando...' : (idToUse ? 'Guardar Cambios' : 'Crear Perfil')}
        </Button>
      </Box>
    </Box>
  );

  if (isStandalonePage) {
    return (
      <Container maxWidth="lg" sx={{ mt: 3, mb: 3 }}>
        <Paper sx={{ p: { xs: 2, sm: 3, md: 4 }, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h5" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
              {idToUse ? 'Editar Perfil' : 'Crear Nuevo Perfil'}
            </Typography>
            {idToUse && (
              <Button variant="outlined" onClick={() => navigate('/admin/perfiles')} startIcon={<ArrowLeft size={18}/>}>
                Volver a Perfiles
              </Button>
            )}
          </Box>
          <Divider sx={{ mb: 2 }}/>
          {loading && idToUse ? (
            <Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px'}}><CircularProgress /></Box>
          ) : actualFormContent}
        </Paper>
        <Snackbar open={snackbarOpen} autoHideDuration={4000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
          <Alert onClose={handleCloseSnackbar} severity="success" sx={{ width: '100%' }}>
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </Container>
    );
  }

  return (
    <Box sx={{ p: onCancel ? {xs: 1, sm:1.5} : 0 }}>
        {loading && !!idToUse && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 3 }}>
              <CircularProgress sx={{ mb: 1 }}/>
              <Typography variant="body2" color="text.secondary">Cargando...</Typography>
            </Box>
        )}
        {error && !isSaving && (
             <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        )}
        {(!loading || !idToUse) && !error && actualFormContent}
        {onSaveSuccess && (<Snackbar open={snackbarOpen} autoHideDuration={1500} onClose={handleCloseSnackbar} message={snackbarMessage} />)}
    </Box>
  );
};

export default PerfilEditForm; 