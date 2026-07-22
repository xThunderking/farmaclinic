import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Copy,
  Eye,
  FileText,
  FileWarning,
  Layers,
  ListChecks,
  Microscope,
  Pill,
  Plus,
  ShieldAlert,
  Trash2,
  X,
} from 'lucide-react';

export function createPatientTabComponents(deps) {
  const {
    PRESENTACIONES,
    VIAS,
    CATEGORIAS_FARMACO,
    IDONEIDAD_OPCIONES,
    CATEGORIAS_PRM,
    MAR_RECOMENDACIONES,
    TIPOS_PACIENTE,
    ESPECIALIDADES,
    COMORBILIDADES_PREDEFINIDAS,
    LAB_TEMPLATES,
    PREGUNTAS_ENTREVISTA,
    formatExcelDate,
    calculateAge,
    calculateIMC,
    calculateSC,
    calculateIdealWeight,
    calculateAdjustedWeight,
    calculateDaysOfUse,
    calculateCrCl,
    getTfgColorClass,
  } = deps;

  const TABLE_FIELD_SELECTOR = 'input:not([type="hidden"]):not([disabled]):not([readonly]), select:not([disabled]):not([readonly]), textarea:not([disabled]):not([readonly])';

  const isFocusableTableField = (element) => {
    if (!element || typeof element.matches !== 'function') return false;
    return element.matches(TABLE_FIELD_SELECTOR);
  };

  const shouldHandleHorizontalArrow = (element, key) => {
    const isInput = typeof HTMLInputElement !== 'undefined' && element instanceof HTMLInputElement;
    const isTextArea = typeof HTMLTextAreaElement !== 'undefined' && element instanceof HTMLTextAreaElement;
    if (!isInput && !isTextArea) return true;

    const hasCaret = Number.isInteger(element.selectionStart) && Number.isInteger(element.selectionEnd);
    if (!hasCaret) return true;

    const start = element.selectionStart;
    const end = element.selectionEnd;
    const hasSelection = start !== end;

    if (hasSelection) return false;
    if (key === 'ArrowLeft') return start === 0;
    if (key === 'ArrowRight') return end === String(element.value || '').length;
    return true;
  };

  const findFocusableInRow = (row, preferredColIndex) => {
    if (!row) return null;
    const cells = Array.from(row.children || []).filter((cell) => cell.matches?.('td,th'));
    if (cells.length === 0) return null;

    const preferred = cells[preferredColIndex]?.querySelector(TABLE_FIELD_SELECTOR);
    if (preferred) return preferred;

    for (let offset = 1; offset < cells.length; offset += 1) {
      const right = cells[preferredColIndex + offset]?.querySelector(TABLE_FIELD_SELECTOR);
      if (right) return right;

      const left = cells[preferredColIndex - offset]?.querySelector(TABLE_FIELD_SELECTOR);
      if (left) return left;
    }

    return null;
  };

  const moveFocusWithArrows = (currentElement, key) => {
    const currentCell = currentElement.closest('td,th');
    const currentRow = currentCell?.closest('tr');
    const table = currentCell?.closest('table');
    if (!currentCell || !currentRow || !table) return null;

    const rows = Array.from(table.querySelectorAll('tbody tr')).filter((row) => row.querySelector(TABLE_FIELD_SELECTOR));
    const rowIndex = rows.indexOf(currentRow);
    if (rowIndex < 0) return null;

    const cells = Array.from(currentRow.children || []).filter((cell) => cell.matches?.('td,th'));
    const colIndex = cells.indexOf(currentCell);
    if (colIndex < 0) return null;

    if (key === 'ArrowLeft' || key === 'ArrowRight') {
      const step = key === 'ArrowRight' ? 1 : -1;
      for (let col = colIndex + step; col >= 0 && col < cells.length; col += step) {
        const candidate = cells[col].querySelector(TABLE_FIELD_SELECTOR);
        if (candidate) return candidate;
      }
      return null;
    }

    if (key === 'ArrowUp' || key === 'ArrowDown') {
      const step = key === 'ArrowDown' ? 1 : -1;
      for (let row = rowIndex + step; row >= 0 && row < rows.length; row += step) {
        const candidate = findFocusableInRow(rows[row], colIndex);
        if (candidate) return candidate;
      }
    }

    return null;
  };

  const handleTableArrowNavigation = (event) => {
    const { key } = event;
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) return;

    const target = event.target;
    if (!isFocusableTableField(target)) return;

    if ((key === 'ArrowLeft' || key === 'ArrowRight') && !shouldHandleHorizontalArrow(target, key)) {
      return;
    }

    const nextField = moveFocusWithArrows(target, key);
    if (!nextField) return;

    event.preventDefault();
    nextField.focus();
  };

  const sanitizeFrequencyNumber = (value = '') => String(value ?? '').replace(/[^\d]/g, '');

  const parseFrequency = (rawValue = '') => {
    const raw = String(rawValue ?? '').trim();
    if (!raw) return { value: '', unit: 'hrs' };

    const value = sanitizeFrequencyNumber(raw);
    const lower = raw.toLowerCase();
    const unit = lower.includes('min') ? 'min' : 'hrs';

    return { value, unit };
  };

  const buildFrequencyValue = (value = '', unit = 'hrs') => {
    const numericValue = sanitizeFrequencyNumber(value);
    if (!numericValue) return '';
    return `${numericValue} ${unit === 'min' ? 'min' : 'hrs'}`;
  };

// ==========================================
// VISTAS DEL PACIENTE (Pestañas)
// ==========================================

function DemographicsTab({ patient, updatePatient, allPatients = [] }) {
  const d = patient.demographics;
  const normalizePatientName = (value = '') => String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
  const { years: edad, group: grupoEtario } = calculateAge(d.fechaNacimiento);
  const imc = calculateIMC(d.peso, d.altura);
  const sc = calculateSC(d.peso, d.altura);
  const pesoIdeal = calculateIdealWeight(d.altura, d.genero);
  const pesoAjustado = calculateAdjustedWeight(d.peso, pesoIdeal);
  const [comorbiditySelection, setComorbiditySelection] = useState('');
  const [otherComorbidity, setOtherComorbidity] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    const nextDemographics = { ...d, [name]: value };

    if (name === 'genero' && value !== 'Femenino') {
      nextDemographics.embarazada = '';
      nextDemographics.semanasGestacion = '';
    }

    if (name === 'embarazada' && value !== 'Sí') {
      nextDemographics.semanasGestacion = '';
    }

    updatePatient({ demographics: nextDemographics });
  };

  const comorbidityItems = useMemo(
    () =>
      (d.comorbilidades || '')
        .split(/[;,|\n]+/)
        .map((item) => item.trim())
        .filter(Boolean),
    [d.comorbilidades]
  );

  const persistComorbidities = (items) => {
    updatePatient({ demographics: { ...d, comorbilidadesTipo: '', comorbilidades: items.join('; ') } });
  };

  const addComorbidity = (rawValue) => {
    const value = (rawValue || '').trim();
    if (!value) return;

    if (value.toLowerCase() === 'sin comorbilidades') {
      persistComorbidities(['Sin comorbilidades']);
      return;
    }

    const next = comorbidityItems.filter((item) => item.toLowerCase() !== 'sin comorbilidades');
    const alreadyExists = next.some((item) => item.toLowerCase() === value.toLowerCase());
    if (alreadyExists) return;

    persistComorbidities([...next, value]);
  };

  const handleAddComorbidity = () => {
    if (!comorbiditySelection) return;

    if (comorbiditySelection === 'OTRO') {
      addComorbidity(otherComorbidity);
      setOtherComorbidity('');
      return;
    }

    addComorbidity(comorbiditySelection);
    setComorbiditySelection('');
  };

  const removeComorbidityAt = (indexToRemove) => {
    persistComorbidities(comorbidityItems.filter((_, index) => index !== indexToRemove));
  };

  // DETECCIÓN DE DUPLICADOS EN TIEMPO REAL (Solo por Nombre y Fecha de Nacimiento)
  const possibleDuplicates = allPatients.filter(p => {
    if (p.id === patient.id || p.deleted) return false;
    
    const myBase = patient.pacienteBaseId || patient.id;
    const theirBase = p.pacienteBaseId || p.id;
    if (myBase === theirBase) return false;

    const incomingName = normalizePatientName(d.nombre);
    const existingName = normalizePatientName(p.demographics.nombre);
    const hasName = incomingName.length > 3 && existingName.length > 3;
    const sameName = hasName && existingName === incomingName;
    
    const hasDob = p.demographics.fechaNacimiento && d.fechaNacimiento;
    const sameDob = hasDob && p.demographics.fechaNacimiento === d.fechaNacimiento;
    
    return sameName && sameDob;
  });

  const vincularComoReingreso = (dup) => {
    const baseId = dup.pacienteBaseId || dup.id;
    updatePatient({
      pacienteBaseId: baseId,
      demographics: {
        ...d,
        nombre: dup.demographics.nombre,
        fechaNacimiento: dup.demographics.fechaNacimiento,
        genero: dup.demographics.genero,
        peso: dup.demographics.peso,
        altura: dup.demographics.altura,
        alergias: dup.demographics.alergias,
        intolerancias: dup.demographics.intolerancias,
        embarazada: dup.demographics.embarazada,
        semanasGestacion: dup.demographics.semanasGestacion,
        toxicomania: dup.demographics.toxicomania,
        alcoholismo: dup.demographics.alcoholismo,
        detallesAdicciones: dup.demographics.detallesAdicciones,
        fuma: dup.demographics.fuma,
        tipoPaciente: dup.demographics.tipoPaciente
      }
    });
  };

  let imcColorClass = 'bg-slate-100 text-slate-800 border-slate-200';
  let imcLabel = '';
  if (imc) {
    if (imc < 18.5) { imcColorClass = 'bg-blue-100 text-blue-800 border-blue-300 font-bold'; imcLabel = '(Bajo Peso)'; }
    else if (imc >= 18.5 && imc <= 24.9) { imcColorClass = 'bg-green-100 text-green-800 border-green-300 font-bold'; imcLabel = '(Normal)'; }
    else if (imc >= 25 && imc <= 29.9) { imcColorClass = 'bg-orange-100 text-orange-800 border-orange-300 font-bold'; imcLabel = '(Sobrepeso)'; }
    else if (imc >= 30) { imcColorClass = 'bg-red-100 text-red-800 border-red-300 font-bold'; imcLabel = '(Obesidad)'; }
  }

  return (
    <div className="space-y-6">
      {/* ALERTA DE DUPLICIDAD */}
      {possibleDuplicates.length > 0 && !patient.pacienteBaseId && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6 rounded-r-md flex flex-col md:flex-row justify-between items-start md:items-center shadow-sm print:hidden">
           <div>
             <h4 className="font-bold text-amber-800 flex items-center"><AlertTriangle className="w-5 h-5 mr-2" /> Posible paciente duplicado detectado</h4>
             <p className="text-sm text-amber-700 mt-1">Se encontró un registro existente para <strong>{possibleDuplicates[0].demographics.nombre}</strong> (Ingreso: {formatExcelDate(possibleDuplicates[0].demographics.ingreso).split(' ')[0]}).</p>
           </div>
           <button onClick={() => vincularComoReingreso(possibleDuplicates[0])} className="mt-3 md:mt-0 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded text-sm font-bold shadow transition flex items-center">
              <Layers className="w-4 h-4 mr-2" /> Vincular como Reingreso
           </button>
        </div>
      )}

      <section className="fc-panel print:bg-transparent print:border-none print:p-0 print:shadow-none">
        <h3 className="text-lg font-bold mb-4 border-b pb-1 text-blue-800 print:text-black">1. Identificación y Ubicación</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="flex flex-col">
            <label className="fc-label truncate">Identificador Interno (FV)</label>
            <input type="text" name="identificadorInterno" value={d.identificadorInterno || ''} onChange={handleChange} className="fc-input font-mono" title="ID interno editable" />
          </div>
          <FormInput label="No. de Paciente (Expediente)" name="numeroPaciente" value={d.numeroPaciente} onChange={handleChange} />
          <FormInput label="No. de Episodio" name="numeroEpisodio" value={d.numeroEpisodio} onChange={handleChange} />
          <FormInput label="Habitación" name="habitacion" value={d.habitacion} onChange={handleChange} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="col-span-2"><FormInput label="Nombre Completo" name="nombre" value={d.nombre} onChange={handleChange} /></div>
          <div className="col-span-1"><FormInput label="Médico Tratante" name="medico" value={d.medico} onChange={handleChange} /></div>
          <FormInput label="Fecha de Nacimiento" type="date" name="fechaNacimiento" value={d.fechaNacimiento} onChange={handleChange} />
        </div>
      </section>

      <section className="fc-panel print:bg-transparent print:border-none print:p-0 print:shadow-none">
        <h3 className="text-lg font-bold mb-4 border-b pb-1 text-blue-800 print:text-black">2. Clínica y Hospitalización</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <FormSelect label="Género" name="genero" value={d.genero} onChange={handleChange} options={["Masculino", "Femenino"]} />
          <FormInput label="Fecha de Ingreso (con hora)" type="datetime-local" name="ingreso" value={d.ingreso} onChange={handleChange} />
          <FormInput label="Fecha de Egreso (con hora)" type="datetime-local" name="egreso" value={d.egreso} onChange={handleChange} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <FormSelect label="Tipo de paciente" name="tipoPaciente" value={d.tipoPaciente} onChange={handleChange} options={TIPOS_PACIENTE} />
          <FormSelect label="Especialidad" name="especialidad" value={d.especialidad} onChange={handleChange} options={ESPECIALIDADES} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <FormInput label="Motivo de Ingreso / Procedimiento" name="motivoIngreso" value={d.motivoIngreso} onChange={handleChange} />
          <FormInput label="Diagnóstico Principal" name="diagnosticoPrincipal" value={d.diagnosticoPrincipal} onChange={handleChange} />
        </div>
        {d.genero === 'Femenino' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <FormSelect label="¿Paciente embarazada?" name="embarazada" value={d.embarazada} onChange={handleChange} options={["Sí", "No"]} />
            {d.embarazada === 'Sí' ? (
              <FormInput label="Semanas de gestación" type="number" name="semanasGestacion" value={d.semanasGestacion} onChange={handleChange} placeholder="Ej. 24" />
            ) : (
              <div />
            )}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="flex flex-col"><label className="fc-label">Antecedentes Médicos</label><textarea name="antecedentes" value={d.antecedentes || ''} onChange={handleChange} rows={2} className="fc-textarea"></textarea></div>
          <div className="flex flex-col">
            <label className="fc-label">Comorbilidades Actuales</label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <select value={comorbiditySelection} onChange={(e) => setComorbiditySelection(e.target.value)} className="fc-input">
                  <option value="">Sel...</option>
                  {COMORBILIDADES_PREDEFINIDAS.map((item) => <option key={item} value={item}>{item}</option>)}
                  <option value="OTRO">OTRO</option>
                </select>
                <button
                  type="button"
                  onClick={handleAddComorbidity}
                  className="px-3 py-2 text-sm font-medium rounded-md border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                >
                  Agregar
                </button>
              </div>

              {comorbiditySelection === 'OTRO' && (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={otherComorbidity}
                    onChange={(e) => setOtherComorbidity(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddComorbidity();
                      }
                    }}
                    placeholder="Especificar comorbilidad..."
                    className="fc-input"
                  />
                  <button
                    type="button"
                    onClick={handleAddComorbidity}
                    className="px-3 py-2 text-sm font-medium rounded-md border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                  >
                    Agregar
                  </button>
                </div>
              )}

              {comorbidityItems.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {comorbidityItems.map((item, index) => (
                    <span key={`${item}-${index}`} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-xs border border-slate-200">
                      {item}
                      <button
                        type="button"
                        onClick={() => removeComorbidityAt(index)}
                        className="text-slate-500 hover:text-red-600 transition-colors"
                        title="Eliminar comorbilidad"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">Sin comorbilidades registradas.</p>
              )}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <FormInput label="Alergias" name="alergias" value={d.alergias} onChange={handleChange} />
          <FormInput label="Intolerancias" name="intolerancias" value={d.intolerancias} onChange={handleChange} />
        </div>
        <div className="flex flex-col mb-4">
          <label className="fc-label">Observaciones Generales Clínicas</label>
          <textarea name="observacionesGenerales" value={d.observacionesGenerales || ''} onChange={handleChange} rows={3} className="fc-textarea" placeholder="Cualquier otra observación relevante sobre el paciente..."></textarea>
        </div>
      </section>

      <section className="fc-panel print:bg-transparent print:border-none print:p-0 print:shadow-none">
         <h3 className="text-lg font-bold mb-4 border-b pb-1 text-blue-800 print:text-black">3. Hábitos y Estilo de Vida</h3>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <FormSelect label="¿Tabaquismo?" name="fuma" value={d.fuma} onChange={handleChange} options={["Sí", "No"]} />
            <FormSelect label="¿Alcoholismo Crónico?" name="alcoholismo" value={d.alcoholismo} onChange={handleChange} options={["Sí", "No"]} />
            <FormSelect label="¿Toxicomanías?" name="toxicomania" value={d.toxicomania} onChange={handleChange} options={["Sí", "No"]} />
         </div>
         {(d.alcoholismo === 'Sí' || d.toxicomania === 'Sí' || d.fuma === 'Sí') && (
            <div className="flex flex-col mb-4">
              <label className="fc-label">Detallar consumo (Frecuencia, cantidad, etc.)</label>
              <textarea name="detallesAdicciones" value={d.detallesAdicciones || ''} onChange={handleChange} rows={2} className="fc-textarea bg-amber-50"></textarea>
            </div>
         )}
      </section>

      <section className="fc-panel print:bg-transparent print:border-none print:p-0 print:shadow-none">
        <h3 className="text-lg font-bold mb-4 border-b pb-1 text-blue-800 print:text-black">4. Antropometría Farmacocinética</h3>
        <div className="grid grid-cols-2 md:grid-cols-7 gap-4 items-end">
          <div className="flex flex-col justify-end">
            <span className="text-sm font-semibold text-slate-600 mb-1">Edad</span>
            <div className="bg-slate-100 p-2 rounded-md border border-slate-200 h-[38px] flex items-center text-sm px-2 truncate">
              {edad !== '' ? `${edad} a. (${grupoEtario})` : '-'}
            </div>
          </div>
          <FormInput label="Peso Real (kg)" type="number" name="peso" value={d.peso} onChange={handleChange} />
          <FormInput label="Altura (cm)" type="number" name="altura" value={d.altura} onChange={handleChange} />
          <div className="flex flex-col justify-end">
            <span className="text-sm font-semibold text-slate-600 mb-1 truncate" title="IMC">IMC {imcLabel}</span>
            <div className={`p-2 rounded-md border h-[38px] flex items-center justify-center font-mono text-sm ${imcColorClass}`}>{imc || '-'}</div>
          </div>
          <ReadOnlyField label="Sup. Corp (m²)" value={sc} />
          <ReadOnlyField label="Peso Ideal (kg)" value={pesoIdeal} />
          <ReadOnlyField label="Peso Ajust." value={pesoAjustado} />
        </div>
        
        {/* NUEVA ADVERTENCIA DE CÁLCULOS */}
        <div className="mt-4 bg-blue-50 border border-blue-200 p-3 rounded-md text-xs text-blue-800 flex items-start">
           <AlertTriangle className="w-4 h-4 mr-2 shrink-0 mt-0.5" />
           <p><strong>Nota Clínica:</strong> Los cálculos de Edad, IMC, Superficie Corporal, Peso Ideal, Peso Ajustado y Tasa de Filtrado Glomerular son estimaciones matemáticas orientativas generadas automáticamente y <strong>no sustituyen el juicio clínico del profesional</strong> de la salud.</p>
        </div>
      </section>
    </div>
  );
}

