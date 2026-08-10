import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { 
  Users, UserPlus, Activity, ClipboardList, 
  Plus, Trash2, AlertTriangle, ShieldAlert, 
  CheckCircle, FileSpreadsheet, Search, Filter,
  Microscope, Lock, Settings, ShieldCheck, Bug, FileWarning, FileText, RefreshCcw, Layers, X, PieChart, ListChecks, TestTube, History, CheckSquare, XCircle, Unlock, CircleHelp, Eye
} from 'lucide-react';
import AppFooter from './components/layout/AppFooter';
import TopBar from './components/layout/TopBar';
import PatientSidebar from './components/patient/PatientSidebar';
import PrintPatientReport from './components/print/PrintPatientReport';
import { ConfirmWarningModal, LockWarningModal } from './components/modals/WarningModals';
import NewPatientModal from './components/modals/NewPatientModal';
import AdminPanel from './views/AdminPanel';
import Dashboard from './views/Dashboard';
import LoginScreen from './views/LoginScreen';
import { createPatientTabComponents } from './views/patient/PatientTabs';

// --- Constantes y Listas ---
const PRESENTACIONES = ["Amp", "Fam", "Fco", "Cap", "Tab", "Sup", "Susp", "SL", "Jer Prell", "Pch", "Ovu", "Sob", "Bolsa"];
const VIAS = ["IV", "IM", "VO", "SC", "Rectal", "Inh", "Tópica", "Transdermico", "Oftálmica", "Ótica", "Vaginal", "SNG", "Nasal", "SL", "Intratecal"];
const CATEGORIAS_FARMACO = ["General", "Antibiótico", "Alto Riesgo"];
const IDONEIDAD_OPCIONES = ["Pendiente", "Idóneo", "No Idóneo"];
const CATEGORIAS_PRM = ["Dispensación", "Prescripción", "Transcripción", "Preparación", "Administración"];
const MAR_RECOMENDACIONES = [
  'Insulinas',
  'Anticoagulantes',
  'Electrolitos concentrados',
  'Citotóxicos',
  'Sedantes y narcóticos',
  'Neurobloqueadores',
  'Inotrópicos y aminas',
];

const TIPOS_PACIENTE = ["Quirúrgico", "No quirúrgico"];
const ESPECIALIDADES = [
  "Algología", "Angiología", "Cardiología", "Cirugía general", "Gastroenterología", 
  "Geriatría", "Ginecología y obstetricia", "Hematología", "Hemodiálisis", "Infectología", 
  "Medicina interna", "Nefrología", "Neonatología", "Neumología", "Neurología", 
  "Oftalmología", "Oncología", "Traumatología y ortopedia", "Otorrinolaringología", "Pediatría", 
  "Plástica", "Psiquiatría", "Urología"
];
const COMORBILIDADES_PREDEFINIDAS = [
  "Sin comorbilidades",
  "Diabetes mellitus tipo 2",
  "Hipertensión arterial sistémica",
  "Dislipidemia",
  "Obesidad",
  "Insuficiencia renal crónica",
  "Enfermedad renal crónica en hemodiálisis",
  "Insuficiencia cardiaca",
  "Cardiopatía isquémica",
  "Fibrilación auricular",
  "EPOC",
  "Asma",
  "Hipotiroidismo",
  "Hipertiroidismo",
  "Cirrosis hepática",
  "Hepatopatía crónica",
  "Enfermedad cerebrovascular previa",
  "Demencia",
  "Depresión",
  "Cáncer activo",
  "VIH"
];

const MESES = [
  { val: '01', label: 'Enero' }, { val: '02', label: 'Febrero' }, { val: '03', label: 'Marzo' },
  { val: '04', label: 'Abril' }, { val: '05', label: 'Mayo' }, { val: '06', label: 'Junio' },
  { val: '07', label: 'Julio' }, { val: '08', label: 'Agosto' }, { val: '09', label: 'Septiembre' },
  { val: '10', label: 'Octubre' }, { val: '11', label: 'Noviembre' }, { val: '12', label: 'Diciembre' }
];

const ANIOS = Array.from({length: 10}, (_, i) => (new Date().getFullYear() - 5 + i).toString());

const LAB_TEMPLATES = {
  "Función Renal": [
    { name: "Creatinina Sérica", min: 0.7, max: 1.2, unit: "mg/dL" },
    { name: "Nitrógeno Ureico (BUN)", min: 7, max: 20, unit: "mg/dL" }
  ],
  "Función Hepática": [
    { name: "AST (TGO)", min: 8, max: 33, unit: "U/L" },
    { name: "ALT (TGP)", min: 7, max: 55, unit: "U/L" },
    { name: "Bilirrubina Total", min: 0.1, max: 1.2, unit: "mg/dL" }
  ],
  "Electrolitos": [
    { name: "Potasio (K)", min: 3.5, max: 5, unit: "mEq/L" },
    { name: "Sodio (Na)", min: 135, max: 145, unit: "mEq/L" },
    { name: "Magnesio (Mg)", min: 1.7, max: 2.2, unit: "mg/dL" },
    { name: "Calcio (Ca)", min: 8.5, max: 10.5, unit: "mg/dL" },
    { name: "Cloro (Cl)", min: 96, max: 106, unit: "mEq/L" },
    { name: "Fósforo (P)", min: 2.5, max: 4.5, unit: "mg/dL" }
  ],
  "Biometría / Coagulación": [
    { name: "Leucocitos (WBC)", min: 4.5, max: 11, unit: "x10^3/µL" },
    { name: "Plaquetas", min: 150, max: 450, unit: "x10^3/µL" },
    { name: "INR (No anticoagulado)", min: 0.8, max: 1.1, unit: "-" }
  ],
  "Marcadores de Infección / Inflamación": [
    { name: "PCR (Proteína C Reactiva)", min: 0, max: 5, unit: "mg/L" },
    { name: "Procalcitonina", min: 0, max: 0.05, unit: "ng/mL" }
  ]
};

const PREGUNTAS_ENTREVISTA = [
  { id: 'q1', section: 'Bajo prescripción', text: '¿Toma medicamentos por indicación médica?' },
  { id: 'q2', section: 'Bajo prescripción', text: '¿Hay algún medicamento que haya suspendido/cambiado en el último mes? ¿Motivo?' },
  { id: 'q3', section: 'Bajo prescripción', text: '¿Ha tomado antibióticos, antivirales o antimicóticos en los últimos 3 meses?' },
  { id: 'q4', section: 'Sin prescripción', text: '¿Toma algún medicamento que no haya sido recetado?' },
  { id: 'q5', section: 'Sin prescripción', text: '¿Toma alguna vitamina, suplemento o producto natural?' },
  { id: 'q6', section: 'Descarte', text: '¿Usted toma Aspirina o anticoagulante?' },
  { id: 'q7', section: 'Descarte', text: '¿Usted toma Analgésicos?' },
  { id: 'q8', section: 'Descarte', text: '¿Usted usa Ayuda para la digestión?' },
  { id: 'q9', section: 'Descarte', text: '¿Usted usa Inhaladores/aerosoles?' }
];

const normalizeApiBase = (base = '') => String(base || '').trim().replace(/\/+$/, '');

const getApiBaseCandidates = () => {
  const envBase = normalizeApiBase(import.meta.env.VITE_API_URL || '');

  if (typeof window === 'undefined') {
    return [envBase || 'http://localhost:4000'];
  }

  const host = window.location.hostname;
  const origin = normalizeApiBase(window.location.origin);
  const hostPort4000 = host ? `${window.location.protocol}//${host}:4000` : 'http://localhost:4000';

  const candidates = [envBase, hostPort4000, origin, 'http://127.0.0.1:4000', 'http://localhost:4000']
    .map(normalizeApiBase)
    .filter(Boolean);

  return Array.from(new Set(candidates));
};

let resolvedApiBase = '';
let resolvingApiBasePromise = null;

const probeApiBase = async (base) => {
  try {
    const res = await fetch(`${base}/api/health`, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
};

const resolveApiBase = async () => {
  if (resolvedApiBase) return resolvedApiBase;
  if (resolvingApiBasePromise) return resolvingApiBasePromise;

  resolvingApiBasePromise = (async () => {
    const candidates = getApiBaseCandidates();

    for (const candidate of candidates) {
      const ok = await probeApiBase(candidate);
      if (ok) {
        resolvedApiBase = candidate;
        return candidate;
      }
    }

    resolvedApiBase = candidates[0] || 'http://localhost:4000';
    return resolvedApiBase;
  })();

  try {
    return await resolvingApiBasePromise;
  } finally {
    resolvingApiBasePromise = null;
  }
};
const SESSION_USER_KEY = 'farmaclinic_current_user';
const CLIENT_ID_KEY = 'farmaclinic_client_id';
const SYNC_PENDING_PATIENTS_KEY = 'farmaclinic_pending_patient_sync';
const DILUTIONS_STORAGE_KEY = 'farmaclinic_dilutions_table';
const DEFAULT_DILUTIONS_COLUMNS = [
  'MEDICAMENTO',
  'MARCA COMERCIAL',
  'PRESENTACION',
  'RECONSTITUCION',
  'INTRAMUSCULAR',
  'ADMINISTRACION',
  'SOLUCIONES COMPATIBLES',
  'TIEMPO DE INFUSION',
  'SEGURIDAD',
  'TIEMPO DE ESTABILIDAD',
];
const UNSAVED_CHANGES_BEFOREUNLOAD_MSG = 'Hay cambios pendientes. Si recargas la pagina, se perderan los datos no guardados.';
const SYNC_RETRY_MS = 3000;
const APP_VERSION = 'FARMA 2.1';
const ADULTO_MAYOR_EDAD = 65;
const NOTIF_SIN_CAMBIOS_HORAS = 4;
const NOTIF_ANTIBIOTICO_DIAS = 5;
const NOTIF_REFRESH_MS = 60000;
const PRESENCE_HEARTBEAT_MS = 45000;
const PRESENCE_TTL_MS = 180000;

const safeStorageGet = (key) => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeStorageSet = (key, value) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore storage write errors
  }
};

const safeStorageRemove = (key) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore storage remove errors
  }
};

