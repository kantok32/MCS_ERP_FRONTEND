import React, { useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, Box, Typography, Paper, Modal, IconButton, Divider, Alert } from '@mui/material';
import { ArrowLeft, Download, XCircle } from 'lucide-react';
import PerfilEditForm from '../components/PerfilEditForm';

export default function DocumentoHtmlPage() {
  const location = useLocation();
  const navigate = useNavigate();
  // El HTML se pasa por el estado de navegación
  const html = location.state?.html;
  const pdfFileName = location.state?.pdfFileName || 'informe_configuracion.pdf';
  const printRef = useRef<HTMLDivElement>(null);

  const handleExportPDF = async () => {
    if (!printRef.current) return;
    // Cargar html2pdf.js desde CDN si no está presente
    if (!(window as any).html2pdf) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = () => exportPDF();
      document.body.appendChild(script);
    } else {
      exportPDF();
    }
    function exportPDF() {
      (window as any).html2pdf(printRef.current, {
        margin: 0.5,
        filename: pdfFileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
      });
    }
  };

  const handleGoBack = () => {
    navigate('/equipos');
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, fontFamily: 'Arial, sans-serif' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Button 
          variant="outlined" 
          startIcon={<Download size={18} />} 
          onClick={handleExportPDF}
        >
          Exportar
        </Button>
        <Button 
          variant="outlined" 
          startIcon={<ArrowLeft size={18} />} 
          onClick={handleGoBack}
        >
          Volver a Equipos
        </Button>
      </Box>

      <Paper elevation={2} sx={{p:3}}>
        <Typography variant="h4" component="h1" sx={{ borderBottom: '2px solid #eee', pb: 1, mb: 2 }}>
          Informe: {location.state?.productName || 'Documento'}
        </Typography>
        <Box 
          ref={printRef} 
          style={{ background: 'white', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: 24, minHeight: 600 }}
          dangerouslySetInnerHTML={{ __html: html }}
          sx={{
            border: '1px solid #ddd',
            '& table': {
              width: '100%',
              borderCollapse: 'collapse',
              mb: 2,
            },
            '& th, & td': {
              border: '1px solid #ccc',
              p: 1,
              textAlign: 'left',
            },
            '& th': {
              backgroundColor: '#f8f8f8',
            }
          }}
        />
      </Paper>

      {/* Modal para Editar Perfil */}
      <Modal
        open={isEditModalOpen}
        onClose={handleCloseEditModal} // Usa el handler para cerrar y resetear ID
        aria-labelledby="edit-profile-modal-title"
        aria-describedby="edit-profile-modal-description"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Paper 
          sx={{ 
            p: { xs: 2, sm: 3, md: 4 }, // Padding existente
            width: { xs: '95%', sm: '85%', md: '700px' }, // Ancho existente
            maxWidth: '90vw', // Asegura que no exceda el viewport
            maxHeight: '90vh', // Altura máxima
            overflowY: 'auto', // Scroll si el contenido excede
            borderRadius: '12px', // Bordes redondeados
            boxShadow: 24, // Sombra estándar de MUI para modales
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography id="edit-profile-modal-title" variant="h6" component="h2" sx={{ fontWeight: 'bold' }}>
              Editar Perfil
            </Typography>
            <IconButton onClick={handleCloseEditModal} aria-label="Cerrar modal">
              <XCircle />
            </IconButton>
          </Box>
          <Divider sx={{ mb: 2 }} />
          {editingProfileId ? (
            <PerfilEditForm 
              profileId={editingProfileId} 
              onSaveSuccess={handleCloseEditModal} // Esto también cierra el modal y refresca
              onCancel={handleCloseEditModal} 
            />
          ) : (
            <Alert severity="info">Cargando datos del perfil o no se ha seleccionado un perfil...</Alert>
          )}
        </Paper>
      </Modal>
    </Box>
  );
} 