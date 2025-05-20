import axios from 'axios';
import { CostoPerfilData } from '../types';

// Base URL for the backend API
const API_BASE_URL = 'https://mcs-erp-backend-807184488368.southamerica-west1.run.app/api';
const PROFILES_ENDPOINT = `${API_BASE_URL}/costo-perfiles`;

/**
 * Fetches a single profile by its ID.
 * @param id The ID of the profile to fetch.
 * @returns Promise resolving to the profile data.
 */
export const getPerfilById = async (id: string): Promise<CostoPerfilData> => {
  console.log(`[PerfilService] Fetching profile by ID: ${id}`);
  try {
    const response = await axios.get<CostoPerfilData>(`${PROFILES_ENDPOINT}/${id}`);
    console.log(`[PerfilService] Profile ${id} fetched successfully.`);
    return response.data;
  } catch (error) {
    console.error(`[PerfilService] Error fetching profile ${id}:`, error);
    throw error; 
  }
};

/**
 * Updates an existing profile by its ID.
 * @param id The ID of the profile to update.
 * @param data The partial data containing fields to update.
 * @returns Promise resolving to the updated profile data.
 */
export const updatePerfil = async (id: string, data: Partial<CostoPerfilData>): Promise<CostoPerfilData> => {
  console.log(`[PerfilService] Updating profile ID: ${id}`);
  try {
    const response = await axios.put<CostoPerfilData>(`${PROFILES_ENDPOINT}/${id}`, data);
    console.log(`[PerfilService] Profile ${id} updated successfully.`);
    return response.data;
  } catch (error) {
    console.error(`[PerfilService] Error updating profile ${id}:`, error);
    throw error;
  }
};

// Function to get all profiles
export const getPerfiles = async (): Promise<CostoPerfilData[]> => {
  console.log('[PerfilService] Fetching all profiles...');
  try {
    const response = await axios.get<CostoPerfilData[]>(PROFILES_ENDPOINT);
    console.log(`[PerfilService] Fetched ${response.data.length} profiles.`);
    return response.data;
  } catch (error) {
    console.error('[PerfilService] Error fetching all profiles:', error);
    throw error;
  }
};

// Function to create a new profile
export const createPerfil = async (data: Omit<CostoPerfilData, '_id' | 'createdAt' | 'updatedAt'>): Promise<CostoPerfilData> => {
  console.log('[PerfilService] Creating new profile...');
  try {
    const response = await axios.post<CostoPerfilData>(PROFILES_ENDPOINT, data); 
    console.log(`[PerfilService] Profile created successfully with ID: ${response.data._id}`);
    return response.data;
  } catch (error) {
    console.error('[PerfilService] Error creating profile:', error);
    throw error;
  }
};

// Function to delete a profile
export const deletePerfil = async (id: string): Promise<{ message: string }> => {
  console.log(`[PerfilService] Deleting profile ID: ${id}`);
  try {
    const response = await axios.delete<{ message: string }>(`${PROFILES_ENDPOINT}/${id}`);
    console.log(`[PerfilService] Profile ${id} deleted successfully.`);
    return response.data;
  } catch (error) {
    console.error(`[PerfilService] Error deleting profile ${id}:`, error);
    throw error;
  }
};

// --- NEW FUNCTION ---
/**
 * Calls the backend to calculate product cost using a specific profile and parameters.
 * @param payload Object containing the necessary data for calculation.
 * @param payload.profileId The ID of the cost profile to use.
 * @param payload.anoCotizacion Base year of the original cost.
 * @param payload.anoEnCurso Target year for the calculation.
 * @param payload.costoFabricaOriginalEUR Original product cost in EUR.
 * @param payload.tipoCambioEurUsdActual Current EUR/USD exchange rate (without buffer).
 * @returns Promise resolving to the calculation result from the backend.
 */
export const calculateCostoProductoFromProfileService = async (payload: {
  profileId: string;
  anoCotizacion: number;
  anoEnCurso: number;
  costoFabricaOriginalEUR: number;
  tipoCambioEurUsdActual: number;
}): Promise<any> => { // Consider defining a more specific return type based on backend response
  const CALCULATION_ENDPOINT = `${PROFILES_ENDPOINT}/calcular-producto`;
  console.log('[PerfilService] Calculating product cost from profile with payload:', payload);
  try {
    const response = await axios.post<any>(CALCULATION_ENDPOINT, payload); // Replace 'any' with a specific type if defined
    console.log('[PerfilService] Product cost calculation successful:', response.data);
    return response.data; // The backend returns { perfilUsado: {...}, resultado: {...} }
  } catch (error) {
    console.error('[PerfilService] Error calculating product cost:', error);
    // Consider more specific error handling based on backend error structure
    if (axios.isAxiosError(error) && error.response) {
      // Re-throw the error data from the backend if available
      throw error.response.data; 
    }
    throw error; // Re-throw general error if not an Axios error with response
  }
};

// Add other service functions related to profiles as needed (e.g., deletePerfil, createPerfil) 