import React, { useState, useEffect } from 'react';
import { Trash2, ChevronDown, ChevronRight, Save, X, FileText } from 'lucide-react';

// Asume que tienes tipos definidos para Producto, si no, créalos o ajústalos.
// import { Producto } from '../types/Producto'; 

// Props del componente Modal
interface EquipoEditModalProps {
  open: boolean;
  onClose: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  producto: any | null; // Debería ser 'Producto | null' con tipos definidos
  onSaveSuccess: () => void;
  backendUrl: string; // <-- Agregar la URL del backend
}

// Estilos base reutilizables
const inputBaseStyle: React.CSSProperties = {
  padding: '8px 10px',
  border: '1px solid #ccc',
  borderRadius: '4px',
  fontSize: '14px',
  width: '100%', 
  boxSizing: 'border-box',
  // marginTop: '4px', // Eliminado: el labelStyle.marginBottom se encarga de esto
};

const fieldContainerStyle: React.CSSProperties = {
  marginBottom: '16px', 
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: 600,
  color: '#333',
  marginTop: '24px',
  marginBottom: '16px',
  borderBottom: '1px solid #eee',
  paddingBottom: '8px',
};

const modalTitleStyle: React.CSSProperties = {
  fontSize: '22px',
  fontWeight: 'bold',
  color: '#2c3e50',
  marginBottom: '24px',
  textAlign: 'center',
};

// NUEVO: Estilo para el contenedor de sección en rejilla
const gridSectionContainerStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '16px ' + '20px', // gap: row-gap column-gap (ej: 16px vertical, 20px horizontal)
  alignItems: 'start',
};

// Estilo para labels encima del input
const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '6px',
  fontSize: '14px',
  fontWeight: 500,
  color: '#333',
};

// NUEVOS ESTILOS PARA ESPECIFICACIONES TÉCNICAS
const specSectionStyle: React.CSSProperties = {
  marginBottom: '20px',
  padding: '15px',
  border: '1px solid #e0e0e0',
  borderRadius: '6px',
  backgroundColor: '#f9f9f9' 
};

const specSectionTitleStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 600,
  color: '#333',
  marginBottom: '15px',
  paddingBottom: '8px',
  borderBottom: '1px solid #ddd',
  textTransform: 'uppercase',
};

const specRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  marginBottom: '10px',
  gap: '10px',
};

const specKeyStyle: React.CSSProperties = {
  width: '350px',
  marginRight: '10px',
  fontSize: '14px',
  color: '#555',
  textAlign: 'left', // Ajustado a la izquierda para nombres de specs largos
  flexShrink: 0,
  wordBreak: 'break-word', // Para nombres largos
};

const specValueInputStyle: React.CSSProperties = {
  ...inputBaseStyle,
  flexGrow: 1,
};

const specDeleteButtonStyle: React.CSSProperties = {
  background:'none',
  border:'none',
  cursor:'pointer',
  color: '#EF4444',
  padding: '4px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};
// FIN DE NUEVOS ESTILOS

// NUEVOS ESTILOS MEJORADOS
const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(30, 41, 59, 0.25)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000
};

const modalContentStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ef 100%)',
  borderRadius: '16px',
  boxShadow: '0 8px 32px rgba(30,41,59,0.18)',
  width: '95%',
  maxWidth: '900px',
  maxHeight: '90vh',
  overflow: 'hidden',
  display: 'flex', flexDirection: 'column',
};

const modalHeaderStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg, #2563eb 0%, #38bdf8 100%)',
  color: 'white',
  padding: '24px 32px 16px 32px',
  borderTopLeftRadius: '16px',
  borderTopRightRadius: '16px',
  fontSize: '1.7rem',
  fontWeight: 700,
  letterSpacing: '0.5px',
  boxShadow: '0 2px 8px rgba(30,41,59,0.06)',
  textAlign: 'center',
};

const modalBodyStyle: React.CSSProperties = {
  padding: '24px 32px',
  overflowY: 'auto',
  flex: 1,
};

const improvedSectionTitleStyle: React.CSSProperties = {
  fontSize: '1.15rem',
  fontWeight: 600,
  color: '#2563eb',
  margin: '24px 0 12px 0',
  borderBottom: '1.5px solid #e0e7ef',
  paddingBottom: '6px',
  letterSpacing: '0.2px',
};

const improvedInputStyle: React.CSSProperties = {
  ...inputBaseStyle,
  border: '1.5px solid #cbd5e1',
  borderRadius: '7px',
  background: '#f1f5f9',
  transition: 'border 0.2s',
  marginBottom: '2px',
};

const improvedInputFocusStyle: React.CSSProperties = {
  border: '1.5px solid #2563eb',
  outline: 'none',
  background: '#fff',
};

const improvedButtonStyle: React.CSSProperties = {
  padding: '10px 24px',
  borderRadius: '7px',
  border: 'none',
  fontWeight: 600,
  fontSize: '1rem',
  cursor: 'pointer',
  transition: 'background 0.2s',
};

const cancelButtonStyle: React.CSSProperties = {
  ...improvedButtonStyle,
  background: '#e0e7ef',
  color: '#334155',
  marginRight: '8px',
};

