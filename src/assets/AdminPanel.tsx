/*
  Componente AdminPanel comentado/deshabilitado temporalmente 
  debido a que dependía de la estructura y rutas antiguas (PricingOverride).
  Necesita refactorización para usar CostoPerfil y /api/costo-perfiles si su funcionalidad
  sigue siendo necesaria.
*/

import React, { useState, useEffect } from 'react';
// Importar tipos y api service
import { CostoPerfilData } from '../types'; 
import { api } from '../services/api';
// Eliminar axios si ya no se usa directamente
// import axios from 'axios'; 

// --- Remove this old Interface ---
/*
interface PricingOverride {
  _id: string;
  nivel: 'global' | 'categoria' | 'producto';
  costos: any; // Simplified for this example
  categoryId?: string;
  productId?: string;
  createdAt?: string;
  updatedAt?: string;
}
*/

const AdminPanel: React.FC = () => {
  // Usar el tipo correcto para el estado
  const [costoPerfiles, setCostoPerfiles] = useState<CostoPerfilData[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Renombrar función fetch para claridad
    const fetchCostoPerfiles = async () => { 
      setIsLoading(true);
      setError(null);
      try {
        // Usar la función del servicio api
        const data = await api.fetchAllProfiles(); 
        setCostoPerfiles(data);
      } catch (err) {
        console.error("Error fetching cost profiles:", err);
        // Extraer mensaje de error si es posible
        const errorMsg = err instanceof Error ? err.message : 'Failed to load cost profiles.';
        setError(errorMsg);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCostoPerfiles(); // Llamar a la función renombrada
  }, []);

  if (isLoading) return <div>Loading pricing data...</div>;
  if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;

  // Table structure will be updated
  return (
    <div>
      <h2>Admin Panel - Cost Profiles</h2> 
      {/* Conditionally render table or loading/error states */}
      {isLoading && <div>Loading cost profiles...</div>}
      {error && <div style={{ color: 'red' }}>Error: {error}</div>}
      {!isLoading && !error && (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th> 
              <th>Descripción</th>
              <th>Activo</th> 
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {/* Mapear sobre costoPerfiles y usar los campos correctos */} 
            {costoPerfiles.map((perfil) => (
              <tr key={perfil._id}>
                <td>{perfil._id}</td>
                {/* Acceder a perfil.nombre, etc. */}
                <td>{perfil.nombre}</td> 
                <td>{perfil.descripcion || '-'}</td> 
                <td>{perfil.activo ? 'Sí' : 'No'}</td> 
                <td>
                  {/* Placeholder buttons - Add onClick handlers later */}
                  <button>Edit</button> 
                  <button>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AdminPanel;