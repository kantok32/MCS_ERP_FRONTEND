import { CalculationResult, ProductoConOpcionales } from '../types/calculoTypes'; // Ajustado a la nueva ruta
import { apiClient } from './api'; // Importar apiClient

export interface CotizacionDetails {
  // Define aquí una interfaz básica para los detalles de cotización que enviarás
  // inicialmente. Pueden ser todos opcionales.
  empresaQueCotiza?: string;
  clienteNombre?: string | null;
  clienteRut?: string | null;
  clienteDireccion?: string | null;
  clienteComuna?: string | null;
  clienteCiudad?: string | null;
  clientePais?: string | null;
  clienteContactoNombre?: string | null;
  clienteContactoEmail?: string | null;
  clienteContactoTelefono?: string | null;
  referenciaDocumento?: string | null;
  fechaCreacionCotizacion?: string | Date | null;
  fechaCaducidadCotizacion?: string | Date | null;
  emisorNombre?: string | null;
  emisorAreaComercial?: string | null;
  emisorEmail?: string | null;
  comentariosAdicionales?: string | null;
  terminosPago?: string | null;
  medioPago?: string | null;
  formaPago?: string | null;
  // No incluyas numeroCotizacion, el backend lo genera
}

export interface GuardarCalculoPayload {
  itemsParaCotizar: ProductoConOpcionales[];
  resultadosCalculados: Record<string, CalculationResult>; // O el tipo que usa transformarLineasParaConfiguracion
  selectedProfileId: string | null;
  nombrePerfil: string;
  anoEnCursoGlobal: number;
  cotizacionDetails: CotizacionDetails;
}

export interface GuardarCalculoResponse {
    // Asume que el backend podría devolver el objeto guardado o al menos el ID y el número.
    _id: string;
    numeroCotizacion: number;
    // ...otros campos que el backend devuelva tras guardar.
    // Si el backend solo devuelve el PDF, esta interfaz de respuesta no aplicaría directamente
    // y el manejo en el frontend sería diferente (ej. no esperar un JSON).
    message?: string; // Para mensajes de éxito/error desde el backend que no sean PDF
}


// Esta función debe llamar al endpoint que SÓLO guarda y devuelve JSON.
export const guardarCalculoHistorial = async (payload: GuardarCalculoPayload): Promise<GuardarCalculoResponse> => {
  // const response = await fetch('/api/calculo-historial/guardar', { // URL CORREGIDA
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify(payload),
  // });

  // const data = await response.json(); // Siempre esperamos JSON de este endpoint

  // if (!response.ok) {
  //   console.error('[calculoHistorialService] Error API:', data);
  //   // Asumimos que 'data' (el JSON de error del backend) tiene una propiedad 'message'
  //   throw new Error(data.message || `Error ${response.status} al guardar el cálculo.`);
  // }

  // // Si la respuesta es OK, 'data' es el cuerpo JSON de éxito.
  // // La interfaz GuardarCalculoResponse debería idealmente coincidir con la estructura de 'data'.
  // // Por ejemplo, si el backend devuelve { message: string, data: { _id: string, ... } }
  // // entonces la interfaz debería reflejar eso para un tipado correcto.
  // return data as GuardarCalculoResponse; // Devolvemos directamente el JSON parseado
  try {
    const response = await apiClient.post<GuardarCalculoResponse>('/calculo-historial/guardar', payload);
    return response.data;
  } catch (error) {
    console.error('[calculoHistorialService] Error guardando cálculo (vía apiClient):', error);
    throw error; // Relanzar para que el componente maneje el error estandarizado por apiClient
  }
}; 

// Interfaz para un ítem individual en la lista de historial
// Ajusta esto según los campos que realmente devuelve tu backend y quieres mostrar
export interface HistorialCalculoItem {
  _id: string;
  itemsParaCotizar: any[]; // Considerar definir una interfaz más específica, e.g., { principal: ProductoHistorialItem, opcionales: ProductoHistorialItem[] }[]
  resultadosCalculados: any; // Considerar definir una interfaz más específica
  cotizacionDetails?: {
    clienteNombre?: string;
    emisorNombre?: string;
    emisorAreaComercial?: string;
    emisorEmail?: string;
    // Añadir más campos si se muestran en la tabla o se necesitan
  };
  nombreReferencia?: string;
  numeroConfiguracion?: number;
  nombrePerfil?: string;
  createdAt: string; // o Date, si se convierte
  // Añadir otros campos que se obtienen del backend y se necesitan en el frontend
}

// Interfaz para los parámetros de búsqueda, paginación y ordenamiento
export interface HistorialQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Interfaz para la respuesta paginada del backend
export interface PaginatedHistorialResponse {
  data: HistorialCalculoItem[];
  total: number; // Total de documentos
  page: number; // Número de página actual
  limit: number; // Elementos por página
  totalPages: number; // Total de páginas
  // Otros metadatos si el backend los envía
}

// Función para obtener historiales de cálculo con paginación, búsqueda y ordenamiento
export const getCalculosHistorial = async (params?: HistorialQueryParams): Promise<PaginatedHistorialResponse> => {
  try {
    // Construimos los parámetros de consulta para la URL
    const queryParams = new URLSearchParams();
    if (params?.page !== undefined) queryParams.append('page', params.page.toString());
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
    if (params?.search !== undefined) queryParams.append('search', params.search);
    if (params?.sortBy !== undefined) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder !== undefined) queryParams.append('sortOrder', params.sortOrder);

    const url = '/calculo-historial' + (queryParams.toString() ? `?${queryParams.toString()}` : '');

    // Esperamos que la respuesta sea la estructura paginada
    const response = await apiClient.get<PaginatedHistorialResponse>(url);
    return response.data; // Retornamos directamente la data del AxiosResponse
  } catch (error) {
    console.error('[calculoHistorialService] Error obteniendo historial paginado (vía apiClient):', error);
    throw error;
  }
}; 

// Función para obtener un historial de cálculo específico por ID
export const getCalculoHistorialById = async (id: string): Promise<HistorialCalculoItem> => {
  // const response = await fetch(`/api/calculo-historial/${id}`, {
  //   method: 'GET',
  //   headers: {
  //     'Content-Type': 'application/json',
  //   },
  // });

  // if (!response.ok) {
  //   const errorData = await response.json();
  //   console.error(`[calculoHistorialService] Error API obteniendo historial por ID (${id}):`, errorData);
  //   throw new Error(errorData.message || `Error ${response.status} al obtener el historial ${id}.`);
  // }

  // return await response.json() as HistorialCalculoItem;
  try {
    const response = await apiClient.get<HistorialCalculoItem>(`/calculo-historial/${id}`);
    return response.data;
  } catch (error) {
    console.error(`[calculoHistorialService] Error obteniendo historial por ID (${id}) (vía apiClient):`, error);
    throw error;
  }
}; 

// Función para eliminar un historial de cálculo por ID
export const deleteCalculoHistorial = async (id: string): Promise<void> => {
  try {
    // Realiza la solicitud DELETE al endpoint del backend
    const response = await apiClient.delete(`/calculo-historial/${id}`);
    // Puedes loguear la respuesta o manejarla si es necesario, pero para una simple eliminación, solo necesitamos que la llamada sea exitosa
    console.log('Historial de cálculo eliminado:', response.data);
  } catch (error) {
    console.error(`[calculoHistorialService] Error eliminando historial por ID (${id}) (vía apiClient):`, error);
    // Lanza el error para que el componente llamador pueda manejarlo
    throw error; 
  }
}; 