function ConciliationTab({ patient, updatePatient }) {
  const i = patient.interview || {};
  const conc = patient.conciliacion || {
    ingresoNA: false,
    egresoNA: false,
    ingresoNAMotivo: '',
    egresoNAMotivo: '',
    ingreso: [],
    egreso: [],
    transicionesArea: [],
    transicionMedico: false,
    transicionAreaNA: false,
    transicionMedicoNA: false,
  };
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [transicionAreaValidationError, setTransicionAreaValidationError] = useState('');
  const [pendingSendToPharmaItem, setPendingSendToPharmaItem] = useState(null);

  const handleAnswer = (qId, value) => updatePatient({ interview: { ...i, [qId]: value } });
  
  const addItem = (type) => {
    const newItem = {
      id: Date.now().toString(),
      principio: '',
      marcaComercial: '',
      dosis: '',
      frecuencia: '',
      via: '',
      desdeCuando: '',
      ultimaTomaMedicamento: '',
      activo: 'Continua',
      diasTratamiento: '',
      sabeParaQue: 'No',
      observacion: ''
    };
    updatePatient({ conciliacion: { ...conc, [type]: [...(conc[type] || []), newItem] } });
  };
  const updateItem = (type, id, field, value) => {
    const list = conc[type] || [];
    updatePatient({ conciliacion: { ...conc, [type]: list.map(item => item.id === id ? { ...item, [field]: value } : item) } });
  };
  const removeItem = (type, id) => updatePatient({ conciliacion: { ...conc, [type]: (conc[type] || []).filter(item => item.id !== id) } });

  const confirmSendIngresoItemToPharmacotherapy = (item) => {
    if (!item) return;

    const noteParts = [
      item.observacion ? `Obs. conciliación: ${item.observacion}` : '',
      item.desdeCuando ? `Desde cuándo: ${item.desdeCuando}` : '',
      item.ultimaTomaMedicamento ? `Última toma: ${item.ultimaTomaMedicamento}` : '',
      item.activo ? `Estado conciliación: ${item.activo}` : '',
    ].filter(Boolean);

    const newPharmaItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      categoria: '',
      principio: item.principio || '',
      marcaComercial: item.marcaComercial || '',
      presentacion: '',
      dosis: item.dosis || '',
      via: item.via || '',
      frecuencia: item.frecuencia || '',
      volumen: '',
      tiempo: '',
      velocidad: '',
      fechaInicio: new Date().toISOString().split('T')[0],
      estado: 'Activo',
      idoneidad: 'Pendiente',
      fechaSuspension: '',
      horaPrimeraDosis: '',
      seguimientoUsarCantidadDosis: false,
      seguimientoDosisCantidad: '',
      seguimientoBaseDate: '',
      observaciones: noteParts.join(' | '),
      prn: false,
      prnSituacion: '',
      quirofano: false,
    };

    updatePatient({ perfilFarmaco: [...(patient.perfilFarmaco || []), newPharmaItem] });
    setPendingSendToPharmaItem(null);
  };

  const requestSendIngresoItemToPharmacotherapy = (item) => {
    if (!item) return;
    setPendingSendToPharmaItem(item);
  };

  const toggleNA = (field) => {
    const nextValue = !conc[field];
    if (field === 'transicionAreaNA') {
      setTransicionAreaValidationError('');
      updatePatient({ conciliacion: { ...conc, [field]: nextValue } });
      return;
    }
    updatePatient({ conciliacion: { ...conc, [field]: nextValue } });
  };

  const addTransicionArea = () => {
    const nuevaTransicion = { id: Date.now().toString(), fecha: new Date().toISOString().split('T')[0], origen: '', destino: '', validado: false };
    setTransicionAreaValidationError('');
    updatePatient({ conciliacion: { ...conc, transicionesArea: [...(conc.transicionesArea || []), nuevaTransicion] } });
  };
  const updateTransicionArea = (id, field, value) => {
    updatePatient({ conciliacion: { ...conc, transicionesArea: conc.transicionesArea.map(t => t.id === id ? { ...t, [field]: value, validado: false } : t) } });
  };
  const removeTransicionArea = (id) => {
    setTransicionAreaValidationError('');
    updatePatient({ conciliacion: { ...conc, transicionesArea: conc.transicionesArea.filter(t => t.id !== id) } });
  };

  const validateSingleTransicionArea = (id) => {
    if (conc.transicionAreaNA) {
      setTransicionAreaValidationError('No aplica está activado para cambio de área.');
      return;
    }

    const rows = conc.transicionesArea || [];
    const target = rows.find((row) => row.id === id);
    if (!target) {
      setTransicionAreaValidationError('No se encontró el cambio de área a validar.');
      return;
    }

    if (target.validado === true) {
      setTransicionAreaValidationError('');
      updatePatient({
        conciliacion: {
          ...conc,
          transicionesArea: rows.map((row) => (row.id === id ? { ...row, validado: false } : row)),
        },
      });
      return;
    }

    const hasFecha = String(target.fecha || '').trim().length > 0;
    const hasOrigen = String(target.origen || '').trim().length > 0;
    const hasDestino = String(target.destino || '').trim().length > 0;

    if (!hasFecha || !hasOrigen || !hasDestino) {
      const rowIndex = rows.findIndex((row) => row.id === id);
      setTransicionAreaValidationError(`Completa fecha, área de origen y área de destino en el cambio #${rowIndex + 1}.`);
      return;
    }

    setTransicionAreaValidationError('');
    updatePatient({
      conciliacion: {
        ...conc,
        transicionesArea: rows.map((row) => (row.id === id ? { ...row, validado: true } : row)),
      },
    });
  };

  const sections = [...new Set(PREGUNTAS_ENTREVISTA.map(q => q.section))];

  return (
    <div className="space-y-8">
      <section className="fc-panel print:hidden">
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center border-b pb-2 mb-2">
          <h2 className="text-2xl font-bold text-slate-800">1. Entrevista de conciliación</h2>
          <button onClick={() => setShowInterviewModal(true)} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded text-sm flex items-center justify-center font-medium">
            <FileText className="w-4 h-4 mr-1" /> Abrir entrevista
          </button>
        </div>
        <p className="text-sm text-slate-600">Completa la entrevista en una ventana emergente para mantener la vista de conciliación más limpia.</p>
      </section>

      {showInterviewModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 p-4 flex items-center justify-center print:hidden" onClick={() => setShowInterviewModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="bg-indigo-600 text-white px-4 py-3 flex items-center justify-between">
              <h3 className="font-bold text-base sm:text-lg">Entrevista de conciliación</h3>
              <button onClick={() => setShowInterviewModal(false)} className="text-indigo-100 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
              {sections.map(sec => (
                <div key={sec} className="mb-4">
                  <h3 className="text-sm font-bold uppercase text-slate-500 mb-2">{sec}</h3>
                  <div className="space-y-2">
                    {PREGUNTAS_ENTREVISTA.filter(q => q.section === sec).map(q => (
                      <div key={q.id} className="flex flex-col md:flex-row md:items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-3 shadow-sm">
                        <span className="text-slate-700 text-sm font-medium md:w-1/2 mb-2 md:mb-0">{q.text}</span>
                        <input type="text" className="fc-input flex-1 md:ml-4" placeholder="Respuesta detallada..." value={i[q.id] || ''} onChange={(e) => handleAnswer(q.id, e.target.value)} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-200 px-4 py-3 flex justify-end bg-slate-50">
              <button onClick={() => setShowInterviewModal(false)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-sm font-medium">
                Guardar y cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingSendToPharmaItem && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 p-4 flex items-center justify-center print:hidden" onClick={() => setPendingSendToPharmaItem(null)}>
          <div className="w-full max-w-md rounded-xl border border-blue-200 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-blue-100 bg-blue-50 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white border border-blue-200 text-blue-700 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Enviar a Perfil Farmacoterapéutico</h3>
                <p className="text-xs text-slate-600">Se duplicará el medicamento en el perfil farmacoterapéutico.</p>
              </div>
            </div>
            <div className="px-5 py-4 space-y-2">
              <p className="text-sm text-slate-700 leading-relaxed">
                ¿Deseas enviar <span className="font-semibold text-slate-900">"{pendingSendToPharmaItem.principio || 'este medicamento'}"</span> al Perfil Farmacoterapéutico?
              </p>
            </div>
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button onClick={() => setPendingSendToPharmaItem(null)} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-100 font-medium">Cancelar</button>
              <button onClick={() => confirmSendIngresoItemToPharmacotherapy(pendingSendToPharmaItem)} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium">Sí, enviar</button>
            </div>
          </div>
        </div>
      )}

      <section className="fc-panel print:bg-transparent print:border-none print:p-0 print:shadow-none">
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center border-b pb-2 mb-2">
          <h2 className="text-2xl font-bold text-slate-800">2. Conciliación al Ingreso</h2>
          {!conc.ingresoNA && (
            <button onClick={() => addItem('ingreso')} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm flex items-center justify-center font-medium print:hidden"><Plus className="w-4 h-4 mr-1" /> Añadir Fármaco</button>
          )}
        </div>
        <label className="flex items-center space-x-2 text-sm text-slate-600 mb-4 cursor-pointer w-max print:mb-2">
           <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" checked={conc.ingresoNA || false} onChange={() => toggleNA('ingresoNA')} />
           <span className="font-medium">No aplica / No se realizó (Paciente no tomaba medicamentos previos)</span>
        </label>

        {conc.ingresoNA && (
          <div className="mb-4">
            <label className="fc-label">Motivo de No aplica (Ingreso)</label>
            <textarea
              rows={2}
              className="fc-textarea"
              placeholder="Describe por qué no aplica la conciliación al ingreso..."
              value={conc.ingresoNAMotivo || ''}
              onChange={(e) => updatePatient({ conciliacion: { ...conc, ingresoNAMotivo: e.target.value } })}
            />
          </div>
        )}
        
        {conc.ingresoNA ? (
          <div className="p-4 bg-slate-100 text-slate-500 rounded border border-slate-200 italic print:bg-transparent">Conciliación al ingreso marcada como No Aplica.</div>
        ) : (
          <ConciliationTable items={conc.ingreso || []} type="ingreso" onUpdate={updateItem} onRemove={removeItem} onSendToPharma={requestSendIngresoItemToPharmacotherapy} enableKeyboardNavigation />
        )}
      </section>

      <section className="fc-panel bg-slate-50 print:bg-transparent print:border-none print:p-0 print:shadow-none">
        <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center print:border-b print:pb-2 print:mb-2"><CheckCircle className="w-5 h-5 mr-2 text-blue-600 print:text-black" /> 3. Conciliación de Transición (Checklist)</h2>
        <div className="flex flex-col space-y-4">
          
          <div className="bg-white p-4 rounded-lg border border-slate-200 print:border-b print:rounded-none">
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-3 border-b pb-2 print:border-none">
              <span className="font-medium text-slate-700">Se realizó conciliación por Cambio de Área</span>
              <button onClick={addTransicionArea} className="w-full sm:w-auto text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1.5 rounded font-bold transition flex items-center justify-center print:hidden" disabled={conc.transicionAreaNA}>
                <Plus className="w-3 h-3 mr-1" /> Registrar Cambio
              </button>
            </div>

            {transicionAreaValidationError && (
              <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {transicionAreaValidationError}
              </div>
            )}
            
            <label className="flex items-center space-x-2 text-sm text-slate-600 mb-4 cursor-pointer w-max print:mb-2">
               <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" checked={conc.transicionAreaNA || false} onChange={() => toggleNA('transicionAreaNA')} />
               <span className="font-medium">No aplica / No se realizó (No hubo cambios de área)</span>
            </label>

            {!conc.transicionAreaNA && (!conc.transicionesArea || conc.transicionesArea.length === 0) && (
              <p className="text-sm text-slate-400 italic">No hay cambios de área registrados.</p>
            )}
            {!conc.transicionAreaNA && conc.transicionesArea && conc.transicionesArea.length > 0 && (
              <div className="space-y-3">
                {conc.transicionesArea.map((t, index) => (
                  <div key={t.id} className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4 items-end bg-slate-50 p-3 rounded border border-slate-200 relative print:bg-transparent print:p-1">
                    <span className="absolute top-2 left-2 text-xs font-bold text-slate-400">#{index + 1}</span>
                    <div className="flex-1 w-full pl-6 md:pl-0"><FormInput label="Fecha del Cambio" type="date" value={t.fecha} onChange={(e) => updateTransicionArea(t.id, 'fecha', e.target.value)} /></div>
                    <div className="flex-1 w-full"><FormInput label="Área de Origen" value={t.origen} onChange={(e) => updateTransicionArea(t.id, 'origen', e.target.value)} placeholder="Ej. Urgencias" /></div>
                    <div className="flex-1 w-full"><FormInput label="Área de Destino" value={t.destino} onChange={(e) => updateTransicionArea(t.id, 'destino', e.target.value)} placeholder="Ej. Piso 3" /></div>
                    <div className="flex items-center gap-1 print:hidden">
                      <button onClick={() => validateSingleTransicionArea(t.id)} className="p-2 mb-1 text-emerald-600 hover:bg-emerald-100 rounded transition" title={t.validado ? 'Quitar validación' : 'Validar cambio'}>
                        <CheckCircle className="w-5 h-5"/>
                      </button>
                      <button onClick={() => removeTransicionArea(t.id)} className="p-2 mb-1 text-red-500 hover:bg-red-100 rounded transition" title="Eliminar cambio"><Trash2 className="w-5 h-5"/></button>
                    </div>
                    {t.validado === true && (
                      <span className="absolute -top-2 right-2 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        Validado
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-200 print:border-b print:rounded-none">
            <label className="flex items-center space-x-3 cursor-pointer mb-2">
              <input type="checkbox" className="w-5 h-5 text-blue-600 rounded" checked={conc.transicionMedico || false} onChange={(e) => updatePatient({ conciliacion: { ...conc, transicionMedico: e.target.checked } })} disabled={conc.transicionMedicoNA} />
              <span className={`font-medium ${conc.transicionMedicoNA ? 'text-slate-400' : 'text-slate-700'}`}>Se realizó conciliación por Cambio de Médico Tratante</span>
            </label>
            <label className="flex items-center space-x-2 text-sm text-slate-600 cursor-pointer w-max">
               <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" checked={conc.transicionMedicoNA || false} onChange={() => {
                   // Si lo marco como NA, desmarco el de "Se realizó"
                   const newVal = !conc.transicionMedicoNA;
                   updatePatient({ conciliacion: { ...conc, transicionMedicoNA: newVal, transicionMedico: newVal ? false : conc.transicionMedico } });
               }} />
               <span className="font-medium">No aplica (No hubo cambio de médico tratante)</span>
            </label>
          </div>
        </div>
      </section>

      <section className="fc-panel print:bg-transparent print:border-none print:p-0 print:shadow-none">
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center border-b pb-2 mb-2">
          <h2 className="text-2xl font-bold text-slate-800">4. Conciliación al Egreso</h2>
          {!conc.egresoNA && (
            <button onClick={() => addItem('egreso')} className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-sm flex items-center justify-center font-medium print:hidden"><Plus className="w-4 h-4 mr-1" /> Añadir Fármaco</button>
          )}
        </div>
        <label className="flex items-center space-x-2 text-sm text-slate-600 mb-4 cursor-pointer w-max print:mb-2">
           <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" checked={conc.egresoNA || false} onChange={() => toggleNA('egresoNA')} />
           <span className="font-medium">No aplica / No se realizó (Egresado sin medicamentos u otro motivo)</span>
        </label>

        {conc.egresoNA && (
          <div className="mb-4">
            <label className="fc-label">Motivo de No aplica (Egreso)</label>
            <textarea
              rows={2}
              className="fc-textarea"
              placeholder="Describe por qué no aplica la conciliación al egreso..."
              value={conc.egresoNAMotivo || ''}
              onChange={(e) => updatePatient({ conciliacion: { ...conc, egresoNAMotivo: e.target.value } })}
            />
          </div>
        )}
        
        {conc.egresoNA ? (
          <div className="p-4 bg-slate-100 text-slate-500 rounded border border-slate-200 italic print:bg-transparent">Conciliación al egreso marcada como No Aplica.</div>
        ) : (
          <ConciliationTable items={conc.egreso || []} type="egreso" onUpdate={updateItem} onRemove={removeItem} enableKeyboardNavigation />
        )}
      </section>
    </div>
  );
}

function ConciliationTable({ items, type, onUpdate, onRemove, onSendToPharma, enableKeyboardNavigation = false }) {
  const isIngreso = type === 'ingreso';
  const emptyColSpan = isIngreso ? 10 : 8;

  return (
    <div className="overflow-x-auto overscroll-x-contain print:overflow-visible" onKeyDownCapture={enableKeyboardNavigation ? handleTableArrowNavigation : undefined}>
      <table className="min-w-[1120px] text-xs sm:text-sm border-collapse bg-white border border-slate-200 shadow-sm rounded-lg print:shadow-none print:border-slate-300">
        <thead className="bg-slate-50 border-b print:bg-slate-100">
          <tr>
            <th className="p-2 text-left font-semibold">Principio Activo</th>
            {isIngreso && <th className="p-2 text-left font-semibold w-24">Marca Com.</th>}
            <th className="p-2 text-left font-semibold w-24">Dosis</th>
            <th className="p-2 text-left font-semibold w-24">Frecuencia</th>
            <th className="p-2 text-left font-semibold w-20">Vía</th>
            {isIngreso && <th className="p-2 text-left font-semibold w-32">Desde Cuándo</th>}
            {isIngreso && <th className="p-2 text-left font-semibold w-36">Última toma medicamento</th>}
            {!isIngreso && <th className="p-2 text-left font-semibold w-28" title="Cuántos días lo tomará al egreso">Días Tratm.</th>}
            {!isIngreso && <th className="p-2 text-center font-semibold w-24" title="¿Sabe para qué se lo tomará?">¿Sabe uso?</th>}
            {isIngreso && <th className="p-2 text-left font-semibold w-28">Estado</th>}
            <th className="p-2 text-left font-semibold">Observaciones</th>
            <th className="p-2 text-center font-semibold w-10 print:hidden"></th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && <tr><td colSpan={emptyColSpan} className="p-4 text-center text-slate-500">No hay medicamentos registrados.</td></tr>}
          {items.map(item => (
            <tr key={item.id} className="border-b hover:bg-slate-50">
              <td className="p-1"><input type="text" className="w-full border-slate-300 rounded text-sm print:border-none print:bg-transparent" value={item.principio} onChange={(e) => onUpdate(type, item.id, 'principio', e.target.value)} /></td>
              
              {isIngreso && <td className="p-1"><input type="text" className="w-full border-slate-300 rounded text-sm print:border-none print:bg-transparent" placeholder="Opcional" value={item.marcaComercial || ''} onChange={(e) => onUpdate(type, item.id, 'marcaComercial', e.target.value)} /></td>}
              
              <td className="p-1"><input type="text" className="w-full border-slate-300 rounded text-sm print:border-none print:bg-transparent" value={item.dosis} onChange={(e) => onUpdate(type, item.id, 'dosis', e.target.value)} /></td>
              <td className="p-1"><input type="text" className="w-full border-slate-300 rounded text-sm print:border-none print:bg-transparent" value={item.frecuencia || ''} onChange={(e) => onUpdate(type, item.id, 'frecuencia', e.target.value)} /></td>
              <td className="p-1"><select className="w-full border-slate-300 rounded text-sm p-1 print:appearance-none print:border-none print:bg-transparent" value={item.via} onChange={(e) => onUpdate(type, item.id, 'via', e.target.value)}><option value="">-</option>{VIAS.map(v => <option key={v} value={v}>{v}</option>)}</select></td>
              
              {isIngreso && <td className="p-1"><input type="text" className="w-full border-slate-300 rounded text-sm print:border-none print:bg-transparent" placeholder="Ej. 2 meses" value={item.desdeCuando || ''} onChange={(e) => onUpdate(type, item.id, 'desdeCuando', e.target.value)} /></td>}
              {isIngreso && <td className="p-1"><input type="date" className="w-full border-slate-300 rounded text-sm p-1 print:border-none print:bg-transparent" value={item.ultimaTomaMedicamento || ''} onChange={(e) => onUpdate(type, item.id, 'ultimaTomaMedicamento', e.target.value)} /></td>}
              
              {!isIngreso && <td className="p-1"><input type="text" className="w-full border-slate-300 rounded text-sm print:border-none print:bg-transparent" placeholder="Ej. 7 días" value={item.diasTratamiento || ''} onChange={(e) => onUpdate(type, item.id, 'diasTratamiento', e.target.value)} /></td>}
              {!isIngreso && (
                <td className="p-1 text-center">
                  <select className="w-full border-slate-300 rounded text-sm p-1 print:appearance-none print:border-none print:bg-transparent" value={item.sabeParaQue || 'No'} onChange={(e) => onUpdate(type, item.id, 'sabeParaQue', e.target.value)}>
                    <option value="Sí">Sí</option><option value="No">No</option>
                  </select>
                </td>
              )}
              
              {isIngreso && (
                <td className="p-1">
                  <select className="w-full border-slate-300 rounded text-sm p-1 print:appearance-none print:border-none print:bg-transparent" value={item.activo} onChange={(e) => onUpdate(type, item.id, 'activo', e.target.value)}>
                    <option value="Continua">Continua</option><option value="Suspende">Suspende</option><option value="Modifica">Modifica</option>
                  </select>
                </td>
              )}
              <td className="p-1"><input type="text" className="w-full border-slate-300 rounded text-sm print:border-none print:bg-transparent" value={item.observacion} onChange={(e) => onUpdate(type, item.id, 'observacion', e.target.value)} /></td>
              <td className="p-1 text-center print:hidden">
                <div className="flex items-center justify-center gap-1">
                  {isIngreso && typeof onSendToPharma === 'function' && (
                    <button onClick={() => onSendToPharma(item)} className="text-blue-600 hover:text-blue-800 p-1" title="Enviar al perfil farmacoterapéutico">
                      <Layers className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => onRemove(type, item.id)} className="text-red-500 hover:text-red-700 p-1" title="Eliminar">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PharmacotherapyTab({ patient, sourcePatient, updatePatient, dilutionsTable }) {
  const items = patient.perfilFarmaco || [];
  const solItems = patient.solucionesIV || [];
  const conc = patient.conciliacion || {
    ingresoNA: false,
    egresoNA: false,
    ingresoNAMotivo: '',
    egresoNAMotivo: '',
    ingreso: [],
    egreso: [],
    transicionesArea: [],
    transicionMedico: false,
    transicionAreaNA: false,
    transicionMedicoNA: false,
  };
  const meta = patient.perfilFarmacoMeta || { evaluadoPrevioPrimeraDosis: false };
  const [detailModal, setDetailModal] = useState({ open: false, type: 'pharma', itemId: '' });
  const [deleteModal, setDeleteModal] = useState({ open: false, type: 'pharma', itemId: '', label: '' });
  const [reviewedMedications, setReviewedMedications] = useState({});
  const [showDilutionsModal, setShowDilutionsModal] = useState(false);
  const [dilutionSearch, setDilutionSearch] = useState('');
  const [medDilutionModal, setMedDilutionModal] = useState({ open: false, medicationName: '', rows: [] });
  const persistedPharmaById = useMemo(
    () => new Map((sourcePatient?.perfilFarmaco || []).map((item) => [item.id, item])),
    [sourcePatient?.perfilFarmaco],
  );
  const persistedSolById = useMemo(
    () => new Map((sourcePatient?.solucionesIV || []).map((item) => [item.id, item])),
    [sourcePatient?.solucionesIV],
  );
  const dilutionColumns = useMemo(() => {
    if (Array.isArray(dilutionsTable?.columns) && dilutionsTable.columns.length > 0) {
      return dilutionsTable.columns;
    }
    return [
      'MEDICAMENTO',
      'MARCA COMERCIAL',
      'PRESENTACION',
      'RECONSTITUCION',
      'INTRAMUSCULAR',
      'ADMINISTRACION',
      'SOLUCIONES COMPATIBLES',
      'TIEMPO DE INFUSION',
      'SEGURIDAD',
      'TIEMPO DE ESTABILIDAD',
    ];
  }, [dilutionsTable?.columns]);
  const dilutionRows = useMemo(() => (Array.isArray(dilutionsTable?.rows) ? dilutionsTable.rows : []), [dilutionsTable?.rows]);
  const filteredDilutionRows = useMemo(() => {
    const term = String(dilutionSearch || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
    if (!term) return dilutionRows;

    return dilutionRows.filter((row) => {
      const medValue = String(row?.MEDICAMENTO || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
      return medValue.includes(term);
    });
  }, [dilutionRows, dilutionSearch]);

  const normalizeMedicationName = useCallback((value = '') => String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim(), []);

  const buildMedicationLookupKeys = useCallback((value = '') => {
    const normalized = normalizeMedicationName(value);
    if (!normalized) return [];

    const withoutDose = normalized
      .replace(/\b\d+(?:[\.,]\d+)?\s*(?:mg|g|mcg|ug|ml|l|ui|iu|%)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const primary = withoutDose
      .split(/\s*[\/+,;|-]\s*/)
      .map((part) => part.trim())
      .filter((part) => part.length >= 1);

    const keys = [normalized, withoutDose, ...primary]
      .map((part) => part.trim())
      .filter((part) => part.length >= 1);

    return Array.from(new Set(keys));
  }, [normalizeMedicationName]);

  const tokenizeMedicationName = useCallback((value = '') => {
    const normalized = normalizeMedicationName(value);
    if (!normalized) return [];
    return normalized.split(' ').map((token) => token.trim()).filter(Boolean);
  }, [normalizeMedicationName]);

  const findDilutionRowsByMedication = useCallback((medicationName = '') => {
    const normalizedTarget = normalizeMedicationName(medicationName);
    const targetKeys = buildMedicationLookupKeys(medicationName);
    const targetTokens = tokenizeMedicationName(medicationName);
    if (!normalizedTarget || targetKeys.length === 0) return [];

    return dilutionRows.filter((row) => {
      const rowName = String(row?.MEDICAMENTO || '').trim();
      if (!rowName) return false;

      const normalizedRowName = normalizeMedicationName(rowName);
      const rowKeys = buildMedicationLookupKeys(rowName);
      const rowTokens = tokenizeMedicationName(rowName);
      if (rowKeys.length === 0) return false;

      const exactKeyMatch = rowKeys.some((rowKey) => targetKeys.includes(rowKey));
      if (exactKeyMatch) return true;

      const tokensContained = targetTokens.length > 0 && targetTokens.every((token) => rowTokens.includes(token));
      if (tokensContained) return true;

      // For very short names (e.g. "a"), also match when the first token in dilutions equals the target.
      if (normalizedTarget.length <= 2 && rowTokens.length > 0) {
        return rowTokens[0] === normalizedTarget;
      }

      return normalizedRowName === normalizedTarget;
    });
  }, [buildMedicationLookupKeys, dilutionRows, normalizeMedicationName, tokenizeMedicationName]);

  const openMedicationDilutionModal = useCallback((medicationName = '') => {
    const rows = findDilutionRowsByMedication(medicationName);
    setMedDilutionModal({
      open: true,
      medicationName: String(medicationName || '').trim(),
      rows,
    });
  }, [findDilutionRowsByMedication]);

  const PHARMA_MODAL_FIELDS = ['presentacion', 'via', 'volumen', 'tiempo', 'velocidad', 'idoneidad', 'fechaSuspension', 'observaciones', 'prn', 'prnSituacion', 'quirofano', 'horaPrimeraDosis', 'seguimientoUsarCantidadDosis', 'seguimientoDosisCantidad', 'seguimientoBaseDate'];
  const PHARMA_DEFAULTS = {
    presentacion: '',
    via: '',
    frecuencia: '',
    volumen: '',
    tiempo: '',
    velocidad: '',
    idoneidad: 'Pendiente',
    fechaSuspension: '',
    horaPrimeraDosis: '',
    seguimientoUsarCantidadDosis: false,
    seguimientoDosisCantidad: '',
    seguimientoBaseDate: '',
    observaciones: '',
    prn: false,
    prnSituacion: '',
    quirofano: false,
  };

  const SOL_MODAL_FIELDS = ['tiempo', 'velocidad', 'frecuencia', 'fechaSuspension'];
  const SOL_DEFAULTS = {
    tiempo: '',
    velocidad: '',
    frecuencia: '',
    fechaSuspension: '',
  };

  const normalizeFieldValue = (value) => {
    if (value === undefined || value === null) return '';
    return String(value).trim();
  };

  const hasModalOnlyChanges = (currentItem, persistedItem, fields, defaults = {}) => {
    if (!currentItem) return false;

    if (!persistedItem) {
      return fields.some((field) => normalizeFieldValue(currentItem[field]) !== normalizeFieldValue(defaults[field] ?? ''));
    }

    return fields.some((field) => normalizeFieldValue(currentItem[field]) !== normalizeFieldValue(persistedItem[field]));
  };

  const recalculateInfusionFields = (item, field) => {
    const updatedItem = { ...item };
    const v = parseFloat(updatedItem.volumen);
    const t = parseFloat(updatedItem.tiempo);
    const r = parseFloat(updatedItem.velocidad);
    const hasV = Number.isFinite(v) && v > 0;
    const hasT = Number.isFinite(t) && t > 0;
    const hasR = Number.isFinite(r) && r > 0;

    if (field === 'volumen') {
      if (hasV && hasT) updatedItem.velocidad = (v / t).toFixed(2);
      else if (hasV && hasR) updatedItem.tiempo = (v / r).toFixed(2);
      else if (!hasV) {
        updatedItem.tiempo = '';
        updatedItem.velocidad = '';
      }
    } else if (field === 'tiempo') {
      if (hasV && hasT) updatedItem.velocidad = (v / t).toFixed(2);
      else if (!hasT) updatedItem.velocidad = '';
    } else if (field === 'velocidad') {
      if (hasV && hasR) updatedItem.tiempo = (v / r).toFixed(2);
      else if (!hasR) updatedItem.tiempo = '';
    }

    return updatedItem;
  };

  const addItem = () => {
    const newItem = { id: Date.now().toString(), categoria: '', principio: '', marcaComercial: '', presentacion: '', dosis: '', via: '', frecuencia: '', volumen: '', tiempo: '', velocidad: '', fechaInicio: new Date().toISOString().split('T')[0], estado: 'Activo', idoneidad: 'Pendiente', fechaSuspension: '', horaPrimeraDosis: '', seguimientoUsarCantidadDosis: false, seguimientoDosisCantidad: '', seguimientoBaseDate: '', observaciones: '', prn: false, prnSituacion: '', quirofano: false };
    updatePatient({ perfilFarmaco: [...items, newItem] });
  };

  const updateItem = (id, field, value) => {
    const newList = items.map((item) => {
      if (item.id !== id) return item;

      if (field === 'frecuencia' || field === 'frecuenciaUnidad') {
        const currentFrequency = parseFrequency(item.frecuencia);
        const nextValue = field === 'frecuencia' ? sanitizeFrequencyNumber(value) : currentFrequency.value;
        const nextUnit = field === 'frecuenciaUnidad' ? (value === 'min' ? 'min' : 'hrs') : currentFrequency.unit;
        return {
          ...item,
          frecuencia: buildFrequencyValue(nextValue, nextUnit),
          ultimaDosisNotificadaAt: 0,
        };
      }

      if (field === 'seguimientoDosisCantidad') {
        return {
          ...item,
          seguimientoDosisCantidad: sanitizeFrequencyNumber(value),
          ultimaDosisNotificadaAt: 0,
        };
      }

      if (field === 'seguimientoUsarCantidadDosis') {
        const enabled = value === true;
        const todayLocal = new Date().toISOString().slice(0, 10);
        return {
          ...item,
          seguimientoUsarCantidadDosis: enabled,
          seguimientoDosisCantidad: enabled ? String(item.seguimientoDosisCantidad || '') : '',
          seguimientoBaseDate: enabled ? (item.seguimientoBaseDate || todayLocal) : '',
          ultimaDosisNotificadaAt: 0,
        };
      }

      let updatedItem = { ...item, [field]: value };
      if (field === 'horaPrimeraDosis') {
        const todayLocal = new Date().toISOString().slice(0, 10);
        updatedItem = {
          ...updatedItem,
          seguimientoBaseDate: value ? (item.seguimientoBaseDate || todayLocal) : item.seguimientoBaseDate,
          ultimaDosisNotificadaAt: 0,
        };
      }
      if (field === 'seguimientoBaseDate') {
        updatedItem = {
          ...updatedItem,
          ultimaDosisNotificadaAt: 0,
        };
      }
      if (field === 'volumen' || field === 'tiempo' || field === 'velocidad') {
        updatedItem = recalculateInfusionFields(updatedItem, field);
      }
      return updatedItem;
    });
    updatePatient({ perfilFarmaco: newList });
  };

  const updateItemStatus = (id, estado) => {
    const today = new Date().toISOString().split('T')[0];
    const newList = items.map((item) => {
      if (item.id !== id) return item;
      return {
        ...item,
        estado,
        fechaSuspension: estado === 'Suspendido' ? (item.fechaSuspension || today) : '',
      };
    });
    updatePatient({ perfilFarmaco: newList });
  };

  const removeItem = (id) => updatePatient({ perfilFarmaco: items.filter((item) => item.id !== id) });

  const duplicateMedication = (sourceItem) => {
    if (!sourceItem) return;
    const sourceIndex = items.findIndex((item) => item.id === sourceItem.id);
    if (sourceIndex < 0) return;

    const duplicatedItem = {
      ...sourceItem,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ultimaDosisNotificadaAt: 0,
    };

    const nextItems = [...items];
    nextItems.splice(sourceIndex + 1, 0, duplicatedItem);
    updatePatient({ perfilFarmaco: nextItems });
  };

  const toggleMedicationReviewed = (id) => {
    setReviewedMedications((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const addSolucion = () => {
    const newItem = { id: Date.now().toString(), solucion: '', volumen: '', tiempo: '', velocidad: '', frecuencia: '', fechaInicio: new Date().toISOString().split('T')[0], estado: 'Activo', fechaSuspension: '' };
    updatePatient({ solucionesIV: [...solItems, newItem] });
  };

  const updateSolucion = (id, field, value) => {
    const newList = solItems.map((item) => {
      if (item.id !== id) return item;
      let updatedItem = { ...item, [field]: value };
      if (field === 'volumen' || field === 'tiempo' || field === 'velocidad') {
        updatedItem = recalculateInfusionFields(updatedItem, field);
      }
      return updatedItem;
    });
    updatePatient({ solucionesIV: newList });
  };

  const updateSolucionStatus = (id, estado) => {
    const today = new Date().toISOString().split('T')[0];
    const newList = solItems.map((item) => {
      if (item.id !== id) return item;
      return {
        ...item,
        estado,
        fechaSuspension: estado === 'Suspendido' ? (item.fechaSuspension || today) : '',
      };
    });
    updatePatient({ solucionesIV: newList });
  };

  const removeSolucion = (id) => updatePatient({ solucionesIV: solItems.filter((item) => item.id !== id) });
  const updateMeta = (field, value) => updatePatient({ perfilFarmacoMeta: { ...meta, [field]: value } });

  const duplicatePharmaToEgreso = (itemId) => {
    const source = items.find((item) => item.id === itemId);
    if (!source) return;

    const noteParts = [
      source.presentacion ? `Presentación: ${source.presentacion}` : '',
      source.observaciones || '',
      source.prn === true && source.prnSituacion ? `PRN: ${source.prnSituacion}` : '',
      source.quirofano === true ? 'Marcado para Quirofano' : '',
    ].filter(Boolean);

    const newEgresoItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      principio: source.principio || '',
      marcaComercial: source.marcaComercial || '',
      dosis: source.dosis || '',
      frecuencia: source.frecuencia || '',
      via: source.via || '',
      desdeCuando: '',
      ultimaTomaMedicamento: '',
      activo: 'Continua',
      diasTratamiento: '',
      sabeParaQue: 'No',
      observacion: noteParts.join(' | '),
    };

    updatePatient({
      conciliacion: {
        ...conc,
        egresoNA: false,
        egreso: [...(conc.egreso || []), newEgresoItem],
      },
    });
  };

  const pendientes = items.filter((i) => !CATEGORIAS_FARMACO.includes(i.categoria));
  const atbs = items.filter((i) => i.categoria === 'Antibiótico');
  const altos = items.filter((i) => i.categoria === 'Alto Riesgo');
  const gens = items.filter((i) => i.categoria === 'General');
  const pharmaNavigationIds = useMemo(() => items.map((med) => med.id), [items]);

  const goToAdjacentPharmaModal = useCallback((direction) => {
    if (detailModal.type !== 'pharma' || !detailModal.itemId || pharmaNavigationIds.length < 2) return;
    const currentIndex = pharmaNavigationIds.indexOf(detailModal.itemId);
    if (currentIndex < 0) return;
    const nextIndex = (currentIndex + direction + pharmaNavigationIds.length) % pharmaNavigationIds.length;
    setDetailModal({ open: true, type: 'pharma', itemId: pharmaNavigationIds[nextIndex] });
  }, [detailModal.itemId, detailModal.type, pharmaNavigationIds]);

  const handlePrevPharmaModal = useCallback(() => {
    goToAdjacentPharmaModal(-1);
  }, [goToAdjacentPharmaModal]);

  const handleNextPharmaModal = useCallback(() => {
    goToAdjacentPharmaModal(1);
  }, [goToAdjacentPharmaModal]);

  const openPharmaDetail = (itemId) => setDetailModal({ open: true, type: 'pharma', itemId });
  const openSolucionDetail = (itemId) => setDetailModal({ open: true, type: 'solucion', itemId });
  const closeDetailModal = () => setDetailModal({ open: false, type: 'pharma', itemId: '' });
  const closeDeleteModal = () => setDeleteModal({ open: false, type: 'pharma', itemId: '', label: '' });

  const requestDeletePharma = (item) => {
    setDeleteModal({
      open: true,
      type: 'pharma',
      itemId: item.id,
      label: item.principio || 'este medicamento',
    });
  };

  const requestDeleteSolucion = (item) => {
    setDeleteModal({
      open: true,
      type: 'solucion',
      itemId: item.id,
      label: item.solucion || 'esta solución IV',
    });
  };

  const confirmDeleteItem = () => {
    if (!deleteModal.itemId) {
      closeDeleteModal();
      return;
    }

    if (deleteModal.type === 'pharma') removeItem(deleteModal.itemId);
    if (deleteModal.type === 'solucion') removeSolucion(deleteModal.itemId);
    closeDeleteModal();
  };

  const selectedPharmaItem = detailModal.type === 'pharma'
    ? items.find((item) => item.id === detailModal.itemId) || null
    : null;

  const selectedSolucionItem = detailModal.type === 'solucion'
    ? solItems.find((item) => item.id === detailModal.itemId) || null
    : null;

  useEffect(() => {
    if (!detailModal.open) return;
    if (detailModal.type === 'pharma' && !selectedPharmaItem) closeDetailModal();
    if (detailModal.type === 'solucion' && !selectedSolucionItem) closeDetailModal();
  }, [detailModal, selectedPharmaItem, selectedSolucionItem]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center border-b pb-2">
        <h2 className="text-2xl font-bold text-slate-800">Prescripciones Intrahospitalarias</h2>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button onClick={() => setShowDilutionsModal(true)} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded text-sm flex items-center justify-center font-medium shadow-sm print:hidden"><FileText className="w-4 h-4 mr-1" /> Tabla de Diluciones</button>
          <button onClick={addSolucion} className="w-full sm:w-auto bg-cyan-600 hover:bg-cyan-700 text-white px-3 py-2 rounded text-sm flex items-center justify-center font-medium shadow-sm print:hidden"><Plus className="w-4 h-4 mr-1" /> Añadir Solución IV</button>
          <button onClick={addItem} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm flex items-center justify-center font-medium shadow-sm print:hidden"><Plus className="w-4 h-4 mr-1" /> Añadir Fármaco</button>
        </div>
      </div>

      {showDilutionsModal && (
        <div className="fixed inset-0 z-[95] bg-slate-900/60 backdrop-blur-[1px] flex items-center justify-center p-4 print:hidden" onClick={() => setShowDilutionsModal(false)}>
          <div className="w-full max-w-7xl max-h-[92vh] rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-slate-200 bg-indigo-600 text-white flex items-center justify-between gap-3">
              <h3 className="font-bold text-base sm:text-lg">Tabla de Diluciones</h3>
              <button onClick={() => setShowDilutionsModal(false)} className="text-indigo-100 hover:text-white" aria-label="Cerrar tabla de diluciones">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
              <input
                type="text"
                value={dilutionSearch}
                onChange={(e) => setDilutionSearch(e.target.value)}
                placeholder="Buscar por medicamento..."
                className="w-full sm:w-80 border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div className="flex-1 overflow-auto">
              <table className="min-w-[1200px] w-full text-left border-collapse">
                <thead className="bg-slate-800 text-white sticky top-0 z-10">
                  <tr>
                    {dilutionColumns.map((column) => (
                      <th key={column} className="p-2 text-xs font-semibold uppercase tracking-wide border-b border-slate-700">{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredDilutionRows.length === 0 && (
                    <tr>
                      <td colSpan={Math.max(1, dilutionColumns.length)} className="p-6 text-center text-slate-500 text-sm">
                        {dilutionRows.length === 0 ? 'No hay diluciones registradas.' : 'No se encontraron resultados para ese medicamento.'}
                      </td>
                    </tr>
                  )}
                  {filteredDilutionRows.map((row, index) => (
                    <tr key={`dilution-row-${index}`} className="border-b border-slate-100 hover:bg-slate-50">
                      {dilutionColumns.map((column) => (
                        <td key={`${column}-${index}`} className="p-2 align-top text-xs text-slate-700 whitespace-pre-wrap">{String(row?.[column] ?? '').trim() || '-'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button onClick={() => setShowDilutionsModal(false)} className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 font-medium">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-2 py-1 text-violet-800">
          <span className="inline-block w-3 h-3 rounded-full bg-violet-500" aria-hidden="true"></span>
          PRN (Por Razón Necesaria)
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-amber-800">
          <span className="inline-block w-3 h-3 rounded-full bg-amber-500" aria-hidden="true"></span>
          Quirófano
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-slate-100 px-2 py-1 text-slate-700">
          <span className="inline-block w-3 h-3 rounded-full bg-slate-500" aria-hidden="true"></span>
          Medicamento suspendido
        </span>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 flex justify-start sm:justify-end shadow-sm print:bg-transparent print:border-none print:shadow-none mb-4">
        <label className="flex items-center space-x-2 cursor-pointer bg-white px-3 py-1.5 rounded-md shadow-sm border border-blue-200 print:border-none print:shadow-none print:bg-transparent print:p-0 w-full sm:w-auto">
          <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" checked={meta.evaluadoPrevioPrimeraDosis} onChange={(e) => updateMeta('evaluadoPrevioPrimeraDosis', e.target.checked)} />
          <span className="font-semibold text-sm text-slate-800">Idoneidad evaluada antes de 1ra dosis</span>
        </label>
      </div>

      {pendientes.length > 0 && (
        <PharmaSection
          title="Clasificación inicial de fármacos"
          items={pendientes}
          updateItem={updateItem}
          updateItemStatus={updateItemStatus}
          onDuplicateItem={duplicateMedication}
          onDeleteItem={requestDeletePharma}
          onViewItem={openPharmaDetail}
          onViewDilution={openMedicationDilutionModal}
          reviewedMap={reviewedMedications}
          onToggleReviewed={toggleMedicationReviewed}
          hasModalOnlyChanges={(item) => hasModalOnlyChanges(item, persistedPharmaById.get(item.id), PHARMA_MODAL_FIELDS, PHARMA_DEFAULTS)}
          dischargeDate={patient.demographics.egreso}
          theme="blue"
        />
      )}
      <PharmaSection
        title="Terapia Antimicrobiana"
        items={atbs}
        updateItem={updateItem}
        updateItemStatus={updateItemStatus}
        onDuplicateItem={duplicateMedication}
        onDeleteItem={requestDeletePharma}
        onViewItem={openPharmaDetail}
        onViewDilution={openMedicationDilutionModal}
        reviewedMap={reviewedMedications}
        onToggleReviewed={toggleMedicationReviewed}
        hasModalOnlyChanges={(item) => hasModalOnlyChanges(item, persistedPharmaById.get(item.id), PHARMA_MODAL_FIELDS, PHARMA_DEFAULTS)}
        dischargeDate={patient.demographics.egreso}
        theme="orange"
      />
      <PharmaSection
        title="Medicamentos de Alto Riesgo"
        items={altos}
        updateItem={updateItem}
        updateItemStatus={updateItemStatus}
        onDuplicateItem={duplicateMedication}
        onDeleteItem={requestDeletePharma}
        onViewItem={openPharmaDetail}
        onViewDilution={openMedicationDilutionModal}
        reviewedMap={reviewedMedications}
        onToggleReviewed={toggleMedicationReviewed}
        hasModalOnlyChanges={(item) => hasModalOnlyChanges(item, persistedPharmaById.get(item.id), PHARMA_MODAL_FIELDS, PHARMA_DEFAULTS)}
        dischargeDate={patient.demographics.egreso}
        theme="red"
      />
      <PharmaSection
        title="Medicamentos Generales"
        items={gens}
        updateItem={updateItem}
        updateItemStatus={updateItemStatus}
        onDuplicateItem={duplicateMedication}
        onDeleteItem={requestDeletePharma}
        onViewItem={openPharmaDetail}
        onViewDilution={openMedicationDilutionModal}
        reviewedMap={reviewedMedications}
        onToggleReviewed={toggleMedicationReviewed}
        hasModalOnlyChanges={(item) => hasModalOnlyChanges(item, persistedPharmaById.get(item.id), PHARMA_MODAL_FIELDS, PHARMA_DEFAULTS)}
        dischargeDate={patient.demographics.egreso}
        theme="blue"
      />

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden mb-6 print:border-slate-300 print:shadow-none mt-8">
        <div className="px-4 py-2 font-bold border-b bg-cyan-100 text-cyan-900 border-cyan-200 print:bg-slate-100 print:text-black print:border-slate-300">Soluciones Intravenosas (Fluidos)</div>
        <div className="overflow-x-auto md:overflow-x-visible overscroll-x-contain print:overflow-visible" onKeyDownCapture={handleTableArrowNavigation}>
          <table className="w-full min-w-[720px] md:min-w-0 table-fixed text-[11px] md:text-xs lg:text-sm border-collapse">
            <thead className="bg-slate-50 border-b print:bg-white">
              <tr>
                <th className="p-1.5 md:p-2 text-left font-semibold uppercase tracking-wide text-[10px] md:text-[11px] text-slate-600 w-[12%]">Categoría</th>
                <th className="p-1.5 md:p-2 text-left font-semibold uppercase tracking-wide text-[10px] md:text-[11px] text-slate-600 w-[34%]">Principio Activo</th>
                <th className="p-1.5 md:p-2 text-left font-semibold uppercase tracking-wide text-[10px] md:text-[11px] text-slate-600 w-[18%]">Volumen</th>
                <th className="p-1.5 md:p-2 text-left font-semibold uppercase tracking-wide text-[10px] md:text-[11px] text-slate-600 w-[16%]">F. Inicio</th>
                <th className="p-1.5 md:p-2 text-left font-semibold uppercase tracking-wide text-[10px] md:text-[11px] text-slate-600 w-[12%]">Estado</th>
                <th className="p-1.5 md:p-2 text-center font-semibold uppercase tracking-wide text-[10px] md:text-[11px] text-slate-600 w-[8%] print:hidden">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {solItems.length === 0 && <tr><td colSpan="6" className="p-3 text-center text-slate-400 italic">No hay soluciones IV registradas.</td></tr>}
              {solItems.map((item) => {
                const isSuspended = item.estado === 'Suspendido';
                const modalOnlyChanged = hasModalOnlyChanges(item, persistedSolById.get(item.id), SOL_MODAL_FIELDS, SOL_DEFAULTS);

                return (
                  <tr key={item.id} className={`border-b border-slate-200 transition-colors ${isSuspended ? 'bg-slate-100/90 opacity-80 print:opacity-100 print:bg-slate-50' : 'hover:bg-cyan-50/50'}`}>
                    <td className="p-1.5 md:p-2 text-[11px] font-semibold text-cyan-800">Solución IV</td>
                    <td className="p-1 md:p-1.5"><input type="text" placeholder="Ej. Sol. Salina 0.9%" className={`w-full h-8 lg:h-9 border-slate-300 rounded-md text-xs lg:text-sm font-medium print:border-none print:bg-transparent ${isSuspended ? 'line-through text-slate-500 bg-slate-200' : ''}`} value={item.solucion} onChange={(e) => updateSolucion(item.id, 'solucion', e.target.value)} /></td>
                    <td className="p-1 md:p-1.5"><input type="number" step="0.1" className={`w-full h-8 lg:h-9 border-slate-300 rounded-md text-xs lg:text-sm print:border-none print:bg-transparent ${isSuspended ? 'bg-slate-200' : ''}`} value={item.volumen || ''} onChange={(e) => updateSolucion(item.id, 'volumen', e.target.value)} /></td>
                    <td className="p-1 md:p-1.5"><input type="date" className={`w-full h-8 lg:h-9 border-slate-300 rounded-md text-xs lg:text-sm p-1 md:p-1.5 print:border-none print:bg-transparent ${isSuspended ? 'bg-slate-200' : ''}`} value={item.fechaInicio} onChange={(e) => updateSolucion(item.id, 'fechaInicio', e.target.value)} /></td>
                    <td className="p-1 md:p-1.5">
                      <select className={`w-full h-8 lg:h-9 rounded-md text-xs lg:text-sm p-1 md:p-1.5 font-semibold border print:appearance-none print:border-none print:bg-transparent ${isSuspended ? 'bg-red-100 text-red-800 border-red-300' : 'bg-green-50 text-green-800 border-green-300'}`} value={item.estado} onChange={(e) => updateSolucionStatus(item.id, e.target.value)}>
                        <option value="Activo">Activo</option>
                        <option value="Suspendido">Suspendido</option>
                      </select>
                    </td>
                    <td className="p-1 md:p-1.5 text-center print:hidden">
                      <div className="flex items-center justify-center gap-1.5 lg:gap-2">
                        <button onClick={() => openSolucionDetail(item.id)} className={`inline-flex h-8 w-8 lg:h-9 lg:w-9 items-center justify-center rounded-md border shadow-sm transition ${modalOnlyChanged ? 'border-violet-300 bg-violet-100 text-violet-700 hover:bg-violet-200 hover:border-violet-400' : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-300'}`} title={modalOnlyChanged ? 'Hay cambios pendientes en campos del detalle' : 'Ver detalle'}><Eye className="w-4 h-4" /></button>
                        <button onClick={() => requestDeleteSolucion(item)} className="inline-flex h-8 w-8 lg:h-9 lg:w-9 items-center justify-center rounded-md border border-red-200 bg-red-50 text-red-700 shadow-sm hover:bg-red-100 hover:border-red-300 transition" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {deleteModal.open && (
        <div className="fixed inset-0 z-[90] bg-slate-900/60 backdrop-blur-[1px] flex items-center justify-center p-4 print:hidden" onClick={closeDeleteModal}>
          <div className="w-full max-w-md rounded-xl border border-red-200 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-red-100 bg-red-50 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white border border-red-200 text-red-700 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Confirmar eliminación</h3>
                <p className="text-xs text-slate-600">Esta acción no se puede deshacer.</p>
              </div>
            </div>
            <div className="px-5 py-4 space-y-2">
              <p className="text-sm text-slate-700 leading-relaxed">
                ¿Deseas eliminar {deleteModal.type === 'solucion' ? 'la solución IV' : 'el medicamento'} <span className="font-semibold text-slate-900">"{deleteModal.label}"</span>?
              </p>
            </div>
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button onClick={closeDeleteModal} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-100 font-medium">Cancelar</button>
              <button onClick={confirmDeleteItem} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {detailModal.open && (
        <MedicationDetailModal
          type={detailModal.type}
          item={detailModal.type === 'pharma' ? selectedPharmaItem : selectedSolucionItem}
          onClose={closeDetailModal}
          onPharmaFieldChange={updateItem}
          onPharmaStatusChange={updateItemStatus}
          onSolFieldChange={updateSolucion}
          onSolStatusChange={updateSolucionStatus}
          onDuplicatePharmaToEgreso={duplicatePharmaToEgreso}
          patient={patient}
          pharmaItemIds={pharmaNavigationIds}
          onPrevPharmaItem={handlePrevPharmaModal}
          onNextPharmaItem={handleNextPharmaModal}
        />
      )}

      {medDilutionModal.open && (
        <div className="fixed inset-0 z-[96] bg-slate-900/60 backdrop-blur-[1px] flex items-center justify-center p-4 print:hidden" onClick={() => setMedDilutionModal({ open: false, medicationName: '', rows: [] })}>
          <div className="w-full max-w-6xl rounded-xl border border-slate-200 bg-white shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-slate-200 bg-cyan-700 text-white flex items-center justify-between gap-3">
              <h3 className="font-bold text-base sm:text-lg">Dilución de: {medDilutionModal.medicationName || 'medicamento'}</h3>
              <button onClick={() => setMedDilutionModal({ open: false, medicationName: '', rows: [] })} className="text-cyan-100 hover:text-white" aria-label="Cerrar modal de dilución por medicamento">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {medDilutionModal.rows.length === 0 ? (
                <div className="text-sm text-slate-700">
                  Este medicamento no tiene registro en la tabla de diluciones.
                </div>
              ) : (
                medDilutionModal.rows.map((row, index) => (
                  <div key={`med-dil-row-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    {medDilutionModal.rows.length > 1 && (
                      <div className="text-[11px] font-bold uppercase tracking-wide text-cyan-700 mb-2">Registro {index + 1}</div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                      {dilutionColumns.map((column) => (
                        <div key={`med-dil-cell-${column}-${index}`} className="rounded border border-slate-200 bg-white p-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{column}</p>
                          <p className="text-xs text-slate-700 whitespace-pre-wrap break-words">{String(row?.[column] ?? '').trim() || '-'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button onClick={() => setMedDilutionModal({ open: false, medicationName: '', rows: [] })} className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 font-medium">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PharmaSection({ title, items, updateItem, updateItemStatus, onDuplicateItem = () => {}, onDeleteItem, onViewItem, onViewDilution = () => {}, hasModalOnlyChanges, dischargeDate, theme, reviewedMap = {}, onToggleReviewed = () => {} }) {
  const headerColors = { orange: 'bg-orange-100 text-orange-900 border-orange-200', red: 'bg-red-100 text-red-900 border-red-200', blue: 'bg-slate-100 text-slate-800 border-slate-200' };
  const isMarSection = title === 'Medicamentos de Alto Riesgo';
  const isInitialClassificationSection = title === 'Clasificación inicial de fármacos';
  const categoryOrder = ['General', 'Antibiótico', 'Alto Riesgo'];
  const [categoryPicker, setCategoryPicker] = useState({ open: false, item: null });

  const getCategoryMeta = (category = '') => {
    if (!String(category || '').trim()) {
      return { icon: ListChecks, label: 'Sin clasificar', className: 'border-amber-200 bg-amber-50 text-amber-700' };
    }
    if (category === 'Antibiótico') {
      return { icon: Microscope, label: 'Antibiótico', className: 'border-orange-200 bg-orange-50 text-orange-700' };
    }
    if (category === 'Alto Riesgo') {
      return { icon: ShieldAlert, label: 'Alto Riesgo', className: 'border-red-200 bg-red-50 text-red-700' };
    }
    return { icon: Activity, label: 'General', className: 'border-slate-300 bg-slate-100 text-slate-700' };
  };

  const openCategoryPicker = (item) => {
    setCategoryPicker({ open: true, item });
  };

  const closeCategoryPicker = () => {
    setCategoryPicker({ open: false, item: null });
  };

  const setCategoryFromPicker = (nextCategory) => {
    if (!categoryPicker.item?.id) {
      closeCategoryPicker();
      return;
    }
    if (!categoryOrder.includes(nextCategory)) {
      closeCategoryPicker();
      return;
    }
    updateItem(categoryPicker.item.id, 'categoria', nextCategory);
    closeCategoryPicker();
  };

  const sortedItems = [...items].sort((a, b) => {
    if (a.estado === 'Suspendido' && b.estado !== 'Suspendido') return 1;
    if (a.estado !== 'Suspendido' && b.estado === 'Suspendido') return -1;
    return 0;
  });

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-visible mb-6 print:border-slate-300 print:shadow-none">
      <div className={`px-4 py-2 font-bold border-b ${headerColors[theme]} print:bg-slate-100 print:text-black print:border-slate-300 flex items-center justify-between gap-3`}>
        <span className="inline-flex items-center gap-2">
          {isInitialClassificationSection && <Layers className="w-4 h-4" />}
          {title}
        </span>
        {isMarSection && (
          <div className="relative group print:hidden">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-full p-1.5 bg-white/70 border border-red-300 text-red-700 hover:bg-white focus:outline-none focus:ring-2 focus:ring-red-400"
              aria-label="Ver guía de medicamentos de alto riesgo"
              title="Ver recomendaciones MAR"
            >
              <CircleHelp className="w-4 h-4" />
            </button>
            <div className="absolute right-0 top-10 z-20 w-72 rounded-lg border border-red-200 bg-white p-3 text-xs text-slate-700 shadow-xl opacity-0 pointer-events-none transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
              <p className="font-bold text-red-800 mb-1">MAR</p>
              <p className="text-slate-500 mb-2">Medicamentos de alto riesgo (ejemplos):</p>
              <ol className="list-decimal pl-4 space-y-0.5">
                {MAR_RECOMENDACIONES.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </div>

      <div className="overflow-x-visible print:overflow-visible" onKeyDownCapture={handleTableArrowNavigation}>
        <table className="w-full table-fixed text-[10px] sm:text-xs lg:text-sm border-collapse">
          <thead className="bg-slate-50 border-b print:bg-white">
            <tr>
              <th className="p-1 text-center font-semibold uppercase tracking-wide text-[9px] text-slate-600 w-[4%] print:hidden">Rev.</th>
              <th className="p-1 md:p-1.5 text-center font-semibold uppercase tracking-wide text-[10px] text-slate-600 w-[5%]">CAT</th>
              <th className="p-1 md:p-1.5 text-left font-semibold uppercase tracking-wide text-[10px] text-slate-600 w-[22%]">Principio Activo</th>
              <th className="p-1 md:p-1.5 text-left font-semibold uppercase tracking-wide text-[10px] text-slate-600 w-[12%]">Marca Com.</th>
              <th className="p-1 md:p-1.5 text-left font-semibold uppercase tracking-wide text-[10px] text-slate-600 w-[12%]">Dosis</th>
              <th className="p-1 md:p-1.5 text-left font-semibold uppercase tracking-wide text-[10px] text-slate-600 w-[10%]">Frec.</th>
              <th className="p-1 md:p-1.5 text-center font-semibold uppercase tracking-wide text-[10px] text-slate-600 w-[7%]">Días act.</th>
              <th className="p-1 md:p-1.5 text-left font-semibold uppercase tracking-wide text-[10px] text-slate-600 w-[10%]">F. Inicio</th>
              <th className="p-1 md:p-1.5 text-center font-semibold uppercase tracking-wide text-[10px] text-slate-600 w-[5%]">Estado</th>
              <th className="p-1 md:p-1.5 text-center font-semibold uppercase tracking-wide text-[10px] text-slate-600 w-[11%] print:hidden">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.length === 0 && <tr><td colSpan="10" className="p-3 text-center text-slate-400 italic">No hay registros.</td></tr>}
            {sortedItems.map((item) => {
              const isSuspended = item.estado === 'Suspendido';
              const isPrn = item.prn === true;
              const isQuirofano = item.quirofano === true;
              const isReviewed = reviewedMap[item.id] === true;
              const modalOnlyChanged = hasModalOnlyChanges?.(item) === true;
              const endDate = isSuspended ? item.fechaSuspension : dischargeDate;
              const daysActive = item.fechaInicio ? (calculateDaysOfUse(item.fechaInicio, endDate) || '-') : '-';
              const frequency = parseFrequency(item.frecuencia);
              const categoryMeta = getCategoryMeta(item.categoria);
              const CategoryIcon = categoryMeta.icon;

              return (
                <tr key={item.id} className={`border-b border-slate-200 transition-colors ${isQuirofano ? 'bg-amber-100/80 hover:bg-amber-100/95 [&_input]:bg-amber-50 [&_select]:bg-amber-50 [&_input]:border-amber-200 [&_select]:border-amber-200' : isPrn ? 'bg-violet-100/75 hover:bg-violet-100/90 [&_input]:bg-violet-50 [&_select]:bg-violet-50 [&_input]:border-violet-200 [&_select]:border-violet-200' : isSuspended ? 'bg-slate-100/90 opacity-80 print:opacity-100 print:bg-slate-50' : 'hover:bg-slate-50/70'} ${(isPrn || isQuirofano) && isSuspended ? 'opacity-80 print:opacity-100' : ''}`}>
                  <td className="p-1 text-center print:hidden">
                    <button
                      type="button"
                      onClick={() => onToggleReviewed(item.id)}
                      className={`inline-flex h-5 w-5 items-center justify-center rounded border transition ${isReviewed ? 'border-emerald-300 bg-emerald-50 text-emerald-600' : 'border-slate-300 bg-slate-50 text-slate-400 hover:text-slate-500'}`}
                      title={isReviewed ? 'Revisado' : 'Marcar como revisado'}
                      aria-label={isReviewed ? 'Revisado' : 'Marcar como revisado'}
                      aria-pressed={isReviewed}
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                    </button>
                  </td>
                  <td className="p-1 md:p-1.5 text-center">
                    <button
                      type="button"
                      onClick={() => openCategoryPicker(item)}
                      className={`inline-flex h-7 w-7 lg:h-8 lg:w-8 items-center justify-center rounded-md border transition ${categoryMeta.className}`}
                      title={`Categoría: ${categoryMeta.label} (clic para elegir destino)`}
                      aria-label={`Categoría: ${categoryMeta.label} (clic para elegir destino)`}
                    >
                      <CategoryIcon className="w-3.5 h-3.5" />
                    </button>
                  </td>
                  <td className="p-1 md:p-1.5"><input type="text" className={`min-w-0 w-full h-8 lg:h-9 border-slate-300 rounded-md text-xs lg:text-sm font-medium print:border-none print:bg-transparent ${isSuspended ? 'line-through text-slate-500 bg-slate-200' : ''}`} value={item.principio} onChange={(e) => updateItem(item.id, 'principio', e.target.value)} /></td>
                  <td className="p-1 md:p-1.5"><input type="text" className={`min-w-0 w-full h-8 lg:h-9 border-slate-300 rounded-md text-xs lg:text-sm print:border-none print:bg-transparent ${isSuspended ? 'bg-slate-200' : ''}`} placeholder="Opcional" value={item.marcaComercial || ''} onChange={(e) => updateItem(item.id, 'marcaComercial', e.target.value)} /></td>
                  <td className="p-1 md:p-1.5"><input type="text" className={`min-w-0 w-full h-8 lg:h-9 border-slate-300 rounded-md text-xs lg:text-sm print:border-none print:bg-transparent ${isSuspended ? 'bg-slate-200' : ''}`} value={item.dosis} onChange={(e) => updateItem(item.id, 'dosis', e.target.value)} /></td>
                  <td className="p-1 md:p-1.5">
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className={`min-w-0 w-full h-8 lg:h-9 border-slate-300 rounded-md text-xs lg:text-sm print:border-none print:bg-transparent ${isSuspended ? 'bg-slate-200' : ''}`}
                        value={frequency.value}
                        onChange={(e) => updateItem(item.id, 'frecuencia', e.target.value)}
                        placeholder="0"
                      />
                      <select
                        className={`h-8 lg:h-9 w-[76px] border-slate-300 rounded-md text-xs lg:text-sm p-1 md:p-1.5 font-semibold print:appearance-none print:border-none print:bg-transparent ${isSuspended ? 'bg-slate-200' : ''}`}
                        value={frequency.unit}
                        onChange={(e) => updateItem(item.id, 'frecuenciaUnidad', e.target.value)}
                      >
                        <option value="hrs">hrs</option>
                        <option value="min">min</option>
                      </select>
                    </div>
                  </td>
                  <td className="p-1 md:p-1.5 text-center font-semibold text-slate-700">{daysActive}</td>
                  <td className="p-1 md:p-1.5"><input type="date" className={`min-w-0 w-full h-8 lg:h-9 border-slate-300 rounded-md text-xs lg:text-sm p-1 md:p-1.5 print:border-none print:bg-transparent ${isSuspended ? 'bg-slate-200' : ''}`} value={item.fechaInicio} onChange={(e) => updateItem(item.id, 'fechaInicio', e.target.value)} /></td>
                  <td className="p-1 md:p-1.5 text-center">
                    <button
                      type="button"
                      onClick={() => updateItemStatus(item.id, isSuspended ? 'Activo' : 'Suspendido')}
                      className={`inline-flex h-7 w-7 lg:h-8 lg:w-8 items-center justify-center rounded-md border shadow-sm transition ${isSuspended ? 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100' : 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
                      title={isSuspended ? 'Suspendido (clic para activar)' : 'Activo (clic para suspender)'}
                      aria-label={isSuspended ? 'Suspendido (clic para activar)' : 'Activo (clic para suspender)'}
                      aria-pressed={isSuspended}
                    >
                      <Pill className="w-3.5 h-3.5" />
                    </button>
                  </td>
                  <td className="p-1 md:p-1.5 text-center print:hidden">
                    <div className="flex items-center justify-center gap-1.5 lg:gap-2">
                      <button onClick={() => onDuplicateItem(item)} className="inline-flex h-8 w-8 lg:h-9 lg:w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-100 hover:border-slate-400 transition" title="Duplicar medicamento"><Copy className="w-4 h-4" /></button>
                      <button onClick={() => onViewDilution(item.principio)} className="inline-flex h-8 w-8 lg:h-9 lg:w-9 items-center justify-center rounded-md border border-cyan-200 bg-cyan-50 text-cyan-700 shadow-sm hover:bg-cyan-100 hover:border-cyan-300 transition" title="Ver dilución del medicamento"><Microscope className="w-4 h-4" /></button>
                      <button onClick={() => onViewItem(item.id)} className={`inline-flex h-8 w-8 lg:h-9 lg:w-9 items-center justify-center rounded-md border shadow-sm transition ${modalOnlyChanged ? 'border-violet-300 bg-violet-100 text-violet-700 hover:bg-violet-200 hover:border-violet-400' : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-300'}`} title={modalOnlyChanged ? 'Hay cambios pendientes en campos del detalle' : 'Ver detalle'}><Eye className="w-4 h-4" /></button>
                      <button onClick={() => onDeleteItem(item)} className="inline-flex h-8 w-8 lg:h-9 lg:w-9 items-center justify-center rounded-md border border-red-200 bg-red-50 text-red-700 shadow-sm hover:bg-red-100 hover:border-red-300 transition" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {categoryPicker.open && (
        <div className="fixed inset-0 z-[97] bg-slate-900/55 backdrop-blur-[1px] flex items-center justify-center p-4 print:hidden" onClick={closeCategoryPicker}>
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-100 text-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-sm">Cambiar categoría</h3>
              <button onClick={closeCategoryPicker} className="text-slate-500 hover:text-slate-700" aria-label="Cerrar selector de categoría">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-4 py-3 border-b border-slate-200 text-sm text-slate-700">
              ¿A qué categoría quieres mandar <span className="font-semibold">{categoryPicker.item?.principio || 'este medicamento'}</span>?
            </div>
            <div className="p-3 space-y-2">
              {categoryOrder.map((category) => {
                const meta = getCategoryMeta(category);
                const Icon = meta.icon;
                const isCurrent = (categoryPicker.item?.categoria || 'General') === category;
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setCategoryFromPicker(category)}
                    className={`w-full flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${isCurrent ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
                  >
                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md border ${meta.className}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </span>
                    <span>{meta.label}</span>
                    {isCurrent && <span className="ml-auto text-[11px] font-bold uppercase">Actual</span>}
                  </button>
                );
              })}
            </div>
            <div className="px-3 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button onClick={closeCategoryPicker} className="px-3 py-1.5 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 text-sm font-medium">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MedicationDetailModal({ type, item, onClose, onPharmaFieldChange, onPharmaStatusChange, onSolFieldChange, onSolStatusChange, onDuplicatePharmaToEgreso, patient, pharmaItemIds = [], onPrevPharmaItem, onNextPharmaItem }) {
  if (!item) return null;

  const isSolution = type === 'solucion';
  const isHighRiskMed = !isSolution && item.categoria === 'Alto Riesgo';
  const isSuspended = item.estado === 'Suspendido';
  const endDate = isSuspended ? item.fechaSuspension : patient.demographics.egreso;
  const days = calculateDaysOfUse(item.fechaInicio, endDate);
  const frequency = parseFrequency(item.frecuencia);
  const frequencyNumeric = Number(frequency.value || 0);
  const intervalMinutes = frequencyNumeric > 0
    ? (frequency.unit === 'min' ? frequencyNumeric : frequencyNumeric * 60)
    : 0;
  const dosesPerDay = intervalMinutes > 0 ? Math.max(1, Math.floor((24 * 60) / intervalMinutes)) : 0;
  const useManualDoseCount = item.seguimientoUsarCantidadDosis === true;
  const customDoseCount = Number(sanitizeFrequencyNumber(item.seguimientoDosisCantidad || ''));
  const doseCountBase = useManualDoseCount && customDoseCount > 0 ? customDoseCount : dosesPerDay;
  const displayedDoses = Math.max(0, Math.min(doseCountBase, 24));
  const firstDose = String(item.horaPrimeraDosis || '');
  const firstDoseDate = String(item.seguimientoBaseDate || '').slice(0, 10);
  const firstDoseDateValue = firstDoseDate;
  const firstDoseMinutes = (() => {
    if (!firstDose || !/^\d{2}:\d{2}$/.test(firstDose)) return null;
    const [hh, mm] = firstDose.split(':').map((n) => Number(n));
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
    return (hh * 60) + mm;
  })();

  const formatMinutesToAmPm = (totalMinutes) => {
    const normalized = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
    const hours24 = Math.floor(normalized / 60);
    const minutes = normalized % 60;
    const period = hours24 >= 12 ? 'PM' : 'AM';
    const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
    return `${String(hours12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`;
  };

  const buildMedicationScheduleEntries = (medication, maxDoses = 24) => {
    const medFrequency = parseFrequency(medication?.frecuencia || '');
    const medFrequencyNumeric = Number(medFrequency.value || 0);
    const medIntervalMinutes = medFrequencyNumeric > 0
      ? (medFrequency.unit === 'min' ? medFrequencyNumeric : medFrequencyNumeric * 60)
      : 0;

    if (medIntervalMinutes <= 0) return [];

    const medUseManualDoseCount = medication?.seguimientoUsarCantidadDosis === true;
    const medCustomDoseCount = Number(sanitizeFrequencyNumber(medication?.seguimientoDosisCantidad || ''));
    const medDoseCountBase = medUseManualDoseCount && medCustomDoseCount > 0
      ? medCustomDoseCount
      : Math.max(1, Math.floor((24 * 60) / medIntervalMinutes));
    const medDisplayedDoses = Math.max(0, Math.min(medDoseCountBase, maxDoses));

    const medFirstDose = String(medication?.horaPrimeraDosis || '');
    const medFirstDoseDate = String(medication?.seguimientoBaseDate || '').slice(0, 10);

    if (!medFirstDoseDate || !/^\d{2}:\d{2}$/.test(medFirstDose)) return [];

    const [baseYear, baseMonth, baseDay] = medFirstDoseDate.split('-').map((n) => Number(n));
    const [firstHours, firstMinutesOnly] = medFirstDose.split(':').map((n) => Number(n));

    if (!Number.isFinite(baseYear) || !Number.isFinite(baseMonth) || !Number.isFinite(baseDay)) return [];
    if (!Number.isFinite(firstHours) || !Number.isFinite(firstMinutesOnly)) return [];

    const firstDoseDateTime = new Date(baseYear, baseMonth - 1, baseDay, firstHours, firstMinutesOnly, 0, 0);
    if (!Number.isFinite(firstDoseDateTime.getTime())) return [];

    return Array.from({ length: medDisplayedDoses }, (_, index) => {
      const doseDateTime = new Date(firstDoseDateTime.getTime() + (index * medIntervalMinutes * 60 * 1000));
      const yyyy = doseDateTime.getFullYear();
      const mm = String(doseDateTime.getMonth() + 1).padStart(2, '0');
      const dd = String(doseDateTime.getDate()).padStart(2, '0');
      const hh = String(doseDateTime.getHours()).padStart(2, '0');
      const min = String(doseDateTime.getMinutes()).padStart(2, '0');

      return {
        index,
        minuteTs: Math.floor(doseDateTime.getTime() / 60000),
        dateTimeLabel: `${dd}/${mm}/${yyyy} ${hh}:${min}`,
        timeLabel: formatMinutesToAmPm((doseDateTime.getHours() * 60) + doseDateTime.getMinutes()),
      };
    });
  };

  const scheduleTimes = Array.from({ length: displayedDoses }, (_, index) => {
    if (!firstDoseDateValue || firstDoseMinutes === null || intervalMinutes <= 0) {
      return { timeLabel: '', dateTimeLabel: '' };
    }

    const [baseYear, baseMonth, baseDay] = firstDoseDateValue.split('-').map((n) => Number(n));
    if (!Number.isFinite(baseYear) || !Number.isFinite(baseMonth) || !Number.isFinite(baseDay)) {
      return { timeLabel: '', dateTimeLabel: '' };
    }

    const [firstHours, firstMinutesOnly] = firstDose.split(':').map((n) => Number(n));
    const firstDoseDateTime = new Date(baseYear, baseMonth - 1, baseDay, firstHours, firstMinutesOnly, 0, 0);
    if (!Number.isFinite(firstDoseDateTime.getTime())) {
      return { timeLabel: '', dateTimeLabel: '' };
    }

    const doseDateTime = new Date(firstDoseDateTime.getTime() + (index * intervalMinutes * 60 * 1000));
    const yyyy = doseDateTime.getFullYear();
    const mm = String(doseDateTime.getMonth() + 1).padStart(2, '0');
    const dd = String(doseDateTime.getDate()).padStart(2, '0');

    return {
      timeLabel: formatMinutesToAmPm((doseDateTime.getHours() * 60) + doseDateTime.getMinutes()),
      dateTimeLabel: `${dd}/${mm}/${yyyy} ${String(doseDateTime.getHours()).padStart(2, '0')}:${String(doseDateTime.getMinutes()).padStart(2, '0')}`,
    };
  });

  const collisionAlerts = useMemo(() => {
    if (isSolution) return [];

    const currentSchedule = buildMedicationScheduleEntries(item, 24);
    if (currentSchedule.length === 0) return [];

    const otherMeds = (patient?.perfilFarmaco || []).filter((med) => med?.id !== item?.id);
    if (otherMeds.length === 0) return [];

    const occupiedTimes = new Map();

    otherMeds.forEach((med) => {
      const medName = String(med?.principio || '').trim() || 'Medicamento sin nombre';
      const medSchedule = buildMedicationScheduleEntries(med, 24);

      medSchedule.forEach((entry) => {
        if (!occupiedTimes.has(entry.minuteTs)) {
          occupiedTimes.set(entry.minuteTs, new Set());
        }
        occupiedTimes.get(entry.minuteTs).add(medName);
      });
    });

    return currentSchedule
      .map((entry) => {
        const collidingNames = occupiedTimes.get(entry.minuteTs);
        if (!collidingNames || collidingNames.size === 0) return null;
        return {
          doseLabel: `Dosis #${entry.index + 1}`,
          whenLabel: entry.dateTimeLabel,
          meds: Array.from(collidingNames),
        };
      })
      .filter(Boolean);
  }, [isSolution, item, patient?.perfilFarmaco]);

  const currentPharmaIndex = !isSolution ? pharmaItemIds.indexOf(item.id) : -1;
  const canNavigatePharma = !isSolution && pharmaItemIds.length > 1 && currentPharmaIndex >= 0;
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [showMarHelp, setShowMarHelp] = useState(false);

  const requestClose = useCallback(() => {
    setIsVisible(false);
    setIsClosing((prev) => prev || true);
  }, []);

  useEffect(() => {
    const frameId = requestAnimationFrame(() => setIsVisible(true));
    return () => cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    if (!isClosing) return undefined;
    const timeoutId = setTimeout(() => {
      onClose();
    }, 180);
    return () => clearTimeout(timeoutId);
  }, [isClosing, onClose]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') requestClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [requestClose]);

  useEffect(() => {
    setShowMarHelp(false);
  }, [item.id, isHighRiskMed]);

  const updateStatus = (value) => {
    if (isSolution) {
      onSolStatusChange(item.id, value);
      return;
    }
    onPharmaStatusChange(item.id, value);
  };

  const updateField = (field, value) => {
    if (isSolution) {
      onSolFieldChange(item.id, field, value);
      return;
    }
    onPharmaFieldChange(item.id, field, value);
  };

  return (
    <div
      className={`fixed inset-0 z-[85] flex items-center justify-center p-2 sm:p-4 lg:p-6 print:hidden transition-all duration-200 ${isVisible ? 'bg-slate-900/65 backdrop-blur-[1px] opacity-100' : 'bg-slate-900/0 backdrop-blur-0 opacity-0'}`}
      onClick={requestClose}
    >
      <div
        className={`w-full max-w-[98vw] sm:max-w-[94vw] md:max-w-[92vw] lg:max-w-6xl max-h-[96vh] md:max-h-[92vh] overflow-hidden rounded-xl md:rounded-2xl bg-gradient-to-br from-sky-200 via-violet-100 to-cyan-100 p-[1px] shadow-2xl transition-all duration-200 ${isVisible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-4 scale-[0.98] opacity-0'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-full w-full overflow-hidden rounded-[inherit] bg-white">
          <div className="px-4 sm:px-5 py-4 border-b border-white/30 bg-gradient-to-r from-sky-600 via-blue-700 to-indigo-700 flex items-center justify-between gap-3 text-white">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-white/15 border border-white/25 text-white flex items-center justify-center shadow-sm"><Eye className="w-5 h-5" /></div>
              <div className="min-w-0">
                <h3 className="font-bold text-white truncate">{isSolution ? 'Detalle de Solución IV' : 'Detalle de Medicamento'}</h3>
                <p className={`${isSolution ? 'text-sm text-blue-100' : 'text-2xl sm:text-3xl font-extrabold text-white'} mt-0.5 leading-tight truncate`}>
                  {isSolution ? (item.solucion || 'Sin nombre') : (item.principio || 'Sin nombre')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isHighRiskMed && (
                <button
                  type="button"
                  onClick={() => setShowMarHelp((prev) => !prev)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-semibold transition ${showMarHelp ? 'border-red-200 bg-red-100 text-red-800' : 'border-white/40 bg-white/15 text-white hover:bg-white/25'}`}
                  title="Ver recomendaciones MAR"
                  aria-label="Ver recomendaciones MAR"
                >
                  <CircleHelp className="w-3.5 h-3.5" /> MAR
                </button>
              )}
              {canNavigatePharma && (
                <>
                  <button
                    type="button"
                    onClick={onPrevPharmaItem}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/35 bg-white/10 text-white hover:bg-white/20 transition"
                    aria-label="Ver medicamento anterior"
                    title="Medicamento anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={onNextPharmaItem}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/35 bg-white/10 text-white hover:bg-white/20 transition"
                    aria-label="Ver medicamento siguiente"
                    title="Medicamento siguiente"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <span className="hidden sm:inline text-[11px] font-semibold text-blue-100 px-2">{currentPharmaIndex + 1} / {pharmaItemIds.length}</span>
                </>
              )}
              <button onClick={requestClose} className="p-2 rounded-lg text-white/90 hover:text-white hover:bg-white/15"><X className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="p-3 sm:p-4 md:p-5 overflow-y-auto max-h-[calc(96vh-190px)] md:max-h-[calc(92vh-198px)] space-y-4 bg-gradient-to-b from-white to-sky-50/30">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2.5"><p className="text-emerald-700">Estado</p><p className="font-bold text-emerald-900 mt-0.5">{item.estado || '-'}</p></div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-2.5"><p className="text-blue-700">Fecha inicio</p><p className="font-bold text-blue-900 mt-0.5">{item.fechaInicio || '-'}</p></div>
              <div className="rounded-xl border border-violet-200 bg-violet-50 p-2.5"><p className="text-violet-700">Días activos</p><p className="font-bold text-violet-900 mt-0.5">{item.fechaInicio ? days : '-'}</p></div>
              <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-2.5"><p className="text-cyan-700">Categoría</p><p className="font-bold text-cyan-900 mt-0.5">{isSolution ? 'Solución IV' : (item.categoria || '-')}</p></div>
            </div>

            {isHighRiskMed && showMarHelp && (
              <div className="rounded-xl border border-red-200 bg-white/95 p-3 text-xs text-slate-700 shadow-sm">
                <p className="font-bold text-red-700 mb-1">Recomendaciones MAR</p>
                <p className="text-slate-500 mb-2">Medicamentos de alto riesgo a vigilar:</p>
                <ol className="list-decimal pl-4 space-y-0.5">
                  {MAR_RECOMENDACIONES.map((marItem) => (
                    <li key={marItem}>{marItem}</li>
                  ))}
                </ol>
              </div>
            )}

            {!isSolution ? (
              <>
                <div className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-blue-50 p-3 sm:p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center"><ListChecks className="w-4 h-4" /></div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-700">Vista principal (orden de tabla)</p>
                  </div>
                  <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 ${isSuspended ? 'xl:grid-cols-8' : 'xl:grid-cols-7'} gap-3`}>
                    <div className="rounded-lg border border-white/80 bg-white/80 p-2 shadow-sm"><FormSelect label="Categoría" value={item.categoria || ''} onChange={(e) => updateField('categoria', e.target.value)} options={CATEGORIAS_FARMACO} /></div>
                    <div className="rounded-lg border border-white/80 bg-white/80 p-2 shadow-sm"><FormInput label="Principio Activo" value={item.principio || ''} onChange={(e) => updateField('principio', e.target.value)} /></div>
                    <div className="rounded-lg border border-white/80 bg-white/80 p-2 shadow-sm"><FormInput label="Marca Com." value={item.marcaComercial || ''} onChange={(e) => updateField('marcaComercial', e.target.value)} /></div>
                    <div className="rounded-lg border border-white/80 bg-white/80 p-2 shadow-sm"><FormInput label="Dosis" value={item.dosis || ''} onChange={(e) => updateField('dosis', e.target.value)} /></div>
                    <div className="rounded-lg border border-white/80 bg-white/80 p-2 shadow-sm">
                      <label className="fc-label truncate" title="Frecuencia">Frecuencia</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          className="fc-input"
                          value={frequency.value}
                          onChange={(e) => updateField('frecuencia', e.target.value)}
                          placeholder="0"
                        />
                        <select
                          className="fc-input w-[96px]"
                          value={frequency.unit}
                          onChange={(e) => updateField('frecuenciaUnidad', e.target.value)}
                        >
                          <option value="hrs">hrs</option>
                          <option value="min">min</option>
                        </select>
                      </div>
                    </div>
                    <div className="rounded-lg border border-white/80 bg-white/80 p-2 shadow-sm"><FormInput label="F. Inicio" type="date" value={item.fechaInicio || ''} onChange={(e) => updateField('fechaInicio', e.target.value)} /></div>
                    {isSuspended && <div className="rounded-lg border border-white/80 bg-white/80 p-2 shadow-sm"><FormInput label="F. Suspensión" type="date" value={item.fechaSuspension || ''} onChange={(e) => updateField('fechaSuspension', e.target.value)} /></div>}
                    <div className="rounded-lg border border-white/80 bg-white/80 p-2 shadow-sm"><FormSelect label="Estado" value={item.estado || 'Activo'} onChange={(e) => updateStatus(e.target.value)} options={['Activo', 'Suspendido']} /></div>
                  </div>
                </div>

                <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-cyan-50 p-3 sm:p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center"><Activity className="w-4 h-4" /></div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Seguimiento</p>
                  </div>

                  {intervalMinutes <= 0 ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Define la frecuencia para generar el seguimiento de dosis en 24 horas.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-end gap-3">
                        <div className="min-w-[170px]">
                          <label className="fc-label">Fecha de primera dosis</label>
                          <input
                            type="date"
                            className="fc-input"
                            value={firstDoseDateValue}
                            onChange={(e) => updateField('seguimientoBaseDate', e.target.value)}
                          />
                        </div>
                        <div className="min-w-[170px]">
                          <label className="fc-label">Hora de primera dosis</label>
                          <input
                            type="time"
                            className="fc-input"
                            value={firstDose}
                            onChange={(e) => updateField('horaPrimeraDosis', e.target.value)}
                          />
                        </div>
                        <div className="min-w-[240px]">
                          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                            <input
                              type="checkbox"
                              className="w-4 h-4 rounded border-slate-300 text-emerald-600"
                              checked={useManualDoseCount}
                              onChange={(e) => updateField('seguimientoUsarCantidadDosis', e.target.checked)}
                            />
                            Definir cantidad de dosis
                          </label>
                          {useManualDoseCount && (
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              className="fc-input"
                              value={item.seguimientoDosisCantidad || ''}
                              onChange={(e) => updateField('seguimientoDosisCantidad', e.target.value)}
                              placeholder="Ej. 5"
                            />
                          )}
                        </div>
                      </div>

                      {(!firstDose || !firstDoseDateValue) && (
                        <p className="text-xs text-slate-600">Primero captura fecha y hora de la primera dosis para completar automáticamente las dosis siguientes.</p>
                      )}

                      {!useManualDoseCount && dosesPerDay > 0 && (
                        <p className="text-xs text-slate-600">Si no indicas cantidad, se generan automáticamente las dosis según la frecuencia.</p>
                      )}

                      {useManualDoseCount && !item.seguimientoDosisCantidad && (
                        <p className="text-xs text-slate-600">Activa la cantidad manual e ingresa el número de dosis para generar los campos.</p>
                      )}

                      {collisionAlerts.length > 0 && (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 space-y-1">
                          <p className="font-semibold">Choque de horarios detectado con otros medicamentos:</p>
                          {collisionAlerts.map((alert) => (
                            <p key={`${alert.doseLabel}-${alert.whenLabel}`}>
                              {alert.doseLabel} ({alert.whenLabel}) choca con: <span className="font-semibold">{alert.meds.join(', ')}</span>
                            </p>
                          ))}
                        </div>
                      )}

                      <div className="overflow-x-auto">
                        <div className="flex gap-2 min-w-max pb-1">
                          {Array.from({ length: displayedDoses }, (_, index) => (
                            <div key={`dose-col-${index}`} className="w-[150px] rounded-lg border border-emerald-200 bg-white p-2">
                              <p className="text-[11px] font-semibold text-emerald-700 mb-1">Dosis #{index + 1}</p>
                              {index === 0 ? (
                                <div className="space-y-1">
                                  <input
                                    type="date"
                                    className="fc-input"
                                    value={firstDoseDateValue}
                                    onChange={(e) => updateField('seguimientoBaseDate', e.target.value)}
                                  />
                                  <input
                                    type="time"
                                    className="fc-input"
                                    value={firstDose}
                                    onChange={(e) => updateField('horaPrimeraDosis', e.target.value)}
                                  />
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <input
                                    type="text"
                                    className="fc-input bg-slate-50"
                                    value={scheduleTimes[index]?.dateTimeLabel || '--/--/---- --:--'}
                                    readOnly
                                  />
                                  <input
                                    type="text"
                                    className="fc-input bg-slate-50"
                                    value={scheduleTimes[index]?.timeLabel || '--:--'}
                                    readOnly
                                  />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {displayedDoses === 0 && (
                        <p className="text-xs text-slate-600">No hay dosis para mostrar con la configuración actual.</p>
                      )}

                      {doseCountBase > displayedDoses && (
                        <p className="text-[11px] text-slate-500">Se muestran las primeras {displayedDoses} dosis para mantener la vista legible.</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-fuchsia-50 p-3 sm:p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center"><Layers className="w-4 h-4" /></div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">Detalle farmacoterapéutico</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                    <div className="rounded-lg border border-white/80 bg-white/85 p-2 shadow-sm"><FormSelect label="Presentación" value={item.presentacion || ''} onChange={(e) => updateField('presentacion', e.target.value)} options={PRESENTACIONES} /></div>
                    <div className="rounded-lg border border-white/80 bg-white/85 p-2 shadow-sm"><FormSelect label="Vía" value={item.via || ''} onChange={(e) => updateField('via', e.target.value)} options={VIAS} /></div>
                    <div className="rounded-lg border border-white/80 bg-white/85 p-2 shadow-sm"><FormSelect label="Idoneidad" value={item.idoneidad || 'Pendiente'} onChange={(e) => updateField('idoneidad', e.target.value)} options={IDONEIDAD_OPCIONES} /></div>
                    <div className="rounded-lg border border-white/80 bg-white/85 p-2 shadow-sm"><FormInput label="Volumen (mL)" type="number" value={item.volumen || ''} onChange={(e) => updateField('volumen', e.target.value)} /></div>
                    <div className="rounded-lg border border-white/80 bg-white/85 p-2 shadow-sm"><FormInput label="Tiempo (hr)" type="number" value={item.tiempo || ''} onChange={(e) => updateField('tiempo', e.target.value)} /></div>
                    <div className="rounded-lg border border-white/80 bg-white/85 p-2 shadow-sm"><FormInput label="Velocidad (mL/hr)" type="number" value={item.velocidad || ''} onChange={(e) => updateField('velocidad', e.target.value)} /></div>
                    <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-2 shadow-sm">
                      <label className="flex items-center gap-2 text-sm font-semibold text-amber-800 mb-1">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-amber-300 text-amber-600"
                          checked={item.quirofano === true}
                          onChange={(e) => updateField('quirofano', e.target.checked)}
                        />
                        Quirófano
                      </label>
                      <p className="text-[11px] text-amber-700">Resalta este medicamento en la tabla.</p>
                    </div>
                    <div className="rounded-lg border border-white/80 bg-white/90 p-2 shadow-sm md:col-span-2 xl:col-span-2">
                      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-slate-300 text-violet-600"
                          checked={item.prn === true}
                          onChange={(e) => updateField('prn', e.target.checked)}
                        />
                        PRN (Por Razón Necesaria)
                      </label>
                      <textarea
                        rows={2}
                        disabled={item.prn !== true}
                        placeholder="Especifica en qué situación se debe administrar este medicamento..."
                        className={`w-full border rounded-md shadow-sm sm:text-sm p-2 ${item.prn === true ? 'border-violet-300 bg-white text-slate-800 focus:border-violet-400 focus:ring-2 focus:ring-violet-100' : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                        value={item.prnSituacion || ''}
                        onChange={(e) => updateField('prnSituacion', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-3 sm:p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center"><FileText className="w-4 h-4" /></div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">Observaciones clínicas</p>
                  </div>
                  <div className="rounded-lg border border-white/85 bg-white/90 p-2 shadow-sm">
                    <div className="flex flex-col">
                      <label className="text-sm font-semibold text-slate-600 mb-1">Observaciones</label>
                      <textarea rows={4} className="border-slate-300 rounded-md shadow-sm sm:text-sm p-2 focus:border-blue-400 focus:ring-2 focus:ring-blue-100" value={item.observaciones || ''} onChange={(e) => updateField('observaciones', e.target.value)} />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50 to-sky-50 p-3 sm:p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-cyan-100 text-cyan-700 flex items-center justify-center"><ListChecks className="w-4 h-4" /></div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-cyan-700">Vista principal (orden de tabla)</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                    <div className="rounded-lg border border-white/80 bg-white/85 p-2 shadow-sm"><ReadOnlyField label="Categoría" value="Solución IV" /></div>
                    <div className="rounded-lg border border-white/80 bg-white/85 p-2 shadow-sm"><FormInput label="Principio Activo" value={item.solucion || ''} onChange={(e) => updateField('solucion', e.target.value)} /></div>
                    <div className="rounded-lg border border-white/80 bg-white/85 p-2 shadow-sm"><ReadOnlyField label="Marca Com." value="-" /></div>
                    <div className="rounded-lg border border-white/80 bg-white/85 p-2 shadow-sm"><FormInput label="Dosis" type="number" value={item.volumen || ''} onChange={(e) => updateField('volumen', e.target.value)} /></div>
                    <div className="rounded-lg border border-white/80 bg-white/85 p-2 shadow-sm"><FormInput label="F. Inicio" type="date" value={item.fechaInicio || ''} onChange={(e) => updateField('fechaInicio', e.target.value)} /></div>
                    <div className="rounded-lg border border-white/80 bg-white/85 p-2 shadow-sm"><FormSelect label="Estado" value={item.estado || 'Activo'} onChange={(e) => updateStatus(e.target.value)} options={['Activo', 'Suspendido']} /></div>
                  </div>
                </div>

                <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-violet-50 p-3 sm:p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center"><Layers className="w-4 h-4" /></div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-700">Detalle de infusión</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                    <div className="rounded-lg border border-white/80 bg-white/85 p-2 shadow-sm"><FormInput label="Tiempo (hr)" type="number" value={item.tiempo || ''} onChange={(e) => updateField('tiempo', e.target.value)} /></div>
                    <div className="rounded-lg border border-white/80 bg-white/85 p-2 shadow-sm"><FormInput label="Velocidad (mL/hr)" type="number" value={item.velocidad || ''} onChange={(e) => updateField('velocidad', e.target.value)} /></div>
                    <div className="rounded-lg border border-white/80 bg-white/85 p-2 shadow-sm"><FormInput label="Frecuencia" value={item.frecuencia || ''} onChange={(e) => updateField('frecuencia', e.target.value)} /></div>
                    {isSuspended && <div className="rounded-lg border border-white/80 bg-white/85 p-2 shadow-sm"><FormInput label="Fecha suspensión" type="date" value={item.fechaSuspension || ''} onChange={(e) => updateField('fechaSuspension', e.target.value)} /></div>}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="px-4 sm:px-5 py-3 border-t border-slate-200 bg-white/95 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">Edición visual optimizada para tablet y desktop.</p>
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:items-center">
              {!isSolution && onDuplicatePharmaToEgreso && (
                <button
                  onClick={() => onDuplicatePharmaToEgreso(item.id)}
                  className="px-4 py-2 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-semibold shadow-sm inline-flex items-center justify-center gap-2"
                  title="Duplicar este medicamento hacia Conciliación al Egreso"
                >
                  <Layers className="w-4 h-4" /> Duplicar a Conciliación Egreso
                </button>
              )}
              <button onClick={requestClose} className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-semibold shadow-sm">Cerrar detalle</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PrmTab({ patient, updatePatient }) {
  const prms = patient.prms || [];
  const interacciones = patient.interacciones || [];
  
  const addPrm = () => updatePatient({ prms: [...prms, { id: Date.now().toString(), fecha: new Date().toISOString().split('T')[0], area: patient.demographics.habitacion || '', medicamento: '', via: '', grupo: '', descripcion: '', categoria: '', analisis: '', causaRaiz: '', intervencion: '', descIntervencion: '', aceptacion: '', resolucion: '', gravedad: '', reportadoCalidad: 'No' }] });
  const updatePrm = (id, field, value) => updatePatient({ prms: prms.map(item => item.id === id ? { ...item, [field]: value } : item) });
  const removePrm = (id) => updatePatient({ prms: prms.filter(item => item.id !== id) });

  const addInteraccion = () => updatePatient({ interacciones: [...interacciones, { id: Date.now().toString(), fecha: new Date().toISOString().split('T')[0], medicamentos: '', grado: '', consecuencia: '' }] });
  const updateInteraccion = (id, field, value) => updatePatient({ interacciones: interacciones.map(item => item.id === id ? { ...item, [field]: value } : item) });
  const removeInteraccion = (id) => updatePatient({ interacciones: interacciones.filter(item => item.id !== id) });

  return (
    <div className="space-y-12">
      {/* SECCIÓN 1: PRM */}
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center border-b pb-2">
          <div><h2 className="text-2xl font-bold text-orange-700 flex items-center print:text-black"><FileWarning className="w-6 h-6 mr-2"/> Problemas Relacionados con Medicamentos (PRM)</h2></div>
          <button onClick={addPrm} className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded text-sm flex items-center justify-center font-medium print:hidden"><Plus className="w-4 h-4 mr-1" /> Registrar PRM</button>
        </div>
        <div className="grid gap-6">
          {prms.length === 0 && <div className="text-center p-8 bg-slate-50 border border-dashed border-slate-300 rounded-lg text-slate-500 print:bg-transparent">No hay PRMs registrados.</div>}
          {prms.map((item, index) => (
            <div key={item.id} className="bg-white border border-orange-200 shadow-sm rounded-lg p-5 relative print:border-slate-300 print:shadow-none">
              <button onClick={() => removePrm(item.id)} className="absolute top-4 right-4 text-slate-400 hover:text-red-600 print:hidden"><Trash2 className="w-5 h-5"/></button>
              <div className="text-xs font-bold text-orange-600 mb-3 print:text-black">PRM #{index + 1}</div>
              
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4 pr-6">
                <FormInput label="Fecha" type="date" value={item.fecha} onChange={(e) => updatePrm(item.id, 'fecha', e.target.value)} />
                <FormInput label="Área / Servicio" value={item.area} onChange={(e) => updatePrm(item.id, 'area', e.target.value)} />
                <FormInput label="Medicamento Involucrado" value={item.medicamento} onChange={(e) => updatePrm(item.id, 'medicamento', e.target.value)} />
                <FormSelect label="Vía" value={item.via} onChange={(e) => updatePrm(item.id, 'via', e.target.value)} options={VIAS} />
                <FormSelect label="Grupo / Clase" value={item.grupo} onChange={(e) => updatePrm(item.id, 'grupo', e.target.value)} options={CATEGORIAS_FARMACO} />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <FormSelect label="Categoría PRM" value={item.categoria} onChange={(e) => updatePrm(item.id, 'categoria', e.target.value)} options={CATEGORIAS_PRM} />
                <FormInput label="Análisis Categoría" value={item.analisis} onChange={(e) => updatePrm(item.id, 'analisis', e.target.value)} placeholder="Ej. Dosis sub-terapéutica..." />
                <FormInput label="Causa Raíz" value={item.causaRaiz} onChange={(e) => updatePrm(item.id, 'causaRaiz', e.target.value)} placeholder="Ej. Omisión de lectura de labs..." />
              </div>

              <div className="mb-4">
                <div className="flex flex-col"><label className="text-sm font-semibold text-slate-600 mb-1">Descripción del PRM</label><textarea value={item.descripcion} onChange={(e) => updatePrm(item.id, 'descripcion', e.target.value)} rows={2} className="border-slate-300 rounded-md shadow-sm sm:text-sm p-2 print:border-none print:bg-transparent"></textarea></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <FormInput label="Intervención Propuesta" value={item.intervencion} onChange={(e) => updatePrm(item.id, 'intervencion', e.target.value)} placeholder="Ej. Ajuste de dosis..." />
                <div className="flex flex-col col-span-2"><label className="text-sm font-semibold text-slate-600 mb-1">Descripción Intervención</label><textarea value={item.descIntervencion} onChange={(e) => updatePrm(item.id, 'descIntervencion', e.target.value)} rows={1} className="border-slate-300 rounded-md shadow-sm sm:text-sm p-2 print:border-none print:bg-transparent"></textarea></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100 print:bg-transparent print:border-none print:p-0">
                <FormSelect label="Aceptación (Médico)" value={item.aceptacion} onChange={(e) => updatePrm(item.id, 'aceptacion', e.target.value)} options={['Aceptada', 'Parcialmente Aceptada', 'No Aceptada']} />
                <FormSelect label="Resolución Final" value={item.resolucion} onChange={(e) => updatePrm(item.id, 'resolucion', e.target.value)} options={['Resuelto', 'No Resuelto']} />
                <FormSelect label="Gravedad" value={item.gravedad} onChange={(e) => updatePrm(item.id, 'gravedad', e.target.value)} options={['Leve', 'Moderada', 'Grave', 'Letal']} />
                <FormSelect label="¿Reportado a Calidad?" value={item.reportadoCalidad} onChange={(e) => updatePrm(item.id, 'reportadoCalidad', e.target.value)} options={['No', 'Sí']} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECCIÓN 2: INTERACCIONES */}
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center border-b pb-2">
          <div><h2 className="text-2xl font-bold text-amber-600 flex items-center print:text-black">Interacciones Medicamentosas</h2></div>
          <button onClick={addInteraccion} className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded text-sm flex items-center justify-center font-medium print:hidden"><Plus className="w-4 h-4 mr-1" /> Registrar Interacción</button>
        </div>
        <div className="grid gap-6">
          {interacciones.length === 0 && <div className="text-center p-8 bg-slate-50 border border-dashed border-slate-300 rounded-lg text-slate-500 print:bg-transparent">No hay interacciones registradas.</div>}
          {interacciones.map((item, index) => (
            <div key={item.id} className="bg-white border border-amber-200 shadow-sm rounded-lg p-5 relative print:border-slate-300 print:shadow-none">
              <button onClick={() => removeInteraccion(item.id)} className="absolute top-4 right-4 text-slate-400 hover:text-red-600 print:hidden"><Trash2 className="w-5 h-5"/></button>
              <div className="text-xs font-bold text-amber-600 mb-3 print:text-black">Interacción #{index + 1}</div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 pr-6">
                <FormInput label="Fecha" type="date" value={item.fecha} onChange={(e) => updateInteraccion(item.id, 'fecha', e.target.value)} />
                <FormSelect label="Grado de Interacción" value={item.grado} onChange={(e) => updateInteraccion(item.id, 'grado', e.target.value)} options={['Contraindicada', 'Mayor', 'Moderada', 'Menor']} />
                <div className="col-span-2"><FormInput label="Medicamentos que Interactúan (Ej. Fármaco A + Fármaco B)" value={item.medicamentos} onChange={(e) => updateInteraccion(item.id, 'medicamentos', e.target.value)} /></div>
              </div>
              <div className="flex flex-col"><label className="text-sm font-semibold text-slate-600 mb-1">Consecuencia (¿Qué puede pasar?)</label><textarea value={item.consecuencia} onChange={(e) => updateInteraccion(item.id, 'consecuencia', e.target.value)} rows={2} className="border-slate-300 rounded-md shadow-sm sm:text-sm p-2 print:border-none print:bg-transparent" placeholder="Describe los efectos clínicos de la interacción..."></textarea></div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// COMPONENTE: Mini Gráfico Evolutivo de Laboratorios
function Sparkline({ data }) {
  if (!data || data.length < 2) return null;
  const values = data.map(d => Number(d.value)).filter(v => !isNaN(v) && v !== null && v !== 0); // Omitimos ceros o vacíos
  if (values.length < 2) return null;
  
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = (max - min) || 1; // Evita div/0 si son iguales
  
  const width = 80;
  const height = 24;
  const padding = 3;
  
  const points = values.map((v, i) => {
    const x = padding + (i / (values.length - 1)) * (width - 2 * padding);
    const y = padding + (height - 2 * padding) - ((v - min) / range) * (height - 2 * padding);
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible" title="Tendencia histórica del paciente">
      <polyline points={points} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {values.map((v, i) => {
        const x = padding + (i / (values.length - 1)) * (width - 2 * padding);
        const y = padding + (height - 2 * padding) - ((v - min) / range) * (height - 2 * padding);
        return <circle key={i} cx={x} cy={y} r="2.5" fill="#1d4ed8" />
      })}
    </svg>
  );
}

const calculateCkdEpi2021 = (age, gender, creatinine) => {
  const ageNum = Number(age);
  const creatNum = Number(creatinine);
  const isFemale = gender === 'Femenino';
  const isMale = gender === 'Masculino';

  if (!Number.isFinite(ageNum) || ageNum <= 0 || !Number.isFinite(creatNum) || creatNum <= 0 || (!isFemale && !isMale)) {
    return '';
  }

  const k = isFemale ? 0.7 : 0.9;
  const alpha = isFemale ? -0.241 : -0.302;
  const ratio = creatNum / k;
  const minPart = Math.pow(Math.min(ratio, 1), alpha);
  const maxPart = Math.pow(Math.max(ratio, 1), -1.2);
  const sexFactor = isFemale ? 1.012 : 1;
  const egfr = 142 * minPart * maxPart * Math.pow(0.9938, ageNum) * sexFactor;

  if (!Number.isFinite(egfr) || egfr <= 0) return '';
  return egfr.toFixed(1);
};

function LabsTab({ patient, updatePatient }) {
  const labs = patient.labs || {};
  const d = patient.demographics;
  const { years: age } = calculateAge(d.fechaNacimiento);
  
  const creatData = labs["Creatinina Sérica"] || [];
  const latestCreat = creatData.length > 0 ? creatData[creatData.length - 1].value : '';

  const pesoRealNum = Number(d.peso);
  const pesoIdealRaw = calculateIdealWeight(d.altura, d.genero);
  const pesoIdealNum = Number(pesoIdealRaw);

  const pesoRealValido = Number.isFinite(pesoRealNum) && pesoRealNum > 0;
  const pesoIdealValido = Number.isFinite(pesoIdealNum) && pesoIdealNum > 0;

  let pesoDosificacion = '';

  if (pesoRealValido && pesoIdealValido) {
    if (pesoRealNum < pesoIdealNum) {
      pesoDosificacion = pesoRealNum.toFixed(1);
    } else if (pesoRealNum > (pesoIdealNum * 1.2)) {
      const pesoAjustadoNum = Number(calculateAdjustedWeight(d.peso, pesoIdealRaw));
      if (Number.isFinite(pesoAjustadoNum) && pesoAjustadoNum > 0) {
        pesoDosificacion = pesoAjustadoNum.toFixed(1);
      } else {
        pesoDosificacion = pesoIdealNum.toFixed(1);
      }
    } else {
      pesoDosificacion = pesoIdealNum.toFixed(1);
    }
  } else if (pesoRealValido) {
    pesoDosificacion = pesoRealNum.toFixed(1);
  }

  const crcl = calculateCrCl(age, pesoDosificacion, d.genero, latestCreat);
  const ckdEpi = calculateCkdEpi2021(age, d.genero, latestCreat);

  const addLabEntry = (paramName) => {
    const currentData = labs[paramName] || [];
    updatePatient({ labs: { ...labs, [paramName]: [...currentData, { id: Date.now().toString(), date: new Date().toISOString().split('T')[0], value: '' }] } });
  };
  
  const updateLabEntry = (paramName, id, field, value) => {
    const currentData = labs[paramName] || [];
    updatePatient({ labs: { ...labs, [paramName]: currentData.map(item => item.id === id ? { ...item, [field]: value } : item) } });
  };

  const removeLabEntry = (paramName, id) => {
    const currentData = labs[paramName] || [];
    updatePatient({ labs: { ...labs, [paramName]: currentData.filter(item => item.id !== id) } });
  };

  const labGroupEntries = Object.entries(LAB_TEMPLATES);
  const preferredGroupOrder = ['Función Renal', 'Marcadores de Infección / Inflamación'];
  const orderedLabGroups = [
    ...preferredGroupOrder
      .map((name) => labGroupEntries.find(([groupName]) => groupName === name))
      .filter(Boolean),
    ...labGroupEntries.filter(([groupName]) => !preferredGroupOrder.includes(groupName)),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-end border-b pb-2">
        <h2 className="text-2xl font-bold text-slate-800">Resultados Históricos de Laboratorio</h2>
        <div className="flex flex-col sm:flex-row gap-2 print:hidden">
          <div className={`px-3 py-2 rounded-lg border shadow-sm min-w-[220px] ${getTfgColorClass(crcl)}`}>
            <div className="flex items-center gap-1.5">
              <Activity className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase">TFG EST. (COCKCROFT-GAULT)</span>
            </div>
            <p className="text-3xl leading-none font-black mt-1">{crcl || '-'} <span className="text-base font-medium">mL/min</span></p>
          </div>

          <div className={`px-3 py-2 rounded-lg border shadow-sm min-w-[220px] ${getTfgColorClass(ckdEpi)}`}>
            <div className="flex items-center gap-1.5">
              <Activity className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase">TFG EST. (CKD-EPI 2021)</span>
            </div>
            <p className="text-3xl leading-none font-black mt-1">{ckdEpi || '-'} <span className="text-[13px] font-medium">mL/min/1.73m2</span></p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {orderedLabGroups.map(([groupName, params]) => (
          <div key={groupName} className="bg-white border rounded-xl shadow-sm overflow-hidden print:shadow-none print:border-slate-300">
            <h3 className="bg-slate-100 p-3 font-bold text-slate-700 border-b print:bg-slate-100">{groupName}</h3>
            <div className="p-4 space-y-4">
              {params.map(param => {
                const labData = labs[param.name] || [];
                
                return (
                  <div key={param.name} className="flex flex-col border-b border-dashed border-slate-200 pb-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center mb-2">
                        <div>
                          <span className="block text-sm font-bold text-slate-700">{param.name}</span>
                          <span className="block text-xs text-slate-400">Rango: {param.min !== null ? `${param.min}-${param.max}` : 'N/A'} {param.unit}</span>
                        </div>
                      <div className="flex items-center gap-2 self-start sm:self-auto">
                           <Sparkline data={labData} />
                           <button onClick={() => addLabEntry(param.name)} className="text-[10px] uppercase font-bold bg-blue-50 hover:bg-blue-100 text-blue-600 px-2 py-1.5 rounded flex items-center transition-colors print:hidden"><Plus className="w-3 h-3 mr-1"/> Añadir Dato</button>
                        </div>
                     </div>
                     
                     {labData.length > 0 ? (
                       <div className="space-y-1.5 mt-1">
                          {labData.map((entry) => {
                             const isOutOfRange = entry.value && param.min !== null && (Number(entry.value) < param.min || Number(entry.value) > param.max);
                             return (
                               <div key={entry.id} className="flex flex-wrap items-center gap-2 bg-slate-50 p-1.5 rounded-md border border-slate-100 print:bg-transparent print:border-none print:p-0">
                                 <input type="date" value={entry.date} onChange={(e) => updateLabEntry(param.name, entry.id, 'date', e.target.value)} className="text-xs p-1 border border-slate-200 rounded w-full sm:w-28 print:border-none print:p-0" />
                                 <input type="number" step="0.01" value={entry.value} onChange={(e) => updateLabEntry(param.name, entry.id, 'value', e.target.value)} className={`text-xs p-1 border rounded w-full sm:flex-1 ${isOutOfRange ? 'border-red-400 bg-red-100 text-red-800 font-bold' : 'border-slate-200'} print:border-none print:p-0`} placeholder="Resultado..." />
                                 <span className="text-xs text-slate-500 w-full sm:w-10 sm:text-right">{param.unit}</span>
                                 <button onClick={() => removeLabEntry(param.name, entry.id)} className="text-red-400 hover:text-red-600 sm:ml-2 print:hidden" title="Borrar este registro"><X className="w-4 h-4"/></button>
                               </div>
                             );
                          })}
                       </div>
                     ) : (
                       <span className="text-xs text-slate-400 italic">Sin datos registrados.</span>
                     )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MicrobiologyTab({ patient, updatePatient }) {
  const items = patient.microbiologia || [];
  
  const addItem = () => updatePatient({ microbiologia: [...items, { id: Date.now().toString(), fechaMuestra: new Date().toISOString().split('T')[0], tipoMuestra: '', sitioCultivo: '', microorganismo: '', sensibles: '', resistentes: '', observaciones: '' }] });
  const updateItem = (id, field, value) => updatePatient({ microbiologia: items.map(item => item.id === id ? { ...item, [field]: value } : item) });
  const removeItem = (id) => updatePatient({ microbiologia: items.filter(item => item.id !== id) });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center border-b pb-2">
        <div><h2 className="text-2xl font-bold text-purple-800 flex items-center print:text-black"><Microscope className="w-6 h-6 mr-2"/> Microbiología y Antibiograma</h2></div>
        <button onClick={addItem} className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded text-sm flex items-center justify-center font-medium print:hidden"><Plus className="w-4 h-4 mr-1" /> Nueva Muestra</button>
      </div>
      <div className="grid gap-6">
        {items.length === 0 && <div className="text-center p-8 bg-slate-50 border border-dashed border-slate-300 rounded-lg text-slate-500 print:bg-transparent">No hay cultivos ni aislamientos registrados.</div>}
        {items.map(item => (
          <div key={item.id} className="bg-white border border-purple-200 shadow-sm rounded-lg p-5 relative print:border-slate-300 print:shadow-none">
            <button onClick={() => removeItem(item.id)} className="absolute top-4 right-4 text-slate-400 hover:text-red-600 print:hidden"><Trash2 className="w-5 h-5"/></button>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 pr-8">
              <FormInput label="Fecha de Toma" type="date" value={item.fechaMuestra} onChange={(e) => updateItem(item.id, 'fechaMuestra', e.target.value)} />
              <FormInput label="Tipo de Muestra" value={item.tipoMuestra} onChange={(e) => updateItem(item.id, 'tipoMuestra', e.target.value)} placeholder="Ej. Hemocultivo, Urocultivo..." />
              <FormInput label="Sitio de Toma" value={item.sitioCultivo} onChange={(e) => updateItem(item.id, 'sitioCultivo', e.target.value)} placeholder="Ej. Catéter, Sonda..." />
              <FormInput label="Microorganismo Aislado" value={item.microorganismo} onChange={(e) => updateItem(item.id, 'microorganismo', e.target.value)} placeholder="Dejar vacío si negativo"/>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="flex flex-col"><label className="text-sm font-semibold text-green-700 mb-1">Sensibilidad (S)</label><textarea value={item.sensibles} onChange={(e) => updateItem(item.id, 'sensibles', e.target.value)} rows={2} className="border-green-300 bg-green-50 rounded-md shadow-sm sm:text-sm p-2 print:border-none print:bg-transparent" placeholder="Antibióticos sensibles..."></textarea></div>
              <div className="flex flex-col"><label className="text-sm font-semibold text-red-700 mb-1">Resistencia (R)</label><textarea value={item.resistentes} onChange={(e) => updateItem(item.id, 'resistentes', e.target.value)} rows={2} className="border-red-300 bg-red-50 rounded-md shadow-sm sm:text-sm p-2 print:border-none print:bg-transparent" placeholder="Antibióticos resistentes..."></textarea></div>
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-semibold text-slate-600 mb-1">Observaciones (MIC, BLEE, KPC, etc.)</label>
              <input type="text" value={item.observaciones} onChange={(e) => updateItem(item.id, 'observaciones', e.target.value)} className="w-full border-slate-300 rounded-md shadow-sm sm:text-sm px-3 py-2 print:border-none print:bg-transparent" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RamTab({ patient, updatePatient }) {
  const items = patient.ram || [];
  const addItem = () => updatePatient({ ram: [...items, { id: Date.now().toString(), medicamento: '', fecha: new Date().toISOString().split('T')[0], severidad: 'Leve', gravedad: 'No grave', quePaso: '', queSeHizo: '' }] });
  const updateItem = (id, field, value) => updatePatient({ ram: items.map(item => item.id === id ? { ...item, [field]: value } : item) });
  const removeItem = (id) => updatePatient({ ram: items.filter(item => item.id !== id) });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center border-b pb-2">
        <div><h2 className="text-2xl font-bold text-red-700 flex items-center print:text-black"><ShieldAlert className="w-6 h-6 mr-2"/> Reacciones Adversas (RAM)</h2></div>
        <button onClick={addItem} className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-sm flex items-center justify-center font-medium print:hidden"><Plus className="w-4 h-4 mr-1" /> Registrar RAM</button>
      </div>
      <div className="grid gap-6">
        {items.length === 0 && <div className="text-center p-8 bg-slate-50 border border-dashed border-slate-300 rounded-lg text-slate-500 print:bg-transparent">Sin sospechas de RAM documentadas.</div>}
        {items.map(item => (
          <div key={item.id} className="bg-white border-2 border-red-100 shadow-sm rounded-lg p-5 relative print:border-slate-300 print:shadow-none">
            <button onClick={() => removeItem(item.id)} className="absolute top-4 right-4 text-slate-400 hover:text-red-600 print:hidden"><Trash2 className="w-5 h-5"/></button>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 pr-8">
              <div className="col-span-2"><FormInput label="Medicamento Sospechoso" value={item.medicamento} onChange={(e) => updateItem(item.id, 'medicamento', e.target.value)} /></div>
              <FormInput label="Fecha" type="date" value={item.fecha} onChange={(e) => updateItem(item.id, 'fecha', e.target.value)} />
              <div className="flex space-x-2">
                <FormSelect label="Severidad" value={item.severidad} onChange={(e) => updateItem(item.id, 'severidad', e.target.value)} options={["Leve", "Moderada", "Severa"]} />
                <FormSelect label="Gravedad" value={item.gravedad} onChange={(e) => updateItem(item.id, 'gravedad', e.target.value)} options={["No grave", "Grave"]} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col"><label className="text-sm font-semibold text-slate-600 mb-1">¿Qué pasó? (Descripción clínica)</label><textarea value={item.quePaso} onChange={(e) => updateItem(item.id, 'quePaso', e.target.value)} rows={3} className="border-slate-300 rounded-md shadow-sm sm:text-sm p-2 print:border-none print:bg-transparent"></textarea></div>
              <div className="flex flex-col"><label className="text-sm font-semibold text-slate-600 mb-1">¿Qué se hizo? (Intervención)</label><textarea value={item.queSeHizo} onChange={(e) => updateItem(item.id, 'queSeHizo', e.target.value)} rows={3} className="border-slate-300 rounded-md shadow-sm sm:text-sm p-2 print:border-none print:bg-transparent" placeholder="Ej. Suspensión, antídoto, reporte Cofepris..."></textarea></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FormInput({ label, name, type = "text", value = "", onChange, placeholder }) {
  return (
    <div className="flex flex-col">
      <label className="fc-label truncate" title={label}>{label}</label>
      <input type={type} name={name} value={value || ''} onChange={onChange} placeholder={placeholder} className="fc-input print:border-none print:bg-transparent print:p-0 print:font-medium print:text-slate-800" />
    </div>
  );
}

function FormSelect({ label, name, value = "", onChange, options }) {
  return (
    <div className="flex flex-col w-full">
      <label className="fc-label truncate" title={label}>{label}</label>
      <select name={name} value={value || ''} onChange={onChange} className="fc-input print:appearance-none print:border-none print:bg-transparent print:p-0 print:font-medium print:text-slate-800">
        <option value="">Sel...</option>{options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );
}

function ReadOnlyField({ label, value }) {
  return (
    <div className="flex flex-col justify-end">
      <span className="fc-label truncate" title={label}>{label}</span>
      <div className="bg-slate-100 p-2 rounded-lg border border-slate-200 h-[40px] flex items-center justify-center font-mono text-sm print:border-none print:bg-transparent print:p-0 print:justify-start print:font-medium print:text-slate-800">{value || '-'}</div>
    </div>
  );
}

  return {
    DemographicsTab,
    ConciliationTab,
    PharmacotherapyTab,
    PrmTab,
    LabsTab,
    MicrobiologyTab,
    RamTab,
  };
}
