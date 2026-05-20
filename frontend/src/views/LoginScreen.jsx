import { useState } from 'react';
import { Lock, ShieldCheck } from 'lucide-react';

export default function LoginScreen({ onLogin, onLoginAttempt, appVersion }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = await onLoginAttempt({ username, password });
      onLogin(payload.user);
      return;
    } catch (err) {
      setError(err?.message || 'Credenciales incorrectas o usuario no existe.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md rounded-2xl border border-white/15 bg-white/95 shadow-2xl p-5 sm:p-8">
        <div className="flex justify-center mb-5">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-blue-700 text-sm font-semibold">
            <ShieldCheck className="w-4 h-4" /> Versión {appVersion}
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-slate-800 text-center">HIS Farmacia Clínica</h1>
        <p className="text-center text-slate-500 mt-2 mb-6 text-sm">Accede para continuar al sistema</p>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-200">{error}</div>}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Usuario</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 px-4 py-2.5"
              placeholder="Ingresa tu usuario"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 px-4 py-2.5"
              placeholder="Ingresa tu contraseña"
              required
            />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-colors disabled:opacity-70 shadow-sm">
            <Lock className="w-5 h-5 mr-2" /> {loading ? 'Validando...' : 'Iniciar Sesión'}
          </button>
        </form>

        <p className="text-center mt-5 text-xs text-slate-500">Sistema de gestión farmacoterapéutica | {appVersion}</p>
      </div>
    </div>
  );
}
