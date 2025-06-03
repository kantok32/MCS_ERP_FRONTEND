import React, { useState, useEffect, useCallback, ChangeEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2, AlertTriangle, ArrowLeft, Calculator } from 'lucide-react';
import {
    Container,
    Paper,
    Box,
    Button,
    TextField,
    Typography,
    CircularProgress,
    Grid,
    Alert,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Autocomplete,
    SelectChangeEvent,
    Stack,
    Divider
} from '@mui/material';
import { api, calcularCostoProductoConPerfil } from '../services/api';
import { fetchAllProducts as fetchAllProductsService } from '../services/productService';
import { getPerfiles } from '../services/perfilService';
import { CalcularCostoProductoPayload, CalcularCostoProductoResponse } from '../types/calculoTypes';
import { CostoPerfilData } from '../types';
import { Producto } from '../types/product';

// --- Tipos para Calculadora (Copiados y adaptados de PerfilesPanel.tsx) ---

// Interfaz para los inputs del formulario de prueba
interface PruebaInputs {
    profileId?: string; // ID del perfil base si se usa uno
    ano_cotizacion: number | string;
    ano_en_curso: number | string;
    costo_fabrica_original_eur: number | string;
    descuento_pct: number | string;
    buffer_eur_usd_pct: number | string;
    costos_origen_eur: number | string;
    flete_maritimo_usd: number | string;
    recargos_destino_usd: number | string;
    tasa_seguro_pct: number | string;
    honorarios_agente_aduana_usd: number | string;
    gastos_portuarios_otros_usd: number | string;
    transporte_nacional_clp: number | string;
    buffer_usd_clp_pct: number | string;
    margen_adicional_pct: number | string;
    derecho_advalorem_pct: number | string;
    iva_pct: number | string;
    descuento_cliente_pct: number | string; 
    // Estos son necesarios para el payload si no se usa un perfil completo
    codigo_producto?: string; 
    // tipoCambioEurUsdActual y tipoCambioUsdClpActual se manejarán por separado o dentro del payload
}

// Interfaz para agrupar resultados (debe coincidir con la estructura de 'calculados' en CalcularCostoProductoResponse)
interface GroupedPruebaResults {
    costo_producto?: Record<string, number | undefined>;
    logistica_seguro?: Record<string, number | undefined>;
    importacion?: Record<string, number | undefined>;
    landed_cost?: Record<string, number | undefined>;
    conversion_margen?: Record<string, number | undefined>;
    precios_cliente?: Record<string, number | undefined>;
}

// Interfaz para los valores de tipo de cambio que vienen de la API (si se usan directamente)
interface PruebaApiValues {
    tipo_cambio_usd_clp_actual?: number;
    tipo_cambio_eur_usd_actual?: number;
}

// Valores por defecto para el formulario de prueba
const defaultPruebaInputs: PruebaInputs = {
    ano_cotizacion: new Date().getFullYear(),
    ano_en_curso: new Date().getFullYear() + 1,
    costo_fabrica_original_eur: '',
    descuento_pct: 0,
    buffer_eur_usd_pct: 0,
    costos_origen_eur: 0,
    flete_maritimo_usd: 0,
    recargos_destino_usd: 0,
    tasa_seguro_pct: 0.3, // Ejemplo 0.3%
    honorarios_agente_aduana_usd: 0,
    gastos_portuarios_otros_usd: 0,
    transporte_nacional_clp: 0,
    buffer_usd_clp_pct: 0,
    margen_adicional_pct: 20, // Ejemplo 20%
    derecho_advalorem_pct: 6, // Ejemplo 6%
    iva_pct: 19, // Ejemplo 19%
    descuento_cliente_pct: 0,
    codigo_producto: 'PRUEBA_MANUAL',
};

// --- Helpers de Formato (Similares a PerfilesPanel.tsx) ---
// (Se podrían mover a un archivo utils si se usan en muchos sitios)
const formatGenericCurrency = (value: number | null | undefined, currency: 'USD' | 'EUR', digits = 2): string => {
    if (value === null || value === undefined || isNaN(value)) return '--';
    const options: Intl.NumberFormatOptions = {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    };
    // Usar 'es-ES' o 'de-DE' para formato europeo, 'en-US' para USD si se prefiere.
    const locale = currency === 'EUR' ? 'es-ES' : 'en-US'; 
    return value.toLocaleString(locale, options);
};

const formatCLP = (value: number | null | undefined): string => {
    if (value === null || value === undefined || isNaN(value)) return '--';
    const numberValue = Math.round(value); // Redondear a entero para CLP
    return `$${numberValue.toLocaleString('es-CL')}`; // Formato chileno
};