const saveButtonStyle: React.CSSProperties = {
  ...improvedButtonStyle,
  background: 'linear-gradient(90deg, #2563eb 0%, #38bdf8 100%)',
  color: 'white',
  boxShadow: '0 2px 8px rgba(30,41,59,0.08)',
};

const improvedCheckboxStyle: React.CSSProperties = {
  accentColor: '#2563eb',
  width: '18px',
  height: '18px',
  marginRight: '8px',
};

// --- ESTILOS UNIFICADOS CON VER DETALLE ---
const unifiedModalOverlayStyle: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1040
};
const unifiedModalContentStyle: React.CSSProperties = {
  backgroundColor: 'white', borderRadius: '8px', width: '95%', maxWidth: '900px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
};
const unifiedHeaderStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #e5e7eb', background: 'linear-gradient(90deg, #2563eb 0%, #38bdf8 100%)', color: 'white' };
const unifiedTitleStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '18px', fontWeight: 600, color: 'white' };
const unifiedBodyStyle: React.CSSProperties = { flexGrow: 1, overflowY: 'auto', padding: '24px', backgroundColor: '#F9FAFB' };
const unifiedFooterStyle: React.CSSProperties = { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', padding: '16px 24px', borderTop: '1px solid #e5e7eb', backgroundColor: '#f8f9fa' };
const unifiedSecondaryButtonStyle: React.CSSProperties = { padding: '8px 16px', borderRadius: '6px', border: '1px solid #D1D5DB', backgroundColor: 'white', color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 500 };
const unifiedPrimaryButtonStyle: React.CSSProperties = { ...unifiedSecondaryButtonStyle, backgroundColor: '#1e88e5', color: 'white', borderColor: '#1e88e5' };

// Modified to allow editing of values
const renderEditableSpecificationsDisplay = (specs: any, onValueChange: Function, baseInputStyle: React.CSSProperties) => {
  const editableSpecInputStyle: React.CSSProperties = {
    ...baseInputStyle,
    width: '100%',
    boxSizing: 'border-box',
  };

  if (!specs || (typeof specs !== 'object' && !Array.isArray(specs)) || Object.keys(specs).length === 0) {
    return <p style={{ fontSize: '13px', color: '#6B7280' }}>No hay especificaciones técnicas detalladas disponibles.</p>;
  }

  // Case 1: specs is an array of { nombre, valor } objects
  if (Array.isArray(specs) && specs.every(item => typeof item === 'object' && item !== null && 'nombre' in item)) {
    if (specs.length === 0) return <p style={{ fontSize: '13px', color: '#6B7280' }}>No hay especificaciones disponibles.</p>;
    return (
      <div style={{ marginBottom: '20px' }}>
        {/* Removed h4 title from here, will be part of the collapsible section title */}
        <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 16px', alignItems: 'center' }}>
          {specs.map((item: { nombre: any; valor: any }, index: number) => (
            <React.Fragment key={`${item.nombre}-${index}`}>
              <dt style={{ fontSize: '13px', fontWeight: 500, color: '#4B5563' }}>{String(item.nombre)}:</dt>
              <dd style={{ fontSize: '13px', color: '#1F2937', margin: 0, wordBreak: 'break-word' }}>
                <input 
                  type="text"
                  value={item.valor === null || item.valor === undefined ? '' : String(item.valor)}
                  onChange={(e) => onValueChange([index, 'valor'], e.target.value)}
                  style={editableSpecInputStyle}
                />
              </dd>
            </React.Fragment>
          ))}
        </dl>
      </div>
    );
  }

  const isFlatObject = Object.values(specs).every(
    v => typeof v !== 'object' || v === null || Array.isArray(v) // Adjusted to also consider arrays as non-flat for this check
  );
  if (isFlatObject && !Array.isArray(specs)) { // Ensure it's not an array handled by Case 1
    return (
      <div style={{ marginBottom: '20px' }}>
        <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 16px', alignItems: 'center' }}>
          {Object.entries(specs).map(([key, value]) => (
            <React.Fragment key={key}>
              <dt style={{ fontSize: '13px', fontWeight: 500, color: '#4B5563' }}>{key.replace(/_/g, ' ')}:</dt>
              <dd style={{ fontSize: '13px', color: '#1F2937', margin: 0, wordBreak: 'break-word' }}>
                <input 
                  type="text"
                  value={value === null || value === undefined ? '' : String(value)}
                  onChange={(e) => onValueChange([key], e.target.value)}
                  style={editableSpecInputStyle}
                />
              </dd>
            </React.Fragment>
          ))}
        </dl>
      </div>
    );
  }
  // Case 3: Categorized object
  const categoryOrder = ['DIMENSIONES', 'SISTEMA DE POTENCIA', /* ... other categories ... */ 'GRUA' ];
  const sortedCategories = Object.keys(specs).sort((a, b) => { /* ... sorting logic ... */ return a.localeCompare(b);});

  const renderedCategories = sortedCategories.map((categoryKey) => {
    const details = specs[categoryKey];
    if (!details) return null;

    let categoryContent = null;
    if (Array.isArray(details) && details.every(item => typeof item === 'object' && item !== null && 'nombre' in item)) {
      if (details.length === 0) return null;
      categoryContent = (
        <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 16px', alignItems: 'center' }}>
          {details.map((item: { nombre: any; valor: any }, index: number) => (
            <React.Fragment key={`${item.nombre}-${index}-cat`}>
              <dt style={{ fontSize: '13px', fontWeight: 500, color: '#4B5563' }}>{String(item.nombre)}:</dt>
              <dd style={{ fontSize: '13px', color: '#1F2937', margin: 0, wordBreak: 'break-word' }}>
                <input 
                  type="text"
                  value={item.valor === null || item.valor === undefined ? '' : String(item.valor)}
                  onChange={(e) => onValueChange([categoryKey, index, 'valor'], e.target.value)}
                  style={editableSpecInputStyle}
                />
              </dd>
            </React.Fragment>
          ))}
        </dl>
      );
    } else if (typeof details === 'object' && !Array.isArray(details) && Object.keys(details).length > 0) {
      categoryContent = (
        <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 16px', alignItems: 'center' }}>
          {Object.entries(details).map(([entryKey, value]) => (
            <React.Fragment key={`${categoryKey}-${entryKey}`}>
              <dt style={{ fontSize: '13px', fontWeight: 500, color: '#4B5563' }}>{entryKey.replace(/_/g, ' ')}:</dt>
              <dd style={{ fontSize: '13px', color: '#1F2937', margin: 0, wordBreak: 'break-word' }}>
                <input 
                  type="text"
                  value={value === null || value === undefined ? '' : String(value)}
                  onChange={(e) => onValueChange([categoryKey, entryKey], e.target.value)}
                  style={editableSpecInputStyle}
                />
              </dd>
            </React.Fragment>
          ))}
        </dl>
      );
    }

    if (!categoryContent) return null;

    return (
      <div key={categoryKey} style={{ marginBottom: '20px' }}>
        <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#1e88e5', borderBottom: '1px solid #e0e0e0', paddingBottom: '8px', marginBottom: '12px' }}>
          {categoryKey.replace(/_/g, ' ')}
        </h4>
        {categoryContent}
      </div>
    );
  });

  const validRenderedCategories = renderedCategories.filter(Boolean);
  if (validRenderedCategories.length === 0 && !(Array.isArray(specs) && specs.length > 0 && specs.every(item => typeof item === 'object' && item !== null && 'nombre' in item)) && !isFlatObject) {
    return <p style={{ fontSize: '13px', color: '#6B7280' }}>No hay especificaciones técnicas detalladas en el formato esperado.</p>;
  }
  return <>{validRenderedCategories.length > 0 ? validRenderedCategories : (isFlatObject || (Array.isArray(specs) && specs.length >0)) ? null : <p>No specs.</p> }</>; // Fallback for flat/array if they were already rendered
}

// Renamed and refactored to make fields editable
const renderEditableProductDetailsAndSections = (data: any, handleInputChange: Function, formatCLPCurrency: Function, getDisplayValue: Function, getDimensionInMm: Function) => {
  if (!data || Object.keys(data).length === 0) {
    return <p>No hay datos del producto disponibles para editar.</p>;
  }

  const detailItemStyle: React.CSSProperties = { fontSize: '13px', color: '#1F2937', margin: 0, wordBreak: 'break-word' };
  const labelStyleMod: React.CSSProperties = { fontSize: '13px', fontWeight: 500, color: '#4B5563', display: 'block', marginBottom:'4px' }; // Adjusted for inputs
  const sectionSpacing: React.CSSProperties = { marginBottom: '20px' };
  // dlStyle is not ideal for forms, will use divs per field
  const fieldGroupStyle: React.CSSProperties = { marginBottom: '12px' };

  return (
    <>
      <div style={sectionSpacing}>
        <h3 style={{...improvedSectionTitleStyle, marginTop: '0', marginBottom: '16px'}}>Detalles Generales del Producto</h3>
        
        <div style={fieldGroupStyle}>
          <label style={labelStyleMod}>Código Producto:</label>
          <span style={detailItemStyle}>{getDisplayValue(data.Codigo_Producto)}</span> {/* Non-editable */}
        </div>

        <div style={fieldGroupStyle}>
          <label htmlFor="nombre_del_producto" style={labelStyleMod}>Nombre del Producto:</label>
          <input id="nombre_del_producto" name="nombre_del_producto" type="text" value={data.nombre_del_producto || ''} onChange={(e) => handleInputChange(e)} style={inputBaseStyle} />
        </div>

        <div style={fieldGroupStyle}>
          <label htmlFor="producto" style={labelStyleMod}>Producto:</label>
          <input id="producto" name="producto" type="text" value={data.producto || ''} onChange={(e) => handleInputChange(e)} style={inputBaseStyle} />
        </div>

        <div style={fieldGroupStyle}>
          <label htmlFor="modelo" style={labelStyleMod}>Modelo:</label>
          <input id="modelo" name="modelo" type="text" value={data.modelo || ''} onChange={(e) => handleInputChange(e)} style={inputBaseStyle} />
        </div>

        <div style={fieldGroupStyle}>
          <label htmlFor="categoria" style={labelStyleMod}>Categoría:</label>
          <input id="categoria" name="categoria" type="text" value={data.categoria || ''} onChange={(e) => handleInputChange(e)} style={inputBaseStyle} />
        </div>
        
        <div style={fieldGroupStyle}>
          <label htmlFor="fabricante" style={labelStyleMod}>Fabricante:</label>
          <input id="fabricante" name="fabricante" type="text" value={data.fabricante || ''} onChange={(e) => handleInputChange(e)} style={inputBaseStyle} />
        </div>

        <div style={fieldGroupStyle}>
          <label htmlFor="peso_kg" style={labelStyleMod}>Peso (kg):</label>
          <input id="peso_kg" name="peso_kg" type="number" value={data.peso_kg || ''} onChange={(e) => handleInputChange(e)} style={inputBaseStyle} />
        </div>

        <div style={fieldGroupStyle}>
          <label htmlFor="descripcion" style={labelStyleMod}>Descripción:</label>
          <textarea id="descripcion" name="descripcion" value={data.descripcion || ''} onChange={(e) => handleInputChange(e)} style={{...inputBaseStyle, minHeight: '80px'}} rows={3}/>
        </div>
      </div>

      {/* Dimensions Section - Editable */}
      <div style={sectionSpacing}>
        <h3 style={{...improvedSectionTitleStyle, marginTop: '0', marginBottom: '16px'}}>Dimensiones</h3>
        <div style={fieldGroupStyle}>
          <label htmlFor="dimensiones.largo_mm_input" style={labelStyleMod}>Largo (mm):</label>
          <input 
            id="dimensiones.largo_mm_input" 
            name="dimensiones.largo_mm_input" 
            type="number" 
            value={data.dimensiones?.largo_cm !== undefined ? data.dimensiones.largo_cm * 10 : ''} 
            onChange={(e) => handleInputChange(e)} 
            style={inputBaseStyle} 
          />
        </div>
        <div style={fieldGroupStyle}>
          <label htmlFor="dimensiones.ancho_mm_input" style={labelStyleMod}>Ancho (mm):</label>
          <input 
            id="dimensiones.ancho_mm_input" 
            name="dimensiones.ancho_mm_input" 
            type="number" 
            value={data.dimensiones?.ancho_cm !== undefined ? data.dimensiones.ancho_cm * 10 : ''} 
            onChange={(e) => handleInputChange(e)} 
            style={inputBaseStyle} 
          />
        </div>
        <div style={fieldGroupStyle}>
          <label htmlFor="dimensiones.alto_mm_input" style={labelStyleMod}>Alto (mm):</label>
          <input 
            id="dimensiones.alto_mm_input" 
            name="dimensiones.alto_mm_input" 
            type="number" 
            value={data.dimensiones?.alto_cm !== undefined ? data.dimensiones.alto_cm * 10 : ''} 
            onChange={(e) => handleInputChange(e)} 
            style={inputBaseStyle} 
          />
        </div>
      </div>

      {/* Datos Contables Section - Editable */}
      <div style={sectionSpacing}>
        <h3 style={{...improvedSectionTitleStyle, marginTop: '0', marginBottom: '16px'}}>Datos Contables</h3>
        <div style={fieldGroupStyle}>
          <label htmlFor="fecha_cotizacion" style={labelStyleMod}>Fecha Cotización (Año):</label>
          <input id="fecha_cotizacion" name="fecha_cotizacion" type="number" placeholder="YYYY" value={data.fecha_cotizacion || ''} onChange={(e) => handleInputChange(e)} style={inputBaseStyle} />
        </div>
        <div style={fieldGroupStyle}>
          <label htmlFor="costo_fabrica" style={labelStyleMod}>Costo Fábrica:</label>
          <input id="costo_fabrica" name="costo_fabrica" type="number" value={data.costo_fabrica || ''} onChange={(e) => handleInputChange(e)} style={inputBaseStyle} />
          <span style={{fontSize: '12px', marginLeft:'5px'}}>({formatCLPCurrency(data.costo_fabrica)})</span>
        </div>
      </div>
    </>
  );
};

const EquipoEditModal: React.FC<EquipoEditModalProps> = ({ open, onClose, producto, onSaveSuccess, backendUrl }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [formData, setFormData] = useState<any>({}); // Debería ser 'Partial<Producto>'
  const [ultimaObservacion, setUltimaObservacion] = useState('');
  const [expandedSpecSections, setExpandedSpecSections] = useState<Record<string, boolean>>({}); // Estado para el acordeón
  const [isEspecificacionesExpanded, setIsEspecificacionesExpanded] = useState(false); // Default to closed
  const [newPrincipalModel, setNewPrincipalModel] = useState(''); // Reinstated for new model input

  // Helper functions that were previously inside renderProductDetails, now passed as args or accessed from formData
  const getDisplayValue = (value: any, unit: string = '') => {
    if (value === null || value === undefined || value === '') return '-';
    return `${String(value)}${unit}`;
  };

  const formatCLPCurrency = (value: any) => {
    if (typeof value !== 'number') {
      return getDisplayValue(value); 
    }
    const roundedValue = Math.round(value);
    const formattedNumber = roundedValue.toLocaleString('es-CL');
    return `$ ${formattedNumber}`;
  };

  const getDimensionInMm = (valueCm: any) => {
    if (typeof valueCm === 'number') {
      return getDisplayValue(valueCm * 10, ' mm');
    }
    return getDisplayValue(valueCm); 
  };

  const handleSpecificationValueChange = (path: (string | number)[], newValue: string) => {
    setFormData((prevData: any) => {
      const newData = JSON.parse(JSON.stringify(prevData)); // Deep copy
      let currentLevel = newData.especificaciones_tecnicas;

      if (!currentLevel) {
        console.error("especificaciones_tecnicas is undefined in formData");
        return prevData; // or initialize: newData.especificaciones_tecnicas = {}; currentLevel = newData.especificaciones_tecnicas;
      }

      for (let i = 0; i < path.length - 1; i++) {
        const segment = path[i];
        if (currentLevel[segment] === undefined || currentLevel[segment] === null) {
          // If path segment doesn't exist, create it. Object for key, array for index.
          // This might be too aggressive if the path is incorrect, but necessary if specs can be sparse.
          currentLevel[segment] = typeof path[i+1] === 'number' ? [] : {};
        }
        currentLevel = currentLevel[segment];
        if (currentLevel === undefined || currentLevel === null) { // Guard against deep path creation failure
            console.error("Failed to navigate/create path for spec edit:", path);
            return prevData;
        }
      }
      const finalSegment = path[path.length - 1];
      currentLevel[finalSegment] = newValue; // Assign the new string value
      return newData;
    });
  };

  useEffect(() => {
    if (producto) {
      const initialFormData = JSON.parse(JSON.stringify(producto));
      initialFormData.caracteristicas = initialFormData.caracteristicas || {};
      initialFormData.dimensiones = initialFormData.dimensiones || {};
      initialFormData.datos_contables = initialFormData.datos_contables || {};
      initialFormData.especificaciones_tecnicas = initialFormData.especificaciones_tecnicas || {};

      // --- Initialize and derive Tipo --- 
      let currentTipo = initialFormData.tipo;
      if (typeof initialFormData.es_opcional === 'boolean') { // Check if es_opcional is explicitly set
        if (initialFormData.es_opcional) {
          currentTipo = 'opcional';
        } else {
          currentTipo = 'equipo';
        }
      } else { // If es_opcional is not set, derive from tipo or default
        if (currentTipo !== 'equipo' && currentTipo !== 'opcional') {
          currentTipo = 'equipo'; // Default to 'equipo' if tipo is invalid and es_opcional is not set
        }
      }
      initialFormData.tipo = currentTipo;
      initialFormData.es_opcional = currentTipo === 'opcional';
      // --- End of Tipo initialization ---

      // --- Adjustment for fecha_cotizacion ---
      if (initialFormData.datos_contables && initialFormData.datos_contables.fecha_cotizacion) {
        const dateValue = initialFormData.datos_contables.fecha_cotizacion;
        const date = new Date(dateValue); // Attempt to parse
        if (!isNaN(date.getTime())) { // Check if date is valid
          // Format to YYYY-MM-DD
          const year = date.getFullYear();
          const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Month is 0-indexed
          const day = date.getDate().toString().padStart(2, '0');
          initialFormData.datos_contables.fecha_cotizacion = `${year}-${month}-${day}`;
        } else {
          // If original value was not a valid date string, set to empty
          initialFormData.datos_contables.fecha_cotizacion = '';
        }
      } else if (initialFormData.datos_contables) {
        // If fecha_cotizacion is not present in datos_contables, ensure it's an empty string
         initialFormData.datos_contables.fecha_cotizacion = '';
      }
      // --- End of adjustment ---

      setFormData(initialFormData);
      setUltimaObservacion(producto.ultima_observacion_edicion || '');
      setExpandedSpecSections({}); // Resetear acordeón cuando el producto cambia o se abre el modal
    } else {
      setFormData({});
      setUltimaObservacion('');
    }
  }, [producto, open]);

  // Cambiar handleInputChange para soportar keys anidadas y conversión mm a cm
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    // Special handling for dimension mm inputs
    if (name.startsWith('dimensiones.') && name.endsWith('_mm_input')) {
      const actualDimensionKey = name.replace('_mm_input', '_cm'); // e.g., dimensiones.largo_cm
      const keys = actualDimensionKey.split('.'); // ['dimensiones', 'largo_cm']
      const numericValue = parseFloat(value);
      const valueInCm = !isNaN(numericValue) ? numericValue / 10 : null; // Convert mm to cm

      setFormData((prev: typeof formData) => {
        const newData = { ...prev };
        let obj = newData;
        // Ensure 'dimensiones' object exists
        if (!obj[keys[0]]) obj[keys[0]] = {}; 
        obj = obj[keys[0]];
        obj[keys[1]] = valueInCm; // Store converted cm value
        return newData;
      });
    } else if (name.includes('.')) {
      const keys = name.split('.');
      setFormData((prev: typeof formData) => {
        const newData = { ...prev };
        let obj = newData;
        for (let i = 0; i < keys.length - 1; i++) {
          if (!obj[keys[i]]) obj[keys[i]] = {};
          obj = obj[keys[i]];
        }
        obj[keys[keys.length - 1]] = type === 'checkbox' ? checked : value;
        return newData;
      });
    } else {
      setFormData((prev: typeof formData) => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSpecChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, specKey: string) => {
    const { value } = e.target;
    setFormData((prev: typeof formData) => ({
      ...prev,
      especificaciones_tecnicas: {
        ...prev.especificaciones_tecnicas,
        [specKey]: value,
      },
    }));
  };
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleNestedSpecChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, sectionKey: string, specKey: string) => {
    const { value } = e.target;
    setFormData((prev: typeof formData) => ({
      ...prev,
      especificaciones_tecnicas: {
        ...prev.especificaciones_tecnicas,
        [sectionKey]: {
          ...(prev.especificaciones_tecnicas[sectionKey] || {}),
          [specKey]: value,
        }
      },
    }));
  };

  const [newSpecKey, setNewSpecKey] = useState('');
  const [newSpecValue, setNewSpecValue] = useState('');
  const [newSpecSection, setNewSpecSection] = useState(''); // Para especificar la sección de la nueva especificación

  // Nueva función para el toggle del acordeón de especificaciones
  const toggleSpecSection = (sectionKey: string) => {
    setExpandedSpecSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  const handleAddSpec = () => {
    if (newSpecKey.trim() === '') return; // No añadir si la clave está vacía

    let updatedSpecs = { ...formData.especificaciones_tecnicas };

    if (newSpecSection.trim() !== '') { // Si se especificó una sección
        if (!updatedSpecs[newSpecSection]) {
            updatedSpecs[newSpecSection] = {}; // Crear la sección si no existe
        }
        updatedSpecs[newSpecSection][newSpecKey.trim()] = newSpecValue;
    } else { // Si no hay sección, añadir directamente
        updatedSpecs[newSpecKey.trim()] = newSpecValue;
    }

    setFormData((prev: typeof formData) => ({
      ...prev,
      especificaciones_tecnicas: updatedSpecs,
    }));
    setNewSpecKey('');
    setNewSpecValue('');
    setNewSpecSection(''); // Limpiar también la sección
  };
  
  const handleDeleteSpec = (specKey: string, sectionKey?: string) => {
    const newSpecs = { ...formData.especificaciones_tecnicas };
    if (sectionKey && newSpecs[sectionKey]) {
        delete newSpecs[sectionKey][specKey];
        if (Object.keys(newSpecs[sectionKey]).length === 0) { // Si la sección queda vacía, eliminarla
            delete newSpecs[sectionKey];
        }
    } else {
        delete newSpecs[specKey];
    }
    setFormData((prev: typeof formData) => ({
      ...prev,
      especificaciones_tecnicas: newSpecs,
    }));
  };

  // Handler to add a new principal model (reinstated and adapted)
  const handleAddPrincipalModel = () => {
    if (newPrincipalModel.trim() === '') return;
    setFormData((prev: any) => ({
      ...prev,
      asignado_a_codigo_principal: [
        ...(prev.asignado_a_codigo_principal || []),
        newPrincipalModel.trim(),
      ],
    }));
    setNewPrincipalModel(''); // Clear input after adding
  };

  // const handleRemovePrincipalModel = (indexToRemove: number) => { ... }; // Kept removed as per current request

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!producto || !producto.Codigo_Producto) return;

    const payload = {
      ...formData,
      ultima_observacion_edicion: ultimaObservacion,
    };
    
    // Limpiar el _id y otros campos que Mongoose añade si no se quieren enviar al update
    // delete payload._id; 
    // delete payload.createdAt;
    // delete payload.updatedAt;

    try {
      const response = await fetch(`${backendUrl}/api/products/code/${producto.Codigo_Producto}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        // Intenta parsear el cuerpo del error si está disponible
        const errorData = await response.json().catch(() => null); // Evita error si no hay JSON
        const errorMessage = errorData?.message || errorData?.error || `Error HTTP: ${response.status}`;
        console.error('Error al guardar el producto:', errorMessage, errorData);
        // Aquí podrías usar un sistema de notificaciones más amigable en lugar de un alert
        alert(`Error al guardar: ${errorMessage}`);
        throw new Error(errorMessage);
      }

      const updatedProduct = await response.json();
      console.log('Producto actualizado:', updatedProduct);
      alert('¡Producto guardado con éxito!');
      
      onSaveSuccess(); // Llama a la función para refrescar/notificar
      onClose(); // Cierra el modal
    } catch (error) {
      // El error ya debería haber sido logueado y mostrado en una alerta arriba
      // Si llegamos aquí por un error que no fue un !response.ok (ej. red), loguearlo.
      // Comprobamos si el error es una instancia de Error para acceder a 'message'
      if (error instanceof Error) {
        if (!error.message.startsWith('Error HTTP')) {
          console.error('Error en handleSubmit:', error);
          alert(`Se produjo un error inesperado: ${error.message}`);
        }
      } else {
        // Si no es una instancia de Error, loguearlo de forma genérica
        console.error('Error en handleSubmit (tipo desconocido):', error);
        alert('Se produjo un error inesperado.');
      }
    }
  };

  if (!open || !producto) {
    return null;
  }
  
  // Función auxiliar para renderizar los items de una sección de especificación (clave-valor)
  const renderSpecSectionItems = (items: object, parentSectionKey: string) => {
    return Object.entries(items).map(([key, value]) => {
      // Linter Fix: Ensure value is a primitive type for the input
      let displayValue: string;
      if (typeof value === 'string' || typeof value === 'number') {
        displayValue = String(value);
      } else if (typeof value === 'boolean') {
        displayValue = value ? 'Sí' : 'No'; // Or handle booleans with a checkbox if preferred for editing
      } else {
        displayValue = typeof value === 'object' && value !== null ? JSON.stringify(value) : '';
      }

      return (
      <div key={key} style={specRowStyle}>
        <label style={specKeyStyle}>{key.replace(/_/g, ' ')}:</label>
        <input
          type="text"
          value={displayValue} // Use the processed displayValue
          onChange={(e) => handleNestedSpecChange(e, parentSectionKey, key)}
          style={specValueInputStyle}
        />
        <button 
          type="button" 
          onClick={() => handleDeleteSpec(key, parentSectionKey)} 
          title={`Eliminar ${key.replace(/_/g, ' ')}`}
          style={specDeleteButtonStyle}
        >
          <Trash2 size={16} />
        </button>
      </div>
      );
    });
  };

  const renderEspecificaciones = (specs: object) => { // Ya no necesita parentSectionKey aquí
    return Object.entries(specs).map(([sectionKey, sectionValue]) => {
      // Asumimos que el primer nivel de 'specs' siempre son objetos de sección
      if (typeof sectionValue === 'object' && sectionValue !== null) {
        const isExpanded = !!expandedSpecSections[sectionKey];
        return (
          <div key={sectionKey} style={{ ...specSectionStyle, marginBottom: '10px' }}>
            <button 
              type="button"
              onClick={() => toggleSpecSection(sectionKey)}
              style={{
                background: 'none',
                border: 'none',
                padding: '10px 0',
                width: '100%',
                textAlign: 'left',
                fontSize: '16px',
                fontWeight: 600,
                color: '#333',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: isExpanded ? 'none' : '1px solid #eee',
                outline: 'none',
              }}
            >
              {sectionKey.replace(/_/g, ' ').toUpperCase()}
              {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </button>
            {isExpanded && (
              <div style={{ paddingTop: '15px' }}>
                {renderSpecSectionItems(sectionValue, sectionKey)}
              </div>
            )}
          </div>
        );
      }
      return null; // No debería llegar aquí si la estructura es siempre sección -> items
    });
  };

  // Helper para renderizar campos dinámicos
  const renderDynamicFields = (obj: any, parentKey = '', onChange: any) => {
    if (!obj || typeof obj !== 'object') return null;
    return Object.entries(obj).map(([key, value]) => {
      // No mostrar campos internos de Mongo ni __v
      if (["_id", "createdAt", "updatedAt", "__v"].includes(key)) return null;
      const fullKey = parentKey ? `${parentKey}.${key}` : key;
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Renderizar sección anidada
  return (
          <div key={fullKey} style={{ marginBottom: 16, padding: '10px 0', borderTop: '1px solid #eee' }}>
            <label style={{ ...labelStyle, fontWeight: 600 }}>{key.replace(/_/g, ' ').toUpperCase()}:</label>
            <div style={{ marginLeft: 12 }}>
              {renderDynamicFields(value, fullKey, onChange)}
            </div>
          </div>
        );
      } else if (typeof value === 'boolean') {
        // Checkbox para booleanos
        return (
          <div key={fullKey} style={fieldContainerStyle}>
            <label style={labelStyle}>
              <input
                type="checkbox"
                name={fullKey}
                checked={!!value}
                onChange={e => onChange({ target: { name: fullKey, value: e.target.checked, type: 'checkbox' } })}
                style={improvedCheckboxStyle}
              />
              {key.replace(/_/g, ' ')}
            </label>
          </div>
        );
      } else {
        // Input para string/number
        // Linter Fix: Ensure value passed to input is a primitive type
        let displayValueForInput: string;
        if (typeof value === 'string' || typeof value === 'number') {
          displayValueForInput = String(value);
        } else if (typeof value === 'boolean') {
          // Booleans are handled by the checkbox case above, but as a fallback for this input:
          displayValueForInput = value ? 'true' : 'false'; 
        } else {
          // For objects or other complex types not handled by specific cases (like nested objects or arrays)
          // assign a string representation or empty string to avoid type errors for the text input.
          displayValueForInput = value !== null && value !== undefined ? String(value) : '';
          if (typeof value ==='object') displayValueForInput = JSON.stringify(value); // Be more explicit for objects
        }

        return (
          <div key={fullKey} style={fieldContainerStyle}>
            <label htmlFor={fullKey} style={labelStyle}>{key.replace(/_/g, ' ')}:</label>
            <input
              id={fullKey}
              type={typeof value === 'number' && !isNaN(value) ? 'number' : 'text'} // Refined type for number
              name={fullKey}
              value={displayValueForInput} // Use the processed displayValueForInput
              onChange={onChange}
              style={inputBaseStyle}
            />
          </div>
        );
      }
    });
  };

  return (
    <div style={unifiedModalOverlayStyle}>
      <div style={unifiedModalContentStyle}>
        <div style={unifiedHeaderStyle}>
          <div style={unifiedTitleStyle}>
            Editar Producto: {formData.Codigo_Producto || formData.codigo_producto}
          </div>
          <button onClick={onClose} style={{ ...unifiedSecondaryButtonStyle, backgroundColor: 'transparent', color: 'white', border: 'none', fontSize: '18px' }}>×</button>
            </div>
        <form onSubmit={handleSubmit} style={{display:'flex', flexDirection:'column', flexGrow: 1, minHeight: '0'}}>
          <div style={unifiedBodyStyle}>
            {/* <h4 style={improvedSectionTitleStyle}>Todos los Datos del Producto</h4>
            <div style={{ maxHeight: 500, overflowY: 'auto', paddingRight: 10 }}>
              {renderDynamicFields(formData, '', handleInputChange)}
            </div> */}
            {/* The above section has been removed as per user request */}

            {/* Display General Product Details and Dimensions */}
            {renderEditableProductDetailsAndSections(formData, handleInputChange, formatCLPCurrency, getDisplayValue, getDimensionInMm)}

            {/* "Asignados" Section - Display existing, input for new */}
            <div style={{ marginTop: '20px' }}>
              <h3 style={{...improvedSectionTitleStyle, marginTop: '0', marginBottom: '10px'}}>Asignados</h3>
              <div style={{ marginBottom: '10px' }}>
                {(formData.asignado_a_codigo_principal && Array.isArray(formData.asignado_a_codigo_principal) && formData.asignado_a_codigo_principal.length > 0) ? (
                  formData.asignado_a_codigo_principal.map((model: string, index: number) => (
                    <span key={index} style={{
                      display: 'inline-block', 
                      padding: '4px 8px', 
                      marginRight: '8px', 
                      marginBottom: '8px', 
                      backgroundColor: '#e0e7ef', 
                      borderRadius: '4px', 
                      fontSize: '13px'
                    }}>
                      {model}
                    </span>
                  ))
                ) : (
                  <p style={{ fontSize: '13px', color: '#6B7280', margin: '0' }}>No hay modelos asignados actualmente.</p>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center'}}>
                <input 
                  type="text"
                  value={newPrincipalModel}
                  onChange={(e) => setNewPrincipalModel(e.target.value)}
                  placeholder="Añadir nuevo modelo asignado"
                  style={{...inputBaseStyle, flexGrow:1, marginBottom:0}} 
                />
                <button 
                  type="button" 
                  onClick={handleAddPrincipalModel} 
                  style={{...unifiedSecondaryButtonStyle, padding: '8px 12px', fontSize:'13px'}}
                >
                  Añadir Modelo
                </button>
              </div>
            </div>

            {/* Visualización de Especificaciones Técnicas (Estilo Ver Detalle) - Collapsible */}
            {formData.especificaciones_tecnicas && Object.keys(formData.especificaciones_tecnicas).length > 0 && (
              <div style={{ marginTop: '20px'}}> {/* Added some top margin for separation */}
                <button 
                  type="button"
                  onClick={() => setIsEspecificacionesExpanded(!isEspecificacionesExpanded)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '0', // Reset padding
                    width: '100%',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    outline: 'none',
                    marginBottom: isEspecificacionesExpanded ? '16px' : '0', // Margin only when expanded
                    ...improvedSectionTitleStyle, // Apply existing title style
                    marginTop: '0', // Override from improvedSectionTitleStyle if needed
                  }}
                >
                  Especificaciones Técnicas
                  {isEspecificacionesExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                </button>
                <div 
                  style={{
                    maxHeight: isEspecificacionesExpanded ? '2000px' : '0px', // Increased from 1000px
                    opacity: isEspecificacionesExpanded ? 1 : 0,
                    visibility: isEspecificacionesExpanded ? 'visible' : 'hidden',
                    overflow: 'hidden',
                    transition: `max-height 0.35s ease-in-out, 
                                 opacity 0.35s ease-in-out, 
                                 visibility 0s linear ${isEspecificacionesExpanded ? '0s' : '0.35s'}`,
                    // Apply a delay to visibility when closing, so it hides after animations
                  }}
                >
                  {/* Content is always rendered but hidden by parent's styles when collapsed */}
                  {formData.especificaciones_tecnicas && renderEditableSpecificationsDisplay(formData.especificaciones_tecnicas, handleSpecificationValueChange, inputBaseStyle)}
                </div>
              </div>
            )}

          </div>
          <div style={unifiedFooterStyle}>
            <button type="button" onClick={onClose} style={unifiedSecondaryButtonStyle}>
              Cancelar
            </button>
            <button type="submit" style={unifiedPrimaryButtonStyle}>
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EquipoEditModal; 