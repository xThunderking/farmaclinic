export default function AppFooter({ version }) {
  return (
    <footer className="shrink-0 border-t border-slate-200 bg-white/90 backdrop-blur px-4 sm:px-8 py-3 text-xs sm:text-sm text-slate-600 flex flex-col sm:flex-row items-center justify-between gap-1">
      <p className="font-semibold text-slate-700">Farmacia Clínica | Sistema de Gestión Farmacoterapéutica</p>
      <p className="font-bold text-blue-700">Versión {version}</p>
    </footer>
  );
}
