import React, { useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, Box, Typography, Paper } from '@mui/material';
import { ArrowLeft, Download } from 'lucide-react';

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
    </Box>
  );
} 