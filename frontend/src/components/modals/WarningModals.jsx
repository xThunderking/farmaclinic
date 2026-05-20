import { AlertTriangle, CheckCircle, Lock, X } from 'lucide-react';

export function LockWarningModal({ lockModal, onClose }) {
  if (!lockModal?.open) return null;

  return (
    <div className="fixed inset-0 z-[90] bg-slate-900/65 backdrop-blur-[1px] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-r from-amber-50 to-rose-50 border-b border-slate-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center border border-amber-200">
            {lockModal.variant === 'error' ? <AlertTriangle className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">{lockModal.title || 'Paciente bloqueado'}</h3>
            <p className="text-xs text-slate-500">Control de edición exclusiva</p>
          </div>
        </div>

        <div className="px-5 py-4">
          <p className="text-sm text-slate-700 leading-relaxed">{lockModal.message || 'Otro usuario está editando este paciente.'}</p>
        </div>

        <div className="px-5 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-semibold transition-colors"
          >
            <CheckCircle className="w-4 h-4" /> Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

export function ConfirmWarningModal({ confirmModal, onResolve }) {
  if (!confirmModal?.open) return null;

  return (
    <div className="fixed inset-0 z-[95] bg-slate-900/70 backdrop-blur-[1px] flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-slate-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center border border-amber-200">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">{confirmModal.title || 'Confirmar acción'}</h3>
            <p className="text-xs text-slate-500">Revisa antes de continuar</p>
          </div>
        </div>

        <div className="px-5 py-4">
          <p className="text-sm text-slate-700 leading-relaxed">{confirmModal.message || '¿Deseas continuar?'}</p>
        </div>

        <div className="px-5 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row gap-2 sm:justify-end">
          <button
            onClick={() => onResolve(false)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 font-medium transition-colors"
          >
            <X className="w-4 h-4" /> {confirmModal.cancelText || 'Cancelar'}
          </button>
          {confirmModal.extraText ? (
            <button
              onClick={() => onResolve('save-exit')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-semibold transition-colors"
            >
              <CheckCircle className="w-4 h-4" /> {confirmModal.extraText}
            </button>
          ) : null}
          <button
            onClick={() => onResolve(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 font-semibold transition-colors"
          >
            <AlertTriangle className="w-4 h-4" /> {confirmModal.confirmText || 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}
