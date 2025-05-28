import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Button, CircularProgress, Container, TextField, Typography, Paper, Grid, Divider, TextareaAutosize } from '@mui/material';
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
      if (typeof value !== 'number' || isNaN(value)) return '-';
      return '$' + value.toLocaleString('es-CL', { minimumFractionDigits: 0 });
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
          h1 { color: #1976d2; margin-bottom: 8px; }
          h2 { color: #2196f3; margin-top: 32px; margin-bottom: 12px; }
          .section { margin-bottom: 32px; }
          .row { display: flex; gap: 32px; }
          .col { flex: 1; }
          .label { font-weight: 600; color: #555; margin-bottom: 2px; }
          .value { margin-bottom: 10px; }
          .box { background: #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
          .comentarios { background: #f8fafc; border-radius: 6px; padding: 12px; margin-top: 8px; }
          .footer { text-align: center; color: #888; margin-top: 40px; font-size: 0.95em; }
          table { width: 100%; border-collapse: collapse; margin-top: 18px; }
          th, td { padding: 10px 8px; border-bottom: 1px solid #e5e7eb; text-align: left; }
          th { background: #f3f4f6; color: #1976d2; font-size: 1.05em; }
          .opcional-row td { color: #555; padding-left: 32px; font-style: italic; }
          .precio { text-align: right; font-weight: 500; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Informe de Configuración</h1>
          <div style="margin-bottom:18px;font-size:1.1em;"><b>Número:</b> ${numeroDocumento}</div>
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
            <div style="margin-top: 10px; color: #555;">Total de equipos principales: ${calculosData.itemsParaCotizar.length}</div>
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
    return <Typography>Cargando datos de cálculo...</Typography>; // O un spinner más elegante
  }

  // Estilos básicos para el layout
  const mainPaperStyle: React.CSSProperties = { padding: '24px', margin: '20px 0' };
  const sectionTitleStyle: React.CSSProperties = { marginTop: '20px', marginBottom: '10px' };

  return (
    <Box sx={{ maxWidth: '1000px', margin: 'auto', padding: '20px' }}>
      <Paper elevation={3} sx={mainPaperStyle}>
        <Typography variant="h4" gutterBottom align="center">
          Configurar Datos
        </Typography>

        {/* SECCIÓN DATOS DEL EMISOR Y RECEPTOR */}
        <Typography variant="h6" sx={sectionTitleStyle}>Datos del Emisor y Receptor</Typography>
        <Grid container spacing={2}>
          {/* Emisor */}
          <Grid item xs={12} sm={6}>
            <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>Emisor</Typography>
              <TextField fullWidth label="Presupuesto Creado por" name="emisorNombre" value={formData.emisorNombre} onChange={handleChange} sx={{ mb: 2 }} />
              <TextField fullWidth label="Área Comercial" name="emisorAreaComercial" value={formData.emisorAreaComercial} onChange={handleChange} sx={{ mb: 2 }} />
              <TextField fullWidth label="Email Emisor" name="emisorEmail" type="email" value={formData.emisorEmail} onChange={handleChange} />
            </Paper>
          </Grid>
          {/* Receptor */}
          <Grid item xs={12} sm={6}>
            <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>Receptor</Typography>
              <TextField fullWidth label="Nombre del Cliente" name="receptorNombre" value={formData.receptorNombre} onChange={handleChange} sx={{ mb: 2 }} />
              <TextField fullWidth label="Área Comercial Cliente" name="receptorAreaComercial" value={formData.receptorAreaComercial} onChange={handleChange} sx={{ mb: 2 }} />
              <TextField fullWidth label="Email Cliente" name="receptorEmail" type="email" value={formData.receptorEmail} onChange={handleChange} />
            </Paper>
          </Grid>
        </Grid>

        {/* SECCIÓN COMENTARIOS Y CONDICIONES MODIFICADA */}
        <Typography variant="h6" sx={sectionTitleStyle}>Comentarios Adicionales</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextareaAutosize minRows={3} style={{ width: '100%', padding: '8px', borderColor: '#ccc', borderRadius: '4px' }} name="comentariosAdicionales" value={formData.comentariosAdicionales} onChange={handleChange} placeholder="Ingrese comentarios adicionales aquí..."/>
          </Grid>
        </Grid>

        {/* Resumen de Items (Solo para visualización, no editable aquí) */}
        <Typography variant="h6" sx={sectionTitleStyle}>Resumen de Equipos Calculados</Typography>
        {calculosData.itemsParaCotizar.map((item, index) => (
            <Box key={item.principal.codigo_producto || `item-${index}`} sx={{ mb: 2, p:1.5, border: '1px solid #eee', borderRadius: '4px'}}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                  {item.principal.nombre_del_producto || 'Equipo sin nombre'}
                </Typography>
                {item.opcionales && item.opcionales.length > 0 && (
                  <Box sx={{ pl: 2, mt: 0.5, fontSize: '0.9rem' }}>
                    <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>Opcionales:</Typography>
                    <ul style={{ margin: 0, paddingLeft: '20px' }}>
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
        <Typography variant="body2" color="textSecondary" sx={{mt:1}}>
            Total de equipos principales: {calculosData.itemsParaCotizar.length}
        </Typography>

        {/* Botones de Acción */}
        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
          <Button variant="outlined" startIcon={<ArrowLeft />} onClick={() => navigate('/resultados-calculo-costos', { state: calculosData })}>
            Volver a Resultados
          </Button>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <DownloadCloud />} 
            onClick={handleGenerarInforme}
            disabled={isLoading}
          >
            {isLoading ? 'Generando Informe...' : 'Generar Informe'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
} 