import React, { useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Button, Box, Typography, Paper, Grid, Alert,
    TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Link
} from '@mui/material';
import { ArrowLeft, Download } from 'lucide-react';
import { CalculationResult } from '../types/calculoTypes';

// --- COPIED HELPERS & LABELS START ---

const formatCLP = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) return '--';
  const roundedValue = Math.round(value);
  return `$${roundedValue.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`; 
};

const formatGenericCurrency = (value: number | null | undefined, currency: 'USD' | 'EUR', digits = 2): string => {
  if (value === null || value === undefined || isNaN(value)) return '--';
  let numberPart = value.toLocaleString('es-ES', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  if (digits === 2 && numberPart.endsWith(',00')) {
    numberPart = numberPart.substring(0, numberPart.length - 3);
  }
  if (currency === 'EUR') {
    return `${numberPart} €`;
  } else { // USD
    return `$${numberPart}`;
  }
};

const formatPercentDisplay = (value: number | null | undefined, digits = 0): string => {
  if (value === null || value === undefined || isNaN(value)) return '--';
  return `${(value * 100).toFixed(digits)}%`;
};

const formatNumber = (value: number | null | undefined, digits = 2): string => {
    if (value === null || value === undefined || isNaN(value)) return '--';
    const roundedValue = (digits === 0) ? Math.round(value) : value; 
    const localeForFormatting = (digits === 0) ? 'es-CL' : 'es-ES';
    let formattedNumber = roundedValue.toLocaleString(localeForFormatting, { minimumFractionDigits: digits, maximumFractionDigits: digits });
    if (localeForFormatting === 'es-ES' && digits === 2 && formattedNumber.endsWith(',00')) {
        formattedNumber = formattedNumber.substring(0, formattedNumber.length - 3);
    }
    return formattedNumber;
};

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

const inputLabels: Record<string, string> = {
    anoCotizacion: "Año Cotización",
    anoEnCurso: "Año en Curso",
    costoFabricaOriginalEUR: "Costo Fábrica Original EUR",
    tipoCambioEurUsdActual: "TC EUR/USD Actual (Input)",
    tipoCambioUsdClpActual: "TC USD/CLP Actual (Input)",
    buffer_eur_usd_pct: "Buffer EUR/USD (Perfil)",
    descuento_fabrica_pct: "Descuento Fábrica (Perfil)",
    costo_logistica_origen_eur: "Costo Origen EUR (Perfil)",
    flete_maritimo_usd: "Flete Marítimo USD (Perfil)",
    recargos_destino_usd: "Recargos Destino USD (Perfil)",
    tasa_seguro_pct: "Tasa Seguro % (Perfil)",
    costo_agente_aduana_usd: "Costo Agente Aduana USD (Perfil)",
    gastos_portuarios_otros_usd: "Gastos Portuarios Otros USD (Perfil)",
    transporte_nacional_clp: "Transporte Nacional CLP (Perfil)",
    buffer_usd_clp_pct: "Buffer USD/CLP % (Perfil)",
    margen_adicional_pct: "Margen Adicional % (Perfil)",
    descuento_cliente_pct: "Descuento Cliente % (Perfil)",
    derecho_advalorem_pct: "Derecho AdValorem % (Perfil)",
    iva_pct: "IVA % (Perfil)"
};

const apiValuesLabels: Record<string, string> = {
    tipo_cambio_usd_clp_actual: "TC USD/CLP Actual (API)",
    tipo_cambio_eur_usd_actual: "TC EUR/USD Actual (API)",
};

const sectionLabels: Record<string, Record<string, string>> = {
    costo_producto: { sectionTitle: "Costo Producto", factorActualizacion: "Factor Actualización", costoFabricaActualizadoEUR: "Costo Fáb. Act. EUR (Antes Desc.)", costoFinalFabricaEUR_EXW: "Costo Fábrica Descontado EUR EXW", tipoCambioEurUsdAplicado: "TC EUR/USD Aplicado", costoFinalFabricaUSD_EXW: "Costo Final Fáb. USD (EXW)" },
    logistica_seguro: { sectionTitle: "Logística Seguro", costosOrigenUSD: "Costos en Origen (USD)", costoTotalFleteManejosUSD: "Costo Total Flete y Manejos (USD)", baseParaSeguroUSD: "Base para Seguro (CFR Aprox - USD)", primaSeguroUSD: "Prima Seguro (USD)", totalTransporteSeguroEXW_USD: "Total Transporte y Seguro EXW (USD)" },
    importacion: { sectionTitle: "Importación", valorCIF_USD: "Valor CIF (USD)", derechoAdvaloremUSD: "Derecho AdValorem (USD)", baseIvaImportacionUSD: "Base IVA Importación (USD)", ivaImportacionUSD: "IVA Importación (USD)", totalCostosImportacionDutyFeesUSD: "Total Costos Imp. (Duty+Fees) (USD)" },
    landed_cost: { sectionTitle: "Landed Cost", transporteNacionalUSD: "Transporte Nacional (USD)", precioNetoCompraBaseUSD_LandedCost: "Precio Neto Compra Base (USD) - Landed Cost" },
    conversion_margen: { sectionTitle: "Conversión y Margen", tipoCambioUsdClpAplicado: "Tipo Cambio USD/CLP Aplicado", precioNetoCompraBaseCLP: "Precio Neto Compra Base (CLP)", margenCLP: "Margen (CLP)", precioVentaNetoCLP: "Precio Venta Neto (CLP)", precioVentaNetoCLP_AntesDescCliente: "Precio Venta Neto (CLP) (Antes Desc. Cliente)" },
    precios_cliente: { sectionTitle: "Precios Cliente", descuentoClienteCLP: "Descuento Cliente (CLP)", precioNetoVentaFinalCLP: "Precio Neto Venta Final (CLP)", ivaVentaCLP: "IVA Venta (19%) (CLP)", precioVentaTotalClienteCLP: "Precio Venta Total Cliente (CLP)" }
};

const preciosClienteCLPKeys = [
    'descuentoclienteclp',
    'precionetoventafinalclp',
    'ivaventaclp',
    'precioventatotalclienteclp',
    'precio_lista_final_clp_iva_incl'
];

const formatValueForReport = (value: any, key: string, inputsForContext?: any): string => {
    const lowerKey = key.toLowerCase();
    if (typeof value === 'number') {
        if (lowerKey === 'anocotizacion' || lowerKey === 'anoencurso') return formatNumber(value, 0);
        if (lowerKey === 'tipocambioeurusdaplicado' || lowerKey === 'tipocambiousdclpaplicado') return formatNumber(value, 2); 
        if (preciosClienteCLPKeys.includes(lowerKey)) return formatCLP(value);
        if (lowerKey.endsWith('_clp') || lowerKey === 'clp') return formatCLP(value);
        else if (lowerKey.endsWith('_eur')) return formatGenericCurrency(value, 'EUR'); 
        else if (lowerKey.endsWith('_usd')) return formatGenericCurrency(value, 'USD'); 
        else if (lowerKey.includes('_pct') || lowerKey.startsWith('tasa_') || lowerKey.includes('factor') || lowerKey.includes('margen_adicional_pct') || lowerKey.includes('descuento_cliente_pct')) return formatPercentDisplay(value); 
        else if (lowerKey.includes('tipo_cambio') || lowerKey.includes('tipocambio')) return formatNumber(value, 6); 
        else return formatNumber(value, 2); 
    } else if (value === undefined && inputsForContext && inputsForContext[key] !== undefined) { 
        const inputValue = inputsForContext[key];
        if (typeof inputValue === 'number') {
            if (key.toLowerCase().includes('_clp')) return formatCLP(inputValue);
            else if (key.toLowerCase().endsWith('_eur')) return formatGenericCurrency(inputValue, 'EUR');
            else if (key.toLowerCase().endsWith('_usd')) return formatGenericCurrency(inputValue, 'USD');
            else if (key.toLowerCase().includes('_pct') || key.toLowerCase().startsWith('tasa_')) return formatPercentDisplay(inputValue/100);
            else return formatNumber(inputValue, 2);
        } else {
            return String(inputValue);
        }
    }
    return '--';
};

// --- COPIED HELPERS & LABELS END ---

export default function DocumentoHtmlPage() {
  const location = useLocation();
  const navigate = useNavigate();
  
  console.log('[DocumentoHtmlPage] location.state recibido:', location.state);

  const configuracion = location.state?.configuracion;
  const printRef = useRef<HTMLDivElement>(null);

  const handleExportPDF = async () => {
    if (!printRef.current) return;
    if (!(window as any).html2pdf) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = () => exportPDFInternal();
      document.body.appendChild(script);
    } else {
      exportPDFInternal();
    }
    function exportPDFInternal() {
      (window as any).html2pdf(printRef.current, {
        margin: 0.5,
        filename: pdfFileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
      });
    }
  };

  const handleGoBack = () => navigate('/equipos');

  if (!configuracion || !configuracion.lineasCalculadas) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h5" color="error">Error</Typography>
        <Typography sx={{mt:1}}>No se encontraron datos de configuración para generar el informe.</Typography>
        <Button onClick={() => navigate(-1)} sx={{mt:2}}>Volver</Button>
      </Box>
    );
  }

  const { nombrePerfilReporte, lineasCalculadas, fechaCreacion } = configuracion;
  const numeroDocumento = `configuracion-${new Date(fechaCreacion).getTime().toString(36)}`;
  
  // Actualizar el nombre del archivo PDF
  const pdfFileName = `informe_configuracion_${numeroDocumento}.pdf`;

  // Calcular la suma total
  let sumaTotalPreciosFinales = 0;
  if (lineasCalculadas) {
    lineasCalculadas.forEach((linea: any) => {
      // Sumar precio del principal
      const precioPrincipal = linea.detalleCalculoPrincipal?.calculados?.precios_cliente?.precioVentaTotalClienteCLP;
      if (typeof precioPrincipal === 'number') {
        sumaTotalPreciosFinales += precioPrincipal;
      }
      // Sumar precios de los opcionales
      if (linea.detallesCalculoOpcionales) {
        linea.detallesCalculoOpcionales.forEach((detalleOpcional: CalculationResult) => {
          const precioOpcional = detalleOpcional?.calculados?.precios_cliente?.precioVentaTotalClienteCLP;
          if (typeof precioOpcional === 'number') {
            sumaTotalPreciosFinales += precioOpcional;
          }
        });
      }
    });
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, backgroundColor: '#f4f6f8', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, px:1 }}>
        <Button variant="outlined" startIcon={<Download size={18} />} onClick={handleExportPDF} sx={{borderColor:'#1976d2', color:'#1976d2'}}>
          Exportar PDF
        </Button>
        <Button variant="outlined" startIcon={<ArrowLeft size={18} />} onClick={handleGoBack} sx={{borderColor:'#1976d2', color:'#1976d2'}}>
          Volver a Cálculos
        </Button>
      </Box>

      <Paper elevation={3} sx={{p: {xs: 2, md: 4}, maxWidth: '1000px', margin: '0 auto'}} ref={printRef}>
        {/* Encabezado del Informe */}
        <Typography variant="h3" component="h1" sx={{ color: '#1976d2', fontWeight: 'bold', textAlign: 'center', mb: 1}}>
          Informe de Configuración
        </Typography>
        <Typography variant="subtitle1" sx={{ textAlign: 'center', color: 'text.secondary', mb: 3}}>
          Número de documento: {numeroDocumento}
        </Typography>

        {/* Sección Emisor y Receptor (Placeholders) */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6}>
            <Paper elevation={0} sx={{p:2, backgroundColor:'#f9f9f9', border: '1px solid #e0e0e0'}}>
              <Typography variant="h6" gutterBottom sx={{fontWeight:'bold'}}>Emisor</Typography>
              <Typography variant="body2"><strong>Nombre:</strong> ADMIN</Typography>
              <Typography variant="body2"><strong>Área Comercial:</strong> Ecoalliance</Typography>
              <Typography variant="body2"><strong>Email:</strong> Ecoalliance33@gmail.com</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Paper elevation={0} sx={{p:2, backgroundColor:'#f9f9f9', border: '1px solid #e0e0e0'}}>
              <Typography variant="h6" gutterBottom sx={{fontWeight:'bold'}}>Receptor</Typography>
              <Typography variant="body2"><strong>Nombre:</strong> -</Typography>
              <Typography variant="body2"><strong>Área Comercial:</strong> -</Typography>
              <Typography variant="body2"><strong>Email:</strong> -</Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Comentarios Adicionales (Placeholder) */}
        <Typography variant="h6" sx={{fontWeight:'bold', mt:3}}>Comentarios Adicionales</Typography>
        <Paper elevation={0} sx={{p:2, backgroundColor:'#f9f9f9', border: '1px solid #e0e0e0', minHeight: '60px', mb:3}}>
          <Typography variant="body2">-</Typography>
        </Paper>

        {/* Resumen de Equipos Calculados */}
        <Typography variant="h5" component="h2" sx={{ color: '#1976d2', fontWeight: 'bold', mt: 4, mb: 2}}>
          Resumen de Equipos Calculados
        </Typography>
        <TableContainer component={Paper} elevation={1} sx={{border: '1px solid #e0e0e0'}}>
          <Table aria-label="resumen de equipos calculados">
            <TableHead sx={{backgroundColor: '#e3f2fd'}}>
              <TableRow>
                <TableCell sx={{fontWeight:'bold', color: '#0d47a1'}}>Artículo / Descripción</TableCell>
                <TableCell align="right" sx={{fontWeight:'bold', color: '#0d47a1'}}>Precio Final (IVA Incl.)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {lineasCalculadas.map((linea: any, index: number) => {
                const calculoPrincipal = linea.detalleCalculoPrincipal;
                const perfilPrincipal = capitalizeFirstLetter(calculoPrincipal?.profileName || nombrePerfilReporte || 'N/A');
                const precioPrincipal = calculoPrincipal?.calculados?.precios_cliente?.precioVentaTotalClienteCLP;

                return (
                  <React.Fragment key={`linea-${index}`}>
                    <TableRow sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                      <TableCell component="th" scope="row">
                        <Typography variant="subtitle1" sx={{fontWeight: 'bold'}}>
                          {linea.principal.nombre_del_producto || linea.principal.codigo_producto}
                        </Typography>
                        <Typography variant="caption" sx={{color: 'text.secondary'}}>
                          Perfil: {perfilPrincipal}
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{fontWeight: 'bold', fontSize: '1rem'}}>{formatCLP(precioPrincipal)}</TableCell>
                    </TableRow>
                    {/* Opcionales */}
                    {linea.opcionales && linea.opcionales.length > 0 && 
                     linea.detallesCalculoOpcionales && linea.detallesCalculoOpcionales.map((detalleOpcional: CalculationResult, opIndex: number) => {
                       const opcionalOriginal = linea.opcionales[opIndex];
                       const perfilOpcional = capitalizeFirstLetter(detalleOpcional?.profileName || nombrePerfilReporte || 'N/A');
                       const precioOpcional = detalleOpcional?.calculados?.precios_cliente?.precioVentaTotalClienteCLP;
                       return (
                         <TableRow key={`op-${index}-${opIndex}`} sx={{backgroundColor: '#fafafa'}}>
                           <TableCell sx={{pl:4, borderBottom: 'none'}}>
                            <Typography variant="body2" sx={{fontStyle:'italic'}}>
                                Opcional: {opcionalOriginal?.nombre_del_producto || opcionalOriginal?.codigo_producto}
                            </Typography>
                            <Typography variant="caption" sx={{color: 'text.secondary', display:'block'}}>
                                Perfil: {perfilOpcional}
                            </Typography>
                           </TableCell>
                           <TableCell align="right" sx={{fontStyle:'italic', borderBottom: 'none'}}>{formatCLP(precioOpcional)}</TableCell>
                         </TableRow>
                       );
                    })}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        
        {/* Suma Total */}
        <Typography variant="h6" sx={{fontWeight:'bold', mt:2, textAlign:'right', color: '#1976d2'}}>
            TOTAL GENERAL (IVA Incl.): {formatCLP(sumaTotalPreciosFinales)}
        </Typography>

        <Typography variant="body1" sx={{fontWeight:'bold', mt:1, textAlign:'right'}}>
            Total de equipos principales: {lineasCalculadas.length}
        </Typography>

        {/* Pie de Página */}
        <Typography variant="caption" display="block" sx={{textAlign: 'center', color: 'text.secondary', mt:5, mb:2}}>
            Informe generado automáticamente por el sistema MCS ERP
            <br/>
            © {new Date().getFullYear()} MCS ERP - Todos los derechos reservados
        </Typography>

      </Paper>
    </Box>
  );
} 