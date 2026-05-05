const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const {
  applySchema,
  seedUsersIfEmpty,
  bootstrap,
  replaceUsers,
  replacePatients,
  listUsers,
} = require('./db');

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 4000);
const HOST = process.env.BIND_HOST || '127.0.0.1';

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, servicio: 'farmaclinic-api' });
});

app.get('/api/bootstrap', async (_req, res) => {
  try {
    const data = await bootstrap();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'No se pudo cargar bootstrap.' });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contrasena son obligatorios.' });
  }

  try {
    const users = await listUsers();
    const user = users.find((u) => u.username === username && u.password === password);
    if (!user) {
      return res.status(401).json({ error: 'Credenciales incorrectas o usuario no existe.' });
    }

    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'No se pudo validar credenciales.' });
  }
});

app.put('/api/sync/users', async (req, res) => {
  const { users } = req.body || {};
  if (!Array.isArray(users)) {
    return res.status(400).json({ error: 'users debe ser un arreglo.' });
  }

  try {
    await replaceUsers(users);
    res.json({ ok: true, total: users.length });
  } catch (error) {
    res.status(500).json({ error: 'No se pudo sincronizar usuarios.' });
  }
});

app.put('/api/sync/patients', async (req, res) => {
  const { patients } = req.body || {};
  if (!Array.isArray(patients)) {
    return res.status(400).json({ error: 'patients debe ser un arreglo.' });
  }

  try {
    await replacePatients(patients);
    res.json({ ok: true, total: patients.length });
  } catch (error) {
    res.status(500).json({ error: 'No se pudo sincronizar pacientes.' });
  }
});

async function startServer() {
  try {
    await applySchema();
    await seedUsersIfEmpty();

    app.listen(PORT, HOST, () => {
      console.log(`API FarmaClinic corriendo en http://${HOST}:${PORT}`);
    });
  } catch (error) {
    console.error('Error iniciando API MySQL:', error.message);
    process.exit(1);
  }
}

startServer();
