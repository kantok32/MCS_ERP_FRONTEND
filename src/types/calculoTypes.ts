import { Producto } from './product'; // Asumiendo que Producto se define aquí o se reexporta

export interface DatosContables {
    costo_fabrica?: number;
    divisa_costo?: string;
    fecha_cotizacion?: string;
    [key: string]: any;
}

// Si Producto tiene su propia definición más allá de lo que está en product.ts,
// y no es la que se importa, se necesitaría definirla aquí también o ajustar la importación.
// Por ahora, se asume que la importación de './product' es suficiente.

export interface ProductoConOpcionales {
  principal: Producto;
  opcionales: Producto[];
}

export interface GroupedPruebaResults {
    costo_producto: Record<string, number | undefined>;
    logistica_seguro: Record<string, number | undefined>;
    importacion: Record<string, number | undefined>;
    landed_cost: Record<string, number | undefined>;
    conversion_margen: Record<string, number | undefined>;
    precios_cliente: Record<string, number | undefined>;
}

export interface CalculationResult {
    inputs?: any; 
    calculados?: GroupedPruebaResults;
    error?: string;
    profileName?: string;
}

// Otros tipos de ResultadosCalculoCostosPanel que podrían ser útiles aquí:
export interface LocationState {
    productosConOpcionalesSeleccionados?: ProductoConOpcionales[];
    selectedProfileId?: string | null;
    nombrePerfil?: string;
}

export interface LineaDeTrabajoConCosto extends ProductoConOpcionales {
    costoBaseTotalEur: number;
    detalleCalculoPrincipal?: CalculationResult;
    detallesCalculoOpcionales?: CalculationResult[];
    precioVentaTotalClienteCLPPrincipal?: number;
    opcionalesConErroresCalculo?: CalculationResult[];
    profileIdForCalc?: string;
}

// --- INICIO: Nuevos Tipos para calcularCostoProductoConPerfil ---
export interface CalcularCostoProductoPayload {
  profileId?: string; // Es opcional si se proveen todos los datos manualmente
  anoCotizacion: number;
  anoEnCurso: number;
  costoFabricaOriginalEUR: number;
  tipoCambioEurUsdActual: number;
  // Los siguientes campos son parte del perfil, pero pueden ser necesarios si no se usa un profileId
  // o para permitir overrides puntuales si el backend lo soporta.
  // Por ahora, nos basamos en que el profileId es la fuente principal para estos.
  descuento_pct?: number; 
  buffer_eur_usd_pct?: number;
  costos_origen_eur?: number;
  flete_maritimo_usd?: number;
  recargos_destino_usd?: number;
  tasa_seguro_pct?: number;
  honorarios_agente_aduana_usd?: number; // Nombre anterior: costo_agente_aduana_usd
  gastos_portuarios_otros_usd?: number;
  transporte_nacional_clp?: number;
  buffer_usd_clp_pct?: number;
  margen_adicional_pct?: number;
  derecho_advalorem_pct?: number;
  iva_pct?: number;
  descuento_cliente_pct?: number;
  codigo_producto?: string; // Necesario si no se usa un profileId y el backend lo requiere
  // tipoCambioUsdClpActual no se envía, el backend lo obtiene.
}

export interface CalcularCostoProductoResponse {
  perfilUsado?: { _id: string; nombre_perfil: string }; // Ajustado a nombre_perfil
  resultado: {
    inputs: any; // Datos de entrada que usó el backend
    calculados: GroupedPruebaResults; // Usamos la interfaz existente
    api_values?: { // Valores obtenidos por el backend, ej: tipos de cambio
        tipo_cambio_eur_usd_actual?: number;
        tipo_cambio_usd_clp_actual?: number;
    };
  };
  message?: string; // Mensaje de éxito o error
  error?: string; // Para errores específicos de la operación
}
// --- FIN: Nuevos Tipos --- 