const normalizeDilutionsTable = (table = {}) => {
  const incomingColumns = Array.isArray(table?.columns) ? table.columns : [];
  const columns = DEFAULT_DILUTIONS_COLUMNS;
  const hasLegacySchemaWithoutAdministracion = incomingColumns.length === DEFAULT_DILUTIONS_COLUMNS.length - 1;
  const rows = Array.isArray(table?.rows) ? table.rows : [];

  const normalizedRows = rows.map((row, index) => {
    const normalizedRow = {
      id: row?.id || `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
    };

    columns.forEach((column, colIndex) => {
      const isAdministracionColumn = column === 'ADMINISTRACION';
      const legacyIndex = hasLegacySchemaWithoutAdministracion && colIndex > 5 ? colIndex - 1 : colIndex;
      const legacyColumn = String(incomingColumns[legacyIndex] || '').trim();
      const directValue = row?.[column];
      const legacyValue = isAdministracionColumn && hasLegacySchemaWithoutAdministracion
        ? ''
        : (legacyColumn ? row?.[legacyColumn] : undefined);
      normalizedRow[column] = directValue ?? legacyValue ?? '';
    });

    return normalizedRow;
  });

  return {
    columns,
    rows: normalizedRows,
    sheetName: String(table?.sheetName || ''),
    updatedAt: Number(table?.updatedAt || 0),
  };
};

const getStoredDilutionsTable = () => {
  const raw = safeStorageGet(DILUTIONS_STORAGE_KEY);
  if (!raw) return normalizeDilutionsTable();

  try {
    const parsed = JSON.parse(raw);
    return normalizeDilutionsTable(parsed);
  } catch {
    return normalizeDilutionsTable();
  }
};

const setStoredDilutionsTable = (table = {}) => {
  const normalized = normalizeDilutionsTable(table);
  if (!normalized.columns.length && !normalized.rows.length) {
    safeStorageRemove(DILUTIONS_STORAGE_KEY);
    return;
  }
  safeStorageSet(DILUTIONS_STORAGE_KEY, JSON.stringify(normalized));
};

const getStoredPendingPatientSync = () => {
  const raw = safeStorageGet(SYNC_PENDING_PATIENTS_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed;
  } catch {
    return {};
  }
};

const setStoredPendingPatientSync = (pendingById = {}) => {
  const keys = Object.keys(pendingById || {});
  if (keys.length === 0) {
    safeStorageRemove(SYNC_PENDING_PATIENTS_KEY);
    return;
  }
  safeStorageSet(SYNC_PENDING_PATIENTS_KEY, JSON.stringify(pendingById));
};

const getStoredSessionUser = () => {
  const raw = safeStorageGet(SESSION_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const getOrCreateClientId = () => {
  const existing = safeStorageGet(CLIENT_ID_KEY);
  if (existing) return existing;
  const newId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  safeStorageSet(CLIENT_ID_KEY, newId);
  return newId;
};

const normalizePresenceIds = (ids = []) => Array.from(new Set((ids || []).filter(Boolean)));

const arePresenceMapsEqual = (a = {}, b = {}) => {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => a[key] === b[key]);
};

const touchPresenceInPatient = (patient, userId, timestamp = Date.now()) => {
  const activeUsers = normalizePresenceIds([...(patient.activeUsers || []), userId]);
  const activeUsersLastSeen = { ...(patient.activeUsersLastSeen || {}), [userId]: timestamp };
  return { ...patient, activeUsers, activeUsersLastSeen };
};

const removePresenceFromPatient = (patient, userId) => {
  const activeUsers = (patient.activeUsers || []).filter((uid) => uid && uid !== userId);
  const activeUsersLastSeen = { ...(patient.activeUsersLastSeen || {}) };
  delete activeUsersLastSeen[userId];

  const sameUsers = (patient.activeUsers || []).length === activeUsers.length
    && (patient.activeUsers || []).every((uid, idx) => uid === activeUsers[idx]);

  if (sameUsers && arePresenceMapsEqual(patient.activeUsersLastSeen || {}, activeUsersLastSeen)) {
    return patient;
  }

  return { ...patient, activeUsers, activeUsersLastSeen };
};

const sanitizePatientPresence = (patient, validUserIds = new Set(), options = {}) => {
  const now = options.now || Date.now();
  const dropStale = options.dropStale !== false;
  const keepMissingTimestamps = options.keepMissingTimestamps !== false;

  const inputIds = normalizePresenceIds(patient.activeUsers || []);
  const rawSeen = patient.activeUsersLastSeen || {};

  const activeUsers = [];
  const activeUsersLastSeen = {};

  inputIds.forEach((uid) => {
    if (validUserIds.size > 0 && !validUserIds.has(uid)) return;

    const rawTs = Number(rawSeen[uid]);
    const hasValidTimestamp = Number.isFinite(rawTs) && rawTs > 0;
    const ts = hasValidTimestamp ? rawTs : (keepMissingTimestamps ? now : 0);
    if (!ts) return;

    if (dropStale && now - ts > PRESENCE_TTL_MS) return;

    activeUsers.push(uid);
    activeUsersLastSeen[uid] = ts;
  });

  const sameUsers = inputIds.length === activeUsers.length
    && inputIds.every((uid, idx) => uid === activeUsers[idx]);
  const sameMap = arePresenceMapsEqual(rawSeen, activeUsersLastSeen);

  if (sameUsers && sameMap) return patient;
  return { ...patient, activeUsers, activeUsersLastSeen };
};

const listOtherActiveUsers = (patient, currentUserId) => {
  const now = Date.now();
  const ids = normalizePresenceIds(patient?.activeUsers || []);
  const lastSeen = patient?.activeUsersLastSeen || {};

  return ids.filter((uid) => {
    if (!uid || uid === currentUserId) return false;

    const ts = Number(lastSeen[uid]);
    if (!Number.isFinite(ts) || ts <= 0) return true;
    return now - ts <= PRESENCE_TTL_MS;
  });
};

const apiFetch = async (path, options = {}) => {
  const clientId = getOrCreateClientId();
  const apiBase = await resolveApiBase();
  const res = await fetch(`${apiBase}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      'x-client-id': clientId,
      ...(options.headers || {}),
    },
    ...options,
  });

  const isJson = (res.headers.get('content-type') || '').includes('application/json');
  const payload = isJson ? await res.json() : null;
  if (!res.ok) {
    throw new Error(payload?.error || `Error HTTP ${res.status}`);
  }
  return payload;
};

// --- Funciones de Cálculo Clínico Automáticas ---
const calculateAge = (dob) => {
  if (!dob) return { years: '', group: '' };
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  if (isNaN(age)) return { years: '', group: '' };
  let group = 'Adulto';
  if (age === 0) group = 'Neonato/Lactante';
  else if (age >= 1 && age <= 12) group = 'Pediátrico';
  else if (age > 12 && age < 18) group = 'Adolescente';
  else if (age >= 65) group = 'Adulto Mayor';
  return { years: age, group };
};

const calculateIMC = (peso, altura) => {
  if (!peso || !altura) return '';
  const m = altura / 100;
  return (peso / (m * m)).toFixed(2);
};

const calculateSC = (peso, altura) => {
  if (!peso || !altura) return '';
  return Math.sqrt((peso * altura) / 3600).toFixed(2);
};

const calculateIdealWeight = (altura, genero) => {
  if (!altura || !genero || (genero !== 'Masculino' && genero !== 'Femenino')) return '';
  const inches = altura / 2.54;
  const base = genero === 'Masculino' ? 50 : 45.5;
  const ideal = base + 2.3 * (inches - 60);
  if (!Number.isFinite(ideal) || ideal <= 0) return '';
  return ideal.toFixed(1);
};

const calculateAdjustedWeight = (peso, pesoIdeal) => {
  if (!peso || !pesoIdeal) return '';
  return (Number(pesoIdeal) + 0.4 * (Number(peso) - Number(pesoIdeal))).toFixed(1);
};

const calculateCrCl = (age, weight, gender, creat) => {
  if (!age || !weight || !creat || creat <= 0 || !gender) return '';
  let crcl = ((140 - age) * weight) / (72 * creat);
  if (gender === 'Femenino') crcl *= 0.85;
  return crcl.toFixed(1);
};

const getTfgColorClass = (val) => {
  if (!val) return 'text-blue-700 bg-blue-50 border-blue-200';
  const num = Number(val);
  if (num >= 90) return 'text-green-800 bg-green-50 border-green-200'; 
  if (num >= 60) return 'text-yellow-800 bg-yellow-50 border-yellow-300'; 
  return 'text-red-800 bg-red-50 border-red-300'; 
};

const calculateDaysOfUse = (startDate, endDateStr) => {
  if (!startDate) return 0;
  const start = new Date(startDate);
  const end = endDateStr ? new Date(endDateStr) : new Date(); 
  const diffTime = end - start;
  const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return days >= 0 ? days : 0;
};

const parseMedicationFrequency = (rawValue = '') => {
  const raw = String(rawValue || '').trim();
  const numeric = Number(String(raw).replace(/[^\d]/g, ''));
  if (!Number.isFinite(numeric) || numeric <= 0) return { value: 0, unit: 'hrs' };

  const lower = raw.toLowerCase();
  return {
    value: numeric,
    unit: lower.includes('min') ? 'min' : 'hrs',
  };
};

const getMedicationLastDoseTimestamp = (medication = {}) => {
  const useManualDoseCount = medication?.seguimientoUsarCantidadDosis === true;
  if (!useManualDoseCount) return 0;

  const doseCount = Number(String(medication?.seguimientoDosisCantidad || '').replace(/[^\d]/g, ''));
  if (!Number.isFinite(doseCount) || doseCount <= 0) return 0;

  const firstDoseTime = String(medication?.horaPrimeraDosis || '').trim();
  if (!/^\d{2}:\d{2}$/.test(firstDoseTime)) return 0;

  const baseDate = String(medication?.seguimientoBaseDate || '').slice(0, 10);
  if (!baseDate) return 0;

  const firstDoseTs = new Date(`${baseDate}T${firstDoseTime}`).getTime();
  if (!Number.isFinite(firstDoseTs) || firstDoseTs <= 0) return 0;

  const frequency = parseMedicationFrequency(medication?.frecuencia);
  if (!frequency.value) return 0;

  const intervalMinutes = frequency.unit === 'min' ? frequency.value : frequency.value * 60;
  return firstDoseTs + Math.max(0, doseCount - 1) * intervalMinutes * 60 * 1000;
};