const formatPercentDisplay = (value: number | null | undefined, digits = 2): string => {
    if (value === null || value === undefined || isNaN(value)) return '--';
    return `${(value * 100).toFixed(digits)}%`;
};

const formatExchangeRate = (value: number | null | undefined, digits = 4): string => {
    if (value === null || value === undefined || isNaN(value)) return '--';
    return value.toFixed(digits);
};

const formatNumber = (value: number | null | undefined, digits = 2): string => {
    if (value === null || value === undefined || isNaN(value)) return '--';
    return value.toLocaleString('es-ES', { minimumFractionDigits: digits, maximumFractionDigits: digits });
};


// Labels para resultados (simplificado, adaptar según sea necesario)
const resultLabels: Record<string, Record<string, string>> = {
    costo_producto: {
        sectionTitle: "Costos del Producto",
        factorActualizacion: "Factor Actualización",
        costoFabricaActualizadoEUR: "Costo Fáb. Act. EUR (Antes Desc.)",
        costoFinalFabricaEUR_EXW: "Costo Final Fáb. EUR (EXW)",
        tipoCambioEurUsdAplicado: "TC EUR/USD Aplicado",
        costoFinalFabricaUSD_EXW: "Costo Final Fáb. USD (EXW)",
    },
    logistica_seguro: {
        sectionTitle: "Logística y Seguro",
        costosOrigenUSD: "Costos en Origen (USD)",
        costoTotalFleteManejosUSD: "Costo Total Flete y Manejos (USD)",
        baseParaSeguroUSD: "Base para Seguro (CFR Aprox - USD)",
        primaSeguroUSD: "Prima Seguro (USD)",
        totalTransporteSeguroEXW_USD: "Total Transporte y Seguro EXW (USD)",
    },
    importacion: {
        sectionTitle: "Importación",
        valorCIF_USD: "Valor CIF (USD)",
        derechoAdvaloremUSD: "Derecho AdValorem (USD)",
        baseIvaImportacionUSD: "Base IVA Importación (USD)",
        ivaImportacionUSD: "IVA Importación (USD)",
        totalCostosImportacionDutyFeesUSD: "Total Costos Imp. (Duty+Fees) (USD)",
    },
    landed_cost: {
        sectionTitle: "Landed Cost",
        transporteNacionalUSD: "Transporte Nacional (USD)",
        precioNetoCompraBaseUSD_LandedCost: "Precio Neto Compra Base (USD) - Landed Cost",
    },
    conversion_margen: {
        sectionTitle: "Conversión y Margen",
        tipoCambioUsdClpAplicado: "Tipo Cambio USD/CLP Aplicado",
        precioNetoCompraBaseCLP: "Precio Neto Compra Base (CLP)",
        margenCLP: "Margen (CLP)",
        precioVentaNetoCLP: "Precio Venta Neto (CLP)",
    },
    precios_cliente: {
        sectionTitle: "Precios al Cliente",
        precioNetoVentaFinalCLP: "Precio Neto Venta Final (CLP)",
        ivaVentaCLP: "IVA Venta (19%) (CLP)",
        precioVentaTotalClienteCLP: "Precio Venta Total Cliente (CLP)"
    }
    // ... (añadir más secciones y campos según la respuesta del backend)
};


