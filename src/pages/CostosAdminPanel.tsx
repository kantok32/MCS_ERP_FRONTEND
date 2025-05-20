import React, { useState, useEffect } from 'react';
import { SlidersHorizontal, DollarSign, Euro, RefreshCw, Info, Save, Calendar, Filter, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { api } from '../services/api';
import { CostParams, CostParamsWebhookResponse } from '../types/costParams';

// --- Componente CostosAdminPanel (Lógica movida desde AdminPanel original) ---
export default function CostosAdminPanel() { 
  // --- Estados para parámetros ---
  const [tipoCambio, setTipoCambio] = useState<string>('1.12');
  const [bufferDolar, setBufferDolar] = useState<string>('1.8');
  const [tasaSeguroGlobal, setTasaSeguroGlobal] = useState<string>('1');
  const [bufferTransporteGlobal, setBufferTransporteGlobal] = useState<string>('5');
  const [margenTotalGeneral, setMargenTotalGeneral] = useState<string>('20');
  const [descuentoFabricanteGeneral, setDescuentoFabricanteGeneral] = useState<string>('5');
  const [fechaUltimaActualizacion, setFechaUltimaActualizacion] = useState<string>('2025-04-14');
  const [costoFabricaOriginalEUR, setCostoFabricaOriginalEUR] = useState<string>('100000');
  const [transporteLocalEUR, setTransporteLocalEUR] = useState<string>('800');
  const [gastoImportacionEUR, setGastoImportacionEUR] = useState<string>('400');
  const [fleteMaritimosUSD, setFleteMaritimosUSD] = useState<string>('3500');
  const [recargosDestinoUSD, setRecargosDestinoUSD] = useState<string>('500');
  const [honorariosAgenteAduanaUSD, setHonorariosAgenteAduanaUSD] = useState<string>('600');
  const [gastosPortuariosOtrosUSD, setGastosPortuariosOtrosUSD] = useState<string>('200');
  const [transporteNacionalCLP, setTransporteNacionalCLP] = useState<string>('950000');
  const [factorActualizacionAnual, setFactorActualizacionAnual] = useState<string>('5');
  const [derechoAdValorem, setDerechoAdValorem] = useState<string>('6');
  const [iva, setIva] = useState<string>('19');
  const [bufferEurUsd, setBufferEurUsd] = useState<string>('2');
  const [nombrePerfil, setNombrePerfil] = useState<string>('');

  // --- Estilos ---
  const primaryTextColor = '#0ea5e9';
  const secondaryTextColor = '#64748b';
  const lightGrayBg = '#f8fafc';
  const borderColor = '#e5e7eb';
  // Estilo para el contenedor general (REMOVED PADDING)
  const panelContainerStyle: React.CSSProperties = { /* padding: '24px' */ }; 
  const gridContainerStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '24px' };
  const gridCardStyle: React.CSSProperties = { backgroundColor: lightGrayBg, borderRadius: '8px', padding: '20px', border: `1px solid ${borderColor}` };
  const gridCardTitleStyle: React.CSSProperties = { fontSize: '14px', fontWeight: 600, color: '#334155', marginBottom: '16px' };
  const inputGroupStyle: React.CSSProperties = { marginBottom: '12px' };
  const labelStyle: React.CSSProperties = { display:'block', marginBottom: '4px', fontSize: '12px', color: secondaryTextColor, fontWeight: 500 };
  const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', border: `1px solid ${borderColor}`, borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' };
  const inputDescriptionStyle: React.CSSProperties = { fontSize: '11px', color: '#94a3b8', marginTop: '4px' };
  const buttonBaseStyle: React.CSSProperties = { padding: '8px 16px', borderRadius: '6px', border: '1px solid', cursor: 'pointer', fontSize: '13px', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '6px' };
  const primaryButtonStyle: React.CSSProperties = { ...buttonBaseStyle, backgroundColor: primaryTextColor, color: 'white', borderColor: primaryTextColor };
  const secondaryButtonStyle: React.CSSProperties = { ...buttonBaseStyle, backgroundColor: 'white', color: '#334155', borderColor: borderColor };
  const selectStyle: React.CSSProperties = { ...inputStyle, appearance: 'none', background: `url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23${secondaryTextColor.substring(1)}%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.4-12.8z%22%2F%3E%3C%2Fsvg%3E') no-repeat right 12px center`, backgroundSize: '10px' };
  
  const headerRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px'
  };

  const configSectionStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  };

  // --- Estados Carga/Error ---
  const [initialCostParamsLoading, setInitialCostParamsLoading] = useState(true);
  const [initialCostParamsError, setInitialCostParamsError] = useState<string | null>(null);
  const [isSavingGlobalParams, setIsSavingGlobalParams] = useState(false);
  const [saveGlobalParamsError, setSaveGlobalParamsError] = useState<string | null>(null);
  const [saveGlobalParamsSuccess, setSaveGlobalParamsSuccess] = useState<string | null>(null);

  // --- Funciones API ---
  const fetchInitialGlobalParams = async () => {
    setInitialCostParamsLoading(true);
    setInitialCostParamsError(null);
    console.log('[CostosAdminPanel] Fetching initial global cost parameters from DB...');
    try {
      const data = await api.fetchGlobalParams();
      if (!data || !data.costos) {
        console.log('[CostosAdminPanel] Global override document not found or invalid. Using default form values.');
      } else {
        applyCostDataToState(data.costos);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
      console.error('[CostosAdminPanel] Error fetching initial global parameters:', error);
      setInitialCostParamsError(errorMsg.includes('fetch') ? 'Error de conexión cargando parámetros.' : errorMsg);
    } finally {
      setInitialCostParamsLoading(false);
    }
  };

  const applyCostDataToState = (costos: Partial<CostParams> | null) => {
      if (!costos) return;
      setTipoCambio(costos.tipo_cambio_eur_usd !== undefined ? String(costos.tipo_cambio_eur_usd) : tipoCambio);
      setBufferDolar(costos.buffer_usd_clp !== undefined ? String(costos.buffer_usd_clp * 100) : bufferDolar);
      setTasaSeguroGlobal(costos.tasa_seguro !== undefined ? String(costos.tasa_seguro * 100) : tasaSeguroGlobal);
      setBufferTransporteGlobal(costos.buffer_transporte !== undefined ? String(costos.buffer_transporte * 100) : bufferTransporteGlobal);
      setMargenTotalGeneral(costos.margen_adicional_total !== undefined ? String(costos.margen_adicional_total * 100) : margenTotalGeneral);
      setDescuentoFabricanteGeneral(costos.descuento_fabricante !== undefined ? String(costos.descuento_fabricante * 100) : descuentoFabricanteGeneral);
      setBufferEurUsd(costos.buffer_eur_usd !== undefined ? String(costos.buffer_eur_usd * 100) : bufferEurUsd);
      setCostoFabricaOriginalEUR(costos.costo_fabrica_original_eur !== undefined ? String(costos.costo_fabrica_original_eur) : costoFabricaOriginalEUR);
      setTransporteLocalEUR(costos.transporte_local_eur !== undefined ? String(costos.transporte_local_eur) : transporteLocalEUR);
      setGastoImportacionEUR(costos.gasto_importacion_eur !== undefined ? String(costos.gasto_importacion_eur) : gastoImportacionEUR);
      setFleteMaritimosUSD(costos.flete_maritimo_usd !== undefined ? String(costos.flete_maritimo_usd) : fleteMaritimosUSD);
      setRecargosDestinoUSD(costos.recargos_destino_usd !== undefined ? String(costos.recargos_destino_usd) : recargosDestinoUSD);
      setHonorariosAgenteAduanaUSD(costos.honorarios_agente_aduana_usd !== undefined ? String(costos.honorarios_agente_aduana_usd) : honorariosAgenteAduanaUSD);
      setGastosPortuariosOtrosUSD(costos.gastos_portuarios_otros_usd !== undefined ? String(costos.gastos_portuarios_otros_usd) : gastosPortuariosOtrosUSD);
      setTransporteNacionalCLP(costos.transporte_nacional_clp !== undefined ? String(costos.transporte_nacional_clp) : transporteNacionalCLP);
      setFactorActualizacionAnual(costos.factor_actualizacion_anual !== undefined ? String(costos.factor_actualizacion_anual * 100) : factorActualizacionAnual);
      setDerechoAdValorem(costos.derecho_ad_valorem !== undefined ? String(costos.derecho_ad_valorem * 100) : derechoAdValorem);
      setIva(costos.iva !== undefined ? String(costos.iva * 100) : iva);
      setFechaUltimaActualizacion(costos.fecha_ultima_actualizacion_transporte_local ?? fechaUltimaActualizacion);
  };

  // --- useEffects ---
  useEffect(() => {
    console.log('[CostosAdminPanel] Component mounted, fetching initial global parameters...');
    fetchInitialGlobalParams();
  }, []);

  // --- Handlers ---
  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<any>>) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
     setSaveGlobalParamsSuccess(null);
     setSaveGlobalParamsError(null);
     setter(event.target.value);
  };

  const handleSaveAll = async () => {
    console.log('[CostosAdminPanel] Starting save operation...');
    setIsSavingGlobalParams(true);
    setSaveGlobalParamsError(null);
    setSaveGlobalParamsSuccess(null);
    try {
      const buildParam = (value: string, defaultValue = 0): number => { const p = parseFloat(value); return isNaN(p) ? defaultValue : p; };
      const buildPercentage = (value: string, defaultValue = 0): number => { const p = parseFloat(value); return isNaN(p) ? defaultValue : p / 100; };
      const params: CostParams = {
          tipo_cambio_eur_usd: buildParam(tipoCambio, 1.1),
          buffer_usd_clp: buildPercentage(bufferDolar),
          buffer_eur_usd: buildPercentage(bufferEurUsd),
          tasa_seguro: buildPercentage(tasaSeguroGlobal),
          margen_adicional_total: buildPercentage(margenTotalGeneral),
          buffer_transporte: buildPercentage(bufferTransporteGlobal),
          descuento_fabricante: buildPercentage(descuentoFabricanteGeneral),
          costo_fabrica_original_eur: buildParam(costoFabricaOriginalEUR),
          transporte_local_eur: buildParam(transporteLocalEUR),
          gasto_importacion_eur: buildParam(gastoImportacionEUR),
          flete_maritimo_usd: buildParam(fleteMaritimosUSD),
          recargos_destino_usd: buildParam(recargosDestinoUSD),
          honorarios_agente_aduana_usd: buildParam(honorariosAgenteAduanaUSD),
          gastos_portuarios_otros_usd: buildParam(gastosPortuariosOtrosUSD),
          transporte_nacional_clp: buildParam(transporteNacionalCLP),
          factor_actualizacion_anual: buildPercentage(factorActualizacionAnual),
          derecho_ad_valorem: buildPercentage(derechoAdValorem),
          iva: buildPercentage(iva, 0.19),
          fecha_ultima_actualizacion_transporte_local: fechaUltimaActualizacion || new Date().toISOString().split('T')[0],
      };
      for (const [key, value] of Object.entries(params)) {
          if (key !== 'fecha_ultima_actualizacion_transporte_local' && typeof value !== 'number' && value !== undefined) {
               throw new Error(`Valor inválido para ${key}: ${value}. Asegúrese que los campos numéricos sean correctos.`);
          }
      }
      const apiPayload = { costos: params };
      let result;
      console.log('Guardando parámetros como Global (ignora nombre de perfil por ahora)');
      result = await api.updateGlobalParams(apiPayload);
      setSaveGlobalParamsSuccess(`Parámetros guardados.`);
      setTimeout(() => setSaveGlobalParamsSuccess(null), 5000);
    } catch (error) {
      console.error('[CostosAdminPanel] Error saving parameters:', error);
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
      setSaveGlobalParamsError(errorMsg);
      setTimeout(() => setSaveGlobalParamsError(null), 8000);
    } finally {
      setIsSavingGlobalParams(false);
    }
  };

  // --- JSX --- 
  return (
    <div style={panelContainerStyle}>
      
      {/* --- Fila de Cabecera: Configuración --- */}
      <div style={headerRowStyle}>
        {/* Sección de Configuración (izquierda) - Reemplazar dropdown con input */} 
        <div style={configSectionStyle}>
          {/* --- REMOVER Select de categoría --- */}
          {/* 
          <label htmlFor="category-select" style={{ ...labelStyle, marginBottom: 0, fontSize: '13px' }}>Configurar Parámetros Para:</label>
          <select id="category-select" ...>
             ...
          </select>
          {isLoadingCategoryParams && <Loader2 .../>}
          {loadCategoryParamsError && <span ...>...</span>} 
          */}
          
          {/* --- AÑADIR Input Nombre de perfil --- */} 
          <label htmlFor="profile-name" style={{ ...labelStyle, marginBottom: 0, fontSize: '13px', marginRight: '8px' }}>Nombre de perfil:</label>
          <input 
             id="profile-name"
             type="text"
             style={{ ...inputStyle, minWidth: '250px' }} 
             value={nombrePerfil}
             onChange={handleInputChange(setNombrePerfil)}
             placeholder="Ej: Perfil Chipeadoras Estándar"
          />

        </div>

        {/* Sección derecha vacía por ahora */} 
        <div></div> 
      </div>

      {initialCostParamsLoading && <div style={{ textAlign: 'center', padding: '20px' }}><Loader2 size={24} className="animate-spin" /> Cargando parámetros...</div>}
      {initialCostParamsError && <div style={{ color: 'red', fontSize: '14px', textAlign: 'center', padding: '20px' }}>Error al cargar parámetros: {initialCostParamsError}</div>}
      
      {!initialCostParamsLoading && !initialCostParamsError && (
        <div style={gridContainerStyle}> 
          {/* Card: Tipo de Cambio y Buffers */}
          <div style={gridCardStyle}> <h3 style={gridCardTitleStyle}>Tipo de Cambio y Buffers</h3> <div style={inputGroupStyle}><label htmlFor="tipoCambio" style={labelStyle}>Tipo de Cambio EUR/USD:</label><input id="tipoCambio" type="number" step="0.01" style={inputStyle} value={tipoCambio} onChange={handleInputChange(setTipoCambio)} placeholder="Ej: 1.1" /><p style={inputDescriptionStyle}>Tipo de cambio actual entre Euro y Dólar</p></div><div style={inputGroupStyle}><label htmlFor="bufferEurUsd" style={labelStyle}>Buffer EUR/USD (%):</label><input id="bufferEurUsd" type="number" step="0.1" style={inputStyle} value={bufferEurUsd} onChange={handleInputChange(setBufferEurUsd)} placeholder="Ej: 2"/><p style={inputDescriptionStyle}>Margen adicional para tipo cambio EUR/USD</p></div><div style={inputGroupStyle}><label htmlFor="bufferDolar" style={labelStyle}>Buffer USD/CLP (%):</label><input id="bufferDolar" type="number" step="0.1" style={inputStyle} value={bufferDolar} onChange={handleInputChange(setBufferDolar)} placeholder="Ej: 1.8" /><p style={inputDescriptionStyle}>Margen adicional para Dólar Observado</p></div></div>
          {/* Card: Parámetros de Margen y Seguro */}
          <div style={gridCardStyle}> <h3 style={gridCardTitleStyle}>Parámetros de Margen y Seguro</h3> <div style={inputGroupStyle}><label htmlFor="margenTotalGeneral" style={labelStyle}>Margen Total (%):</label><input id="margenTotalGeneral" type="number" step="0.1" style={inputStyle} value={margenTotalGeneral} onChange={handleInputChange(setMargenTotalGeneral)} placeholder="Ej: 35"/><p style={inputDescriptionStyle}>Porcentaje de margen adicional</p></div><div style={inputGroupStyle}><label htmlFor="tasaSeguroGlobal" style={labelStyle}>Tasa de Seguro (%):</label><input id="tasaSeguroGlobal" type="number" step="0.1" style={inputStyle} value={tasaSeguroGlobal} onChange={handleInputChange(setTasaSeguroGlobal)} placeholder="Ej: 0.6" /><p style={inputDescriptionStyle}>Porcentaje aplicado para calcular seguro</p></div><div style={inputGroupStyle}><label htmlFor="descuentoFabricanteGeneral" style={labelStyle}>Descuento Fabricante (%):</label><input id="descuentoFabricanteGeneral" type="number" step="0.1" style={inputStyle} value={descuentoFabricanteGeneral} onChange={handleInputChange(setDescuentoFabricanteGeneral)} placeholder="Ej: 10"/><p style={inputDescriptionStyle}>Descuento base sobre costo fábrica</p></div><div style={inputGroupStyle}><label htmlFor="factorActualizacionAnual" style={labelStyle}>Factor Actualización Anual (%):</label><input id="factorActualizacionAnual" type="number" step="0.1" style={inputStyle} value={factorActualizacionAnual} onChange={handleInputChange(setFactorActualizacionAnual)} placeholder="Ej: 5" /><p style={inputDescriptionStyle}>Incremento anual sobre costo fábrica</p></div></div>
           {/* Card: Parámetros de Transporte */}
          <div style={gridCardStyle}> <h3 style={gridCardTitleStyle}>Parámetros de Transporte</h3> <div style={inputGroupStyle}><label htmlFor="bufferTransporteGlobal" style={labelStyle}>Buffer Transporte (%):</label><input id="bufferTransporteGlobal" type="number" step="0.1" style={inputStyle} value={bufferTransporteGlobal} onChange={handleInputChange(setBufferTransporteGlobal)} placeholder="Ej: 0"/><p style={inputDescriptionStyle}>Margen adicional para costos de transporte</p></div> <div style={inputGroupStyle}><label htmlFor="transporteLocalEUR" style={labelStyle}>Transporte Local (EUR):</label><input id="transporteLocalEUR" type="number" style={inputStyle} value={transporteLocalEUR} onChange={handleInputChange(setTransporteLocalEUR)} placeholder="Ej: 800"/><p style={inputDescriptionStyle}>Costo de transporte local en origen</p></div><div style={inputGroupStyle}><label htmlFor="transporteNacionalCLP" style={labelStyle}>Transporte Nacional (CLP):</label><input id="transporteNacionalCLP" type="number" style={inputStyle} value={transporteNacionalCLP} onChange={handleInputChange(setTransporteNacionalCLP)} placeholder="Ej: 950000"/><p style={inputDescriptionStyle}>Costo de transporte nacional en destino</p></div> <div style={inputGroupStyle}><label htmlFor="fechaUltimaActualizacion" style={labelStyle}>Fecha Última Actualización Tarifas:</label><input id="fechaUltimaActualizacion" type="date" style={inputStyle} value={fechaUltimaActualizacion} onChange={handleInputChange(setFechaUltimaActualizacion)}/><p style={inputDescriptionStyle}>Fecha de última act. tarifas transporte</p></div></div>
          {/* Card: Costos Adicionales (EUR) */}
          <div style={gridCardStyle}> <h3 style={gridCardTitleStyle}>Costos Adicionales (EUR)</h3> <div style={inputGroupStyle}><label htmlFor="costoFabricaOriginalEUR" style={labelStyle}>Costo Fábrica Referencial (EUR):</label><input id="costoFabricaOriginalEUR" type="number" style={inputStyle} value={costoFabricaOriginalEUR} onChange={handleInputChange(setCostoFabricaOriginalEUR)} placeholder="Ej: 100000" /><p style={inputDescriptionStyle}>Costo base de fábrica en Euros</p></div><div style={inputGroupStyle}><label htmlFor="gastoImportacionEUR" style={labelStyle}>Gasto Importación (EUR):</label><input id="gastoImportacionEUR" type="number" style={inputStyle} value={gastoImportacionEUR} onChange={handleInputChange(setGastoImportacionEUR)} placeholder="Ej: 400" /><p style={inputDescriptionStyle}>Gastos de importación en Euros (Origen)</p></div></div>
          {/* Card: Costos Adicionales (USD) */}
           <div style={gridCardStyle}> <h3 style={gridCardTitleStyle}>Costos Adicionales (USD)</h3> <div style={inputGroupStyle}><label htmlFor="fleteMaritimosUSD" style={labelStyle}>Flete Marítimo (USD):</label><input id="fleteMaritimosUSD" type="number" style={inputStyle} value={fleteMaritimosUSD} onChange={handleInputChange(setFleteMaritimosUSD)} placeholder="Ej: 2500"/><p style={inputDescriptionStyle}>Costo de flete marítimo en USD</p></div><div style={inputGroupStyle}><label htmlFor="recargosDestinoUSD" style={labelStyle}>Recargos Destino (USD):</label><input id="recargosDestinoUSD" type="number" style={inputStyle} value={recargosDestinoUSD} onChange={handleInputChange(setRecargosDestinoUSD)} placeholder="Ej: 500" /><p style={inputDescriptionStyle}>Recargos en destino en USD</p></div><div style={inputGroupStyle}><label htmlFor="honorariosAgenteAduanaUSD" style={labelStyle}>Honorarios Agente Aduana (USD):</label><input id="honorariosAgenteAduanaUSD" type="number" style={inputStyle} value={honorariosAgenteAduanaUSD} onChange={handleInputChange(setHonorariosAgenteAduanaUSD)} placeholder="Ej: 600"/><p style={inputDescriptionStyle}>Honorarios del agente de aduana</p></div><div style={inputGroupStyle}><label htmlFor="gastosPortuariosOtrosUSD" style={labelStyle}>Gastos Portuarios/Otros (USD):</label><input id="gastosPortuariosOtrosUSD" type="number" style={inputStyle} value={gastosPortuariosOtrosUSD} onChange={handleInputChange(setGastosPortuariosOtrosUSD)} placeholder="Ej: 200" /><p style={inputDescriptionStyle}>Otros gastos portuarios en USD</p></div></div>
           {/* Card: Impuestos */}
          <div style={gridCardStyle}> <h3 style={gridCardTitleStyle}>Impuestos</h3> <div style={inputGroupStyle}><label htmlFor="derechoAdValorem" style={labelStyle}>Derecho Ad Valorem (%):</label><input id="derechoAdValorem" type="number" step="0.1" style={inputStyle} value={derechoAdValorem} onChange={handleInputChange(setDerechoAdValorem)} placeholder="Ej: 6"/><p style={inputDescriptionStyle}>Impuesto aduanero (0 si aplica TLC)</p></div><div style={inputGroupStyle}><label htmlFor="iva" style={labelStyle}>IVA (%):</label><input id="iva" type="number" step="0.1" style={inputStyle} value={iva} onChange={handleInputChange(setIva)} placeholder="Ej: 19"/><p style={inputDescriptionStyle}>Impuesto al Valor Agregado</p></div></div>
        </div>
      )}

      {/* Botón Guardar Todo (sticky o al final) */}
      <div style={{ marginTop: '24px', textAlign: 'right' }}>
        {saveGlobalParamsError && <span style={{ color: 'red', marginRight: '12px', fontSize: '13px' }}>Error: {saveGlobalParamsError}</span>}
        {saveGlobalParamsSuccess && <span style={{ color: 'green', marginRight: '12px', fontSize: '13px' }}>{saveGlobalParamsSuccess}</span>}
        <button
          onClick={handleSaveAll}
          style={primaryButtonStyle}
          disabled={isSavingGlobalParams}
        >
          {isSavingGlobalParams ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Guardar Cambios
        </button>
      </div>

    </div> // Fin panelContainerStyle
  );
} 