const formatExcelDate = (isoStr) => {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return isoStr;
  const pad = (n) => n.toString().padStart(2, '0');
  const yy = d.getFullYear().toString().slice(-2);
  return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${yy} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const generateInternalIdentifier = (patients, ingresoDate) => {
  const rawDate = ingresoDate ? new Date(ingresoDate) : new Date();
  const d = isNaN(rawDate.getTime()) ? new Date() : rawDate;

  const yy = d.getFullYear().toString().slice(-2);
  const mm = (d.getMonth() + 1).toString().padStart(2, '0');
  const prefix = `FV-${mm}${yy}-`;

  const matchingPatients = (patients || []).filter((p) => {
    const internalId = p?.demographics?.identificadorInterno;
    return typeof internalId === 'string' && internalId.startsWith(prefix);
  });

  let maxConsecutive = 0;
  matchingPatients.forEach((p) => {
    const internalId = p.demographics.identificadorInterno;
    const parts = internalId.split('-');
    if (parts.length === 3) {
      const num = parseInt(parts[2], 10);
      if (!isNaN(num) && num > maxConsecutive) {
        maxConsecutive = num;
      }
    }
  });

  const nextNum = (maxConsecutive + 1).toString().padStart(3, '0');
  return `${prefix}${nextNum}`;
};

const normalizeRoomValue = (value = '') => String(value)
  .toLowerCase()
  .replace(/\s+/g, ' ')
  .trim();

const isActiveHospitalizedPatient = (patient) => {
  if (!patient || patient.deleted) return false;
  return !patient.demographics?.egreso;
};

const findActiveRoomConflict = (patients = [], roomValue = '', excludedPatientId = '') => {
  const normalizedRoom = normalizeRoomValue(roomValue);
  if (!normalizedRoom) return null;

  return (patients || []).find((p) => (
    p?.id !== excludedPatientId
    && isActiveHospitalizedPatient(p)
    && normalizeRoomValue(p?.demographics?.habitacion) === normalizedRoom
  )) || null;
};

const exportToCSV = (filename, rows) => {
  const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
    + rows.map(e => e.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(",")).join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const getPatientSyncPlan = (prevPatients = [], nextPatients = []) => {
  const prevById = new Map((prevPatients || []).map((p) => [p.id, p]));
  const nextById = new Map((nextPatients || []).map((p) => [p.id, p]));

  if (prevById.size !== nextById.size) {
    return { mode: 'bulk', changedPatient: null, changedPatients: [...nextById.values()] };
  }

  for (const id of prevById.keys()) {
    if (!nextById.has(id)) {
      return { mode: 'bulk', changedPatient: null, changedPatients: [...nextById.values()] };
    }
  }

  const changedPatients = [];
  for (const [id, patient] of nextById.entries()) {
    if (prevById.get(id) !== patient) changedPatients.push(patient);
  }

  if (changedPatients.length === 0) {
    return { mode: 'none', changedPatient: null, changedPatients: [] };
  }

  if (changedPatients.length === 1) {
    return { mode: 'single', changedPatient: changedPatients[0], changedPatients };
  }

  return { mode: 'bulk', changedPatient: null, changedPatients };
};

// --- Estados Iniciales Mock ---
const initialUsers = [
  { id: 'u1', username: 'CoordinadorFV', password: 'FarmaFV', role: 'admin', nombre: 'Admin FV', puesto: 'Coordinador', numEmpleado: '001', horario: 'Matutino' },
  { id: 'u2', username: 'Clinico1', password: '123', role: 'user', nombre: 'Farmacéutico Clínico', puesto: 'Especialista', numEmpleado: '002', horario: 'Vespertino' }
];

// App limpia y lista para producción sin pacientes de ejemplo
const initialPatients = [];

const {
  DemographicsTab,
  ConciliationTab,
  PharmacotherapyTab,
  PrmTab,
  LabsTab,
  MicrobiologyTab,
  RamTab,
} = createPatientTabComponents({
  PRESENTACIONES,
  VIAS,
  CATEGORIAS_FARMACO,
  IDONEIDAD_OPCIONES,
  CATEGORIAS_PRM,
  MAR_RECOMENDACIONES,
  TIPOS_PACIENTE,
  ESPECIALIDADES,
  COMORBILIDADES_PREDEFINIDAS,
  LAB_TEMPLATES,
  PREGUNTAS_ENTREVISTA,
  formatExcelDate,
  calculateAge,
  calculateIMC,
  calculateSC,
  calculateIdealWeight,
  calculateAdjustedWeight,
  calculateDaysOfUse,
  calculateCrCl,
  getTfgColorClass,
});

// ==========================================
// COMPONENTE PRINCIPAL (APP)
// ==========================================
export default function App() {
  const [users, setUsers] = useState(initialUsers);
  const [currentUser, setCurrentUser] = useState(() => getStoredSessionUser());

  const [patients, setPatients] = useState(initialPatients);
  const [dilutionsTable, setDilutionsTable] = useState(() => getStoredDilutionsTable());
  const [activePatientId, setActivePatientId] = useState(null);
  const [activeTab, setActiveTab] = useState('demographics');
  const [viewingAdmin, setViewingAdmin] = useState(false);
  const [showNewPatientModal, setShowNewPatientModal] = useState(false);
  const [isPatientSidebarOpen, setIsPatientSidebarOpen] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [syncError, setSyncError] = useState('');
  const [draftPatient, setDraftPatient] = useState(null);
  const [draftDirty, setDraftDirty] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [lockModal, setLockModal] = useState({ open: false, title: '', message: '', variant: 'lock' });
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    title: '',
    message: '',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    extraText: '',
  });
  const loadedFromDbRef = useRef(false);
  const patientsSyncTimerRef = useRef(null);
  const dilutionsSyncTimerRef = useRef(null);
  const skipNextUsersSyncRef = useRef(false);
  const skipNextPatientsSyncRef = useRef(false);
  const skipNextDilutionsSyncRef = useRef(false);
  const remoteRefreshTimerRef = useRef(null);
  const enteringPatientRef = useRef(false);
  const previousPatientsRef = useRef(initialPatients);
  const latestPatientsRef = useRef(initialPatients);
  const pendingPatientSyncRef = useRef(getStoredPendingPatientSync());
  const shownReminderNotificationsRef = useRef(new Set());
  const reminderPermissionAskedRef = useRef(false);
  const confirmResolverRef = useRef(null);
  const allowImmediateReloadRef = useRef(false);
  const [notificationNow, setNotificationNow] = useState(Date.now());

  const handleDilutionsTableChange = useCallback((nextTable) => {
    setDilutionsTable((prev) => {
      const resolved = typeof nextTable === 'function' ? nextTable(prev) : nextTable;
      return normalizeDilutionsTable({
        ...resolved,
        updatedAt: Date.now(),
      });
    });
  }, []);

  const createReminderForPatient = useCallback((payload = {}) => {
    const patientId = String(payload.patientId || '');
    const date = String(payload.date || '').trim();
    const time = String(payload.time || '').trim();
    const description = String(payload.description || '').trim();
    const importanceRaw = String(payload.importance || '').toLowerCase();
    const importance = ['baja', 'media', 'alta'].includes(importanceRaw) ? importanceRaw : 'media';

    if (!patientId) return { ok: false, message: 'Selecciona un paciente activo.' };
    if (!date || !time) return { ok: false, message: 'Completa fecha y hora del recordatorio.' };
    if (!description) return { ok: false, message: 'Agrega una descripción del recordatorio.' };

    const dueAtTs = new Date(`${date}T${time}`).getTime();
    if (!Number.isFinite(dueAtTs) || dueAtTs <= 0) {
      return { ok: false, message: 'La fecha y hora del recordatorio no son válidas.' };
    }

    const targetPatient = (patients || []).find((patient) => patient.id === patientId);
    if (!targetPatient || targetPatient.deleted || targetPatient.demographics?.egreso) {
      return { ok: false, message: 'Solo se pueden crear recordatorios en pacientes activos.' };
    }

    const now = Date.now();
    const createdByName = currentUser?.nombre || currentUser?.username || 'Usuario';
    const reminder = {
      id: `rem-${now}-${Math.random().toString(36).slice(2, 8)}`,
      dueAt: new Date(dueAtTs).toISOString(),
      importance,
      status: 'pendiente',
      description,
      createdAt: new Date(now).toISOString(),
      createdByUserId: currentUser?.id || '',
      createdByName,
      reviewedByUserId: '',
      reviewedBy: '',
      reviewedByName: '',
      reviewedAt: '',
    };

    setPatients((prev) => prev.map((patient) => {
      if (patient.id !== patientId) return patient;

      return {
        ...patient,
        reminders: [...(Array.isArray(patient.reminders) ? patient.reminders : []), reminder],
        lastChangedAt: now,
      };
    }));

    return { ok: true };
  }, [patients, currentUser]);

  const markReminderReviewed = useCallback((patientId, reminderId, reviewer = {}) => {
    if (!patientId || !reminderId) return false;

    const now = Date.now();
    const reviewerId = reviewer.userId || currentUser?.id || '';
    const reviewerName = reviewer.userName || currentUser?.nombre || currentUser?.username || 'Usuario';
    let changed = false;

    setPatients((prev) => prev.map((patient) => {
      if (patient.id !== patientId) return patient;

      const currentReminders = Array.isArray(patient.reminders) ? patient.reminders : [];
      const nextReminders = currentReminders.map((reminder) => {
        if (reminder.id !== reminderId) return reminder;
        if (reminder.status === 'finalizado' || reminder.reviewedByName || reminder.reviewedBy) return reminder;

        changed = true;
        return {
          ...reminder,
          status: 'finalizado',
          reviewedByUserId: reviewerId,
          reviewedBy: reviewerName,
          reviewedByName: reviewerName,
          reviewedAt: new Date(now).toISOString(),
        };
      });

      if (!changed) return patient;
      return {
        ...patient,
        reminders: nextReminders,
        lastReviewedAt: now,
        lastChangedAt: now,
      };
    }));

    return changed;
  }, [currentUser]);

  const openLockModal = useCallback((title, message, variant = 'lock') => {
    setLockModal({ open: true, title, message, variant });
  }, []);

  const closeLockModal = useCallback(() => {
    setLockModal({ open: false, title: '', message: '', variant: 'lock' });
  }, []);

  const requestConfirmationModal = useCallback((options = {}) => new Promise((resolve) => {
    confirmResolverRef.current = resolve;
    setConfirmModal({
      open: true,
      title: options.title || 'Confirmar acción',
      message: options.message || '¿Deseas continuar?',
      confirmText: options.confirmText || 'Confirmar',
      cancelText: options.cancelText || 'Cancelar',
      extraText: options.extraText || '',
    });
  }), []);

  const resolveConfirmationModal = useCallback((accepted) => {
    setConfirmModal({
      open: false,
      title: '',
      message: '',
      confirmText: 'Confirmar',
      cancelText: 'Cancelar',
      extraText: '',
    });

    const resolver = confirmResolverRef.current;
    confirmResolverRef.current = null;
    if (resolver) resolver(accepted);
  }, []);

  const queuePendingPatientSync = useCallback((patient) => {
    if (!patient?.id) return;
    pendingPatientSyncRef.current = {
      ...(pendingPatientSyncRef.current || {}),
      [patient.id]: patient,
    };
    setStoredPendingPatientSync(pendingPatientSyncRef.current);
  }, []);

  const clearPendingPatientSync = useCallback((patientId) => {
    if (!patientId) return;
    if (!pendingPatientSyncRef.current?.[patientId]) return;
    const nextPending = { ...(pendingPatientSyncRef.current || {}) };
    delete nextPending[patientId];
    pendingPatientSyncRef.current = nextPending;
    setStoredPendingPatientSync(nextPending);
  }, []);

  const syncPatientNow = useCallback(async (patient, options = {}) => {
    if (!patient?.id) return true;

    queuePendingPatientSync(patient);
    try {
      await apiFetch('/api/sync/patient', {
        method: 'PUT',
        body: JSON.stringify({ patient }),
        keepalive: options.keepalive === true,
      });
      clearPendingPatientSync(patient.id);
      setSyncError('');
      return true;
    } catch {
      setSyncError('No se pudo sincronizar el paciente en tiempo real.');
      return false;
    }
  }, [clearPendingPatientSync, queuePendingPatientSync]);

  const flushPendingPatientSyncQueue = useCallback(async (options = {}) => {
    const pendingPatients = Object.values(pendingPatientSyncRef.current || {});
    if (pendingPatients.length === 0) return;

    for (const patient of pendingPatients) {
      await syncPatientNow(patient, options);
    }
  }, [syncPatientNow]);

  const acquirePatientLock = useCallback(async (patientId) => {
    if (!patientId || !currentUser?.id) {
      return { ok: false, lockedByUserName: null };
    }

    try {
      const payload = await apiFetch('/api/patient-lock/acquire', {
        method: 'POST',
        body: JSON.stringify({ patientId, userId: currentUser.id }),
      });
      return payload;
    } catch {
      return { ok: false, lockedByUserName: null, lockCheckError: true };
    }
  }, [currentUser?.id]);

  const releasePatientLock = useCallback(async (patientId, options = {}) => {
    if (!patientId || !currentUser?.id) return;

    try {
      await apiFetch('/api/patient-lock/release', {
        method: 'POST',
        body: JSON.stringify({ patientId, userId: currentUser.id }),
        keepalive: options.keepalive === true,
      });
    } catch {
      // ignore release errors (lock expires automatically by TTL)
    }
  }, [currentUser?.id]);

  useEffect(() => {
    latestPatientsRef.current = patients;
  }, [patients]);

  useEffect(() => {
    let mounted = true;
    const loadFromDb = async () => {
      try {
        const data = await apiFetch('/api/bootstrap');
        if (!mounted) return;
        const incomingUsers = Array.isArray(data?.users) ? data.users : initialUsers;
        const incomingPatients = Array.isArray(data?.patients) ? data.patients : [];
        const remoteDilutions = data?.dilutionsTable ? normalizeDilutionsTable(data.dilutionsTable) : null;
        const fallbackDilutions = getStoredDilutionsTable();
        const nextDilutionsTable = remoteDilutions || fallbackDilutions;
        const validUserIds = new Set(incomingUsers.map((u) => u.id));
        const normalizedPatients = incomingPatients.map((p) =>
          sanitizePatientPresence(p, validUserIds, { dropStale: true, keepMissingTimestamps: true })
        );
        const pendingById = pendingPatientSyncRef.current || {};
        const mergedPatients = normalizedPatients.map((p) => pendingById[p.id] || p);
        Object.keys(pendingById).forEach((pid) => {
          if (!mergedPatients.some((p) => p.id === pid)) {
            mergedPatients.push(pendingById[pid]);
          }
        });

        setUsers(incomingUsers);
        skipNextDilutionsSyncRef.current = Boolean(remoteDilutions);
  setDilutionsTable(nextDilutionsTable);
        previousPatientsRef.current = mergedPatients;
        setPatients(mergedPatients);
        setSyncError('');
        loadedFromDbRef.current = true;
      } catch (_err) {
        if (!mounted) return;
        loadedFromDbRef.current = true;
      } finally {
        if (mounted) setBootstrapping(false);
      }
    };

    loadFromDb();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!currentUser) {
      safeStorageRemove(SESSION_USER_KEY);
      return;
    }
    safeStorageSet(SESSION_USER_KEY, JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    setStoredDilutionsTable(dilutionsTable);
  }, [dilutionsTable]);

  useEffect(() => {
    if (bootstrapping || !currentUser) return;
    const refreshedUser = users.find((u) => u.id === currentUser.id);
    if (!refreshedUser) {
      if (activePatientId && currentUser.id) {
        setPatients((prev) => prev.map((patient) => {
          if (patient.id !== activePatientId) return patient;
          return removePresenceFromPatient(patient, currentUser.id);
        }));
      }
      setCurrentUser(null);
      setViewingAdmin(false);
      setActivePatientId(null);
      return;
    }
    if (JSON.stringify(refreshedUser) !== JSON.stringify(currentUser)) {
      setCurrentUser(refreshedUser);
    }
  }, [bootstrapping, users, currentUser, activePatientId]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;

    let disposed = false;
    let eventSource;
    let reconnectTimer;

    const refreshFromServer = async () => {
      try {
        const data = await apiFetch('/api/bootstrap');
        const incomingUsers = Array.isArray(data?.users) ? data.users : initialUsers;
        const incomingPatients = Array.isArray(data?.patients) ? data.patients : [];
        const incomingDilutions = data?.dilutionsTable ? normalizeDilutionsTable(data.dilutionsTable) : null;
        const validUserIds = new Set(incomingUsers.map((u) => u.id));
        const normalizedPatients = incomingPatients.map((p) =>
          sanitizePatientPresence(p, validUserIds, { dropStale: true, keepMissingTimestamps: true })
        );
        const pendingById = pendingPatientSyncRef.current || {};
        const mergedPatients = normalizedPatients.map((p) => pendingById[p.id] || p);
        Object.keys(pendingById).forEach((pid) => {
          if (!mergedPatients.some((p) => p.id === pid)) {
            mergedPatients.push(pendingById[pid]);
          }
        });

        skipNextUsersSyncRef.current = true;
        skipNextPatientsSyncRef.current = true;
        if (incomingDilutions) {
          skipNextDilutionsSyncRef.current = true;
          setDilutionsTable(incomingDilutions);
        }
        setUsers(incomingUsers);
        previousPatientsRef.current = mergedPatients;
        setPatients(mergedPatients);
        setSyncError('');
      } catch (_err) {
        // ignore transient refresh errors; connection will retry
      }
    };

    const scheduleRefresh = () => {
      if (remoteRefreshTimerRef.current) clearTimeout(remoteRefreshTimerRef.current);
      remoteRefreshTimerRef.current = setTimeout(refreshFromServer, 150);
    };

    const connect = () => {
      const clientId = encodeURIComponent(getOrCreateClientId());

      resolveApiBase()
        .then((apiBase) => {
          if (disposed) return;
          eventSource = new EventSource(`${apiBase}/api/events?clientId=${clientId}`);
          eventSource.addEventListener('users-updated', scheduleRefresh);
          eventSource.addEventListener('patients-updated', scheduleRefresh);
          eventSource.addEventListener('dilutions-updated', scheduleRefresh);
          eventSource.onerror = () => {
            if (eventSource) eventSource.close();
            if (!disposed) reconnectTimer = setTimeout(connect, 2000);
          };
        })
        .catch(() => {
          if (!disposed) reconnectTimer = setTimeout(connect, 2000);
        });
    };

    connect();

    return () => {
      disposed = true;
      if (remoteRefreshTimerRef.current) clearTimeout(remoteRefreshTimerRef.current);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (eventSource) eventSource.close();
    };
  }, []);

  useEffect(() => {
    if (!loadedFromDbRef.current) return;
    if (skipNextUsersSyncRef.current) {
      skipNextUsersSyncRef.current = false;
      return;
    }

    apiFetch('/api/sync/users', {
      method: 'PUT',
      body: JSON.stringify({ users }),
    }).catch(() => setSyncError('No se pudo sincronizar usuarios con BD.'));
  }, [users]);

  useEffect(() => {
    if (!loadedFromDbRef.current) return;

    if (skipNextDilutionsSyncRef.current) {
      skipNextDilutionsSyncRef.current = false;
      return;
    }

    if (dilutionsSyncTimerRef.current) clearTimeout(dilutionsSyncTimerRef.current);
    dilutionsSyncTimerRef.current = setTimeout(() => {
      apiFetch('/api/dilutions', {
        method: 'PUT',
        body: JSON.stringify({
          dilutionsTable: normalizeDilutionsTable({
            ...dilutionsTable,
            updatedAt: Date.now(),
          }),
        }),
      })
        .then(() => setSyncError(''))
        .catch(() => setSyncError('No se pudo sincronizar la tabla de diluciones con BD.'));
    }, 220);

    return () => {
      if (dilutionsSyncTimerRef.current) clearTimeout(dilutionsSyncTimerRef.current);
    };
  }, [dilutionsTable]);

  useEffect(() => {
    const prevPatients = previousPatientsRef.current;
    previousPatientsRef.current = patients;

    if (!loadedFromDbRef.current) return;

    if (skipNextPatientsSyncRef.current) {
      skipNextPatientsSyncRef.current = false;
      return;
    }

    const syncPlan = getPatientSyncPlan(prevPatients, patients);
    if (syncPlan.mode === 'none') return;

    if (patientsSyncTimerRef.current) clearTimeout(patientsSyncTimerRef.current);
    patientsSyncTimerRef.current = setTimeout(() => {
      if (syncPlan.mode === 'single' && syncPlan.changedPatient?.id) {
        void syncPatientNow(syncPlan.changedPatient);
        return;
      }

      apiFetch('/api/sync/patients', {
        method: 'PUT',
        body: JSON.stringify({ patients }),
      })
        .then(() => {
          setSyncError('');
          pendingPatientSyncRef.current = {};
          setStoredPendingPatientSync({});
        })
        .catch(() => {
          (syncPlan.changedPatients || []).forEach((p) => queuePendingPatientSync(p));
          setSyncError('No se pudo sincronizar pacientes con BD.');
        });
    }, syncPlan.mode === 'single' ? 120 : 260);

    return () => {
      if (patientsSyncTimerRef.current) clearTimeout(patientsSyncTimerRef.current);
    };
  }, [patients, queuePendingPatientSync, syncPatientNow]);

  useEffect(() => {
    if (bootstrapping) return;

    const retryPendingSync = () => {
      if (Object.keys(pendingPatientSyncRef.current || {}).length === 0) return;
      void flushPendingPatientSyncQueue();
    };

    retryPendingSync();
    const timer = setInterval(retryPendingSync, SYNC_RETRY_MS);
    if (typeof window !== 'undefined') {
      window.addEventListener('online', retryPendingSync);
    }

    return () => {
      clearInterval(timer);
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', retryPendingSync);
      }
    };
  }, [bootstrapping, flushPendingPatientSyncQueue]);

  useEffect(() => {
    if (!activePatientId || !currentUser?.id) return;

    const renewLock = async () => {
      const result = await acquirePatientLock(activePatientId);
      if (result?.ok) return;

      if (result?.lockedByUserName) {
        setSyncError(`Bloqueo de edición ocupado por ${result.lockedByUserName}.`);
      }
    };

    void renewLock();
    const timer = setInterval(() => {
      void renewLock();
    }, 30000);

    return () => {
      clearInterval(timer);
    };
  }, [activePatientId, currentUser?.id, acquirePatientLock]);

  useEffect(() => {
    if (!currentUser?.id || !activePatientId) return;

    const touchPresence = () => {
      const now = Date.now();
      setPatients((prev) => {
        let changed = false;
        const next = prev.map((patient) => {
          let updated = patient;

          if ((patient.activeUsers || []).includes(currentUser.id) && patient.id !== activePatientId) {
            updated = removePresenceFromPatient(updated, currentUser.id);
          }

          if (patient.id === activePatientId) {
            updated = touchPresenceInPatient(updated, currentUser.id, now);
          }

          if (updated !== patient) changed = true;
          return updated;
        });

        return changed ? next : prev;
      });
    };

    touchPresence();
    const timer = setInterval(touchPresence, PRESENCE_HEARTBEAT_MS);

    return () => {
      clearInterval(timer);
    };
  }, [activePatientId, currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.id) return;

    const cleanupPresence = () => {
      const now = Date.now();
      const validUserIds = new Set(users.map((u) => u.id));

      setPatients((prev) => {
        let changed = false;
        const next = prev.map((patient) => {
          const sanitized = sanitizePatientPresence(patient, validUserIds, {
            now,
            dropStale: true,
            keepMissingTimestamps: true,
          });
          if (sanitized !== patient) changed = true;
          return sanitized;
        });

        return changed ? next : prev;
      });
    };

    cleanupPresence();
    const timer = setInterval(cleanupPresence, PRESENCE_HEARTBEAT_MS);

    return () => {
      clearInterval(timer);
    };
  }, [users, currentUser?.id]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const releasePresence = () => {
      if (patientsSyncTimerRef.current) {
        clearTimeout(patientsSyncTimerRef.current);
        patientsSyncTimerRef.current = null;
      }

      const activePatient = (latestPatientsRef.current || []).find((p) => p.id === activePatientId);
      if (activePatient) {
        void syncPatientNow(activePatient, { keepalive: true });
      }
      void flushPendingPatientSyncQueue({ keepalive: true });

      if (!activePatientId || !currentUser?.id) return;

      void releasePatientLock(activePatientId, { keepalive: true });

      setPatients((prev) => {
        let changed = false;
        const next = prev.map((patient) => {
          if (patient.id !== activePatientId) return patient;
          const updated = removePresenceFromPatient(patient, currentUser.id);
          if (updated !== patient) changed = true;
          return updated;
        });
        return changed ? next : prev;
      });
    };

    window.addEventListener('pagehide', releasePresence);
    window.addEventListener('beforeunload', releasePresence);

    return () => {
      window.removeEventListener('pagehide', releasePresence);
      window.removeEventListener('beforeunload', releasePresence);
    };
  }, [activePatientId, currentUser?.id, flushPendingPatientSyncQueue, syncPatientNow, releasePatientLock]);

  useEffect(() => {
    if (!isPatientSidebarOpen) return;

    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        setIsPatientSidebarOpen(false);
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isPatientSidebarOpen]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleBeforeUnload = (event) => {
      if (allowImmediateReloadRef.current) return;
      if (!draftDirty) return;
      event.preventDefault();
      event.returnValue = UNSAVED_CHANGES_BEFOREUNLOAD_MSG;
      return UNSAVED_CHANGES_BEFOREUNLOAD_MSG;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [draftDirty]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleReloadShortcut = (event) => {
      const key = String(event.key || '').toLowerCase();
      const isKeyboardReload = event.key === 'F5' || ((event.ctrlKey || event.metaKey) && key === 'r');
      if (!isKeyboardReload || !draftDirty) return;

      event.preventDefault();

      void (async () => {
        const approved = await requestConfirmationModal({
          title: 'Recargar página',
          message: 'Hay cambios pendientes sin guardar. Si recargas ahora, esos cambios se perderán.',
          confirmText: 'Recargar de todos modos',
          cancelText: 'Cancelar',
        });

        if (!approved) return;
        allowImmediateReloadRef.current = true;
        window.location.reload();
      })();
    };

    window.addEventListener('keydown', handleReloadShortcut);
    return () => {
      window.removeEventListener('keydown', handleReloadShortcut);
    };
  }, [draftDirty, requestConfirmationModal]);

  useEffect(() => {
    const timer = setInterval(() => setNotificationNow(Date.now()), NOTIF_REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!activePatientId) {
      setDraftPatient(null);
      setDraftDirty(false);
      setIsSavingDraft(false);
      return;
    }

    const source = patients.find((p) => p.id === activePatientId) || null;
    if (!source) {
      setDraftPatient(null);
      setDraftDirty(false);
      setIsSavingDraft(false);
      return;
    }

    // Keep the form synced with server state while there are no local unsaved edits.
    if (!draftDirty || draftPatient?.id !== activePatientId) {
      setDraftPatient(source);
    }
  }, [patients, activePatientId, draftDirty, draftPatient?.id]);

  const attemptExitPatient = useCallback(async () => {
    if (draftDirty) {
      const exitDecision = await requestConfirmationModal({
        title: 'Cambios sin guardar',
        message: 'Tienes cambios pendientes. Si sales ahora, se perderán. ¿Deseas salir de todos modos?',
        confirmText: 'Salir sin guardar',
        cancelText: 'Seguir editando',
        extraText: 'Guardar y salir',
      });

      if (exitDecision === 'save-exit') {
        const draftToSave = draftPatient?.id === activePatientId
          ? draftPatient
          : (patients.find((p) => p.id === activePatientId) || null);

        if (!draftToSave?.id) return false;

        const roomConflict = isActiveHospitalizedPatient(draftToSave)
          ? findActiveRoomConflict(patients, draftToSave.demographics?.habitacion, draftToSave.id)
          : null;
        if (roomConflict) {
          openLockModal(
            'Habitación ocupada',
            `No se puede guardar: la habitación ${draftToSave.demographics?.habitacion || '-'} ya está asignada al paciente activo ${roomConflict.demographics?.nombre || 'sin nombre'}.`,
            'error',
          );
          return false;
        }

        const lockResult = await acquirePatientLock(draftToSave.id);
        if (!lockResult?.ok) {
          const blockingName = lockResult?.lockedByUserName || 'otro usuario';
          openLockModal('No se puede guardar', `No se puede guardar porque ${blockingName} está editando este paciente.`);
          return false;
        }

        const patientToSave = { ...draftToSave, lastChangedAt: Date.now() };
        setIsSavingDraft(true);
        setDraftPatient(patientToSave);

        skipNextPatientsSyncRef.current = true;
        setPatients((prev) => prev.map((p) => (p.id === patientToSave.id ? patientToSave : p)));

        const saved = await syncPatientNow(patientToSave);
        setIsSavingDraft(false);

        if (!saved) return false;
        setDraftDirty(false);
        setSyncError('');
      } else if (!exitDecision) {
        return false;
      }
    }

    if (activePatientId && currentUser?.id) {
      void releasePatientLock(activePatientId, { keepalive: true });

      setPatients((prev) => {
        let changed = false;
        const next = prev.map((patient) => {
          if (patient.id !== activePatientId) return patient;
          const updated = removePresenceFromPatient(patient, currentUser.id);
          if (updated !== patient) changed = true;
          return updated;
        });
        return changed ? next : prev;
      });
    }

    setDraftPatient(null);
    setDraftDirty(false);
    setIsSavingDraft(false);
    setActivePatientId(null);
    setIsPatientSidebarOpen(false);
    return true;
  }, [
    draftDirty,
    requestConfirmationModal,
    draftPatient,
    activePatientId,
    patients,
    acquirePatientLock,
    openLockModal,
    syncPatientNow,
    currentUser?.id,
    releasePatientLock,
  ]);
  // --- LÓGICA DE PRESENCIA COLABORATIVA Y NAVEGACIÓN ---
  const handleEnterPatient = async (id, targetTab = 'demographics') => {
    const p = patients.find(x => x.id === id);
    if (!p || !currentUser?.id) return;
    if (enteringPatientRef.current) return;

    if (activePatientId === id) {
      setActiveTab(targetTab);
      setIsPatientSidebarOpen(false);
      return;
    }

    if (activePatientId && activePatientId !== id && draftDirty) {
      const confirmDiscard = await requestConfirmationModal({
        title: 'Cambios sin guardar',
        message: 'Si cambias de paciente ahora, tus cambios actuales se perderán.',
        confirmText: 'Cambiar paciente',
        cancelText: 'Seguir editando',
      });
      if (!confirmDiscard) return;
    }

    enteringPatientRef.current = true;

    try {
      const lockResult = await acquirePatientLock(id);
      if (!lockResult?.ok) {
        if (lockResult?.lockCheckError) {
          openLockModal('No se pudo validar bloqueo', 'No fue posible validar el bloqueo de edición con el servidor. Intenta de nuevo en unos segundos.', 'error');
          return;
        }

        const blockingName = lockResult?.lockedByUserName || 'otro usuario';
        openLockModal('Paciente en edición', `Este paciente está siendo editado por ${blockingName}. Podrás entrar cuando salga al Dashboard.`);
        return;
      }

      if (activePatientId && activePatientId !== id) {
        void releasePatientLock(activePatientId);
      }

      const now = Date.now();
      let selectedUpdated = null;

      setPatients((prev) => {
        let changed = false;
        const next = prev.map((patient) => {
          let updated = patient;

          if ((patient.activeUsers || []).includes(currentUser.id) && patient.id !== id) {
            updated = removePresenceFromPatient(updated, currentUser.id);
          }

          if (patient.id === id) {
            updated = {
              ...touchPresenceInPatient(patient, currentUser.id, now),
              lastReviewedAt: now,
            };
            selectedUpdated = updated;
          }

          if (updated !== patient) changed = true;
          return updated;
        });

        return changed ? next : prev;
      });

      if (!selectedUpdated) {
        selectedUpdated = {
          ...touchPresenceInPatient(p, currentUser.id, now),
          lastReviewedAt: now,
        };
      }

      setDraftPatient(selectedUpdated);
      setDraftDirty(false);
      setIsSavingDraft(false);
      setActivePatientId(id);
      setActiveTab(targetTab);
      setIsPatientSidebarOpen(false);
    } finally {
      enteringPatientRef.current = false;
    }
  };

  const handleExitPatient = () => {
    void attemptExitPatient();
  };

  const handleLogoutWithUnlock = async () => {
    const canLogout = await attemptExitPatient();
    if (!canLogout) return;
    setCurrentUser(null);
  };

  const markPatientReviewed = (patientId) => {
    const now = Date.now();
    setPatients((prev) => prev.map((p) => (p.id === patientId ? { ...p, lastReviewedAt: now } : p)));
  };

  const markMedicationLastDoseNotified = useCallback((patientId, medicationId, lastDoseTs) => {
    const seenTs = Number(lastDoseTs || Date.now());
    setPatients((prev) => prev.map((patient) => {
      if (patient.id !== patientId) return patient;

      const updatedPerfil = (patient.perfilFarmaco || []).map((medication) => {
        if (medication.id !== medicationId) return medication;
        const prevSeen = Number(medication.ultimaDosisNotificadaAt || 0);
        return {
          ...medication,
          ultimaDosisNotificadaAt: Math.max(prevSeen, seenTs),
        };
      });

      return { ...patient, perfilFarmaco: updatedPerfil };
    }));
  }, []);

  const activePatientReminders = useMemo(() => {
    const rows = [];

    (patients || []).forEach((patient) => {
      if (patient.deleted || patient.demographics?.egreso) return;

      const patientReminders = Array.isArray(patient.reminders) ? patient.reminders : [];
      patientReminders.forEach((reminder) => {
        rows.push({
          ...reminder,
          patientId: patient.id,
          patientName: patient.demographics?.nombre || 'Paciente sin nombre',
          patientRoom: patient.demographics?.habitacion || '-',
        });
      });
    });

    return rows.sort((a, b) => {
      const aReviewed = a.status === 'finalizado' || a.reviewedByName || a.reviewedBy ? 1 : 0;
      const bReviewed = b.status === 'finalizado' || b.reviewedByName || b.reviewedBy ? 1 : 0;
      if (aReviewed !== bReviewed) return aReviewed - bReviewed;

      const aDueTs = new Date(a.dueAt || 0).getTime();
      const bDueTs = new Date(b.dueAt || 0).getTime();
      return aDueTs - bDueTs;
    });
  }, [patients]);

  const notifications = useMemo(() => {
    const staleThresholdMs = NOTIF_SIN_CAMBIOS_HORAS * 60 * 60 * 1000;
    const result = [];

    (patients || []).forEach((patient) => {
      if (patient.deleted) return;
      if (patient.demographics?.egreso) return;

      const ingresoTs = patient.demographics?.ingreso ? new Date(patient.demographics.ingreso).getTime() : 0;
      const lastChangedAt = Number(patient.lastChangedAt || 0);
      const lastReviewedAt = Number(patient.lastReviewedAt || 0);
      const lastActivityTs = Math.max(ingresoTs || 0, lastChangedAt, lastReviewedAt);

      if (lastActivityTs > 0) {
        const idleMs = notificationNow - lastActivityTs;
        if (idleMs >= staleThresholdMs) {
          const idleHours = Math.floor(idleMs / (60 * 60 * 1000));
          result.push({
            id: `idle-${patient.id}`,
            type: 'idle',
            patientId: patient.id,
            patientName: patient.demographics?.nombre || 'Paciente sin nombre',
            title: 'Paciente sin revision reciente',
            message: `Han pasado ${idleHours}h sin cambios o revision del expediente.`,
            severity: 'warning',
            sortValue: idleMs,
          });
        }
      }

      const activeAtb = (patient.perfilFarmaco || []).filter(
        (med) => med.categoria === 'Antibiótico' && med.estado === 'Activo'
      );
      const maxDiasAtb = activeAtb.reduce(
        (max, med) => Math.max(max, calculateDaysOfUse(med.fechaInicio, patient.demographics?.egreso)),
        0
      );

      if (maxDiasAtb >= NOTIF_ANTIBIOTICO_DIAS) {
        const seenAtbDays = Number(patient.atbAlertSeenDays || 0);
        const wasSeenForCurrentOrHigherDays = seenAtbDays >= maxDiasAtb;
        if (!wasSeenForCurrentOrHigherDays) {
          result.push({
            id: `atb-${patient.id}`,
            type: 'antibiotico',
            patientId: patient.id,
            patientName: patient.demographics?.nombre || 'Paciente sin nombre',
            title: 'Antibiótico prolongado',
            message: `El paciente acumula ${maxDiasAtb} días con antibiótico activo.`,
            atbDays: maxDiasAtb,
            severity: 'critical',
            sortValue: maxDiasAtb,
          });
        }
      }

      (Array.isArray(patient.reminders) ? patient.reminders : []).forEach((reminder) => {
        const wasReviewed = reminder.status === 'finalizado' || Boolean(reminder.reviewedByName || reminder.reviewedBy);
        if (wasReviewed) return;

        const dueTs = new Date(reminder.dueAt || 0).getTime();
        if (!Number.isFinite(dueTs) || dueTs <= 0) return;
        if (dueTs > notificationNow) return;

        const importance = String(reminder.importance || 'media').toLowerCase();
        const severity = importance === 'alta' ? 'critical' : importance === 'baja' ? 'info' : 'warning';
        const dueLabel = formatExcelDate(reminder.dueAt) || new Date(dueTs).toLocaleString();

        result.push({
          id: `reminder-${patient.id}-${reminder.id}`,
          type: 'recordatorio',
          reminderId: reminder.id,
          patientId: patient.id,
          patientName: patient.demographics?.nombre || 'Paciente sin nombre',
          title: 'Recordatorio programado',
          message: `${reminder.description || 'Sin descripción'} | Programado: ${dueLabel}`,
          severity,
          importance,
          sortValue: notificationNow - dueTs,
        });
      });

      (Array.isArray(patient.perfilFarmaco) ? patient.perfilFarmaco : []).forEach((medication) => {
        if (medication.estado !== 'Activo') return;
        if (medication.seguimientoUsarCantidadDosis !== true) return;

        const lastDoseTs = getMedicationLastDoseTimestamp(medication);
        if (!Number.isFinite(lastDoseTs) || lastDoseTs <= 0) return;
        if (lastDoseTs > notificationNow) return;

        const seenTs = Number(medication.ultimaDosisNotificadaAt || 0);
        if (seenTs >= lastDoseTs) return;

        const medicationName = String(medication.principio || 'Medicamento').trim() || 'Medicamento';
        const patientName = patient.demographics?.nombre || 'Paciente sin nombre';
        const dueLabel = new Date(lastDoseTs).toLocaleString();

        result.push({
          id: `last-dose-${patient.id}-${medication.id}-${lastDoseTs}`,
          type: 'ultima-dosis',
          patientId: patient.id,
          patientName,
          medicationId: medication.id,
          medicationName,
          lastDoseTs,
          title: 'Última dosis programada',
          message: `ULTIMA DOSIS DE MEDICAMENTO ${medicationName} A PACIENTE ${patientName} | Hora: ${dueLabel}`,
          severity: 'critical',
          sortValue: notificationNow - lastDoseTs,
        });
      });
    });

    const priority = { critical: 3, warning: 2, info: 1 };
    return result.sort((a, b) => {
      const severityDiff = (priority[b.severity] || 0) - (priority[a.severity] || 0);
      if (severityDiff !== 0) return severityDiff;
      return (b.sortValue || 0) - (a.sortValue || 0);
    });
  }, [patients, notificationNow, formatExcelDate]);

  const handleNotificationOpen = useCallback((notification) => {
    if (!notification?.patientId) return;

    if (notification.type === 'recordatorio') {
      markReminderReviewed(notification.patientId, notification.reminderId, {
        userId: currentUser?.id,
        userName: currentUser?.nombre || currentUser?.username || 'Usuario',
      });
      handleEnterPatient(notification.patientId, 'demographics');
      return;
    }

    if (notification.type === 'ultima-dosis') {
      markMedicationLastDoseNotified(notification.patientId, notification.medicationId, notification.lastDoseTs);
      handleEnterPatient(notification.patientId, 'pharmacotherapy');
      return;
    }

    const targetTab = notification.type === 'antibiotico' ? 'pharmacotherapy' : 'demographics';
    handleEnterPatient(notification.patientId, targetTab);
  }, [currentUser?.id, currentUser?.nombre, currentUser?.username, handleEnterPatient, markMedicationLastDoseNotified, markReminderReviewed]);

  const handleNotificationMarkReviewed = (notification) => {
    if (!notification?.patientId) return;

    if (notification.type === 'recordatorio') {
      markReminderReviewed(notification.patientId, notification.reminderId, {
        userId: currentUser?.id,
        userName: currentUser?.nombre || currentUser?.username || 'Usuario',
      });
      return;
    }

    if (notification.type === 'ultima-dosis') {
      markMedicationLastDoseNotified(notification.patientId, notification.medicationId, notification.lastDoseTs);
      return;
    }

    if (notification.type === 'antibiotico') {
      const atbDays = Number(notification.atbDays || 0);
      setPatients((prev) => prev.map((p) => (
        p.id === notification.patientId
          ? { ...p, atbAlertSeenDays: atbDays }
          : p
      )));
      return;
    }

    markPatientReviewed(notification.patientId);
  };

  useEffect(() => {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') return;

    const dueReminderNotifications = notifications.filter((item) => item.type === 'recordatorio' || item.type === 'ultima-dosis');
    const dueIds = new Set(dueReminderNotifications.map((item) => item.id));

    shownReminderNotificationsRef.current.forEach((id) => {
      if (!dueIds.has(id)) shownReminderNotificationsRef.current.delete(id);
    });

    if (!dueReminderNotifications.length) return;

    if (Notification.permission === 'default' && !reminderPermissionAskedRef.current) {
      reminderPermissionAskedRef.current = true;
      void Notification.requestPermission().catch(() => {});
    }

    if (Notification.permission !== 'granted') return;

    dueReminderNotifications.forEach((notification) => {
      if (shownReminderNotificationsRef.current.has(notification.id)) return;
      shownReminderNotificationsRef.current.add(notification.id);

      try {
        const title = notification.type === 'ultima-dosis'
          ? `Última dosis: ${notification.patientName}`
          : `Recordatorio: ${notification.patientName}`;

        const desktopNotification = new Notification(title, {
          body: notification.message,
          tag: notification.id,
          requireInteraction: notification.severity === 'critical',
        });

        desktopNotification.onclick = () => {
          if (typeof window !== 'undefined') window.focus();
          handleNotificationOpen(notification);
          desktopNotification.close();
        };
      } catch {
        // ignore system-notification errors on unsupported environments
      }
    });
  }, [notifications, handleNotificationOpen]);

  const handleLoginAttempt = useCallback(async ({ username, password }) => {
    try {
      const payload = await apiFetch('/api/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      return payload;
    } catch (_err) {
      const fallbackUser = users.find((u) => u.username === username && u.password === password);
      if (fallbackUser) {
        return { user: fallbackUser };
      }
      throw new Error('Credenciales incorrectas o usuario no existe.');
    }
  }, [users]);

  // --- LOGIN ---
  if (bootstrapping) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-bold">Cargando datos desde BD...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen onLogin={setCurrentUser} onLoginAttempt={handleLoginAttempt} appVersion={APP_VERSION} />;
  }
  // --- ADMIN PANEL ---
  if (viewingAdmin && currentUser.role === 'admin') return <AdminPanel users={users} setUsers={setUsers} onClose={() => setViewingAdmin(false)} currentUser={currentUser} onLogout={handleLogoutWithUnlock} />;

  // --- APP PRINCIPAL ---
  const activePatient = patients.find(p => p.id === activePatientId) || null;
  const activePatientForEditing = draftPatient?.id === activePatientId ? draftPatient : activePatient;
  const otherActiveUserIds = activePatient ? listOtherActiveUsers(activePatient, currentUser.id) : [];
  const otherActiveNames = otherActiveUserIds.map(uid => users.find(u => u.id === uid)?.nombre).join(', ');
  const lockedByOtherUser = otherActiveUserIds.length > 0;

  const updatePatient = (updatedData) => {
    if (!activePatientId || !activePatientForEditing) return;
    if (lockedByOtherUser) {
      setSyncError(`Edición bloqueada por: ${otherActiveNames || 'otro usuario'}.`);
      return;
    }

    const now = Date.now();
    setDraftPatient((prev) => {
      if (!prev || prev.id !== activePatientId) return prev;
      return { ...prev, ...updatedData, lastChangedAt: now };
    });
    setDraftDirty(true);
  };

  const handleSavePatientChanges = async () => {
    if (!activePatientForEditing?.id) return;
    if (!draftDirty) return;

    const roomConflict = isActiveHospitalizedPatient(activePatientForEditing)
      ? findActiveRoomConflict(patients, activePatientForEditing.demographics?.habitacion, activePatientForEditing.id)
      : null;
    if (roomConflict) {
      openLockModal(
        'Habitación ocupada',
        `No se puede guardar: la habitación ${activePatientForEditing.demographics?.habitacion || '-'} ya está asignada al paciente activo ${roomConflict.demographics?.nombre || 'sin nombre'}.`,
        'error',
      );
      return;
    }

    const lockResult = await acquirePatientLock(activePatientForEditing.id);
    if (!lockResult?.ok) {
      const blockingName = lockResult?.lockedByUserName || 'otro usuario';
      openLockModal('No se puede guardar', `No se puede guardar porque ${blockingName} está editando este paciente.`);
      return;
    }

    const patientToSave = { ...activePatientForEditing, lastChangedAt: Date.now() };
    setIsSavingDraft(true);
    setDraftPatient(patientToSave);

    skipNextPatientsSyncRef.current = true;
    setPatients((prev) => prev.map((p) => (p.id === patientToSave.id ? patientToSave : p)));

    const saved = await syncPatientNow(patientToSave);
    if (saved) {
      setDraftDirty(false);
      setSyncError('');
    }
    setIsSavingDraft(false);
  };

  const createNewPatientFromModal = (initialData) => {
    const roomConflict = findActiveRoomConflict(patients, initialData?.habitacion);
    if (roomConflict) {
      openLockModal(
        'Habitación ocupada',
        `No se puede crear el paciente: la habitación ${initialData?.habitacion || '-'} ya está asignada al paciente activo ${roomConflict.demographics?.nombre || 'sin nombre'}.`,
        'error',
      );
      return;
    }

    const newId = Date.now().toString();
    const now = Date.now();
    const currentDateLocal = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0,16);
    const ingresoFinal = initialData.fechaIngreso || currentDateLocal;
    const internalIdFinal = (initialData.identificadorInterno || '').trim() || generateInternalIdentifier(patients, ingresoFinal);
    
    const newPatient = {
      id: newId,
      pacienteBaseId: newId, 
      deleted: false,
      lastChangedAt: now,
      lastReviewedAt: now,
      activeUsers: [currentUser.id], // Ingresamos directamente como activos
      activeUsersLastSeen: { [currentUser.id]: now },
      demographics: { identificadorInterno: internalIdFinal, numeroPaciente: initialData.numeroPaciente || '', numeroEpisodio: '', habitacion: initialData.habitacion || '', nombre: initialData.nombre || '', fechaNacimiento: initialData.fechaNacimiento || '', peso: '', altura: '', ingreso: ingresoFinal, egreso: '', tipoPaciente: '', especialidad: '', embarazada: '', semanasGestacion: '', toxicomania: '', alcoholismo: '', comorbilidades: '', comorbilidadesTipo: '', observacionesGenerales: '' },
      labs: {}, interview: {}, conciliacion: { ingresoNA: false, egresoNA: false, ingresoNAMotivo: '', egresoNAMotivo: '', ingreso: [], egreso: [], transicionesArea: [], transicionAreaValidada: false, transicionMedico: false, transicionAreaNA: false, transicionMedicoNA: false }, 
      perfilFarmacoMeta: { evaluadoPrevioPrimeraDosis: false },
      perfilFarmaco: [], solucionesIV: [], prms: [], interacciones: [], ram: [], microbiologia: [], reminders: []
    };
    setPatients([...patients, newPatient]);
    setActivePatientId(newId);
    setActiveTab('demographics');
    setShowNewPatientModal(false);
  };

  const handleCreateReingresoFromModal = (basePatientMatch, initialData = {}) => {
    const roomConflict = findActiveRoomConflict(patients, initialData?.habitacion);
    if (roomConflict) {
      openLockModal(
        'Habitación ocupada',
        `No se puede crear el reingreso: la habitación ${initialData?.habitacion || '-'} ya está asignada al paciente activo ${roomConflict.demographics?.nombre || 'sin nombre'}.`,
        'error',
      );
      return;
    }

    const baseId = basePatientMatch.pacienteBaseId || basePatientMatch.id;
    const newId = Date.now().toString();
    const now = Date.now();
    const currentDateLocal = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0,16);
    const ingresoFinal = initialData.fechaIngreso || currentDateLocal;
    const internalIdFinal = (initialData.identificadorInterno || '').trim() || generateInternalIdentifier(patients, ingresoFinal);

    const newReingreso = {
        id: newId,
        pacienteBaseId: baseId,
        deleted: false,
      lastChangedAt: now,
      lastReviewedAt: now,
        activeUsers: [currentUser.id],
        activeUsersLastSeen: { [currentUser.id]: now },
        demographics: {
            ...basePatientMatch.demographics,
            identificadorInterno: internalIdFinal,
            numeroEpisodio: '', 
            ingreso: ingresoFinal,
            egreso: '',
            motivoIngreso: '',
            diagnosticoPrincipal: '',
            habitacion: initialData.habitacion || '',
            medico: '',
            tipoPaciente: '',
            especialidad: '',
          embarazada: '',
          semanasGestacion: '',
            observacionesGenerales: ''
        },
        labs: {}, interview: {}, conciliacion: { ingresoNA: false, egresoNA: false, ingresoNAMotivo: '', egresoNAMotivo: '', ingreso: [], egreso: [], transicionesArea: [], transicionAreaValidada: false, transicionMedico: false, transicionAreaNA: false, transicionMedicoNA: false },
        perfilFarmacoMeta: { evaluadoPrevioPrimeraDosis: false },
        perfilFarmaco: [], solucionesIV: [], prms: [], interacciones: [], ram: [], microbiologia: [], reminders: []
    };
    setPatients([...patients, newReingreso]);
    setActivePatientId(newReingreso.id);
    setActiveTab('demographics');
    setShowNewPatientModal(false);
  };

  const handleCreateReingreso = async () => {
    if (!activePatientForEditing) return;
    const canExit = await attemptExitPatient();
    if (!canExit) return;
    handleCreateReingresoFromModal(activePatientForEditing);
  };

  const moveToTrash = async (id) => {
    if (activePatientId === id) {
      const canExit = await attemptExitPatient();
      if (!canExit) return;
    }
    setPatients((prev) => prev.map((p) => (p.id === id ? { ...p, deleted: true } : p)));
  };
  const restorePatient = (id) => setPatients(prev => prev.map(p => p.id === id ? { ...p, deleted: false } : p));

  const lockModalNode = <LockWarningModal lockModal={lockModal} onClose={closeLockModal} />;

  const confirmModalNode = (
    <ConfirmWarningModal confirmModal={confirmModal} onResolve={resolveConfirmationModal} />
  );
  
  // Eliminación permanente segura 
  const permanentlyDelete = async (id) => { 
     const pToDelete = patients.find(p => p.id === id);
     const baseId = pToDelete?.pacienteBaseId || pToDelete?.id;

     if (activePatientId === id) {
       const canExit = await attemptExitPatient();
       if (!canExit) return;
     }

     setPatients(prev => prev.filter(p => p.id !== id));
     
     if (activePatientId === id) {
       const others = patients.filter(p => p.id !== id && !p.deleted && (p.pacienteBaseId || p.id) === baseId);
       if (others.length > 0) handleEnterPatient(others[0].id);
     }
  };

  if (!activePatientId) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col relative overflow-x-hidden">
        <TopBar
          currentUser={currentUser}
          onLogout={handleLogoutWithUnlock}
          onAdmin={() => setViewingAdmin(true)}
          notifications={notifications}
          onNotificationOpen={handleNotificationOpen}
          onNotificationMarkReviewed={handleNotificationMarkReviewed}
        />
        {syncError && <div className="mx-8 mt-4 bg-amber-50 border border-amber-200 text-amber-700 px-3 py-2 rounded text-sm">{syncError}</div>}
        <Dashboard 
           patients={patients} 
            dilutionsTable={dilutionsTable}
            onDilutionsTableChange={handleDilutionsTableChange}
          reminders={activePatientReminders}
          onCreateReminder={createReminderForPatient}
           onSelect={handleEnterPatient} 
           onCreate={() => {
             setShowNewPatientModal(true);
           }} 
           onDelete={moveToTrash} 
           onRestore={restorePatient} 
           onHardDelete={permanentlyDelete} 
           currentUser={currentUser} 
           users={users} 
            helpers={{
             calculateAge,
             calculateDaysOfUse,
             calculateCrCl,
             getTfgColorClass,
             listOtherActiveUsers,
             formatExcelDate,
             exportToCSV,
            }}
            constants={{ ADULTO_MAYOR_EDAD, CATEGORIAS_PRM, MESES, ANIOS }}
        />
        <AppFooter version={APP_VERSION} />
        
        {/* MODAL NUEVO PACIENTE */}
        {showNewPatientModal && (
           <NewPatientModal 
              patients={patients} 
              onClose={() => {
               setShowNewPatientModal(false);
              }} 
              onCreateNew={createNewPatientFromModal}
              onCreateReingreso={handleCreateReingresoFromModal}
              formatExcelDate={formatExcelDate}
           />
        )}
          {lockModalNode}
          {confirmModalNode}
      </div>
    );
  }

  if (!activePatientForEditing) return null;

  const { years: edad, group: grupoEtario } = calculateAge(activePatientForEditing.demographics.fechaNacimiento);
  const handlePrint = () => window.print();

  // Buscar historial de episodios para el sidebar
  const baseId = activePatientForEditing.pacienteBaseId || activePatientForEditing.id;
  const episodiosDelPaciente = patients.filter(p => !p.deleted && (p.pacienteBaseId || p.id) === baseId).sort((a,b) => new Date(a.demographics.ingreso) - new Date(b.demographics.ingreso));
  const handleChangeActiveTab = (nextTab) => {
    setActiveTab(nextTab);
    setIsPatientSidebarOpen(false);
  };
  const handleSelectEpisode = (episodeId) => {
    handleEnterPatient(episodeId, activeTab);
    setIsPatientSidebarOpen(false);
  };

  const handleExportPatientCSV = () => {
    const p = activePatientForEditing;
    const edadInfo = calculateAge(p.demographics.fechaNacimiento);
    const grupoEtario = Number(edadInfo.years) < 18
      ? 'Niño'
      : (Number(edadInfo.years) >= ADULTO_MAYOR_EDAD ? 'Adulto mayor' : 'Adulto');
    const rows = [
      ["REPORTE INDIVIDUAL DE PACIENTE", p.demographics.nombre],
      ["ID Interno (FV)", p.demographics.identificadorInterno, "No. Paciente", p.demographics.numeroPaciente, "No. Episodio", p.demographics.numeroEpisodio],
      ["Habitación", p.demographics.habitacion, "Edad", edad, "Grupo Etario", grupoEtario, "Género", p.demographics.genero],
      ["Diagnóstico", p.demographics.diagnosticoPrincipal, "Ingreso", formatExcelDate(p.demographics.ingreso), "Egreso", formatExcelDate(p.demographics.egreso)],
      ["Tipo de Paciente", p.demographics.tipoPaciente, "Especialidad", p.demographics.especialidad],
      ["Observaciones", p.demographics.observacionesGenerales],
      [],
      ["ESTADO DE CONCILIACIÓN"],
      ["Ingreso", p.conciliacion.ingresoNA ? "No Aplica" : (p.conciliacion.ingreso.length > 0 ? "Realizada" : "Pendiente")],
      ["Transición (Área)", p.conciliacion.transicionAreaNA ? "No Aplica" : (p.conciliacion.transicionesArea?.length > 0 ? "Realizada" : "Pendiente")],
      ["Transición (Médico)", p.conciliacion.transicionMedicoNA ? "No Aplica" : (p.conciliacion.transicionMedico ? "Realizada" : "Pendiente")],
      ["Egreso", p.conciliacion.egresoNA ? "No Aplica" : (p.conciliacion.egreso.length > 0 ? "Realizada" : "Pendiente")],
      [],
      ["PERFIL FARMACOTERAPÉUTICO (Validación Previa 1ra Dosis: " + (p.perfilFarmacoMeta?.evaluadoPrevioPrimeraDosis ? 'SI' : 'NO') + ")"],
      ["Categoría", "Principio", "Marca Comercial", "Dosis", "Vía", "Frecuencia", "Volumen (mL)", "Tiempo (hr)", "Velocidad (mL/hr)", "F. Inicio", "Días", "Idoneidad", "Estado", "F. Suspensión"]
    ];
    p.perfilFarmaco.forEach(f => {
      const d = calculateDaysOfUse(f.fechaInicio, f.estado === 'Suspendido' ? f.fechaSuspension : p.demographics.egreso);
      rows.push([f.categoria, f.principio, f.marcaComercial || '', f.dosis, f.via, f.frecuencia, f.volumen || '', f.tiempo || '', f.velocidad || '', f.fechaInicio, d, f.idoneidad, f.estado, f.fechaSuspension]);
    });

    rows.push([], ["SOLUCIONES INTRAVENOSAS"]);
    rows.push(["Solución", "Volumen (mL)", "Tiempo (hr)", "Velocidad (mL/hr)", "Frecuencia", "F. Inicio", "Días", "Estado", "F. Suspensión"]);
    (p.solucionesIV || []).forEach(s => {
      const d = calculateDaysOfUse(s.fechaInicio, s.estado === 'Suspendido' ? s.fechaSuspension : p.demographics.egreso);
      rows.push([s.solucion, s.volumen, s.tiempo, s.velocidad, s.frecuencia, s.fechaInicio, d, s.estado, s.fechaSuspension]);
    });
    
    rows.push([], ["PROBLEMAS RELACIONADOS CON MEDICAMENTOS (PRM)"]);
    rows.push(["Fecha", "Área", "Medicamento", "Vía", "Grupo", "Descripción PRM", "Categoría", "Análisis", "Causa Raíz", "Intervención", "Desc. Intervención", "Aceptación", "Resolución", "Gravedad", "Reportado Calidad"]);
    (p.prms || []).forEach(i => rows.push([i.fecha, i.area, i.medicamento, i.via, i.grupo, i.descripcion, i.categoria, i.analisis, i.causaRaiz, i.intervencion, i.descIntervencion, i.aceptacion, i.resolucion, i.gravedad, i.reportadoCalidad]));

    rows.push([], ["INTERACCIONES MEDICAMENTOSAS"]);
    rows.push(["Fecha", "Medicamentos Involucrados", "Grado de Interacción", "Consecuencias"]);
    (p.interacciones || []).forEach(i => rows.push([i.fecha, i.medicamentos, i.grado, i.consecuencia]));

    rows.push([], ["MICROBIOLOGÍA"]);
    rows.push(["Fecha", "Muestra", "Sitio", "Microorganismo", "Sensibles", "Resistentes"]);
    p.microbiologia.forEach(m => rows.push([m.fechaMuestra, m.tipoMuestra, m.sitioCultivo, m.microorganismo, m.sensibles, m.resistentes]));

    rows.push([], ["REACCIONES ADVERSAS (RAM)"]);
    rows.push(["Fecha", "Medicamento", "Severidad", "Que pasó", "Intervención"]);
    p.ram.forEach(r => rows.push([r.fecha, r.medicamento, r.severidad, r.quePaso, r.queSeHizo]));

    exportToCSV(`Paciente_${p.demographics.nombre.replace(/\s+/g, '_')}.csv`, rows);
  };

  const diasEstancia = calculateDaysOfUse(activePatientForEditing.demographics.ingreso, activePatientForEditing.demographics.egreso);
  const alergiasRaw = String(activePatientForEditing.demographics.alergias || '').trim();
  const hasAlergiaResumen = alergiasRaw !== '' && !['no', 'ninguna', 'ninguno', 'na', 'n/a'].includes(alergiasRaw.toLowerCase());

  return (
    <div className="h-screen overflow-hidden bg-slate-50 flex flex-col font-sans text-slate-800 print:bg-white print:h-auto print:overflow-visible relative">
      <TopBar
        currentUser={currentUser}
        onLogout={handleLogoutWithUnlock}
        onAdmin={() => setViewingAdmin(true)}
        isPatientView={true}
        onBack={handleExitPatient}
        onSaveChanges={handleSavePatientChanges}
        saveDisabled={lockedByOtherUser || !draftDirty || isSavingDraft}
        saveLoading={isSavingDraft}
        showSidebarToggle={true}
        onToggleSidebar={() => setIsPatientSidebarOpen((prev) => !prev)}
        notifications={notifications}
        onNotificationOpen={handleNotificationOpen}
        onNotificationMarkReviewed={handleNotificationMarkReviewed}
      />
      {syncError && <div className="mx-6 mt-3 bg-amber-50 border border-amber-200 text-amber-700 px-3 py-2 rounded text-sm print:hidden">{syncError}</div>}
      
      <div className="relative flex-1 min-h-0 flex overflow-hidden">
        <div
          className={`absolute inset-0 z-30 bg-slate-900/45 transition-opacity duration-200 xl:hidden print:hidden ${isPatientSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
          onClick={() => setIsPatientSidebarOpen(false)}
          aria-hidden="true"
        />

        <aside className={`absolute inset-y-0 left-0 z-40 w-[min(22rem,88vw)] transform transition-transform duration-200 ease-out xl:hidden print:hidden ${isPatientSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <PatientSidebar
            activePatient={activePatientForEditing}
            activeTab={activeTab}
            onTabChange={handleChangeActiveTab}
            edad={edad}
            grupoEtario={grupoEtario}
            diasEstancia={diasEstancia}
            episodiosDelPaciente={episodiosDelPaciente}
            currentUser={currentUser}
            onCreateReingreso={handleCreateReingreso}
            onSelectEpisode={handleSelectEpisode}
            onDeleteEpisode={permanentlyDelete}
            onSaveChanges={handleSavePatientChanges}
            saveDisabled={lockedByOtherUser || !draftDirty || isSavingDraft}
            saveLoading={isSavingDraft}
            onExportCsv={handleExportPatientCSV}
            onPrint={handlePrint}
            formatDate={formatExcelDate}
            presenceTtlMs={PRESENCE_TTL_MS}
            className="h-full border-r border-slate-200 shadow-2xl"
            showCloseButton={true}
            onRequestClose={() => setIsPatientSidebarOpen(false)}
          />
        </aside>

        <div className="hidden xl:flex xl:w-72 xl:shrink-0">
          <PatientSidebar
            activePatient={activePatientForEditing}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            edad={edad}
            grupoEtario={grupoEtario}
            diasEstancia={diasEstancia}
            episodiosDelPaciente={episodiosDelPaciente}
            currentUser={currentUser}
            onCreateReingreso={handleCreateReingreso}
            onSelectEpisode={handleSelectEpisode}
            onDeleteEpisode={permanentlyDelete}
            onSaveChanges={handleSavePatientChanges}
            saveDisabled={lockedByOtherUser || !draftDirty || isSavingDraft}
            saveLoading={isSavingDraft}
            onExportCsv={handleExportPatientCSV}
            onPrint={handlePrint}
            formatDate={formatExcelDate}
            presenceTtlMs={PRESENCE_TTL_MS}
            className="h-full"
          />
        </div>

        {/* Área Principal Interactiva */}
        <div className="flex-1 min-h-0 overflow-auto p-2 sm:p-4 lg:p-6 xl:p-8 bg-slate-100 print:hidden">
          <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6 relative">
            
            {/* INDICADOR DE BLOQUEO DE EDICIÓN */}
            {otherActiveUserIds.length > 0 ? (
              <div className="relative mb-4 lg:mb-0 lg:absolute lg:top-0 lg:right-0 bg-amber-100 text-amber-800 border border-amber-200 lg:border-l lg:border-b lg:border-t-0 lg:border-r-0 px-4 py-1.5 text-xs font-bold rounded-md lg:rounded-bl-xl lg:rounded-tr-xl flex items-center shadow-sm">
                  <div className="relative flex h-3 w-3 mr-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                  </div>
                  Bloqueado: editando <span className="ml-1 text-amber-900 underline">{otherActiveNames}</span>
               </div>
            ) : (
              <div className="relative mb-4 lg:mb-0 lg:absolute lg:top-0 lg:right-0 bg-green-50 text-green-700 border border-green-100 lg:border-l lg:border-b lg:border-t-0 lg:border-r-0 px-3 py-1 text-xs font-bold rounded-md lg:rounded-bl-xl lg:rounded-tr-xl flex items-center">
                  <CheckCircle className="w-3 h-3 mr-1" /> Edición exclusiva activa.
               </div>
            )}

            {activeTab === 'pharmacotherapy' && (
              <section className="xl:hidden mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="h-11 w-11 shrink-0 rounded-full border border-slate-200 bg-slate-100 flex items-center justify-center">
                    <Users className="w-5 h-5 text-slate-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xl font-bold text-slate-900 leading-tight">
                      Cama {activePatientForEditing.demographics.habitacion || '-'} - {activePatientForEditing.demographics.nombre || 'Sin nombre'}
                    </h3>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-700">
                      <span>{edad ? `${edad} años` : 'Edad N/D'}</span>
                      <span className="text-slate-300">|</span>
                      <span>{activePatientForEditing.demographics.peso ? `${activePatientForEditing.demographics.peso} kg` : 'Peso N/D'}</span>
                      {hasAlergiaResumen && (
                        <span className="inline-flex items-center rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-red-700 font-medium">
                          <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                          Alergia: {alergiasRaw}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'demographics' && <DemographicsTab patient={activePatientForEditing} updatePatient={updatePatient} allPatients={patients} />}
            {activeTab === 'conciliation' && <ConciliationTab patient={activePatientForEditing} updatePatient={updatePatient} />}
            {activeTab === 'pharmacotherapy' && <PharmacotherapyTab patient={activePatientForEditing} sourcePatient={activePatient} updatePatient={updatePatient} dilutionsTable={dilutionsTable} />}
            {activeTab === 'prm' && <PrmTab patient={activePatientForEditing} updatePatient={updatePatient} />}
            {activeTab === 'labs' && <LabsTab patient={activePatientForEditing} updatePatient={updatePatient} />}
            {activeTab === 'micro' && <MicrobiologyTab patient={activePatientForEditing} updatePatient={updatePatient} />}
            {activeTab === 'ram' && <RamTab patient={activePatientForEditing} updatePatient={updatePatient} />}
          </div>
        </div>

        {/* --- VISTA DE IMPRESIÓN (solo campos con datos) --- */}
        <div className="hidden print:block">
          <PrintPatientReport
            patient={activePatientForEditing}
            calculateAge={calculateAge}
            calculateDaysOfUse={calculateDaysOfUse}
            calculateCrCl={calculateCrCl}
            preguntasEntrevista={PREGUNTAS_ENTREVISTA}
            formatExcelDate={formatExcelDate}
          />
        </div>
      </div>
      {lockModalNode}
      {confirmModalNode}
    </div>
  );
}
