const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const SQL_PATH = path.join(__dirname, '..', '..', 'BD.mysql.sql');

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
};

const DB_NAME = process.env.DB_NAME || 'farmaclinic';

let pool;

async function initPool() {
  if (pool) return pool;

  const adminConn = await mysql.createConnection(DB_CONFIG);
  await adminConn.query(
    `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await adminConn.end();

  pool = mysql.createPool({
    ...DB_CONFIG,
    database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true,
  });

  return pool;
}

async function applySchema() {
  const db = await initPool();
  const schema = fs.readFileSync(SQL_PATH, 'utf8');
  await db.query(schema);
}

async function seedUsersIfEmpty() {
  const db = await initPool();
  const [rows] = await db.execute('SELECT COUNT(*) AS total FROM usuarios');
  const total = rows?.[0]?.total || 0;
  if (total > 0) return;

  const seedUsers = [
    {
      id: 'u1',
      usuario: 'CoordinadorFV',
      contrasena: 'FarmaFV',
      rol: 'admin',
      nombre: 'Admin FV',
      puesto: 'Coordinador',
      numero_empleado: '001',
      horario: 'Matutino',
    },
    {
      id: 'u2',
      usuario: 'Clinico1',
      contrasena: '123',
      rol: 'user',
      nombre: 'Farmaceutico Clinico',
      puesto: 'Especialista',
      numero_empleado: '002',
      horario: 'Vespertino',
    },
  ];

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    for (const u of seedUsers) {
      await conn.execute(
        `
        INSERT INTO usuarios (id, usuario, contrasena, rol, nombre, puesto, numero_empleado, horario)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [u.id, u.usuario, u.contrasena, u.rol, u.nombre, u.puesto, u.numero_empleado, u.horario]
      );
    }
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

function mapDbUserToAppUser(row) {
  return {
    id: row.id,
    username: row.usuario,
    password: row.contrasena,
    role: row.rol,
    nombre: row.nombre,
    puesto: row.puesto || '',
    numEmpleado: row.numero_empleado || '',
    horario: row.horario || '',
  };
}

function mapAppUserToDbUser(user) {
  return {
    id: user.id,
    usuario: user.username,
    contrasena: user.password,
    rol: user.role,
    nombre: user.nombre,
    puesto: user.puesto || '',
    numero_empleado: user.numEmpleado || '',
    horario: user.horario || '',
  };
}

async function listUsers() {
  const db = await initPool();
  const [rows] = await db.execute('SELECT * FROM usuarios ORDER BY creado_en ASC');
  return rows.map(mapDbUserToAppUser);
}

async function replaceUsers(users) {
  const db = await initPool();
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute('DELETE FROM usuarios');
    for (const user of users || []) {
      const dbUser = mapAppUserToDbUser(user);
      await conn.execute(
        `
        INSERT INTO usuarios (id, usuario, contrasena, rol, nombre, puesto, numero_empleado, horario)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          dbUser.id,
          dbUser.usuario,
          dbUser.contrasena,
          dbUser.rol,
          dbUser.nombre,
          dbUser.puesto,
          dbUser.numero_empleado,
          dbUser.horario,
        ]
      );
    }
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function upsertPatientBase(conn, patient) {
  const baseId = patient.pacienteBaseId || patient.id;
  const d = patient.demographics || {};

  await conn.execute(
    `
      INSERT INTO pacientes_base (id, numero_paciente, nombre, fecha_nacimiento, genero)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        numero_paciente = VALUES(numero_paciente),
        nombre = VALUES(nombre),
        fecha_nacimiento = VALUES(fecha_nacimiento),
        genero = VALUES(genero)
    `,
    [baseId, d.numeroPaciente || '', d.nombre || '', d.fechaNacimiento || '', d.genero || '']
  );

  return baseId;
}

async function replacePatients(patients) {
  const db = await initPool();
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute('DELETE FROM episodio_usuarios_activos');
    await conn.execute('DELETE FROM episodios');
    await conn.execute('DELETE FROM pacientes_base');

    for (const p of patients || []) {
      const d = p.demographics || {};
      const baseId = await upsertPatientBase(conn, p);

      await conn.execute(
        `
          INSERT INTO episodios (
            id, paciente_base_id, eliminado, identificador_interno, numero_paciente, numero_episodio,
            nombre, fecha_nacimiento, genero, peso, altura, ingreso, egreso, habitacion, medico,
            motivo_ingreso, diagnostico_principal, tipo_paciente, especialidad, alergias,
            intolerancias, antecedentes, comorbilidades, observaciones_generales, fuma,
            alcoholismo, toxicomania, detalles_adicciones, datos_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          p.id,
          baseId,
          p.deleted ? 1 : 0,
          d.identificadorInterno || '',
          d.numeroPaciente || '',
          d.numeroEpisodio || '',
          d.nombre || '',
          d.fechaNacimiento || '',
          d.genero || '',
          d.peso || null,
          d.altura || null,
          d.ingreso || '',
          d.egreso || '',
          d.habitacion || '',
          d.medico || '',
          d.motivoIngreso || '',
          d.diagnosticoPrincipal || '',
          d.tipoPaciente || '',
          d.especialidad || '',
          d.alergias || '',
          d.intolerancias || '',
          d.antecedentes || '',
          d.comorbilidades || '',
          d.observacionesGenerales || '',
          d.fuma || '',
          d.alcoholismo || '',
          d.toxicomania || '',
          d.detallesAdicciones || '',
          JSON.stringify(p),
        ]
      );

      for (const uid of p.activeUsers || []) {
        await conn.execute('INSERT INTO episodio_usuarios_activos (episodio_id, usuario_id) VALUES (?, ?)', [p.id, uid]);
      }
    }

    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function listPatients() {
  const db = await initPool();
  const [rows] = await db.execute('SELECT datos_json FROM episodios ORDER BY ingreso ASC, creado_en ASC');

  return rows
    .map((row) => {
      try {
        return JSON.parse(row.datos_json);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

async function bootstrap() {
  const [users, patients] = await Promise.all([listUsers(), listPatients()]);
  return {
    users,
    patients,
  };
}

module.exports = {
  initPool,
  applySchema,
  seedUsersIfEmpty,
  listUsers,
  replaceUsers,
  listPatients,
  replacePatients,
  bootstrap,
};
