import logoHospitalAngeles from '../../assets/logo-hospital-angeles.png';

const REPORT_VERSION = 'FARMA-CLINIC-RPT v2.1';

const hasMeaningfulValue = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (typeof value === 'number') return !Number.isNaN(value);
  if (typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.some(hasMeaningfulValue);
  if (typeof value === 'object') return Object.values(value).some(hasMeaningfulValue);
  return false;
};

const formatPrintValue = (key, value, formatExcelDate) => {
  if (!hasMeaningfulValue(value)) return '';
  if (typeof value === 'boolean') return value ? 'Si' : 'No';
  if (typeof value === 'number') return String(value);
  if (typeof value !== 'string') return String(value);

  const cleaned = value.trim();
  const shouldFormatDate = /(fecha|date|ingreso|egreso|inicio|suspension|muestra)/i.test(key || '');
  if (shouldFormatDate && /^\d{4}-\d{2}-\d{2}/.test(cleaned) && typeof formatExcelDate === 'function') {
    return formatExcelDate(cleaned);
  }
  return cleaned;
};

const kvRows = (entries = [], formatExcelDate) => entries
  .filter((entry) => hasMeaningfulValue(entry?.value))
  .map((entry) => ({
    Campo: entry.label,
    Valor: formatPrintValue(entry.keyName || entry.label, entry.value, formatExcelDate),
  }));

