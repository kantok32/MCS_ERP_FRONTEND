import React from 'react';
// Removed unused icons
import { Outlet } from 'react-router-dom';
import PageLayout from '../components/PageLayout'; // Importar PageLayout

export default function AdminPanel() {

  // const location = useLocation(); // No longer needed if nav styles are removed
  // // Estilos para la navegación interna (REMOVED)

  return (
    <PageLayout> {/* Envolver el contenido principal */} 
      <div> {/* Mantener este div como contenedor interno */}
        {/* Área donde se renderizará el contenido de la sub-ruta */}
        <div style={{ marginTop: '24px' /* Added margin top to compensate for removed nav */ }}>
          <Outlet />
        </div>
      </div>
    </PageLayout>
  );
} 