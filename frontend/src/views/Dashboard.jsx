import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, AlertTriangle, Bell, Bug, Calendar, CheckCircle, CheckSquare, ClipboardList, Clock3, FileSpreadsheet, FileWarning, Filter, ListChecks, Pencil, PieChart, Plus, RefreshCcw, Search, ShieldAlert, TestTube, Trash2, Upload, UserPlus, Users, X, XCircle } from 'lucide-react';

// Helper para visualización en Dashboard Calidad
const StatusBadge = ({ done, isNA }) => {
  if (isNA) return <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded text-xs font-bold border border-slate-200">N/A</span>;
  if (done) return <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold flex items-center justify-center w-max mx-auto border border-green-200"><CheckCircle className="w-3 h-3 mr-1"/> Realizada</span>;
  return <span className="px-2 py-1 bg-red-50 text-red-600 rounded text-xs font-bold flex items-center justify-center w-max mx-auto border border-red-200"><XCircle className="w-3 h-3 mr-1"/> Pendiente</span>;
}

const getNextReminderDateTime = (minutes = 30) => {
  const next = new Date();
  next.setMinutes(next.getMinutes() + minutes, 0, 0);
  const local = new Date(next.getTime() - next.getTimezoneOffset() * 60000);
  return {
    date: local.toISOString().slice(0, 10),
    time: local.toISOString().slice(11, 16),
  };
};

