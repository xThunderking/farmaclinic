CREATE TABLE IF NOT EXISTS usuarios (
  id VARCHAR(64) PRIMARY KEY,
  usuario VARCHAR(120) NOT NULL UNIQUE,
  contrasena VARCHAR(255) NOT NULL,
  rol ENUM('admin', 'user') NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  puesto VARCHAR(255) NULL,
  numero_empleado VARCHAR(120) NULL,
  horario VARCHAR(120) NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pacientes_base (
  id VARCHAR(64) PRIMARY KEY,
  numero_paciente VARCHAR(120) NULL,
  nombre VARCHAR(255) NULL,
  fecha_nacimiento VARCHAR(32) NULL,
  genero VARCHAR(64) NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS episodios (
  id VARCHAR(64) PRIMARY KEY,
  paciente_base_id VARCHAR(64) NOT NULL,
  eliminado TINYINT(1) NOT NULL DEFAULT 0,
  identificador_interno VARCHAR(120) NULL,
  numero_paciente VARCHAR(120) NULL,
  numero_episodio VARCHAR(120) NULL,
  nombre VARCHAR(255) NULL,
  fecha_nacimiento VARCHAR(32) NULL,
  genero VARCHAR(64) NULL,
  peso DECIMAL(10,2) NULL,
  altura DECIMAL(10,2) NULL,
  ingreso VARCHAR(32) NULL,
  egreso VARCHAR(32) NULL,
  habitacion VARCHAR(120) NULL,
  medico VARCHAR(255) NULL,
  motivo_ingreso TEXT NULL,
  diagnostico_principal TEXT NULL,
  tipo_paciente VARCHAR(120) NULL,
  especialidad VARCHAR(255) NULL,
  alergias TEXT NULL,
  intolerancias TEXT NULL,
  antecedentes TEXT NULL,
  comorbilidades TEXT NULL,
  observaciones_generales TEXT NULL,
  fuma VARCHAR(64) NULL,
  alcoholismo VARCHAR(64) NULL,
  toxicomania VARCHAR(64) NULL,
  detalles_adicciones TEXT NULL,
  datos_json LONGTEXT NOT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_episodios_base (paciente_base_id),
  KEY idx_episodios_ingreso (ingreso),
  CONSTRAINT fk_episodios_paciente_base FOREIGN KEY (paciente_base_id) REFERENCES pacientes_base(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS episodio_usuarios_activos (
  episodio_id VARCHAR(64) NOT NULL,
  usuario_id VARCHAR(64) NOT NULL,
  PRIMARY KEY (episodio_id, usuario_id),
  CONSTRAINT fk_ep_ua_episodio FOREIGN KEY (episodio_id) REFERENCES episodios(id) ON DELETE CASCADE,
  CONSTRAINT fk_ep_ua_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS laboratorios (
  id VARCHAR(64) PRIMARY KEY,
  episodio_id VARCHAR(64) NOT NULL,
  grupo_laboratorio VARCHAR(255) NULL,
  parametro VARCHAR(255) NOT NULL,
  fecha VARCHAR(32) NULL,
  valor VARCHAR(255) NULL,
  unidad VARCHAR(64) NULL,
  minimo_referencia DECIMAL(12,4) NULL,
  maximo_referencia DECIMAL(12,4) NULL,
  KEY idx_laboratorios_episodio (episodio_id),
  CONSTRAINT fk_labs_episodio FOREIGN KEY (episodio_id) REFERENCES episodios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS entrevista_respuestas (
  id VARCHAR(64) PRIMARY KEY,
  episodio_id VARCHAR(64) NOT NULL,
  pregunta_id VARCHAR(120) NOT NULL,
  seccion VARCHAR(255) NULL,
  pregunta_texto TEXT NULL,
  respuesta TEXT NULL,
  CONSTRAINT fk_entrevista_episodio FOREIGN KEY (episodio_id) REFERENCES episodios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS conciliacion_items (
  id VARCHAR(64) PRIMARY KEY,
  episodio_id VARCHAR(64) NOT NULL,
  tipo_conciliacion ENUM('ingreso', 'egreso') NOT NULL,
  principio VARCHAR(255) NULL,
  marca_comercial VARCHAR(255) NULL,
  dosis VARCHAR(255) NULL,
  via VARCHAR(120) NULL,
  desde_cuando VARCHAR(120) NULL,
  activo VARCHAR(120) NULL,
  dias_tratamiento VARCHAR(120) NULL,
  sabe_para_que VARCHAR(120) NULL,
  observacion TEXT NULL,
  CONSTRAINT fk_conc_item_episodio FOREIGN KEY (episodio_id) REFERENCES episodios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS conciliacion_transiciones_area (
  id VARCHAR(64) PRIMARY KEY,
  episodio_id VARCHAR(64) NOT NULL,
  fecha VARCHAR(32) NULL,
  origen VARCHAR(255) NULL,
  destino VARCHAR(255) NULL,
  CONSTRAINT fk_conc_trans_area_episodio FOREIGN KEY (episodio_id) REFERENCES episodios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS conciliacion_estado (
  episodio_id VARCHAR(64) PRIMARY KEY,
  ingreso_no_aplica TINYINT(1) NOT NULL DEFAULT 0,
  egreso_no_aplica TINYINT(1) NOT NULL DEFAULT 0,
  transicion_area_no_aplica TINYINT(1) NOT NULL DEFAULT 0,
  transicion_medico_realizada TINYINT(1) NOT NULL DEFAULT 0,
  transicion_medico_no_aplica TINYINT(1) NOT NULL DEFAULT 0,
  CONSTRAINT fk_conc_estado_episodio FOREIGN KEY (episodio_id) REFERENCES episodios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS perfil_farmacoterapeutico (
  id VARCHAR(64) PRIMARY KEY,
  episodio_id VARCHAR(64) NOT NULL,
  categoria VARCHAR(120) NULL,
  principio VARCHAR(255) NULL,
  marca_comercial VARCHAR(255) NULL,
  presentacion VARCHAR(120) NULL,
  dosis VARCHAR(255) NULL,
  via VARCHAR(120) NULL,
  frecuencia VARCHAR(120) NULL,
  fecha_inicio VARCHAR(32) NULL,
  estado VARCHAR(120) NULL,
  idoneidad VARCHAR(120) NULL,
  fecha_suspension VARCHAR(32) NULL,
  observaciones TEXT NULL,
  CONSTRAINT fk_perfil_farmaco_episodio FOREIGN KEY (episodio_id) REFERENCES episodios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS perfil_farmacoterapeutico_meta (
  episodio_id VARCHAR(64) PRIMARY KEY,
  evaluado_previo_primera_dosis TINYINT(1) NOT NULL DEFAULT 0,
  CONSTRAINT fk_perfil_farmaco_meta_episodio FOREIGN KEY (episodio_id) REFERENCES episodios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS soluciones_intravenosas (
  id VARCHAR(64) PRIMARY KEY,
  episodio_id VARCHAR(64) NOT NULL,
  solucion VARCHAR(255) NULL,
  volumen VARCHAR(64) NULL,
  tiempo VARCHAR(64) NULL,
  velocidad VARCHAR(64) NULL,
  frecuencia VARCHAR(120) NULL,
  fecha_inicio VARCHAR(32) NULL,
  estado VARCHAR(120) NULL,
  fecha_suspension VARCHAR(32) NULL,
  CONSTRAINT fk_soluciones_iv_episodio FOREIGN KEY (episodio_id) REFERENCES episodios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS prms (
  id VARCHAR(64) PRIMARY KEY,
  episodio_id VARCHAR(64) NOT NULL,
  fecha VARCHAR(32) NULL,
  area VARCHAR(255) NULL,
  medicamento VARCHAR(255) NULL,
  via VARCHAR(120) NULL,
  grupo VARCHAR(120) NULL,
  descripcion TEXT NULL,
  categoria VARCHAR(120) NULL,
  analisis TEXT NULL,
  causa_raiz TEXT NULL,
  intervencion VARCHAR(255) NULL,
  descripcion_intervencion TEXT NULL,
  aceptacion VARCHAR(120) NULL,
  resolucion VARCHAR(120) NULL,
  gravedad VARCHAR(120) NULL,
  reportado_calidad VARCHAR(120) NULL,
  KEY idx_prms_episodio (episodio_id),
  CONSTRAINT fk_prms_episodio FOREIGN KEY (episodio_id) REFERENCES episodios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS interacciones_medicamentosas (
  id VARCHAR(64) PRIMARY KEY,
  episodio_id VARCHAR(64) NOT NULL,
  fecha VARCHAR(32) NULL,
  medicamentos TEXT NULL,
  grado VARCHAR(120) NULL,
  consecuencia TEXT NULL,
  KEY idx_interacciones_episodio (episodio_id),
  CONSTRAINT fk_interacciones_episodio FOREIGN KEY (episodio_id) REFERENCES episodios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS microbiologia (
  id VARCHAR(64) PRIMARY KEY,
  episodio_id VARCHAR(64) NOT NULL,
  fecha_muestra VARCHAR(32) NULL,
  tipo_muestra VARCHAR(255) NULL,
  sitio_cultivo VARCHAR(255) NULL,
  microorganismo VARCHAR(255) NULL,
  sensibles TEXT NULL,
  resistentes TEXT NULL,
  observaciones TEXT NULL,
  KEY idx_microbiologia_episodio (episodio_id),
  CONSTRAINT fk_microbiologia_episodio FOREIGN KEY (episodio_id) REFERENCES episodios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS reacciones_adversas (
  id VARCHAR(64) PRIMARY KEY,
  episodio_id VARCHAR(64) NOT NULL,
  medicamento VARCHAR(255) NULL,
  fecha VARCHAR(32) NULL,
  severidad VARCHAR(120) NULL,
  gravedad VARCHAR(120) NULL,
  que_paso TEXT NULL,
  que_se_hizo TEXT NULL,
  KEY idx_ram_episodio (episodio_id),
  CONSTRAINT fk_ram_episodio FOREIGN KEY (episodio_id) REFERENCES episodios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
