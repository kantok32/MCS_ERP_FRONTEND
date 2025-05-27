import React, { useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, Box, Paper } from '@mui/material';

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

  return (
    <Box sx={{ minHeight: '100vh', background: '#f3f4f6', py: 4 }}>
      <Paper sx={{ maxWidth: 1200, mx: 'auto', p: 2, mb: 2, boxShadow: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Button variant="outlined" onClick={() => navigate(-1)}>
            Volver
          </Button>
          {html && (
            <Button variant="contained" color="primary" onClick={handleExportPDF}>
              Exportar a PDF
            </Button>
          )}
        </Box>
        {html ? (
          <div ref={printRef} style={{ background: 'white', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: 24, minHeight: 600 }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <div style={{ color: 'red', textAlign: 'center', padding: 40 }}>
            No se encontró ningún documento HTML para mostrar.
          </div>
        )}
      </Paper>
    </Box>
  );
} 