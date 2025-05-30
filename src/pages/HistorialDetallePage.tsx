import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import { 
  Container, Typography, Paper, CircularProgress, Alert, Box, Button, 
  Grid, List, ListItem, ListItemText, Divider, Chip, IconButton, Collapse
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, ExpandMore as ExpandMoreIcon, ChevronRight as ChevronRightIcon, Settings as SettingsIcon } from '@mui/icons-material';
import { getCalculoHistorialById, HistorialCalculoItem } from '../services/calculoHistorialService';
import { CostoPerfilData } from '../types'; // Asumiendo que podrías necesitarla para RenderResultDetails
import { CalculationResult } from '../types/calculoTypes'; // Para RenderResultDetails

// Interfaz para los productos dentro de itemsParaCotizar
interface ProductoHistorialItem {
  codigo_producto: string;
  nombre_del_producto?: string;
  Descripcion?: string; // Nota: D mayúscula según el schema de backend
  // Otros campos relevantes del producto si los necesitas aquí
}

interface ItemParaCotizarHistorial {
  principal: ProductoHistorialItem;
  opcionales: ProductoHistorialItem[];
}

// --- COPIA O IMPORTA RenderResultDetails y sus helpers de formato ---
// Por simplicidad, lo pegaré aquí, pero idealmente sería un componente compartido.
// Asegúrate de que los tipos (CalculationResult, CostoPerfilData) y helpers de formato sean accesibles.

// --- Helpers de Formato ---
// Nueva función formatCLP manual
const formatCLP = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '--';
  const numericValue = Number(value);
  if (isNaN(numericValue)) return '--';

  const roundedValue = Math.round(numericValue);
  
  const intString = roundedValue.toString();
  const parts = [];
  let tempString = intString;
  
  // Manejar números negativos correctamente con el signo
  let sign = '';
  if (tempString.startsWith('-')) {
    sign = '-';
    tempString = tempString.substring(1);
  }

  while (tempString.length > 3) {
    parts.unshift(tempString.slice(-3));
    tempString = tempString.slice(0, -3);
  }
  if (tempString.length > 0) { // Asegurarse de no añadir un array vacío si tempString era vacío (ej. para 0)
    parts.unshift(tempString);
  }
  
  if (parts.length === 0 && roundedValue === 0) { // Caso especial para el número 0
    return '$0';
  }
  if (parts.length === 0 && intString !== '0') { // Si algo salió mal y parts está vacío pero no era 0
      return `$${sign}${intString}`; // Fallback al string original sin puntos pero con signo
  }

  return `$${sign}${parts.join('.')}`; 
};

