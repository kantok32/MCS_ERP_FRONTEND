export interface EspecificacionTecnica {
  nombre: string;
  clave: string;
  tipo: 'titulo' | 'caracteristica';
  path: string[];
  valores: { [key: string]: string };
} 