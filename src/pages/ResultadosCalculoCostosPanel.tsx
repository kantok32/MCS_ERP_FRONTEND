import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2, AlertTriangle, ArrowLeft, ArrowRight, ChevronDown, ChevronUp, Calculator, ListTree, DollarSign, CloudOff, FileText, Save } from 'lucide-react';
import {
  Button, Typography, Paper, Box, Container, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, List, ListItem, ListItemText,
  Select, MenuItem, FormControl, InputLabel, CircularProgress, SelectChangeEvent,
  Accordion, AccordionSummary, AccordionDetails, Grid
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { getPerfiles } from '../services/perfilService';
import { guardarCalculoHistorial, CotizacionDetails } from '../services/calculoHistorialService';
import {
    ProductoConOpcionales,
    CalculationResult,
    LocationState,
    LineaDeTrabajoConCosto
} from '../types/calculoTypes';
import { CostoPerfilData } from '../types';
import { Producto } from '../types/product';

// --- Tipos (deberían idealmente importarse de un archivo types.ts común si no lo están ya) ---
interface DatosContables {
    costo_fabrica?: number;
    divisa_costo?: string;
    fecha_cotizacion?: string;
    [key: string]: any;
}

interface GroupedPruebaResults {
    costo_producto: Record<string, number | undefined>;
    logistica_seguro: Record<string, number | undefined>;
    importacion: Record<string, number | undefined>;
    landed_cost: Record<string, number | undefined>;
    conversion_margen: Record<string, number | undefined>;
    precios_cliente: Record<string, number | undefined>;
    // Idealmente, cada sub-objeto tendría tipos más específicos
}

// --- Helpers de Formato (Similares a PerfilesPanel.tsx) ---
const formatCurrency = (value: number | null | undefined, currencySymbol: string = '€') => {
  if (value === null || value === undefined || isNaN(value)) return 'N/A';
  return `${currencySymbol}${value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatCLP = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) return '--';
  let numberPart = value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (numberPart.endsWith(',00')) {
    numberPart = numberPart.substring(0, numberPart.length - 3);
  }
  return `$ ${numberPart}`; 
};

const formatGenericCurrency = (value: number | null | undefined, currency: 'USD' | 'EUR', digits = 2): string => {
  if (value === null || value === undefined || isNaN(value)) return '--';
  
  let numberPart = value.toLocaleString('es-ES', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  // Apply stripping rule if digits is 2 (default for currencies)
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
    let formattedNumber = value.toLocaleString('es-ES', { minimumFractionDigits: digits, maximumFractionDigits: digits });
    // If digits is 2 (common case for this rule) and formatted number ends with ',00', strip it.
    if (digits === 2 && formattedNumber.endsWith(',00')) {
        formattedNumber = formattedNumber.substring(0, formattedNumber.length - 3);
    }
    return formattedNumber;
};

// Helper function to split camelCase/PascalCase and capitalize
const splitAndCapitalizeKey = (key: string): string => {
  if (!key) return key;
  const spacedKey = key.replace(/_/g, ' ')
                       .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
                       .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2');
  return spacedKey.charAt(0).toUpperCase() + spacedKey.slice(1);
};

// Helper function to capitalize the first letter of a string
const capitalizeFirstLetter = (str: string): string => {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// --- Labels para los campos (para que coincidan con tu ejemplo) ---
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
    costo_producto: {
        sectionTitle: "Costo Producto",
        factorActualizacion: "Factor Actualización",
        costoFabricaActualizadoEUR: "Costo Fáb. Act. EUR (Antes Desc.)",
        costoFinalFabricaEUR_EXW: "Costo Fábrica Descontado EUR EXW",
        tipoCambioEurUsdAplicado: "TC EUR/USD Aplicado",
        costoFinalFabricaUSD_EXW: "Costo Final Fáb. USD (EXW)"
    },
    logistica_seguro: {
        sectionTitle: "Logística Seguro",
        costosOrigenUSD: "Costos en Origen (USD)",
        costoTotalFleteManejosUSD: "Costo Total Flete y Manejos (USD)",
        baseParaSeguroUSD: "Base para Seguro (CFR Aprox - USD)",
        primaSeguroUSD: "Prima Seguro (USD)",
        totalTransporteSeguroEXW_USD: "Total Transporte y Seguro EXW (USD)"
    },
    importacion: {
        valorCIF_USD: "Valor CIF (USD)",
        derechoAdvaloremUSD: "Derecho AdValorem (USD)",
        baseIvaImportacionUSD: "Base IVA Importación (USD)",
        ivaImportacionUSD: "IVA Importación (USD)",
        totalCostosImportacionDutyFeesUSD: "Total Costos Imp. (Duty+Fees) (USD)"
    },
    landed_cost: {
        transporteNacionalUSD: "Transporte Nacional (USD)",
        precioNetoCompraBaseUSD_LandedCost: "Precio Neto Compra Base (USD) - Landed Cost"
    },
    conversion_margen: {
        tipoCambioUsdClpAplicado: "Tipo Cambio USD/CLP Aplicado",
        precioNetoCompraBaseCLP: "Precio Neto Compra Base (CLP)",
        margenCLP: "Margen (CLP)",
        precioVentaNetoCLP: "Precio Venta Neto (CLP)",
        precioVentaNetoCLP_AntesDescCliente: "Precio Venta Neto (CLP) (Antes Desc. Cliente)"
    },
    precios_cliente: {
        descuentoClienteCLP: "Descuento Cliente (CLP)",
        precioNetoVentaFinalCLP: "Precio Neto Venta Final (CLP)",
        ivaVentaCLP: "IVA Venta (19%) (CLP)",
        precioVentaTotalClienteCLP: "Precio Venta Total Cliente (CLP)"
    }
};

const RenderResultDetails: React.FC<{ detalle: CalculationResult | null, profile: CostoPerfilData | null }> = ({ detalle, profile }) => {
    if (!detalle) {
        return <Typography variant="body2" color="textSecondary">Seleccione un perfil para ver el cálculo detallado.</Typography>;
    }
    if (detalle.error) {
        return <Alert severity="error">Error en el cálculo: {detalle.error}</Alert>;
    }
    const profileNameFromCalc = detalle.profileName;
    const currentProfileName = profile?.nombre_perfil;
    const displayProfileName = currentProfileName || profileNameFromCalc || "Perfil Desconocido";
    const displayProfileId = profile?._id || "ID Desconocido"; 
    const inputs = detalle.inputs;
    const calculados = detalle.calculados;
    if (!inputs || !calculados) {
        return <Alert severity="warning">Datos del cálculo detallado incompletos o en formato inesperado.</Alert>;
    }

    const preciosClienteCLPKeys = [
        'descuentoclienteclp',
        'precionetoventafinalclp',
        'ivaventaclp',
        'precioventatotalclienteclp',
        'precio_lista_final_clp_iva_incl' // Adding this key from the consolidated display too
    ];

    const formatValue = (value: any, key: string): string => {
        const lowerKey = key.toLowerCase();
        if (typeof value === 'number') {
            if (lowerKey === 'anocotizacion' || lowerKey === 'anoencurso') return formatNumber(value, 0);
            if (lowerKey === 'tipocambioeurusdaplicado' || lowerKey === 'tipocambiousdclpaplicado') return formatNumber(value, 2); 
            
            // Specific formatting for Precios Cliente CLP fields
            if (preciosClienteCLPKeys.includes(lowerKey)) {
                return `$ ${formatNumber(value, 0)}`;
            }
            
            // Check for general CLP fields (must end with _clp or be exactly 'clp' for safety, and not be special keys handled above)
            if (lowerKey.endsWith('_clp') || lowerKey === 'clp') return formatCLP(value);
            else if (lowerKey.endsWith('_eur')) return formatGenericCurrency(value, 'EUR'); 
            else if (lowerKey.endsWith('_usd')) return formatGenericCurrency(value, 'USD'); 
            else if (lowerKey.includes('_pct') || lowerKey.startsWith('tasa_') || lowerKey.includes('factor') || lowerKey.includes('margen_adicional_pct') || lowerKey.includes('descuento_cliente_pct')) return formatPercentDisplay(value); 
            else if (lowerKey.includes('tipo_cambio') || lowerKey.includes('tipocambio')) return formatNumber(value, 6); 
            else return formatNumber(value, 2); 
        } else if (value === undefined && inputs && inputs[key] !== undefined) { 
            const inputValue = inputs[key];
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

    return (
        <Box sx={{ mt: 2, p: 2, border: '1px dashed grey' }}>
            <Typography variant="h6" gutterBottom>
                Detalle del Cálculo (Perfil: {displayProfileName} - ID: {displayProfileId})
            </Typography>

            <Accordion sx={{ mb: 1 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography sx={{ width: '40%', flexShrink: 0, fontWeight: 'medium' }}>Parámetros del Perfil Aplicado</Typography>
                    <Typography sx={{ color: 'text.secondary' }}>Valores</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <Grid container spacing={1}>
                        {profile && (
                            <>
                                {Object.entries(profile).map(([key, value]) => {
                                    if (key === '_id' || key === 'nombre_perfil' || key === 'descripcion_perfil' || key === 'createdAt' || key === 'updatedAt' || key === '__v' || key === 'activo') {
                                        return null;
                                    }
                                    const displayValue = key.endsWith('_pct') ? formatPercentDisplay(Number(value)) : formatValue(value, key);
                                    return (
                                        <React.Fragment key={`profile-param-${key}`}>
                                            <Grid item xs={6}><Typography variant="body2" color="text.secondary"><em>{inputLabels[key] || key}:</em></Typography></Grid>
                                            <Grid item xs={6}><Typography variant="body2" color="text.secondary">{displayValue}</Typography></Grid>
                                        </React.Fragment>
                                    );
                                })}
                            </>
                        )}
                        {inputs && (
                            <>
                                {inputs.anoCotizacion !== undefined && (
                                    <React.Fragment key="input-anoCotizacion">
                                        <Grid item xs={6}><Typography variant="body2" color="text.secondary"><em>{inputLabels.anoCotizacion || 'Año Cotización'}:</em></Typography></Grid>
                                        <Grid item xs={6}><Typography variant="body2" color="text.secondary">{formatValue(inputs.anoCotizacion, 'anoCotizacion')}</Typography></Grid>
                                    </React.Fragment>
                                )}
                                {inputs.anoEnCurso !== undefined && (
                                    <React.Fragment key="input-anoEnCurso">
                                        <Grid item xs={6}><Typography variant="body2" color="text.secondary"><em>{inputLabels.anoEnCurso || 'Año en Curso'}:</em></Typography></Grid>
                                        <Grid item xs={6}><Typography variant="body2" color="text.secondary">{formatValue(inputs.anoEnCurso, 'anoEnCurso')}</Typography></Grid>
                                    </React.Fragment>
                                )}
                                {inputs.costoFabricaOriginalEUR !== undefined && (
                                    <React.Fragment key="input-costoFabricaOriginalEUR">
                                        <Grid item xs={6}><Typography variant="body2" color="text.secondary"><em>{inputLabels.costoFabricaOriginalEUR || 'Costo Fábrica Original EUR'}:</em></Typography></Grid>
                                        <Grid item xs={6}><Typography variant="body2" color="text.secondary">{formatValue(inputs.costoFabricaOriginalEUR, 'costoFabricaOriginalEUR')}</Typography></Grid>
                                    </React.Fragment>
                                )}
                            </>
                        )}
                    </Grid>
                </AccordionDetails>
            </Accordion>

            {Object.entries(calculados).map(([stageName, stageValues]) => (
                <Accordion key={stageName} sx={{ mb: 1 }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography sx={{ width: '40%', flexShrink: 0, fontWeight: 'medium' }}>
                            {sectionLabels[stageName]?.sectionTitle || splitAndCapitalizeKey(stageName)}
                        </Typography>
                        {stageName === "PRECIOS_CLIENTE" && stageValues.precio_lista_final_clp_iva_incl && (
                             <Typography sx={{ color: 'text.secondary' }}>
                                Precio Lista Final: {formatValue(stageValues.precio_lista_final_clp_iva_incl, 'precio_lista_final_clp_iva_incl')}
                            </Typography>
                        )}
                    </AccordionSummary>
                    <AccordionDetails>
                        <Grid container spacing={1}>
                            {Object.entries(stageValues).map(([key, value]) => (
                                <React.Fragment key={`${stageName}-${key}`}>
                                    <Grid item xs={6}><Typography variant="body2"><em>
                                        {sectionLabels[stageName]?.[key] || apiValuesLabels[key] || splitAndCapitalizeKey(key)}:
                                    </em></Typography></Grid>
                                    <Grid item xs={6}><Typography variant="body2">{formatValue(value, key)}</Typography></Grid>
                                </React.Fragment>
                            ))}
                        </Grid>
                    </AccordionDetails>
                </Accordion>
            ))}

        </Box>
    );
};

const fetchCalculoDetallado = async (
  producto: Producto,
  _costoFabricaOriginalEUR: number,
  _fechaCotizacionStr: string | Date | undefined,
  profileId: string,
  anoEnCurso: number,
  tcEurUsd: number,
  nombrePerfil: string,
  perfilesList: CostoPerfilData[]
): Promise<CalculationResult> => {
  let costoFabricaOriginalEUR = producto.datos_contables?.costo_fabrica;
  if (costoFabricaOriginalEUR === undefined || costoFabricaOriginalEUR === null) {
    costoFabricaOriginalEUR = (producto as any).costo_fabrica;
  }
  if (costoFabricaOriginalEUR === undefined || costoFabricaOriginalEUR === null) {
    console.warn('[fetchCalculoDetallado] costo_fabrica no encontrado para producto', producto);
    costoFabricaOriginalEUR = 0;
  }
  let fechaCotizacionStr = producto.datos_contables?.fecha_cotizacion;
  if (!fechaCotizacionStr) {
    fechaCotizacionStr = (producto as any).fecha_cotizacion;
  }
  let codigo_producto = producto.codigo_producto || (producto as any).Codigo_Producto;
  if (!codigo_producto) {
    console.warn('[fetchCalculoDetallado] codigo_producto no encontrado para producto', producto);
    codigo_producto = '';
  }
  let parsedYear: number | undefined;
  if (fechaCotizacionStr && /^\d{4}$/.test(fechaCotizacionStr as string)) {
    parsedYear = parseInt(fechaCotizacionStr as string, 10);
  } else if (fechaCotizacionStr) {
    const dateObj = new Date(fechaCotizacionStr as string);
    if (dateObj instanceof Date && !isNaN(dateObj.valueOf()) && !isNaN(dateObj.getFullYear())) {
      parsedYear = dateObj.getFullYear();
    } else {
        console.warn(`[fetchCalculoDetallado] fechaCotizacionStr "${fechaCotizacionStr}" no pudo ser parseada a una fecha válida.`);
    }
  }
  const anoCotizacion = parsedYear !== undefined ? parsedYear : anoEnCurso - 1;

  const perfilActual = perfilesList.find(p => p._id === profileId);
  if (!perfilActual) {
    console.error('[fetchCalculoDetallado] No se encontró el perfil con ID:', profileId);
    throw new Error('Perfil no encontrado');
  }

  const payload = {
    profileId: profileId,
    anoCotizacion: anoCotizacion, 
    anoEnCurso: anoEnCurso,
    costoFabricaOriginalEUR: costoFabricaOriginalEUR,
    tipoCambioEurUsdActual: tcEurUsd,
    codigo_producto: codigo_producto,
    tasa_seguro_pct: perfilActual.tasa_seguro_pct,
  };

  const API_BASE_URL = 'https://mcs-erp-backend-807184488368.southamerica-west1.run.app/api';
  const CALCULATION_ENDPOINT = `${API_BASE_URL}/costo-perfiles/calcular-producto`;
  console.log('[ResultadosCalculoCostosPanel] Enviando payload a calcular-producto:', payload);
  try {
    const response = await fetch(CALCULATION_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      console.error('[ResultadosCalculoCostosPanel] Error API:', data);
      throw new Error(data.message || `Error ${response.status} al calcular costos.`);
    }
    if (data && data.resultado && data.resultado.inputs && data.resultado.calculados) {
      return {
        inputs: data.resultado.inputs,
        calculados: data.resultado.calculados,
        profileName: data.perfilUsado?.nombre_perfil || data.perfilUsado?.nombre || nombrePerfil, 
      };
    } else {
      console.error('[ResultadosCalculoCostosPanel] Respuesta API inesperada:', data);
      throw new Error('La respuesta del servidor no tiene el formato esperado.');
    }
  } catch (error: any) {
    console.error('[ResultadosCalculoCostosPanel] Catch Fetch Error:', error);
    return {
      error: error.message || 'Error de conexión o al procesar la respuesta del cálculo.',
      profileName: nombrePerfil,
    };
  }
};

function transformarLineasParaConfiguracion(lineas: LineaDeTrabajoConCosto[], nombrePerfilFallback?: string): Record<string, CalculationResult> {
  const resultados: Record<string, CalculationResult> = {};
  lineas.forEach(linea => {
    const keyPrincipal = `principal-${linea.principal.codigo_producto || `P_ID_DESCONOCIDO_${Math.random().toString(36).substring(7)}`}`;
    const fallbackProfileNamePrincipal = linea.detalleCalculoPrincipal?.profileName || nombrePerfilFallback;
    resultados[keyPrincipal] = linea.detalleCalculoPrincipal || { 
      error: "Detalle de cálculo principal no disponible.", 
      profileName: typeof fallbackProfileNamePrincipal === 'string' ? fallbackProfileNamePrincipal : "Perfil no especificado"
    };

    linea.opcionales.forEach((opcional, idx) => {
      const keyOpcional = `opcional-${opcional.codigo_producto || `O_ID_DESCONOCIDO_${idx}_${Math.random().toString(36).substring(7)}`}`;
      const detalleOpcional = linea.detallesCalculoOpcionales?.[idx];
      const fallbackProfileNameOpcional = detalleOpcional?.profileName || nombrePerfilFallback;
      resultados[keyOpcional] = detalleOpcional || { 
        error: `Detalle de cálculo para opcional ${opcional.nombre_del_producto || idx+1} no disponible.`, 
        profileName: typeof fallbackProfileNameOpcional === 'string' ? fallbackProfileNameOpcional : "Perfil no especificado"
      };
    });
  });
  return resultados;
}

export default function ResultadosCalculoCostosPanel() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | null;

  const [lineasCalculadas, setLineasCalculadas] = useState<LineaDeTrabajoConCosto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [savedCalculoId, setSavedCalculoId] = useState<string | null>(null);
  const [latestCalculatedResults, setLatestCalculatedResults] = useState<Record<string, CalculationResult> | null>(null);
  const [tipoCambioEurUsd, setTipoCambioEurUsd] = useState<number | null>(null);
  const [isLoadingTipoCambio, setIsLoadingTipoCambio] = useState(false);

  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [perfilesList, setPerfilesList] = useState<CostoPerfilData[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>(state?.selectedProfileId || '');
  const [currentProfileData, setCurrentProfileData] = useState<CostoPerfilData | null>(null);
  const [isProfilesLoading, setIsProfilesLoading] = useState<boolean>(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  const anoActualGlobal = new Date().getFullYear();

  const cargarPerfilesDesdeAPI = async () => {
    setIsProfilesLoading(true);
    setProfileError(null);
    try {
      console.log("[ResultadosCalculoCostosPanel] Iniciando carga de perfiles...");
      const data = await getPerfiles();
      console.log("[ResultadosCalculoCostosPanel] Perfiles cargados:", data);

      if (!data || data.length === 0) {
        setProfileError("No se encontraron perfiles de costo. Por favor, cree un perfil primero.");
        setPerfilesList([]);
        return;
      }

      setPerfilesList(data);
      
      let initialProfileIdToSelect = state?.selectedProfileId || '';
      if (!initialProfileIdToSelect && data && data.length > 0) {
        initialProfileIdToSelect = data[0]._id;
      }
      
      if (initialProfileIdToSelect) {
        const perfilPreseleccionado = data.find((p: CostoPerfilData) => p._id === initialProfileIdToSelect);
        if (perfilPreseleccionado) {
          console.log("[ResultadosCalculoCostosPanel] Perfil preseleccionado encontrado:", perfilPreseleccionado);
          setCurrentProfileData(perfilPreseleccionado);
          setSelectedProfileId(initialProfileIdToSelect);
        } else if (data && data.length > 0) {
          console.log("[ResultadosCalculoCostosPanel] Usando primer perfil disponible:", data[0]);
          setCurrentProfileData(data[0]);
          setSelectedProfileId(data[0]._id);
        }
      }
    } catch (err: any) {
      console.error("[ResultadosCalculoCostosPanel] Error cargando perfiles:", err);
      let errorMessage = "No se pudieron cargar los perfiles de costo.";
      
      if (err.response) {
        errorMessage = err.response.data?.message || `Error del servidor: ${err.response.status}`;
      } else if (err.request) {
        errorMessage = "Error de conexión. Por favor, verifique su conexión a internet.";
      } else {
        errorMessage = err.message || errorMessage;
      }
      
      setProfileError(errorMessage);
      setPerfilesList([]);
    } finally {
      setIsProfilesLoading(false);
      setIsLoading(false);
    }
  };

  const obtenerTipoCambioEurUsd = async () => {
    setIsLoadingTipoCambio(true);
    try {
      console.log('[ResultadosCalculoCostosPanel] Iniciando petición para obtener tipo de cambio EUR/USD...');
      const response = await fetch('https://n8n-807184488368.southamerica-west1.run.app/webhook/8012d60e-8a29-4910-b385-6514edc3d912');
      
      if (!response.ok) {
        console.error('[ResultadosCalculoCostosPanel] Error en la respuesta HTTP:', response.status, response.statusText);
        throw new Error(`Error al obtener el tipo de cambio EUR/USD: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[ResultadosCalculoCostosPanel] Respuesta del webhook:', data);

      if (!data || typeof data !== 'object') {
        throw new Error('La respuesta del webhook no es un objeto válido');
      }

      if (!data.Valor_Euro || !data.Valor_Dolar) {
        console.error('[ResultadosCalculoCostosPanel] Datos recibidos:', data);
        throw new Error('El objeto no contiene los valores esperados (Valor_Euro o Valor_Dolar)');
      }

      const valorEuro = parseFloat(data.Valor_Euro);
      const valorDolar = parseFloat(data.Valor_Dolar);
      
      if (isNaN(valorEuro) || isNaN(valorDolar) || valorDolar === 0) {
        console.error('[ResultadosCalculoCostosPanel] Valores inválidos:', { valorEuro, valorDolar });
        throw new Error('Los valores de divisas no son números válidos');
      }

      const tipoCambioEurUsd = valorEuro / valorDolar;
      console.log('[ResultadosCalculoCostosPanel] Tipo de cambio EUR/USD calculado:', tipoCambioEurUsd);
      setTipoCambioEurUsd(tipoCambioEurUsd);
      
    } catch (error) {
      console.error('[ResultadosCalculoCostosPanel] Error al obtener tipo de cambio EUR/USD:', error);
      setErrorCarga('Error al obtener el tipo de cambio EUR/USD. Por favor, intente nuevamente.');
      if (!tipoCambioEurUsd) {
        console.warn('[ResultadosCalculoCostosPanel] Usando valor por defecto para tipo de cambio EUR/USD');
        setTipoCambioEurUsd(1.117564);
      }
    } finally {
      setIsLoadingTipoCambio(false);
    }
  };

  useEffect(() => {
    cargarPerfilesDesdeAPI();
    obtenerTipoCambioEurUsd();
  }, [state?.selectedProfileId]);

  useEffect(() => {
    if (!state?.productosConOpcionalesSeleccionados || state.productosConOpcionalesSeleccionados.length === 0) {
      setErrorCarga("No se recibieron datos de configuración. Por favor, vuelva a la selección de equipos.");
      setLineasCalculadas([]);
      setIsLoading(false);
      return;
    }
    const productosParaProcesar = Array.isArray(state.productosConOpcionalesSeleccionados) ? state.productosConOpcionalesSeleccionados : [];
    const lineasBase = productosParaProcesar.map((item: ProductoConOpcionales) => {
      let costoBaseTotal = item.principal.datos_contables?.costo_fabrica || 0;
      item.opcionales.forEach((opcional: Producto) => {
        costoBaseTotal += opcional.datos_contables?.costo_fabrica || 0;
      });
      return {
        ...item,
        costoBaseTotalEur: costoBaseTotal,
        detalleCalculoPrincipal: undefined, 
        detallesCalculoOpcionales: undefined,
        precioVentaTotalClienteCLPPrincipal: undefined,
      };
    });
    setLineasCalculadas(lineasBase);
    setSavedCalculoId(null);
    setSaveSuccessMessage(null);
    setSaveErrorMessage(null);
    setIsLoading(false);
  }, [state?.productosConOpcionalesSeleccionados]);
  
  const realizarCalculoDetallado = async (lineas: LineaDeTrabajoConCosto[]): Promise<LineaDeTrabajoConCosto[] | null> => {
    if (!currentProfileData) {
      setErrorCarga("No hay un perfil de costo seleccionado.");
        return null; 
    }

    if (!tipoCambioEurUsd) {
      setErrorCarga("No se pudo obtener el tipo de cambio EUR/USD. Por favor, intente nuevamente.");
      return null;
    }

    const nuevasLineas = await Promise.all(
      lineas.map(async (linea) => {
        try {
          const detalleCalculoPrincipal = await fetchCalculoDetallado(
            linea.principal,
            linea.principal.datos_contables?.costo_fabrica || 0,
            linea.principal.datos_contables?.fecha_cotizacion as string | Date | undefined,
            currentProfileData._id,
            anoActualGlobal,
            tipoCambioEurUsd,
            currentProfileData.nombre_perfil,
            perfilesList
        );

        const detallesCalculoOpcionales = await Promise.all(
          linea.opcionales.map(opcional =>
            fetchCalculoDetallado(
              opcional,
              opcional.datos_contables?.costo_fabrica || 0,
              opcional.datos_contables?.fecha_cotizacion as string | Date | undefined,
              currentProfileData._id,
              anoActualGlobal,
              tipoCambioEurUsd,
              currentProfileData.nombre_perfil,
              perfilesList
            )
            )
          );

        return {
            ...linea,
            detalleCalculoPrincipal,
            detallesCalculoOpcionales,
          };
        } catch (error) {
          console.error('[ResultadosCalculoCostosPanel] Error en cálculo detallado:', error);
          setErrorCarga(`Error al calcular costos: ${error instanceof Error ? error.message : 'Error desconocido'}`);
          return null;
        }
      })
    );

    const lineasValidas = nuevasLineas.filter((linea): linea is LineaDeTrabajoConCosto => linea !== null) as LineaDeTrabajoConCosto[];

    if (lineasValidas.length === 0) {
      setErrorCarga("No se pudo calcular ninguna línea. Por favor, verifique los datos e intente nuevamente.");
      return null; 
    }

    return lineasValidas;
  };

  const handleCalcular = async () => {
    if (!currentProfileData) {
      setErrorCarga("Por favor, seleccione un perfil de costo primero para calcular.");
      return;
    }

    if (!tipoCambioEurUsd) {
      setErrorCarga("No se pudo obtener el tipo de cambio EUR/USD. Por favor, intente nuevamente.");
      return;
    }

    const lineasActualesParaCalculo = [...lineasCalculadas];

    if (!state?.productosConOpcionalesSeleccionados || state.productosConOpcionalesSeleccionados.length === 0 || lineasActualesParaCalculo.length === 0) {
      setErrorCarga("No hay productos para calcular.");
      return;
    }

    setIsCalculating(true);
    setSaveSuccessMessage(null);
    setSaveErrorMessage(null);
    setSavedCalculoId(null);
    setErrorCarga(null);
    setLatestCalculatedResults(null);

    const nuevasLineasConDetalles = await realizarCalculoDetallado(lineasActualesParaCalculo);

    if (!nuevasLineasConDetalles) {
      setSaveErrorMessage(errorCarga || "Falló la etapa de cálculo."); 
    } else {
      setLineasCalculadas(nuevasLineasConDetalles);
      const resultadosTransformados = transformarLineasParaConfiguracion(nuevasLineasConDetalles, currentProfileData.nombre_perfil);
      setLatestCalculatedResults(resultadosTransformados);
      setSaveSuccessMessage("Cálculo realizado con éxito. Puede proceder a guardar.");
    }
    setIsCalculating(false);
  };

  const handleGuardar = async () => {
    if (!currentProfileData) {
      setSaveErrorMessage("No hay un perfil de costo activo para guardar.");
      return;
    }
    if (!latestCalculatedResults) {
      setSaveErrorMessage("No hay resultados de cálculo para guardar. Por favor, calcule primero.");
      return;
    }
    if (!state?.productosConOpcionalesSeleccionados) {
      setSaveErrorMessage("Error interno: la configuración de productos no está disponible para guardar.");
      return;
    }

    setIsSaving(true);
    setSaveSuccessMessage(null);
    setSaveErrorMessage(null);
    setSavedCalculoId(null);
    
    const cotizacionDetailsParaGuardar: CotizacionDetails = {
      clienteNombre: null,
      emisorNombre: currentProfileData?.nombre_perfil || "Emisor Perfil Defecto",
      empresaQueCotiza: "Tu Empresa S.A.",
    };

    const nombreReferenciaOpcional = `Cálculo auto ${new Date().toLocaleDateString()} - Perfil: ${currentProfileData.nombre_perfil}`;

    const payloadParaGuardar = {
      itemsParaCotizar: state.productosConOpcionalesSeleccionados.map(item => ({
        principal: item.principal,
        opcionales: item.opcionales,
      })),
      resultadosCalculados: latestCalculatedResults,
      cotizacionDetails: cotizacionDetailsParaGuardar,
      nombreReferencia: nombreReferenciaOpcional,
      selectedProfileId: currentProfileData._id,
      nombrePerfil: currentProfileData.nombre_perfil,
      anoEnCursoGlobal: anoActualGlobal,
    };

    try {
      console.log("[ResultadosCalculoCostosPanel] Enviando payload a /api/calculo-historial/guardar:", payloadParaGuardar);
      const guardado: any = await guardarCalculoHistorial(payloadParaGuardar);
      
      setSaveSuccessMessage(guardado.message || "Cálculo guardado exitosamente!");
      setSavedCalculoId(guardado.data?._id || null);
      setSaveErrorMessage(null);
    } catch (error: any) {
      console.error("[ResultadosCalculoCostosPanel] Error al guardar cálculo:", error);
      setSaveErrorMessage(error.response?.data?.message || error.message || "Error al guardar el cálculo.");
      setSaveSuccessMessage(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleProfileChange = (event: SelectChangeEvent<string>) => {
    const profileId = event.target.value;
    const selected = perfilesList.find(p => p._id === profileId);
    setSelectedProfileId(profileId);
    setCurrentProfileData(selected || null);
    setLineasCalculadas(prevLineas => prevLineas.map(linea => ({
        ...linea,
        detalleCalculoPrincipal: undefined,
        detallesCalculoOpcionales: undefined,
        precioVentaTotalClienteCLPPrincipal: undefined, 
    })));
    setSaveSuccessMessage(null);
    setSaveErrorMessage(null);
    setErrorCarga(null); 
    setSavedCalculoId(null);
    setIsCalculating(false); 
    setLatestCalculatedResults(null);
    obtenerTipoCambioEurUsd();
  };

  const toggleExpandItem = (key: string) => {
    setExpandedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleVolverAResumen = () => {
    navigate('/configurar-opcionales');
  };

  const handleGenerarInformeHTML = () => {
    if (!savedCalculoId) {
        setSaveErrorMessage("Debe calcular y guardar el resultado primero para poder generar el informe.");
        return;
    }
    if (!currentProfileData) {
        setSaveErrorMessage("No hay un perfil seleccionado."); 
        return;
    }
    navigate('/configuracion-panel', {
        state: {
        itemsParaCotizar: lineasCalculadas.map(linea => ({
          principal: linea.principal,
          opcionales: linea.opcionales
        })),
            resultadosCalculados: latestCalculatedResults,
            selectedProfileId: currentProfileData._id,
            nombrePerfil: currentProfileData.nombre_perfil,
            anoEnCursoGlobal: anoActualGlobal,
        historialId: savedCalculoId,
        }
    });
  };

  if (isLoading || isProfilesLoading) {
    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '200px', justifyContent: 'center' }}>
                <CircularProgress sx={{ mb: 2 }} />
                <Typography variant="h6">Cargando datos y perfiles...</Typography>
            </Paper>
        </Container>
    );
  }

  if (errorCarga && !lineasCalculadas.length) {
    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Alert severity="error">{errorCarga}</Alert>
            <Button startIcon={<ArrowLeft />} onClick={() => navigate(-1)} sx={{ mt: 2 }}>
                Volver
            </Button>
        </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
      <Paper elevation={3} sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" component="h1">
            Resultados del Cálculo de Costos
          </Typography>
        </Box>

        {profileError && <Alert severity="error" sx={{ mb: 2 }}>Error al cargar perfiles: {profileError}</Alert>}

        <Box sx={{ display: 'flex', mb: 3 }}>
            <FormControl fullWidth>
                <InputLabel id="select-perfil-label">Seleccionar Perfil de Costo</InputLabel>
                <Select
                    labelId="select-perfil-label"
                    value={selectedProfileId}
                    label="Seleccionar Perfil de Costo"
                    onChange={handleProfileChange}
                    disabled={isProfilesLoading || perfilesList.length === 0}
                >
                    {perfilesList.map((perfil) => (
                        <MenuItem key={perfil._id} value={perfil._id}>{perfil.nombre_perfil}</MenuItem>
                    ))}
                </Select>
                {isProfilesLoading && <CircularProgress size={20} sx={{ position: 'absolute', top: '50%', right: '35px', marginTop: '-12px' }} />}
                {perfilesList.length === 0 && !isProfilesLoading && 
                    <Typography variant="caption" color="textSecondary" sx={{mt:1}}>No hay perfiles disponibles.</Typography>}
            </FormControl>
        </Box>

        {isCalculating && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', my: 2 }}>
                <CircularProgress sx={{ mr: 1 }} />
                <Typography>Realizando cálculos detallados...</Typography>
            </Box>
        )}
        {isSaving && !isCalculating && (
             <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', my: 2 }}>
                <CircularProgress sx={{ mr: 1 }} />
                <Typography>Guardando cálculo...</Typography>
            </Box>
        )}

        {saveSuccessMessage && <Alert severity="success" sx={{mb:2}}>{saveSuccessMessage}</Alert>}
        {saveErrorMessage && <Alert severity="error" sx={{mb:2}}>{saveErrorMessage}</Alert>}
        {errorCarga && <Alert severity="warning" sx={{mb:2}}>{errorCarga}</Alert>}

        {lineasCalculadas.length === 0 && !isLoading && !errorCarga && (
          <Alert severity="info" sx={{ mt: 2 }}>
            No hay productos seleccionados para calcular o no se ha podido cargar la configuración inicial.
          </Alert>
        )}

        {lineasCalculadas.map((linea, index) => {
          const key = linea.principal.codigo_producto || `item-${index}`;
          const isExpanded = expandedItems[key] || false;
          const tieneDetalles = !!linea.detalleCalculoPrincipal && !linea.detalleCalculoPrincipal.error;

          return (
            <Accordion key={key} expanded={isExpanded} onChange={() => toggleExpandItem(key)} sx={{ mb: 1.5 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls={`panel${index}-content`} id={`panel${index}-header`}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <Typography variant="h6" sx={{ flexGrow: 1 }}>
                    {linea.principal.nombre_del_producto || 'Producto Principal'}
                    {linea.opcionales.length > 0 && 
                        <Chip label={`${linea.opcionales.length} opcionales`} />}
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                {tieneDetalles && (
                  <>
                    <RenderResultDetails detalle={linea.detalleCalculoPrincipal} profile={currentProfileData} />
                    {linea.detallesCalculoOpcionales.map((detalleOpcional, idx) => (
                      <RenderResultDetails key={`opcional-${idx}`} detalle={detalleOpcional} profile={currentProfileData} />
                    ))}
                  </>
                )}
              </AccordionDetails>
            </Accordion>
          );
        })}

        {/* Restored Action Buttons Box */}
        <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mt: 3, mb:1, gap: 2 }}>
          <Button
            variant="outlined"
            size="large"
            startIcon={<ArrowLeft />}
            onClick={handleVolverAResumen}
          >
            Volver a Config. Opcionales
          </Button>
          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={<Calculator />}
            onClick={handleCalcular}
            disabled={!currentProfileData || (lineasCalculadas && lineasCalculadas.length === 0) || isCalculating || isProfilesLoading}
            sx={{ minWidth: '200px' }}
          >
            {isCalculating ? "Calculando..." : "Calcular Precios"}
          </Button>
          <Button
            variant="contained"
            color="secondary"
            size="large"
            startIcon={<Save />}
            onClick={handleGuardar}
            disabled={!latestCalculatedResults || isSaving || isCalculating}
            sx={{ minWidth: '200px' }}
          >
            {isSaving ? "Guardando..." : "Guardar Cálculo"}
          </Button>
          <Button
            variant="contained"
            color="success"
            size="large"
            startIcon={<FileText />}
            onClick={handleGenerarInformeHTML}
            disabled={!savedCalculoId || isCalculating || isSaving}
          >
            Generar Informe HTML
          </Button>
        </Box>

      </Paper>
    </Container>
  );
}