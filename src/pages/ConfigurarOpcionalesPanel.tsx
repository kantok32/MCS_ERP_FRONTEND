import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, Typography, Checkbox, CircularProgress, Paper, Box, Grid, IconButton, Alert, Container, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField, Autocomplete, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { ArrowLeft, ArrowRight, RefreshCw, ChevronDown, ChevronUp, Info, AlertTriangle, Search } from 'lucide-react';
import { fetchProductByCode, fetchAllProducts, searchProducts } from '../services/productService';

// Helper para capitalizar texto al estilo español (primera letra mayúscula)
const capitalizeSpanish = (text: string): string => {
  if (!text) return '';
  const trimmedText = text.trim();
  return trimmedText.charAt(0).toUpperCase() + trimmedText.slice(1);
};

// --- Interfaces (muchas de estas podrían venir de un archivo de tipos global) ---
interface Producto {
  _id?: string;
  id?: string;
  codigo_producto?: string;
  nombre_del_producto?: string;
  descripcion?: string;
  Modelo?: string;
  modelo?: string;
  categoria?: string;
  tipo?: string;
  producto?: string; // Para opcionales, indica a qué principal pertenece
  peso_kg?: number | string;
  especificaciones_tecnicas?: any;
  caracteristicas?: { [key: string]: any };
  datos_contables?: { [key: string]: any };
  dimensiones?: { [key: string]: any };
  clasificacion_easysystems?: string;
  codigo_ea?: string;
  proveedor?: string;
  procedencia?: string;
  es_opcional?: boolean;
  familia?: string;
  nombre_comercial?: string;
  detalles?: any;
  descontinuado?: boolean;
  fabricante?: string;
  [key: string]: any;
}

interface OpcionalesResponse {
  total: number;
  products?: Producto[]; // Lista de productos opcionales en el endpoint original
  success: boolean;
  data?: { // Estructura anidada observada en handleOpcionales
    products?: Producto[]; // Lista de productos opcionales (posiblemente obsoleta)
    productosOpcionales?: Producto[]; // Nueva propiedad para el endpoint by-body
    productoPrincipal?: Producto; // Puede que venga el principal aquí también
    total: number;
    source?: string;
  };
  message?: string;
}

interface ProductoConOpcionales {
  principal: Producto;
  opcionales: Producto[];
}

interface LocationState {
  // Original state from EquiposPanel
  productosPrincipales?: Producto[]; 

  // New State from HistorialDetallePage
  fromHistory?: boolean;
  mainProductCodigo?: string;
  selectedOptionalCodigos?: string[];

  // Potentially other shared data
  // selectedProfileId?: string | null;
  // nombrePerfil?: string;
  // anoEnCursoGlobal?: number;
}

