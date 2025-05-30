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
import { guardarCalculoHistorial, CotizacionDetails, GuardarCalculoPayload } from '../services/calculoHistorialService';
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
  // Redondear al entero más cercano primero
  const roundedValue = Math.round(value);
  // Usar 'es-CL' para el formato chileno (punto como separador de miles, sin decimales por defecto para enteros)
  // o 'de-DE' que también usa punto para miles y no mostrará decimales para enteros.
  // Si es-CL no da el resultado esperado (a veces depende del runtime de JS), de-DE es una alternativa robusta.
  return `$${roundedValue.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`; 
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
    const roundedValue = (digits === 0) ? Math.round(value) : value; 
    // Para formatNumber con digits = 0, queremos el punto como separador de miles.
    // 'es-CL' o 'de-DE' sirven para esto.
    const localeForFormatting = (digits === 0) ? 'es-CL' : 'es-ES';
    let formattedNumber = roundedValue.toLocaleString(localeForFormatting, { minimumFractionDigits: digits, maximumFractionDigits: digits });
    
    // Esta regla de quitar ,00 se aplica si el locale original era es-ES y digits era 2
    if (localeForFormatting === 'es-ES' && digits === 2 && formattedNumber.endsWith(',00')) {
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
    const displayProfileName = capitalizeFirstLetter(currentProfileName || profileNameFromCalc || "Perfil Desconocido");
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
                return formatCLP(value);
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
                Detalle del cálculo (Perfil: {displayProfileName} - ID: {displayProfileId})
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

  const [lineasCalculadas, setLineasCalculadas] = useState<LineaDeTrabajoConCosto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  
  const [perfilesList, setPerfilesList] = useState<CostoPerfilData[]>([]);
  const [isProfilesLoading, setIsProfilesLoading] = useState<boolean>(true);
  
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [currentProfileData, setCurrentProfileData] = useState<CostoPerfilData | null>(null);
  
  const [tipoCambioEurUsd, setTipoCambioEurUsd] = useState<number>(1.08);
  const [isLoadingTipoCambio, setIsLoadingTipoCambio] = useState(false);
  
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedCalculoId, setSavedCalculoId] = useState<string | null>(null);
  const [latestCalculatedResults, setLatestCalculatedResults] = useState<Record<string, CalculationResult> | null>(null);

  const [lineSpecificProfileIds, setLineSpecificProfileIds] = useState<Record<string, string>>({});
  const [recalculatingLine, setRecalculatingLine] = useState<string | null>(null);

  // Nuevo estado para la configuración guardada
  const [ultimaConfiguracionGuardada, setUltimaConfiguracionGuardada] = useState<any | null>(null);

  const cargarPerfilesDesdeAPI = useCallback(async () => {
    setIsProfilesLoading(true);
    setProfileError(null);
    try {
      const data = await getPerfiles();
      setPerfilesList(data);
      if (data.length > 0) {
        let initialProfileId = location.state?.selectedProfileId || data[0]._id;
        const initialProfile = data.find(p => p._id === initialProfileId);
        if (initialProfile) {
          setSelectedProfileId(initialProfileId);
          setCurrentProfileData(initialProfile);
        } else if (data.length > 0) {
          setSelectedProfileId(data[0]._id);
          setCurrentProfileData(data[0]);
        }
      } else {
        setProfileError("No hay perfiles de costo disponibles. Por favor, cree uno.");
      }
    } catch (error) {
      console.error("Error cargando perfiles:", error);
      setProfileError("No se pudieron cargar los perfiles de costo.");
    } finally {
      setIsProfilesLoading(false);
    }
  }, [location.state?.selectedProfileId]);

  const obtenerTipoCambioEurUsd = useCallback(async () => {
    setIsLoadingTipoCambio(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setTipoCambioEurUsd(1.08);
    } catch (error) {
      console.error("Error obteniendo tipo de cambio EUR/USD:", error);
      setErrorCarga((prev) => prev ? prev + " | No se pudo obtener TC EUR/USD." : "No se pudo obtener TC EUR/USD.");
      setTipoCambioEurUsd(1.08);
    } finally {
      setIsLoadingTipoCambio(false);
    }
  }, []);

  useEffect(() => {
    cargarPerfilesDesdeAPI();
    obtenerTipoCambioEurUsd();
  }, [cargarPerfilesDesdeAPI, obtenerTipoCambioEurUsd]);
  
  const realizarCalculoDetalladoSingleLine = useCallback(async (
    linea: LineaDeTrabajoConCosto, 
    profileForCalc: CostoPerfilData, 
    tcEurUsd: number
  ): Promise<LineaDeTrabajoConCosto | null> => {
    if (!profileForCalc || !tcEurUsd) {
        console.error("Perfil o TC no disponibles para realizarCalculoDetalladoSingleLine");
        return { 
            ...linea, 
            detalleCalculoPrincipal: { ...linea.detalleCalculoPrincipal, error: "Faltan datos de perfil o TC" },
            precioVentaTotalClienteCLPPrincipal: undefined 
        };
    }

    try {
        const detalleCalculoPrincipal = await fetchCalculoDetallado(
            linea.principal,
            linea.principal.datos_contables?.costo_fabrica || 0,
            linea.principal.datos_contables?.fecha_cotizacion,
            profileForCalc._id,
            location.state?.anoEnCursoGlobal || new Date().getFullYear(),
            tcEurUsd,
            profileForCalc.nombre_perfil,
            perfilesList 
        );

        if (!detalleCalculoPrincipal || detalleCalculoPrincipal.error) {
            console.warn(`Cálculo detallado principal falló para ${linea.principal.codigo_producto}. Error: ${detalleCalculoPrincipal?.error}`);
            return { 
                ...linea, 
                detalleCalculoPrincipal: { error: detalleCalculoPrincipal?.error || "Error desconocido en cálculo principal" },
                precioVentaTotalClienteCLPPrincipal: undefined
            };
        }

        const detallesCalculoOpcionalesPromises = linea.opcionales.map(opcional => 
            fetchCalculoDetallado( 
                opcional,
                opcional.datos_contables?.costo_fabrica || 0,
                opcional.datos_contables?.fecha_cotizacion,
                profileForCalc._id,
                location.state?.anoEnCursoGlobal || new Date().getFullYear(),
                tcEurUsd,
                profileForCalc.nombre_perfil,
                perfilesList
            )
        );
        const resultadosOpcionalesDetalles = await Promise.all(detallesCalculoOpcionalesPromises);
        const validosOpcionalesDetalles = resultadosOpcionalesDetalles.filter(d => d && !d.error);
        const opcionalesConErrores = resultadosOpcionalesDetalles.filter(d => d && d.error);
        
        const precioVentaTotalClienteCLPPrincipal = detalleCalculoPrincipal.calculados?.precios_cliente?.precioVentaTotalClienteCLP;

        return {
            ...linea,
            detalleCalculoPrincipal,
            detallesCalculoOpcionales: validosOpcionalesDetalles,
            opcionalesConErroresCalculo: opcionalesConErrores.length > 0 ? opcionalesConErrores : undefined,
            precioVentaTotalClienteCLPPrincipal: precioVentaTotalClienteCLPPrincipal,
            profileIdForCalc: profileForCalc._id
        };
    } catch (error) {
        console.error(`Error procesando línea para ${linea.principal.codigo_producto} en realizarCalculoDetalladoSingleLine:`, error);
        return { 
            ...linea, 
            detalleCalculoPrincipal: { error: `Error general procesando ${capitalizeFirstLetter(linea.principal.nombre_del_producto || linea.principal.codigo_producto || 'producto')}` },
            precioVentaTotalClienteCLPPrincipal: undefined
        };
    }
  }, [location.state?.anoEnCursoGlobal, perfilesList]);

  useEffect(() => {
    const initCalculation = async () => {
      if (location.state && location.state.productosConOpcionalesSeleccionados && currentProfileData && tipoCambioEurUsd !== null) {
        setIsLoading(true);
        setErrorCarga(null);

        const itemsTransformados: LineaDeTrabajoConCosto[] = location.state.productosConOpcionalesSeleccionados.map((item: ProductoConOpcionales) => ({
          ...item,
          detalleCalculoPrincipal: location.state.resultadosCalculados?.[`principal-${item.principal.codigo_producto}`] || undefined,
          detallesCalculoOpcionales: item.opcionales.map((opc: Producto) => location.state.resultadosCalculados?.[`opcional-${opc.codigo_producto}`] || undefined),
          precioVentaTotalClienteCLPPrincipal: undefined,
          profileIdForCalc: currentProfileData._id
        }));
        
        const initialLineProfiles: Record<string, string> = {};
        itemsTransformados.forEach((item: LineaDeTrabajoConCosto) => {
          if (item.principal.codigo_producto) {
            initialLineProfiles[item.principal.codigo_producto] = currentProfileData._id;
          }
        });
        setLineSpecificProfileIds(initialLineProfiles);

        const calculosPromises = itemsTransformados.map(linea => 
            realizarCalculoDetalladoSingleLine(linea, currentProfileData, tipoCambioEurUsd)
        );
        
        try {
            const lineasConDetalleArray = await Promise.all(calculosPromises);
            const lineasActualizadas = lineasConDetalleArray.filter(l => l !== null) as LineaDeTrabajoConCosto[];
            setLineasCalculadas(lineasActualizadas);

            const resultadosTransformados = transformarLineasParaConfiguracion(lineasActualizadas, currentProfileData.nombre_perfil);
            setLatestCalculatedResults(resultadosTransformados);
            
        } catch (error) {
            console.error("Error en el cálculo inicial masivo:", error);
            setErrorCarga("Error durante el cálculo inicial de los productos.");
            setLineasCalculadas(itemsTransformados);
        } finally {
            setIsLoading(false);
        }
      } else if (!location.state?.productosConOpcionalesSeleccionados && !isProfilesLoading && !isLoadingTipoCambio) {
        setErrorCarga('No se recibieron items para calcular. Por favor, vuelva a la página de configuración.');
        setIsLoading(false);
      }
    };

    if (!isProfilesLoading && !isLoadingTipoCambio && currentProfileData) {
        initCalculation();
    }
  }, [
    location.state, 
    currentProfileData, 
    tipoCambioEurUsd, 
    realizarCalculoDetalladoSingleLine, 
    isProfilesLoading, 
    isLoadingTipoCambio
  ]);

  const handleLineProfileChange = async (principalCodigo: string, newProfileId: string) => {
    if (!tipoCambioEurUsd || !principalCodigo) {
        setErrorCarga("Datos insuficientes para recalcular la línea (TC o código de producto faltante).");
        return;
    }
    const newProfile = perfilesList.find(p => p._id === newProfileId);
    if (!newProfile) {
        setErrorCarga(`Perfil con ID ${newProfileId} no encontrado.`);
        return;
    }

    setLineSpecificProfileIds(prev => ({ ...prev, [principalCodigo]: newProfileId }));
    setRecalculatingLine(principalCodigo);

    const lineaAActualizarIndex = lineasCalculadas.findIndex(l => l.principal.codigo_producto === principalCodigo);
    if (lineaAActualizarIndex === -1) {
        console.error(`Línea con código ${principalCodigo} no encontrada para actualizar.`);
        setRecalculatingLine(null);
        return;
    }
    
    let lineaOriginal = lineasCalculadas[lineaAActualizarIndex];
    const lineaParaRecalculo: LineaDeTrabajoConCosto = {
        ...lineaOriginal,
        detalleCalculoPrincipal: undefined, 
        detallesCalculoOpcionales: [],
        profileIdForCalc: newProfileId
    };

    try {
        const lineaRecalculada = await realizarCalculoDetalladoSingleLine(lineaParaRecalculo, newProfile, tipoCambioEurUsd);
        
        if (lineaRecalculada) {
            const nuevasLineasCalculadas = [...lineasCalculadas];
            nuevasLineasCalculadas[lineaAActualizarIndex] = lineaRecalculada;
            setLineasCalculadas(nuevasLineasCalculadas);

            const resultadosTransformados = transformarLineasParaConfiguracion(nuevasLineasCalculadas, newProfile.nombre_perfil);
            setLatestCalculatedResults(resultadosTransformados);
            setSaveSuccessMessage(null);
        } else {
            setErrorCarga(`Error recalculando ${capitalizeFirstLetter(lineaOriginal.principal.nombre_del_producto || 'producto')}.`);
        }
    } catch (err: any) {
        console.error(`Error recalculando línea ${principalCodigo} con perfil ${newProfileId}:`, err);
        setErrorCarga(`Error recalculando ${capitalizeFirstLetter(lineaOriginal.principal.nombre_del_producto || 'producto')}: ${err.message}`);
    } finally {
        setRecalculatingLine(null);
    }
  };
  
  const handleCalcular = async () => {
    if (!tipoCambioEurUsd) {
        setErrorCarga("El tipo de cambio EUR/USD no está disponible para recalcular.");
        return;
    }
    if (lineasCalculadas.length === 0) {
        setErrorCarga("No hay productos para calcular.");
        return;
    }
    if (perfilesList.length === 0) {
        setErrorCarga("No hay perfiles de costo disponibles.");
        return;
    }

    setIsCalculating(true);
    setSaveSuccessMessage(null);
    setSaveErrorMessage(null);
    setSavedCalculoId(null);
    setErrorCarga(null);

    const calculosPromises = lineasCalculadas.map(async (linea) => {
        const profileIdForThisLine = lineSpecificProfileIds[linea.principal.codigo_producto || ''] || selectedProfileId || (currentProfileData?._id);
        let profileForThisLine = perfilesList.find(p => p._id === profileIdForThisLine);

        if (!profileForThisLine) {
            console.warn(`Perfil ID ${profileIdForThisLine} no encontrado para línea ${linea.principal.codigo_producto}. Usando el primer perfil de la lista.`);
            if (perfilesList.length > 0) {
                profileForThisLine = perfilesList[0];
            } else {
                 return { ...linea, detalleCalculoPrincipal: { error: "No hay perfiles de costo" }, precioVentaTotalClienteCLPPrincipal: undefined };
            }
        }
        
        const lineaParaRecalculo: LineaDeTrabajoConCosto = {
            ...linea,
            detalleCalculoPrincipal: undefined,
            detallesCalculoOpcionales: [],
            profileIdForCalc: profileForThisLine._id
        };
        return realizarCalculoDetalladoSingleLine(lineaParaRecalculo, profileForThisLine, tipoCambioEurUsd);
    });

    try {
        const lineasActualizadasArray = await Promise.all(calculosPromises);
        const lineasValidas = lineasActualizadasArray.filter(l => l !== null) as LineaDeTrabajoConCosto[];
        setLineasCalculadas(lineasValidas);

        const nombrePerfilParaInforme = currentProfileData?.nombre_perfil || (perfilesList[0]?.nombre_perfil || "Múltiples Perfiles");
        const resultadosTransformados = transformarLineasParaConfiguracion(lineasValidas, nombrePerfilParaInforme);
        setLatestCalculatedResults(resultadosTransformados);
        setSaveSuccessMessage("Cálculos actualizados con perfiles específicos. Puede proceder a guardar.");

    } catch (error: any) {
        console.error("Error durante el recálculo masivo en handleCalcular:", error);
        setErrorCarga(error.message || "Falló la etapa de cálculo masivo.");
    } finally {
        setIsCalculating(false);
    }
  };

  const handleGuardar = async () => {
    if (!latestCalculatedResults || Object.keys(latestCalculatedResults).length === 0) {
      setSaveErrorMessage("No hay datos calculados para guardar o los datos son inválidos.");
      return;
    }
    if (!location.state?.productosConOpcionalesSeleccionados) {
      setSaveErrorMessage("Error interno: la configuración de productos no está disponible para guardar.");
      return;
    }
    
    const perfilParaGuardar = currentProfileData || (perfilesList.length > 0 ? perfilesList[0] : null);
    if (!perfilParaGuardar) {
        setSaveErrorMessage("No se pudo determinar un perfil de costo para el guardado (perfilParaGuardar es null).");
        // setIsSaving(false); // Ya no es necesario aquí si se setea antes del try
        return;
    }

    // Determinar el nombre del perfil para el reporte (lógica similar a handleGenerarInformeHTML)
    let nombrePerfilParaReporteGuardado = "Múltiples Perfiles Aplicados";
    if (lineasCalculadas && lineasCalculadas.length > 0 && perfilesList.length > 0) {
        const firstLineProfileId = lineasCalculadas[0].profileIdForCalc;
        if (firstLineProfileId) {
            const allLinesUseSameProfile = lineasCalculadas.every(
                linea => linea.profileIdForCalc === firstLineProfileId
            );
            if (allLinesUseSameProfile) {
                const profile = perfilesList.find(p => p._id === firstLineProfileId);
                if (profile) {
                    nombrePerfilParaReporteGuardado = capitalizeFirstLetter(profile.nombre_perfil);
                }
            }
        } else {
            // Fallback si no hay profileIdForCalc en la primera línea (debería haberlo)
            nombrePerfilParaReporteGuardado = capitalizeFirstLetter(perfilParaGuardar.nombre_perfil || "Perfil General");
        }
    } else {
        nombrePerfilParaReporteGuardado = capitalizeFirstLetter(perfilParaGuardar.nombre_perfil || "Error al determinar perfil");
    }

    const configuracionActualParaGuardar = {
        fechaCreacion: new Date().toISOString(),
        nombrePerfilReporte: nombrePerfilParaReporteGuardado,
        // Copias profundas para evitar que mutaciones posteriores afecten la versión guardada
        lineasCalculadas: JSON.parse(JSON.stringify(lineasCalculadas)), 
        perfilesList: JSON.parse(JSON.stringify(perfilesList)), 
        latestCalculatedResults: JSON.parse(JSON.stringify(latestCalculatedResults))
    };
    setUltimaConfiguracionGuardada(configuracionActualParaGuardar);
    console.log("Configuración para informe guardada en estado local:", configuracionActualParaGuardar);

    setIsSaving(true);
    setSaveSuccessMessage(null);
    setSaveErrorMessage(null);
    
    const cotizacionDetails: CotizacionDetails = {
        emisorNombre: perfilParaGuardar.nombre_perfil, 
        fechaCreacionCotizacion: new Date().toISOString(),
    };

    const payload: GuardarCalculoPayload = {
      itemsParaCotizar: location.state.productosConOpcionalesSeleccionados,
      resultadosCalculados: latestCalculatedResults,
      selectedProfileId: perfilParaGuardar._id, 
      nombrePerfil: perfilParaGuardar.nombre_perfil,
      anoEnCursoGlobal: location.state?.anoEnCursoGlobal || new Date().getFullYear(),
      cotizacionDetails: cotizacionDetails, 
    };

    try {
      const savedData = await guardarCalculoHistorial(payload); 
      setSavedCalculoId(savedData._id);
      setSaveSuccessMessage(`Cálculo guardado con éxito (ID: ${savedData._id})`);
    } catch (error) {
      console.error("Error guardando el historial de cálculo:", error);
      setSaveErrorMessage("Error al guardar el cálculo. Por favor, intente nuevamente.");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleExpandItem = (key: string) => {
    setExpandedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleVolverAResumen = () => {
    navigate('/configurar-carga');
  };

  const handleGenerarInformeHTML = () => {
    let configuracionAUsar: any | null = null; // Tipar mejor si es posible

    if (ultimaConfiguracionGuardada) {
        configuracionAUsar = ultimaConfiguracionGuardada;
        console.log("Generando informe con la última configuración guardada en memoria.");
    } else if (latestCalculatedResults && lineasCalculadas && lineasCalculadas.length > 0 && perfilesList.length > 0) {
        console.log("Generando informe con la configuración en vivo (no se encontró una guardada recientemente).");
        let reportProfileName = "Múltiples Perfiles Aplicados";
        const firstLineProfileId = lineasCalculadas[0].profileIdForCalc;
        
        if (firstLineProfileId) {
            const allLinesUseSameProfile = lineasCalculadas.every(
                linea => linea.profileIdForCalc === firstLineProfileId
            );
            if (allLinesUseSameProfile) {
                const profile = perfilesList.find(p => p._id === firstLineProfileId);
                if (profile) {
                    reportProfileName = capitalizeFirstLetter(profile.nombre_perfil);
                }
            }
        } else {
            // Si no hay profileIdForCalc en la primera línea (raro, pero como fallback)
            // O si se quiere que el nombre del perfil global sea el principal si no hay uno específico por línea
            reportProfileName = capitalizeFirstLetter(currentProfileData?.nombre_perfil || perfilesList[0]?.nombre_perfil || "Perfil General");
        }

        configuracionAUsar = {
            fechaCreacion: new Date().toISOString(), // Fecha actual si es en vivo
            nombrePerfilReporte: reportProfileName,
            lineasCalculadas: lineasCalculadas, // Referencia directa si es en vivo, DocumentoHTMLPanel no debería mutar
            perfilesList: perfilesList,
            latestCalculatedResults: latestCalculatedResults
        };
    } else {
        // No hacer nada si no hay datos, setErrorCarga se maneja abajo
    }

    if (configuracionAUsar) {
        navigate('/documento_html', { state: { configuracion: configuracionAUsar } });
    } else {
        setErrorCarga("No hay resultados calculados, líneas, o perfiles definidos para generar el informe. Realice un cálculo primero o guarde uno existente.");
    }
  };

  if (isLoading && lineasCalculadas.length === 0) {
    return (
        <Container maxWidth="md" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
            <CircularProgress size={60} sx={{ mb: 2 }} />
            <Typography variant="h6">Cargando datos y realizando cálculo inicial...</Typography>
        </Container>
    );
  }

  if (profileError && perfilesList.length === 0) {
    return (
        <Container maxWidth="md" sx={{mt: 4}}>
            <Alert severity="error" sx={{ mb: 2 }}>
                {profileError}
            </Alert>
            <Button variant="outlined" onClick={() => navigate('/admin/perfiles')}>
                Ir a gestión de perfiles
            </Button>
        </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
      <Paper elevation={3} sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
          <Typography variant="h4" component="h1" sx={{ flexGrow: 1, minWidth: '200px', mb: { xs: 1, md: 0 } }}>
            Resultados del Cálculo de Costos
          </Typography>
          {currentProfileData && (
            <Chip 
                label={`Perfil Global Inicial: ${currentProfileData.nombre_perfil}`} 
                color="info" 
                variant="outlined" 
                sx={{mb: {xs: 1, md: 0}}}
            />
          )}
        </Box>

        {isCalculating && (
          <Alert severity="info" icon={<Loader2 className="animate-spin" />} sx={{ mb: 2 }}>
            Calculando precios con perfiles especificados...
          </Alert>
        )}
        {isSaving && (
          <Alert severity="info" icon={<Loader2 className="animate-spin" />} sx={{ mb: 2 }}>
            Guardando cálculo en el historial...
          </Alert>
        )}
        {saveSuccessMessage && <Alert severity="success" sx={{ mb: 2 }}>{saveSuccessMessage}</Alert>}
        {saveErrorMessage && <Alert severity="error" sx={{ mb: 2 }}>{saveErrorMessage}</Alert>}
        {errorCarga && <Alert severity="warning" sx={{ mb: 2 }}>{errorCarga}</Alert>}
        
        {(isLoading && lineasCalculadas.length > 0) && (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                <CircularProgress />
                <Typography sx={{ ml: 1, mt:0.5}}>Actualizando...</Typography>
            </Box>
        )}

        {lineasCalculadas.length === 0 && !isLoading && !errorCarga && (
          <Alert severity="info" sx={{ mt: 2 }}>
            No hay productos seleccionados o no se ha podido cargar la configuración inicial.
          </Alert>
        )}

        {lineasCalculadas.map((linea, index) => {
          const key = linea.principal.codigo_producto || `item-${index}`;
          const isExpanded = expandedItems[key] || false;
          const isThisLineRecalculating = recalculatingLine === linea.principal.codigo_producto;
          const currentLineProfileId = lineSpecificProfileIds[linea.principal.codigo_producto || ''] || selectedProfileId || (currentProfileData?._id || '');

          return (
            <Accordion key={key} expanded={isExpanded} onChange={() => toggleExpandItem(key)} sx={{ mb: 2, opacity: isThisLineRecalculating ? 0.7 : 1 }} TransitionProps={{ unmountOnExit: true }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls={`${key}-content`} id={`${key}-header`}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 2, flexWrap: 'wrap' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'medium', flexGrow: 1, flexBasis: {xs: '100%', md: '40%'}, minWidth: '200px', order: {xs:1, md:1} }}>
                    {(linea.principal.nombre_del_producto || linea.principal.codigo_producto || 'Producto Desconocido').toUpperCase()}
                  </Typography>

                  {perfilesList.length > 0 && (
                    <FormControl size="small" sx={{ minWidth: 230, flexBasis: {xs: '100%', md: '30%'}, order: {xs:3, md:2} }} disabled={isThisLineRecalculating || isCalculating || isProfilesLoading}>
                      <InputLabel id={`select-profile-label-${key}`}>Perfil Específico</InputLabel>
                      <Select
                        labelId={`select-profile-label-${key}`}
                        value={currentLineProfileId}
                        label="Perfil Específico"
                        onChange={(e) => handleLineProfileChange(linea.principal.codigo_producto || '', e.target.value as string)}
                      >
                        {currentProfileData && <MenuItem value={currentProfileData._id}><em>Usar Global: {currentProfileData.nombre_perfil}</em></MenuItem>}
                        {perfilesList.map((perfil) => (
                          <MenuItem key={perfil._id} value={perfil._id} disabled={perfil._id === currentProfileData?._id && currentLineProfileId === currentProfileData?._id}> 
                            {perfil.nombre_perfil}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                  {isThisLineRecalculating && <CircularProgress size={24} sx={{ flexShrink: 0, order: {xs:2, md:3} }}/>}
                  
                  <Typography variant="body2" color={linea.detalleCalculoPrincipal?.error ? "error.main" : "text.secondary"} sx={{ flexBasis: {xs: '100%', md: '25%'}, textAlign: 'right', flexShrink: 0, fontWeight: 'medium', order: {xs:4, md:4} }}>
                    Total Principal: {linea.precioVentaTotalClienteCLPPrincipal !== undefined ? formatCLP(linea.precioVentaTotalClienteCLPPrincipal) : (linea.detalleCalculoPrincipal?.error ? 'Error en Cálculo' : 'Calculando...') }
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{backgroundColor: 'action.hover'}}>
                {linea.detalleCalculoPrincipal?.error && 
                    <Alert severity="warning" sx={{mb:1}}>
                        Hubo un error al calcular los detalles para el producto principal con el perfil seleccionado: {linea.detalleCalculoPrincipal.error}
                    </Alert>
                }
                <Typography variant="h6" gutterBottom>Detalles del Producto Principal</Typography>
                <RenderResultDetails 
                    detalle={linea.detalleCalculoPrincipal || null} 
                    profile={perfilesList.find(p => p._id === currentLineProfileId) || currentProfileData} 
                />
                
                {linea.opcionalesConErroresCalculo && linea.opcionalesConErroresCalculo.length > 0 &&
                    <Alert severity="warning" sx={{mt:2, mb:1}}>
                        Algunos opcionales tuvieron errores de cálculo: 
                        {linea.opcionalesConErroresCalculo.map((e: CalculationResult) => e.inputs?.codigo_producto || 'ID desconocido').join(', ')}
                    </Alert>
                }
                {(linea.detallesCalculoOpcionales && linea.detallesCalculoOpcionales.length > 0) && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="h6" gutterBottom>Detalles de Opcionales</Typography>
                    {linea.detallesCalculoOpcionales.map((opcionalDetalle, opIndex) => (
                      <Box key={opcionalDetalle.inputs?.codigo_producto || `op-${index}-${opIndex}`} sx={{ mb: 2, pl: 2, borderLeft: '3px solid #eee', backgroundColor: opcionalDetalle.error ? 'rgba(255,0,0,0.05)' : 'transparent', p:1 }}>
                        <Typography variant="subtitle1" sx={{mb:1, fontWeight:'medium', color: opcionalDetalle.error ? 'error.main' : 'inherit'}}>
                            Opcional: {opcionalDetalle.inputs?.nombre_opcional || opcionalDetalle.inputs?.codigo_producto || 'Opcional Desconocido'}
                            {opcionalDetalle.error && ` - Error: ${opcionalDetalle.error}`}
                        </Typography>
                        {!opcionalDetalle.error && 
                            <RenderResultDetails 
                                detalle={opcionalDetalle || null} 
                                profile={perfilesList.find(p => p._id === currentLineProfileId) || currentProfileData} 
                            />
                        }
                      </Box>
                    ))}
                  </Box>
                )}
                 {(!linea.detallesCalculoOpcionales || linea.detallesCalculoOpcionales.length === 0) && linea.opcionales.length > 0 && !linea.opcionalesConErroresCalculo && (
                    <Typography sx={{mt:1, fontStyle: 'italic'}} color="textSecondary">
                        Detalle de cálculo para opcionales no disponible o no calculado aún para el perfil actual.
                    </Typography>
                )}
              </AccordionDetails>
            </Accordion>
          );
        })}

        <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mt: 3, mb:1, gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            size="large"
            startIcon={<ArrowLeft />}
            onClick={handleVolverAResumen}
            sx={{order:1}}
          >
            Volver a Config. Opcionales
          </Button>
          <Box sx={{ display: 'flex', gap: 2, order: {xs: 3, sm: 2}, flexGrow: {xs: 1, sm:0}, justifyContent: {xs: 'space-between', sm: 'flex-start'} }}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              startIcon={<Calculator />}
              onClick={handleCalcular}
              disabled={perfilesList.length === 0 || (lineasCalculadas && lineasCalculadas.length === 0) || isCalculating || isProfilesLoading || isSaving}
              sx={{ minWidth: {xs: 'calc(50% - 8px)', sm:'180px'} }}
            >
              {isCalculating ? <CircularProgress size={24} color="inherit" sx={{mr:1}}/> : null}
              {isCalculating ? "Calculando..." : "Calcular Precios"} 
            </Button>
            <Button
                variant="contained"
                color="secondary"
                size="large"
                startIcon={<Save />}
                onClick={handleGuardar}
                disabled={isSaving || isCalculating || !latestCalculatedResults || Object.keys(latestCalculatedResults).length === 0}
                sx={{ minWidth: {xs: 'calc(50% - 8px)', sm:'180px'} }}
            >
                {isSaving ? <CircularProgress size={24} color="inherit" sx={{mr:1}}/> : null}
                {isSaving ? "Guardando..." : "Guardar Cálculo"}
            </Button>
          </Box>
          <Button
            variant="outlined"
            color="success"
            size="large"
            startIcon={<FileText />}
            onClick={handleGenerarInformeHTML}
            disabled={!latestCalculatedResults || Object.keys(latestCalculatedResults).length === 0 || isCalculating || isSaving}
            sx={{order: {xs:2, sm:3}}}
          >
            Generar Informe HTML
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}