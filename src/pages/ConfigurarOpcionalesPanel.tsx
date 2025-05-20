import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, Typography, Checkbox, CircularProgress, Paper, Box, Grid, IconButton, Alert, Container, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField, Autocomplete } from '@mui/material';
import { ArrowLeft, ArrowRight, RefreshCw, ChevronDown, ChevronUp, Info, AlertTriangle, Search } from 'lucide-react';
import { fetchProductByCode, fetchFilteredProducts, searchProducts } from '../services/productService';

// --- Interfaces (muchas de estas podrían venir de un archivo de tipos global) ---
interface Producto {
  _id?: string;
  id?: string;
  codigo_producto?: string;
  nombre_del_producto?: string;
  descripcion?: string;
  Modelo?: string;
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
  [key: string]: any;
}

interface OpcionalesResponse {
  total: number;
  products: Producto[]; // Lista de productos opcionales
  success: boolean;
  data?: { // Estructura anidada observada en handleOpcionales
    products: Producto[];
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

  // New state from HistorialDetallePage
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

  // New state for product search
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Producto[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [selectedProductForAddition, setSelectedProductForAddition] = useState<Producto | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const fetchOpcionalesParaPrincipal = useCallback(async (principal: Producto) => {
    if (!principal.codigo_producto || !principal.Modelo) {
      setErrorOpcionales(prev => ({ ...prev, [principal.codigo_producto!]: 'Datos del producto principal incompletos para buscar opcionales.' }));
      return;
    }
    setLoadingOpcionales(prev => ({ ...prev, [principal.codigo_producto!]: true }));
    setErrorOpcionales(prev => ({ ...prev, [principal.codigo_producto!]: null }));

    try {
      console.log('[ConfigurarOpcionalesPanel] Buscando opcionales para producto:', {
        codigo: principal.codigo_producto,
        modelo: principal.Modelo,
        nombre: principal.nombre_del_producto
      });

      // Primero verificamos que el producto principal exista
      const API_BASE_URL = 'https://mcs-erp-backend-807184488368.southamerica-west1.run.app/api';
      const verifyResponse = await fetch(`${API_BASE_URL}/products/${principal.codigo_producto}`);
      
      if (!verifyResponse.ok) {
        throw new Error(`Producto principal con código ${principal.codigo_producto} no encontrado.`);
      }

      // Construimos los parámetros para la búsqueda de opcionales
      const params = new URLSearchParams();
      params.append('codigo', principal.codigo_producto);
      // Extraemos solo la primera parte del modelo (letras y números antes del primer espacio o carácter especial)
      const modeloLimpio = principal.Modelo.match(/^[A-Za-z0-9]+/)?.[0] || principal.Modelo;
      params.append('modelo', modeloLimpio);

      console.log('[ConfigurarOpcionalesPanel] Enviando parámetros para opcionales:', {
        codigo: principal.codigo_producto,
        modelo: modeloLimpio
      });

      // Llamamos al endpoint de opcionales
      const response = await fetch(`${API_BASE_URL}/products/opcionales?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Error desconocido' }));
        console.error('[ConfigurarOpcionalesPanel] Error en respuesta de opcionales:', {
          status: response.status,
          statusText: response.statusText,
          errorData,
          url: `${API_BASE_URL}/products/opcionales?${params.toString()}`
        });
        
        if (response.status === 404) {
          throw new Error(`No se encontraron opcionales para el producto ${principal.codigo_producto}`);
        }
        
        throw new Error(errorData.message || `Error del servidor: ${response.status}`);
      }

      const data: OpcionalesResponse = await response.json();
      console.log('[ConfigurarOpcionalesPanel] Respuesta de opcionales:', data);
      
      if (!data.success) {
        throw new Error(data.message || 'Error al obtener opcionales');
      }
      
      // Procesamos los opcionales
      const opcionales = data.data?.products || data.products || [];
      
      // Filtramos los opcionales para asegurarnos de que solo sean opcionales válidos
      const opcionalesFiltrados = opcionales.filter(opcional => 
        opcional.codigo_producto && 
        opcional.nombre_del_producto && 
        opcional.es_opcional === true
      );

      console.log('[ConfigurarOpcionalesPanel] Opcionales encontrados:', opcionalesFiltrados);
      
      if (opcionalesFiltrados.length === 0) {
        setErrorOpcionales(prev => ({ 
          ...prev, 
          [principal.codigo_producto!]: 'No se encontraron opcionales para este producto.' 
        }));
      }
      
      setOpcionalesDisponibles(prev => ({ ...prev, [principal.codigo_producto!]: opcionalesFiltrados }));

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
          // Asignamos la categoría 'principal' al producto cargado desde el historial
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
        // Asignamos la categoría 'principal' a todos los productos cargados desde el estado
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
            initialExpanded[p.codigo_producto] = true; // Expandir por defecto cuando viene de EquiposPanel
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
        // No hay estado inicial para cargar un producto, el usuario debe buscar y agregar
        console.log('[ConfigurarOpcionalesPanel] No hay estado específico para carga inicial. Estableciendo productosPrincipales como array vacío.');
        setProductosPrincipales([]); 
      }
    };

    // Solo ejecutar carga inicial si no está ya poblado por una carga manual de producto
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

      // Filtramos para mostrar solo productos principales
      const productosPrincipales = results.filter(producto => 
        producto.codigo_producto && 
        producto.nombre_del_producto && 
        !producto.es_opcional
      );

      if (productosPrincipales.length === 0) {
        setSearchError('No se encontraron productos principales con ese término de búsqueda.');
        return;
      }

      setSearchResults(productosPrincipales);
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
      
      // Verificamos que el producto tenga los datos necesarios
      if (!selectedProductForAddition.codigo_producto || !selectedProductForAddition.Modelo) {
        throw new Error('El producto seleccionado no tiene todos los datos necesarios.');
      }

      // Verificamos si el producto ya está en la lista
      const productoExistente = productosPrincipales.find(
        p => p.codigo_producto === selectedProductForAddition.codigo_producto
      );

      if (productoExistente) {
        setSearchError('Este producto ya está en la lista.');
        return;
      }

      // Agregamos el producto a la lista
      const nuevoProducto = {
        ...selectedProductForAddition,
        categoria: 'principal'
      };

      setProductosPrincipales(prev => [...prev, nuevoProducto]);
      
      // Expandimos el nuevo producto
      setExpandedPrincipales(prev => ({
        ...prev,
        [nuevoProducto.codigo_producto!]: true
      }));

      // Inicializamos el conjunto de opcionales seleccionados para este producto
      setOpcionalesSeleccionados(prev => ({
        ...prev,
        [nuevoProducto.codigo_producto!]: new Set<string>()
      }));

      // Cargamos los opcionales para el nuevo producto
      await fetchOpcionalesParaPrincipal(nuevoProducto);

      // Limpiamos la búsqueda
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
    
    // Navegar al siguiente paso (Resumen y Configuración de Carga o Resultados)
    navigate('/resumen-carga', {
      state: {
        itemsParaCotizar: itemsParaProcesar,
      }
    });
  };

  const handleCloseDiscontinuedWarning = () => {
    setShowDiscontinuedWarning(false);
  };

  // Mostrar indicador de carga si los productos se están cargando desde el estado inicialmente
  // y no se ha cargado ningún producto nuevo mediante búsqueda aún.
  if (productosPrincipales.length === 0 && ( (state?.fromHistory && state.mainProductCodigo) || (state?.productosPrincipales && state.productosPrincipales.length > 0 ) ) ) {
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
            <Typography sx={{ mt: 2 }}>Cargando configuración de opcionales...</Typography>
          </Box>
        );
    }
  }

  console.log('[ConfigurarOpcionalesPanel] Renderizando. productosPrincipales:', productosPrincipales);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Sección de Búsqueda y Carga de Nuevo Producto Principal */}
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Cargar Nuevo Producto Principal para Configurar
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={8} md={9}>
            <Autocomplete
              fullWidth
              options={searchResults}
              getOptionLabel={(option) => `${option.nombre_del_producto || 'Nombre no disponible'} (${option.codigo_producto || 'Código no disponible'})`}
              inputValue={searchTerm}
              onInputChange={handleSearch}
              onChange={handleSelectProductForAddition}
              loading={loadingSearch}
              loadingText="Buscando..."
              noOptionsText={searchTerm.length <= 2 ? "Escriba al menos 3 caracteres para buscar" : "No se encontraron productos"}
              renderInput={(params) => (
                <TextField 
                  {...params} 
                  label="Buscar producto por código o nombre" 
                  variant="outlined"
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <Search style={{ marginRight: '8px', color: 'action.active' }} />
                    ),
                    endAdornment: (
                      <>
                        {loadingSearch ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              isOptionEqualToValue={(option, value) => option.codigo_producto === value.codigo_producto}
              renderOption={(props, option) => (
                <Box component="li" {...props} key={option.codigo_producto || option._id || Math.random()}>
                  <Typography variant="body2">
                    <strong>{option.nombre_del_producto || 'N/A'}</strong> ({option.codigo_producto || 'N/A'})
                    {option.descontinuado && <Typography component="span" variant="caption" color="error" sx={{ ml: 1 }}>(Descontinuado)</Typography>}
                  </Typography>
                </Box>
              )}
            />
          </Grid>
          <Grid item xs={12} sm={4} md={3}>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              onClick={handleLoadProduct}
              disabled={!selectedProductForAddition || loadingSearch}
              startIcon={<RefreshCw size={18} />}
            >
              Cargar Producto
            </Button>
          </Grid>
        </Grid>
        {searchError && <Alert severity="error" sx={{ mt: 2 }}>{searchError}</Alert>}
      </Paper>

      {/* Modal de Advertencia para Descontinuados */}
      <Dialog
        open={showDiscontinuedWarning}
        onClose={handleCloseDiscontinuedWarning}
        aria-labelledby="discontinued-warning-title"
        aria-describedby="discontinued-warning-description"
      >
        <DialogTitle id="discontinued-warning-title" sx={{ display: 'flex', alignItems: 'center' }}>
          <AlertTriangle color="orange" style={{ marginRight: '8px' }} />
          Advertencia
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="discontinued-warning-description">
            El equipo "{discontinuedProductName}" (o alguno de los seleccionados) está descontinuado. Los valores y disponibilidad de opcionales pueden variar.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDiscontinuedWarning} color="primary" autoFocus>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      {productosPrincipales.length === 0 && !((state?.fromHistory && state.mainProductCodigo) || (state?.productosPrincipales && state.productosPrincipales.length > 0)) && (
         <Alert severity="info" sx={{mb: 2}}>
            Por favor, busque y cargue un producto principal para comenzar la configuración de sus opcionales.
        </Alert>
      )}

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
              <Typography variant="h6">{principal.nombre_del_producto || principal.codigo_producto}</Typography>
              <IconButton size="small">
                {expandedPrincipales[principal.codigo_producto!] ? <ChevronUp /> : <ChevronDown />}
              </IconButton>
            </Box>

            {expandedPrincipales[principal.codigo_producto!] && (
              <Box sx={{ p: 2 }}>
                {loadingOpcionales[principal.codigo_producto!] && <CircularProgress size={24} sx={{my: 2}}/>}
                {errorOpcionales[principal.codigo_producto!] && (
                  <Alert severity="error" sx={{my: 2}}>
                    Error al cargar opcionales para {principal.nombre_del_producto}: {errorOpcionales[principal.codigo_producto!]}
                    <Button onClick={() => fetchOpcionalesParaPrincipal(principal)} size="small" startIcon={<RefreshCw size={14}/>} sx={{ml:1}}>Reintentar</Button>
                  </Alert>
                )}
                
                {!loadingOpcionales[principal.codigo_producto!] && !errorOpcionales[principal.codigo_producto!] && (
                  (opcionalesDisponibles[principal.codigo_producto!]?.length || 0) === 0 ? (
                    <Typography sx={{my: 2, fontStyle: 'italic'}}>No hay opcionales disponibles para este equipo.</Typography>
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
                                { (opcional.nombre_del_producto || opcional.codigo_producto || '').replace(/^:\s*/, '').replace(/^Opcional:\s*/i, '').trim() }
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
            Volver a Selección de Equipos
          </Button>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<ArrowRight />} 
            onClick={handleConfirmarOpcionales}
            disabled={productosPrincipales.length === 0}
          >
            Confirmar y Continuar
          </Button>
        </Box>
      </Paper>
    </Container>
  );
} 