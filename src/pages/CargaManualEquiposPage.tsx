import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const columnasFijas = [
  'codigo_producto',
  'nombre_producto',
  'descripcion',
  'Modelo',
  'equipo u opcional',
  'producto',
  'fecha_cotizacion',
  'costo fabrica',
  'largo_mm',
  'ancho_mm',
  'alto_mm',
  'peso_kg',
];

const BACKEND_URL = 'https://mcs-erp-backend-807184488368.southamerica-west1.run.app';

const buttonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '10px 20px',
  backgroundColor: '#0ea5e9',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: 500,
  gap: '8px',
};

const uploadZoneStyle: React.CSSProperties = {
  border: '2px dashed #cbd5e1',
  borderRadius: '8px',
  padding: '40px',
  textAlign: 'center',
  backgroundColor: '#f8fafc',
  color: '#64748b',
  marginBottom: '24px',
};

export default function CargaManualEquiposPage() {
  const navigate = useNavigate();
  const [tablaManual, setTablaManual] = useState<any[]>([
    Object.fromEntries(columnasFijas.map(col => [col, '']))
  ]);
  const [filasSeleccionadas, setFilasSeleccionadas] = useState<number[]>([]);
  const [tablaManualStatus, setTablaManualStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [tablaManualError, setTablaManualError] = useState<string | null>(null);

  const agregarFilaManual = () => {
    setTablaManual(prev => [
      ...prev,
      Object.fromEntries(columnasFijas.map(col => [col, '']))
    ]);
  };
  const eliminarFilasSeleccionadas = () => {
    setTablaManual(prev => prev.filter((_, i) => !filasSeleccionadas.includes(i)));
    setFilasSeleccionadas([]);
  };
  const actualizarCeldaManual = (rowIdx: number, col: string, value: string) => {
    // Soporte para pegado múltiple en codigo_producto
    if (col === 'codigo_producto' && /[\s,\n]+/.test(value.trim())) {
      const valores = value.split(/[\s,\n]+/).filter(v => v.trim() !== '');
      if (valores.length > 1) {
        setTablaManual(prev => {
          const nuevasFilas = valores.map(val => ({
            ...Object.fromEntries(columnasFijas.map(c => [c, ''])),
            codigo_producto: val
          }));
          return [
            ...prev.slice(0, rowIdx),
            ...nuevasFilas,
            ...prev.slice(rowIdx + 1)
          ];
        });
        return;
      }
    }
    setTablaManual(prev => prev.map((row, i) => i === rowIdx ? { ...row, [col]: value } : row));
  };
  const toggleSeleccionFila = (idx: number) => {
    setFilasSeleccionadas(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
  };
  const toggleSeleccionTodas = () => {
    setFilasSeleccionadas(filasSeleccionadas.length === tablaManual.length ? [] : tablaManual.map((_, i) => i));
  };
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Backspace' || e.key === 'Delete') && filasSeleccionadas.length > 0) {
        eliminarFilasSeleccionadas();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filasSeleccionadas]);
  const handlePasteEnCeldaManual = (rowIdx: number, colIdx: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    const texto = e.clipboardData.getData('text');
    if (!texto) return;
    const filasPegadas = texto.split(/\r?\n/).filter(f => f.trim() !== '');
    const datosPegados = filasPegadas.map(fila => fila.split(/\t/));
    const numFilas = datosPegados.length;
    const numColumnas = Math.max(...datosPegados.map(f => f.length));
    setTablaManual(prev => {
      let nuevaTabla = [...prev];
      while (nuevaTabla.length < rowIdx + numFilas) {
        nuevaTabla.push(Object.fromEntries(columnasFijas.map(c => [c, ''])));
      }
      for (let i = 0; i < numFilas; i++) {
        for (let j = 0; j < numColumnas; j++) {
          const colTargetIdx = colIdx + j;
          if (colTargetIdx < columnasFijas.length) {
            const colName = columnasFijas[colTargetIdx];
            nuevaTabla[rowIdx + i][colName] = datosPegados[i][j] ?? '';
          }
        }
      }
      return nuevaTabla;
    });
    e.preventDefault();
  };
  const handleEnviarTablaManual = async () => {
    setTablaManualStatus('sending');
    setTablaManualError(null);
    try {
      const response = await fetch(`${BACKEND_URL}/api/products/upload-plain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: tablaManual }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Error al enviar los datos');
      setTablaManualStatus('success');
      setTablaManual([Object.fromEntries(columnasFijas.map(col => [col, '']))]);
    } catch (err: any) {
      setTablaManualStatus('error');
      setTablaManualError(err.message || 'Error desconocido al enviar los datos');
    }
  };
  return (
    <div style={{ margin: '32px auto', maxWidth: '98vw' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#334155', marginBottom: '18px' }}>Carga manual de productos en tabla</h2>
      <button style={{ marginBottom: '18px', ...buttonStyle }} onClick={() => navigate('/admin/carga-equipos')}>Volver</button>
      <div style={{ ...uploadZoneStyle, marginBottom: '32px' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #cbd5e1', background: '#e0e7ef', padding: '4px 8px', width: '32px' }}>
                  <input type="checkbox" checked={filasSeleccionadas.length === tablaManual.length && tablaManual.length > 0} onChange={toggleSeleccionTodas} />
                </th>
                {columnasFijas.map((col) => (
                  <th key={col} style={{ border: '1px solid #cbd5e1', background: '#e0e7ef', padding: '4px 8px', fontWeight: 600 }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tablaManual.map((row, rowIdx) => (
                <tr key={rowIdx} style={filasSeleccionadas.includes(rowIdx) ? { background: '#dbeafe' } : {}}>
                  <td style={{ border: '1px solid #cbd5e1', padding: '4px 8px', textAlign: 'center' }}>
                    <input type="checkbox" checked={filasSeleccionadas.includes(rowIdx)} onChange={() => toggleSeleccionFila(rowIdx)} />
                  </td>
                  {columnasFijas.map((col, colIdx) => (
                    <td key={colIdx} style={{ border: '1px solid #cbd5e1', padding: '4px 8px' }}>
                      <input
                        type="text"
                        value={row[col]}
                        style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', fontSize: '13px' }}
                        onChange={e => actualizarCeldaManual(rowIdx, col, e.target.value)}
                        onPaste={e => handlePasteEnCeldaManual(rowIdx, colIdx, e)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button style={{ ...buttonStyle, marginTop: '10px' }} onClick={agregarFilaManual}>Agregar fila</button>
        <button
          style={{ ...buttonStyle, marginTop: '10px', marginLeft: '10px', background: filasSeleccionadas.length > 0 ? '#ef4444' : '#e2e8f0', color: filasSeleccionadas.length > 0 ? 'white' : '#94a3b8', cursor: filasSeleccionadas.length > 0 ? 'pointer' : 'not-allowed' }}
          onClick={eliminarFilasSeleccionadas}
          disabled={filasSeleccionadas.length === 0}
        >
          Eliminar seleccionados
        </button>
        <button
          style={{ ...buttonStyle, marginTop: '10px', marginLeft: '10px' }}
          onClick={handleEnviarTablaManual}
          disabled={tablaManualStatus === 'sending'}
        >
          {tablaManualStatus === 'sending' ? 'Enviando...' : 'Enviar'}
        </button>
        {tablaManualStatus === 'success' && <div style={{ marginTop: '10px', color: '#166534', background: '#dcfce7', padding: '8px', borderRadius: '6px' }}>¡Datos enviados correctamente!</div>}
        {tablaManualStatus === 'error' && tablaManualError && <div style={{ marginTop: '10px', color: '#991b1b', background: '#fee2e2', padding: '8px', borderRadius: '6px' }}>{tablaManualError}</div>}
      </div>
    </div>
  );
}

// Puedes reutilizar buttonStyle y uploadZoneStyle importándolos o definiéndolos aquí si es necesario. 