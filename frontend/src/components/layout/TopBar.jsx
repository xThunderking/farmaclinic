import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Bell, LogOut, Menu, Save, ShieldCheck, UserCog } from 'lucide-react';

export default function TopBar({
  currentUser,
  onLogout,
  onAdmin,
  isPatientView,
  onBack,
  showSidebarToggle = false,
  onToggleSidebar,
  notifications = [],
  onNotificationOpen,
  onNotificationMarkReviewed,
  onSaveChanges,
  saveDisabled = false,
  saveLoading = false,
}) {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationRef = useRef(null);
  const notificationCount = notifications.length;
  const criticalCount = notifications.filter((item) => item.severity === 'critical').length;

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!notificationRef.current) return;
      if (!notificationRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
    };

    window.addEventListener('mousedown', handleOutsideClick);
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  return (
    <div className="bg-slate-900 text-white px-3 sm:px-6 py-3 flex justify-between items-center shadow-md print:hidden z-20">
      <div className="flex items-center gap-1 sm:gap-3 min-w-0">
        {showSidebarToggle && (
          <button
            onClick={onToggleSidebar}
            className="xl:hidden p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-full transition"
            title="Abrir menu"
            aria-label="Abrir menu lateral"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        {isPatientView && (
          <button onClick={onBack} className="text-slate-300 hover:text-white flex items-center text-sm font-medium transition-colors px-2 py-1 rounded-md hover:bg-slate-800">
            <ArrowLeft className="w-5 h-5 sm:mr-1" />
            <span className="hidden sm:inline">Dashboard</span>
          </button>
        )}
        <div className="flex items-center min-w-0">
          <ShieldCheck className="w-6 h-6 text-blue-400 mr-2" />
          <span className="font-bold text-base sm:text-lg tracking-wide truncate">Farmacia Clinica</span>
        </div>
      </div>
      <div className="flex items-center space-x-2 sm:space-x-6 text-sm shrink-0">
        {isPatientView && onSaveChanges && (
          <button
            onClick={onSaveChanges}
            disabled={saveDisabled}
            className={`inline-flex lg:hidden items-center gap-1.5 px-2 py-2 rounded-lg text-xs font-semibold border transition-colors ${
              saveDisabled
                ? 'bg-blue-900/40 text-blue-300 border-blue-900/70 cursor-not-allowed'
                : 'bg-blue-600 text-white border-blue-500 hover:bg-blue-500'
            }`}
            title={saveLoading ? 'Guardando cambios...' : 'Guardar cambios'}
            aria-label={saveLoading ? 'Guardando cambios' : 'Guardar cambios'}
          >
            <Save className={`w-3.5 h-3.5 ${saveLoading ? 'animate-pulse' : ''}`} />
            <span className="hidden sm:inline">{saveLoading ? 'Guardando...' : 'Guardar'}</span>
          </button>
        )}
        <div className="hidden lg:flex lg:items-center lg:gap-3">
          {isPatientView && onSaveChanges && (
            <button
              onClick={onSaveChanges}
              disabled={saveDisabled}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                saveDisabled
                  ? 'bg-blue-900/40 text-blue-300 border-blue-900/70 cursor-not-allowed'
                  : 'bg-blue-600 text-white border-blue-500 hover:bg-blue-500'
              }`}
              title="Guardar cambios"
            >
              <Save className="w-3.5 h-3.5" /> {saveLoading ? 'Guardando...' : 'Guardar cambios'}
            </button>
          )}
          <div className="text-right">
            <p className="font-semibold text-slate-100">{currentUser.nombre}</p>
            <p className="text-xs text-slate-400">{currentUser.puesto} | {currentUser.role.toUpperCase()}</p>
          </div>
        </div>
        <div className="flex items-center space-x-1 sm:space-x-2 border-l border-slate-700 pl-2 sm:pl-4">
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setIsNotificationsOpen((prev) => !prev)}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-full transition relative"
              title="Notificaciones"
              aria-label="Notificaciones"
            >
              <Bell className="w-5 h-5" />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] leading-[18px] text-center font-bold">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
            </button>

            {isNotificationsOpen && (
              <div className="absolute right-0 mt-2 w-[min(94vw,27rem)] rounded-2xl border border-slate-200 bg-white text-slate-800 shadow-2xl z-50 overflow-hidden">
                <div className="px-4 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 text-white">
                  <p className="text-sm font-semibold tracking-wide">Centro de Notificaciones</p>
                  <div className="mt-2 flex items-center gap-2 text-[11px]">
                    <span className="px-2 py-0.5 rounded-full bg-white/15 border border-white/20">{notificationCount} activas</span>
                    <span className="px-2 py-0.5 rounded-full bg-red-500/20 border border-red-300/25 text-red-100">{criticalCount} criticas</span>
                  </div>
                </div>

                {notificationCount === 0 ? (
                  <p className="px-4 py-8 text-sm text-slate-500 text-center bg-slate-50">No hay notificaciones activas.</p>
                ) : (
                  <div className="max-h-[26rem] overflow-auto p-3 space-y-2 bg-slate-50/70">
                    {notifications.map((notification) => (
                      (() => {
                        const isCritical = notification.severity === 'critical';
                        const isInfo = notification.severity === 'info';
                        const containerClass = isCritical
                          ? 'border-red-200 bg-red-50/70'
                          : isInfo
                            ? 'border-blue-200 bg-blue-50/70'
                            : 'border-amber-200 bg-amber-50/70';
                        const badgeClass = isCritical
                          ? 'bg-red-100 text-red-700 border border-red-200'
                          : isInfo
                            ? 'bg-blue-100 text-blue-700 border border-blue-200'
                            : 'bg-amber-100 text-amber-700 border border-amber-200';
                        const badgeLabel = isCritical ? 'CRITICA' : isInfo ? 'INFO' : 'ATENCION';
                        const openLabel = (notification.type === 'recordatorio' || notification.type === 'ultima-dosis') ? 'Revisar paciente' : 'Abrir paciente';

                        return (
                      <article
                        key={notification.id}
                        className={`rounded-xl border p-3 shadow-sm transition-colors ${containerClass}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold tracking-wide ${badgeClass}`}
                          >
                            {badgeLabel}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{notification.patientName}</p>
                        <p className="text-xs text-slate-700 mt-1.5 leading-relaxed">{notification.message}</p>
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => {
                              onNotificationOpen?.(notification);
                              setIsNotificationsOpen(false);
                            }}
                            className="text-xs font-semibold px-2.5 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                          >
                            {openLabel}
                          </button>
                          {(notification.type === 'idle' || notification.type === 'antibiotico' || notification.type === 'ultima-dosis') && (
                            <button
                              onClick={() => onNotificationMarkReviewed?.(notification)}
                              className="text-xs font-semibold px-2.5 py-1.5 rounded-md bg-white text-slate-700 border border-slate-300 hover:bg-slate-100 transition-colors"
                            >
                              {notification.type === 'idle' ? 'Marcar revision' : 'Marcar como visto'}
                            </button>
                          )}
                        </div>
                      </article>
                        );
                      })()
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {currentUser.role === 'admin' && !isPatientView && (
            <button onClick={onAdmin} className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-full transition" title="Administrar Usuarios">
              <UserCog className="w-5 h-5" />
            </button>
          )}
          <button onClick={onLogout} className="p-2 text-slate-300 hover:text-red-400 hover:bg-slate-800 rounded-full transition" title="Cerrar Sesion">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
