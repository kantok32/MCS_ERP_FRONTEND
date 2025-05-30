import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Button, CircularProgress, TextField, Typography, Paper, Grid, TextareaAutosize } from '@mui/material';
import { ArrowLeft, DownloadCloud } from 'lucide-react';
import { Producto } from '../types/product'; // Importar la interfaz Producto

// Tipos (Idealmente, algunos de estos vendrían de un archivo global de tipos)
interface ProductoConOpcionales { principal: Producto; opcionales: Producto[]; }
interface CalculationResult { inputs?: any; calculados?: any; error?: string; }
interface LocationStateFromPrevPage {
  itemsParaCotizar: ProductoConOpcionales[];
  resultadosCalculados: Record<string, CalculationResult>;
  selectedProfileId: string | null;
  nombrePerfil?: string;
  anoEnCursoGlobal: number;
  historialId?: string;
}

// Estado para los nuevos datos del formulario
interface CotizacionFormData {
  // Documento
  numeroCotizacion: string;
  referenciaDocumento: string; // Opcional
  fechaCreacion: string;
  fechaCaducidad: string;
  // Emisor (Vendedor)
  emisorNombre: string; // Nombre del creador del presupuesto
  emisorAreaComercial: string;
  emisorEmail: string; // Email del creador (asumo)
  // Receptor (Cliente)
  receptorNombre: string;
  receptorAreaComercial: string;
  receptorEmail: string;
  // Comentarios
  comentariosAdicionales: string;
}

// Estilos inspirados en EquipoEditModal
const pageBackgroundColor = '#F9FAFB'; // Gris muy claro para el fondo de la página
const paperBackgroundColor = '#FFFFFF'; // Blanco para el Paper principal
const primaryBlue = '#2563eb'; // Azul principal para acentos y títulos
const lightBlue = '#38bdf8'; // Azul claro para gradientes o botones secundarios
const inputBorderColor = '#CBD5E1'; // Borde para inputs
const inputBackgroundColor = '#F1F5F9'; // Fondo para inputs
const textColorPrimary = '#1F2937'; // Texto oscuro principal
const textColorSecondary = '#4B5563'; // Texto secundario/labels

