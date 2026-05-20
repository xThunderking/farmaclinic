import { useMemo, useState } from 'react';
import { Activity, AlertTriangle, Bug, CheckCircle, CheckSquare, ClipboardList, FileSpreadsheet, FileWarning, Filter, ListChecks, PieChart, RefreshCcw, Search, ShieldAlert, TestTube, Trash2, UserPlus, Users, XCircle } from 'lucide-react';

// Helper para visualización en Dashboard Calidad
const StatusBadge = ({ done, isNA }) => {
  if (isNA) return <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded text-xs font-bold border border-slate-200">N/A</span>;
  if (done) return <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold flex items-center justify-center w-max mx-auto border border-green-200"><CheckCircle className="w-3 h-3 mr-1"/> Realizada</span>;
  return <span className="px-2 py-1 bg-red-50 text-red-600 rounded text-xs font-bold flex items-center justify-center w-max mx-auto border border-red-200"><XCircle className="w-3 h-3 mr-1"/> Pendiente</span>;
}

export default function Dashboard({ patients, onSelect, onCreate, onDelete, onRestore, onHardDelete, currentUser, users, helpers, constants }) {
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

  const getRoomNumber = (habitacion = '') => {
    const match = String(habitacion || '').match(/\d+/);
    return match ? Number(match[0]) : null;
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

    const dateToFilter = p.demographics.ingreso;
    if (filterMonth || filterYear) {
      if (!dateToFilter) return false;
      const [y, m] = dateToFilter.split('-');
      if (filterYear && y !== filterYear) return false;
      if (filterMonth && m !== filterMonth) return false;
    }

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
  const dischargedCount = patients.filter(p => !p.deleted && p.demographics.egreso).length;
  const atbCount = patients.filter(p => !p.deleted && !p.demographics.egreso && p.perfilFarmaco.some(f => f.categoria === 'Antibiótico' && f.estado === 'Activo')).length;
  const altoRiesgoCount = patients.filter(p => !p.deleted && !p.demographics.egreso && p.perfilFarmaco.some(f => f.categoria === 'Alto Riesgo' && f.estado === 'Activo')).length;

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

  const handleExportGeneral = () => {
    const rows = [
      [
        "Identificador interno (FV)", "N° Expediente", "Habitación", "Nombre del paciente", "Fecha de nacimiento", 
        "Edad", "Genero", "Episodio", "Fecha de ingreso DD/MM/AA HH:MM", 
        "Fecha de egreso DD/MM/AA HH:MM", "Días internado", "Diagnostico", 
        "Motivo de ingreso / Procedimiento", "Tipo de paciente", "Medico tratante", 
        "Alergias", "Especialidad", "Observaciones Generales", "Idoneidad (1ra Dosis)", "Conc. Ingreso", "Conc. Cambio Área", 
        "Conc. Cambio Médico", "Conc. Egreso", "MAR", "Polifarmacia >5 med", "\"Antibiótico ¿Cuales?\"", "Cultivos"
      ]
    ];
    
    filteredPatients.forEach(p => {
      const { years } = calculateAge(p.demographics.fechaNacimiento);
      const estancia = calculateDaysOfUse(p.demographics.ingreso, p.demographics.egreso);
      
      const valIdoneidad = p.perfilFarmacoMeta?.evaluadoPrevioPrimeraDosis ? 'Sí' : 'No';
      const cIng = p.conciliacion.ingresoNA ? 'NA' : (p.conciliacion.ingreso.length > 0 ? 'Sí' : 'No');
      const cArea = p.conciliacion.transicionAreaNA ? 'NA' : (p.conciliacion.transicionesArea?.length > 0 ? 'Sí' : 'No');
      const cMedico = p.conciliacion.transicionMedicoNA ? 'NA' : (p.conciliacion.transicionMedico ? 'Sí' : 'No');
      const cEgr = p.conciliacion.egresoNA ? 'NA' : (p.conciliacion.egreso.length > 0 ? 'Sí' : 'No');
      
      const activos = p.perfilFarmaco.filter(f => f.estado === 'Activo');
      const poli = activos.length > 5 ? 'Sí' : 'No';
      
      const marActivos = p.perfilFarmaco.filter(f => f.categoria === 'Alto Riesgo');
      const marString = marActivos.length > 0 ? `Sí: ${marActivos.map(f=>f.principio).join(', ')}` : 'No';
      
      const atbActivos = p.perfilFarmaco.filter(f => f.categoria === 'Antibiótico');
      const atbString = atbActivos.length > 0 ? atbActivos.map(f=>f.principio).join(', ') : 'Ninguno';
      
      const aislamientos = p.microbiologia.map(m => m.microorganismo).filter(x => x).join(', ') || 'Ninguno';

      rows.push([
        p.demographics.identificadorInterno || p.id, p.demographics.numeroPaciente, p.demographics.habitacion, p.demographics.nombre, p.demographics.fechaNacimiento,
        years, p.demographics.genero, p.demographics.numeroEpisodio,
        formatExcelDate(p.demographics.ingreso), formatExcelDate(p.demographics.egreso),
        estancia, p.demographics.diagnosticoPrincipal, p.demographics.motivoIngreso,
        p.demographics.tipoPaciente, p.demographics.medico, p.demographics.alergias, p.demographics.especialidad, p.demographics.observacionesGenerales,
        valIdoneidad, cIng, cArea, cMedico, cEgr, marString, poli, atbString, aislamientos
      ]);
    });
    exportToCSV(`Base_Pacientes_${view}_${filterMonth||'Todo'}_${filterYear||'Todo'}.csv`, rows);
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
                
                <button onClick={handleExportGeneral} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center font-medium shadow-sm transition text-sm" title="Exportar Demográficos y Clínicos"><FileSpreadsheet className="w-4 h-4 mr-2" /> Exportar General</button>

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

                    const hasAislamiento = p.microbiologia && p.microbiologia.some(m => m.microorganismo && m.microorganismo.trim() !== '');
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
                            {hasPolimedicado && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900 mb-1">PACIENTE POLIMEDICADO +5</span>}
                            {hasAlergias && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white mb-1" title={p.demographics.alergias}>ALERGIAS</span>}
                            {idoneidadOk && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-200 text-green-800 mb-1" title="Idoneidad validada previo a primera dosis"><CheckCircle className="w-3 h-3 mr-1"/> IDONEIDAD OK</span>}
                            {hasAltoRiesgo && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-200 text-red-800 mb-1">ALTO RIESGO</span>}
                            {hasATB && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-200 text-orange-800 mb-1">ATB ({maxDiasATB} d)</span>}
                            {hasAislamiento && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-200 text-purple-800 mb-1 flex items-center" title="Cultivo Positivo"><Bug className="w-3 h-3 mr-1"/> AISLAMIENTO</span>}
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
                            <button disabled={otherActiveUsers.length > 0} onClick={(e) => { e.stopPropagation(); if(otherActiveUsers.length === 0) onDelete(p.id); }} className={`p-2 rounded-md transition-colors ${otherActiveUsers.length > 0 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-400 hover:bg-red-100 hover:text-red-600'}`} title={otherActiveUsers.length > 0 ? 'En uso por otros usuarios' : 'Mover a papelera'}><Trash2 className="w-5 h-5" /></button>
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

      </div>
    </div>
  );
}
