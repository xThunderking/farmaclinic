PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS usuarios (
  id TEXT PRIMARY KEY,
  usuario TEXT NOT NULL UNIQUE,
  contrasena TEXT NOT NULL,
  rol TEXT NOT NULL CHECK (rol IN ('admin', 'user')),
  nombre TEXT NOT NULL,
  puesto TEXT,
  numero_empleado TEXT,
  horario TEXT,
  creado_en TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado_en TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pacientes_base (
  id TEXT PRIMARY KEY,
  numero_paciente TEXT,
  nombre TEXT,
  fecha_nacimiento TEXT,
  genero TEXT,
  creado_en TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado_en TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS episodios (
  id TEXT PRIMARY KEY,
  paciente_base_id TEXT NOT NULL,
  eliminado INTEGER NOT NULL DEFAULT 0,
  identificador_interno TEXT,
  numero_paciente TEXT,
  numero_episodio TEXT,
  nombre TEXT,
  fecha_nacimiento TEXT,
  genero TEXT,
  peso REAL,
  altura REAL,
  ingreso TEXT,
  egreso TEXT,
  habitacion TEXT,
  medico TEXT,
  motivo_ingreso TEXT,
  diagnostico_principal TEXT,
  tipo_paciente TEXT,
  especialidad TEXT,
  alergias TEXT,
  intolerancias TEXT,
  antecedentes TEXT,
  comorbilidades TEXT,
  observaciones_generales TEXT,
  fuma TEXT,
  alcoholismo TEXT,
  toxicomania TEXT,
  detalles_adicciones TEXT,
  datos_json TEXT NOT NULL,
  creado_en TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado_en TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (paciente_base_id) REFERENCES pacientes_base(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS episodio_usuarios_activos (
  episodio_id TEXT NOT NULL,
  usuario_id TEXT NOT NULL,
  PRIMARY KEY (episodio_id, usuario_id),
  FOREIGN KEY (episodio_id) REFERENCES episodios(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS laboratorios (
  id TEXT PRIMARY KEY,
  episodio_id TEXT NOT NULL,
  grupo_laboratorio TEXT,
  parametro TEXT NOT NULL,
  fecha TEXT,
  valor TEXT,
  unidad TEXT,
  minimo_referencia REAL,
  maximo_referencia REAL,
  FOREIGN KEY (episodio_id) REFERENCES episodios(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS entrevista_respuestas (
  id TEXT PRIMARY KEY,
  episodio_id TEXT NOT NULL,
  pregunta_id TEXT NOT NULL,
  seccion TEXT,
  pregunta_texto TEXT,
  respuesta TEXT,
  FOREIGN KEY (episodio_id) REFERENCES episodios(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS conciliacion_items (
  id TEXT PRIMARY KEY,
  episodio_id TEXT NOT NULL,
  tipo_conciliacion TEXT NOT NULL CHECK (tipo_conciliacion IN ('ingreso', 'egreso')),
  principio TEXT,
  marca_comercial TEXT,
  dosis TEXT,
  via TEXT,
  desde_cuando TEXT,
  activo TEXT,
  dias_tratamiento TEXT,
  sabe_para_que TEXT,
  observacion TEXT,
  FOREIGN KEY (episodio_id) REFERENCES episodios(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS conciliacion_transiciones_area (
  id TEXT PRIMARY KEY,
  episodio_id TEXT NOT NULL,
  fecha TEXT,
  origen TEXT,
  destino TEXT,
  FOREIGN KEY (episodio_id) REFERENCES episodios(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS conciliacion_estado (
  episodio_id TEXT PRIMARY KEY,
  ingreso_no_aplica INTEGER NOT NULL DEFAULT 0,
  egreso_no_aplica INTEGER NOT NULL DEFAULT 0,
  transicion_area_no_aplica INTEGER NOT NULL DEFAULT 0,
  transicion_medico_realizada INTEGER NOT NULL DEFAULT 0,
  transicion_medico_no_aplica INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (episodio_id) REFERENCES episodios(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS perfil_farmacoterapeutico (
  id TEXT PRIMARY KEY,
  episodio_id TEXT NOT NULL,
  categoria TEXT,
  principio TEXT,
  marca_comercial TEXT,
  presentacion TEXT,
  dosis TEXT,
  via TEXT,
  frecuencia TEXT,
  fecha_inicio TEXT,
  estado TEXT,
  idoneidad TEXT,
  fecha_suspension TEXT,
  observaciones TEXT,
  FOREIGN KEY (episodio_id) REFERENCES episodios(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS perfil_farmacoterapeutico_meta (
  episodio_id TEXT PRIMARY KEY,
  evaluado_previo_primera_dosis INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (episodio_id) REFERENCES episodios(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS soluciones_intravenosas (
  id TEXT PRIMARY KEY,
  episodio_id TEXT NOT NULL,
  solucion TEXT,
  volumen TEXT,
  tiempo TEXT,
  velocidad TEXT,
  frecuencia TEXT,
  fecha_inicio TEXT,
  estado TEXT,
  fecha_suspension TEXT,
  FOREIGN KEY (episodio_id) REFERENCES episodios(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS prms (
  id TEXT PRIMARY KEY,
  episodio_id TEXT NOT NULL,
  fecha TEXT,
  area TEXT,
  medicamento TEXT,
  via TEXT,
  grupo TEXT,
  descripcion TEXT,
  categoria TEXT,
  analisis TEXT,
  causa_raiz TEXT,
  intervencion TEXT,
  descripcion_intervencion TEXT,
  aceptacion TEXT,
  resolucion TEXT,
  gravedad TEXT,
  reportado_calidad TEXT,
  FOREIGN KEY (episodio_id) REFERENCES episodios(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS interacciones_medicamentosas (
  id TEXT PRIMARY KEY,
  episodio_id TEXT NOT NULL,
  fecha TEXT,
  medicamentos TEXT,
  grado TEXT,
  consecuencia TEXT,
  FOREIGN KEY (episodio_id) REFERENCES episodios(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS microbiologia (
  id TEXT PRIMARY KEY,
  episodio_id TEXT NOT NULL,
  fecha_muestra TEXT,
  tipo_muestra TEXT,
  sitio_cultivo TEXT,
  microorganismo TEXT,
  sensibles TEXT,
  resistentes TEXT,
  observaciones TEXT,
  FOREIGN KEY (episodio_id) REFERENCES episodios(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reacciones_adversas (
  id TEXT PRIMARY KEY,
  episodio_id TEXT NOT NULL,
  medicamento TEXT,
  fecha TEXT,
  severidad TEXT,
  gravedad TEXT,
  que_paso TEXT,
  que_se_hizo TEXT,
  FOREIGN KEY (episodio_id) REFERENCES episodios(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_episodios_base ON episodios(paciente_base_id);
CREATE INDEX IF NOT EXISTS idx_episodios_ingreso ON episodios(ingreso);
CREATE INDEX IF NOT EXISTS idx_laboratorios_episodio ON laboratorios(episodio_id);
CREATE INDEX IF NOT EXISTS idx_prms_episodio ON prms(episodio_id);
CREATE INDEX IF NOT EXISTS idx_interacciones_episodio ON interacciones_medicamentosas(episodio_id);
CREATE INDEX IF NOT EXISTS idx_microbiologia_episodio ON microbiologia(episodio_id);
CREATE INDEX IF NOT EXISTS idx_ram_episodio ON reacciones_adversas(episodio_id);