export default function ConfigurarOpcionalesPanel() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | null;

  console.log('[ConfigurarOpcionalesPanel] Initial location.state:', state); // LOG 1

  const [productosPrincipales, setProductosPrincipales] = useState<Producto[]>([]);
  const [opcionalesDisponibles, setOpcionalesDisponibles] = useState<Record<string, Producto[]>>({});
  const [opcionalesSeleccionados, setOpcionalesSeleccionados] = useState<Record<string, Set<string>>>({});
  const [loadingOpcionales, setLoadingOpcionales] = useState<Record<string, boolean>>({});
  const [errorOpcionales, setErrorOpcionales] = useState<Record<string, string | null>>({});
  const [expandedPrincipales, setExpandedPrincipales] = useState<Record<string, boolean>>({});
  const [showDiscontinuedWarning, setShowDiscontinuedWarning] = useState(false);
  const [discontinuedProductName, setDiscontinuedProductName] = useState<string>('');

  // Estados para la lista completa de productos principales y filtrados para selección
  const [todosLosPrincipales, setTodosLosPrincipales] = useState<Producto[]>([]);
  const [principalesFiltradosParaSeleccion, setPrincipalesFiltradosParaSeleccion] = useState<Producto[]>([]);
  const [loadingTodosLosPrincipales, setLoadingTodosLosPrincipales] = useState<boolean>(false);

  // Estados para los filtros del nuevo buscador
  const [filtroBusquedaGeneral, setFiltroBusquedaGeneral] = useState('');
  const [filtroModeloConfig, setFiltroModeloConfig] = useState('');
  const [filtroFabricanteConfig, setFiltroFabricanteConfig] = useState('');
  const [filtroCategoriaConfig, setFiltroCategoriaConfig] = useState('');
  // Podríamos añadir más filtros como familia, etc. si es necesario

  // Estados para las listas de valores únicos para los dropdowns de los filtros
  const [uniqueModelosConfig, setUniqueModelosConfig] = useState<string[]>([]);
  const [uniqueFabricantesConfig, setUniqueFabricantesConfig] = useState<string[]>([]);
  const [uniqueCategoriasConfig, setUniqueCategoriasConfig] = useState<string[]>([]);

  // New state for product search (DEPRECATED by new filter logic, but kept for Autocomplete for now)
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Producto[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [selectedProductForAddition, setSelectedProductForAddition] = useState<Producto | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Estado para los productos seleccionados en la nueva UI de filtro
  const [productosSeleccionadosDelFiltro, setProductosSeleccionadosDelFiltro] = useState<Set<string>>(new Set());

  // Efecto para cargar todos los productos principales una vez
  useEffect(() => {
    const cargarTodosLosProductosPrincipales = async () => {
      setLoadingTodosLosPrincipales(true);
      try {
        const todosLosProductos = await fetchAllProducts(); // Asume que esto devuelve todos los productos
        
        const principales = todosLosProductos.filter((p: Producto) => {
            const nombreProductoNormalizado = p.nombre_del_producto?.toLowerCase() || '';
            const tipoProductoNormalizado = p.tipo?.toLowerCase() || '';
            const esOpcionalPorNombre = nombreProductoNormalizado.includes('opcional');
            const esOpcionalPorTipoDirecto = tipoProductoNormalizado === 'opcional';
            // Considerar p.es_opcional si ese campo es confiable
            return !(esOpcionalPorNombre || esOpcionalPorTipoDirecto || p.es_opcional);
        });

        setTodosLosPrincipales(principales);
        setPrincipalesFiltradosParaSeleccion(principales); // Inicialmente mostrar todos

        // Extraer valores únicos para los filtros
        const modelos = new Set<string>();
        const fabricantes = new Set<string>();
        const categorias = new Set<string>();

        principales.forEach((p: Producto) => {
          if (p.Modelo) modelos.add(p.Modelo.trim()); 
          else if (p.modelo) modelos.add(p.modelo.trim());
          
          if (p.fabricante) fabricantes.add(p.fabricante.trim());
          if (p.categoria) categorias.add(p.categoria.trim());
        });

        setUniqueModelosConfig(Array.from(modelos).sort());
        setUniqueFabricantesConfig(Array.from(fabricantes).sort());
        setUniqueCategoriasConfig(Array.from(categorias).sort());

      } catch (error) {
        console.error("Error al cargar todos los productos principales:", error);
        // Manejar error, quizás mostrar un mensaje al usuario
      } finally {
        setLoadingTodosLosPrincipales(false);
      }
    };
    cargarTodosLosProductosPrincipales();
  }, []);

  // Efecto para aplicar filtros y actualizar principalesFiltradosParaSeleccion
  useEffect(() => {
    let productosFiltrados = [...todosLosPrincipales];

    // 1. Aplicar filtro de búsqueda general (nombre, código, descripción)
    if (filtroBusquedaGeneral.trim()) {
      const busquedaLower = filtroBusquedaGeneral.toLowerCase().trim();
      productosFiltrados = productosFiltrados.filter(p => 
        (p.nombre_del_producto?.toLowerCase().includes(busquedaLower)) ||
        (p.codigo_producto?.toLowerCase().includes(busquedaLower)) ||
        (p.descripcion?.toLowerCase().includes(busquedaLower)) ||
        (p.Modelo?.toLowerCase().includes(busquedaLower)) || // Buscar también en Modelo
        (p.modelo?.toLowerCase().includes(busquedaLower))
      );
    }

    // 2. Aplicar filtro por Modelo
    if (filtroModeloConfig) {
      productosFiltrados = productosFiltrados.filter(p => 
        (p.Modelo === filtroModeloConfig || p.modelo === filtroModeloConfig)
      );
    }

    // 3. Aplicar filtro por Fabricante
    if (filtroFabricanteConfig) {
      productosFiltrados = productosFiltrados.filter(p => p.fabricante === filtroFabricanteConfig);
    }

    // 4. Aplicar filtro por Categoría
    if (filtroCategoriaConfig) {
      productosFiltrados = productosFiltrados.filter(p => p.categoria === filtroCategoriaConfig);
    }

    setPrincipalesFiltradosParaSeleccion(productosFiltrados);

  }, [todosLosPrincipales, filtroBusquedaGeneral, filtroModeloConfig, filtroFabricanteConfig, filtroCategoriaConfig]);

  const fetchOpcionalesParaPrincipal = useCallback(async (principal: Producto) => {
    if (!principal.codigo_producto || !principal.Modelo) {
      setErrorOpcionales(prev => ({ ...prev, [principal.codigo_producto!]: 'Datos del producto principal incompletos para buscar opcionales.' }));
      return;
    }
    setLoadingOpcionales(prev => ({ ...prev, [principal.codigo_producto!]: true }));
    setErrorOpcionales(prev => ({ ...prev, [principal.codigo_producto!]: null }));

    const API_BASE_URL = 'https://mcs-erp-backend-807184488368.southamerica-west1.run.app/api';

    try {
      const modeloParaBuscar = principal.modelo || principal.caracteristicas?.modelo || principal.Modelo;
      const categoriaParaBuscar = principal.categoria;

      if (!modeloParaBuscar || typeof modeloParaBuscar !== 'string' || modeloParaBuscar.trim() === '' || modeloParaBuscar.trim() === '-' || !categoriaParaBuscar || typeof categoriaParaBuscar !== 'string' || categoriaParaBuscar.trim() === '') {
          throw new Error('Faltan parámetros requeridos (modelo o categoría) del producto principal para buscar opcionales.');
      }

      const baseModelo = modeloParaBuscar.split(' ')[0];

      console.log('[ConfigurarOpcionalesPanel] Buscando opcionales para producto (GET):', {
        codigo: principal.codigo_producto,
        modelo: baseModelo,
        categoria: categoriaParaBuscar
      });

      const params = new URLSearchParams();
      params.append('codigo', principal.codigo_producto);
      params.append('modelo', baseModelo);
      params.append('categoria', categoriaParaBuscar);

      const response = await fetch(`${API_BASE_URL}/products/opcionales?${params.toString()}`, {
        method: 'GET',
      });
      
      const data: OpcionalesResponse = await response.json();

      console.log('[ConfigurarOpcionalesPanel] Respuesta de opcionales (GET):', data);

      if (!response.ok || !data.success) {
        throw new Error(data.message || `Error del servidor: ${response.status}`);
      }

      const opcionales = data.data?.products || data.products || [];
      const opcionalesFinal = opcionales;

      console.log('[ConfigurarOpcionalesPanel] Opcionales recibidos y procesados:', opcionalesFinal);

      setErrorOpcionales(prev => ({ 
        ...prev, 
        [principal.codigo_producto!]: null 
      }));

      setOpcionalesDisponibles(prev => ({ ...prev, [principal.codigo_producto!]: opcionalesFinal }));

    } catch (error: any) {
      console.error(`[ConfigurarOpcionalesPanel] Error al obtener opcionales para ${principal.codigo_producto}:`, error);
      setErrorOpcionales(prev => ({ 
        ...prev, 
        [principal.codigo_producto!]: error.message || 'Error desconocido al buscar opcionales.' 
      }));
      setOpcionalesDisponibles(prev => ({ ...prev, [principal.codigo_producto!]: [] }));
    } finally {
      setLoadingOpcionales(prev => ({ ...prev, [principal.codigo_producto!]: false }));
    }
  }, []);

  useEffect(() => {
    console.log('[ConfigurarOpcionalesPanel] useEffect activado. Longitud actual de productosPrincipales:', productosPrincipales.length, 'Estado actual:', state);
    const loadDataFromState = async () => {
      console.log('[ConfigurarOpcionalesPanel] loadDataFromState llamado. Estado:', state);
      if (state?.fromHistory && state.mainProductCodigo) {
        setLoadingOpcionales(prev => ({ ...prev, [state.mainProductCodigo!]: true }));
        try {
          const mainProduct = await fetchProductByCode(state.mainProductCodigo);
          if (!mainProduct) {
            throw new Error(`Producto principal con código ${state.mainProductCodigo} no encontrado.`);
          }
          const mainProductWithCategory = {
            ...mainProduct,
            categoria: 'principal'
          };
          setProductosPrincipales([mainProductWithCategory]);
          console.log('[ConfigurarOpcionalesPanel] Cargado desde historial, producto principal:', mainProductWithCategory);
          
          const initialSelections: Record<string, Set<string>> = {};
          initialSelections[mainProductWithCategory.codigo_producto!] = new Set<string>(state.selectedOptionalCodigos || []);
          setOpcionalesSeleccionados(initialSelections);

          const initialExpanded: Record<string, boolean> = {};
          initialExpanded[mainProductWithCategory.codigo_producto!] = true;
          setExpandedPrincipales(initialExpanded);

          await fetchOpcionalesParaPrincipal(mainProductWithCategory);

          if (mainProductWithCategory.descontinuado) {
            setDiscontinuedProductName(mainProductWithCategory.nombre_del_producto || mainProductWithCategory.codigo_producto || 'Desconocido');
            setShowDiscontinuedWarning(true);
          }
        } catch (error: any) {
          console.error("Error al cargar configuración desde historial:", error);
          alert(`Error al cargar configuración desde historial: ${error.message}`);
          navigate('/historial');
        } finally {
          if (state.mainProductCodigo) {
             setLoadingOpcionales(prev => ({ ...prev, [state.mainProductCodigo!]: false }));
          }
        }
      } else if (state?.productosPrincipales && state.productosPrincipales.length > 0) {
        const productosPrincipalesWithCategory = state.productosPrincipales.map(p => ({
          ...p,
          categoria: 'principal'
        }));
        setProductosPrincipales(productosPrincipalesWithCategory);
        console.log('[ConfigurarOpcionalesPanel] Cargado desde estado de EquiposPanel, productosPrincipales:', productosPrincipalesWithCategory);
        const initialSelections: Record<string, Set<string>> = {};
        const initialExpanded: Record<string, boolean> = {};
        let descontinuadoEncontrado = false;
        let primerDescontinuadoNombre = '';

        productosPrincipalesWithCategory.forEach(p => {
          if (p.codigo_producto) {
            initialSelections[p.codigo_producto] = new Set<string>();
            initialExpanded[p.codigo_producto] = true; 
            fetchOpcionalesParaPrincipal(p);
            if (p.descontinuado) {
              descontinuadoEncontrado = true;
              if (!primerDescontinuadoNombre) {
                primerDescontinuadoNombre = p.nombre_del_producto || p.codigo_producto || 'Desconocido';
              }
            }
          }
        });
        setOpcionalesSeleccionados(initialSelections);
        setExpandedPrincipales(initialExpanded);
        if (descontinuadoEncontrado) {
          setDiscontinuedProductName(primerDescontinuadoNombre);
          setShowDiscontinuedWarning(true);
        }
      } else {
        console.log('[ConfigurarOpcionalesPanel] No hay estado específico para carga inicial. Estableciendo productosPrincipales como array vacío.');
        setProductosPrincipales([]); 
      }
    };

    if (productosPrincipales.length === 0) {
        console.log('[ConfigurarOpcionalesPanel] useEffect: productosPrincipales está vacío, llamando a loadDataFromState.');
        loadDataFromState();
    } else {
        console.log('[ConfigurarOpcionalesPanel] useEffect: productosPrincipales NO está vacío, omitiendo loadDataFromState.');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, [state, navigate, fetchOpcionalesParaPrincipal]);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setSearchError('Por favor, ingrese un término de búsqueda.');
      return;
    }

    setLoadingSearch(true);
    setSearchError(null);
    setSearchResults([]);

    try {
      console.log('[ConfigurarOpcionalesPanel] Buscando productos con término:', searchTerm);
      const results = await searchProducts(searchTerm);
      console.log('[ConfigurarOpcionalesPanel] Resultados de búsqueda:', results);

      if (!results || results.length === 0) {
        setSearchError('No se encontraron productos con ese término de búsqueda.');
        return;
      }

      const productosPrincipalesResult = results.filter(producto => 
        producto.codigo_producto && 
        producto.nombre_del_producto && 
        !producto.es_opcional
      );

      if (productosPrincipalesResult.length === 0) {
        setSearchError('No se encontraron productos principales con ese término de búsqueda.');
        return;
      }

      setSearchResults(productosPrincipalesResult);
    } catch (error: any) {
      console.error('[ConfigurarOpcionalesPanel] Error en búsqueda:', error);
      setSearchError(error.message || 'Error al buscar productos.');
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleSelectProductForAddition = (event: React.SyntheticEvent, value: Producto | null) => {
    setSelectedProductForAddition(value);
    if (value) {
        setSearchTerm(value.nombre_del_producto || value.codigo_producto || '');
    }
    console.log('[ConfigurarOpcionalesPanel] Producto seleccionado para agregar:', value);
  };
  
  const handleLoadProduct = async () => {
    if (!selectedProductForAddition) {
      setSearchError('Por favor, seleccione un producto de la lista.');
      return;
    }

    try {
      console.log('[ConfigurarOpcionalesPanel] Cargando producto:', selectedProductForAddition);
      
      if (!selectedProductForAddition.codigo_producto || !selectedProductForAddition.Modelo) {
        throw new Error('El producto seleccionado no tiene todos los datos necesarios.');
      }

      const productoExistente = productosPrincipales.find(
        p => p.codigo_producto === selectedProductForAddition.codigo_producto
      );

      if (productoExistente) {
        setSearchError('Este producto ya está en la lista.');
        return;
      }

      const nuevoProducto = {
        ...selectedProductForAddition,
        categoria: 'principal'
      };

      setProductosPrincipales(prev => [...prev, nuevoProducto]);
      
      setExpandedPrincipales(prev => ({
        ...prev,
        [nuevoProducto.codigo_producto!]: true
      }));

      setOpcionalesSeleccionados(prev => ({
        ...prev,
        [nuevoProducto.codigo_producto!]: new Set<string>()
      }));

      await fetchOpcionalesParaPrincipal(nuevoProducto);

      setSearchTerm('');
      setSearchResults([]);
      setSelectedProductForAddition(null);
      setSearchError(null);

    } catch (error: any) {
      console.error('[ConfigurarOpcionalesPanel] Error al cargar producto:', error);
      setSearchError(error.message || 'Error al cargar el producto.');
    }
  };

  const handleToggleOpcional = (codigoPrincipal: string, codigoOpcional: string) => {
    setOpcionalesSeleccionados(prev => {
      const newSelections = { ...prev };
      const setActual = new Set(newSelections[codigoPrincipal] || []);
      if (setActual.has(codigoOpcional)) {
        setActual.delete(codigoOpcional);
      } else {
        setActual.add(codigoOpcional);
      }
      newSelections[codigoPrincipal] = setActual;
      return newSelections;
    });
  };

  const toggleExpandPrincipal = (codigoPrincipal: string) => {
    setExpandedPrincipales(prev => ({ ...prev, [codigoPrincipal]: !prev[codigoPrincipal] }));
  };
  
  const handleConfirmarOpcionales = () => {
    const itemsParaProcesar: ProductoConOpcionales[] = productosPrincipales.map(principal => {
      const principalesOpcionalesCodigos = opcionalesSeleccionados[principal.codigo_producto!] || new Set<string>();
      const opcionalesDePrincipal = (opcionalesDisponibles[principal.codigo_producto!] || [])
        .filter(op => op.codigo_producto && principalesOpcionalesCodigos.has(op.codigo_producto));
      
      return {
        principal: principal,
        opcionales: opcionalesDePrincipal
      };
    });

    console.log("Configuración de opcionales confirmada:", itemsParaProcesar);
    
    navigate('/resumen-carga', {
      state: {
        itemsParaCotizar: itemsParaProcesar,
      }
    });
  };

  const handleCloseDiscontinuedWarning = () => {
    setShowDiscontinuedWarning(false);
  };

  const handleToggleSeleccionProductoDelFiltro = (codigoProducto: string) => {
    console.log('[ConfigurarOpcionalesPanel] handleToggleSeleccionProductoDelFiltro, codigo:', codigoProducto);
    setProductosSeleccionadosDelFiltro(prev => {
      const newSet = new Set(prev);
      if (newSet.has(codigoProducto)) {
        newSet.delete(codigoProducto);
        console.log('[ConfigurarOpcionalesPanel] Producto deseleccionado:', codigoProducto, 'Nuevo Set:', newSet);
      } else {
        newSet.add(codigoProducto);
        console.log('[ConfigurarOpcionalesPanel] Producto seleccionado:', codigoProducto, 'Nuevo Set:', newSet);
      }
      return newSet;
    });
  };

  const handleAgregarProductosSeleccionados = async () => {
    console.log('[ConfigurarOpcionalesPanel] handleAgregarProductosSeleccionados INVOCADO'); // Log de entrada
    console.log('[ConfigurarOpcionalesPanel] Estado actual de productosSeleccionadosDelFiltro:', productosSeleccionadosDelFiltro);

    const productosParaAgregar = todosLosPrincipales.filter(p => p.codigo_producto && productosSeleccionadosDelFiltro.has(p.codigo_producto));
    console.log('[ConfigurarOpcionalesPanel] Productos para agregar:', productosParaAgregar);
    
    let algunoYaExistia = false;
    const nuevosPrincipales: Producto[] = [...productosPrincipales];
    const promesasFetchOpcionales: Promise<void>[] = [];

    productosParaAgregar.forEach(productoAAgregar => {
      const existente = productosPrincipales.find(p => p.codigo_producto === productoAAgregar.codigo_producto);
      if (!existente) {
        const nuevoProductoPrincipal = {
          ...productoAAgregar,
          categoria: 'principal' // Asegurar que se marque como principal
        };
        nuevosPrincipales.push(nuevoProductoPrincipal);
        
        setExpandedPrincipales(prev => ({ ...prev, [nuevoProductoPrincipal.codigo_producto!]: true }));
        setOpcionalesSeleccionados(prev => ({ ...prev, [nuevoProductoPrincipal.codigo_producto!]: new Set<string>() }));
        promesasFetchOpcionales.push(fetchOpcionalesParaPrincipal(nuevoProductoPrincipal));

      } else {
        algunoYaExistia = true;
      }
    });

    if (nuevosPrincipales.length > productosPrincipales.length) {
      setProductosPrincipales(nuevosPrincipales);
    }

    if (promesasFetchOpcionales.length > 0) {
      await Promise.all(promesasFetchOpcionales);
    }

    if (algunoYaExistia) {
      // Podríamos notificar al usuario que algunos productos ya estaban en la lista
      console.log("Algunos productos seleccionados ya estaban en la lista y no se re-agregaron.");
    }
    
    // Limpiar selección del filtro
    setProductosSeleccionadosDelFiltro(new Set());
    // Opcionalmente, resetear filtros (depende de la UX deseada)
    // setFiltroBusquedaGeneral('');
    // setFiltroModeloConfig('');
    // setFiltroFabricanteConfig('');
    // setFiltroCategoriaConfig('');
  };

  if (productosPrincipales.length === 0 && ( (state?.fromHistory && state.mainProductCodigo) || (state?.productosPrincipales && state.productosPrincipales.length > 0 ) )) {
    let isLoadingFromState = false;
    if (state?.fromHistory && state.mainProductCodigo && loadingOpcionales[state.mainProductCodigo]) {
        isLoadingFromState = true;
    } else if (state?.productosPrincipales && state.productosPrincipales.some(p => p.codigo_producto && loadingOpcionales[p.codigo_producto])) {
        isLoadingFromState = true;
    }
    
    if (isLoadingFromState) {
        return (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <CircularProgress />
            <Typography sx={{ mt: 2 }}>Cargando Configuración de Opcionales...</Typography>
          </Box>
        );
    }
  }

  console.log('[ConfigurarOpcionalesPanel] Renderizando. productosPrincipales:', productosPrincipales);
  console.log('[ConfigurarOpcionalesPanel] productosSeleccionadosDelFiltro size:', productosSeleccionadosDelFiltro.size);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
          Buscar y Añadir Productos Principales
        </Typography>
        
        {/* Nueva UI de Filtros */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Buscar por Nombre, Código, Descripción, Modelo..."
                  variant="outlined"
              value={filtroBusquedaGeneral}
              onChange={(e) => setFiltroBusquedaGeneral(e.target.value)}
                  InputProps={{
                startAdornment: <Search style={{ marginRight: '8px', color: 'action.active' }} />
              }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth variant="outlined">
              <InputLabel>Modelo</InputLabel>
              <Select
                value={filtroModeloConfig}
                onChange={(e) => setFiltroModeloConfig(e.target.value as string)}
                label="Modelo"
              >
                <MenuItem value=""><em>Todos</em></MenuItem>
                {uniqueModelosConfig.map(modelo => (
                  <MenuItem key={modelo} value={modelo}>{modelo}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth variant="outlined">
              <InputLabel>Fabricante</InputLabel>
              <Select
                value={filtroFabricanteConfig}
                onChange={(e) => setFiltroFabricanteConfig(e.target.value as string)}
                label="Fabricante"
              >
                <MenuItem value=""><em>Todos</em></MenuItem>
                {uniqueFabricantesConfig.map(fab => (
                  <MenuItem key={fab} value={fab}>{fab}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth variant="outlined">
              <InputLabel>Categoría</InputLabel>
              <Select
                value={filtroCategoriaConfig}
                onChange={(e) => setFiltroCategoriaConfig(e.target.value as string)}
                label="Categoría"
              >
                <MenuItem value=""><em>Todos</em></MenuItem>
                {uniqueCategoriasConfig.map(cat => (
                  <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* Lista de Productos Filtrados */}
        {loadingTodosLosPrincipales ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}><CircularProgress /></Box>
        ) : principalesFiltradosParaSeleccion.length === 0 && !filtroBusquedaGeneral && !filtroModeloConfig && !filtroFabricanteConfig && !filtroCategoriaConfig ? (
          <Typography sx={{ my: 2, textAlign:'center', color: 'text.secondary' }}>Cargando productos o no hay productos principales disponibles.</Typography>
        ) : principalesFiltradosParaSeleccion.length === 0 ? (
          <Typography sx={{ my: 2, textAlign:'center', color: 'text.secondary' }}>No se encontraron productos con los filtros aplicados.</Typography>
        ) : (
          <Box sx={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '4px', p:1, mb: 2 }}>
            {principalesFiltradosParaSeleccion
              .filter(p => p.codigo_producto) // Asegurar que el producto tiene un código
              .map(p => {
                const yaEstaAgregado = productosPrincipales.some(principal => principal.codigo_producto === p.codigo_producto);
                return (
                  <Paper 
                    key={p.codigo_producto!} 
                    variant="outlined"
                    sx={{ 
                      p: 1, 
                      mb: 1, 
                      display: 'flex', 
                      alignItems: 'center', 
                      backgroundColor: yaEstaAgregado ? '#f0f0f0' : (productosSeleccionadosDelFiltro.has(p.codigo_producto!) ? '#e3f2fd' : 'inherit'),
                      opacity: yaEstaAgregado ? 0.7 : 1,
                      cursor: yaEstaAgregado ? 'not-allowed' : 'pointer',
                      '&:hover': {
                        backgroundColor: yaEstaAgregado ? '#f0f0f0' : (productosSeleccionadosDelFiltro.has(p.codigo_producto!) ? '#bbdefb' : '#f5f5f5'),
                      }
                    }}
                    // onClick para el Paper solo si no está agregado, para permitir toggle
                    // Si está agregado, el onClick del Paper no debería hacer nada o ser removido.
                    // La lógica del checkbox y el texto se maneja abajo.
                  >
                    <Checkbox 
                      checked={productosSeleccionadosDelFiltro.has(p.codigo_producto!)}
                      onChange={() => !yaEstaAgregado && handleToggleSeleccionProductoDelFiltro(p.codigo_producto!)}
                      size="small"
                      sx={{mr:1}}
                      disabled={yaEstaAgregado}
                      onClick={(e) => e.stopPropagation()} 
                    />
                    <Box
                      onClick={() => !yaEstaAgregado && handleToggleSeleccionProductoDelFiltro(p.codigo_producto!)} 
                      sx={{ 
                        flexGrow: 1, 
                        cursor: yaEstaAgregado ? 'default' : 'pointer',
                        color: yaEstaAgregado ? 'text.disabled' : 'inherit'
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: '500' }}>
                        {p.nombre_del_producto} ({p.codigo_producto})
                        {yaEstaAgregado && <Typography component="span" variant="caption" color="textSecondary" sx={{ ml: 1 }}>(Ya añadido)</Typography>}
                      </Typography>
                      <Typography variant="caption" color={yaEstaAgregado ? 'text.disabled' : 'textSecondary'}>
                        Modelo: {p.Modelo || p.modelo || 'N/A'} | Fabricante: {p.fabricante || 'N/A'} | Categoría: {p.categoria || 'N/A'}
                      </Typography>
                    </Box>
                  </Paper>
                );
            })}
          </Box>
        )}
        
        <Button 
          variant="contained" 
          color="primary"
          onClick={handleAgregarProductosSeleccionados}
          disabled={productosSeleccionadosDelFiltro.size === 0 || loadingTodosLosPrincipales}
          startIcon={<ArrowRight />}
        >
          Añadir Seleccionados a Configuración ({productosSeleccionadosDelFiltro.size})
        </Button>

      </Paper>

      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom align="center">
          Configurar Opcionales para Equipos Seleccionados
        </Typography>

        {productosPrincipales.map(principal => (
          <Box key={principal.codigo_producto} sx={{ mb: 3, border: '1px solid #ddd', borderRadius: '4px' }}>
            <Box 
              sx={{ p: 2, backgroundColor: '#f5f5f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              onClick={() => toggleExpandPrincipal(principal.codigo_producto!)}
            >
              <Typography variant="h6">{capitalizeSpanish(principal.nombre_del_producto || principal.codigo_producto || 'Equipo Desconocido')}</Typography>
              <IconButton size="small">
                {expandedPrincipales[principal.codigo_producto!] ? <ChevronUp /> : <ChevronDown />}
              </IconButton>
            </Box>

            {expandedPrincipales[principal.codigo_producto!] && (
              <Box sx={{ p: 2 }}>
                {loadingOpcionales[principal.codigo_producto!] && <CircularProgress size={24} sx={{my: 2}}/>}
                {errorOpcionales[principal.codigo_producto!] && (
                  <Alert severity="error" sx={{my: 2, display: 'flex', alignItems: 'center'}}>
                    Error al cargar opcionales para {capitalizeSpanish(principal.nombre_del_producto || 'este equipo')}: {errorOpcionales[principal.codigo_producto!]}
                    <Button onClick={() => fetchOpcionalesParaPrincipal(principal)} size="small" startIcon={<RefreshCw size={14}/>} sx={{ml:2, whiteSpace: 'nowrap'}}>Reintentar</Button>
                  </Alert>
                )}
                
                {!loadingOpcionales[principal.codigo_producto!] && !errorOpcionales[principal.codigo_producto!] && (
                  (opcionalesDisponibles[principal.codigo_producto!]?.length || 0) === 0 ? (
                    <Alert severity="info" sx={{ my: 2, display: 'flex', alignItems: 'center' }} icon={<Info size={20} />}>
                      No hay opcionales disponibles para este equipo ({capitalizeSpanish(principal.nombre_del_producto || principal.codigo_producto || 'Equipo Desconocido')}).
                    </Alert>
                  ) : (
                    <Grid container spacing={1} sx={{ my: 1 }}>
                      {(opcionalesDisponibles[principal.codigo_producto!] || []).map(opcional => (
                        <Grid item xs={12} key={opcional.codigo_producto}>
                          <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', alignItems: 'center', '&:hover': { borderColor: 'primary.main' } }}>
                            <Checkbox
                              checked={(opcionalesSeleccionados[principal.codigo_producto!] || new Set()).has(opcional.codigo_producto!)}
                              onChange={() => handleToggleOpcional(principal.codigo_producto!, opcional.codigo_producto!)}
                              disabled={!opcional.codigo_producto}
                            />
                            <Box>
                                <Typography variant="body2" component="span" sx={{ fontWeight: 500 }}>
                                { capitalizeSpanish((opcional.nombre_del_producto || opcional.codigo_producto || '').replace(/^:\s*/, '').replace(/^Opcional:\s*/i, '').trim()) }
                                </Typography>
                            </Box>
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  )
                )}
              </Box>
            )}
          </Box>
        ))}

        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
          <Button 
            variant="outlined" 
            startIcon={<ArrowLeft />} 
            onClick={() => navigate('/equipos')}
          >
            Volver a selección de equipos
          </Button>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<ArrowRight />} 
            onClick={handleConfirmarOpcionales}
            disabled={productosPrincipales.length === 0}
          >
            Confirmar y continuar
          </Button>
        </Box>
      </Paper>
    </Container>
  );
} 