export default function PruebaCalculoPanel() {
    const navigate = useNavigate();
    const location = useLocation();

    // --- Estados para el Formulario y Resultados ---
    const [pruebaInputs, setPruebaInputs] = useState<PruebaInputs>(defaultPruebaInputs);
    const [pruebaResults, setPruebaResults] = useState<CalcularCostoProductoResponse['resultado'] | null>(null);
    const [isPruebaLoading, setIsPruebaLoading] = useState<boolean>(false);
    const [pruebaError, setPruebaError] = useState<string | null>(null);
    
    // --- Estados para Selectores ---
    const [perfilesParaSeleccion, setPerfilesParaSeleccion] = useState<CostoPerfilData[]>([]);
    const [isLoadingPerfiles, setIsLoadingPerfiles] = useState<boolean>(false);
    const [errorPerfiles, setErrorPerfiles] = useState<string | null>(null);
    const [selectedProfileId, setSelectedProfileId] = useState<string>('');

    const [productosParaPrueba, setProductosParaPrueba] = useState<Producto[]>([]);
    const [selectedProducto, setSelectedProducto] = useState<Producto | null>(null);
    const [isLoadingProductos, setIsLoadingProductos] = useState<boolean>(false);
    const [errorProductos, setErrorProductos] = useState<string | null>(null);

    // --- Estados para Valores de Divisas (Ej: de n8n) ---
    const [dolarValue, setDolarValue] = useState<{ value: number | null, last_update: string | null } | null>(null);
    const [euroValue, setEuroValue] = useState<{ value: number | null, last_update: string | null } | null>(null);
    const [isLoadingCurrencies, setIsLoadingCurrencies] = useState<boolean>(false);
    const [errorCurrencies, setErrorCurrencies] = useState<string | null>(null);
    const [tipoCambioEurUsdActual, setTipoCambioEurUsdActual] = useState<number | null>(null);
    const [tipoCambioUsdClpActual, setTipoCambioUsdClpActual] = useState<number | null>(null);


    // Efecto para cargar todos los datos necesarios al montar el componente
    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoadingPerfiles(true);
            setIsLoadingProductos(true);
            setIsLoadingCurrencies(true);

            try {
                // Cargar Perfiles
                const perfilesData = await getPerfiles();
                setPerfilesParaSeleccion(perfilesData);
                setErrorPerfiles(null);
            } catch (err) {
                console.error("Error cargando perfiles:", err);
                setErrorPerfiles("No se pudieron cargar los perfiles.");
            }
            setIsLoadingPerfiles(false);

            try {
                // Cargar Productos y filtrar los no opcionales
                const allProductsData = await fetchAllProductsService(); // Sin argumentos
                // Filtrar para excluir opcionales (ajustar el criterio de filtro si es necesario)
                const productosNoOpcionales = allProductsData.filter(
                    (p: Producto) => 
                        !p.es_opcional && 
                        (p.categoria ? !p.categoria.toLowerCase().includes('opcional') : true)
                );
                setProductosParaPrueba(productosNoOpcionales); 
                setErrorProductos(null);
            } catch (err) {
                console.error("Error cargando productos:", err);
                setErrorProductos("No se pudieron cargar los productos.");
            }
            setIsLoadingProductos(false);

            try {
                // Cargar Divisas (ejemplo, adaptar a tus endpoints n8n)
                // Estos son placeholders, necesitas las URLs correctas
                const n8nEuroUrl = 'https://n8n-807184488368.southamerica-west1.run.app/webhook/8012d60e-8a29-4910-b385-6514edc3d912'; // URL de PerfilesPanel para EUR/USD
                // Asumiré que existe un endpoint similar o lógica para USD/CLP o que se deriva
                // Por ahora, enfocaré en EUR/USD ya que es el principal para 'calcularCostoProductoConPerfil'

                const euroResponse = await fetch(n8nEuroUrl);
                if (!euroResponse.ok) throw new Error(`Error al obtener EUR: ${euroResponse.statusText}`);
                const euroData = await euroResponse.json();
                
                // Asumiendo que euroData tiene Valor_Euro y Valor_Dolar para calcular EUR/USD
                if (euroData.Valor_Euro && euroData.Valor_Dolar) {
                    const valEuro = parseFloat(euroData.Valor_Euro);
                    const valDolar = parseFloat(euroData.Valor_Dolar);
                    if (!isNaN(valEuro) && !isNaN(valDolar) && valDolar !== 0) {
                        setTipoCambioEurUsdActual(valEuro / valDolar);
                        setEuroValue({ value: valEuro, last_update: euroData.Fecha_Euro || new Date().toISOString() });
                        setDolarValue({ value: valDolar, last_update: euroData.Fecha_Dolar || new Date().toISOString() });
                    } else {
                        throw new Error('Valores de divisa EUR/USD no válidos desde n8n');
                    }
                } else {
                     throw new Error('Respuesta de n8n para EUR/USD no contiene Valor_Euro y Valor_Dolar');
                }

                // TODO: Si necesitas USD/CLP explícitamente y tienes otro endpoint, cárgalo aquí.
                // Por ahora, el backend de calcularCostoProductoConPerfil podría estar obteniéndolo.
                // Si lo necesitas en el frontend, ejemplo:
                // const n8nUsdClpUrl = 'URL_DE_TU_ENDPOINT_N8N_USD_CLP';
                // const usdClpResponse = await fetch(n8nUsdClpUrl);
                // if (!usdClpResponse.ok) throw new Error(`Error al obtener USD/CLP: ${usdClpResponse.statusText}`);
                // const usdClpData = await usdClpResponse.json();
                // if (usdClpData.Valor_Dolar_CLP) { // o como se llame el campo
                //    setTipoCambioUsdClpActual(parseFloat(usdClpData.Valor_Dolar_CLP));
                // } else {
                //    throw new Error('Respuesta de n8n para USD/CLP no contiene el valor esperado');
                // }

                setErrorCurrencies(null);
            } catch (err: any) {
                console.error("Error cargando divisas:", err);
                setErrorCurrencies(err.message || "No se pudieron cargar los valores de las divisas.");
                // Establecer valores por defecto si falla la carga de TC EUR/USD para no bloquear la prueba
                if (!tipoCambioEurUsdActual) setTipoCambioEurUsdActual(1.1); 
            }
            setIsLoadingCurrencies(false);
        };

        loadInitialData();
    }, []); // Se ejecuta solo una vez al montar

    // Efecto para pre-llenar el formulario si se navega con un profileId
    useEffect(() => {
        const initialProfileIdFromState = location.state?.profileId as string;
        if (initialProfileIdFromState && perfilesParaSeleccion.length > 0 && !selectedProfileId) { // Evitar recargar si ya se seleccionó
            const profileToLoad = perfilesParaSeleccion.find(p => p._id === initialProfileIdFromState);
            if (profileToLoad) {
                // console.log("[PruebaCalculoPanel] Perfil para pre-cargar encontrado:", profileToLoad);
                applyProfileToInputs(profileToLoad);
            }
        }
    }, [location.state, perfilesParaSeleccion, selectedProfileId]); // Añadir selectedProfileId a las dependencias

    // --- Funciones Controladoras de Eventos ---

    const handlePruebaInputChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = event.target;
        let parsedValue: string | number = value;
        // Convertir a número si el campo es numérico, excepto para campos que son string por defecto.
        if (event.target.type === 'number') {
            // No convertir a número si el valor está vacío o solo es un signo negativo o punto decimal
            if (value === '' || value === '-' || value === '.' || value === '-, ') {
                parsedValue = value; 
            } else {
                parsedValue = parseFloat(value);
                if (isNaN(parsedValue)) {
                    parsedValue = value; // Mantener como string si no es un número válido para evitar NaN en el input
                }
            }
        }
        setPruebaInputs(prev => ({ ...prev, [name]: parsedValue }));
        setPruebaResults(null); // Limpiar resultados si cambian los inputs
    };

    // Función auxiliar para aplicar un perfil a los inputs
    const applyProfileToInputs = (profile: CostoPerfilData) => {
        setSelectedProfileId(profile._id);
        setSelectedProducto(null); // Limpiar producto seleccionado si se elige un perfil
        setPruebaInputs({
            // ...defaultPruebaInputs, // Considerar si queremos resetear a defaults o mantener algunos valores manuales
            ano_cotizacion: pruebaInputs.ano_cotizacion || defaultPruebaInputs.ano_cotizacion,
            ano_en_curso: pruebaInputs.ano_en_curso || defaultPruebaInputs.ano_en_curso,
            costo_fabrica_original_eur: '' , // Dejar vacío para que el usuario lo ingrese o lo tome de un producto
            codigo_producto: 'PRUEBA_CON_PERFIL', // Identificador para la prueba
            profileId: profile._id,

            descuento_pct: profile.descuento_fabrica_pct,
            buffer_eur_usd_pct: profile.buffer_eur_usd_pct,
            costos_origen_eur: profile.costo_logistica_origen_eur,
            flete_maritimo_usd: profile.flete_maritimo_usd,
            recargos_destino_usd: profile.recargos_destino_usd,
            tasa_seguro_pct: profile.tasa_seguro_pct,
            honorarios_agente_aduana_usd: profile.costo_agente_aduana_usd, // Mapear nombre antiguo si es necesario
            gastos_portuarios_otros_usd: profile.gastos_portuarios_otros_usd,
            transporte_nacional_clp: profile.transporte_nacional_clp,
            buffer_usd_clp_pct: profile.buffer_usd_clp_pct,
            margen_adicional_pct: profile.margen_adicional_pct,
            derecho_advalorem_pct: profile.derecho_advalorem_pct,
            iva_pct: profile.iva_pct,
            descuento_cliente_pct: profile.descuento_cliente_pct,
        });
        setPruebaResults(null);
    };

    const handleProfileChange = (event: SelectChangeEvent<string>) => {
        const profileId = event.target.value;
        if (profileId) {
            const selected = perfilesParaSeleccion.find(p => p._id === profileId);
            if (selected) {
                applyProfileToInputs(selected);
            }
        } else { // Si se deselecciona el perfil (opción "Manual")
            setSelectedProfileId('');
            setPruebaInputs(prev => ({...defaultPruebaInputs, ano_cotizacion: prev.ano_cotizacion, ano_en_curso: prev.ano_en_curso })); // Reset a defaults manteniendo años
            setPruebaResults(null);
        }
    };

    const handleProductoChange = (
        event: React.SyntheticEvent,
        newValue: Producto | null
    ) => {
        setSelectedProducto(newValue);
        if (newValue) {
            setSelectedProfileId(''); // Limpiar perfil seleccionado si se elige un producto
            setPruebaInputs(prev => ({
                ...defaultPruebaInputs, // Resetear a defaults primero
                ano_cotizacion: prev.ano_cotizacion, // Mantener años
                ano_en_curso: prev.ano_en_curso,
                costo_fabrica_original_eur: String(newValue.pf_eur || ''), // Tomar de producto
                codigo_producto: newValue.codigo_producto || 'PRUEBA_CON_PRODUCTO',
                // Otros campos relevantes del producto podrían pre-llenarse aquí si fuera necesario
                // Por ejemplo, si el producto tuviera una tasa de seguro por defecto, etc.
            }));
        } else { // Si se deselecciona el producto
             // Volver a defaults si no hay perfil seleccionado, o mantener valores del perfil si lo hay
            if (!selectedProfileId) {
                setPruebaInputs(prev => ({...defaultPruebaInputs, ano_cotizacion: prev.ano_cotizacion, ano_en_curso: prev.ano_en_curso }));
            }
        }
        setPruebaResults(null);
    };

    const handleCalculatePrueba = async () => {
        setIsPruebaLoading(true);
        setPruebaError(null);
        setPruebaResults(null);

        if (tipoCambioEurUsdActual === null) {
            setPruebaError("El tipo de cambio EUR/USD no está disponible. Intente recargar la página o verifique la conexión a los servicios de divisas.");
            setIsPruebaLoading(false);
            return;
        }

        // Validar campos numéricos requeridos
        const costFabEur = parseFloat(String(pruebaInputs.costo_fabrica_original_eur));
        if (isNaN(costFabEur) || costFabEur <= 0) {
            setPruebaError("El Costo Fábrica Original EUR debe ser un número positivo.");
            setIsPruebaLoading(false);
            return;
        }

        const payload: CalcularCostoProductoPayload = {
            profileId: selectedProfileId || undefined, // Enviar solo si hay uno seleccionado
            anoCotizacion: Number(pruebaInputs.ano_cotizacion),
            anoEnCurso: Number(pruebaInputs.ano_en_curso),
            costoFabricaOriginalEUR: costFabEur,
            tipoCambioEurUsdActual: tipoCambioEurUsdActual,
            
            // Si no hay profileId, el backend espera estos valores del payload.
            // Si hay profileId, el backend usa los del perfil, pero podemos enviar overrides.
            // Por ahora, si hay profileId, el backend se encarga. Si no, enviamos los del form.
            ...(selectedProfileId ? {} : {
                descuento_pct: Number(pruebaInputs.descuento_pct) / 100,
                buffer_eur_usd_pct: Number(pruebaInputs.buffer_eur_usd_pct) / 100,
                costos_origen_eur: Number(pruebaInputs.costos_origen_eur),
                flete_maritimo_usd: Number(pruebaInputs.flete_maritimo_usd),
                recargos_destino_usd: Number(pruebaInputs.recargos_destino_usd),
                tasa_seguro_pct: Number(pruebaInputs.tasa_seguro_pct) / 100,
                honorarios_agente_aduana_usd: Number(pruebaInputs.honorarios_agente_aduana_usd),
                gastos_portuarios_otros_usd: Number(pruebaInputs.gastos_portuarios_otros_usd),
                transporte_nacional_clp: Number(pruebaInputs.transporte_nacional_clp),
                buffer_usd_clp_pct: Number(pruebaInputs.buffer_usd_clp_pct) / 100,
                margen_adicional_pct: Number(pruebaInputs.margen_adicional_pct) / 100,
                derecho_advalorem_pct: Number(pruebaInputs.derecho_advalorem_pct) / 100,
                iva_pct: Number(pruebaInputs.iva_pct) / 100,
                descuento_cliente_pct: Number(pruebaInputs.descuento_cliente_pct) / 100,
                codigo_producto: pruebaInputs.codigo_producto || 'PRUEBA_CALCULO',
            })
        };

        try {
            console.log("[PruebaCalculoPanel] Enviando payload:", payload);
            const response = await calcularCostoProductoConPerfil(payload);
            console.log("[PruebaCalculoPanel] Respuesta recibida:", response);

            if (response.resultado && response.resultado.calculados && response.resultado.inputs) {
                setPruebaResults(response.resultado);
                // Opcionalmente, actualizar los tipos de cambio si el backend los devuelve recalculados o confirmados
                if (response.resultado.api_values?.tipo_cambio_eur_usd_actual) {
                    setTipoCambioEurUsdActual(response.resultado.api_values.tipo_cambio_eur_usd_actual);
                }
                if (response.resultado.api_values?.tipo_cambio_usd_clp_actual) {
                    setTipoCambioUsdClpActual(response.resultado.api_values.tipo_cambio_usd_clp_actual);
                }
            } else if (response.error) {
                setPruebaError(response.error || "La respuesta del servidor no contiene resultados válidos.");
            } else {
                setPruebaError("La respuesta del servidor no contiene la estructura esperada (resultado, inputs, calculados).");
            }
        } catch (err: any) {
            console.error("[PruebaCalculoPanel] Error en calcularCostoProductoConPerfil:", err);
            setPruebaError(err.message || err.data?.message || "Error al calcular la prueba.");
        }
        setIsPruebaLoading(false);
    };

    // TODO: JSX para el formulario y la visualización de resultados.

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Paper elevation={3} sx={{ p: { xs: 2, md: 3 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                    <Typography variant="h4" component="h1">
                        Prueba de Cálculo de Costos
                    </Typography>
                    <Button
                        variant="outlined"
                        startIcon={<ArrowLeft />}
                        onClick={() => navigate('/perfiles')}
                    >
                        Volver a Perfiles
                    </Button>
                </Stack>
                <Divider sx={{ mb: 3 }} />

                <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                    Configuración de Prueba
                </Typography>
                
                <Grid container spacing={3}>
                    {/* Columna Izquierda: Selectores y Años */}
                    <Grid item xs={12} md={4}>
                        <Stack spacing={3}>
                            <TextField
                                label="Año Cotización"
                                name="ano_cotizacion"
                                type="number"
                                value={pruebaInputs.ano_cotizacion}
                                onChange={handlePruebaInputChange}
                                fullWidth
                                disabled={isPruebaLoading}
                            />
                            <TextField
                                label="Año en Curso (para Factor Act.)"
                                name="ano_en_curso"
                                type="number"
                                value={pruebaInputs.ano_en_curso}
                                onChange={handlePruebaInputChange}
                                fullWidth
                                disabled={isPruebaLoading}
                            />
                            <Autocomplete
                                options={productosParaPrueba}
                                getOptionLabel={(option) => `${option.nombre_del_producto} (${option.codigo_producto})`}
                                value={selectedProducto}
                                onChange={handleProductoChange}
                                loading={isLoadingProductos}
                                disabled={isPruebaLoading}
                                renderInput={(params) => (
                                    <TextField 
                                        {...params} 
                                        label="Seleccionar Producto (opcional)" 
                                        variant="outlined"
                                        InputProps={{
                                            ...params.InputProps,
                                            endAdornment: (
                                                <React.Fragment>
                                                    {isLoadingProductos ? <CircularProgress color="inherit" size={20} /> : null}
                                                    {params.InputProps.endAdornment}
                                                </React.Fragment>
                                            ),
                                        }}
                                    />
                                )}
                            />
                            <FormControl fullWidth disabled={isPruebaLoading || isLoadingPerfiles}>
                                <InputLabel id="select-profile-label">Seleccionar Perfil (opcional)</InputLabel>
                                <Select
                                    labelId="select-profile-label"
                                    value={selectedProfileId}
                                    label="Seleccionar Perfil (opcional)"
                                    onChange={handleProfileChange}
                                >
                                    <MenuItem value="">
                                        <em>-- Modo Manual / Usar Producto --</em>
                                    </MenuItem>
                                    {isLoadingPerfiles && <MenuItem value="" disabled><CircularProgress size={20}/> Cargando perfiles...</MenuItem>}
                                    {perfilesParaSeleccion.map((perfil) => (
                                        <MenuItem key={perfil._id} value={perfil._id}>
                                            {perfil.nombre_perfil}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            {errorProductos && <Alert severity="warning" sx={{mt:1}}>{errorProductos}</Alert>}
                            {errorPerfiles && <Alert severity="warning" sx={{mt:1}}>{errorPerfiles}</Alert>}
                        </Stack>
                    </Grid>

                    {/* Columna Central: Inputs Manuales Principales */}
                    <Grid item xs={12} md={4}>
                        <Stack spacing={3}>
                            <TextField
                                label="Costo Fábrica Original EUR"
                                name="costo_fabrica_original_eur"
                                type="number"
                                value={pruebaInputs.costo_fabrica_original_eur}
                                onChange={handlePruebaInputChange}
                                fullWidth
                                required
                                disabled={isPruebaLoading || !!selectedProducto} // Deshabilitar si se selecciona producto
                                InputProps={{ startAdornment: <Typography sx={{mr:0.5}}>€</Typography> }}
                            />
                             <TextField
                                label="Código Producto (si no usa selector)"
                                name="codigo_producto"
                                value={pruebaInputs.codigo_producto || ''}
                                onChange={handlePruebaInputChange}
                                fullWidth
                                disabled={isPruebaLoading || !!selectedProducto || !!selectedProfileId}
                                helperText={!!selectedProducto ? "Tomado del producto" : (!!selectedProfileId ? "Usando ID de perfil" : "Manual")}
                            />
                            {isLoadingCurrencies && <Box sx={{display: 'flex', alignItems: 'center'}}><CircularProgress size={20} sx={{mr:1}}/> <Typography variant="caption">Cargando divisas...</Typography></Box>}
                            {errorCurrencies && <Alert severity="warning">{errorCurrencies}</Alert>}
                            {tipoCambioEurUsdActual !== null && (
                                <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                                    TC EUR/USD para cálculo: {formatExchangeRate(tipoCambioEurUsdActual, 6)}
                                </Typography>
                            )}
                             {/* Aquí podrían ir más campos si la columna se hace muy larga */} 
                        </Stack>
                    </Grid>

                    {/* Columna Derecha: Inputs Manuales (Continuación) / Placeholder */}
                    <Grid item xs={12} md={4}>
                        <Typography variant="caption" color="textSecondary">
                           {selectedProfileId ? 
                                "Los campos marcados con * se tomarán del perfil seleccionado. Edítelos aquí para una simulación puntual (override si recalcula en modo manual)." : 
                                "Ingrese los siguientes valores para el cálculo manual (si no usa perfil)."}
                        </Typography>
                        <Divider sx={{my:1}}/>
                        <Stack spacing={2.5} sx={{maxHeight: '500px', overflowY: 'auto', pr:1}} > {/* Scroll para muchos campos */}
                            {Object.entries(defaultPruebaInputs).map(([key, defaultValue]) => {
                                // Campos que ya están en otras columnas o son especiales
                                if (['ano_cotizacion', 'ano_en_curso', 'costo_fabrica_original_eur', 'codigo_producto', 'profileId'].includes(key)) {
                                    return null;
                                }
                                const label = key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ').replace(' Pct', ' (%)');
                                const isPercent = key.includes('_pct');
                                const adornment = isPercent ? '%' : (key.includes('_eur') ? '€' : (key.includes('_usd') ? '$' : (key.includes('_clp') ? 'CLP' : undefined)));

                                return (
                                    <TextField
                                        key={key}
                                        label={`${selectedProfileId ? '* ' : ''}${label}`}
                                        name={key}
                                        type="number"
                                        value={(pruebaInputs as any)[key] === undefined ? '' : (pruebaInputs as any)[key]}
                                        onChange={handlePruebaInputChange}
                                        fullWidth
                                        disabled={isPruebaLoading} // No deshabilitar si hay perfil, para permitir overrides
                                        InputProps={adornment ? { startAdornment: <Typography sx={{mr:0.5}}>{adornment}</Typography> } : {}}
                                        inputProps={{ step: isPercent ? 0.1 : 1 }}
                                        size="small"
                                    />
                                );
                            })}
                        </Stack>
                    </Grid>
                </Grid>
                
                {/* El Box de abajo es redundante si el Grid ya está fuera */}
                {/* <Box component="form" noValidate autoComplete="off" sx={{ mt: 3 }}> */}
                {/* </Box> */}

                <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    startIcon={<Calculator />}
                    onClick={handleCalculatePrueba}
                    disabled={isPruebaLoading || isLoadingCurrencies || tipoCambioEurUsdActual === null}
                    sx={{ mt: 3, mb: 2 }}
                >
                    {isPruebaLoading ? <CircularProgress size={24} color="inherit" /> : "Calcular Prueba"}
                </Button>

                {pruebaError && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                        {pruebaError}
                    </Alert>
                )}

                {pruebaResults && (
                    <Box sx={{ mt: 4, border: '1px solid', borderColor: 'divider', p: 2, borderRadius: 1 }}>
                        <Typography variant="h5" gutterBottom sx={{textAlign: 'center'}}>Resultados Detallados del Cálculo</Typography>
                        
                        {pruebaResults.inputs && (
                            <Box mb={3}>
                                <Typography variant="h6" gutterBottom color="primary.main">Parámetros Usados (Inputs)</Typography>
                                <Grid container spacing={1}>
                                    {Object.entries(pruebaResults.inputs).map(([key, value]) => (
                                        <Grid item xs={12} sm={6} md={4} key={`input-${key}`}>
                                            <Typography variant="body2">
                                                <strong>{resultLabels.costo_producto[key] || key.split('_').map(w=>w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}:</strong> 
                                                {typeof value === 'number' ? 
                                                    (key.includes('_pct') ? formatPercentDisplay(value) :
                                                    key.includes('_eur') ? formatGenericCurrency(value, 'EUR') :
                                                    key.includes('_usd') ? formatGenericCurrency(value, 'USD') :
                                                    key.includes('_clp') ? formatCLP(value) :
                                                    (key.includes('tipoCambio') || key.includes('tipo_cambio')) ? formatExchangeRate(value, 6) :
                                                    formatNumber(value)) 
                                                    : String(value)}
                                            </Typography>
                                        </Grid>
                                    ))}
                                </Grid>
                            </Box>
                        )}
                        {pruebaResults.api_values && (
                            <Box mb={3}>
                                <Typography variant="h6" gutterBottom color="secondary.main">Valores Obtenidos por API (Backend)</Typography>
                                <Grid container spacing={1}>
                                    {Object.entries(pruebaResults.api_values).map(([key, value]) => (
                                        <Grid item xs={12} sm={6} md={4} key={`api_val-${key}`}>
                                            <Typography variant="body2">
                                                <strong>{key.split('_').map(w=>w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}:</strong> 
                                                {typeof value === 'number' ? formatExchangeRate(value, 6) : String(value)}
                                            </Typography>
                                        </Grid>
                                    ))}
                                </Grid>
                            </Box>
                        )}

                        <Typography variant="h6" gutterBottom color="success.main">Resultados Calculados</Typography>
                        {Object.entries(pruebaResults.calculados).map(([sectionKey, sectionValues]) => {
                            const typedSectionKey = sectionKey as keyof typeof resultLabels;
                            const sectionConfig = resultLabels[typedSectionKey];
                            if (!sectionConfig || typeof sectionValues !== 'object' || sectionValues === null) return null;

                            return (
                                <Box key={sectionKey} mb={2.5} component={Paper} elevation={1} p={2}>
                                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{borderBottom: '1px solid', borderColor:'divider', pb:0.5, mb:1}}>
                                        {sectionConfig.sectionTitle || sectionKey.split('_').map(w=>w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                    </Typography>
                                    <Grid container spacing={1}>
                                        {Object.entries(sectionValues).map(([fieldKey, fieldValue]) => {
                                            const fieldLabel = sectionConfig[fieldKey] || fieldKey.split('_').map(w=>w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                                            let formattedValue = '--';
                                            if (typeof fieldValue === 'number') {
                                                if (fieldKey.toLowerCase().includes('_clp')) formattedValue = formatCLP(fieldValue);
                                                else if (fieldKey.toLowerCase().includes('_eur')) formattedValue = formatGenericCurrency(fieldValue, 'EUR');
                                                else if (fieldKey.toLowerCase().includes('_usd')) formattedValue = formatGenericCurrency(fieldValue, 'USD');
                                                else if (fieldKey.toLowerCase().includes('_pct') || fieldKey.toLowerCase().includes('tasa') || fieldKey.toLowerCase().includes('factor') ) formattedValue = formatPercentDisplay(fieldValue);
                                                else if (fieldKey.toLowerCase().includes('tipocambio')) formattedValue = formatExchangeRate(fieldValue, 6);
                                                else formattedValue = formatNumber(fieldValue);
                                            } else if (fieldValue !== undefined && fieldValue !== null) {
                                                formattedValue = String(fieldValue);
                                            }
                                            return (
                                                <Grid item xs={12} sm={6} md={4} key={`${sectionKey}-${fieldKey}`}>
                                                    <Typography variant="body2"><strong>{fieldLabel}:</strong> {formattedValue}</Typography>
                                                </Grid>
                                            );
                                        })}
                                    </Grid>
                                </Box>
                            );
                        })}
                    </Box>
                )}

            </Paper>
        </Container>
    );
} 