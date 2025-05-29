import { EspecificacionTecnica } from '../types';

export const transformSpecificationsToArray = (specs: any, productCode: string): EspecificacionTecnica[] => {
  if (!specs || typeof specs !== 'object') {
    return [];
  }

  const result: EspecificacionTecnica[] = [];

  // Función recursiva para procesar objetos anidados manteniendo el orden
  const processObject = (obj: any, currentPath: string[] = []) => {
    for (const [key, value] of Object.entries(obj)) {
      const newPath = [...currentPath, key];
      
      if (typeof value === 'object' && value !== null) {
        // Si es un objeto, primero agregamos un título
        result.push({
          nombre: key,
          clave: newPath.join('.'),
          tipo: 'titulo',
          path: newPath,
          valores: {}
        });
        
        // Luego procesamos sus propiedades manteniendo el orden
        processObject(value, newPath);
      } else {
        // Si es un valor primitivo, lo agregamos como característica
        result.push({
          nombre: key,
          clave: newPath.join('.'),
          tipo: 'caracteristica',
          path: newPath,
          valores: {
            [productCode]: value === null || value === undefined ? '-' : String(value)
          }
        });
      }
    }
  };

  // Procesar el objeto principal manteniendo el orden original
  processObject(specs);

  return result;
}; 