export default function Dashboard({ patients, dilutionsTable, onDilutionsTableChange, reminders = [], onCreateReminder, onSelect, onCreate, onDelete, onRestore, onHardDelete, currentUser, users, helpers, constants }) {
  const { calculateAge, calculateDaysOfUse, calculateCrCl, getTfgColorClass, listOtherActiveUsers, formatExcelDate, exportToCSV } = helpers;
  const { ADULTO_MAYOR_EDAD, CATEGORIAS_PRM, MESES, ANIOS } = constants;
  const [dashboardTab, setDashboardTab] = useState('pacientes'); 
  const [view, setView] = useState('activos'); 
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [patientColumnFilter, setPatientColumnFilter] = useState({ key: '', direction: '' });

  // PRM Filters
  const [filterPrmCategory, setFilterPrmCategory] = useState('');
  const [filterPrmGravity, setFilterPrmGravity] = useState('');
  const [dilutionsError, setDilutionsError] = useState('');
  const [dilutionMedicationSearch, setDilutionMedicationSearch] = useState('');
  const [dilutionModal, setDilutionModal] = useState({ open: false, mode: 'create', rowId: '', form: {} });
  const [dilutionDeleteTarget, setDilutionDeleteTarget] = useState(null);
  const [reminderError, setReminderError] = useState('');
  const [reminderStatus, setReminderStatus] = useState('');
  const [generalExportModal, setGeneralExportModal] = useState({ open: false, year: '', months: [] });
  const [generalExportError, setGeneralExportError] = useState('');
  const [reminderForm, setReminderForm] = useState(() => {
    const nextDateTime = getNextReminderDateTime(30);
    return {
      patientId: '',
      date: nextDateTime.date,
      time: nextDateTime.time,
      importance: 'media',
      description: '',
    };
  });
  const dilutionFileInputRef = useRef(null);
  const isDilutionAdmin = currentUser?.role === 'admin';
  const defaultDilutionColumns = [
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
  const dilutionColumns = Array.isArray(dilutionsTable?.columns) && dilutionsTable.columns.length > 0
    ? dilutionsTable.columns
    : defaultDilutionColumns;
  const dilutionRows = Array.isArray(dilutionsTable?.rows) ? dilutionsTable.rows : [];

  const normalizeDilutionHeader = (value = '') => {
    const normalized = String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

    // Compatibilidad con archivos antiguos que traen el typo "SEURIDAD".
    return normalized === 'SEURIDAD' ? 'SEGURIDAD' : normalized;
  };

  const normalizeSearchValue = (value = '') => String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  const filteredDilutionRows = useMemo(() => {
    const term = normalizeSearchValue(dilutionMedicationSearch);
    if (!term) return dilutionRows;

    return dilutionRows.filter((row) => {
      const medValue = normalizeSearchValue(row?.MEDICAMENTO);
      return medValue.includes(term);
    });
  }, [dilutionRows, dilutionMedicationSearch]);

  const splitDilutionCellItems = (value = '') => {
    const text = String(value ?? '').replace(/\r/g, '\n').trim();
    if (!text) return [];

    if (text.includes('>')) {
      const items = text
        .split('>')
        .map((item) => item.trim())
        .filter(Boolean);
      if (items.length > 0) return items;
    }

    return text
      .split(/\n+/)
      .map((item) => item.trim())
      .filter(Boolean);
  };

  const renderDilutionCell = (value) => {
    const items = splitDilutionCellItems(value);

    if (!items.length) {
      return <span className="text-slate-300 text-sm">-</span>;
    }

    if (items.length === 1) {
      return <span className="text-sm text-slate-700 leading-relaxed break-words whitespace-pre-wrap">{items[0]}</span>;
    }

    return (
      <ul className="space-y-1.5">
        {items.map((item, index) => (
          <li key={`dilution-item-${index}-${item.slice(0, 16)}`} className="text-sm text-slate-700 leading-relaxed flex gap-2">
            <span className="text-cyan-600 font-bold pt-[2px]">•</span>
            <span className="break-words whitespace-pre-wrap">{item}</span>
          </li>
        ))}
      </ul>
    );
  };

  const activePatientsForReminders = useMemo(
    () => (patients || []).filter((patient) => !patient.deleted && !patient.demographics?.egreso),
    [patients],
  );

  const reminderRows = useMemo(() => {
    if (!Array.isArray(reminders)) return [];
    return reminders;
  }, [reminders]);

  useEffect(() => {
    if (activePatientsForReminders.length === 0) {
      if (reminderForm.patientId) {
        setReminderForm((prev) => ({ ...prev, patientId: '' }));
      }
      return;
    }

    const hasValidPatient = activePatientsForReminders.some((patient) => patient.id === reminderForm.patientId);
    if (!hasValidPatient) {
      setReminderForm((prev) => ({ ...prev, patientId: activePatientsForReminders[0].id }));
    }
  }, [activePatientsForReminders, reminderForm.patientId]);

  useEffect(() => {
    if (!isDilutionAdmin && dashboardTab === 'diluciones') {
      setDashboardTab('pacientes');
    }
  }, [dashboardTab, isDilutionAdmin]);

  const handleCreateReminder = async () => {
    if (typeof onCreateReminder !== 'function') return;

    setReminderError('');
    setReminderStatus('');

    const result = await Promise.resolve(onCreateReminder(reminderForm));
    if (!result?.ok) {
      setReminderError(result?.message || 'No se pudo crear el recordatorio.');
      return;
    }

    const nextDateTime = getNextReminderDateTime(30);
    setReminderForm((prev) => ({
      ...prev,
      date: nextDateTime.date,
      time: nextDateTime.time,
      description: '',
    }));
    setReminderStatus('Recordatorio creado y guardado correctamente.');
  };

  const getRoomNumber = (habitacion = '') => {
    const match = String(habitacion || '').match(/\d+/);
    return match ? Number(match[0]) : null;
  };

  const matchesMonthYearFilter = (patient, options = {}) => {
    const useEgresoDate = options.useEgresoDate === true;
    const dateToFilter = useEgresoDate
      ? patient?.demographics?.egreso
      : patient?.demographics?.ingreso;
    if (!filterMonth && !filterYear) return true;
    if (!dateToFilter) return false;

    const [y, m] = String(dateToFilter).split('-');
    if (filterYear && y !== filterYear) return false;
    if (filterMonth && m !== filterMonth) return false;
    return true;
  };

  // Lógica de Filtros y Vistas General
  const filteredPatients = patients.filter(p => {
    if (view === 'papelera') {
      if (!p.deleted) return false;
    } else {
      if (p.deleted) return false;
      if (view === 'activos' && p.demographics.egreso) return false;
      if (view === 'egresados' && !p.demographics.egreso) return false;
    }

    if (!matchesMonthYearFilter(p, { useEgresoDate: view === 'egresados' })) return false;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        (p.demographics.nombre && p.demographics.nombre.toLowerCase().includes(term)) ||
        (p.demographics.habitacion && p.demographics.habitacion.toLowerCase().includes(term))
      );
    }
    return true;
  });

  const getPatientColumnValue = (patient, key) => {
    switch (key) {
      case 'ingreso':
        return patient.demographics.ingreso ? new Date(`${patient.demographics.ingreso.slice(0, 10)}T00:00:00`).getTime() : 0;
      case 'paciente':
        return patient.demographics.nombre || '';
      case 'ubicacion':
        return getRoomNumber(patient.demographics.habitacion) ?? (patient.demographics.habitacion || '');
      case 'diagnostico':
        return patient.demographics.diagnosticoPrincipal || '';
      case 'estancia':
        return calculateDaysOfUse(patient.demographics.ingreso, patient.demographics.egreso);
      case 'medsActivos':
        return (patient.perfilFarmaco || []).filter(f => f.estado === 'Activo').length;
      default:
        return '';
    }
  };

  const togglePatientColumnFilter = (columnKey) => {
    setPatientColumnFilter(prev => {
      if (prev.key !== columnKey) return { key: columnKey, direction: 'asc' };
      return { key: columnKey, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
    });
  };

  const getPatientColumnIndicator = (columnKey) => {
    if (patientColumnFilter.key !== columnKey) return '↕';
    return patientColumnFilter.direction === 'asc' ? '↑' : '↓';
  };

  const patientRows = useMemo(() => {
    const rows = [...filteredPatients];
    const { key, direction } = patientColumnFilter;
    if (!key || !direction) return rows;

    const factor = direction === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      const aValue = getPatientColumnValue(a, key);
      const bValue = getPatientColumnValue(b, key);

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return (aValue - bValue) * factor;
      }

      return String(aValue).localeCompare(String(bValue), 'es', { sensitivity: 'base', numeric: true }) * factor;
    });

    return rows;
  }, [filteredPatients, patientColumnFilter]);

  // Métricas de Pacientes
  const activeCount = patients.filter(p => !p.deleted && !p.demographics.egreso).length;
  const dischargedCount = patients.filter((p) => {
    if (p.deleted || !p.demographics.egreso) return false;
    if (view !== 'egresados') return true;
    return matchesMonthYearFilter(p, { useEgresoDate: true });
  }).length;
  const atbCount = patients.filter((p) => {
    if (p.deleted) return false;
    if (view === 'egresados') {
      if (!p.demographics.egreso) return false;
      if (!matchesMonthYearFilter(p, { useEgresoDate: true })) return false;
    } else if (p.demographics.egreso) {
      return false;
    }

    return p.perfilFarmaco.some((f) => f.categoria === 'Antibiótico' && f.estado === 'Activo');
  }).length;
  const altoRiesgoCount = patients.filter((p) => {
    if (p.deleted) return false;
    if (view === 'egresados') {
      if (!p.demographics.egreso) return false;
      if (!matchesMonthYearFilter(p, { useEgresoDate: true })) return false;
    } else if (p.demographics.egreso) {
      return false;
    }

    return p.perfilFarmaco.some((f) => f.categoria === 'Alto Riesgo' && f.estado === 'Activo');
  }).length;

  // Lógica para Vista de PRM
  let allPrms = [];
  if (dashboardTab === 'prms') {
    filteredPatients.forEach(p => {
      if(p.prms) {
        p.prms.forEach(prm => {
           allPrms.push({
             ...prm,
             patientId: p.id,
             patientName: p.demographics.nombre,
             patientExp: p.demographics.numeroPaciente,
             patientFv: p.demographics.identificadorInterno
           });
        });
      }
    });
    if (filterPrmCategory) allPrms = allPrms.filter(p => p.categoria === filterPrmCategory);
    if (filterPrmGravity) allPrms = allPrms.filter(p => p.gravedad === filterPrmGravity);
    allPrms.sort((a,b) => new Date(b.fecha) - new Date(a.fecha));
  }

  // Lógica para Vista PROA
  let allMicros = [];
  if (dashboardTab === 'proa') {
     filteredPatients.forEach(p => {
        if(p.microbiologia) {
           p.microbiologia.forEach(m => {
              allMicros.push({
                 ...m,
                 patientId: p.id,
                 patientName: p.demographics.nombre,
                 patientExp: p.demographics.numeroPaciente,
                 patientFv: p.demographics.identificadorInterno,
                 diagnostico: p.demographics.diagnosticoPrincipal || 'N/A',
                 tipoPaciente: p.demographics.tipoPaciente || 'N/A',
                 atbActivos: p.perfilFarmaco.filter(f => f.categoria === 'Antibiótico' && f.estado === 'Activo').map(f => f.principio).join(', ') || 'Ninguno',
                 maxDiasATB: Math.max(0, ...p.perfilFarmaco.filter(f => f.categoria === 'Antibiótico' && f.estado === 'Activo').map(atb => calculateDaysOfUse(atb.fechaInicio, p.demographics.egreso)))
              });
           });
        }
     });
     allMicros.sort((a,b) => new Date(b.fechaMuestra) - new Date(a.fechaMuestra));
  }

  // Métricas para Dashboard de Calidad
  const totalPacientesCalidad = filteredPatients.length;
  const idoneidadCount = filteredPatients.filter(p => p.perfilFarmacoMeta?.evaluadoPrevioPrimeraDosis).length;
  const ingresoCount = filteredPatients.filter(p => p.conciliacion.ingresoNA || p.conciliacion.ingreso.length > 0).length;
  const egresoCount = filteredPatients.filter(p => p.conciliacion.egresoNA || p.conciliacion.egreso.length > 0).length;

  const formatConciliacionEgresoExport = (conciliacion = {}) => {
    if (conciliacion.egresoNA) {
      const motivo = String(conciliacion.egresoNAMotivo || '').trim();
      return motivo ? `NA - Motivo: ${motivo}` : 'NA';
    }

    return Array.isArray(conciliacion.egreso) && conciliacion.egreso.length > 0 ? 'Sí' : 'No';
  };

  const getGrupoEtarioExport = (years) => {
    const age = Number(years);
    if (!Number.isFinite(age) || age < 0) return '';
    if (age < 18) return 'Niño';
    if (age >= ADULTO_MAYOR_EDAD) return 'Adulto mayor';
    return 'Adulto';
  };

  const handleExportGeneral = () => {
    const rows = [
      [
        "Identificador interno (FV)", "N° Expediente", "Habitación", "Nombre del paciente", "Fecha de nacimiento", 
        "Edad", "Grupo etario", "Genero", "Episodio", "Fecha de ingreso DD/MM/AA HH:MM", 
        "Fecha de egreso DD/MM/AA HH:MM", "Días internado", "Diagnostico", 
        "Motivo de ingreso / Procedimiento", "Tipo de paciente", "Medico tratante", 
        "Alergias", "Especialidad", "Observaciones Generales", "Idoneidad (1ra Dosis)", "Conc. Ingreso", "Conc. Cambio Área", 
        "Conc. Cambio Médico", "Conc. Egreso", "MAR", "Polifarmacia >5 med", "\"Antibiótico ¿Cuales?\"", "Cultivos"
      ]
    ];
    
    filteredPatients.forEach(p => {
      const { years } = calculateAge(p.demographics.fechaNacimiento);
      const grupoEtario = getGrupoEtarioExport(years);
      const estancia = calculateDaysOfUse(p.demographics.ingreso, p.demographics.egreso);
      
      const valIdoneidad = p.perfilFarmacoMeta?.evaluadoPrevioPrimeraDosis ? 'Sí' : 'No';
      const cIng = p.conciliacion.ingresoNA ? 'NA' : (p.conciliacion.ingreso.length > 0 ? 'Sí' : 'No');
      const cArea = p.conciliacion.transicionAreaNA ? 'NA' : (p.conciliacion.transicionesArea?.length > 0 ? 'Sí' : 'No');
      const cMedico = p.conciliacion.transicionMedicoNA ? 'NA' : (p.conciliacion.transicionMedico ? 'Sí' : 'No');
      const cEgr = formatConciliacionEgresoExport(p.conciliacion || {});
      
      const activos = p.perfilFarmaco.filter(f => f.estado === 'Activo');
      const poli = activos.length > 5 ? 'Sí' : 'No';
      
      const marActivos = p.perfilFarmaco.filter(f => f.categoria === 'Alto Riesgo');
      const marString = marActivos.length > 0 ? `Sí: ${marActivos.map(f=>f.principio).join(', ')}` : 'No';
      
      const atbActivos = p.perfilFarmaco.filter(f => f.categoria === 'Antibiótico');
      const atbString = atbActivos.length > 0 ? atbActivos.map(f=>f.principio).join(', ') : 'Ninguno';
      
      const aislamientos = p.microbiologia.map(m => m.microorganismo).filter(x => x).join(', ') || 'Ninguno';

      rows.push([
        p.demographics.identificadorInterno || p.id, p.demographics.numeroPaciente, p.demographics.habitacion, p.demographics.nombre, p.demographics.fechaNacimiento,
        years, grupoEtario, p.demographics.genero, p.demographics.numeroEpisodio,
        formatExcelDate(p.demographics.ingreso), formatExcelDate(p.demographics.egreso),
        estancia, p.demographics.diagnosticoPrincipal, p.demographics.motivoIngreso,
        p.demographics.tipoPaciente, p.demographics.medico, p.demographics.alergias, p.demographics.especialidad, p.demographics.observacionesGenerales,
        valIdoneidad, cIng, cArea, cMedico, cEgr, marString, poli, atbString, aislamientos
      ]);
    });
    exportToCSV(`Base_Pacientes_${view}_${filterMonth||'Todo'}_${filterYear||'Todo'}.csv`, rows);
  };

  const getGeneralExportHeader = () => ([
    "Identificador interno (FV)", "N° Expediente", "Habitación", "Nombre del paciente", "Fecha de nacimiento",
    "Edad", "Grupo etario", "Genero", "Episodio", "Fecha de ingreso DD/MM/AA HH:MM",
    "Fecha de egreso DD/MM/AA HH:MM", "Días internado", "Diagnostico",
    "Motivo de ingreso / Procedimiento", "Tipo de paciente", "Medico tratante",
    "Alergias", "Especialidad", "Observaciones Generales", "Idoneidad (1ra Dosis)", "Conc. Ingreso", "Conc. Cambio Área",
    "Conc. Cambio Médico", "Conc. Egreso", "MAR", "Polifarmacia >5 med", "\"Antibiótico ¿Cuales?\"", "Cultivos"
  ]);

  const buildGeneralExportRow = (p) => {
    const { years } = calculateAge(p.demographics.fechaNacimiento);
    const grupoEtario = getGrupoEtarioExport(years);
    const estancia = calculateDaysOfUse(p.demographics.ingreso, p.demographics.egreso);

    const valIdoneidad = p.perfilFarmacoMeta?.evaluadoPrevioPrimeraDosis ? 'Sí' : 'No';
    const cIng = p.conciliacion.ingresoNA ? 'NA' : (p.conciliacion.ingreso.length > 0 ? 'Sí' : 'No');
    const cArea = p.conciliacion.transicionAreaNA ? 'NA' : (p.conciliacion.transicionesArea?.length > 0 ? 'Sí' : 'No');
    const cMedico = p.conciliacion.transicionMedicoNA ? 'NA' : (p.conciliacion.transicionMedico ? 'Sí' : 'No');
    const cEgr = formatConciliacionEgresoExport(p.conciliacion || {});

    const activos = p.perfilFarmaco.filter((f) => f.estado === 'Activo');
    const poli = activos.length > 5 ? 'Sí' : 'No';

    const marActivos = p.perfilFarmaco.filter((f) => f.categoria === 'Alto Riesgo');
    const marString = marActivos.length > 0 ? `Sí: ${marActivos.map((f) => f.principio).join(', ')}` : 'No';

    const atbActivos = p.perfilFarmaco.filter((f) => f.categoria === 'Antibiótico');
    const atbString = atbActivos.length > 0 ? atbActivos.map((f) => f.principio).join(', ') : 'Ninguno';

    const aislamientos = p.microbiologia.map((m) => m.microorganismo).filter((x) => x).join(', ') || 'Ninguno';

    return [
      p.demographics.identificadorInterno || p.id, p.demographics.numeroPaciente, p.demographics.habitacion, p.demographics.nombre, p.demographics.fechaNacimiento,
      years, grupoEtario, p.demographics.genero, p.demographics.numeroEpisodio,
      formatExcelDate(p.demographics.ingreso), formatExcelDate(p.demographics.egreso),
      estancia, p.demographics.diagnosticoPrincipal, p.demographics.motivoIngreso,
      p.demographics.tipoPaciente, p.demographics.medico, p.demographics.alergias, p.demographics.especialidad, p.demographics.observacionesGenerales,
      valIdoneidad, cIng, cArea, cMedico, cEgr, marString, poli, atbString, aislamientos,
    ];
  };

  const openGeneralExportModal = () => {
    setGeneralExportError('');
    setGeneralExportModal({
      open: true,
      year: filterYear || '',
      months: filterMonth ? [filterMonth] : [],
    });
  };

  const closeGeneralExportModal = () => {
    setGeneralExportError('');
    setGeneralExportModal((prev) => ({ ...prev, open: false }));
  };

  const toggleGeneralExportMonth = (monthValue) => {
    setGeneralExportModal((prev) => {
      const exists = prev.months.includes(monthValue);
      const nextMonths = exists
        ? prev.months.filter((m) => m !== monthValue)
        : [...prev.months, monthValue];

      return {
        ...prev,
        months: nextMonths,
      };
    });
  };

  const handleExportGeneralByMonths = () => {
    const selectedMonths = [...generalExportModal.months].sort();
    if (selectedMonths.length === 0) {
      setGeneralExportError('Selecciona al menos un mes para exportar.');
      return;
    }

    const monthSet = new Set(selectedMonths);
    const selectedYear = String(generalExportModal.year || '').trim();

    const exportPatients = (patients || []).filter((p) => {
      if (p.deleted) return false;
      const ingreso = String(p.demographics?.ingreso || '');
      if (!ingreso) return false;

      const [year, month] = ingreso.slice(0, 10).split('-');
      if (!monthSet.has(month)) return false;
      if (selectedYear && year !== selectedYear) return false;
      return true;
    });

    if (exportPatients.length === 0) {
      setGeneralExportError('No hay pacientes en los meses seleccionados con los filtros actuales.');
      return;
    }

    const nonDischarged = exportPatients.filter((p) => !p.demographics?.egreso);
    const discharged = exportPatients.filter((p) => Boolean(p.demographics?.egreso));
    const header = getGeneralExportHeader();
    const monthLabel = selectedMonths.join('-');
    const yearLabel = selectedYear || 'TodosAnios';

    exportToCSV(
      `Base_Pacientes_NoEgresados_M${monthLabel}_Y${yearLabel}.csv`,
      [header, ...nonDischarged.map(buildGeneralExportRow)],
    );
    exportToCSV(
      `Base_Pacientes_Egresados_M${monthLabel}_Y${yearLabel}.csv`,
      [header, ...discharged.map(buildGeneralExportRow)],
    );

    closeGeneralExportModal();
  };

  const handleExportPRMsAndInteractions = () => {
    const rows = [
      ["REPORTE GLOBAL DE PRMs E INTERACCIONES", `Filtros aplicados: Mes ${filterMonth || 'Todos'}, Año ${filterYear || 'Todos'}, Vista: ${view}`],
      [],
      ["--- PROBLEMAS RELACIONADOS CON MEDICAMENTOS (PRM) ---"],
      [
        "Fecha", "ID Interno (FV)", "N° Expediente", "Nombre Paciente", "Área", "Medicamento", "Vía", "Grupo", 
        "Descripción del PRM", "Categoría PRM", "Análisis categoría", "Causa Raíz", 
        "Intervención", "Descripción intervención", "Aceptación", "Resolución", "Gravedad", "Reportado a calidad"
      ]
    ];

    filteredPatients.forEach(p => {
      (p.prms || []).forEach(prm => {
        rows.push([
          prm.fecha, p.demographics.identificadorInterno, p.demographics.numeroPaciente, p.demographics.nombre, prm.area, prm.medicamento, prm.via, prm.grupo,
          prm.descripcion, prm.categoria, prm.analisis, prm.causaRaiz,
          prm.intervencion, prm.descIntervencion, prm.aceptacion, prm.resolucion, prm.gravedad, prm.reportadoCalidad
        ]);
      });
    });

    rows.push([], [], ["--- INTERACCIONES MEDICAMENTOSAS ---"]);
    rows.push(["Fecha", "ID Interno (FV)", "N° Expediente", "Nombre Paciente", "Medicamentos Involucrados", "Grado de Interacción", "Consecuencias (Qué puede pasar)"]);

    filteredPatients.forEach(p => {
      (p.interacciones || []).forEach(int => {
        rows.push([
          int.fecha, p.demographics.identificadorInterno, p.demographics.numeroPaciente, p.demographics.nombre, int.medicamentos, int.grado, int.consecuencia
        ]);
      });
    });

    exportToCSV(`PRMs_Interacciones_${view}_${filterMonth||'Todo'}_${filterYear||'Todo'}.csv`, rows);
  };

  const handleExportPROA = () => {
     const rows = [
        ["REPORTE PROA - AISLAMIENTOS MICROBIOLÓGICOS Y USO DE ATB", `Filtros aplicados: Mes ${filterMonth || 'Todos'}, Año ${filterYear || 'Todos'}`],
        [],
        ["Fecha de Muestra", "Paciente", "ID Interno (FV)", "N° Expediente", "Diagnóstico Principal", "Tipo de Paciente", "Antibióticos Activos", "Días Máximos ATB", "Tipo de Muestra", "Sitio de Cultivo", "Microorganismo Aislado", "Sensibilidad (S)", "Resistencia (R)", "Observaciones / MIC"]
     ];
     allMicros.forEach(m => {
        rows.push([m.fechaMuestra, m.patientName, m.patientFv, m.patientExp, m.diagnostico, m.tipoPaciente, m.atbActivos, m.maxDiasATB, m.tipoMuestra, m.sitioCultivo, m.microorganismo, m.sensibles, m.resistentes, m.observaciones]);
     });
     exportToCSV(`Reporte_PROA_${view}_${filterMonth||'Todo'}_${filterYear||'Todo'}.csv`, rows);
  };

  const handleAddDilutionRow = () => {
    if (!isDilutionAdmin) return;
    const form = {};
    defaultDilutionColumns.forEach((column) => {
      form[column] = '';
    });
    setDilutionModal({ open: true, mode: 'create', rowId: '', form });
  };

  const handleEditDilutionRow = (row) => {
    if (!isDilutionAdmin || !row) return;
    const form = {};
    defaultDilutionColumns.forEach((column) => {
      form[column] = String(row?.[column] ?? '');
    });
    setDilutionModal({ open: true, mode: 'edit', rowId: row.id, form });
  };

  const handleSaveDilutionModal = () => {
    if (!isDilutionAdmin || typeof onDilutionsTableChange !== 'function') return;

    const payload = {};
    defaultDilutionColumns.forEach((column) => {
      payload[column] = String(dilutionModal.form?.[column] ?? '').trim();
    });

    if (!payload.MEDICAMENTO) {
      setDilutionsError('El campo MEDICAMENTO es obligatorio para guardar.');
      return;
    }

    onDilutionsTableChange((prev) => {
      const columns = Array.isArray(prev?.columns) && prev.columns.length > 0 ? prev.columns : defaultDilutionColumns;
      const rows = Array.isArray(prev?.rows) ? prev.rows : [];

      if (dilutionModal.mode === 'edit') {
        return {
          ...prev,
          columns,
          rows: rows.map((row) => (row.id === dilutionModal.rowId ? { ...row, ...payload } : row)),
          updatedAt: Date.now(),
        };
      }

      const newRow = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        ...payload,
      };

      return {
        ...prev,
        columns,
        rows: [...rows, newRow],
        updatedAt: Date.now(),
      };
    });

    setDilutionsError('');
    setDilutionModal({ open: false, mode: 'create', rowId: '', form: {} });
  };

  const handleDeleteDilutionRow = (rowId) => {
    if (!isDilutionAdmin || typeof onDilutionsTableChange !== 'function') return;

    onDilutionsTableChange((prev) => ({
      ...prev,
      rows: (prev?.rows || []).filter((row) => row.id !== rowId),
      updatedAt: Date.now(),
    }));
    setDilutionDeleteTarget(null);
  };

  const handleDownloadDilutionsTemplate = async () => {
    if (!isDilutionAdmin) return;

    setDilutionsError('');

    try {
      const XLSX = await import('xlsx/xlsx.mjs');
      const worksheet = XLSX.utils.aoa_to_sheet([defaultDilutionColumns]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Diluciones');

      const fileData = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([fileData], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `Plantilla_Diluciones_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch (_error) {
      setDilutionsError('No se pudo generar la plantilla de Excel. Intenta de nuevo.');
    }
  };

  const handleDilutionsFileChange = async (event) => {
    if (!isDilutionAdmin || typeof onDilutionsTableChange !== 'function') return;

    const file = event.target.files?.[0];
    if (!file) return;

    setDilutionsError('');

    try {
      const XLSX = await import('xlsx/xlsx.mjs');
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = workbook?.SheetNames?.[0];

      if (!sheetName) throw new Error('Sin hojas');

      const worksheet = workbook.Sheets[sheetName];
      const matrix = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: '' });
      const nonEmptyRows = (matrix || []).filter((row) => Array.isArray(row) && row.some((cell) => String(cell ?? '').trim() !== ''));

      if (!nonEmptyRows.length) throw new Error('Sin datos');

      const firstRow = Array.isArray(nonEmptyRows[0]) ? nonEmptyRows[0] : [];
      const normalizedTargets = defaultDilutionColumns.map((column) => normalizeDilutionHeader(column));
      const normalizedHeader = firstRow.map((cell) => normalizeDilutionHeader(cell));
      const headerIndexByTarget = new Map();

      normalizedTargets.forEach((target, targetIndex) => {
        const sourceIndex = normalizedHeader.findIndex((headerCell) => headerCell === target);
        if (sourceIndex >= 0) headerIndexByTarget.set(targetIndex, sourceIndex);
      });

      const hasHeaderRow = headerIndexByTarget.size >= 3;
      const sourceRows = hasHeaderRow ? nonEmptyRows.slice(1) : nonEmptyRows;

      const rows = sourceRows
        .map((sourceRow, rowIndex) => {
          const isLegacyWithoutAdministracion = !hasHeaderRow && sourceRow.length === defaultDilutionColumns.length - 1;
          const nextRow = { id: `${Date.now()}-${rowIndex}-${Math.random().toString(36).slice(2, 7)}` };

          defaultDilutionColumns.forEach((column, targetIndex) => {
            let value = '';

            if (hasHeaderRow) {
              const mappedIndex = headerIndexByTarget.get(targetIndex);
              value = mappedIndex !== undefined ? sourceRow?.[mappedIndex] ?? '' : '';
            } else if (isLegacyWithoutAdministracion && targetIndex >= 5) {
              value = targetIndex === 5 ? '' : sourceRow?.[targetIndex - 1] ?? '';
            } else {
              value = sourceRow?.[targetIndex] ?? '';
            }

            nextRow[column] = String(value ?? '').trim();
          });

          return nextRow;
        })
        .filter((row) => defaultDilutionColumns.some((column) => String(row[column] ?? '').trim() !== ''));

      if (!rows.length) throw new Error('Sin filas utiles');

      onDilutionsTableChange({
        columns: defaultDilutionColumns,
        rows,
        sheetName,
        updatedAt: Date.now(),
      });
    } catch (_error) {
      setDilutionsError('No se pudo leer el archivo. Usa un Excel/CSV con datos y vuelve a intentar.');
    } finally {
      event.target.value = '';
    }
  };

  const reviewedReminderCount = reminderRows.filter((reminder) => reminder.status === 'finalizado' || reminder.reviewedByName || reminder.reviewedBy).length;
  const dueReminderCount = reminderRows.filter((reminder) => {
    if (reminder.status === 'finalizado' || reminder.reviewedByName || reminder.reviewedBy) return false;
    const dueTs = new Date(reminder.dueAt || 0).getTime();
    if (!Number.isFinite(dueTs) || dueTs <= 0) return false;
    return dueTs <= Date.now();
  }).length;

  const isReminderFinalized = (reminder) => reminder.status === 'finalizado' || reminder.reviewedByName || reminder.reviewedBy;

  const pendingReminderCount = reminderRows.filter((reminder) => !isReminderFinalized(reminder)).length;

  const formatReminderDateTime = (value) => {
    const parsed = new Date(value || 0);
    if (Number.isNaN(parsed.getTime())) return '-';
    return parsed.toLocaleString();
  };

  const getImportancePillClass = (importance = '') => {
    const normalized = String(importance || '').toLowerCase();
    if (normalized === 'alta') return 'bg-red-100 text-red-700 border border-red-200';
    if (normalized === 'baja') return 'bg-blue-100 text-blue-700 border border-blue-200';
    return 'bg-amber-100 text-amber-700 border border-amber-200';
  };

  return (
    <div className="flex-1 p-3 sm:p-4 lg:p-6 xl:p-8 relative">
      <div className="max-w-7xl mx-auto">
        
        {/* TABS DE DASHBOARD */}
        <div className="flex gap-2 overflow-x-auto border-b border-slate-300 mb-6 pb-1">
           <button onClick={() => setDashboardTab('pacientes')} className={`shrink-0 pb-3 px-2 text-sm sm:text-base lg:text-lg transition-colors flex items-center ${dashboardTab === 'pacientes' ? 'border-b-4 border-blue-600 font-bold text-blue-800' : 'text-slate-500 hover:text-slate-700'}`}>
             <Users className="w-5 h-5 mr-2"/> Censo de Pacientes
           </button>
           <button onClick={() => setDashboardTab('prms')} className={`shrink-0 pb-3 px-2 text-sm sm:text-base lg:text-lg transition-colors flex items-center ${dashboardTab === 'prms' ? 'border-b-4 border-orange-500 font-bold text-orange-700' : 'text-slate-500 hover:text-slate-700'}`}>
             <PieChart className="w-5 h-5 mr-2"/> Monitor de PRM
           </button>
           <button onClick={() => setDashboardTab('proa')} className={`shrink-0 pb-3 px-2 text-sm sm:text-base lg:text-lg transition-colors flex items-center ${dashboardTab === 'proa' ? 'border-b-4 border-purple-500 font-bold text-purple-700' : 'text-slate-500 hover:text-slate-700'}`}>
             <Bug className="w-5 h-5 mr-2"/> PROA (Microbiología)
           </button>
           <button onClick={() => setDashboardTab('calidad')} className={`shrink-0 pb-3 px-2 text-sm sm:text-base lg:text-lg transition-colors flex items-center ${dashboardTab === 'calidad' ? 'border-b-4 border-emerald-500 font-bold text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}>
             <CheckSquare className="w-5 h-5 mr-2"/> Calidad y Conciliación
           </button>
           {isDilutionAdmin && (
             <button onClick={() => setDashboardTab('diluciones')} className={`shrink-0 pb-3 px-2 text-sm sm:text-base lg:text-lg transition-colors flex items-center ${dashboardTab === 'diluciones' ? 'border-b-4 border-cyan-500 font-bold text-cyan-700' : 'text-slate-500 hover:text-slate-700'}`}>
               <TestTube className="w-5 h-5 mr-2"/> Tabla de Diluciones
             </button>
           )}
           <button onClick={() => setDashboardTab('recordatorios')} className={`shrink-0 pb-3 px-2 text-sm sm:text-base lg:text-lg transition-colors flex items-center ${dashboardTab === 'recordatorios' ? 'border-b-4 border-fuchsia-500 font-bold text-fuchsia-700' : 'text-slate-500 hover:text-slate-700'}`}>
             <Bell className="w-5 h-5 mr-2"/> Recordatorios
           </button>
        </div>

        {/* ---------------- VISTA DE PACIENTES ---------------- */}
        {dashboardTab === 'pacientes' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center border-l-4 border-l-blue-500">
                <div className="bg-blue-50 p-3 rounded-lg mr-4"><Users className="w-8 h-8 text-blue-600" /></div>
                <div>
                  <p className="text-sm font-medium text-slate-500">{view === 'egresados' ? 'Total Pacientes Egresados' : 'Total Pacientes Activos'}</p>
                  <p className="text-3xl font-black text-slate-800">{view === 'egresados' ? dischargedCount : activeCount}</p>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center border-l-4 border-l-orange-500">
                <div className="bg-orange-50 p-3 rounded-lg mr-4"><Activity className="w-8 h-8 text-orange-600" /></div>
                <div><p className="text-sm font-medium text-slate-500">Con Antimicrobianos (ATB)</p><p className="text-3xl font-black text-orange-600">{atbCount}</p></div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center border-l-4 border-l-red-500">
                <div className="bg-red-50 p-3 rounded-lg mr-4"><AlertTriangle className="w-8 h-8 text-red-600" /></div>
                <div><p className="text-sm font-medium text-slate-500">Con Alto Riesgo Activo</p><p className="text-3xl font-black text-red-600">{altoRiesgoCount}</p></div>
              </div>
            </div>

            {/* Barra de Controles (Vistas y Filtros) */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col lg:flex-row justify-between lg:items-center gap-4">
              <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-lg w-full lg:w-auto">
                <button onClick={() => setView('activos')} className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${view === 'activos' ? 'bg-white text-blue-700 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-800'}`}>Pacientes Activos</button>
                <button onClick={() => setView('egresados')} className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${view === 'egresados' ? 'bg-white text-blue-700 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-800'}`}>Egresados</button>
                <button onClick={() => setView('papelera')} className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors flex items-center ${view === 'papelera' ? 'bg-red-50 text-red-700 shadow-sm border border-red-200' : 'text-slate-600 hover:text-red-600'}`}><Trash2 className="w-4 h-4 mr-1"/> Papelera</button>
              </div>
              
              <div className="flex flex-wrap gap-2 items-center w-full lg:w-auto">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input type="text" placeholder="Buscar nombre o habitación..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm shadow-sm w-full sm:w-56" />
                </div>
                <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="py-2 px-3 border border-slate-300 rounded-lg text-sm shadow-sm text-slate-700">
                  <option value="">Mes (Todos)</option>{MESES.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
                </select>
                <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="py-2 px-3 border border-slate-300 rounded-lg text-sm shadow-sm text-slate-700">
                  <option value="">Año (Todos)</option>{ANIOS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                
                <button onClick={openGeneralExportModal} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center font-medium shadow-sm transition text-sm" title="Exportar Demográficos y Clínicos"><FileSpreadsheet className="w-4 h-4 mr-2" /> Exportar General</button>

                {view !== 'papelera' && <button onClick={onCreate} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center font-medium shadow-sm transition text-sm"><UserPlus className="w-4 h-4 mr-2" /> Nuevo</button>}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto print:overflow-visible">
                <table className="min-w-[1100px] w-full text-left border-collapse">
                  <thead className="bg-slate-800 text-white border-b border-slate-700">
                    <tr>
                      <th className="p-3 font-semibold text-sm w-24">
                        <button type="button" onClick={() => togglePatientColumnFilter('ingreso')} className="inline-flex items-center gap-1 hover:text-blue-200 transition-colors">
                          Ingreso <span className="text-[11px] opacity-90">{getPatientColumnIndicator('ingreso')}</span>
                        </button>
                      </th>
                      <th className="p-3 font-semibold text-sm">
                        <button type="button" onClick={() => togglePatientColumnFilter('paciente')} className="inline-flex items-center gap-1 hover:text-blue-200 transition-colors">
                          Paciente y Alertas clínicas <span className="text-[11px] opacity-90">{getPatientColumnIndicator('paciente')}</span>
                        </button>
                      </th>
                      <th className="p-3 font-semibold text-sm">
                        <button type="button" onClick={() => togglePatientColumnFilter('ubicacion')} className="inline-flex items-center gap-1 hover:text-blue-200 transition-colors">
                          Ubicación y Médico <span className="text-[11px] opacity-90">{getPatientColumnIndicator('ubicacion')}</span>
                        </button>
                      </th>
                      <th className="p-3 font-semibold text-sm">
                        <button type="button" onClick={() => togglePatientColumnFilter('diagnostico')} className="inline-flex items-center gap-1 hover:text-blue-200 transition-colors">
                          Diagnóstico Principal <span className="text-[11px] opacity-90">{getPatientColumnIndicator('diagnostico')}</span>
                        </button>
                      </th>
                      <th className="p-3 font-semibold text-sm text-center">
                        <button type="button" onClick={() => togglePatientColumnFilter('estancia')} className="inline-flex items-center gap-1 hover:text-blue-200 transition-colors">
                          Estancia <span className="text-[11px] opacity-90">{getPatientColumnIndicator('estancia')}</span>
                        </button>
                      </th>
                      <th className="p-3 font-semibold text-sm text-center" title="Medicamentos Activos / Total">
                        <button type="button" onClick={() => togglePatientColumnFilter('medsActivos')} className="inline-flex items-center gap-1 hover:text-blue-200 transition-colors">
                          Meds (Act.) <span className="text-[11px] opacity-90">{getPatientColumnIndicator('medsActivos')}</span>
                        </button>
                      </th>
                      <th className="p-3 font-semibold text-sm text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                  {patientRows.length === 0 && <tr><td colSpan="7" className="p-8 text-center text-slate-500">No hay registros para esta vista o filtros seleccionados.</td></tr>}
                  {patientRows.map(p => {
                    const { years } = calculateAge(p.demographics.fechaNacimiento);
                    const estancia = calculateDaysOfUse(p.demographics.ingreso, p.demographics.egreso);
                    const medsActivos = p.perfilFarmaco.filter(f => f.estado === 'Activo').length;
                    const medsTotal = p.perfilFarmaco.length;
                    const hasPolimedicado = medsActivos > 5;
                    const hasAdultoMayor = Number(years) >= ADULTO_MAYOR_EDAD;
                    
                    const creatData = p.labs["Creatinina Sérica"] || [];
                    const latestCreat = creatData.length > 0 ? creatData[creatData.length - 1].value : '';
                    const crcl = calculateCrCl(years, p.demographics.peso, p.demographics.genero, latestCreat);
                    
                    const hasAlergias = p.demographics.alergias && p.demographics.alergias.toLowerCase() !== 'no' && p.demographics.alergias.toLowerCase() !== 'ninguna' && p.demographics.alergias.trim() !== '';
                    const hasAltoRiesgo = p.perfilFarmaco.some(f => f.categoria === 'Alto Riesgo' && f.estado === 'Activo');
                    
                    // Cálculo de días máximos de uso de antibióticos activos
                    const atbActivosList = p.perfilFarmaco.filter(f => f.categoria === 'Antibiótico' && f.estado === 'Activo');
                    let maxDiasATB = 0;
                    atbActivosList.forEach(atb => {
                        const dias = calculateDaysOfUse(atb.fechaInicio, p.demographics.egreso);
                        if (dias > maxDiasATB) maxDiasATB = dias;
                    });
                    const hasATB = atbActivosList.length > 0;

                    const hasMicrobiologia = Array.isArray(p.microbiologia) && p.microbiologia.length > 0;
                    const hasAislamiento = hasMicrobiologia && p.microbiologia.some(m => m.microorganismo && m.microorganismo.trim() !== '');
                    const aislamientoTooltip = hasAislamiento ? 'Cultivo POSITIVO' : 'Cultivo pendiente';
                    const idoneidadOk = p.perfilFarmacoMeta?.evaluadoPrevioPrimeraDosis;

                    // LÓGICA DE PRESENCIA COLABORATIVA (Sustituye al candado)
                    const otherActiveUsers = listOtherActiveUsers(p, currentUser.id);
                    const otherNames = otherActiveUsers.map(uid => users.find(u => u.id === uid)?.nombre).join(', ');

                    let rowColor = "border-b border-slate-100 transition-colors cursor-pointer ";
                    
                    if (!p.deleted) {
                      if (hasAltoRiesgo) rowColor += "bg-red-50 hover:bg-red-100";
                      else if (hasATB) rowColor += "bg-orange-50 hover:bg-orange-100";
                      else rowColor += "hover:bg-slate-50";
                    } else if (p.deleted) {
                      rowColor += "bg-slate-100 opacity-70";
                    }

                    return (
                      <tr key={p.id} className={rowColor} onClick={() => {
                          if(view === 'papelera') return;
                          onSelect(p.id, 'demographics');
                      }}>
                        <td className="p-3 text-slate-600 font-medium text-sm">
                          {formatExcelDate(p.demographics.ingreso).split(' ')[0] || '-'}
                          <div className="text-xs font-mono text-slate-400 mt-1" title="ID Interno FV">{p.demographics.identificadorInterno}</div>
                          {p.demographics.numeroEpisodio && <div className="text-[10px] bg-slate-200 inline-block px-1 rounded text-slate-600 mt-1">Ep: {p.demographics.numeroEpisodio}</div>}
                        </td>
                        <td className="p-3">
                          <p className="font-bold text-slate-800 text-base">{p.demographics.nombre || 'Sin Nombre'}</p>
                          <p className="text-xs text-slate-600 mb-1 flex items-center">
                            {years ? `${years} a.` : '-'} | {p.demographics.genero || '-'} | {p.demographics.peso ? `${p.demographics.peso} kg` : '-'}
                            {crcl && <span className={`ml-2 font-medium px-1.5 rounded-sm border ${getTfgColorClass(crcl)}`}>TFG: {crcl}</span>}
                          </p>
                          <div className="flex space-x-1.5 mt-1 flex-wrap">
                            {/* ETIQUETA COLABORATIVA EN LUGAR DE CANDADO ROJO */}
                            {otherActiveUsers.length > 0 && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 mb-1" title={`Editando: ${otherNames}`}><Users className="w-3 h-3 mr-1"/> EDITANDO ({otherActiveUsers.length})</span>}
                            {hasAdultoMayor && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 mb-1">ADULTO MAYOR ({ADULTO_MAYOR_EDAD}+)</span>}
                            {hasPolimedicado && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900 mb-1">POLIMEDICADO +5</span>}
                            {hasAlergias && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white mb-1" title={p.demographics.alergias}>ALERGIAS</span>}
                            {idoneidadOk && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-200 text-green-800 mb-1" title="Idoneidad validada previo a primera dosis"><CheckCircle className="w-3 h-3 mr-1"/> IDONEIDAD OK</span>}
                            {hasAltoRiesgo && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-200 text-red-800 mb-1">ALTO RIESGO</span>}
                            {hasATB && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-200 text-orange-800 mb-1">ATB ({maxDiasATB} d)</span>}
                            {hasMicrobiologia && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-200 text-purple-800 mb-1" title={aislamientoTooltip}><Bug className="w-3 h-3 mr-1"/> AISLAMIENTO</span>}
                          </div>
                        </td>
                        <td className="p-3">
                          <p className="font-bold text-slate-700">Hab: {p.demographics.habitacion || '-'}</p>
                          <p className="text-xs text-slate-500">{p.demographics.medico || '-'}</p>
                          <p className="text-[10px] text-blue-600 uppercase mt-0.5">{p.demographics.especialidad || ''}</p>
                        </td>
                        <td className="p-3 text-slate-600 text-sm truncate max-w-xs" title={p.demographics.diagnosticoPrincipal}>{p.demographics.diagnosticoPrincipal || '-'}</td>
                        <td className="p-3 text-center">
                          <span className="font-bold text-slate-700">{estancia} d</span>
                          {p.demographics.egreso && <span className="block text-[10px] text-red-500 font-bold leading-tight mt-0.5">EGRESADO</span>}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`font-bold ${medsActivos > 0 ? 'text-blue-600' : 'text-slate-400'}`}>{medsActivos}</span>
                          <span className="text-xs text-slate-400"> / {medsTotal}</span>
                        </td>
                        <td className="p-3 flex justify-center">
                          {view === 'papelera' ? (
                            <div className="flex space-x-2">
                              <button onClick={(e) => { e.stopPropagation(); onRestore(p.id); }} className="text-green-600 hover:bg-green-100 p-2 rounded-md transition-colors" title="Restaurar paciente"><RefreshCcw className="w-5 h-5" /></button>
                              {/* Advertencia si intentan borrar uno con alguien dentro */}
                              <button disabled={otherActiveUsers.length > 0} onClick={(e) => { e.stopPropagation(); if(otherActiveUsers.length === 0) onHardDelete(p.id); }} className={`p-2 rounded-md transition-colors ${otherActiveUsers.length > 0 ? 'text-slate-300 cursor-not-allowed' : 'text-red-600 hover:bg-red-200'}`} title={otherActiveUsers.length > 0 ? 'En uso por otros usuarios' : 'Eliminar permanentemente'}><Trash2 className="w-5 h-5" /></button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button disabled={otherActiveUsers.length > 0} onClick={(e) => { e.stopPropagation(); if(otherActiveUsers.length === 0) onDelete(p.id); }} className={`p-2 rounded-md transition-colors ${otherActiveUsers.length > 0 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-400 hover:bg-red-100 hover:text-red-600'}`} title={otherActiveUsers.length > 0 ? 'En uso por otros usuarios' : 'Mover a papelera'}><Trash2 className="w-5 h-5" /></button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ---------------- VISTA EXCLUSIVA DE PRMs ---------------- */}
        {dashboardTab === 'prms' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center border-l-4 border-l-orange-500">
                <div className="bg-orange-50 p-3 rounded-lg mr-4"><FileWarning className="w-8 h-8 text-orange-600" /></div>
                <div><p className="text-sm font-medium text-slate-500">PRMs Detectados</p><p className="text-3xl font-black text-slate-800">{allPrms.length}</p></div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center border-l-4 border-l-red-500">
                <div className="bg-red-50 p-3 rounded-lg mr-4"><ShieldAlert className="w-8 h-8 text-red-600" /></div>
                <div><p className="text-sm font-medium text-slate-500">Graves o Letales</p><p className="text-3xl font-black text-red-600">{allPrms.filter(p => p.gravedad === 'Grave' || p.gravedad === 'Letal').length}</p></div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center border-l-4 border-l-green-500">
                <div className="bg-green-50 p-3 rounded-lg mr-4"><ListChecks className="w-8 h-8 text-green-600" /></div>
                <div><p className="text-sm font-medium text-slate-500">Intervenciones Aceptadas</p><p className="text-3xl font-black text-green-600">{allPrms.filter(p => p.aceptacion === 'Aceptada').length}</p></div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-wrap gap-2 items-center">
               <span className="text-sm font-bold text-slate-500 mr-2"><Filter className="w-4 h-4 inline mr-1"/> Filtros PRM:</span>

               <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg mr-2">
                 <button onClick={() => setView('activos')} className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${view === 'activos' ? 'bg-white text-orange-700 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-800'}`}>Activos</button>
                 <button onClick={() => setView('egresados')} className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${view === 'egresados' ? 'bg-white text-orange-700 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-800'}`}>Egresados</button>
               </div>

               <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="py-2 px-3 border border-slate-300 rounded-lg text-sm shadow-sm text-slate-700">
                 <option value="">Mes (Todos)</option>{MESES.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
               </select>
               <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="py-2 px-3 border border-slate-300 rounded-lg text-sm shadow-sm text-slate-700">
                 <option value="">Año (Todos)</option>{ANIOS.map(y => <option key={y} value={y}>{y}</option>)}
               </select>
               <select value={filterPrmCategory} onChange={e => setFilterPrmCategory(e.target.value)} className="py-2 px-3 border border-slate-300 rounded-lg text-sm shadow-sm text-slate-700">
                 <option value="">Categoría (Todas)</option>
                 {CATEGORIAS_PRM.map(c => <option key={c} value={c}>{c}</option>)}
               </select>
               <select value={filterPrmGravity} onChange={e => setFilterPrmGravity(e.target.value)} className="py-2 px-3 border border-slate-300 rounded-lg text-sm shadow-sm text-slate-700">
                 <option value="">Gravedad (Todas)</option>
                 <option value="Leve">Leve</option><option value="Moderada">Moderada</option>
                 <option value="Grave">Grave</option><option value="Letal">Letal</option>
               </select>

               <div className="w-full sm:flex-1 sm:text-right">
                  <button onClick={handleExportPRMsAndInteractions} className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg inline-flex items-center font-medium shadow-sm transition text-sm" title="Exportar Base de Datos de PRMs"><FileWarning className="w-4 h-4 mr-2" /> Exportar a Excel</button>
               </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto print:overflow-visible">
                <table className="min-w-[980px] w-full text-left border-collapse">
                  <thead className="bg-slate-800 text-white border-b border-slate-700">
                    <tr>
                      <th className="p-3 font-semibold text-sm w-24">Fecha</th>
                      <th className="p-3 font-semibold text-sm">Paciente</th>
                      <th className="p-3 font-semibold text-sm">Categoría y Análisis</th>
                      <th className="p-3 font-semibold text-sm">Medicamento Involucrado</th>
                      <th className="p-3 font-semibold text-sm text-center">Intervención</th>
                      <th className="p-3 font-semibold text-sm text-center">Estatus y Gravedad</th>
                    </tr>
                  </thead>
                  <tbody>
                  {allPrms.length === 0 && <tr><td colSpan="6" className="p-8 text-center text-slate-500">No hay PRMs registrados con los filtros actuales.</td></tr>}
                  {allPrms.map((prm, idx) => {
                    const originalPatient = patients.find(px => px.id === prm.patientId);
                    const otherActiveUsers = originalPatient ? listOtherActiveUsers(originalPatient, currentUser.id) : [];

                    return (
                    <tr key={idx} onClick={() => onSelect(prm.patientId, 'prm')} className={`border-b border-slate-100 transition-colors hover:bg-orange-50 cursor-pointer`}>
                      <td className="p-3 text-slate-600 font-medium text-sm">{formatExcelDate(prm.fecha).split(' ')[0]}</td>
                      <td className="p-3">
                        <p className="font-bold text-slate-800 text-sm flex items-center">
                            {otherActiveUsers.length > 0 && <Users className="w-3 h-3 text-blue-500 mr-1" title="Otros editando"/>}
                            {prm.patientName || 'Sin Nombre'}
                        </p>
                        <p className="text-xs text-slate-500 font-mono">FV: {prm.patientFv || '-'} | Exp: {prm.patientExp}</p>
                      </td>
                      <td className="p-3">
                         <span className="inline-block px-2 py-0.5 bg-slate-200 text-slate-800 text-xs rounded font-bold mb-1">{prm.categoria || '-'}</span>
                         <p className="text-xs text-slate-600 truncate max-w-xs">{prm.analisis || '-'}</p>
                      </td>
                      <td className="p-3 font-medium text-sm text-slate-700">{prm.medicamento || '-'}</td>
                      <td className="p-3 text-center">
                         <p className="text-sm font-bold text-blue-700">{prm.intervencion || '-'}</p>
                         <p className={`text-[10px] font-bold uppercase mt-1 ${prm.aceptacion === 'Aceptada' ? 'text-green-600' : prm.aceptacion === 'No Aceptada' ? 'text-red-600' : 'text-amber-600'}`}>{prm.aceptacion || 'Sin estatus'}</p>
                      </td>
                      <td className="p-3 text-center">
                         <p className={`text-xs font-bold px-2 py-1 rounded inline-block ${prm.resolucion === 'Resuelto' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{prm.resolucion || '-'}</p>
                         <p className={`text-[10px] font-bold uppercase mt-1 ${prm.gravedad === 'Grave' || prm.gravedad === 'Letal' ? 'text-red-600' : 'text-slate-500'}`}>{prm.gravedad}</p>
                      </td>
                    </tr>
                  )})}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ---------------- VISTA EXCLUSIVA PROA (MICROBIOLOGÍA) ---------------- */}
        {dashboardTab === 'proa' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center border-l-4 border-l-purple-500">
                <div className="bg-purple-50 p-3 rounded-lg mr-4"><TestTube className="w-8 h-8 text-purple-600" /></div>
                <div><p className="text-sm font-medium text-slate-500">Total de Cultivos</p><p className="text-3xl font-black text-slate-800">{allMicros.length}</p></div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center border-l-4 border-l-blue-500">
                <div className="bg-blue-50 p-3 rounded-lg mr-4"><Bug className="w-8 h-8 text-blue-600" /></div>
                <div><p className="text-sm font-medium text-slate-500">Aislamientos Positivos</p><p className="text-3xl font-black text-blue-600">{allMicros.filter(m => m.microorganismo && m.microorganismo.trim() !== '').length}</p></div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center border-l-4 border-l-red-500">
                <div className="bg-red-50 p-3 rounded-lg mr-4"><ShieldAlert className="w-8 h-8 text-red-600" /></div>
                <div><p className="text-sm font-medium text-slate-500">Reportes c/Resistencia</p><p className="text-3xl font-black text-red-600">{allMicros.filter(m => m.resistentes && m.resistentes.trim() !== '').length}</p></div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-wrap gap-2 items-center">
               <span className="text-sm font-bold text-slate-500 mr-2"><Filter className="w-4 h-4 inline mr-1"/> Filtros PROA:</span>

               <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg mr-2">
                 <button onClick={() => setView('activos')} className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${view === 'activos' ? 'bg-white text-purple-700 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-800'}`}>Activos</button>
                 <button onClick={() => setView('egresados')} className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${view === 'egresados' ? 'bg-white text-purple-700 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-800'}`}>Egresados</button>
               </div>

               <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="py-2 px-3 border border-slate-300 rounded-lg text-sm shadow-sm text-slate-700">
                 <option value="">Mes (Todos)</option>{MESES.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
               </select>
               <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="py-2 px-3 border border-slate-300 rounded-lg text-sm shadow-sm text-slate-700">
                 <option value="">Año (Todos)</option>{ANIOS.map(y => <option key={y} value={y}>{y}</option>)}
               </select>

               <div className="w-full sm:flex-1 sm:text-right">
                  <button onClick={handleExportPROA} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg inline-flex items-center font-medium shadow-sm transition text-sm" title="Exportar Aislamientos PROA"><FileSpreadsheet className="w-4 h-4 mr-2" /> Exportar PROA</button>
               </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto print:overflow-visible">
                <table className="min-w-[950px] w-full text-left border-collapse">
                  <thead className="bg-slate-800 text-white border-b border-slate-700">
                    <tr>
                      <th className="p-3 font-semibold text-sm w-24">Fecha</th>
                      <th className="p-3 font-semibold text-sm">Paciente</th>
                      <th className="p-3 font-semibold text-sm">Muestra y Sitio</th>
                      <th className="p-3 font-semibold text-sm text-purple-200">Microorganismo Aislado</th>
                      <th className="p-3 font-semibold text-sm text-red-200">Resistencias Notables</th>
                    </tr>
                  </thead>
                  <tbody>
                  {allMicros.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-slate-500">No hay cultivos registrados con los filtros actuales.</td></tr>}
                  {allMicros.map((mic, idx) => {
                    const originalPatient = patients.find(px => px.id === mic.patientId);
                    const otherActiveUsers = originalPatient ? listOtherActiveUsers(originalPatient, currentUser.id) : [];

                    return (
                    <tr key={idx} onClick={() => onSelect(mic.patientId, 'micro')} className={`border-b border-slate-100 transition-colors hover:bg-purple-50 cursor-pointer`}>
                      <td className="p-3 text-slate-600 font-medium text-sm">{formatExcelDate(mic.fechaMuestra).split(' ')[0]}</td>
                      <td className="p-3">
                        <p className="font-bold text-slate-800 text-sm flex items-center">
                            {otherActiveUsers.length > 0 && <Users className="w-3 h-3 text-blue-500 mr-1" title="Otros editando"/>}
                            {mic.patientName || 'Sin Nombre'}
                        </p>
                        <p className="text-xs text-slate-500 font-mono">FV: {mic.patientFv || '-'} | Exp: {mic.patientExp}</p>
                      </td>
                      <td className="p-3">
                         <p className="font-bold text-slate-700 text-sm">{mic.tipoMuestra || '-'}</p>
                         <p className="text-xs text-slate-500">Sitio: {mic.sitioCultivo || '-'}</p>
                      </td>
                      <td className="p-3">
                         {mic.microorganismo ? (
                           <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200"><Bug className="w-3 h-3 mr-1"/> {mic.microorganismo}</span>
                         ) : <span className="text-xs text-slate-400 italic">Sin crecimiento / Pendiente</span>}
                         {mic.observaciones && <p className="text-[10px] text-slate-500 mt-1">{mic.observaciones}</p>}
                      </td>
                      <td className="p-3">
                         <p className="text-xs text-red-700 font-medium max-w-xs">{mic.resistentes || '-'}</p>
                      </td>
                    </tr>
                  )})}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ---------------- VISTA EXCLUSIVA CALIDAD Y CONCILIACIÓN ---------------- */}
        {dashboardTab === 'calidad' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-center border-l-4 border-l-slate-400">
                <div className="bg-slate-50 p-2 rounded-lg mr-3"><Users className="w-6 h-6 text-slate-600" /></div>
                <div><p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Pacientes Vista</p><p className="text-2xl font-black text-slate-800">{totalPacientesCalidad}</p></div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-center border-l-4 border-l-blue-500">
                <div className="bg-blue-50 p-2 rounded-lg mr-3"><CheckCircle className="w-6 h-6 text-blue-600" /></div>
                <div><p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Idoneidad (1ra Dosis)</p><p className="text-2xl font-black text-blue-600">{idoneidadCount}</p></div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-center border-l-4 border-l-emerald-500">
                <div className="bg-emerald-50 p-2 rounded-lg mr-3"><ClipboardList className="w-6 h-6 text-emerald-600" /></div>
                <div><p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Conciliación Ingreso</p><p className="text-2xl font-black text-emerald-600">{ingresoCount}</p></div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-center border-l-4 border-l-purple-500">
                <div className="bg-purple-50 p-2 rounded-lg mr-3"><CheckSquare className="w-6 h-6 text-purple-600" /></div>
                <div><p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Conciliación Egreso</p><p className="text-2xl font-black text-purple-600">{egresoCount}</p></div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-wrap gap-2 items-center">
               <span className="text-sm font-bold text-slate-500 mr-2"><Filter className="w-4 h-4 inline mr-1"/> Filtros Tabla:</span>
               
               <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg mr-4">
                  <button onClick={() => setView('activos')} className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${view === 'activos' ? 'bg-white text-emerald-700 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-800'}`}>Activos</button>
                  <button onClick={() => setView('egresados')} className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${view === 'egresados' ? 'bg-white text-emerald-700 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-800'}`}>Egresados</button>
               </div>

               <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="py-1.5 px-2 border border-slate-300 rounded-lg text-xs shadow-sm text-slate-700">
                 <option value="">Mes (Todos)</option>{MESES.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
               </select>
               <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="py-1.5 px-2 border border-slate-300 rounded-lg text-xs shadow-sm text-slate-700">
                 <option value="">Año (Todos)</option>{ANIOS.map(y => <option key={y} value={y}>{y}</option>)}
               </select>

               <div className="w-full sm:flex-1 sm:text-right">
                  <button onClick={handleExportGeneral} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg inline-flex items-center font-medium shadow-sm transition text-sm" title="Exportar métricas e información general"><FileSpreadsheet className="w-4 h-4 mr-2" /> Exportar KPIs de Calidad</button>
               </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto print:overflow-visible">
                <table className="min-w-[980px] w-full text-left border-collapse">
                  <thead className="bg-slate-800 text-white border-b border-slate-700">
                    <tr>
                      <th className="p-3 font-semibold text-sm">Paciente y Expediente</th>
                      <th className="p-3 font-semibold text-sm text-center border-l border-slate-700">Habitación</th>
                      <th className="p-3 font-semibold text-sm text-center border-l border-slate-700">Validación Idoneidad<br/><span className="text-[10px] font-normal text-slate-300">(Previo 1ra Dosis)</span></th>
                      <th className="p-3 font-semibold text-sm text-center border-l border-slate-700">1. Conciliación<br/>al Ingreso</th>
                      <th className="p-3 font-semibold text-sm text-center border-l border-slate-700">2. Transición<br/>de Área</th>
                      <th className="p-3 font-semibold text-sm text-center border-l border-slate-700">3. Transición<br/>de Médico</th>
                      <th className="p-3 font-semibold text-sm text-center border-l border-slate-700">4. Conciliación<br/>al Egreso</th>
                    </tr>
                  </thead>
                  <tbody>
                  {filteredPatients.length === 0 && <tr><td colSpan="7" className="p-8 text-center text-slate-500">No hay registros para mostrar.</td></tr>}
                  {filteredPatients.map((p, idx) => {
                    const idoneidadDone = p.perfilFarmacoMeta?.evaluadoPrevioPrimeraDosis;
                    const ingresoDone = p.conciliacion.ingreso.length > 0;
                    const ingresoNA = p.conciliacion.ingresoNA;
                    const transAreaDone = p.conciliacion.transicionesArea?.length > 0;
                    const transAreaNA = p.conciliacion.transicionAreaNA;
                    const transMedDone = p.conciliacion.transicionMedico;
                    const transMedNA = p.conciliacion.transicionMedicoNA;
                    const egresoDone = p.conciliacion.egreso.length > 0;
                    const egresoNA = p.conciliacion.egresoNA;

                    const otherActiveUsers = listOtherActiveUsers(p, currentUser.id);

                    return (
                      <tr key={idx} onClick={() => onSelect(p.id, 'conciliation')} className={`border-b border-slate-100 transition-colors hover:bg-emerald-50 cursor-pointer`}>
                        <td className="p-3">
                          <p className="font-bold text-slate-800 text-sm flex items-center">
                             {otherActiveUsers.length > 0 && <Users className="w-3 h-3 text-blue-500 mr-1" title="Otros editando"/>}
                             {p.demographics.nombre || 'Sin Nombre'}
                          </p>
                          <p className="text-xs text-slate-500 font-mono">FV: {p.demographics.identificadorInterno || '-'} | Exp: {p.demographics.numeroPaciente} | Ep: {p.demographics.numeroEpisodio}</p>
                        </td>
                        <td className="p-3 text-center border-l border-slate-100">
                          <span className="inline-flex items-center justify-center px-2 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold min-w-[72px]">
                            {p.demographics.habitacion || '-'}
                          </span>
                        </td>
                        <td className="p-3 text-center border-l border-slate-100">
                           <StatusBadge done={idoneidadDone} isNA={false} />
                        </td>
                        <td className="p-3 text-center border-l border-slate-100 bg-slate-50">
                           <StatusBadge done={ingresoDone} isNA={ingresoNA} />
                        </td>
                        <td className="p-3 text-center border-l border-slate-100">
                           <StatusBadge done={transAreaDone} isNA={transAreaNA} />
                        </td>
                        <td className="p-3 text-center border-l border-slate-100 bg-slate-50">
                           <StatusBadge done={transMedDone} isNA={transMedNA} />
                        </td>
                        <td className="p-3 text-center border-l border-slate-100">
                           <StatusBadge done={egresoDone} isNA={egresoNA} />
                        </td>
                      </tr>
                    );
                  })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ---------------- VISTA DE RECORDATORIOS ---------------- */}
        {dashboardTab === 'recordatorios' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-center border-l-4 border-l-fuchsia-500">
                <div className="bg-fuchsia-50 p-2 rounded-lg mr-3"><Bell className="w-6 h-6 text-fuchsia-600" /></div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Recordatorios totales</p>
                  <p className="text-2xl font-black text-fuchsia-700">{reminderRows.length}</p>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-center border-l-4 border-l-orange-500">
                <div className="bg-orange-50 p-2 rounded-lg mr-3"><Clock3 className="w-6 h-6 text-orange-600" /></div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Pendientes / vencidos</p>
                  <p className="text-2xl font-black text-orange-700">{pendingReminderCount} / {dueReminderCount}</p>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-center border-l-4 border-l-emerald-500">
                <div className="bg-emerald-50 p-2 rounded-lg mr-3"><CheckCircle className="w-6 h-6 text-emerald-600" /></div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Revisados</p>
                  <p className="text-2xl font-black text-emerald-700">{reviewedReminderCount}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
              <h3 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">Crear recordatorio</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Fecha</label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="date"
                      value={reminderForm.date}
                      onChange={(event) => setReminderForm((prev) => ({ ...prev, date: event.target.value }))}
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm shadow-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Hora</label>
                  <div className="relative">
                    <Clock3 className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="time"
                      value={reminderForm.time}
                      onChange={(event) => setReminderForm((prev) => ({ ...prev, time: event.target.value }))}
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm shadow-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Importancia</label>
                  <select
                    value={reminderForm.importance}
                    onChange={(event) => setReminderForm((prev) => ({ ...prev, importance: event.target.value }))}
                    className="w-full py-2 px-3 border border-slate-300 rounded-lg text-sm shadow-sm text-slate-700"
                  >
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Paciente activo</label>
                  <select
                    value={reminderForm.patientId}
                    onChange={(event) => setReminderForm((prev) => ({ ...prev, patientId: event.target.value }))}
                    className="w-full py-2 px-3 border border-slate-300 rounded-lg text-sm shadow-sm text-slate-700"
                    disabled={activePatientsForReminders.length === 0}
                  >
                    {activePatientsForReminders.length === 0 && <option value="">No hay pacientes activos</option>}
                    {activePatientsForReminders.map((patient) => (
                      <option key={patient.id} value={patient.id}>
                        {patient.demographics?.nombre || 'Sin nombre'}{patient.demographics?.habitacion ? ` | Hab ${patient.demographics.habitacion}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-[1fr_auto] gap-3 items-start">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Descripción</label>
                  <textarea
                    value={reminderForm.description}
                    onChange={(event) => setReminderForm((prev) => ({ ...prev, description: event.target.value }))}
                    rows={3}
                    placeholder="Describe la actividad a revisar en el paciente"
                    className="w-full py-2 px-3 border border-slate-300 rounded-lg text-sm shadow-sm"
                  />
                </div>
                <button
                  onClick={handleCreateReminder}
                  className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white px-4 py-2.5 rounded-lg inline-flex items-center font-medium shadow-sm transition text-sm mt-6"
                >
                  <Plus className="w-4 h-4 mr-2" /> Crear recordatorio
                </button>
              </div>

              {reminderError && <div className="mt-3 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{reminderError}</div>}
              {reminderStatus && <div className="mt-3 bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-2 rounded text-sm">{reminderStatus}</div>}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto print:overflow-visible">
                <table className="min-w-[1100px] w-full text-left border-collapse">
                  <thead className="bg-slate-800 text-white border-b border-slate-700">
                    <tr>
                      <th className="p-3 font-semibold text-sm">Programado</th>
                      <th className="p-3 font-semibold text-sm">Importancia</th>
                      <th className="p-3 font-semibold text-sm">Paciente</th>
                      <th className="p-3 font-semibold text-sm">Descripción</th>
                      <th className="p-3 font-semibold text-sm">Creado por</th>
                      <th className="p-3 font-semibold text-sm">Revisado por</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reminderRows.length === 0 && (
                      <tr>
                        <td colSpan="6" className="p-8 text-center text-slate-500">No hay recordatorios registrados para pacientes activos.</td>
                      </tr>
                    )}
                    {reminderRows.map((reminder) => {
                      const reviewedBy = reminder.reviewedByName || reminder.reviewedBy;
                      const finalized = isReminderFinalized(reminder);

                      return (
                        <tr key={`${reminder.patientId}-${reminder.id}`} className="border-b border-slate-100 hover:bg-fuchsia-50/40">
                          <td className="p-3 text-sm text-slate-700">{formatReminderDateTime(reminder.dueAt)}</td>
                          <td className="p-3">
                            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold uppercase ${getImportancePillClass(reminder.importance)}`}>
                              {reminder.importance || 'media'}
                            </span>
                          </td>
                          <td className="p-3">
                            <button
                              onClick={() => onSelect(reminder.patientId, 'demographics')}
                              className="text-sm font-semibold text-blue-700 hover:text-blue-800 hover:underline"
                            >
                              {reminder.patientName || 'Paciente sin nombre'}
                            </button>
                            <p className="text-xs text-slate-500">Habitación: {reminder.patientRoom || '-'}</p>
                          </td>
                          <td className="p-3 text-sm text-slate-700 max-w-xl">{reminder.description || '-'}</td>
                          <td className="p-3 text-sm text-slate-700">
                            {reminder.createdByName || '-'}
                            <p className="text-xs text-slate-500">{formatReminderDateTime(reminder.createdAt)}</p>
                          </td>
                          <td className="p-3 text-sm text-slate-700">
                            {finalized ? (
                              <>
                                <p className="inline-flex items-center px-2 py-1 rounded text-xs font-bold uppercase bg-emerald-100 text-emerald-700 border border-emerald-200 mb-1">Finalizado</p>
                                <p className="font-semibold text-emerald-700">{reviewedBy || '-'}</p>
                                <p className="text-xs text-slate-500">{formatReminderDateTime(reminder.reviewedAt)}</p>
                              </>
                            ) : (
                              <span className="text-xs font-semibold px-2 py-1 rounded bg-amber-100 text-amber-700 border border-amber-200">Pendiente</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ---------------- VISTA TABLA DE DILUCIONES ---------------- */}
        {isDilutionAdmin && dashboardTab === 'diluciones' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-center border-l-4 border-l-cyan-500">
                <div className="bg-cyan-50 p-2 rounded-lg mr-3"><TestTube className="w-6 h-6 text-cyan-600" /></div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Diluciones registradas</p>
                  <p className="text-2xl font-black text-cyan-700">{dilutionRows.length}</p>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-center border-l-4 border-l-indigo-500">
                <div className="bg-indigo-50 p-2 rounded-lg mr-3"><ClipboardList className="w-6 h-6 text-indigo-600" /></div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Columnas</p>
                  <p className="text-2xl font-black text-indigo-700">{dilutionColumns.length}</p>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-center border-l-4 border-l-slate-400">
                <div className="bg-slate-50 p-2 rounded-lg mr-3"><Activity className="w-6 h-6 text-slate-600" /></div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Ultima actualizacion</p>
                  <p className="text-sm font-bold text-slate-700">{dilutionsTable?.updatedAt ? new Date(dilutionsTable.updatedAt).toLocaleString() : '-'}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-wrap gap-2 items-center">
              <span className="text-sm font-bold text-slate-500 mr-2"><Filter className="w-4 h-4 inline mr-1"/> Acciones de tabla:</span>
              {isDilutionAdmin ? (
                <>
                  <input
                    ref={dilutionFileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={handleDilutionsFileChange}
                  />
                  <button
                    onClick={handleDownloadDilutionsTemplate}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg inline-flex items-center font-medium shadow-sm transition text-sm"
                    title="Descargar plantilla de Excel para llenar y subir"
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-2" /> Descargar plantilla
                  </button>
                  <button
                    onClick={() => dilutionFileInputRef.current?.click()}
                    className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg inline-flex items-center font-medium shadow-sm transition text-sm"
                    title="Importar tabla de diluciones desde Excel"
                  >
                    <Upload className="w-4 h-4 mr-2" /> Importar Excel
                  </button>
                  <button
                    onClick={handleAddDilutionRow}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg inline-flex items-center font-medium shadow-sm transition text-sm"
                    title="Agregar nueva dilución"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Agregar dilución
                  </button>
                </>
              ) : (
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-md">Solo administradores pueden agregar, editar o eliminar diluciones.</span>
              )}
            </div>

            {dilutionsError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{dilutionsError}</div>
            )}

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-4">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Buscar por medicamento</label>
              <div className="relative max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={dilutionMedicationSearch}
                  onChange={(e) => setDilutionMedicationSearch(e.target.value)}
                  placeholder="Ej. ceftriaxona"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm shadow-sm"
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto print:overflow-visible max-h-[72vh]">
                <table className="min-w-[1280px] w-full text-left border-collapse table-fixed">
                  <thead className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white border-b border-slate-700 sticky top-0 z-30">
                    <tr>
                      {dilutionColumns.map((column, columnIndex) => (
                        <th
                          key={`dil-col-${column}`}
                          className={`p-3 font-semibold text-[11px] uppercase tracking-wide ${columnIndex === 0 ? 'sticky left-0 z-40 bg-slate-900 min-w-[220px]' : 'min-w-[170px]'}`}
                        >
                          {column}
                        </th>
                      ))}
                      {isDilutionAdmin && <th className="p-3 font-semibold text-[11px] uppercase tracking-wide text-center w-[190px] sticky right-0 z-40 bg-slate-900 border-l border-slate-700">Acciones</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDilutionRows.length === 0 && (
                      <tr>
                        <td colSpan={Math.max(1, dilutionColumns.length + (isDilutionAdmin ? 1 : 0))} className="p-8 text-center text-slate-500">
                          {dilutionRows.length === 0 ? 'No hay filas de diluciones registradas.' : 'No se encontraron medicamentos con ese filtro.'}
                        </td>
                      </tr>
                    )}
                    {filteredDilutionRows.map((row, rowIndex) => (
                      <tr key={row.id} className={`border-b border-slate-100 align-top transition-colors ${rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'} hover:bg-cyan-50/70`}>
                        {dilutionColumns.map((column, columnIndex) => (
                          <td
                            key={`${row.id}-${column}`}
                            className={`p-3 align-top ${columnIndex === 0 ? `sticky left-0 z-20 border-r border-slate-200 font-semibold ${rowIndex % 2 === 0 ? 'bg-white/95' : 'bg-slate-50/95'}` : ''}`}
                          >
                            {renderDilutionCell(row[column])}
                          </td>
                        ))}
                        {isDilutionAdmin && (
                          <td className={`p-3 sticky right-0 z-20 border-l border-slate-200 ${rowIndex % 2 === 0 ? 'bg-white/95' : 'bg-slate-50/95'}`}>
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleEditDilutionRow(row)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-blue-700 border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors text-xs font-semibold shadow-sm"
                                title="Editar dilución"
                              >
                                <Pencil className="w-3.5 h-3.5" /> Editar
                              </button>
                              <button
                                onClick={() => setDilutionDeleteTarget(row)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-red-700 border border-red-200 bg-red-50 hover:bg-red-100 transition-colors text-xs font-semibold shadow-sm"
                                title="Eliminar dilución"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Eliminar
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="sm:hidden px-4 py-2 border-t border-slate-100 bg-slate-50 text-xs text-slate-500">
                Desliza horizontalmente para ver todas las columnas de la tabla.
              </div>
            </div>

            {dilutionModal.open && (
              <div className="fixed inset-0 z-[95] bg-slate-900/60 backdrop-blur-[1px] flex items-center justify-center p-3 sm:p-5" onClick={() => setDilutionModal({ open: false, mode: 'create', rowId: '', form: {} })}>
                <div className="w-full max-w-6xl max-h-[92vh] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
                  <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">{dilutionModal.mode === 'edit' ? 'Editar dilución' : 'Nueva dilución'}</h3>
                      <p className="text-xs text-slate-500">Completa cada campo para guardar el registro.</p>
                    </div>
                    <button
                      onClick={() => setDilutionModal({ open: false, mode: 'create', rowId: '', form: {} })}
                      className="p-2 rounded-md text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                      title="Cerrar"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-5 overflow-y-auto max-h-[68vh]">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {defaultDilutionColumns.map((column) => (
                        <div key={`dilution-form-${column}`}>
                          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">{column}</label>
                          <textarea
                            rows={column === 'SOLUCIONES COMPATIBLES' ? 4 : 3}
                            value={dilutionModal.form?.[column] ?? ''}
                            onChange={(e) => setDilutionModal((prev) => ({
                              ...prev,
                              form: {
                                ...(prev.form || {}),
                                [column]: e.target.value,
                              },
                            }))}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-100"
                            placeholder={`Captura ${column.toLowerCase()}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
                    <button
                      onClick={() => setDilutionModal({ open: false, mode: 'create', rowId: '', form: {} })}
                      className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-100 font-medium"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSaveDilutionModal}
                      className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-medium"
                    >
                      Guardar cambios
                    </button>
                  </div>
                </div>
              </div>
            )}

            {dilutionDeleteTarget && (
              <div className="fixed inset-0 z-[96] bg-slate-900/60 backdrop-blur-[1px] flex items-center justify-center p-4" onClick={() => setDilutionDeleteTarget(null)}>
                <div className="w-full max-w-md rounded-xl border border-red-200 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
                  <div className="px-5 py-4 border-b border-red-100 bg-red-50 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-white border border-red-200 text-red-700 flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">Eliminar dilución</h3>
                      <p className="text-xs text-slate-600">Esta acción no se puede deshacer.</p>
                    </div>
                  </div>
                  <div className="px-5 py-4">
                    <p className="text-sm text-slate-700">¿Deseas eliminar la dilución <span className="font-semibold">{dilutionDeleteTarget?.MEDICAMENTO || 'sin nombre'}</span>?</p>
                  </div>
                  <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
                    <button
                      onClick={() => setDilutionDeleteTarget(null)}
                      className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-100 font-medium"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => handleDeleteDilutionRow(dilutionDeleteTarget.id)}
                      className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {generalExportModal.open && (
          <div className="fixed inset-0 z-[96] bg-slate-900/60 backdrop-blur-[1px] flex items-center justify-center p-4" onClick={closeGeneralExportModal}>
            <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-800">Exportar general por meses</h3>
                  <p className="text-xs text-slate-600">Selecciona uno o varios meses. Se descargan 2 archivos: egresados y no egresados.</p>
                </div>
                <button onClick={closeGeneralExportModal} className="p-2 rounded-md text-slate-500 hover:bg-slate-200 hover:text-slate-700" title="Cerrar">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-5 py-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Año (opcional)</label>
                  <select
                    value={generalExportModal.year}
                    onChange={(e) => setGeneralExportModal((prev) => ({ ...prev, year: e.target.value }))}
                    className="py-2 px-3 border border-slate-300 rounded-lg text-sm shadow-sm text-slate-700 w-full sm:w-56"
                  >
                    <option value="">Todos los años</option>
                    {ANIOS.map((yearValue) => <option key={`export-year-${yearValue}`} value={yearValue}>{yearValue}</option>)}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Meses</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setGeneralExportModal((prev) => ({ ...prev, months: MESES.map((m) => m.val) }))}
                        className="px-2.5 py-1 rounded border border-slate-300 text-slate-700 text-xs bg-white hover:bg-slate-100"
                      >
                        Todos
                      </button>
                      <button
                        type="button"
                        onClick={() => setGeneralExportModal((prev) => ({ ...prev, months: [] }))}
                        className="px-2.5 py-1 rounded border border-slate-300 text-slate-700 text-xs bg-white hover:bg-slate-100"
                      >
                        Ninguno
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {MESES.map((month) => {
                      const checked = generalExportModal.months.includes(month.val);
                      return (
                        <label key={`export-month-${month.val}`} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition ${checked ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-slate-300 text-emerald-600"
                            checked={checked}
                            onChange={() => toggleGeneralExportMonth(month.val)}
                          />
                          <span>{month.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {generalExportError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{generalExportError}</div>
                )}
              </div>

              <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
                <button onClick={closeGeneralExportModal} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-100 font-medium">
                  Cancelar
                </button>
                <button onClick={handleExportGeneralByMonths} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium inline-flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4" /> Exportar
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
