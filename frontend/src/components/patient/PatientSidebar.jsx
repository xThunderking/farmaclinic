import {
  Activity,
  ClipboardList,
  Save,
  FileSpreadsheet,
  FileWarning,
  Layers,
  Microscope,
  Pill,
  Printer,
  ShieldAlert,
  Trash2,
  Users,
  X,
} from 'lucide-react';

function TabButton({ icon, label, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
        isActive
          ? 'bg-blue-50 text-blue-700 border border-blue-200 font-semibold'
          : 'text-slate-600 hover:bg-slate-50 border border-transparent'
      }`}
    >
      <span className={`mr-3 ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>{icon}</span>
      {label}
    </button>
  );
}

export default function PatientSidebar({
  activePatient,
  activeTab,
  onTabChange,
  edad,
  grupoEtario,
  diasEstancia,
  episodiosDelPaciente,
  currentUser,
  onCreateReingreso,
  onSelectEpisode,
  onDeleteEpisode,
  onSaveChanges,
  saveDisabled = false,
  saveLoading = false,
  onExportCsv,
  onPrint,
  formatDate,
  presenceTtlMs = 90000,
  className = '',
  showCloseButton = false,
  onRequestClose,
}) {
  return (
    <div className={`w-full bg-white border-r border-slate-200 flex flex-col shadow-sm print:hidden z-10 overflow-hidden h-full ${className}`}>
      <div className="shrink-0">
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-start justify-between gap-2">
            <h2 className="font-bold text-lg truncate text-blue-800" title={activePatient.demographics.nombre || 'Sin Nombre'}>
              {activePatient.demographics.nombre || 'Nuevo Paciente'}
            </h2>
            {showCloseButton && (
              <button
                onClick={onRequestClose}
                className="xl:hidden p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                title="Cerrar menu"
                aria-label="Cerrar menu lateral"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="text-xs text-slate-500 mt-1 space-y-1">
            <p>
              Exp: <strong>{activePatient.demographics.numeroPaciente || '-'}</strong> | FV:{' '}
              <strong>{activePatient.demographics.identificadorInterno || '-'}</strong>
            </p>
            <p>
              Hab: {activePatient.demographics.habitacion || '-'} | Edad: {edad ? `${edad} a. (${grupoEtario})` : '-'}
            </p>
            <p className="font-medium text-slate-700 bg-slate-100 inline-block px-2 py-0.5 rounded">
              Estancia: {diasEstancia} dias
            </p>
          </div>
          {activePatient.demographics.egreso && (
            <span className="mt-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
              Egresado ({formatDate(activePatient.demographics.egreso)})
            </span>
          )}
        </div>

        {episodiosDelPaciente.length > 0 && activePatient.demographics.nombre && (
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase flex items-center">
                <Layers className="w-3 h-3 mr-1" /> Historial / Episodios
              </h3>
              <button
                onClick={onCreateReingreso}
                className="text-[10px] bg-blue-600 text-white px-2 py-1 rounded font-bold hover:bg-blue-700 transition"
                title="Crear un nuevo episodio de hospitalizacion para este paciente"
              >
                + Reingreso
              </button>
            </div>

            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {episodiosDelPaciente.map((ep, i) => {
                const now = Date.now();
                const epLastSeen = ep.activeUsersLastSeen || {};
                const epOtherActive = (ep.activeUsers || []).filter((uid) => {
                  if (uid === currentUser.id) return false;
                  const ts = Number(epLastSeen[uid]);
                  if (!Number.isFinite(ts) || ts <= 0) return true;
                  return now - ts <= presenceTtlMs;
                });
                const hasOthersInEp = epOtherActive.length > 0;

                return (
                  <div
                    key={ep.id}
                    className={`w-full flex items-center px-2 py-1.5 text-xs rounded border transition-colors ${
                      ep.id === activePatient.id
                        ? 'bg-blue-100 border-blue-300 shadow-inner'
                        : 'bg-white border-slate-200 hover:bg-slate-100 shadow-sm'
                    }`}
                  >
                    <button
                      onClick={() => onSelectEpisode(ep.id)}
                      className={`flex-1 text-left ${ep.id === activePatient.id ? 'text-blue-800 font-bold' : 'text-slate-600'}`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="truncate max-w-[100px] flex items-center">
                          {hasOthersInEp && <Users className="w-3 h-3 text-blue-500 mr-1" title="Otros usuarios editando" />}
                          Ep. {i + 1} {ep.demographics.numeroEpisodio ? `(${ep.demographics.numeroEpisodio})` : ''}
                        </span>
                        <span
                          className={`text-[9px] px-1 py-0.5 rounded ${
                            ep.demographics.egreso ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {ep.demographics.egreso ? 'Alta' : 'Activo'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">{formatDate(ep.demographics.ingreso).split(' ')[0]}</div>
                    </button>

                    {episodiosDelPaciente.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('Seguro que deseas eliminar permanentemente este episodio?')) {
                            onDeleteEpisode(ep.id);
                          }
                        }}
                        className="ml-2 p-1 rounded transition-colors text-slate-400 hover:text-red-600 hover:bg-red-50"
                        title="Eliminar este episodio"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <nav className="flex-1 min-h-0 p-2 space-y-1 overflow-y-auto">
        <TabButton
          icon={<Users />}
          label="Perfil General"
          isActive={activeTab === 'demographics'}
          onClick={() => onTabChange('demographics')}
        />
        <TabButton
          icon={<ClipboardList />}
          label="Entrevista y Conciliacion"
          isActive={activeTab === 'conciliation'}
          onClick={() => onTabChange('conciliation')}
        />
        <TabButton
          icon={<Pill />}
          label="Perfil Farmacoterapeutico"
          isActive={activeTab === 'pharmacotherapy'}
          onClick={() => onTabChange('pharmacotherapy')}
        />
        <TabButton
          icon={<FileWarning />}
          label="Interacciones y PRM"
          isActive={activeTab === 'prm'}
          onClick={() => onTabChange('prm')}
        />
        <TabButton
          icon={<Activity />}
          label="Laboratorios (y TFG)"
          isActive={activeTab === 'labs'}
          onClick={() => onTabChange('labs')}
        />
        <TabButton icon={<Microscope />} label="Microbiologia" isActive={activeTab === 'micro'} onClick={() => onTabChange('micro')} />
        <TabButton
          icon={<ShieldAlert />}
          label="Reacciones Adversas"
          isActive={activeTab === 'ram'}
          onClick={() => onTabChange('ram')}
        />
      </nav>

      <div className="mt-auto shrink-0 p-4 border-t border-slate-200 space-y-2 bg-slate-50">
        <button
          onClick={onSaveChanges}
          disabled={saveDisabled}
          className={`w-full flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            saveDisabled
              ? 'bg-blue-100 text-blue-400 border border-blue-200 cursor-not-allowed'
              : 'bg-blue-600 text-white border border-blue-700 hover:bg-blue-700'
          }`}
          title="Guardar cambios del paciente"
        >
          <Save className="w-4 h-4 mr-2" /> {saveLoading ? 'Guardando...' : 'Guardar cambios'}
        </button>
        <button
          onClick={onExportCsv}
          className="w-full flex items-center justify-center px-3 py-2 bg-green-50 text-green-700 border border-green-200 rounded-md text-sm font-medium hover:bg-green-100 transition-colors"
        >
          <FileSpreadsheet className="w-4 h-4 mr-2" /> Exportar CSV
        </button>
        <button
          onClick={onPrint}
          className="w-full flex items-center justify-center px-3 py-2 bg-white text-slate-700 border border-slate-300 rounded-md text-sm font-medium hover:bg-slate-100 transition-colors"
        >
          <Printer className="w-4 h-4 mr-2" /> Imprimir / PDF General
        </button>
      </div>
    </div>
  );
}