function TableBlock({ title, columns = [], rows = [] }) {
  if (!rows.length) return null;

  return (
    <article className="print-table-block print:break-inside-avoid-page">
      <div className="print-table-title">{title}</div>
      <table className="print-table">
        <thead>
          <tr>
            {columns.map((col) => <th key={`${title}-h-${col}`}>{col}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={`${title}-r-${idx}`}>
              {columns.map((col) => (
                <td key={`${title}-${idx}-${col}`}>{hasMeaningfulValue(row[col]) ? String(row[col]) : '-'}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}

function Section({ number, title, children }) {
  return (
    <section className="print-section print:break-inside-avoid-page">
      <div className="print-section-header">
        <span className="print-section-kicker">Seccion {number}</span>
        <h2 className="print-section-title">{title}</h2>
      </div>
      <div className="print-section-body">{children}</div>
    </section>
  );
}

export default function PrintPatientReport({
  patient,
  calculateAge,
  calculateDaysOfUse,
  preguntasEntrevista = [],
  formatExcelDate,
}) {
  if (!patient) return null;

  const d = patient.demographics || {};
  const conc = patient.conciliacion || {};
  const interview = patient.interview || {};
  const ageData = typeof calculateAge === 'function' ? calculateAge(d.fechaNacimiento) : { years: '', group: '' };
  const diasEstancia = typeof calculateDaysOfUse === 'function' ? calculateDaysOfUse(d.ingreso, d.egreso) : '';

  const now = new Date();

  const resumenRows = [
    {
      Paciente: formatPrintValue('nombre', d.nombre, formatExcelDate) || 'Sin nombre',
      Expediente: formatPrintValue('numeroPaciente', d.numeroPaciente, formatExcelDate) || '-',
      Episodio: formatPrintValue('numeroEpisodio', d.numeroEpisodio, formatExcelDate) || '-',
      Habitacion: formatPrintValue('habitacion', d.habitacion, formatExcelDate) || '-',
      Edad: hasMeaningfulValue(ageData?.years) ? `${ageData.years} anos${ageData.group ? ` (${ageData.group})` : ''}` : '-',
      Estancia: hasMeaningfulValue(diasEstancia) ? `${diasEstancia} dias` : '-',
      Farmacos: `${(patient.perfilFarmaco || []).length}`,
      PRM: `${(patient.prms || []).length}`,
      Interacciones: `${(patient.interacciones || []).length}`,
    },
  ];

  const identificacionRows = kvRows([
    { label: 'Identificador interno', keyName: 'identificadorInterno', value: d.identificadorInterno },
    { label: 'Genero', keyName: 'genero', value: d.genero },
    { label: 'Tipo de paciente', keyName: 'tipoPaciente', value: d.tipoPaciente },
    { label: 'Especialidad', keyName: 'especialidad', value: d.especialidad },
    { label: 'Medico tratante', keyName: 'medico', value: d.medico },
    { label: 'Ingreso', keyName: 'ingreso', value: d.ingreso },
    { label: 'Egreso', keyName: 'egreso', value: d.egreso },
  ], formatExcelDate);

  const clinicoRows = kvRows([
    { label: 'Motivo de ingreso', keyName: 'motivoIngreso', value: d.motivoIngreso },
    { label: 'Diagnostico principal', keyName: 'diagnosticoPrincipal', value: d.diagnosticoPrincipal },
    { label: 'Alergias', keyName: 'alergias', value: d.alergias },
    { label: 'Intolerancias', keyName: 'intolerancias', value: d.intolerancias },
    { label: 'Comorbilidades', keyName: 'comorbilidades', value: d.comorbilidades },
    { label: 'Antecedentes', keyName: 'antecedentes', value: d.antecedentes },
    { label: 'Observaciones generales', keyName: 'observacionesGenerales', value: d.observacionesGenerales },
  ], formatExcelDate);

  const antropometriaRows = kvRows([
    { label: 'Peso (kg)', keyName: 'peso', value: d.peso },
    { label: 'Altura (cm)', keyName: 'altura', value: d.altura },
    { label: 'Embarazo', keyName: 'embarazada', value: d.embarazada },
    { label: 'Semanas de gestacion', keyName: 'semanasGestacion', value: d.semanasGestacion },
    { label: 'Tabaquismo', keyName: 'fuma', value: d.fuma },
    { label: 'Alcoholismo', keyName: 'alcoholismo', value: d.alcoholismo },
    { label: 'Toxicomania', keyName: 'toxicomania', value: d.toxicomania },
  ], formatExcelDate);

  const entrevistaRows = kvRows((preguntasEntrevista || []).map((q) => ({ label: q.text, keyName: q.id, value: interview[q.id] })), formatExcelDate);

  const conciliacionEstadoRows = [
    {
      Ingreso: conc.ingresoNA ? 'No aplica' : (conc.ingreso || []).length > 0 ? 'Realizada' : 'Pendiente',
      'Transicion Area': conc.transicionAreaNA ? 'No aplica' : (conc.transicionesArea || []).length > 0 ? 'Realizada' : 'Pendiente',
      'Transicion Medico': conc.transicionMedicoNA ? 'No aplica' : conc.transicionMedico ? 'Realizada' : 'Pendiente',
      Egreso: conc.egresoNA ? 'No aplica' : (conc.egreso || []).length > 0 ? 'Realizada' : 'Pendiente',
    },
  ];

  const perfilRows = (patient.perfilFarmaco || []).map((item) => ({
    Categoria: item.categoria,
    Principio: item.principio,
    Dosis: item.dosis,
    Via: item.via,
    Frecuencia: item.frecuencia,
    Inicio: formatPrintValue('fechaInicio', item.fechaInicio, formatExcelDate),
    Estado: item.estado,
    Idoneidad: item.idoneidad,
  })).filter((row) => Object.values(row).some(hasMeaningfulValue));

  const solucionesRows = (patient.solucionesIV || []).map((item) => ({
    Solucion: item.solucion,
    Volumen: item.volumen,
    Tiempo: item.tiempo,
    Velocidad: item.velocidad,
    Frecuencia: item.frecuencia,
    Inicio: formatPrintValue('fechaInicio', item.fechaInicio, formatExcelDate),
    Estado: item.estado,
  })).filter((row) => Object.values(row).some(hasMeaningfulValue));

  const prmRows = (patient.prms || []).map((item) => ({
    Fecha: formatPrintValue('fecha', item.fecha, formatExcelDate),
    Area: item.area,
    Medicamento: item.medicamento,
    Descripcion: item.descripcion,
    Intervencion: item.intervencion,
    Aceptacion: item.aceptacion,
    Resolucion: item.resolucion,
    Gravedad: item.gravedad,
  })).filter((row) => Object.values(row).some(hasMeaningfulValue));

  const interaccionRows = (patient.interacciones || []).map((item) => ({
    Fecha: formatPrintValue('fecha', item.fecha, formatExcelDate),
    Medicamentos: item.medicamentos,
    Grado: item.grado,
    Consecuencia: item.consecuencia,
  })).filter((row) => Object.values(row).some(hasMeaningfulValue));

  const ramRows = (patient.ram || []).map((item) => ({
    Fecha: formatPrintValue('fecha', item.fecha, formatExcelDate),
    Medicamento: item.medicamento,
    Severidad: item.severidad,
    Gravedad: item.gravedad,
    'Que paso': item.quePaso,
    'Que se hizo': item.queSeHizo,
  })).filter((row) => Object.values(row).some(hasMeaningfulValue));

  const labsRows = Object.entries(patient.labs || {}).flatMap(([param, rows]) =>
    (rows || []).filter((row) => hasMeaningfulValue(row?.date) || hasMeaningfulValue(row?.value)).map((row) => ({
      Parametro: param,
      Fecha: formatPrintValue('date', row.date, formatExcelDate),
      Valor: row.value,
    })),
  );

  const microRows = (patient.microbiologia || []).map((item) => ({
    'Fecha muestra': formatPrintValue('fechaMuestra', item.fechaMuestra, formatExcelDate),
    Muestra: item.tipoMuestra,
    Sitio: item.sitioCultivo,
    Microorganismo: item.microorganismo,
    Sensibles: item.sensibles,
    Resistentes: item.resistentes,
  })).filter((row) => Object.values(row).some(hasMeaningfulValue));

  return (
    <div className="print-report-root print:w-full print:bg-white text-slate-900">
      <header className="print-header print:break-inside-avoid-page">
        <div className="print-header-top">
          <div className="flex items-center gap-3 min-w-0">
            <img src={logoHospitalAngeles} alt="Logo Hospital Angeles" className="print-logo" />
            <div className="min-w-0">
              <p className="print-eyebrow">Hospital Angeles Queretaro</p>
              <h1 className="print-title">Reporte Clinico Farmacoterapeutico Integral</h1>
              <p className="print-meta">Servicio de Farmacia Clinica</p>
            </div>
          </div>
          <div className="print-meta-box">
            <p>Fecha: {now.toLocaleDateString()}</p>
            <p>Hora: {now.toLocaleTimeString()}</p>
            <p>Version: {REPORT_VERSION}</p>
          </div>
        </div>
        <div className="print-header-bottom">
          <TableBlock
            title="Resumen del caso"
            columns={['Paciente', 'Expediente', 'Episodio', 'Habitacion', 'Edad', 'Estancia', 'Farmacos', 'PRM', 'Interacciones']}
            rows={resumenRows}
          />
        </div>
      </header>

      <Section number="01" title="Datos generales y contexto">
        <div className="print-two-col">
          <TableBlock title="Identificacion" columns={['Campo', 'Valor']} rows={identificacionRows} />
          <TableBlock title="Contexto clinico" columns={['Campo', 'Valor']} rows={clinicoRows} />
        </div>
        <div className="mt-3">
          <TableBlock title="Antropometria y riesgos" columns={['Campo', 'Valor']} rows={antropometriaRows} />
        </div>
      </Section>

      <Section number="02" title="Conciliacion y entrevista">
        <TableBlock
          title="Estado de conciliacion"
          columns={['Ingreso', 'Transicion Area', 'Transicion Medico', 'Egreso']}
          rows={conciliacionEstadoRows}
        />
        <div className="mt-3">
          <TableBlock title="Entrevista de conciliacion" columns={['Campo', 'Valor']} rows={entrevistaRows} />
        </div>
      </Section>

      <Section number="03" title="Farmacoterapia">
        <TableBlock
          title="Perfil farmacoterapeutico"
          columns={['Categoria', 'Principio', 'Dosis', 'Via', 'Frecuencia', 'Inicio', 'Estado', 'Idoneidad']}
          rows={perfilRows}
        />
        <div className="mt-3">
          <TableBlock
            title="Soluciones intravenosas"
            columns={['Solucion', 'Volumen', 'Tiempo', 'Velocidad', 'Frecuencia', 'Inicio', 'Estado']}
            rows={solucionesRows}
          />
        </div>
      </Section>

      <Section number="04" title="Seguridad clinica">
        <TableBlock
          title="PRM"
          columns={['Fecha', 'Area', 'Medicamento', 'Descripcion', 'Intervencion', 'Aceptacion', 'Resolucion', 'Gravedad']}
          rows={prmRows}
        />
        <div className="mt-3">
          <TableBlock
            title="Interacciones"
            columns={['Fecha', 'Medicamentos', 'Grado', 'Consecuencia']}
            rows={interaccionRows}
          />
        </div>
        <div className="mt-3">
          <TableBlock
            title="Reacciones adversas (RAM)"
            columns={['Fecha', 'Medicamento', 'Severidad', 'Gravedad', 'Que paso', 'Que se hizo']}
            rows={ramRows}
          />
        </div>
      </Section>

      <Section number="05" title="Laboratorio y microbiologia">
        <TableBlock title="Laboratorios" columns={['Parametro', 'Fecha', 'Valor']} rows={labsRows} />
        <div className="mt-3">
          <TableBlock
            title="Microbiologia"
            columns={['Fecha muestra', 'Muestra', 'Sitio', 'Microorganismo', 'Sensibles', 'Resistentes']}
            rows={microRows}
          />
        </div>
      </Section>

      <footer className="print-footer">Documento generado por Farmacia Clinica. Uso institucional.</footer>
    </div>
  );
}
