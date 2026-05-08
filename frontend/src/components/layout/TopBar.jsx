import { ArrowLeft, LogOut, Menu, ShieldCheck, UserCog } from 'lucide-react';

export default function TopBar({
  currentUser,
  onLogout,
  onAdmin,
  isPatientView,
  onBack,
  showSidebarToggle = false,
  onToggleSidebar,
}) {
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

