import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, History, Layers, UserPlus, X } from 'lucide-react';
import { FormInput } from '../common/FormControls';

const normalizePatientName = (value = '') => String(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/\s+/g, ' ')
  .trim();

const normalizeRoomValue = (value = '') => String(value)
  .toLowerCase()
  .replace(/\s+/g, ' ')
  .trim();

export default function NewPatientModal({ patients, onClose, onCreateNew, onCreateReingreso, formatExcelDate }) {
  const modalTitle = 'Iniciar nuevo expediente';
  const createNewLabel = 'Crear nuevo perfil';
  const createReingresoLabel = 'Agregar como reingreso';
  const [formData, setFormData] = useState(() => {
    const currentDateLocal = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    return {
      nombre: '',
      fechaNacimiento: '',
      habitacion: '',
      numeroPaciente: '',
      identificadorInterno: '',
      fechaIngreso: currentDateLocal,
    };
  });

  useEffect(() => {
    if (!formData.fechaIngreso) return;
    const d = new Date(formData.fechaIngreso);
    if (isNaN(d.getTime())) return;

    const yy = d.getFullYear().toString().slice(-2);
    const mm = (d.getMonth() + 1).toString().padStart(2, '0');
    const prefix = `FV-${mm}${yy}-`;

    const matchingPatients = patients.filter(
      (p) => p.demographics.identificadorInterno && p.demographics.identificadorInterno.startsWith(prefix)
    );

    let maxConsecutive = 0;
    matchingPatients.forEach((p) => {
      const parts = p.demographics.identificadorInterno.split('-');
      if (parts.length === 3) {
        const num = parseInt(parts[2], 10);
        if (!isNaN(num) && num > maxConsecutive) {
          maxConsecutive = num;
        }
      }
    });

    const nextNum = (maxConsecutive + 1).toString().padStart(3, '0');
    const newIdFV = `${prefix}${nextNum}`;

    if (formData.identificadorInterno !== newIdFV) {
      setFormData((prev) => ({ ...prev, identificadorInterno: newIdFV }));
    }
  }, [formData.fechaIngreso, formData.identificadorInterno, patients]);

  const duplicateMatch = useMemo(() => {
    return patients.find((p) => {
      if (p.deleted) return false;

      const incomingName = normalizePatientName(formData.nombre);
      const existingName = normalizePatientName(p.demographics.nombre);
      const sameName = incomingName.length > 3 && existingName.length > 3 && incomingName === existingName;

      const hasDob = p.demographics.fechaNacimiento && formData.fechaNacimiento;
      const sameDob = hasDob && p.demographics.fechaNacimiento === formData.fechaNacimiento;

      return sameName && sameDob;
    });
  }, [formData.fechaNacimiento, formData.nombre, patients]);

  const duplicateEpisodes = useMemo(() => {
    if (!duplicateMatch) return [];
    const baseId = duplicateMatch.pacienteBaseId || duplicateMatch.id;
    return patients
      .filter((p) => !p.deleted && (p.pacienteBaseId || p.id) === baseId)
      .sort((a, b) => new Date(b.demographics.ingreso) - new Date(a.demographics.ingreso));
  }, [duplicateMatch, patients]);

  const activeRoomConflict = useMemo(() => {
    const room = normalizeRoomValue(formData.habitacion);
    if (!room) return null;

    return patients.find((p) => {
      if (p.deleted) return false;
      if (p.demographics?.egreso) return false;
      return normalizeRoomValue(p.demographics?.habitacion) === room;
    }) || null;
  }, [formData.habitacion, patients]);

  const roomConflictMessage = activeRoomConflict
    ? `La habitación ${formData.habitacion || '-'} ya está ocupada por ${activeRoomConflict.demographics?.nombre || 'otro paciente activo'}.`
    : '';

  const disableCreateActions = Boolean(activeRoomConflict);

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-blue-600 p-4 text-white flex justify-between items-center shrink-0">
          <h2 className="font-bold flex items-center">
            <UserPlus className="w-5 h-5 mr-2" /> {modalTitle}
          </h2>
          <button onClick={onClose} className="text-blue-200 hover:text-white" aria-label="Cerrar modal">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <p className="text-sm text-slate-500 mb-2">Ingresa los datos base para validar en el sistema:</p>

          <FormInput
            label="Nombre completo"
            value={formData.nombre}
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            placeholder="Ej. Juan Pérez García"
          />

          <FormInput
            label="Fecha de nacimiento"
            type="date"
            value={formData.fechaNacimiento}
            onChange={(e) => setFormData({ ...formData, fechaNacimiento: e.target.value })}
          />

          <FormInput
            label="Fecha y hora de ingreso"
            type="datetime-local"
            value={formData.fechaIngreso}
            onChange={(e) => setFormData({ ...formData, fechaIngreso: e.target.value })}
          />

          <FormInput
            label="Habitación"
            value={formData.habitacion}
            onChange={(e) => setFormData({ ...formData, habitacion: e.target.value })}
            placeholder="Ej. 401-B"
          />

          {activeRoomConflict && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <p className="font-semibold">Habitación ocupada</p>
              <p>{roomConflictMessage}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="No. Paciente (Expediente)"
              value={formData.numeroPaciente}
              onChange={(e) => setFormData({ ...formData, numeroPaciente: e.target.value })}
              placeholder="Ej. PAC-001"
            />

            <div className="flex flex-col">
              <label className="text-sm font-semibold text-slate-600 mb-1 truncate">Identificador Interno (FV)</label>
              <input
                type="text"
                readOnly
                value={formData.identificadorInterno}
                className="border-slate-300 rounded-md shadow-sm sm:text-sm px-3 py-2 bg-slate-100 text-slate-500 font-mono border cursor-not-allowed"
                title="Generado automáticamente por el sistema"
              />
            </div>
          </div>

          {duplicateMatch && (
            <div className="mt-4 bg-amber-50 border border-amber-200 p-4 rounded-lg shadow-sm">
              <h4 className="font-bold text-amber-800 flex items-center mb-1">
                <AlertTriangle className="w-5 h-5 mr-2" /> Atención: paciente existente
              </h4>
              <p className="text-sm text-amber-700 mb-3">
                Se encontró un registro para <strong>{duplicateMatch.demographics.nombre}</strong>. Revisa su historial previo de
                hospitalizaciones:
              </p>

              <div className="max-h-40 overflow-y-auto mb-4 space-y-2 pr-1 custom-scrollbar">
                {duplicateEpisodes.map((ep, idx) => {
                  const isActivo = !ep.demographics.egreso;
                  return (
                    <div
                      key={ep.id}
                      className={`bg-white p-3 rounded-md border ${isActivo ? 'border-red-300 shadow-sm' : 'border-amber-100'} text-xs relative`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-slate-700 flex items-center">
                          <History className="w-3 h-3 mr-1 text-slate-400" />
                          Episodio {duplicateEpisodes.length - idx} {ep.demographics.numeroEpisodio ? `(${ep.demographics.numeroEpisodio})` : ''}
                        </span>
                        {isActivo && (
                          <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold text-[9px] uppercase tracking-wider">
                            Activo actual
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-slate-600 mt-2">
                        <div>
                          <span className="font-semibold">Ingreso:</span> {formatExcelDate(ep.demographics.ingreso).split(' ')[0]}
                        </div>
                        <div>
                          <span className="font-semibold">Egreso:</span>{' '}
                          {ep.demographics.egreso ? formatExcelDate(ep.demographics.egreso).split(' ')[0] : '-'}
                        </div>
                      </div>

                      {ep.demographics.diagnosticoPrincipal && (
                        <div className="text-slate-500 mt-2 border-t border-slate-100 pt-1 truncate">
                          <span className="font-semibold">Dx:</span> {ep.demographics.diagnosticoPrincipal}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {duplicateEpisodes.some((ep) => !ep.demographics.egreso) && (
                <p className="text-xs text-red-600 font-bold mb-3 flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-1" /> El paciente tiene un episodio de hospitalización actualmente activo.
                </p>
              )}

              <div className="flex flex-col sm:flex-row gap-2 mt-4">
                <button
                  disabled={disableCreateActions}
                  onClick={() => onCreateReingreso(duplicateMatch, formData)}
                  className={`flex-1 py-2 px-3 rounded-md font-bold shadow transition flex items-center justify-center text-sm ${disableCreateActions ? 'bg-amber-300 text-amber-100 cursor-not-allowed' : 'bg-amber-600 hover:bg-amber-700 text-white'}`}
                  title={disableCreateActions ? roomConflictMessage : createReingresoLabel}
                >
                  <Layers className="w-4 h-4 mr-2" /> {createReingresoLabel}
                </button>
                <button
                  disabled={disableCreateActions}
                  onClick={() => onCreateNew(formData)}
                  className={`flex-1 py-2 px-3 rounded-md font-bold shadow-sm transition flex items-center justify-center text-sm ${disableCreateActions ? 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-white border border-slate-300 hover:bg-slate-50 text-slate-700'}`}
                  title={disableCreateActions ? roomConflictMessage : createNewLabel}
                >
                  <UserPlus className="w-4 h-4 mr-2" /> {createNewLabel}
                </button>
              </div>
            </div>
          )}

          {!duplicateMatch && (
            <button
              disabled={disableCreateActions}
              onClick={() => onCreateNew(formData)}
              className={`mt-6 w-full font-bold py-2.5 px-4 rounded-lg shadow transition-colors flex items-center justify-center ${disableCreateActions ? 'bg-blue-300 text-blue-100 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
              title={disableCreateActions ? roomConflictMessage : createNewLabel}
            >
              {createNewLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