export default function ConfiguracionPanel() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [calculosData, setCalculosData] = useState<LocationStateFromPrevPage | null>(null);
  const [historialId, setHistorialId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CotizacionFormData>({
    numeroCotizacion: '', // Podría ser generado o sugerido
    referenciaDocumento: '',
    fechaCreacion: new Date().toISOString().split('T')[0],
    fechaCaducidad: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0], // Default a 30 días
    emisorNombre: 'ADMIN', // <--- VALOR POR DEFECTO
    emisorAreaComercial: 'Ecoalliance', // <--- VALOR POR DEFECTO
    emisorEmail: 'Ecoalliance33@gmail.com', // <--- VALOR POR DEFECTO
    receptorNombre: '',
    receptorAreaComercial: '',
    receptorEmail: '',
    comentariosAdicionales: '',
  });

  useEffect(() => {
    if (location.state) {
      setCalculosData(location.state as LocationStateFromPrevPage);
      setHistorialId(location.state.historialId || null);
      // Podríamos pre-rellenar numeroCotizacion aquí si tenemos una lógica para ello
      // setFormData(prev => ({ ...prev, numeroCotizacion: `COT-${Date.now()}` }));
    } else {
      // Manejar el caso donde no hay estado (ej. el usuario navega directamente a esta URL)
      alert('No se encontraron datos de cálculo. Por favor, inicie desde la selección de equipos.');
      navigate('/'); // O a la página de inicio de cálculos
    }
  }, [location, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGenerarInforme = () => {
    if (!calculosData) {
      alert('Faltan los datos de cálculo base.');
      return;
    }
    // Helper para formatear CLP
    function formatCLP(value: number | null | undefined) {
      if (value === null || value === undefined || isNaN(value)) return '--';
      const roundedValue = Math.round(value);
      return `$${roundedValue.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
    // Generar el HTML usando los datos del formulario y los equipos
    const numeroDocumento = historialId ? `${historialId}` : '-';
    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Informe de Configuración</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; color: #222; margin: 0; padding: 0; }
          .container { max-width: 900px; margin: 40px auto; background: #fff; border-radius: 10px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); padding: 32px; }
          h1 { color: ${primaryBlue}; margin-bottom: 8px; }
          h2 { color: ${primaryBlue}; margin-top: 32px; margin-bottom: 12px; }
          .section { margin-bottom: 32px; }
          .row { display: flex; gap: 32px; }
          .col { flex: 1; }
          .label { font-weight: 600; color: ${textColorSecondary}; margin-bottom: 2px; }
          .value { margin-bottom: 10px; color: ${textColorPrimary};}
          .box { background: ${inputBackgroundColor}; border-radius: 8px; padding: 16px; margin-bottom: 16px; border: 1px solid ${inputBorderColor}; }
          .comentarios { background: ${inputBackgroundColor}; border: 1px solid ${inputBorderColor}; border-radius: 6px; padding: 12px; margin-top: 8px; color: ${textColorPrimary}; }
          .footer { text-align: center; color: #888; margin-top: 40px; font-size: 0.95em; }
          table { width: 100%; border-collapse: collapse; margin-top: 18px; }
          th, td { padding: 10px 8px; border-bottom: 1px solid #e5e7eb; text-align: left; color: ${textColorPrimary}; }
          th { background: ${inputBackgroundColor}; color: ${primaryBlue}; font-size: 1.05em; }
          .opcional-row td { color: ${textColorSecondary}; padding-left: 32px; font-style: italic; }
          .precio { text-align: right; font-weight: 500; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Informe de Configuración</h1>
          <div style="margin-bottom:18px;font-size:1.1em; color: ${textColorPrimary};"><b>Número:</b> ${numeroDocumento}</div>
          <div class="section row">
            <div class="col box">
              <div class="label">Emisor</div>
              <div class="value"><b>Nombre:</b> ${formData.emisorNombre || '-'}</div>
              <div class="value"><b>Área Comercial:</b> ${formData.emisorAreaComercial || '-'}</div>
              <div class="value"><b>Email:</b> ${formData.emisorEmail || '-'}</div>
            </div>
            <div class="col box">
              <div class="label">Receptor</div>
              <div class="value"><b>Nombre:</b> ${formData.receptorNombre || '-'}</div>
              <div class="value"><b>Área Comercial:</b> ${formData.receptorAreaComercial || '-'}</div>
              <div class="value"><b>Email:</b> ${formData.receptorEmail || '-'}</div>
            </div>
          </div>
          <div class="section">
            <div class="label">Comentarios Adicionales</div>
            <div class="comentarios">${formData.comentariosAdicionales ? formData.comentariosAdicionales.replace(/\n/g, '<br>') : '-'}</div>
          </div>
          <div class="section">
            <h2>Resumen de Equipos Calculados</h2>
            <table>
              <thead>
                <tr>
                  <th>Artículo / Descripción</th>
                  <th class="precio">Precio Final</th>
                </tr>
              </thead>
              <tbody>
                ${calculosData.itemsParaCotizar.map((item, idx) => {
                  const keyPrincipal = `principal-${item.principal.codigo_producto || idx}`;
                  const principalCalc = calculosData.resultadosCalculados?.[keyPrincipal];
                  const precioPrincipal = principalCalc?.calculados?.precios_cliente?.precioVentaTotalClienteCLP;
                  let opcionalesHtml = '';
                  if (item.opcionales && item.opcionales.length > 0) {
                    opcionalesHtml = item.opcionales.map((opc, opIdx) => {
                      const keyOpc = `opcional-${opc.codigo_producto || opIdx}`;
                      const opcCalc = calculosData.resultadosCalculados?.[keyOpc];
                      const precioOpc = opcCalc?.calculados?.precios_cliente?.precioVentaTotalClienteCLP;
                      return `
                        <tr class='opcional-row'><td>${opc.nombre_del_producto || 'Opcional sin nombre'}</td><td class='precio'>${formatCLP(precioOpc)}</td></tr>
                      `;
                    }).join('');
                  }
                  return `
                    <tr><td><b>${item.principal.nombre_del_producto || 'Equipo sin nombre'}</b></td><td class='precio'>${formatCLP(precioPrincipal)}</td></tr>
                    ${opcionalesHtml}
                  `;
                }).join('')}
              </tbody>
            </table>
            <div style="margin-top: 10px; color: ${textColorSecondary};">Total de equipos principales: ${calculosData.itemsParaCotizar.length}</div>
          </div>
          <div class="footer">
            Informe generado automáticamente por el sistema MCS ERP<br>
            &copy; ${new Date().getFullYear()} MCS ERP - Todos los derechos reservados
          </div>
        </div>
      </body>
      </html>
    `;
    navigate('/documento_html', { state: { html, pdfFileName: `${numeroDocumento}.pdf` } });
  };

  if (!calculosData) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: pageBackgroundColor }}><CircularProgress /></Box>;
  }

  const textFieldStyles = {
    '& .MuiOutlinedInput-root': {
      backgroundColor: inputBackgroundColor,
      '& fieldset': {
        borderColor: inputBorderColor,
      },
      '&:hover fieldset': {
        borderColor: primaryBlue,
      },
      '&.Mui-focused fieldset': {
        borderColor: primaryBlue,
        borderWidth: '1.5px',
      },
    },
    '& .MuiInputLabel-root': {
      color: textColorSecondary,
    },
    '& .MuiInputLabel-root.Mui-focused': {
      color: primaryBlue,
    },
    '& .MuiInputBase-input': {
      color: textColorPrimary,
    }
  };
  
  const textAreaStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderColor: inputBorderColor,
    borderRadius: '4px',
    backgroundColor: inputBackgroundColor,
    color: textColorPrimary,
    fontFamily: 'inherit',
    fontSize: '1rem',
    boxSizing: 'border-box',
  };

  return (
    <Box sx={{ maxWidth: '1000px', margin: 'auto', padding: '20px', backgroundColor: pageBackgroundColor, color: textColorPrimary }}>
      <Paper elevation={3} sx={{ padding: {xs: '20px', md: '32px'}, margin: '20px 0', backgroundColor: paperBackgroundColor, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <Typography variant="h4" gutterBottom align="center" sx={{ color: primaryBlue, fontWeight: 600, mb: 4 }}>
          Configurar Datos del Informe
        </Typography>

        <Typography variant="h6" sx={{ color: primaryBlue, mt: 3, mb: 2, borderBottom: `1.5px solid ${inputBorderColor}`, pb: 1 }}>
          Datos del Emisor y Receptor
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <Paper variant="outlined" sx={{ p: 2.5, height: '100%', borderColor: inputBorderColor, backgroundColor: paperBackgroundColor }}>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 500, color: textColorSecondary }}>Emisor</Typography>
              <TextField fullWidth label="Presupuesto Creado por" name="emisorNombre" value={formData.emisorNombre} onChange={handleChange} sx={{ ...textFieldStyles, mb: 2 }} />
              <TextField fullWidth label="Área Comercial" name="emisorAreaComercial" value={formData.emisorAreaComercial} onChange={handleChange} sx={{ ...textFieldStyles, mb: 2 }} />
              <TextField fullWidth label="Email Emisor" name="emisorEmail" type="email" value={formData.emisorEmail} onChange={handleChange} sx={textFieldStyles} />
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Paper variant="outlined" sx={{ p: 2.5, height: '100%', borderColor: inputBorderColor, backgroundColor: paperBackgroundColor }}>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 500, color: textColorSecondary }}>Receptor</Typography>
              <TextField fullWidth label="Nombre del Cliente" name="receptorNombre" value={formData.receptorNombre} onChange={handleChange} sx={{ ...textFieldStyles, mb: 2 }} />
              <TextField fullWidth label="Área Comercial Cliente" name="receptorAreaComercial" value={formData.receptorAreaComercial} onChange={handleChange} sx={{ ...textFieldStyles, mb: 2 }} />
              <TextField fullWidth label="Email Cliente" name="receptorEmail" type="email" value={formData.receptorEmail} onChange={handleChange} sx={textFieldStyles} />
            </Paper>
          </Grid>
        </Grid>

        <Typography variant="h6" sx={{ color: primaryBlue, mt: 4, mb: 2, borderBottom: `1.5px solid ${inputBorderColor}`, pb: 1 }}>
          Comentarios Adicionales
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextareaAutosize 
                minRows={4}
                style={textAreaStyle}
                name="comentariosAdicionales" 
                value={formData.comentariosAdicionales} 
                onChange={handleChange} 
                placeholder="Ingrese comentarios adicionales aquí..."
            />
          </Grid>
        </Grid>

        <Typography variant="h6" sx={{ color: primaryBlue, mt: 4, mb: 2, borderBottom: `1.5px solid ${inputBorderColor}`, pb: 1 }}>
          Resumen de Equipos Calculados
        </Typography>
        {calculosData.itemsParaCotizar.map((item, index) => (
            <Box key={item.principal.codigo_producto || `item-${index}`} sx={{ mb: 2, p:1.5, border: `1px solid ${inputBorderColor}`, borderRadius: '6px', backgroundColor: inputBackgroundColor}}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: textColorPrimary }}>
                  {item.principal.nombre_del_producto || 'Equipo sin nombre'}
                </Typography>
                {item.opcionales && item.opcionales.length > 0 && (
                  <Box sx={{ pl: 2, mt: 0.5, fontSize: '0.9rem' }}>
                    <Typography variant="body2" sx={{ fontStyle: 'italic', color: textColorSecondary }}>Opcionales:</Typography>
                    <ul style={{ margin: 0, paddingLeft: '20px', color: textColorSecondary }}>
                      {item.opcionales.map((opcional, opIndex) => (
                        <li key={opcional.codigo_producto || `op-${index}-${opIndex}`}>
                          {opcional.nombre_del_producto || 'Opcional sin nombre'}
                        </li>
                      ))}
                    </ul>
                  </Box>
                )}
            </Box>
        ))}
        <Typography variant="body2" sx={{color: textColorSecondary, mt:1}}>
            Total de equipos principales: {calculosData.itemsParaCotizar.length}
        </Typography>

        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button 
            variant="outlined" 
            startIcon={<ArrowLeft />} 
            onClick={() => navigate('/resultados-calculo-costos', { state: calculosData })}
            sx={{ 
              color: textColorSecondary, 
              borderColor: inputBorderColor,
              '&:hover': {
                backgroundColor: inputBackgroundColor,
                borderColor: textColorSecondary,
              }
            }}
          >
            Volver a Resultados
          </Button>
          <Button 
            variant="contained" 
            startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <DownloadCloud />} 
            onClick={handleGenerarInforme}
            disabled={isLoading}
            sx={{ 
              backgroundColor: primaryBlue, 
              color: paperBackgroundColor, // Usar el blanco del papel para el texto
              '&:hover': {
                backgroundColor: lightBlue, // Un azul un poco más claro al pasar el mouse
              },
              padding: '10px 20px',
              fontWeight: 600,
            }}
          >
            {isLoading ? 'Generando Informe...' : 'Generar Informe'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
} 