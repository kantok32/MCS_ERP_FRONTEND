import React, { useEffect, useState, useMemo } from 'react';
import { 
  Container, Typography, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, CircularProgress, Alert,
  Box, Tooltip, IconButton, TextField, Button,
  TablePagination
} from '@mui/material';
import { Refresh as RefreshIcon, Visibility as VisibilityIcon, Search as SearchIcon } from '@mui/icons-material';
import { getCalculosHistorial, HistorialCalculoItem, HistorialQueryParams, PaginatedHistorialResponse } from '../services/calculoHistorialService';
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
    return firstPrincipal?.caracteristicas?.nombre_del_producto || firstPrincipal?.descripcion || 'Producto sin nombre';
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
        total: response.total,
        page: response.page,
        limit: response.limit,
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

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
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
                    <TableCell sx={{fontWeight: 'bold'}}>Nº Config.</TableCell>
                    <TableCell sx={{fontWeight: 'bold'}}>Fecha Creación</TableCell>
                    <TableCell sx={{fontWeight: 'bold'}}>Referencia</TableCell>
                    <TableCell sx={{fontWeight: 'bold'}}>Cliente</TableCell>
                    <TableCell sx={{fontWeight: 'bold'}}>Producto Principal (1ro)</TableCell>
                    <TableCell sx={{fontWeight: 'bold'}} align="center">Acciones</TableCell>
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
                        <TableCell sx={{textAlign: 'center'}}>{item.numeroConfiguracion || 'N/A'}</TableCell>
                        <TableCell>{formatDate(item.createdAt)}</TableCell>
                        <TableCell>{item.nombreReferencia || 'N/A'}</TableCell>
                        <TableCell>{item.cotizacionDetails?.clienteNombre || 'N/A'}</TableCell>
                        <TableCell>{getMainProductName(item)}</TableCell>
                        <TableCell align="center">
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
      </Paper>
    </Container>
  );
};

export default HistorialPage; 