import React, { useEffect, useState, useMemo } from 'react';
import { 
  Container, Typography, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, CircularProgress, Alert,
  Box, Tooltip, IconButton, TextField, Button,
  TablePagination
} from '@mui/material';
import { Refresh as RefreshIcon, Visibility as VisibilityIcon, Search as SearchIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { getCalculosHistorial, HistorialCalculoItem, HistorialQueryParams, PaginatedHistorialResponse, deleteCalculoHistorial } from '../services/calculoHistorialService';
import { useNavigate } from 'react-router-dom';

// Helper para formatear fechas (puedes moverlo a un archivo utils)
const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.warn('Error formateando fecha:', dateString, error);
    return dateString; // Devuelve el string original si hay error
  }
};

// Helper para extraer el primer nombre de producto principal
const getMainProductName = (item: HistorialCalculoItem): string => {
  if (item.itemsParaCotizar && item.itemsParaCotizar.length > 0) {
    const firstPrincipal = item.itemsParaCotizar[0].principal;
    // Check nombre_del_producto directly on principal first
    return firstPrincipal?.nombre_del_producto || firstPrincipal?.caracteristicas?.nombre_del_producto || firstPrincipal?.descripcion || 'Producto sin nombre';
  }
  return 'N/A';
};

const HistorialPage: React.FC = () => {
  const [historial, setHistorial] = useState<HistorialCalculoItem[]>([]);
  const [paginationMeta, setPaginationMeta] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortParams, setSortParams] = useState<Pick<HistorialQueryParams, 'sortBy' | 'sortOrder'>>({
      sortBy: 'createdAt',
      sortOrder: 'desc',
  });
  const navigate = useNavigate();

  // State for selected items for bulk delete
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const fetchHistorial = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: HistorialQueryParams = {
        page: paginationMeta.page,
        limit: paginationMeta.limit,
        search: searchTerm.trim() || undefined,
        sortBy: sortParams.sortBy,
        sortOrder: sortParams.sortOrder,
      };

      const response = await getCalculosHistorial(params);
      setHistorial(response.data);
      setPaginationMeta({
        total: Number(response.total) || 0,
        page: response.page,
        limit: [5, 10, 25, 50].includes(response.limit) ? response.limit : 10,
        totalPages: response.totalPages,
      });
    } catch (err: any) {
      console.error('Error al cargar historial paginado:', err);
      setError(err.message || 'Error al cargar el historial paginado.');
      setHistorial([]);
      setPaginationMeta({ total: 0, page: 1, limit: 10, totalPages: 0 });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchHistorial();
  }, [paginationMeta.page, paginationMeta.limit, searchTerm, sortParams]);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPaginationMeta(prev => ({ ...prev, page: newPage + 1 }));
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPaginationMeta(prev => ({
      ...prev,
      limit: parseInt(event.target.value, 10),
      page: 1,
    }));
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleViewDetails = (id: string) => {
    navigate(`/historial/${id}`);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este cálculo del historial?')) {
      setLoading(true);
      setError(null);
      try {
        await deleteCalculoHistorial(id);
        fetchHistorial();
      } catch (err: any) {
        console.error('Error al eliminar cálculo:', err);
        setError(err.message || 'Error al eliminar el cálculo.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSelectItem = (id: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Placeholder handleSelectAll
  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      // Select all items currently displayed
      const allItemIds = new Set(historial.map(item => item._id!).filter(Boolean));
      setSelectedItems(allItemIds);
    } else {
      // Deselect all items
      setSelectedItems(new Set());
    }
  };

  const handleDeleteSelected = async () => {
    if (window.confirm('¿Estás seguro de que quieres eliminar los cálculos seleccionados del historial?')) {
      setLoading(true);
      setError(null);
      try {
        const ids = Array.from(selectedItems);
        await Promise.all(ids.map(id => deleteCalculoHistorial(id)));
        fetchHistorial();
        setSelectedItems(new Set());
      } catch (err: any) {
        console.error('Error al eliminar cálculos:', err);
        setError(err.message || 'Error al eliminar los cálculos.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <Container sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1">
          Historial de Cálculos
        </Typography>
        <Tooltip title="Refrescar lista">
          <span>
            <IconButton onClick={fetchHistorial} disabled={loading} color="primary">
              <RefreshIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {/* Delete Selected Button */}
      {selectedItems.size > 0 && (
        <Box sx={{ mb: 2 }}>
          <Button
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleDeleteSelected}
            disabled={loading} // Disable while any operation is loading
          >
            Eliminar ({selectedItems.size} seleccionados)
          </Button>
        </Box>
      )}

      <Box sx={{ mb: 2, display: 'flex', alignItems: 'flex-end' }}>
        <SearchIcon sx={{ color: 'action.active', mr: 1, my: 0.5 }} />
        <TextField
          fullWidth
          label="Buscar por Referencia, Cliente o Producto Principal"
          variant="standard"
          value={searchTerm}
          onChange={handleSearchChange}
        />
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
          <CircularProgress />
        </Box>
      )}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      {!loading && !error && (
        <>
          <TableContainer component={Paper}>
            <Table stickyHeader aria-label="tabla de historial de cálculos">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <input
                      type="checkbox"
                      checked={selectedItems.size === historial.length && historial.length > 0}
                      onChange={handleSelectAll}
                      disabled={loading || historial.length === 0}
                    />
                  </TableCell>
                  <TableCell sx={{fontWeight: 'bold', width: '80px'}}>Nº Config.</TableCell>
                  <TableCell sx={{fontWeight: 'bold', width: '150px'}}>Fecha Creación</TableCell>
                  <TableCell sx={{fontWeight: 'bold'}}>Referencia</TableCell>
                  <TableCell sx={{fontWeight: 'bold'}}>Cliente</TableCell>
                  <TableCell sx={{fontWeight: 'bold'}}>Perfil</TableCell>
                  <TableCell sx={{fontWeight: 'bold'}}>Producto Principal (1ro)</TableCell>
                  <TableCell sx={{fontWeight: 'bold', width: '120px'}} align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {historial.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      {searchTerm ? 'No se encontraron cálculos que coincidan con su búsqueda.' : 'No hay cálculos guardados en el historial.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  historial.map((item) => (
                    <TableRow hover key={item._id}>
                      <TableCell padding="checkbox">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(item._id!)}
                          onChange={() => handleSelectItem(item._id!)}
                          disabled={!item._id}
                        />
                      </TableCell>
                      <TableCell sx={{textAlign: 'center'}}>{item.numeroConfiguracion || 'N/A'}</TableCell>
                      <TableCell>{formatDate(item.createdAt)}</TableCell>
                      <TableCell>{item.nombreReferencia || 'N/A'}</TableCell>
                      <TableCell>{item.cotizacionDetails?.clienteNombre || 'N/A'}</TableCell>
                      <TableCell>{item.nombrePerfil || 'N/A'}</TableCell>
                      <TableCell>{getMainProductName(item)}</TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                          <Tooltip title="Ver Detalles">
                            <Button
                              variant="contained"
                              color="primary"
                              size="small"
                              onClick={() => navigate(`/historial/${item._id}`)}
                            >
                              Ver Detalles
                            </Button>
                          </Tooltip>
                          <Tooltip title="Eliminar Cálculo">
                            <IconButton
                              color="error"
                              size="small"
                              onClick={() => handleDelete(item._id!)}
                              disabled={loading}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={paginationMeta.total}
            rowsPerPage={paginationMeta.limit}
            page={paginationMeta.page - 1}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            labelRowsPerPage="Filas por página:"
            labelDisplayedRows={({ from, to, count }) =>
              `${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`
            }
          />
        </>
      )}
    </Container>
  );
};

export default HistorialPage; 