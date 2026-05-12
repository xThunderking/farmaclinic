import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Bell, LogOut, Menu, ShieldCheck, UserCog } from 'lucide-react';

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
}) {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationRef = useRef(null);
  const notificationCount = notifications.length;

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
        <div className="text-right hidden lg:block">
          <p className="font-semibold text-slate-100">{currentUser.nombre}</p>
          <p className="text-xs text-slate-400">{currentUser.puesto} | {currentUser.role.toUpperCase()}</p>
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
              <div className="absolute right-0 mt-2 w-[min(92vw,24rem)] max-h-[26rem] overflow-auto rounded-xl border border-slate-200 bg-white text-slate-800 shadow-2xl z-50">
                <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                  <p className="text-sm font-bold">Notificaciones</p>
                  <p className="text-xs text-slate-500">{notificationCount} alerta(s) activa(s)</p>
                </div>

                {notificationCount === 0 ? (
                  <p className="px-4 py-6 text-sm text-slate-500 text-center">No hay notificaciones activas.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {notifications.map((notification) => (
                      <div key={notification.id} className="px-4 py-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-800">{notification.title}</p>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${notification.severity === 'critical' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                            {notification.severity === 'critical' ? 'CRITICA' : 'ATENCION'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{notification.patientName}</p>
                        <p className="text-xs text-slate-600 mt-1">{notification.message}</p>
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={() => {
                              onNotificationOpen?.(notification);
                              setIsNotificationsOpen(false);
                            }}
                            className="text-xs font-medium px-2.5 py-1 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                          >
                            Abrir paciente
                          </button>
                          {notification.type === 'idle' && (
                            <button
                              onClick={() => onNotificationMarkReviewed?.(notification)}
                              className="text-xs font-medium px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                            >
                              Marcar revision
                            </button>
                          )}
                        </div>
                      </div>
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

