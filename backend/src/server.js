const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const {
  applySchema,
  seedUsersIfEmpty,
  bootstrap,
  replaceUsers,
  replacePatients,
  upsertPatient,
  listUsers,
} = require('./db');

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 4000);
const HOST = process.env.BIND_HOST || '0.0.0.0';
const sseClients = new Map();

function sendSseEvent(res, event, payload) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function broadcastSseEvent(event, payload, options = {}) {
  const excludeClientId = options.excludeClientId || '';

  for (const [connectionId, client] of sseClients.entries()) {
    if (excludeClientId && client.clientId === excludeClientId) continue;
    try {
      sendSseEvent(client.res, event, payload);
    } catch (_err) {
      sseClients.delete(connectionId);
    }
  }
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/api/events', (req, res) => {
  const clientId = String(req.query.clientId || '');
  const connectionId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  sseClients.set(connectionId, { res, clientId });
  sendSseEvent(res, 'connected', { ok: true, connectionId, ts: Date.now() });

  const heartbeat = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch (_err) {
      // client closed
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(connectionId);
  });
});

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
  const sourceClientId = String(req.header('x-client-id') || '');
  if (!Array.isArray(users)) {
    return res.status(400).json({ error: 'users debe ser un arreglo.' });
  }

  try {
    await replaceUsers(users);
    broadcastSseEvent('users-updated', { ts: Date.now(), total: users.length }, { excludeClientId: sourceClientId });
    res.json({ ok: true, total: users.length });
  } catch (error) {
    res.status(500).json({ error: 'No se pudo sincronizar usuarios.' });
  }
});

app.put('/api/sync/patients', async (req, res) => {
  const { patients } = req.body || {};
  const sourceClientId = String(req.header('x-client-id') || '');
  if (!Array.isArray(patients)) {
    return res.status(400).json({ error: 'patients debe ser un arreglo.' });
  }

  try {
    await replacePatients(patients);
    broadcastSseEvent('patients-updated', { ts: Date.now(), total: patients.length }, { excludeClientId: sourceClientId });
    res.json({ ok: true, total: patients.length });
  } catch (error) {
    res.status(500).json({ error: 'No se pudo sincronizar pacientes.' });
  }
});

app.put('/api/sync/patient', async (req, res) => {
  const { patient } = req.body || {};
  const sourceClientId = String(req.header('x-client-id') || '');

  if (!patient || typeof patient !== 'object' || !patient.id) {
    return res.status(400).json({ error: 'patient valido es obligatorio.' });
  }

  try {
    await upsertPatient(patient);
    broadcastSseEvent(
      'patients-updated',
      { ts: Date.now(), total: 1, mode: 'single', patientId: patient.id },
      { excludeClientId: sourceClientId }
    );
    res.json({ ok: true, id: patient.id });
  } catch (error) {
    res.status(500).json({ error: 'No se pudo sincronizar el paciente.' });
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
