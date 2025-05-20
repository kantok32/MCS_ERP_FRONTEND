// Interfaz para la respuesta del webhook de divisas
export interface CurrencyWebhookResponse {
  Valor_Dolar: string;
  Valor_Euro: string;
}

// Interfaz para los parámetros de costos
export interface CostParams {
  // Parámetros básicos
  margen_adicional_total?: number;
  buffer_eur_usd?: number;
  buffer_usd_clp?: number;
  buffer_dolar?: number;
  tasa_seguro?: number;
  tasa_seguro_categoria?: number;
  tipo_cambio_eur_usd?: number;
  dolar_observado_actual?: number;
  buffer_transporte?: number;
  descuento_fabricante?: number;
  
  // Parámetros adicionales
  costo_fabrica_original_eur?: number;
  fecha_ultima_actualizacion_transporte_local?: string;
  transporte_local_eur?: number;
  gasto_importacion_eur?: number;
  flete_maritimo_usd?: number;
  recargos_destino_usd?: number;
  honorarios_agente_aduana_usd?: number;
  gastos_portuarios_otros_usd?: number;
  transporte_nacional_clp?: number;
  factor_actualizacion_anual?: number;
  derecho_ad_valorem?: number;
  iva?: number;

  // Parámetros de contenedor
  unidades_por_contenedor?: number;
  tipo_contenedor?: string;
  requiere_aprobacion_especial?: boolean;
}

// Interfaz para la respuesta del webhook de parámetros de costos
export interface CostParamsWebhookResponse {
  _id?: string;
  nivel?: string;
  categoryId?: string;
  costos?: CostParams;
  metadata?: {
    ultima_actualizacion?: Date;
    actualizado_por?: string;
  };
} 