// Actualizar formatGenericCurrency para mayor consistencia y control del símbolo
const formatGenericCurrency = (value: number | null | undefined, currency: 'USD' | 'EUR', digits = 2): string => {
  if (value === null || value === undefined) return '--';
  
  let numberPart = Number(value).toLocaleString('es-ES', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  // Quitar ,00 si los dígitos son 2 y es un entero exacto en formato es-ES
  if (digits === 2 && numberPart.endsWith(',00')) {
    numberPart = numberPart.substring(0, numberPart.length - 3);
  }
  
  if (currency === 'EUR') {
    return `${numberPart} €`;
  } else { // USD
    return `$${numberPart}`;
  }
};

// Modificar formatPercentDisplay para que el default sea 0 decimales
const formatPercentDisplay = (value: number | null | undefined, digits = 0): string => {
  if (value === null || value === undefined) return '--';
  const numericValue = Number(value);
  if (isNaN(numericValue)) return '--';
  return `${(numericValue * 100).toFixed(digits)}%`;
};

const formatNumber = (value: number | null | undefined, digits = 2): string => { // Default a 2 decimales para números genéricos
    if (value === null || value === undefined) return '--';
    const numericValue = Number(value);
    if (isNaN(numericValue)) return '--';

    let formattedNumber = numericValue.toLocaleString('es-ES', { minimumFractionDigits: digits, maximumFractionDigits: digits });
    if (digits === 2 && formattedNumber.endsWith(',00')) {
        formattedNumber = formattedNumber.substring(0, formattedNumber.length - 3);
    }
    return formattedNumber;
};

// FUNCIONES DE FORMATO DE TEXTO AÑADIDAS/ASEGURADAS
const splitAndCapitalizeKey = (key: string): string => {
  if (!key) return key;
  const spacedKey = key.replace(/_/g, ' ')
                       .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
                       .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2');
  return spacedKey.charAt(0).toUpperCase() + spacedKey.slice(1);
};

const capitalizeFirstLetter = (str: string): string => {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
};
// FIN FUNCIONES DE FORMATO DE TEXTO AÑADIDAS/ASEGURADAS

const inputLabels: Record<string, string> = { /* ... (Copia de ResultadosCalculoCostosPanel) ... */ };
const apiValuesLabels: Record<string, string> = { /* ... (Copia de ResultadosCalculoCostosPanel) ... */ };


const RenderResultDetails: React.FC<{ detalle: CalculationResult | null, profileName?: string }> = ({ detalle, profileName }) => {
    if (!detalle) {
        return <Typography variant="body2" color="textSecondary">No hay detalles de cálculo disponibles.</Typography>;
    }
    if (detalle.error) {
        return <Alert severity="error">Error en el cálculo: {detalle.error}</Alert>;
    }
    const displayProfileName = capitalizeFirstLetter(profileName || detalle.profileName || "Perfil Desconocido");
    const inputs = detalle.inputs;
    const calculados = detalle.calculados;

    if (!inputs || !calculados) {
        return <Alert severity="warning">Datos del cálculo detallado incompletos.</Alert>;
    }

    const formatValue = (value: any, key: string): string => {
        const lowerKey = key.toLowerCase();
        // Intentar convertir a número si es una cadena que representa un número, antes de typeof
        let numericValue = value;
        if (typeof value === 'string' && !isNaN(parseFloat(value)) && isFinite(Number(value))) {
            numericValue = parseFloat(value);
        }

        if (typeof numericValue === 'number') {
            if (lowerKey === 'factoractualizacion') return formatPercentDisplay(numericValue, 2); 
            if (lowerKey.includes('_clp')) return formatCLP(numericValue);
            else if (lowerKey.endsWith('_eur')) return formatGenericCurrency(numericValue, 'EUR');
            else if (lowerKey.endsWith('_usd')) return formatGenericCurrency(numericValue, 'USD');
            else if (lowerKey.includes('_pct') || lowerKey.startsWith('tasa_') || lowerKey.includes('factor')) return formatPercentDisplay(numericValue);
            else if (lowerKey.includes('tipo_cambio')) return formatNumber(numericValue, 6); 
            else return formatNumber(numericValue);
        }
        return value?.toString() || '--';
    };
    
    // Simplificado para este contexto. Considera refactorizar RenderResultDetails a un componente común.
    return (
        <Paper elevation={2} sx={{ p: 2, mt: 1, mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom>Detalle (Perfil: {displayProfileName})</Typography>
            {Object.entries(calculados).map(([stageName, stageValues]) => (
                <Box key={stageName} sx={{ mb: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'medium' }}>
                        {splitAndCapitalizeKey(stageName)}
                    </Typography>
                    <List dense disablePadding>
                        {Object.entries(stageValues as Record<string, any>).map(([key, value]) => (
                            <ListItem key={key} disableGutters sx={{ py: 0.5 }}>
                                <ListItemText 
                                    primary={splitAndCapitalizeKey(key)}
                                    secondary={formatValue(value, key)} 
                                    primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                                    secondaryTypographyProps={{ variant: 'body2', fontWeight: 'medium', color: 'text.primary' }}
                                />
                            </ListItem>
                        ))}
                    </List>
                </Box>
            ))}
        </Paper>
    );
};
// --- FIN COPIA RenderResultDetails ---

const formatDateForDisplay = (dateString?: string) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString('es-CL', { dateStyle: 'long', timeStyle: 'short' });
};

const HistorialDetallePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [detalle, setDetalle] = useState<HistorialCalculoItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (id) {
      setLoading(true);
      setError(null);
      getCalculoHistorialById(id)
        .then(data => {
          setDetalle(data);
          setLoading(false);
        })
        .catch(err => {
          setError(err.message || 'Error al cargar los detalles del historial.');
          setLoading(false);
        });
    } else {
      setError('ID de historial no proporcionado.');
      setLoading(false);
    }
  }, [id]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const handleConfigure = () => {
    if (detalle && detalle.itemsParaCotizar && detalle.itemsParaCotizar.length > 0) {
      const firstItemBundle = detalle.itemsParaCotizar[0];
      
      if (firstItemBundle.principal && firstItemBundle.principal.codigo_producto) {
        const mainProductCodigo = firstItemBundle.principal.codigo_producto;
        const selectedOptionalCodigos = firstItemBundle.opcionales?.map((op: ProductoHistorialItem) => op.codigo_producto).filter(Boolean) as string[] || [];

        navigate('/configurar-opcionales', {
          state: {
            fromHistory: true,
            mainProductCodigo: mainProductCodigo,
            selectedOptionalCodigos: selectedOptionalCodigos,
          }
        });
      } else {
        console.error("El producto principal o su código no se encontró en el primer item del historial.");
        setError("No se pudo cargar la configuración: falta el producto principal en el historial.");
      }
    } else {
      console.error("No hay items en el historial para configurar.");
      setError("No hay items en el historial para configurar.");
    }
  };

  if (loading) {
    return <Container sx={{ textAlign: 'center', mt: 5 }}><CircularProgress /></Container>;
  }

  if (error) {
    return <Container sx={{ mt: 3 }}><Alert severity="error">{error}</Alert></Container>;
  }

  if (!detalle) {
    return <Container sx={{ mt: 3 }}><Alert severity="warning">No se encontraron detalles para este cálculo.</Alert></Container>;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Button startIcon={<ArrowBackIcon />} component={RouterLink} to="/historial">
          Volver al Historial
        </Button>
        {detalle && detalle.itemsParaCotizar && detalle.itemsParaCotizar.length > 0 && (
          <Button 
            variant="contained" 
            color="secondary" 
            startIcon={<SettingsIcon />} 
            onClick={handleConfigure}
          >
            Configurar este Cálculo
          </Button>
        )}
      </Box>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Detalle del Cálculo #{detalle.numeroConfiguracion || detalle._id}
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="h6">Información General</Typography>
            <List dense>
              <ListItem><ListItemText primary="Número Configuración" secondary={detalle.numeroConfiguracion || 'N/A'} /></ListItem>
              <ListItem><ListItemText primary="Referencia" secondary={detalle.nombreReferencia || 'N/A'} /></ListItem>
              <ListItem><ListItemText primary="Fecha Creación" secondary={formatDateForDisplay(detalle.createdAt)} /></ListItem>
              <ListItem><ListItemText primary="Cliente" secondary={detalle.cotizacionDetails?.clienteNombre || 'N/A'} /></ListItem>
              {/* Añadir más campos de cotizacionDetails si es necesario */}
            </List>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="h6">Detalles del Emisor (si aplica)</Typography>
            <List dense>
                <ListItem><ListItemText primary="Nombre Emisor" secondary={detalle.cotizacionDetails?.emisorNombre || 'N/A'} /></ListItem>
                <ListItem><ListItemText primary="Área Comercial" secondary={detalle.cotizacionDetails?.emisorAreaComercial || 'N/A'} /></ListItem>
                <ListItem><ListItemText primary="Email Emisor" secondary={detalle.cotizacionDetails?.emisorEmail || 'N/A'} /></ListItem>
            </List>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h5" component="h2" gutterBottom sx={{mt: 2}}>
          Items y Resultados del Cálculo
        </Typography>
        
        {detalle.itemsParaCotizar?.map((item: ItemParaCotizarHistorial, index: number) => {
          const principalId = `principal-${item.principal?.codigo_producto}-${index}`;
          const isPrincipalExpanded = expandedSections[principalId] !== undefined ? expandedSections[principalId] : false;

          return (
            <Box key={index} sx={{ mb: 3 }}>
              <Paper variant="outlined" sx={{ p: 2}}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="h6" gutterBottom color="primary.main" sx={{ mb: 0 }}>
                    Equipo Principal: {item.principal?.nombre_del_producto || item.principal?.Descripcion || 'Principal sin nombre'}
                  </Typography>
                  <IconButton onClick={() => toggleSection(principalId)} size="small">
                    {isPrincipalExpanded ? <ExpandMoreIcon /> : <ChevronRightIcon />}
                  </IconButton>
                </Box>
                <Collapse in={isPrincipalExpanded}>
                  <RenderResultDetails 
                    detalle={detalle.resultadosCalculados?.[`principal-${item.principal?.codigo_producto}`]}
                    profileName={detalle.nombrePerfil}
                  />
                </Collapse>

                {item.opcionales && item.opcionales.length > 0 && (
                  <Box sx={{ mt: 2, pl: 1 }}>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium' }}>Opcionales:</Typography>
                    {item.opcionales.map((opcional: ProductoHistorialItem, opcIndex: number) => {
                      const opcionalId = `opcional-${opcional?.codigo_producto}-${index}-${opcIndex}`;
                      const isOpcionalExpanded = expandedSections[opcionalId] !== undefined ? expandedSections[opcionalId] : false;

                      return (
                        <Box key={opcIndex} sx={{mb:1, borderLeft: '3px solid #e0e0e0', pl:1.5, pt:1, pb:0.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Chip label={opcional?.nombre_del_producto || opcional?.Descripcion || 'Opcional sin nombre'} size="small" sx={{mb:0.5}}/>
                            <IconButton onClick={() => toggleSection(opcionalId)} size="small">
                              {isOpcionalExpanded ? <ExpandMoreIcon /> : <ChevronRightIcon />}
                            </IconButton>
                          </Box>
                          <Collapse in={isOpcionalExpanded}>
                            <RenderResultDetails 
                              detalle={detalle.resultadosCalculados?.[`opcional-${opcional?.codigo_producto}`]}
                              profileName={detalle.nombrePerfil}
                            />
                          </Collapse>
                        </Box>
                      );
                    })}
                  </Box>
                )}
              </Paper>
            </Box>
          );
        })}
        {(!detalle.itemsParaCotizar || detalle.itemsParaCotizar.length === 0) && <Alert severity="info">No hay items para mostrar en este cálculo.</Alert>}

      </Paper>
    </Container>
  );
};

export default HistorialDetallePage; 