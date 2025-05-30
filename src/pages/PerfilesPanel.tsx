import React, { useState, useEffect, useCallback, ChangeEvent } from 'react';
import { Loader2, AlertTriangle, Eye, Edit, Trash2, PlusCircle, XCircle, RefreshCw, DollarSign, Euro, Calculator, Copy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { CostoPerfilData } from '../types';
import {
    Modal, 
    Box, 
    Button, 
    TextField, 
    Typography, 
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Grid,
    Paper,
    Tooltip,
    Alert,
    Divider,
    Stack,
    FormControl,
    InputLabel,
    OutlinedInput,
    InputAdornment,
    Select,
    MenuItem,
    SelectChangeEvent
} from '@mui/material';
import PerfilEditForm from './PerfilEditForm';
import axios, { AxiosError } from 'axios';

// Helper para formatear moneda CLP (con signo $)
const formatCLP = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined) return '--';
  const numberValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numberValue)) return '--';
  // Mostrar con 2 decimales si los tiene, formato chileno
  return `$ ${numberValue.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Helper para formatear tipo de cambio
const formatExchangeRate = (value: number | null | undefined): string => {
   if (value === null || value === undefined || !isFinite(value)) return '--';
   // Mostrar más decimales
   return value.toFixed(6); 
};

// Helper para formatear otras monedas (usado en resultados)
const formatGenericCurrency = (value: number | null | undefined, currency: 'USD' | 'EUR', digits = 4): string => { // Aumentar default digits
  if (value === null || value === undefined || isNaN(value)) return '--';
  const options: Intl.NumberFormatOptions = {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits // Usar el mismo para asegurar precisión
  };
  return value.toLocaleString('en-US', options);
};

// Helper para formatear porcentajes (usado en resultados)
const formatPercentDisplay = (value: number | null | undefined, digits = 4): string => { // Aumentar default digits
   if (value === null || value === undefined || isNaN(value)) return '--';
   // Mostrar más decimales en el porcentaje
   return `${(value * 100).toFixed(digits)}%`;
};

// --- Tipos para Calculadora ---
interface PruebaInputs {
    ano_cotizacion: number | string;
    ano_en_curso: number | string;
    costo_fabrica_original_eur: number | string;
    descuento_pct: number | string; // Input as % (e.g., 10)
    buffer_eur_usd_pct: number | string; // Input as % (e.g., 5)
    costos_origen_eur: number | string;
    flete_maritimo_usd: number | string;
    recargos_destino_usd: number | string;
    tasa_seguro_pct: number | string; // Input as % (e.g., 1)
    honorarios_agente_aduana_usd: number | string;
    gastos_portuarios_otros_usd: number | string;
    transporte_nacional_clp: number | string;
    buffer_usd_clp_pct: number | string; // Input as % (e.g., 3)
    margen_adicional_pct: number | string; // Input as % (e.g., 20)
    derecho_advalorem_pct: number | string;
    iva_pct: number | string;
    descuento_cliente_pct: number | string; // Añadido
}

// Interfaz para agrupar resultados (refleja la respuesta del backend)
interface GroupedPruebaResults {
    costo_producto: {
        factorActualizacion?: number;
        costoFabricaActualizadoEUR?: number; // Renombrado
        costoFinalFabricaEUR_EXW?: number;
        tipoCambioEurUsdAplicado?: number;
        costoFinalFabricaUSD_EXW?: number;
    };
    logistica_seguro: { // NUEVA SECCIÓN
        costosOrigenUSD?: number;
        costoTotalFleteManejosUSD?: number;
        baseParaSeguroUSD?: number;
        primaSeguroUSD?: number;
        totalTransporteSeguroEXW_USD?: number;
    };
    // Re-añadir sección importacion
    importacion: {
        valorCIF_USD?: number;
        derechoAdvaloremUSD?: number;
        baseIvaImportacionUSD?: number;
        ivaImportacionUSD?: number;
        totalCostosImportacionDutyFeesUSD?: number;
    };
    // Añadir sección landed_cost
    landed_cost: {
        transporteNacionalUSD?: number;
        precioNetoCompraBaseUSD_LandedCost?: number;
    };
    // Añadir sección conversion_margen
    conversion_margen: {
        tipoCambioUsdClpAplicado?: number;
        precioNetoCompraBaseCLP?: number;
        margenCLP?: number;
        precioVentaNetoCLP?: number;
    };
    // Añadir sección precios_cliente
    precios_cliente: {
        precioNetoVentaFinalCLP?: number;
        ivaVentaCLP?: number;
        precioVentaTotalClienteCLP?: number;
    };
    // --- Secciones comentadas (importacion, landed_cost, etc.) --- 
    /*
    importacion: { ... };
    landed_cost: { ... };
    conversion_margen: { ... };
    precios_cliente: { ... };
    */
}

interface PruebaApiValues {
    tipo_cambio_usd_clp_actual?: number;
    tipo_cambio_eur_usd_actual?: number;
}

// Define default structure for a new profile (matching backend model, excluding _id, timestamps)
const defaultNewProfileData: Omit<CostoPerfilData, '_id' | 'createdAt' | 'updatedAt'> = {
  nombre_perfil: '',
  descripcion: '',
  descuento_fabrica_pct: 0,
  buffer_eur_usd_pct: 0,
  buffer_usd_clp_pct: 0,
  tasa_seguro_pct: 0,
  margen_adicional_pct: 0,
  descuento_cliente_pct: 0,
  costo_logistica_origen_eur: 0,
  flete_maritimo_usd: 0,
  recargos_destino_usd: 0,
  costo_agente_aduana_usd: 0,
  gastos_portuarios_otros_usd: 0,
  transporte_nacional_clp: 0,
  derecho_advalorem_pct: 0.06, // Default 6%
  iva_pct: 0.19, // Default 19%
};

export default function PerfilesPanel() {
  // Estados usando el nuevo tipo
  const [perfiles, setPerfiles] = useState<CostoPerfilData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [viewingProfile, setViewingProfile] = useState<CostoPerfilData | null>(null); 
  const [isViewModalOpen, setIsViewModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false); 
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null); 
  const navigate = useNavigate(); 

  // Estados relacionados con la carga/eliminación de perfiles específicos
  const [loadingViewProfile, setLoadingViewProfile] = useState<string | null>(null);
  const [viewError, setViewError] = useState<string | null>(null);
  const [deletingProfileId, setDeletingProfileId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // --- Estados para el modal de creación ---
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [newProfileData, setNewProfileData] = useState(defaultNewProfileData);
  const [isCreatingProfile, setIsCreatingProfile] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // --- Estados para la duplicación ---
  const [duplicatingProfileId, setDuplicatingProfileId] = useState<string | null>(null);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);

  // --- Estados para Divisas ---
  const [dolarValue, setDolarValue] = useState<{ value: number | null, fecha: string | null, last_update: string | null } | null>(null);
  const [euroValue, setEuroValue] = useState<{ value: number | null, fecha: string | null, last_update: string | null } | null>(null);
  const [loadingCurrencies, setLoadingCurrencies] = useState<boolean>(true);
  const [errorCurrencies, setErrorCurrencies] = useState<string | null>(null);

  // --- Estado para el modal de prueba ---
  const [isPruebaModalOpen, setIsPruebaModalOpen] = useState<boolean>(false);

  // --- Estados para Calculadora de Prueba ---
  const defaultPruebaInputs: PruebaInputs = {
      ano_cotizacion: new Date().getFullYear(),
      ano_en_curso: new Date().getFullYear(),
      costo_fabrica_original_eur: '',
      descuento_pct: '0',
      buffer_eur_usd_pct: '0',
      costos_origen_eur: '0',
      flete_maritimo_usd: '0',
      recargos_destino_usd: '0',
      tasa_seguro_pct: '0',
      honorarios_agente_aduana_usd: '0',
      gastos_portuarios_otros_usd: '0',
      transporte_nacional_clp: '0',
      buffer_usd_clp_pct: '0',
      margen_adicional_pct: '0',
      derecho_advalorem_pct: '6',
      iva_pct: '19',
      descuento_cliente_pct: '0', // Default para nuevo campo
  };
  const [pruebaInputs, setPruebaInputs] = useState<PruebaInputs>(defaultPruebaInputs);
  const [pruebaResults, setPruebaResults] = useState<GroupedPruebaResults | null>(null);
  const [pruebaInputValuesUsed, setPruebaInputValuesUsed] = useState<any | null>(null);
  const [pruebaApiValues, setPruebaApiValues] = useState<PruebaApiValues | null>(null);
  const [isCalculatingPrueba, setIsCalculatingPrueba] = useState<boolean>(false);
  const [pruebaError, setPruebaError] = useState<string | null>(null);
  const [selectedProfileIdForPrueba, setSelectedProfileIdForPrueba] = useState<string>('');

  // --- Función para cargar perfiles ---
  const loadPerfiles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('[PerfilesPanel] Cargando perfiles...');
      const fetchedPerfiles = await api.fetchAllProfiles(); 
      setPerfiles(fetchedPerfiles);
      console.log(`[PerfilesPanel] ${fetchedPerfiles.length} perfiles cargados.`);
    } catch (err) {
      console.error('[PerfilesPanel] Error cargando perfiles:', err);
      setError('Error al cargar los perfiles. Intente de nuevo.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadCurrencyData = useCallback(async () => {
    setLoadingCurrencies(true);
    setErrorCurrencies(null);
    try {
      console.log('[PerfilesPanel] Cargando valores de divisas...');
      const [dolarRes, euroRes] = await Promise.all([
        api.getDollarValue().catch((err: any) => ({ error: true, data: err })),
        api.getEuroValue().catch((err: any) => ({ error: true, data: err }))
      ]);

      let fetchError = false;

      if (dolarRes && !dolarRes.error) {
        setDolarValue({ ...dolarRes, value: parseFloat(dolarRes.value) }); // Convertir a número
      } else {
        console.error('[PerfilesPanel] Error cargando valor Dólar:', dolarRes?.data);
        setErrorCurrencies('Error al cargar valor Dólar.');
        fetchError = true;
      }

      if (euroRes && !euroRes.error) {
         setEuroValue({ ...euroRes, value: parseFloat(euroRes.value) }); // Convertir a número
      } else {
         console.error('[PerfilesPanel] Error cargando valor Euro:', euroRes?.data);
         // Añadir al mensaje de error si ya había uno
         setErrorCurrencies(prev => prev ? `${prev} Error al cargar valor Euro.` : 'Error al cargar valor Euro.');
         fetchError = true;
      }

      if (!fetchError) {
         console.log('[PerfilesPanel] Valores de divisas cargados.');
      }

    } catch (err: any) {
      console.error('[PerfilesPanel] Error general cargando divisas:', err);
      setErrorCurrencies('Error inesperado al cargar divisas.');
    } finally {
      setLoadingCurrencies(false);
    }
  }, []);

  useEffect(() => {
    loadPerfiles();
    loadCurrencyData();
  }, [loadPerfiles, loadCurrencyData]);

  // --- Handlers para Modales y Acciones ---
  const handleViewProfile = async (profileId: string) => {
    setLoadingViewProfile(profileId);
    setViewError(null);
    try {
        const profileDataFromApi = await api.fetchProfileData(profileId);
        if (profileDataFromApi) {
            setViewingProfile(profileDataFromApi); 
            setIsViewModalOpen(true);
        } else {
            setViewError('No se pudo encontrar el perfil seleccionado.');
        }
    } catch (err) {
        setViewError('Error al cargar los detalles del perfil.');
    } finally {
        setLoadingViewProfile(null);
    }
  };
  
  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setViewingProfile(null);
  };

  const handleOpenEditModal = (profileId: string) => {
    setEditingProfileId(profileId);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setEditingProfileId(null);
    setIsEditModalOpen(false);
    loadPerfiles();
  };

  const handleDeleteProfile = async (profileId: string) => {
      const profileToDelete = perfiles.find(p => p._id === profileId);
      const profileName = profileToDelete?.nombre_perfil || profileId; 
      
      if (window.confirm(`¿Está seguro que desea eliminar el perfil "${profileName}"? Esta acción no se puede deshacer.`)) {
          setDeletingProfileId(profileId);
          setDeleteError(null);
          try {
              console.log(`[PerfilesPanel] Eliminando perfil ID: ${profileId}`);
              await api.deleteProfile(profileId); 
              console.log(`Perfil ${profileId} eliminado exitosamente desde la API.`);
              setPerfiles(prevPerfiles => prevPerfiles.filter(p => p._id !== profileId));
          } catch (err) {
              console.error(`[PerfilesPanel] Error deleting profile ${profileId}:`, err);
              setDeleteError('No se pudo eliminar el perfil. Verifique la consola para más detalles.');
          } finally {
              setDeletingProfileId(null);
          }
      }
  };
  
  // --- Funciones para el Modal de Creación ---
  const handleOpenCreateModal = () => {
    setNewProfileData(defaultNewProfileData); // Resetear formulario al abrir
    setCreateError(null); // Limpiar errores previos
    setIsCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    if (isCreatingProfile) return; // No cerrar si está creando
    setIsCreateModalOpen(false);
  };

  // Handler genérico para los inputs del formulario de creación
  const handleNewProfileDataChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = event.target;

    setNewProfileData(prev => {
        let processedValue: string | number = value;

        // Convertir porcentajes (espera ej. 10 para 10%) a decimal (0.10)
        if (name.endsWith('_pct')) {
            const num = parseFloat(value);
            processedValue = isNaN(num) ? 0 : num / 100;
        } 
        // Convertir otros campos numéricos
        else if (type === 'number' && name !== 'nombre_perfil' && name !== 'descripcion') {
            const num = parseFloat(value);
            processedValue = isNaN(num) ? 0 : num;
        }
        // Mantener string para nombre y descripción
        else if (name === 'nombre_perfil' || name === 'descripcion') {
            processedValue = value;
        }

        return { ...prev, [name]: processedValue };
    });
  };
  
  // --- Modificada función handleCreateProfile (se llama desde el modal) ---
  const handleConfirmCreateProfile = async () => {
      // Validar nombre
      if (!newProfileData.nombre_perfil.trim()) {
          setCreateError('El nombre del perfil no puede estar vacío.');
          return;
      }
      // Validación básica de números (podría ser más robusta)
      const numericFields: (keyof typeof newProfileData)[] = [
          'descuento_fabrica_pct', 'buffer_eur_usd_pct', 'buffer_usd_clp_pct',
          'tasa_seguro_pct', 'margen_adicional_pct', 'descuento_cliente_pct',
          'costo_logistica_origen_eur', 'flete_maritimo_usd', 'recargos_destino_usd',
          'costo_agente_aduana_usd', 'gastos_portuarios_otros_usd', 'transporte_nacional_clp',
          'derecho_advalorem_pct', 'iva_pct'
      ];
      for (const field of numericFields) {
          if (typeof newProfileData[field] !== 'number' || isNaN(newProfileData[field] as number)) {
              setCreateError(`Valor inválido para ${field}. Asegúrate de ingresar números.`);
              return;
          }
      }

      setIsCreatingProfile(true);
      setCreateError(null);
      try {
          console.log(`[PerfilesPanel] Creando nuevo perfil con datos:`, newProfileData);
          
          // Enviar los datos recolectados del estado
          const newProfile = await api.createProfile(newProfileData);
          console.log('[PerfilesPanel] Nuevo perfil creado:', newProfile);

          if (newProfile && newProfile._id) {
              setIsCreateModalOpen(false); // Cerrar modal
              loadPerfiles(); // Recargar la lista de perfiles
              // Opcional: Redirigir a editar si se desea ajustar inmediatamente
              // navigate(`/perfiles/${newProfile._id}/editar`); 
          } else {
              console.error('[PerfilesPanel] La respuesta de creación no contiene un ID:', newProfile);
              setCreateError('Error: No se recibió el ID del nuevo perfil.');
          }
      } catch (err: any) {
          console.error('[PerfilesPanel] Error creando perfil:', err);
          const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Error al crear el perfil. Intente de nuevo.';
          // Mostrar error específico de duplicado si es el caso
          if (errorMessage.includes('E11000') && errorMessage.includes('nombre_perfil')) { 
             setCreateError('Error: Ya existe un perfil con ese nombre.');
          } else {
             setCreateError(`Error al crear el perfil: ${errorMessage}`);
          }
      } finally {
          setIsCreatingProfile(false);
      }
  };

  // --- Handlers para Modal Prueba ---
  const handleOpenPruebaModal = () => {
    setPruebaResults(null);
    setPruebaError(null);
    setPruebaInputValuesUsed(null);
    setSelectedProfileIdForPrueba('');
    setPruebaInputs(defaultPruebaInputs);
    setIsPruebaModalOpen(true);
  };

  const handleClosePruebaModal = () => {
    if (isCalculatingPrueba) return;
    setIsPruebaModalOpen(false);
  };

  const handlePruebaInputChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setPruebaInputs(prev => ({
        ...prev,
        [name]: value,
    }));
  };

  // --- Handler para Selección de Perfil en Prueba ---
  const handleProfileSelectForPrueba = (event: SelectChangeEvent<string>) => {
      const profileId = event.target.value as string;
      setSelectedProfileIdForPrueba(profileId);
      setPruebaResults(null);
      setPruebaApiValues(null);
      setPruebaError(null);

      if (profileId) {
          const selectedProfile = perfiles.find(p => p._id === profileId);
          if (selectedProfile) {
              setPruebaInputs(prev => ({
                  ...prev,
                  descuento_pct: ((selectedProfile.descuento_fabrica_pct ?? 0) * 100).toString(),
                  buffer_eur_usd_pct: ((selectedProfile.buffer_eur_usd_pct ?? 0) * 100).toString(),
                  costos_origen_eur: (selectedProfile.costo_logistica_origen_eur ?? 0).toString(),
                  flete_maritimo_usd: (selectedProfile.flete_maritimo_usd ?? 0).toString(),
                  recargos_destino_usd: (selectedProfile.recargos_destino_usd ?? 0).toString(),
                  tasa_seguro_pct: ((selectedProfile.tasa_seguro_pct ?? 0) * 100).toString(),
                  honorarios_agente_aduana_usd: (selectedProfile.costo_agente_aduana_usd ?? 0).toString(),
                  gastos_portuarios_otros_usd: (selectedProfile.gastos_portuarios_otros_usd ?? 0).toString(),
                  transporte_nacional_clp: (selectedProfile.transporte_nacional_clp ?? 0).toString(),
                  buffer_usd_clp_pct: ((selectedProfile.buffer_usd_clp_pct ?? 0) * 100).toString(),
                  margen_adicional_pct: ((selectedProfile.margen_adicional_pct ?? 0) * 100).toString(),
                  derecho_advalorem_pct: ((selectedProfile.derecho_advalorem_pct ?? 0.06) * 100).toString(),
                  iva_pct: ((selectedProfile.iva_pct ?? 0.19) * 100).toString(),
                  descuento_cliente_pct: ((selectedProfile.descuento_cliente_pct ?? 0) * 100).toString(), // Añadir nuevo campo
              }));
          } else {
              setPruebaInputs(prev => ({ ...defaultPruebaInputs, ano_cotizacion: prev.ano_cotizacion, ano_en_curso: prev.ano_en_curso, costo_fabrica_original_eur: prev.costo_fabrica_original_eur }));
          }
      } else {
          setPruebaInputs(prev => ({ ...defaultPruebaInputs, ano_cotizacion: prev.ano_cotizacion, ano_en_curso: prev.ano_en_curso, costo_fabrica_original_eur: prev.costo_fabrica_original_eur }));
      }
  };

  // --- Handler para Calcular Prueba (Corregir parseFloat) ---
  const handleCalculatePrueba = async () => {
      setPruebaError(null);
      setPruebaResults(null);
      setPruebaApiValues(null);
      setPruebaInputValuesUsed(null); 
      setIsCalculatingPrueba(true);

      // Obtener tasas de cambio actuales del estado
      const currentEurUsdRate = eurUsdRate;
      const currentUsdClpRateValue = dolarValue?.value; // Obtener el número directamente

      if (!currentEurUsdRate || currentUsdClpRateValue === null || currentUsdClpRateValue === undefined) {
          setPruebaError("No se pudieron obtener las tasas de cambio actuales.");
          setIsCalculatingPrueba(false);
          return;
      }
      // *** CORRECCIÓN LINTER: No necesitamos parseFloat si ya es número ***
      const numCurrentUsdClpRate = currentUsdClpRateValue; 
      // if (isNaN(numCurrentUsdClpRate)) { // Esta validación ya no es necesaria si viene como número
      //     setPruebaError("El valor actual de USD/CLP no es válido.");
      //     setIsCalculatingPrueba(false);
      //     return;
      // }

      let payload: any = {};
      let inputError = false;
      let endpoint = '/api/costo-perfiles/calcular-prueba'; // Default endpoint
      let responseStructureProcessor: (data: any) => { inputs: any, calculados: GroupedPruebaResults } | null;

      const isInProfileMode = !!selectedProfileIdForPrueba;

      if (!isInProfileMode) { // Modo Manual
          endpoint = '/api/costo-perfiles/calcular-prueba';
          const requiredKeys = [
              'ano_cotizacion', 'ano_en_curso', 'costo_fabrica_original_eur',
              'buffer_eur_usd_pct', 'descuento_pct'
          ];
          const numberInputs: any = {};

          for (const key of requiredKeys) { 
              // ... (validación inputs manuales como antes) ...
              const value = pruebaInputs[key as keyof PruebaInputs];
              if (value === undefined || value === '') {
                  setPruebaError(`Falta el valor para ${key.replace(/_/g, ' ')} en modo manual.`);
                  inputError = true;
                  break;
              }
              const numValue = parseFloat(value as string);
              if (isNaN(numValue)) {
                  setPruebaError(`Valor inválido para ${key.replace(/_/g, ' ')} en modo manual: ${value}`);
                  inputError = true;
                  break;
              }
              numberInputs[key] = numValue;
          }
          if (inputError) { setIsCalculatingPrueba(false); return; }

          payload = {
              anoCotizacion: numberInputs.ano_cotizacion,
              anoEnCurso: numberInputs.ano_en_curso,
              costoFabricaOriginalEUR: numberInputs.costo_fabrica_original_eur,
              tipoCambioEurUsdActual: currentEurUsdRate, // TC Actual para que backend aplique buffer
              bufferEurUsd: numberInputs.buffer_eur_usd_pct / 100, // Convertir % a decimal
              descuentoFabrica: numberInputs.descuento_pct / 100 // Convertir % a decimal
          };
          // Define cómo procesar la respuesta de /calcular-prueba
          responseStructureProcessor = (data) => data?.resultado; 

      } else { // Modo Perfil -> Usar endpoint /calcular-producto
          endpoint = '/api/costo-perfiles/calcular-producto'; 
          // Validar inputs manuales requeridos (años, costo)
          const numAnoCotizacion = parseFloat(pruebaInputs.ano_cotizacion as string);
          const numAnoEnCurso = parseFloat(pruebaInputs.ano_en_curso as string);
          const numCostoFabrica = parseFloat(pruebaInputs.costo_fabrica_original_eur as string);

          if (isNaN(numAnoCotizacion) || isNaN(numAnoEnCurso) || isNaN(numCostoFabrica) || numCostoFabrica <= 0) {
              setPruebaError("Ingrese Año Cotización, Año en Curso y Costo Fábrica válidos.");
              inputError = true;
          }
          if (inputError) { setIsCalculatingPrueba(false); return; }

          // Payload para /calcular-producto
          payload = {
              profileId: selectedProfileIdForPrueba, // ID del perfil
              anoCotizacion: numAnoCotizacion,
              anoEnCurso: numAnoEnCurso,
              costoFabricaOriginalEUR: numCostoFabrica,
              tipoCambioEurUsdActual: currentEurUsdRate // TC Actual
          };
          // Define cómo procesar la respuesta de /calcular-producto
          responseStructureProcessor = (data) => data?.resultado; // También tiene inputs y calculados anidados
      }

      try {
          console.log(`Enviando payload a ${endpoint}:`, payload);
          // El tipo de respuesta es el mismo: { message?, perfilUsado?, resultado: { inputs, calculados } }
          const response = await axios.post<any>(endpoint, payload);

          // Usar el procesador definido para extraer inputs y calculados
          const processedResult = responseStructureProcessor(response.data);

          if (processedResult && processedResult.calculados && processedResult.inputs) {
              setPruebaResults(processedResult.calculados);
              setPruebaInputValuesUsed(processedResult.inputs);
              setPruebaApiValues({
                  tipo_cambio_usd_clp_actual: numCurrentUsdClpRate, 
                  tipo_cambio_eur_usd_actual: currentEurUsdRate
              });
          } else {
              throw new Error("La respuesta del servidor no contiene inputs y calculados válidos.");
          }
      } catch (err: any) {
          console.error(`Error calculando prueba (${endpoint}):`, err);
          const message = err.response?.data?.message || err.message || "Error desconocido al calcular.";
          setPruebaError(message);
      } finally {
          setIsCalculatingPrueba(false);
      }
  };

  // --- Calcular tipo de cambio --- 
  const eurUsdRate = (dolarValue?.value && euroValue?.value && dolarValue.value !== 0)
     ? euroValue.value / dolarValue.value
     : null;

  // --- Styles (definiciones de estilo omitidas por brevedad) ---
  const gridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' };
  const cardStyle: React.CSSProperties = { border: '1px solid #e2e8f0', borderRadius: '8px', padding: '15px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', backgroundColor: 'white' };
  const cardTitleStyle: React.CSSProperties = { fontSize: '16px', fontWeight: '600', marginBottom: '5px' };
  const cardDateStyle: React.CSSProperties = { fontSize: '12px', color: '#64748b', marginBottom: '10px' };
  const cardDescriptionStyle: React.CSSProperties = { fontSize: '14px', color: '#475569', marginBottom: '15px', minHeight: '30px' };
  const cardActionsStyle: React.CSSProperties = { display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '10px', marginTop: 'auto' };
  const iconButtonStyle: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', padding: '5px', color: '#475569' };
  const loadingErrorStyle: React.CSSProperties = { textAlign: 'center', padding: '30px', color: '#64748b' };
  const modalStyle = {
    position: 'absolute' as 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '90%',
    maxWidth: 600,
    bgcolor: 'background.paper',
    border: '1px solid #ccc',
    borderRadius: '8px',
    boxShadow: 24,
    p: 4,
    maxHeight: '85vh',
    overflowY: 'auto',
  };
  const currencyBoxStyle: React.CSSProperties = { padding: '15px', marginBottom: '20px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: 'white' };
  const currencyItemStyle: React.CSSProperties = { textAlign: 'center' };
  const currencyValueStyle: React.CSSProperties = { fontSize: '20px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' };
  const currencyValueStyleSecondary: React.CSSProperties = { ...currencyValueStyle, fontSize: '18px', color: '#4b5563' };
  const currencyLabelStyle: React.CSSProperties = { fontSize: '12px', color: '#64748b', marginTop: '4px' };

  // Helper para renderizar sección de resultados
  const renderResultSection = (title: string, results: Record<string, number | undefined> | undefined, sectionLabels: Record<string, string>) => {
      if (!results || Object.keys(results).length === 0) return null;
      return (
          <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>{title}</Typography>
              <Grid container spacing={0.5}> {/* Menos espacio entre líneas de resultado */} 
                  {Object.entries(results).map(([key, value]) => {
                      const label = sectionLabels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                      let formattedValue = '--';
                      if (typeof value === 'number') {
                          // Specific formatting for calculated exchange rate
                          if (key === 'tipoCambioEurUsdAplicado') {
                              formattedValue = value.toFixed(6); 
                          } 
                          // Existing formatting logic for other keys
                          else if (key.endsWith('_eur')) formattedValue = formatGenericCurrency(value, 'EUR', 4);
                          else if (key.endsWith('_usd')) formattedValue = formatGenericCurrency(value, 'USD', 4);
                          else if (key.endsWith('_clp')) formattedValue = formatCLP(value);
                          else if (key.includes('_pct') || key.startsWith('tasa_') || key.startsWith('factor_')) formattedValue = formatPercentDisplay(value, 4);
                          // Removed the general tipo_cambio check as it's now handled specifically
                          // else if (key.includes('tipo_cambio')) formattedValue = value.toFixed(6);
                          else formattedValue = value.toLocaleString('es-CL', { maximumFractionDigits: 4 }); // Increased default decimals slightly
                      }
                      return (
                          <React.Fragment key={key}>
                              <Grid item xs={7}><Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{label}:</Typography></Grid>
                              <Grid item xs={5}><Typography variant="body2" align="right" sx={{ fontWeight: '500', fontSize: '0.8rem' }}>{formattedValue}</Typography></Grid>
                          </React.Fragment>
                      );
                  })}
              </Grid>
              <Divider sx={{ my: 1 }} />
          </Box>
      );
  };

  // Labels para resultados (para mejor visualización)
  const resultLabels = {
      costo_producto: {
          factorActualizacion: "Factor Actualización",
          costoFabricaActualizadoEUR: "Costo Fáb. Act. EUR (Antes Desc.)",
          costoFinalFabricaEUR_EXW: "Costo Final Fáb. EUR (EXW)",
          tipoCambioEurUsdAplicado: "TC EUR/USD Aplicado",
          costoFinalFabricaUSD_EXW: "Costo Final Fáb. USD (EXW)",
      },
      logistica_seguro: { // NUEVAS ETIQUETAS
          costosOrigenUSD: "Costos en Origen (USD)",
          costoTotalFleteManejosUSD: "Costo Total Flete y Manejos (USD)",
          baseParaSeguroUSD: "Base para Seguro (CFR Aprox - USD)",
          primaSeguroUSD: "Prima Seguro (USD)",
          totalTransporteSeguroEXW_USD: "Total Transporte y Seguro EXW (USD)",
      },
      // Re-añadir sección importacion
      importacion: {
        valorCIF_USD: "Valor CIF (USD)",
        derechoAdvaloremUSD: "Derecho AdValorem (USD)",
        baseIvaImportacionUSD: "Base IVA Importación (USD)",
        ivaImportacionUSD: "IVA Importación (USD)", // Usamos etiqueta aunque no esté en total
        totalCostosImportacionDutyFeesUSD: "Total Costos Imp. (Duty+Fees) (USD)",
      },
      // Añadir sección landed_cost
      landed_cost: {
          transporteNacionalUSD: "Transporte Nacional (USD)",
          precioNetoCompraBaseUSD_LandedCost: "Precio Neto Compra Base (USD) - Landed Cost",
      },
      // Añadir sección conversion_margen
      conversion_margen: {
          tipoCambioUsdClpAplicado: "Tipo Cambio USD/CLP Aplicado",
          precioNetoCompraBaseCLP: "Precio Neto Compra Base (CLP)",
          margenCLP: "Margen (CLP)",
          precioVentaNetoCLP: "Precio Venta Neto (CLP)",
      },
      // Añadir sección precios_cliente
      precios_cliente: {
          precioNetoVentaFinalCLP: "Precio Neto Venta Final (CLP)",
          ivaVentaCLP: "IVA Venta (19%) (CLP)",
          precioVentaTotalClienteCLP: "Precio Venta Total Cliente (CLP)",
      }
      // --- Secciones comentadas --- 
      /*
      importacion: { 
        valorCIF_USD: "Valor CIF (USD)",
        derechoAdvaloremUSD: "Derecho AdValorem (USD)",
        baseIvaImportacionUSD: "Base IVA Importación (USD)",
        ivaImportacionUSD: "IVA Importación (USD)",
        totalCostosImportacionDutyFeesUSD: "Total Costos Imp. (Duty+Fees) (USD)",
      }
      */
      // --- Secciones comentadas --- 
      /* ... */
  };

  // Helper para renderizar campos de texto en el modal de creación
  const renderCreateTextField = (
      name: keyof typeof newProfileData,
      label: string,
      type: 'text' | 'number' | 'textarea' = 'number',
      required: boolean = false,
      adornment?: string,
      helperText?: string,
      gridProps: { xs?: number, sm?: number } = { xs: 12, sm: 6 } // Default grid props
  ) => {
      let value: string | number = '';
      const rawValue = newProfileData[name];

      // Formatear para visualización
      if (name.endsWith('_pct') && typeof rawValue === 'number') {
          value = (rawValue * 100).toString(); // Mostrar como 0-100
      } else if (typeof rawValue === 'number') {
          value = rawValue.toString();
      } else if (typeof rawValue === 'string') {
          value = rawValue;
      }

      return (
          <Grid item {...gridProps}>
              <TextField
                  fullWidth
                  variant="outlined"
                  margin="dense" // Usar dense para modal
                  label={label}
                  name={name}
                  type={type === 'textarea' ? 'text' : type}
                  multiline={type === 'textarea'}
                  rows={type === 'textarea' ? 3 : undefined}
                  value={value}
                  onChange={handleNewProfileDataChange}
                  required={required}
                  InputProps={adornment ? {
                      [adornment === '%' ? 'endAdornment' : 'startAdornment']: <InputAdornment position={adornment === '%' ? 'end' : 'start'}>{adornment}</InputAdornment>,
                  } : undefined}
                  InputLabelProps={{
                      shrink: true,
                  }}
                  inputProps={{
                      step: type === 'number' ? (name.endsWith('_pct') ? '0.1' : 'any') : undefined
                  }}
                  helperText={helperText}
                  disabled={isCreatingProfile}
                  size="small" // Usar tamaño pequeño en modales
              />
          </Grid>
      );
  };

  // --- Handler para Duplicar Perfil ---
  const handleDuplicateProfile = async (profileId: string) => {
    setDuplicatingProfileId(profileId);
    setDuplicateError(null);
    try {
        console.log(`[PerfilesPanel] Duplicando perfil ID: ${profileId}`);
        const profileToDuplicate = perfiles.find(p => p._id === profileId);
        if (!profileToDuplicate) {
            throw new Error('Perfil no encontrado para duplicar');
        }

        // Create the new object for the API call, explicitly picking properties
        const profileDataForSubmission: Omit<CostoPerfilData, '_id' | 'createdAt' | 'updatedAt'> = {
            nombre_perfil: `Copia de ${profileToDuplicate.nombre_perfil}`,
            descripcion: `Copia de ${profileToDuplicate.descripcion}`,
            // Copy all other relevant fields from the original profile
            descuento_fabrica_pct: profileToDuplicate.descuento_fabrica_pct,
            buffer_eur_usd_pct: profileToDuplicate.buffer_eur_usd_pct,
            buffer_usd_clp_pct: profileToDuplicate.buffer_usd_clp_pct,
            tasa_seguro_pct: profileToDuplicate.tasa_seguro_pct,
            margen_adicional_pct: profileToDuplicate.margen_adicional_pct,
            descuento_cliente_pct: profileToDuplicate.descuento_cliente_pct,
            costo_logistica_origen_eur: profileToDuplicate.costo_logistica_origen_eur,
            flete_maritimo_usd: profileToDuplicate.flete_maritimo_usd,
            recargos_destino_usd: profileToDuplicate.recargos_destino_usd,
            costo_agente_aduana_usd: profileToDuplicate.costo_agente_aduana_usd,
            gastos_portuarios_otros_usd: profileToDuplicate.gastos_portuarios_otros_usd,
            transporte_nacional_clp: profileToDuplicate.transporte_nacional_clp,
            derecho_advalorem_pct: profileToDuplicate.derecho_advalorem_pct,
            iva_pct: profileToDuplicate.iva_pct,
        };

        const newCreatedProfile = await api.createProfile(profileDataForSubmission);
        console.log(`Perfil ${profileId} duplicado exitosamente desde la API.`, newCreatedProfile);
        loadPerfiles();
    } catch (err) {
        console.error(`[PerfilesPanel] Error duplicando perfil ${profileId}:`, err);
        setDuplicateError('No se pudo duplicar el perfil. Verifique la consola para más detalles.');
    } finally {
        setDuplicatingProfileId(null);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      
       {/* --- Sección Indicadores de Divisas --- */}
       <Paper elevation={0} sx={currencyBoxStyle}>
         <Grid container spacing={2} alignItems="center">
           {loadingCurrencies && (
             <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50px' }}>
               <CircularProgress size={24} />
               <Typography variant="body2" sx={{ ml: 1 }}>Cargando divisas...</Typography>
             </Grid>
           )}
           {errorCurrencies && !loadingCurrencies && (
              <Grid item xs={12}>
                 <Alert severity="warning" action={
                    <Tooltip title="Recargar divisas">
                       <Button color="inherit" size="small" onClick={loadCurrencyData}>
                          <RefreshCw size={16} />
                       </Button>
                    </Tooltip>
                 }>{errorCurrencies}</Alert>
              </Grid>
           )}
           {!loadingCurrencies && !errorCurrencies && (
             <>
               <Grid item xs={12} sm={4} sx={currencyItemStyle}>
                   <Typography sx={currencyValueStyleSecondary}>{formatCLP(dolarValue?.value)}</Typography>
                   <Typography sx={currencyLabelStyle}>Dólar Observado (CLP)</Typography>
               </Grid>
               <Grid item xs={12} sm={4} sx={currencyItemStyle}>
                  <Typography sx={currencyValueStyle}>{formatExchangeRate(eurUsdRate)}</Typography>
                  <Typography sx={currencyLabelStyle}>Tipo Cambio EUR/USD</Typography>
               </Grid>
               <Grid item xs={12} sm={4} sx={currencyItemStyle}>
                   <Typography sx={currencyValueStyleSecondary}>{formatCLP(euroValue?.value)}</Typography>
                   <Typography sx={currencyLabelStyle}>Euro Observado (CLP)</Typography>
               </Grid>
             </>
           )}
         </Grid>
       </Paper>

      {/* --- Sección Título y Crear --- */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
           <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Gestión de Perfiles de Costos</h1>
           <Stack direction="row" spacing={2}>
             <Button
               variant="contained"
               color="success"
               startIcon={<PlusCircle size={18} />}
               onClick={handleOpenCreateModal}
               disabled={isCreatingProfile}
             >
               Crear Perfil
             </Button>
             <Button
               variant="outlined"
               color="secondary"
               onClick={handleOpenPruebaModal}
             >
               Prueba
             </Button>
           </Stack>
       </div>

      {/* --- Mensaje Global de Error/Carga Perfiles --- */}
       {isLoading && !error && (
          <div style={loadingErrorStyle}>
              <Loader2 size={24} className="animate-spin" style={{ marginBottom: '12px' }}/>
              Cargando perfiles...
          </div>
      )}
       {error && (
          <div style={{...loadingErrorStyle, color: '#DC2626'}}>
              <AlertTriangle size={24} style={{ marginBottom: '12px' }}/>
              {error}
          </div>
      )}

      {/* --- Lista de Perfiles --- */}
       {!isLoading && !error && perfiles.length === 0 && (
          <div style={loadingErrorStyle}>No se encontraron perfiles. Crea uno nuevo para empezar.</div>
       )}
       {!isLoading && !error && perfiles.length > 0 && (
        <div style={gridStyle}>
          {perfiles.map((perfil: CostoPerfilData) => (
            <div key={perfil._id} style={cardStyle}>
              <div> 
                <h2 style={cardTitleStyle}>{perfil.nombre_perfil || perfil._id}</h2> 
                {perfil.createdAt && (
                    <p style={cardDateStyle}>
                        Creado: {(() => {
                            try {
                                return new Date(perfil.createdAt).toLocaleDateString('es-CL');
                            } catch { return 'Fecha inválida'; }
                        })()}
                    </p>
                )}
                {perfil.descripcion && (
                  <p style={cardDescriptionStyle}>{perfil.descripcion}</p>
                )}
                {!perfil.descripcion && <div style={{minHeight: '30px'}}></div>} 
              </div>
              <div style={cardActionsStyle}>
                <button 
                  onClick={() => handleViewProfile(perfil._id)} 
                  style={iconButtonStyle} 
                  title="Ver Detalles"
                  disabled={loadingViewProfile === perfil._id} 
                >
                  {loadingViewProfile === perfil._id ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />}
                </button>
                <button 
                  onClick={() => handleOpenEditModal(perfil._id)} 
                  style={iconButtonStyle} 
                  title="Editar Perfil"
                >
                  <Edit size={16} />
                </button>
                <button 
                  onClick={() => handleDuplicateProfile(perfil._id)} 
                  style={iconButtonStyle} 
                  title="Duplicar Perfil"
                  disabled={duplicatingProfileId === perfil._id} 
                >
                  {duplicatingProfileId === perfil._id ? <Loader2 size={16} className="animate-spin" /> : <Copy size={16} />}
                </button>
                <button 
                  onClick={() => handleDeleteProfile(perfil._id)} 
                  style={{...iconButtonStyle, color: '#dc2626'}} 
                  title="Eliminar Perfil"
                  disabled={deletingProfileId === perfil._id} 
                >
                  {deletingProfileId === perfil._id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                </button>
              </div>
              {deleteError && deletingProfileId === perfil._id && (
                  <p style={{ color: '#DC2626', fontSize: '12px', marginTop: '5px' }}>{deleteError}</p>
              )}
              {duplicateError && duplicatingProfileId === perfil._id && (
                  <p style={{ color: '#DC2626', fontSize: '12px', marginTop: '5px' }}>{duplicateError}</p>
              )}
            </div>
          ))}
        </div>
      )}

       {/* --- Modales (Crear, Ver, Editar) --- */}
       <Dialog open={isCreateModalOpen} onClose={handleCloseCreateModal} aria-labelledby="create-profile-dialog-title" maxWidth="md" fullWidth>
         <DialogTitle id="create-profile-dialog-title">Crear Nuevo Perfil de Costo</DialogTitle>
         <DialogContent>
            {createError && <Alert severity="error" sx={{ mb: 2 }}>{createError}</Alert>}
            <DialogContentText sx={{ mb: 2 }}>
             Completa los siguientes campos para definir el nuevo perfil de costo.
           </DialogContentText>

            {/* Formulario de Creación */}
            <Grid container spacing={2}> 
                {renderCreateTextField('nombre_perfil', 'Nombre del Perfil', 'text', true, undefined, undefined, { xs: 12, sm: 6 })} 
                {renderCreateTextField('descripcion', 'Descripción (Opcional)', 'textarea', false, undefined, undefined, { xs: 12, sm: 6 })}

                <Grid item xs={12}><Divider sx={{ my: 1 }}>Descuentos y Buffers (%)</Divider></Grid>
                {renderCreateTextField('descuento_fabrica_pct', 'Desc. Fábrica (%)', 'number', false, '%', 'Ej: 10 para 10%')}
                {renderCreateTextField('descuento_cliente_pct', 'Desc. Cliente Final (%)', 'number', false, '%', 'Ej: 5 para 5%')}
                {renderCreateTextField('buffer_eur_usd_pct', 'Buffer EUR/USD (%)', 'number', false, '%', 'Ej: 3 para 3%')}
                {renderCreateTextField('buffer_usd_clp_pct', 'Buffer USD/CLP (%)', 'number', false, '%', 'Ej: 2 para 2%')}
                {renderCreateTextField('margen_adicional_pct', '% Adicional Total (Margen)', 'number', false, '%', 'Ej: 25 para 25%')}
                {renderCreateTextField('tasa_seguro_pct', 'Tasa Seguro (%)', 'number', false, '%', 'Ej: 0.5 para 0.5%')}

                <Grid item xs={12}><Divider sx={{ my: 1 }}>Costos Operacionales (Valores)</Divider></Grid>
                {renderCreateTextField('costo_logistica_origen_eur', 'Costo Origen (EUR)', 'number', false, '€')}
                {renderCreateTextField('flete_maritimo_usd', 'Flete Marítimo (USD)', 'number', false, '$')}
                {renderCreateTextField('recargos_destino_usd', 'Recargos Destino (USD)', 'number', false, '$')}
                {renderCreateTextField('costo_agente_aduana_usd', 'Costo Ag. Aduana (USD)', 'number', false, '$')}
                {renderCreateTextField('gastos_portuarios_otros_usd', 'Gastos Puerto/Otros (USD)', 'number', false, '$')}
                {renderCreateTextField('transporte_nacional_clp', 'Transporte Nacional (CLP)', 'number', false, '$')}

                <Grid item xs={12}><Divider sx={{ my: 1 }}>Impuestos (%)</Divider></Grid>
                {renderCreateTextField('derecho_advalorem_pct', 'Derecho AdValorem (%)', 'number', false, '%', 'Default: 6')}
                {renderCreateTextField('iva_pct', 'IVA (%)', 'number', false, '%', 'Default: 19')}
            </Grid>
         </DialogContent>
         <DialogActions sx={{ p: '16px 24px' }}>
           <Button onClick={handleCloseCreateModal} disabled={isCreatingProfile} color="secondary">Cancelar</Button>
           <Button 
             onClick={handleConfirmCreateProfile} 
             disabled={isCreatingProfile} // Podríamos añadir validación más estricta aquí
             variant="contained"
             startIcon={isCreatingProfile ? <CircularProgress size={20} color="inherit" /> : null}
           >
             {isCreatingProfile ? 'Creando...' : 'Guardar Perfil'}
           </Button>
         </DialogActions>
       </Dialog>

       <ViewProfileModal 
           isOpen={isViewModalOpen} 
           onClose={handleCloseViewModal} 
           profileData={viewingProfile}
           error={viewError}
       />
       
       {isEditModalOpen && editingProfileId && (
           <Modal open={isEditModalOpen} onClose={handleCloseEditModal} aria-labelledby="edit-profile-modal-title">
               <Box sx={modalStyle}>
                   <h2 id="edit-profile-modal-title">Editar Perfil</h2>
                   <PerfilEditForm profileId={editingProfileId} onSaveSuccess={handleCloseEditModal} onCancel={handleCloseEditModal} />
               </Box>
           </Modal>
       )}

       {/* --- Modal de Prueba (Reestructurado) --- */}
       <Modal
         open={isPruebaModalOpen}
         onClose={handleClosePruebaModal}
         aria-labelledby="prueba-modal-title"
       >
         <Box sx={{
             position: 'absolute',
             top: '50%',
             left: '50%',
             transform: 'translate(-50%, -50%)',
             width: '90%',
             maxWidth: 800,
             maxHeight: '90vh',
             overflowY: 'auto',
             bgcolor: 'background.paper',
             border: '1px solid #ccc',
             borderRadius: '8px',
             boxShadow: 24,
             p: 3,
         }}>
           <Typography id="prueba-modal-title" variant="h6" component="h2" gutterBottom>
             Calculadora de Prueba de Costos
           </Typography>

           {/* --- Selector de Perfil --- */}
           <Grid container spacing={2} sx={{ mb: 2}}>
             <Grid item xs={12} sm={6}>
                 <FormControl fullWidth size="small" variant="outlined">
                     <InputLabel id="select-profile-label">Usar Perfil Existente</InputLabel>
                     <Select
                         labelId="select-profile-label"
                         id="select-profile-prueba"
                         value={selectedProfileIdForPrueba}
                         label="Usar Perfil Existente"
                         onChange={handleProfileSelectForPrueba}
                         disabled={isCalculatingPrueba}
                     >
                         <MenuItem value=""><em>-- Entrada Manual --</em></MenuItem>
                         {perfiles.map((perfil: CostoPerfilData) => (
                             <MenuItem key={perfil._id} value={perfil._id}>{perfil.nombre_perfil}</MenuItem>
                         ))}
                     </Select>
                 </FormControl>
             </Grid>
             {/* Podríamos mostrar aquí las divisas actuales */}
             <Grid item xs={12} sm={6} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                 <Typography variant="body2" sx={{ mr: 2 }}>
                     USD/CLP: {formatCLP(dolarValue?.value)}
                 </Typography>
                 <Typography variant="body2">
                     EUR/USD: {formatExchangeRate(eurUsdRate)}
                 </Typography>
             </Grid>
           </Grid>
           <Divider sx={{ my: 2 }} />

           {/* --- Inputs Manuales Esenciales --- */}
           <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
               Datos Base (Siempre Manuales)
           </Typography>
           <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={4}>
                   <TextField label="Año de Cotización" name="ano_cotizacion" type="number" value={pruebaInputs.ano_cotizacion} onChange={handlePruebaInputChange} fullWidth variant="outlined" size="small" disabled={isCalculatingPrueba} />
                </Grid>
                <Grid item xs={12} sm={4}>
                   <TextField label="Año en Curso" name="ano_en_curso" type="number" value={pruebaInputs.ano_en_curso} onChange={handlePruebaInputChange} fullWidth variant="outlined" size="small" disabled={isCalculatingPrueba} />
                </Grid>
                 <Grid item xs={12} sm={4}>
                   <TextField label="Costo Fábrica Original (EUR)" name="costo_fabrica_original_eur" type="number" value={pruebaInputs.costo_fabrica_original_eur} onChange={handlePruebaInputChange} fullWidth variant="outlined" size="small" InputProps={{ startAdornment: <InputAdornment position="start">€</InputAdornment> }} disabled={isCalculatingPrueba} />
                </Grid>
           </Grid>
           <Divider sx={{ my: 2 }} />

           {/* --- Sección: Precios para Cliente --- */}
           <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                🧾 Precios para Cliente {selectedProfileIdForPrueba ? '(Desde Perfil)' : '(Manual)'}
           </Typography>
           <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={6}>
                    <TextField label="Desc. Fábrica (%)" name="descuento_pct" type="number" value={pruebaInputs.descuento_pct} onChange={handlePruebaInputChange} fullWidth variant="outlined" size="small" InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }} helperText="Ej: 10 para 10%" disabled={isCalculatingPrueba || !!selectedProfileIdForPrueba} />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <TextField label="Desc. Cliente (%)" name="descuento_cliente_pct" type="number" value={pruebaInputs.descuento_cliente_pct} onChange={handlePruebaInputChange} fullWidth variant="outlined" size="small" InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }} helperText="Ej: 5 para 5%" disabled={isCalculatingPrueba || !!selectedProfileIdForPrueba} />
                </Grid>
           </Grid>
           <Divider sx={{ my: 2 }} />

           {/* --- Sección: Logística y Seguro --- */}
           <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
               🚢 Logística y Seguro {selectedProfileIdForPrueba ? '(Desde Perfil)' : '(Manual)'}
           </Typography>
           <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={4}>
                   <TextField label="Costo Origen (EUR)" name="costos_origen_eur" type="number" value={pruebaInputs.costos_origen_eur} onChange={handlePruebaInputChange} fullWidth variant="outlined" size="small" InputProps={{ startAdornment: <InputAdornment position="start">€</InputAdornment> }} disabled={isCalculatingPrueba || !!selectedProfileIdForPrueba} />
                </Grid>
                <Grid item xs={12} sm={4}>
                    <TextField label="Flete Marítimo (USD)" name="flete_maritimo_usd" type="number" value={pruebaInputs.flete_maritimo_usd} onChange={handlePruebaInputChange} fullWidth variant="outlined" size="small" InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} disabled={isCalculatingPrueba || !!selectedProfileIdForPrueba} />
                </Grid>
                <Grid item xs={12} sm={4}>
                    <TextField label="Recargos Destino (USD)" name="recargos_destino_usd" type="number" value={pruebaInputs.recargos_destino_usd} onChange={handlePruebaInputChange} fullWidth variant="outlined" size="small" InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} disabled={isCalculatingPrueba || !!selectedProfileIdForPrueba} />
                </Grid>
                <Grid item xs={12} sm={4}>
                    <TextField label="Tasa Seguro (%)" name="tasa_seguro_pct" type="number" value={pruebaInputs.tasa_seguro_pct} onChange={handlePruebaInputChange} fullWidth variant="outlined" size="small" InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }} helperText="Ej: 1 para 1%" disabled={isCalculatingPrueba || !!selectedProfileIdForPrueba} />
                </Grid>
                 <Grid item xs={12} sm={4}>
                   <TextField label="Transporte Nac. (CLP)" name="transporte_nacional_clp" type="number" value={pruebaInputs.transporte_nacional_clp} onChange={handlePruebaInputChange} fullWidth variant="outlined" size="small" InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} disabled={isCalculatingPrueba || !!selectedProfileIdForPrueba} />
                </Grid>
           </Grid>
           <Divider sx={{ my: 2 }} />

           {/* --- Sección: Costos de Importación --- */}
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                🧾 Costos de Importación {selectedProfileIdForPrueba ? '(Desde Perfil)' : '(Manual)'}
            </Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={4}>
                    <TextField label="Costo Ag. Aduana (USD)" name="honorarios_agente_aduana_usd" type="number" value={pruebaInputs.honorarios_agente_aduana_usd} onChange={handlePruebaInputChange} fullWidth variant="outlined" size="small" InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} disabled={isCalculatingPrueba || !!selectedProfileIdForPrueba} />
                </Grid>
                <Grid item xs={12} sm={4}>
                    <TextField label="Gastos Puerto/Otros (USD)" name="gastos_portuarios_otros_usd" type="number" value={pruebaInputs.gastos_portuarios_otros_usd} onChange={handlePruebaInputChange} fullWidth variant="outlined" size="small" InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} disabled={isCalculatingPrueba || !!selectedProfileIdForPrueba} />
                </Grid>
                <Grid item xs={12} sm={4}>
                    <TextField label="Derecho AdValorem (%)" name="derecho_advalorem_pct" type="number" value={pruebaInputs.derecho_advalorem_pct} onChange={handlePruebaInputChange} fullWidth variant="outlined" size="small" InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }} helperText="Ej: 6 para 6%" disabled={isCalculatingPrueba || !!selectedProfileIdForPrueba} />
                </Grid>
            </Grid>
            <Divider sx={{ my: 2 }} />

            {/* --- Sección: Conversión a CLP y Margen --- */}
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                💸 Conversión a CLP y Margen {selectedProfileIdForPrueba ? '(Desde Perfil)' : '(Manual)'}
            </Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={4}>
                    <TextField label="Buffer EUR/USD (%)" name="buffer_eur_usd_pct" type="number" value={pruebaInputs.buffer_eur_usd_pct} onChange={handlePruebaInputChange} fullWidth variant="outlined" size="small" InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }} helperText="Ej: 5 para 5%" disabled={isCalculatingPrueba || !!selectedProfileIdForPrueba} />
                </Grid>
                 <Grid item xs={12} sm={4}>
                    <TextField label="Buffer USD/CLP (%)" name="buffer_usd_clp_pct" type="number" value={pruebaInputs.buffer_usd_clp_pct} onChange={handlePruebaInputChange} fullWidth variant="outlined" size="small" InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }} helperText="Ej: 3 para 3%" disabled={isCalculatingPrueba || !!selectedProfileIdForPrueba} />
                </Grid>
                <Grid item xs={12} sm={4}>
                    <TextField label="IVA (%)" name="iva_pct" type="number" value={pruebaInputs.iva_pct} onChange={handlePruebaInputChange} fullWidth variant="outlined" size="small" InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }} helperText="Ej: 19 para 19%" disabled={isCalculatingPrueba || !!selectedProfileIdForPrueba} />
                </Grid>
                 <Grid item xs={12} sm={6}> {/* Más ancho para este */} 
                    <TextField label="% Adicional Total (Margen)" name="margen_adicional_pct" type="number" value={pruebaInputs.margen_adicional_pct} onChange={handlePruebaInputChange} fullWidth variant="outlined" size="small" InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }} helperText="Ej: 20 para 20%" disabled={isCalculatingPrueba || !!selectedProfileIdForPrueba} />
                </Grid>
            </Grid>
            <Divider sx={{ my: 2 }} />

            {/* --- Botón Calcular y Feedback --- */}
            <Box sx={{ mt: 3, mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
               <Button
                   variant="contained"
                   color="primary"
                   onClick={handleCalculatePrueba}
                   disabled={isCalculatingPrueba}
                   startIcon={isCalculatingPrueba ? <CircularProgress size={20} color="inherit" /> : <Calculator size={18} />}
               >
                   {isCalculatingPrueba ? 'Calculando...' : 'Calcular'}
               </Button>
               {pruebaError && <Alert severity="error" sx={{ flexGrow: 1 }}>{pruebaError}</Alert>}
           </Box>


           {/* --- Sección de Resultados --- */}
           {(pruebaResults || pruebaApiValues || pruebaInputValuesUsed) && <Divider sx={{ my: 2 }} />}

           {/* Mostrar Inputs Usados */}
           {pruebaInputValuesUsed && (
              <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>Valores Input Usados en Cálculo</Typography>
                  <Grid container spacing={0.5}> 
                      {Object.entries(pruebaInputValuesUsed).map(([key, value]) => {
                          let label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                          let formattedValue: string | number = String(value); // Initialize here

                          if (key.includes('_fromProfile')) {
                              label = key.replace('_fromProfile', '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) + ' (Perfil)';
                              // Formato específico según el tipo de valor del perfil
                              if (key.startsWith('tasa') || key.startsWith('buffer') || key.startsWith('descuento') || key.startsWith('derecho') || key.startsWith('iva') || key.startsWith('margen')) {
                                 formattedValue = formatPercentDisplay(value as number | null | undefined, 4); 
                              } else if (key.startsWith('costoOrigenEUR')) {
                                 formattedValue = formatGenericCurrency(value as number | null | undefined, 'EUR', 2); // Usar formato EUR con 2 decimales
                              } else if (key.startsWith('flete') || key.startsWith('recargos') || key.startsWith('costoAgente') || key.startsWith('gastos')) {
                                 formattedValue = formatGenericCurrency(value as number | null | undefined, 'USD', 2); // Usar formato USD con 2 decimales
                              } else if (key.startsWith('transporte')) { 
                                 formattedValue = formatCLP(value as number | null | undefined); // Usar formato CLP
                              } else {
                                 // Fallback para otros valores del perfil (si los hubiera)
                                 formattedValue = typeof value === 'number' ? value.toLocaleString('es-CL', {maximumFractionDigits: 6}) : String(value);
                              }
                          } else {
                              // Formato para inputs que NO vienen del perfil (años, costo fábrica base, tc actual)
                              if(key.includes('tipoCambio')){
                                  formattedValue = formatExchangeRate(value as number | null | undefined);
                              } else if (key.includes('EUR')){
                                  formattedValue = formatGenericCurrency(value as number | null | undefined, 'EUR', 2);
                              } else {
                                  formattedValue = typeof value === 'number' ? value.toLocaleString('es-CL', {maximumFractionDigits: 0}) : String(value); // Años sin decimales
                              }
                          }

                          return (
                              <React.Fragment key={key}>
                                  <Grid item xs={7}><Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{label}:</Typography></Grid>
                                  <Grid item xs={5}><Typography variant="body2" align="right" sx={{ fontWeight: '500', fontSize: '0.8rem' }}>{formattedValue}</Typography></Grid>
                              </React.Fragment>
                          );
                      })}
                  </Grid>
              </Box>
           )}
           
           {/* Mostrar Valores API Usados (igual que antes) */}
           {pruebaApiValues && (
               <Box sx={{ mb: 2 }}>
                   <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>Valores API Usados</Typography>
                    <Grid container spacing={1}>
                       <Grid item xs={6}><Typography variant="body2">TC USD/CLP Actual:</Typography></Grid>
                       <Grid item xs={6}><Typography variant="body2" align="right">{formatCLP(pruebaApiValues.tipo_cambio_usd_clp_actual)}</Typography></Grid>
                       <Grid item xs={6}><Typography variant="body2">TC EUR/USD Actual:</Typography></Grid>
                       <Grid item xs={6}><Typography variant="body2" align="right">{formatExchangeRate(pruebaApiValues.tipo_cambio_eur_usd_actual)}</Typography></Grid>
                    </Grid>
               </Box>
           )}

           {/* Mostrar Resultados Calculados */}
           {pruebaResults && (
               <Box>
                   <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', mt: 1 }}>Resultados Calculados</Typography>
                   {/* Renderizar sección Costo de Producto */}
                   {pruebaResults.costo_producto && renderResultSection("Costo de Producto", pruebaResults.costo_producto, resultLabels.costo_producto)}
                   {/* Renderizar NUEVA sección Logística y Seguro */} 
                   {pruebaResults.logistica_seguro && renderResultSection("Logística y Seguro (EXW a Chile)", pruebaResults.logistica_seguro, resultLabels.logistica_seguro)}
                   {/* Re-añadir render de Importación */} 
                   {pruebaResults.importacion && renderResultSection("Costos de Importación", pruebaResults.importacion, resultLabels.importacion)}
                   {/* Añadir render de Landed Cost */} 
                   {pruebaResults.landed_cost && renderResultSection("Costo puesto en Bodega (Landed Cost)", pruebaResults.landed_cost, resultLabels.landed_cost)}
                   {/* Añadir render de Conversión y Margen */} 
                   {pruebaResults.conversion_margen && renderResultSection("Conversión a CLP y Margen", pruebaResults.conversion_margen, resultLabels.conversion_margen)}
                   {/* Añadir render de Precios Cliente */} 
                   {pruebaResults.precios_cliente && renderResultSection("Precios para Cliente", pruebaResults.precios_cliente, resultLabels.precios_cliente)}
               </Box>
           )}

           {/* --- Botón Cerrar --- */}
           <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button onClick={handleClosePruebaModal} disabled={isCalculatingPrueba}>Cerrar</Button>
           </Box>
         </Box>
       </Modal>

    </div>
  );
}

interface ViewProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileData: CostoPerfilData | null;
  error: string | null;
}

const ViewProfileModal: React.FC<ViewProfileModalProps> = ({ isOpen, onClose, profileData, error }) => {
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onClose={onClose} aria-labelledby="view-profile-dialog-title" maxWidth="md" fullWidth>
      <DialogTitle id="view-profile-dialog-title">
        Detalles del Perfil
        <Button onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}><XCircle size={20} /></Button>
      </DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error">{error}</Alert>}
        {!error && !profileData && <Box sx={{ textAlign: 'center', p: 3 }}><CircularProgress /></Box>}
        
        {profileData && (
            <Box>
                <Typography variant="h6" gutterBottom>Datos Generales</Typography>
                <Grid container spacing={1} sx={{ mb: 2 }}>
                    <Grid item xs={12} sm={8}><Typography><strong>Nombre:</strong> {profileData.nombre_perfil}</Typography></Grid>
                    <Grid item xs={12}><Typography><strong>Descripción:</strong> {profileData.descripcion || 'N/A'}</Typography></Grid>
                </Grid>
                <Divider />

                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Logistica y seguro</Typography>
                <Grid container spacing={1} sx={{ mb: 2 }}>
                    <Grid item xs={6} sm={4}><Typography>Costo Origen (EUR):</Typography></Grid>
                    <Grid item xs={6} sm={8}><Typography align="right">{formatCurrency(profileData.costo_logistica_origen_eur, 'EUR')}</Typography></Grid>
                    <Grid item xs={6} sm={4}><Typography>Flete Marítimo (USD):</Typography></Grid>
                    <Grid item xs={6} sm={8}><Typography align="right">{formatCurrency(profileData.flete_maritimo_usd, 'USD')}</Typography></Grid>
                    <Grid item xs={6} sm={4}><Typography>Recargos Destino (USD):</Typography></Grid>
                    <Grid item xs={6} sm={8}><Typography align="right">{formatCurrency(profileData.recargos_destino_usd, 'USD')}</Typography></Grid>
                    <Grid item xs={6} sm={4}><Typography>Tasa Seguro (%):</Typography></Grid>
                    <Grid item xs={6} sm={8}><Typography align="right">{formatPercent(profileData.tasa_seguro_pct)}</Typography></Grid>
                    <Grid item xs={6} sm={4}><Typography>Transporte Nac. (CLP):</Typography></Grid>
                    <Grid item xs={6} sm={8}><Typography align="right">{formatCLP(profileData.transporte_nacional_clp)}</Typography></Grid>
                </Grid>
                 <Divider />

                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Costos de Importación</Typography>
                 <Grid container spacing={1} sx={{ mb: 2 }}>
                    <Grid item xs={6} sm={4}><Typography>Costo Ag. Aduana (USD):</Typography></Grid>
                    <Grid item xs={6} sm={8}><Typography align="right">{formatCurrency(profileData.costo_agente_aduana_usd, 'USD')}</Typography></Grid>
                    <Grid item xs={6} sm={4}><Typography>Gastos Puerto/Otros (USD):</Typography></Grid>
                    <Grid item xs={6} sm={8}><Typography align="right">{formatCurrency(profileData.gastos_portuarios_otros_usd, 'USD')}</Typography></Grid>
                    <Grid item xs={6} sm={4}><Typography>Derecho AdValorem (%):</Typography></Grid>
                    <Grid item xs={6} sm={8}><Typography align="right">{formatPercent(profileData.derecho_advalorem_pct)}</Typography></Grid>
                 </Grid>
                 <Divider />

                 <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Conversión a CLP y Margen</Typography>
                 <Grid container spacing={1} sx={{ mb: 2 }}>
                    <Grid item xs={6} sm={4}><Typography>% Adicional Total:</Typography></Grid>
                    <Grid item xs={6} sm={8}><Typography align="right">{formatPercent(profileData.margen_adicional_pct)}</Typography></Grid>
                    <Grid item xs={6} sm={4}><Typography>Buffer USD/CLP (%):</Typography></Grid>
                    <Grid item xs={6} sm={8}><Typography align="right">{formatPercent(profileData.buffer_usd_clp_pct)}</Typography></Grid>
                    <Grid item xs={6} sm={4}><Typography>Buffer EUR/USD (%):</Typography></Grid>
                    <Grid item xs={6} sm={8}><Typography align="right">{formatPercent(profileData.buffer_eur_usd_pct)}</Typography></Grid>
                    <Grid item xs={6} sm={4}><Typography>IVA (%):</Typography></Grid>
                    <Grid item xs={6} sm={8}><Typography align="right">{formatPercent(profileData.iva_pct)}</Typography></Grid>
                 </Grid>
                 <Divider />

                 <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Precios para Cliente</Typography>
                 <Grid container spacing={1} sx={{ mb: 2 }}>
                    <Grid item xs={6} sm={4}><Typography>Desc. Fábrica (%):</Typography></Grid>
                    <Grid item xs={6} sm={8}><Typography align="right">{formatPercent(profileData.descuento_fabrica_pct)}</Typography></Grid>
                    <Grid item xs={6} sm={4}><Typography>Desc. Cliente (%):</Typography></Grid>
                    <Grid item xs={6} sm={8}><Typography align="right">{formatPercent(profileData.descuento_cliente_pct)}</Typography></Grid>
                 </Grid>
                 <Divider />

                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                     <Typography variant="caption" display="block">Creado: {profileData.createdAt ? new Date(profileData.createdAt).toLocaleString('es-CL') : 'N/A'}</Typography>
                     <Typography variant="caption" display="block">Actualizado: {profileData.updatedAt ? new Date(profileData.updatedAt).toLocaleString('es-CL') : 'N/A'}</Typography>
                </Box>
            </Box>
        )}
      </DialogContent>
       <DialogActions>
         <Button onClick={onClose} color="primary">Cerrar</Button>
       </DialogActions>
    </Dialog>
  );
};

// Helper para formatear porcentajes (necesario para ViewProfileModal)
const formatPercent = (value: number | null | undefined): string => {
   if (value === null || value === undefined) return '--';
   return `${(value * 100).toFixed(1)}%`;
};

// Helper para formatear otras monedas (necesario para ViewProfileModal)
const formatCurrency = (value: number | null | undefined, currency: 'USD' | 'EUR'): string => {
  if (value === null || value === undefined) return '--';
  // Especificar el tipo explícito para las opciones
  const options: Intl.NumberFormatOptions = {
      style: 'currency', // Tipo específico
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
  };
  return value.toLocaleString('es-CL', options); // Usar localización chilena pero con código de moneda
}; 