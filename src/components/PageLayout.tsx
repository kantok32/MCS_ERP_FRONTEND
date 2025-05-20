import React from 'react';

export default function PageLayout({ children }: { children: React.ReactNode }) {
  return (
    <main style={{
      // maxWidth: '1280px', // Mantenido comentado por ahora
      // margin: '0 auto', // Mantenido comentado por ahora
      padding: '24px', // Añadido padding para espaciado interno
      width: '100%', // Asegura que ocupe el ancho del contenedor padre
      height: '100%', // Asegura que ocupe la altura del contenedor padre (definido en App.tsx)
      // minHeight: 'calc(100vh - 64px)', // Removido, la altura es controlada por el contenedor en App.tsx
      boxSizing: 'border-box', // Mantiene el padding/border dentro del width/height
      overflow: 'auto', // Permite scroll interno si el contenido excede
    }}>
      {children}
    </main>
  );
} 