import { useState } from 'react';
import { Settings, Trash2 } from 'lucide-react';
import TopBar from '../components/layout/TopBar';
import { FormInput, FormSelect } from '../components/common/FormControls';

export default function AdminPanel({ users, setUsers, onClose, currentUser, onLogout }) {
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ username: '', password: '', role: 'user', nombre: '', puesto: '', numEmpleado: '', horario: '' });

  const handleSave = () => {
    if (editingId) {
      setUsers(users.map(u => u.id === editingId ? { ...formData, id: editingId } : u));
    } else {
      setUsers([...users, { ...formData, id: Date.now().toString() }]);
    }
    setFormData({ username: '', password: '', role: 'user', nombre: '', puesto: '', numEmpleado: '', horario: '' });
    setEditingId(null);
  };

  const handleEdit = (u) => { setFormData(u); setEditingId(u.id); };
  const handleDelete = (id) => { if (id !== currentUser.id) setUsers(users.filter(u => u.id !== id)); };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <TopBar currentUser={currentUser} onLogout={onLogout} isPatientView={true} onBack={onClose} />
      <div className="flex-1 p-4 sm:p-6 md:p-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-6">Administración de Usuarios</h1>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 lg:col-span-1">
              <h2 className="text-xl font-bold text-slate-800 mb-4">{editingId ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
              <div className="space-y-4">
                <FormInput label="Nombre Completo" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormInput label="Usuario (Login)" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
                  <FormInput label="Contraseña" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                </div>
                <FormSelect label="Rol de Sistema" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} options={['user', 'admin']} />
                <FormInput label="Puesto Clínico" value={formData.puesto} onChange={e => setFormData({...formData, puesto: e.target.value})} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormInput label="No. Empleado" value={formData.numEmpleado} onChange={e => setFormData({...formData, numEmpleado: e.target.value})} />
                  <FormSelect label="Horario" value={formData.horario} onChange={e => setFormData({...formData, horario: e.target.value})} options={['Matutino', 'Vespertino', 'Nocturno', 'Fin de Semana']} />
                </div>
                <button onClick={handleSave} className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                  {editingId ? 'Actualizar Usuario' : 'Crear Usuario'}
                </button>
                {editingId && <button onClick={() => {setEditingId(null); setFormData({ username: '', password: '', role: 'user', nombre: '', puesto: '', numEmpleado: '', horario: '' });}} className="w-full mt-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-lg transition-colors">Cancelar</button>}
              </div>
            </div>
            <div className="bg-white p-0 rounded-xl shadow-sm border border-slate-200 lg:col-span-2 overflow-hidden">
              <div className="overflow-x-auto print:overflow-visible">
                <table className="min-w-[720px] w-full text-sm border-collapse">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="p-4 text-left font-semibold">Nombre y Puesto</th>
                      <th className="p-4 text-left font-semibold">Usuario (Rol)</th>
                      <th className="p-4 text-left font-semibold">Horario</th>
                      <th className="p-4 text-center font-semibold">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} className="border-b hover:bg-slate-50">
                        <td className="p-4"><p className="font-bold text-slate-800">{u.nombre}</p><p className="text-xs text-slate-500">{u.puesto} | Emp: {u.numEmpleado}</p></td>
                        <td className="p-4"><p className="font-medium text-blue-600">{u.username}</p><span className={`text-xs px-2 py-0.5 rounded-full ${u.role==='admin'?'bg-purple-100 text-purple-800':'bg-slate-100 text-slate-600'}`}>{u.role}</span></td>
                        <td className="p-4 text-slate-600">{u.horario}</td>
                        <td className="p-4 flex justify-center space-x-2">
                          <button onClick={() => handleEdit(u)} className="text-blue-500 hover:bg-blue-50 p-2 rounded"><Settings className="w-4 h-4"/></button>
                          {u.id !== currentUser.id && <button onClick={() => handleDelete(u.id)} className="text-red-500 hover:bg-red-50 p-2 rounded"><Trash2 className="w-4 h-4"/></button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
