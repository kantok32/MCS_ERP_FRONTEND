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

const EquipoEditModal: React.FC<EquipoEditModalProps> = ({ open, onClose, producto, onSaveSuccess, backendUrl }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [formData, setFormData] = useState<any>({}); // Debería ser 'Partial<Producto>'
  const [ultimaObservacion, setUltimaObservacion] = useState('');
  const [expandedSpecSections, setExpandedSpecSections] = useState<Record<string, boolean>>({}); // Estado para el acordeón

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

  // Cambiar handleInputChange para soportar keys anidadas
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    if (name.includes('.')) {
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
        [name]: type === 'checkbox' ? checked : value,
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
    return Object.entries(items).map(([key, value]) => (
      <div key={key} style={specRowStyle}>
        <label style={specKeyStyle}>{key.replace(/_/g, ' ')}:</label>
        <input
          type="text"
          value={value as string}
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
    ));
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
        return (
          <div key={fullKey} style={fieldContainerStyle}>
            <label htmlFor={fullKey} style={labelStyle}>{key.replace(/_/g, ' ')}:</label>
            <input
              id={fullKey}
              type={typeof value === 'number' ? 'number' : 'text'}
              name={fullKey}
              value={value ?? ''}
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
        <form onSubmit={handleSubmit} style={{display:'flex', flexDirection:'column', height:'100%'}}>
          <div style={unifiedBodyStyle}>
            <h4 style={improvedSectionTitleStyle}>Todos los Datos del Producto</h4>
            <div style={{ maxHeight: 500, overflowY: 'auto', paddingRight: 10 }}>
              {renderDynamicFields(formData, '', handleInputChange)}
            </div>
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