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

// --- Constantes y Listas ---
const PRESENTACIONES = ["Amp", "Fam", "Fco", "Cap", "Tab", "Sup", "Susp", "SL", "Jer Prell", "Pch", "Ovu"];
const VIAS = ["IV", "IM", "VO", "SC", "Rectal", "Inh", "Tópica", "Oftálmica", "Ótica", "Vaginal", "SNG", "Nasal", "SL"];
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
const UNSAVED_CHANGES_BEFOREUNLOAD_MSG = 'Hay cambios pendientes. Si recargas la pagina, se perderan los datos no guardados.';
const SYNC_RETRY_MS = 3000;
const APP_VERSION = 'FARMA 1.3';
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
  if (inches < 60) return '-'; 
  const base = genero === 'Masculino' ? 50 : 45.5;
  return (base + 2.3 * (inches - 60)).toFixed(1);
};

const calculateAdjustedWeight = (peso, pesoIdeal) => {
  if (!peso || !pesoIdeal || pesoIdeal === '-') return '';
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

// ==========================================
// COMPONENTE PRINCIPAL (APP)
// ==========================================
export default function App() {
  const [users, setUsers] = useState(initialUsers);
  const [currentUser, setCurrentUser] = useState(() => getStoredSessionUser());

  const [patients, setPatients] = useState(initialPatients);
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
  const skipNextUsersSyncRef = useRef(false);
  const skipNextPatientsSyncRef = useRef(false);
  const remoteRefreshTimerRef = useRef(null);
  const enteringPatientRef = useRef(false);
  const previousPatientsRef = useRef(initialPatients);
  const latestPatientsRef = useRef(initialPatients);
  const pendingPatientSyncRef = useRef(getStoredPendingPatientSync());
  const confirmResolverRef = useRef(null);
  const allowImmediateReloadRef = useRef(false);
  const [notificationNow, setNotificationNow] = useState(Date.now());

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
      const selectedUpdated = {
        ...touchPresenceInPatient(p, currentUser.id, now),
        lastReviewedAt: now,
      };

      setPatients((prev) => {
        let changed = false;
        const next = prev.map((patient) => {
          let updated = patient;

          if ((patient.activeUsers || []).includes(currentUser.id) && patient.id !== id) {
            updated = removePresenceFromPatient(updated, currentUser.id);
          }

          if (patient.id === id) {
            updated = selectedUpdated;
          }

          if (updated !== patient) changed = true;
          return updated;
        });

        return changed ? next : prev;
      });

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
        if (wasSeenForCurrentOrHigherDays) return;

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
    });

    const priority = { critical: 2, warning: 1 };
    return result.sort((a, b) => {
      const severityDiff = (priority[b.severity] || 0) - (priority[a.severity] || 0);
      if (severityDiff !== 0) return severityDiff;
      return (b.sortValue || 0) - (a.sortValue || 0);
    });
  }, [patients, notificationNow]);

  const handleNotificationOpen = (notification) => {
    if (!notification?.patientId) return;
    const targetTab = notification.type === 'antibiotico' ? 'pharmacotherapy' : 'demographics';
    handleEnterPatient(notification.patientId, targetTab);
  };

  const handleNotificationMarkReviewed = (notification) => {
    if (!notification?.patientId) return;

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

  if (!currentUser) return <LoginScreen users={users} onLogin={setCurrentUser} />;
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
      demographics: { identificadorInterno: internalIdFinal, numeroPaciente: initialData.numeroPaciente || '', numeroEpisodio: '', nombre: initialData.nombre || '', fechaNacimiento: initialData.fechaNacimiento || '', peso: '', altura: '', ingreso: ingresoFinal, egreso: '', tipoPaciente: '', especialidad: '', embarazada: '', semanasGestacion: '', toxicomania: '', alcoholismo: '', comorbilidades: '', comorbilidadesTipo: '', observacionesGenerales: '' },
      labs: {}, interview: {}, conciliacion: { ingresoNA: false, egresoNA: false, ingreso: [], egreso: [], transicionesArea: [], transicionMedico: false, transicionAreaNA: false, transicionMedicoNA: false }, 
      perfilFarmacoMeta: { evaluadoPrevioPrimeraDosis: false },
      perfilFarmaco: [], solucionesIV: [], prms: [], interacciones: [], ram: [], microbiologia: []
    };
    setPatients([...patients, newPatient]);
    setActivePatientId(newId);
    setActiveTab('demographics');
    setShowNewPatientModal(false);
  };

  const handleCreateReingresoFromModal = (basePatientMatch, initialData = {}) => {
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
            habitacion: '',
            medico: '',
            tipoPaciente: '',
            especialidad: '',
          embarazada: '',
          semanasGestacion: '',
            observacionesGenerales: ''
        },
        labs: {}, interview: {}, conciliacion: { ingresoNA: false, egresoNA: false, ingreso: [], egreso: [], transicionesArea: [], transicionMedico: false, transicionAreaNA: false, transicionMedicoNA: false },
        perfilFarmacoMeta: { evaluadoPrevioPrimeraDosis: false },
        perfilFarmaco: [], solucionesIV: [], prms: [], interacciones: [], ram: [], microbiologia: []
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

  const lockModalNode = lockModal.open ? (
    <div className="fixed inset-0 z-[90] bg-slate-900/65 backdrop-blur-[1px] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-r from-amber-50 to-rose-50 border-b border-slate-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center border border-amber-200">
            {lockModal.variant === 'error' ? <AlertTriangle className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">{lockModal.title || 'Paciente bloqueado'}</h3>
            <p className="text-xs text-slate-500">Control de edición exclusiva</p>
          </div>
        </div>

        <div className="px-5 py-4">
          <p className="text-sm text-slate-700 leading-relaxed">{lockModal.message || 'Otro usuario está editando este paciente.'}</p>
        </div>

        <div className="px-5 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={closeLockModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-semibold transition-colors"
          >
            <CheckCircle className="w-4 h-4" /> Entendido
          </button>
        </div>
      </div>
    </div>
  ) : null;

  const confirmModalNode = confirmModal.open ? (
    <div className="fixed inset-0 z-[95] bg-slate-900/70 backdrop-blur-[1px] flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-slate-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center border border-amber-200">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">{confirmModal.title || 'Confirmar acción'}</h3>
            <p className="text-xs text-slate-500">Revisa antes de continuar</p>
          </div>
        </div>

        <div className="px-5 py-4">
          <p className="text-sm text-slate-700 leading-relaxed">{confirmModal.message || '¿Deseas continuar?'}</p>
        </div>

        <div className="px-5 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row gap-2 sm:justify-end">
          <button
            onClick={() => resolveConfirmationModal(false)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 font-medium transition-colors"
          >
            <X className="w-4 h-4" /> {confirmModal.cancelText || 'Cancelar'}
          </button>
          {confirmModal.extraText ? (
            <button
              onClick={() => resolveConfirmationModal('save-exit')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-semibold transition-colors"
            >
              <CheckCircle className="w-4 h-4" /> {confirmModal.extraText}
            </button>
          ) : null}
          <button
            onClick={() => resolveConfirmationModal(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 font-semibold transition-colors"
          >
            <AlertTriangle className="w-4 h-4" /> {confirmModal.confirmText || 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  ) : null;
  
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
           onSelect={handleEnterPatient} 
           onCreate={() => setShowNewPatientModal(true)} 
           onDelete={moveToTrash} 
           onRestore={restorePatient} 
           onHardDelete={permanentlyDelete} 
           currentUser={currentUser} 
           users={users} 
        />
        <AppFooter version={APP_VERSION} />
        
        {/* MODAL NUEVO PACIENTE */}
        {showNewPatientModal && (
           <NewPatientModal 
              patients={patients} 
              onClose={() => setShowNewPatientModal(false)} 
              onCreateNew={createNewPatientFromModal} 
              onCreateReingreso={handleCreateReingresoFromModal} 
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
    const rows = [
      ["REPORTE INDIVIDUAL DE PACIENTE", p.demographics.nombre],
      ["ID Interno (FV)", p.demographics.identificadorInterno, "No. Paciente", p.demographics.numeroPaciente, "No. Episodio", p.demographics.numeroEpisodio],
      ["Habitación", p.demographics.habitacion, "Edad", edad, "Género", p.demographics.genero],
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

            {activeTab === 'demographics' && <DemographicsTab patient={activePatientForEditing} updatePatient={updatePatient} allPatients={patients} />}
            {activeTab === 'conciliation' && <ConciliationTab patient={activePatientForEditing} updatePatient={updatePatient} />}
            {activeTab === 'pharmacotherapy' && <PharmacotherapyTab patient={activePatientForEditing} sourcePatient={activePatient} updatePatient={updatePatient} />}
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

function LoginScreen({ users, onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = await apiFetch('/api/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      onLogin(payload.user);
      return;
    } catch (_err) {
      const fallbackUser = users.find(u => u.username === username && u.password === password);
      if (fallbackUser) {
        onLogin(fallbackUser);
        return;
      }
      setError('Credenciales incorrectas o usuario no existe.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md rounded-2xl border border-white/15 bg-white/95 shadow-2xl p-5 sm:p-8">
        <div className="flex justify-center mb-5">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-blue-700 text-sm font-semibold">
            <ShieldCheck className="w-4 h-4" /> Versión {APP_VERSION}
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

        <p className="text-center mt-5 text-xs text-slate-500">Sistema de gestión farmacoterapéutica | {APP_VERSION}</p>
      </div>
    </div>
  );
}


function AdminPanel({ users, setUsers, onClose, currentUser, onLogout }) {
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

// Helper para visualización en Dashboard Calidad
const StatusBadge = ({ done, isNA }) => {
  if (isNA) return <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded text-xs font-bold border border-slate-200">N/A</span>;
  if (done) return <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold flex items-center justify-center w-max mx-auto border border-green-200"><CheckCircle className="w-3 h-3 mr-1"/> Realizada</span>;
  return <span className="px-2 py-1 bg-red-50 text-red-600 rounded text-xs font-bold flex items-center justify-center w-max mx-auto border border-red-200"><XCircle className="w-3 h-3 mr-1"/> Pendiente</span>;
}

function Dashboard({ patients, onSelect, onCreate, onDelete, onRestore, onHardDelete, currentUser, users }) {
  const [dashboardTab, setDashboardTab] = useState('pacientes'); 
  const [view, setView] = useState('activos'); 
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [patientColumnFilter, setPatientColumnFilter] = useState({ key: '', direction: '' });

  // PRM Filters
  const [filterPrmCategory, setFilterPrmCategory] = useState('');
  const [filterPrmGravity, setFilterPrmGravity] = useState('');

  const getRoomNumber = (habitacion = '') => {
    const match = String(habitacion || '').match(/\d+/);
    return match ? Number(match[0]) : null;
  };

  // Lógica de Filtros y Vistas General
  const filteredPatients = patients.filter(p => {
    if (view === 'papelera') {
      if (!p.deleted) return false;
    } else {
      if (p.deleted) return false;
      if (view === 'activos' && p.demographics.egreso) return false;
      if (view === 'egresados' && !p.demographics.egreso) return false;
    }

    const dateToFilter = p.demographics.ingreso;
    if (filterMonth || filterYear) {
      if (!dateToFilter) return false;
      const [y, m] = dateToFilter.split('-');
      if (filterYear && y !== filterYear) return false;
      if (filterMonth && m !== filterMonth) return false;
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        (p.demographics.nombre && p.demographics.nombre.toLowerCase().includes(term)) ||
        (p.demographics.habitacion && p.demographics.habitacion.toLowerCase().includes(term))
      );
    }
    return true;
  });

  const getPatientColumnValue = (patient, key) => {
    switch (key) {
      case 'ingreso':
        return patient.demographics.ingreso ? new Date(`${patient.demographics.ingreso.slice(0, 10)}T00:00:00`).getTime() : 0;
      case 'paciente':
        return patient.demographics.nombre || '';
      case 'ubicacion':
        return getRoomNumber(patient.demographics.habitacion) ?? (patient.demographics.habitacion || '');
      case 'diagnostico':
        return patient.demographics.diagnosticoPrincipal || '';
      case 'estancia':
        return calculateDaysOfUse(patient.demographics.ingreso, patient.demographics.egreso);
      case 'medsActivos':
        return (patient.perfilFarmaco || []).filter(f => f.estado === 'Activo').length;
      default:
        return '';
    }
  };

  const togglePatientColumnFilter = (columnKey) => {
    setPatientColumnFilter(prev => {
      if (prev.key !== columnKey) return { key: columnKey, direction: 'asc' };
      return { key: columnKey, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
    });
  };

  const getPatientColumnIndicator = (columnKey) => {
    if (patientColumnFilter.key !== columnKey) return '↕';
    return patientColumnFilter.direction === 'asc' ? '↑' : '↓';
  };

  const patientRows = useMemo(() => {
    const rows = [...filteredPatients];
    const { key, direction } = patientColumnFilter;
    if (!key || !direction) return rows;

    const factor = direction === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      const aValue = getPatientColumnValue(a, key);
      const bValue = getPatientColumnValue(b, key);

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return (aValue - bValue) * factor;
      }

      return String(aValue).localeCompare(String(bValue), 'es', { sensitivity: 'base', numeric: true }) * factor;
    });

    return rows;
  }, [filteredPatients, patientColumnFilter]);

  // Métricas de Pacientes
  const activeCount = patients.filter(p => !p.deleted && !p.demographics.egreso).length;
  const dischargedCount = patients.filter(p => !p.deleted && p.demographics.egreso).length;
  const atbCount = patients.filter(p => !p.deleted && !p.demographics.egreso && p.perfilFarmaco.some(f => f.categoria === 'Antibiótico' && f.estado === 'Activo')).length;
  const altoRiesgoCount = patients.filter(p => !p.deleted && !p.demographics.egreso && p.perfilFarmaco.some(f => f.categoria === 'Alto Riesgo' && f.estado === 'Activo')).length;

  // Lógica para Vista de PRM
  let allPrms = [];
  if (dashboardTab === 'prms') {
    filteredPatients.forEach(p => {
      if(p.prms) {
        p.prms.forEach(prm => {
           allPrms.push({
             ...prm,
             patientId: p.id,
             patientName: p.demographics.nombre,
             patientExp: p.demographics.numeroPaciente,
             patientFv: p.demographics.identificadorInterno
           });
        });
      }
    });
    if (filterPrmCategory) allPrms = allPrms.filter(p => p.categoria === filterPrmCategory);
    if (filterPrmGravity) allPrms = allPrms.filter(p => p.gravedad === filterPrmGravity);
    allPrms.sort((a,b) => new Date(b.fecha) - new Date(a.fecha));
  }

  // Lógica para Vista PROA
  let allMicros = [];
  if (dashboardTab === 'proa') {
     filteredPatients.forEach(p => {
        if(p.microbiologia) {
           p.microbiologia.forEach(m => {
              allMicros.push({
                 ...m,
                 patientId: p.id,
                 patientName: p.demographics.nombre,
                 patientExp: p.demographics.numeroPaciente,
                 patientFv: p.demographics.identificadorInterno,
                 diagnostico: p.demographics.diagnosticoPrincipal || 'N/A',
                 tipoPaciente: p.demographics.tipoPaciente || 'N/A',
                 atbActivos: p.perfilFarmaco.filter(f => f.categoria === 'Antibiótico' && f.estado === 'Activo').map(f => f.principio).join(', ') || 'Ninguno',
                 maxDiasATB: Math.max(0, ...p.perfilFarmaco.filter(f => f.categoria === 'Antibiótico' && f.estado === 'Activo').map(atb => calculateDaysOfUse(atb.fechaInicio, p.demographics.egreso)))
              });
           });
        }
     });
     allMicros.sort((a,b) => new Date(b.fechaMuestra) - new Date(a.fechaMuestra));
  }

  // Métricas para Dashboard de Calidad
  const totalPacientesCalidad = filteredPatients.length;
  const idoneidadCount = filteredPatients.filter(p => p.perfilFarmacoMeta?.evaluadoPrevioPrimeraDosis).length;
  const ingresoCount = filteredPatients.filter(p => p.conciliacion.ingresoNA || p.conciliacion.ingreso.length > 0).length;
  const egresoCount = filteredPatients.filter(p => p.conciliacion.egresoNA || p.conciliacion.egreso.length > 0).length;

  const handleExportGeneral = () => {
    const rows = [
      [
        "Identificador interno (FV)", "N° Expediente", "Habitación", "Nombre del paciente", "Fecha de nacimiento", 
        "Edad", "Genero", "Episodio", "Fecha de ingreso DD/MM/AA HH:MM", 
        "Fecha de egreso DD/MM/AA HH:MM", "Días internado", "Diagnostico", 
        "Motivo de ingreso / Procedimiento", "Tipo de paciente", "Medico tratante", 
        "Alergias", "Especialidad", "Observaciones Generales", "Idoneidad (1ra Dosis)", "Conc. Ingreso", "Conc. Cambio Área", 
        "Conc. Cambio Médico", "Conc. Egreso", "MAR", "Polifarmacia >5 med", "\"Antibiótico ¿Cuales?\"", "Cultivos"
      ]
    ];
    
    filteredPatients.forEach(p => {
      const { years } = calculateAge(p.demographics.fechaNacimiento);
      const estancia = calculateDaysOfUse(p.demographics.ingreso, p.demographics.egreso);
      
      const valIdoneidad = p.perfilFarmacoMeta?.evaluadoPrevioPrimeraDosis ? 'Sí' : 'No';
      const cIng = p.conciliacion.ingresoNA ? 'NA' : (p.conciliacion.ingreso.length > 0 ? 'Sí' : 'No');
      const cArea = p.conciliacion.transicionAreaNA ? 'NA' : (p.conciliacion.transicionesArea?.length > 0 ? 'Sí' : 'No');
      const cMedico = p.conciliacion.transicionMedicoNA ? 'NA' : (p.conciliacion.transicionMedico ? 'Sí' : 'No');
      const cEgr = p.conciliacion.egresoNA ? 'NA' : (p.conciliacion.egreso.length > 0 ? 'Sí' : 'No');
      
      const activos = p.perfilFarmaco.filter(f => f.estado === 'Activo');
      const poli = activos.length > 5 ? 'Sí' : 'No';
      
      const marActivos = p.perfilFarmaco.filter(f => f.categoria === 'Alto Riesgo');
      const marString = marActivos.length > 0 ? `Sí: ${marActivos.map(f=>f.principio).join(', ')}` : 'No';
      
      const atbActivos = p.perfilFarmaco.filter(f => f.categoria === 'Antibiótico');
      const atbString = atbActivos.length > 0 ? atbActivos.map(f=>f.principio).join(', ') : 'Ninguno';
      
      const aislamientos = p.microbiologia.map(m => m.microorganismo).filter(x => x).join(', ') || 'Ninguno';

      rows.push([
        p.demographics.identificadorInterno || p.id, p.demographics.numeroPaciente, p.demographics.habitacion, p.demographics.nombre, p.demographics.fechaNacimiento,
        years, p.demographics.genero, p.demographics.numeroEpisodio,
        formatExcelDate(p.demographics.ingreso), formatExcelDate(p.demographics.egreso),
        estancia, p.demographics.diagnosticoPrincipal, p.demographics.motivoIngreso,
        p.demographics.tipoPaciente, p.demographics.medico, p.demographics.alergias, p.demographics.especialidad, p.demographics.observacionesGenerales,
        valIdoneidad, cIng, cArea, cMedico, cEgr, marString, poli, atbString, aislamientos
      ]);
    });
    exportToCSV(`Base_Pacientes_${view}_${filterMonth||'Todo'}_${filterYear||'Todo'}.csv`, rows);
  };

  const handleExportPRMsAndInteractions = () => {
    const rows = [
      ["REPORTE GLOBAL DE PRMs E INTERACCIONES", `Filtros aplicados: Mes ${filterMonth || 'Todos'}, Año ${filterYear || 'Todos'}, Vista: ${view}`],
      [],
      ["--- PROBLEMAS RELACIONADOS CON MEDICAMENTOS (PRM) ---"],
      [
        "Fecha", "ID Interno (FV)", "N° Expediente", "Nombre Paciente", "Área", "Medicamento", "Vía", "Grupo", 
        "Descripción del PRM", "Categoría PRM", "Análisis categoría", "Causa Raíz", 
        "Intervención", "Descripción intervención", "Aceptación", "Resolución", "Gravedad", "Reportado a calidad"
      ]
    ];

    filteredPatients.forEach(p => {
      (p.prms || []).forEach(prm => {
        rows.push([
          prm.fecha, p.demographics.identificadorInterno, p.demographics.numeroPaciente, p.demographics.nombre, prm.area, prm.medicamento, prm.via, prm.grupo,
          prm.descripcion, prm.categoria, prm.analisis, prm.causaRaiz,
          prm.intervencion, prm.descIntervencion, prm.aceptacion, prm.resolucion, prm.gravedad, prm.reportadoCalidad
        ]);
      });
    });

    rows.push([], [], ["--- INTERACCIONES MEDICAMENTOSAS ---"]);
    rows.push(["Fecha", "ID Interno (FV)", "N° Expediente", "Nombre Paciente", "Medicamentos Involucrados", "Grado de Interacción", "Consecuencias (Qué puede pasar)"]);

    filteredPatients.forEach(p => {
      (p.interacciones || []).forEach(int => {
        rows.push([
          int.fecha, p.demographics.identificadorInterno, p.demographics.numeroPaciente, p.demographics.nombre, int.medicamentos, int.grado, int.consecuencia
        ]);
      });
    });

    exportToCSV(`PRMs_Interacciones_${view}_${filterMonth||'Todo'}_${filterYear||'Todo'}.csv`, rows);
  };

  const handleExportPROA = () => {
     const rows = [
        ["REPORTE PROA - AISLAMIENTOS MICROBIOLÓGICOS Y USO DE ATB", `Filtros aplicados: Mes ${filterMonth || 'Todos'}, Año ${filterYear || 'Todos'}`],
        [],
        ["Fecha de Muestra", "Paciente", "ID Interno (FV)", "N° Expediente", "Diagnóstico Principal", "Tipo de Paciente", "Antibióticos Activos", "Días Máximos ATB", "Tipo de Muestra", "Sitio de Cultivo", "Microorganismo Aislado", "Sensibilidad (S)", "Resistencia (R)", "Observaciones / MIC"]
     ];
     allMicros.forEach(m => {
        rows.push([m.fechaMuestra, m.patientName, m.patientFv, m.patientExp, m.diagnostico, m.tipoPaciente, m.atbActivos, m.maxDiasATB, m.tipoMuestra, m.sitioCultivo, m.microorganismo, m.sensibles, m.resistentes, m.observaciones]);
     });
     exportToCSV(`Reporte_PROA_${view}_${filterMonth||'Todo'}_${filterYear||'Todo'}.csv`, rows);
  };

  return (
    <div className="flex-1 p-3 sm:p-4 lg:p-6 xl:p-8 relative">
      <div className="max-w-7xl mx-auto">
        
        {/* TABS DE DASHBOARD */}
        <div className="flex gap-2 overflow-x-auto border-b border-slate-300 mb-6 pb-1">
           <button onClick={() => setDashboardTab('pacientes')} className={`shrink-0 pb-3 px-2 text-sm sm:text-base lg:text-lg transition-colors flex items-center ${dashboardTab === 'pacientes' ? 'border-b-4 border-blue-600 font-bold text-blue-800' : 'text-slate-500 hover:text-slate-700'}`}>
             <Users className="w-5 h-5 mr-2"/> Censo de Pacientes
           </button>
           <button onClick={() => setDashboardTab('prms')} className={`shrink-0 pb-3 px-2 text-sm sm:text-base lg:text-lg transition-colors flex items-center ${dashboardTab === 'prms' ? 'border-b-4 border-orange-500 font-bold text-orange-700' : 'text-slate-500 hover:text-slate-700'}`}>
             <PieChart className="w-5 h-5 mr-2"/> Monitor de PRM
           </button>
           <button onClick={() => setDashboardTab('proa')} className={`shrink-0 pb-3 px-2 text-sm sm:text-base lg:text-lg transition-colors flex items-center ${dashboardTab === 'proa' ? 'border-b-4 border-purple-500 font-bold text-purple-700' : 'text-slate-500 hover:text-slate-700'}`}>
             <Bug className="w-5 h-5 mr-2"/> PROA (Microbiología)
           </button>
           <button onClick={() => setDashboardTab('calidad')} className={`shrink-0 pb-3 px-2 text-sm sm:text-base lg:text-lg transition-colors flex items-center ${dashboardTab === 'calidad' ? 'border-b-4 border-emerald-500 font-bold text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}>
             <CheckSquare className="w-5 h-5 mr-2"/> Calidad y Conciliación
           </button>
        </div>

        {/* ---------------- VISTA DE PACIENTES ---------------- */}
        {dashboardTab === 'pacientes' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center border-l-4 border-l-blue-500">
                <div className="bg-blue-50 p-3 rounded-lg mr-4"><Users className="w-8 h-8 text-blue-600" /></div>
                <div>
                  <p className="text-sm font-medium text-slate-500">{view === 'egresados' ? 'Total Pacientes Egresados' : 'Total Pacientes Activos'}</p>
                  <p className="text-3xl font-black text-slate-800">{view === 'egresados' ? dischargedCount : activeCount}</p>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center border-l-4 border-l-orange-500">
                <div className="bg-orange-50 p-3 rounded-lg mr-4"><Activity className="w-8 h-8 text-orange-600" /></div>
                <div><p className="text-sm font-medium text-slate-500">Con Antimicrobianos (ATB)</p><p className="text-3xl font-black text-orange-600">{atbCount}</p></div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center border-l-4 border-l-red-500">
                <div className="bg-red-50 p-3 rounded-lg mr-4"><AlertTriangle className="w-8 h-8 text-red-600" /></div>
                <div><p className="text-sm font-medium text-slate-500">Con Alto Riesgo Activo</p><p className="text-3xl font-black text-red-600">{altoRiesgoCount}</p></div>
              </div>
            </div>

            {/* Barra de Controles (Vistas y Filtros) */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col lg:flex-row justify-between lg:items-center gap-4">
              <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-lg w-full lg:w-auto">
                <button onClick={() => setView('activos')} className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${view === 'activos' ? 'bg-white text-blue-700 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-800'}`}>Pacientes Activos</button>
                <button onClick={() => setView('egresados')} className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${view === 'egresados' ? 'bg-white text-blue-700 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-800'}`}>Egresados</button>
                <button onClick={() => setView('papelera')} className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors flex items-center ${view === 'papelera' ? 'bg-red-50 text-red-700 shadow-sm border border-red-200' : 'text-slate-600 hover:text-red-600'}`}><Trash2 className="w-4 h-4 mr-1"/> Papelera</button>
              </div>
              
              <div className="flex flex-wrap gap-2 items-center w-full lg:w-auto">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input type="text" placeholder="Buscar nombre o habitación..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm shadow-sm w-full sm:w-56" />
                </div>
                <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="py-2 px-3 border border-slate-300 rounded-lg text-sm shadow-sm text-slate-700">
                  <option value="">Mes (Todos)</option>{MESES.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
                </select>
                <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="py-2 px-3 border border-slate-300 rounded-lg text-sm shadow-sm text-slate-700">
                  <option value="">Año (Todos)</option>{ANIOS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                
                <button onClick={handleExportGeneral} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center font-medium shadow-sm transition text-sm" title="Exportar Demográficos y Clínicos"><FileSpreadsheet className="w-4 h-4 mr-2" /> Exportar General</button>

                {view !== 'papelera' && <button onClick={onCreate} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center font-medium shadow-sm transition text-sm"><UserPlus className="w-4 h-4 mr-2" /> Nuevo</button>}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto print:overflow-visible">
                <table className="min-w-[1100px] w-full text-left border-collapse">
                  <thead className="bg-slate-800 text-white border-b border-slate-700">
                    <tr>
                      <th className="p-3 font-semibold text-sm w-24">
                        <button type="button" onClick={() => togglePatientColumnFilter('ingreso')} className="inline-flex items-center gap-1 hover:text-blue-200 transition-colors">
                          Ingreso <span className="text-[11px] opacity-90">{getPatientColumnIndicator('ingreso')}</span>
                        </button>
                      </th>
                      <th className="p-3 font-semibold text-sm">
                        <button type="button" onClick={() => togglePatientColumnFilter('paciente')} className="inline-flex items-center gap-1 hover:text-blue-200 transition-colors">
                          Paciente y Alertas clínicas <span className="text-[11px] opacity-90">{getPatientColumnIndicator('paciente')}</span>
                        </button>
                      </th>
                      <th className="p-3 font-semibold text-sm">
                        <button type="button" onClick={() => togglePatientColumnFilter('ubicacion')} className="inline-flex items-center gap-1 hover:text-blue-200 transition-colors">
                          Ubicación y Médico <span className="text-[11px] opacity-90">{getPatientColumnIndicator('ubicacion')}</span>
                        </button>
                      </th>
                      <th className="p-3 font-semibold text-sm">
                        <button type="button" onClick={() => togglePatientColumnFilter('diagnostico')} className="inline-flex items-center gap-1 hover:text-blue-200 transition-colors">
                          Diagnóstico Principal <span className="text-[11px] opacity-90">{getPatientColumnIndicator('diagnostico')}</span>
                        </button>
                      </th>
                      <th className="p-3 font-semibold text-sm text-center">
                        <button type="button" onClick={() => togglePatientColumnFilter('estancia')} className="inline-flex items-center gap-1 hover:text-blue-200 transition-colors">
                          Estancia <span className="text-[11px] opacity-90">{getPatientColumnIndicator('estancia')}</span>
                        </button>
                      </th>
                      <th className="p-3 font-semibold text-sm text-center" title="Medicamentos Activos / Total">
                        <button type="button" onClick={() => togglePatientColumnFilter('medsActivos')} className="inline-flex items-center gap-1 hover:text-blue-200 transition-colors">
                          Meds (Act.) <span className="text-[11px] opacity-90">{getPatientColumnIndicator('medsActivos')}</span>
                        </button>
                      </th>
                      <th className="p-3 font-semibold text-sm text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                  {patientRows.length === 0 && <tr><td colSpan="7" className="p-8 text-center text-slate-500">No hay registros para esta vista o filtros seleccionados.</td></tr>}
                  {patientRows.map(p => {
                    const { years } = calculateAge(p.demographics.fechaNacimiento);
                    const estancia = calculateDaysOfUse(p.demographics.ingreso, p.demographics.egreso);
                    const medsActivos = p.perfilFarmaco.filter(f => f.estado === 'Activo').length;
                    const medsTotal = p.perfilFarmaco.length;
                    const hasPolimedicado = medsActivos > 5;
                    const hasAdultoMayor = Number(years) >= ADULTO_MAYOR_EDAD;
                    
                    const creatData = p.labs["Creatinina Sérica"] || [];
                    const latestCreat = creatData.length > 0 ? creatData[creatData.length - 1].value : '';
                    const crcl = calculateCrCl(years, p.demographics.peso, p.demographics.genero, latestCreat);
                    
                    const hasAlergias = p.demographics.alergias && p.demographics.alergias.toLowerCase() !== 'no' && p.demographics.alergias.toLowerCase() !== 'ninguna' && p.demographics.alergias.trim() !== '';
                    const hasAltoRiesgo = p.perfilFarmaco.some(f => f.categoria === 'Alto Riesgo' && f.estado === 'Activo');
                    
                    // Cálculo de días máximos de uso de antibióticos activos
                    const atbActivosList = p.perfilFarmaco.filter(f => f.categoria === 'Antibiótico' && f.estado === 'Activo');
                    let maxDiasATB = 0;
                    atbActivosList.forEach(atb => {
                        const dias = calculateDaysOfUse(atb.fechaInicio, p.demographics.egreso);
                        if (dias > maxDiasATB) maxDiasATB = dias;
                    });
                    const hasATB = atbActivosList.length > 0;

                    const hasAislamiento = p.microbiologia && p.microbiologia.some(m => m.microorganismo && m.microorganismo.trim() !== '');
                    const idoneidadOk = p.perfilFarmacoMeta?.evaluadoPrevioPrimeraDosis;

                    // LÓGICA DE PRESENCIA COLABORATIVA (Sustituye al candado)
                    const otherActiveUsers = listOtherActiveUsers(p, currentUser.id);
                    const otherNames = otherActiveUsers.map(uid => users.find(u => u.id === uid)?.nombre).join(', ');

                    let rowColor = "border-b border-slate-100 transition-colors cursor-pointer ";
                    
                    if (!p.deleted) {
                      if (hasAltoRiesgo) rowColor += "bg-red-50 hover:bg-red-100";
                      else if (hasATB) rowColor += "bg-orange-50 hover:bg-orange-100";
                      else rowColor += "hover:bg-slate-50";
                    } else if (p.deleted) {
                      rowColor += "bg-slate-100 opacity-70";
                    }

                    return (
                      <tr key={p.id} className={rowColor} onClick={() => {
                          if(view === 'papelera') return;
                          onSelect(p.id, 'demographics');
                      }}>
                        <td className="p-3 text-slate-600 font-medium text-sm">
                          {formatExcelDate(p.demographics.ingreso).split(' ')[0] || '-'}
                          <div className="text-xs font-mono text-slate-400 mt-1" title="ID Interno FV">{p.demographics.identificadorInterno}</div>
                          {p.demographics.numeroEpisodio && <div className="text-[10px] bg-slate-200 inline-block px-1 rounded text-slate-600 mt-1">Ep: {p.demographics.numeroEpisodio}</div>}
                        </td>
                        <td className="p-3">
                          <p className="font-bold text-slate-800 text-base">{p.demographics.nombre || 'Sin Nombre'}</p>
                          <p className="text-xs text-slate-600 mb-1 flex items-center">
                            {years ? `${years} a.` : '-'} | {p.demographics.genero || '-'} | {p.demographics.peso ? `${p.demographics.peso} kg` : '-'}
                            {crcl && <span className={`ml-2 font-medium px-1.5 rounded-sm border ${getTfgColorClass(crcl)}`}>TFG: {crcl}</span>}
                          </p>
                          <div className="flex space-x-1.5 mt-1 flex-wrap">
                            {/* ETIQUETA COLABORATIVA EN LUGAR DE CANDADO ROJO */}
                            {otherActiveUsers.length > 0 && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 mb-1" title={`Editando: ${otherNames}`}><Users className="w-3 h-3 mr-1"/> EDITANDO ({otherActiveUsers.length})</span>}
                            {hasAdultoMayor && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 mb-1">ADULTO MAYOR ({ADULTO_MAYOR_EDAD}+)</span>}
                            {hasPolimedicado && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900 mb-1">PACIENTE POLIMEDICADO +5</span>}
                            {hasAlergias && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white mb-1" title={p.demographics.alergias}>ALERGIAS</span>}
                            {idoneidadOk && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-200 text-green-800 mb-1" title="Idoneidad validada previo a primera dosis"><CheckCircle className="w-3 h-3 mr-1"/> IDONEIDAD OK</span>}
                            {hasAltoRiesgo && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-200 text-red-800 mb-1">ALTO RIESGO</span>}
                            {hasATB && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-200 text-orange-800 mb-1">ATB ({maxDiasATB} d)</span>}
                            {hasAislamiento && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-200 text-purple-800 mb-1 flex items-center" title="Cultivo Positivo"><Bug className="w-3 h-3 mr-1"/> AISLAMIENTO</span>}
                          </div>
                        </td>
                        <td className="p-3">
                          <p className="font-bold text-slate-700">Hab: {p.demographics.habitacion || '-'}</p>
                          <p className="text-xs text-slate-500">{p.demographics.medico || '-'}</p>
                          <p className="text-[10px] text-blue-600 uppercase mt-0.5">{p.demographics.especialidad || ''}</p>
                        </td>
                        <td className="p-3 text-slate-600 text-sm truncate max-w-xs" title={p.demographics.diagnosticoPrincipal}>{p.demographics.diagnosticoPrincipal || '-'}</td>
                        <td className="p-3 text-center">
                          <span className="font-bold text-slate-700">{estancia} d</span>
                          {p.demographics.egreso && <span className="block text-[10px] text-red-500 font-bold leading-tight mt-0.5">EGRESADO</span>}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`font-bold ${medsActivos > 0 ? 'text-blue-600' : 'text-slate-400'}`}>{medsActivos}</span>
                          <span className="text-xs text-slate-400"> / {medsTotal}</span>
                        </td>
                        <td className="p-3 flex justify-center">
                          {view === 'papelera' ? (
                            <div className="flex space-x-2">
                              <button onClick={(e) => { e.stopPropagation(); onRestore(p.id); }} className="text-green-600 hover:bg-green-100 p-2 rounded-md transition-colors" title="Restaurar paciente"><RefreshCcw className="w-5 h-5" /></button>
                              {/* Advertencia si intentan borrar uno con alguien dentro */}
                              <button disabled={otherActiveUsers.length > 0} onClick={(e) => { e.stopPropagation(); if(otherActiveUsers.length === 0) onHardDelete(p.id); }} className={`p-2 rounded-md transition-colors ${otherActiveUsers.length > 0 ? 'text-slate-300 cursor-not-allowed' : 'text-red-600 hover:bg-red-200'}`} title={otherActiveUsers.length > 0 ? 'En uso por otros usuarios' : 'Eliminar permanentemente'}><Trash2 className="w-5 h-5" /></button>
                            </div>
                          ) : (
                            <button disabled={otherActiveUsers.length > 0} onClick={(e) => { e.stopPropagation(); if(otherActiveUsers.length === 0) onDelete(p.id); }} className={`p-2 rounded-md transition-colors ${otherActiveUsers.length > 0 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-400 hover:bg-red-100 hover:text-red-600'}`} title={otherActiveUsers.length > 0 ? 'En uso por otros usuarios' : 'Mover a papelera'}><Trash2 className="w-5 h-5" /></button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ---------------- VISTA EXCLUSIVA DE PRMs ---------------- */}
        {dashboardTab === 'prms' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center border-l-4 border-l-orange-500">
                <div className="bg-orange-50 p-3 rounded-lg mr-4"><FileWarning className="w-8 h-8 text-orange-600" /></div>
                <div><p className="text-sm font-medium text-slate-500">PRMs Detectados</p><p className="text-3xl font-black text-slate-800">{allPrms.length}</p></div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center border-l-4 border-l-red-500">
                <div className="bg-red-50 p-3 rounded-lg mr-4"><ShieldAlert className="w-8 h-8 text-red-600" /></div>
                <div><p className="text-sm font-medium text-slate-500">Graves o Letales</p><p className="text-3xl font-black text-red-600">{allPrms.filter(p => p.gravedad === 'Grave' || p.gravedad === 'Letal').length}</p></div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center border-l-4 border-l-green-500">
                <div className="bg-green-50 p-3 rounded-lg mr-4"><ListChecks className="w-8 h-8 text-green-600" /></div>
                <div><p className="text-sm font-medium text-slate-500">Intervenciones Aceptadas</p><p className="text-3xl font-black text-green-600">{allPrms.filter(p => p.aceptacion === 'Aceptada').length}</p></div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-wrap gap-2 items-center">
               <span className="text-sm font-bold text-slate-500 mr-2"><Filter className="w-4 h-4 inline mr-1"/> Filtros PRM:</span>

               <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg mr-2">
                 <button onClick={() => setView('activos')} className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${view === 'activos' ? 'bg-white text-orange-700 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-800'}`}>Activos</button>
                 <button onClick={() => setView('egresados')} className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${view === 'egresados' ? 'bg-white text-orange-700 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-800'}`}>Egresados</button>
               </div>

               <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="py-2 px-3 border border-slate-300 rounded-lg text-sm shadow-sm text-slate-700">
                 <option value="">Mes (Todos)</option>{MESES.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
               </select>
               <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="py-2 px-3 border border-slate-300 rounded-lg text-sm shadow-sm text-slate-700">
                 <option value="">Año (Todos)</option>{ANIOS.map(y => <option key={y} value={y}>{y}</option>)}
               </select>
               <select value={filterPrmCategory} onChange={e => setFilterPrmCategory(e.target.value)} className="py-2 px-3 border border-slate-300 rounded-lg text-sm shadow-sm text-slate-700">
                 <option value="">Categoría (Todas)</option>
                 {CATEGORIAS_PRM.map(c => <option key={c} value={c}>{c}</option>)}
               </select>
               <select value={filterPrmGravity} onChange={e => setFilterPrmGravity(e.target.value)} className="py-2 px-3 border border-slate-300 rounded-lg text-sm shadow-sm text-slate-700">
                 <option value="">Gravedad (Todas)</option>
                 <option value="Leve">Leve</option><option value="Moderada">Moderada</option>
                 <option value="Grave">Grave</option><option value="Letal">Letal</option>
               </select>

               <div className="w-full sm:flex-1 sm:text-right">
                  <button onClick={handleExportPRMsAndInteractions} className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg inline-flex items-center font-medium shadow-sm transition text-sm" title="Exportar Base de Datos de PRMs"><FileWarning className="w-4 h-4 mr-2" /> Exportar a Excel</button>
               </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto print:overflow-visible">
                <table className="min-w-[980px] w-full text-left border-collapse">
                  <thead className="bg-slate-800 text-white border-b border-slate-700">
                    <tr>
                      <th className="p-3 font-semibold text-sm w-24">Fecha</th>
                      <th className="p-3 font-semibold text-sm">Paciente</th>
                      <th className="p-3 font-semibold text-sm">Categoría y Análisis</th>
                      <th className="p-3 font-semibold text-sm">Medicamento Involucrado</th>
                      <th className="p-3 font-semibold text-sm text-center">Intervención</th>
                      <th className="p-3 font-semibold text-sm text-center">Estatus y Gravedad</th>
                    </tr>
                  </thead>
                  <tbody>
                  {allPrms.length === 0 && <tr><td colSpan="6" className="p-8 text-center text-slate-500">No hay PRMs registrados con los filtros actuales.</td></tr>}
                  {allPrms.map((prm, idx) => {
                    const originalPatient = patients.find(px => px.id === prm.patientId);
                    const otherActiveUsers = originalPatient ? listOtherActiveUsers(originalPatient, currentUser.id) : [];

                    return (
                    <tr key={idx} onClick={() => onSelect(prm.patientId, 'prm')} className={`border-b border-slate-100 transition-colors hover:bg-orange-50 cursor-pointer`}>
                      <td className="p-3 text-slate-600 font-medium text-sm">{formatExcelDate(prm.fecha).split(' ')[0]}</td>
                      <td className="p-3">
                        <p className="font-bold text-slate-800 text-sm flex items-center">
                            {otherActiveUsers.length > 0 && <Users className="w-3 h-3 text-blue-500 mr-1" title="Otros editando"/>}
                            {prm.patientName || 'Sin Nombre'}
                        </p>
                        <p className="text-xs text-slate-500 font-mono">FV: {prm.patientFv || '-'} | Exp: {prm.patientExp}</p>
                      </td>
                      <td className="p-3">
                         <span className="inline-block px-2 py-0.5 bg-slate-200 text-slate-800 text-xs rounded font-bold mb-1">{prm.categoria || '-'}</span>
                         <p className="text-xs text-slate-600 truncate max-w-xs">{prm.analisis || '-'}</p>
                      </td>
                      <td className="p-3 font-medium text-sm text-slate-700">{prm.medicamento || '-'}</td>
                      <td className="p-3 text-center">
                         <p className="text-sm font-bold text-blue-700">{prm.intervencion || '-'}</p>
                         <p className={`text-[10px] font-bold uppercase mt-1 ${prm.aceptacion === 'Aceptada' ? 'text-green-600' : prm.aceptacion === 'No Aceptada' ? 'text-red-600' : 'text-amber-600'}`}>{prm.aceptacion || 'Sin estatus'}</p>
                      </td>
                      <td className="p-3 text-center">
                         <p className={`text-xs font-bold px-2 py-1 rounded inline-block ${prm.resolucion === 'Resuelto' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{prm.resolucion || '-'}</p>
                         <p className={`text-[10px] font-bold uppercase mt-1 ${prm.gravedad === 'Grave' || prm.gravedad === 'Letal' ? 'text-red-600' : 'text-slate-500'}`}>{prm.gravedad}</p>
                      </td>
                    </tr>
                  )})}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ---------------- VISTA EXCLUSIVA PROA (MICROBIOLOGÍA) ---------------- */}
        {dashboardTab === 'proa' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center border-l-4 border-l-purple-500">
                <div className="bg-purple-50 p-3 rounded-lg mr-4"><TestTube className="w-8 h-8 text-purple-600" /></div>
                <div><p className="text-sm font-medium text-slate-500">Total de Cultivos</p><p className="text-3xl font-black text-slate-800">{allMicros.length}</p></div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center border-l-4 border-l-blue-500">
                <div className="bg-blue-50 p-3 rounded-lg mr-4"><Bug className="w-8 h-8 text-blue-600" /></div>
                <div><p className="text-sm font-medium text-slate-500">Aislamientos Positivos</p><p className="text-3xl font-black text-blue-600">{allMicros.filter(m => m.microorganismo && m.microorganismo.trim() !== '').length}</p></div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center border-l-4 border-l-red-500">
                <div className="bg-red-50 p-3 rounded-lg mr-4"><ShieldAlert className="w-8 h-8 text-red-600" /></div>
                <div><p className="text-sm font-medium text-slate-500">Reportes c/Resistencia</p><p className="text-3xl font-black text-red-600">{allMicros.filter(m => m.resistentes && m.resistentes.trim() !== '').length}</p></div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-wrap gap-2 items-center">
               <span className="text-sm font-bold text-slate-500 mr-2"><Filter className="w-4 h-4 inline mr-1"/> Filtros PROA:</span>

               <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg mr-2">
                 <button onClick={() => setView('activos')} className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${view === 'activos' ? 'bg-white text-purple-700 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-800'}`}>Activos</button>
                 <button onClick={() => setView('egresados')} className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${view === 'egresados' ? 'bg-white text-purple-700 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-800'}`}>Egresados</button>
               </div>

               <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="py-2 px-3 border border-slate-300 rounded-lg text-sm shadow-sm text-slate-700">
                 <option value="">Mes (Todos)</option>{MESES.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
               </select>
               <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="py-2 px-3 border border-slate-300 rounded-lg text-sm shadow-sm text-slate-700">
                 <option value="">Año (Todos)</option>{ANIOS.map(y => <option key={y} value={y}>{y}</option>)}
               </select>

               <div className="w-full sm:flex-1 sm:text-right">
                  <button onClick={handleExportPROA} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg inline-flex items-center font-medium shadow-sm transition text-sm" title="Exportar Aislamientos PROA"><FileSpreadsheet className="w-4 h-4 mr-2" /> Exportar PROA</button>
               </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto print:overflow-visible">
                <table className="min-w-[950px] w-full text-left border-collapse">
                  <thead className="bg-slate-800 text-white border-b border-slate-700">
                    <tr>
                      <th className="p-3 font-semibold text-sm w-24">Fecha</th>
                      <th className="p-3 font-semibold text-sm">Paciente</th>
                      <th className="p-3 font-semibold text-sm">Muestra y Sitio</th>
                      <th className="p-3 font-semibold text-sm text-purple-200">Microorganismo Aislado</th>
                      <th className="p-3 font-semibold text-sm text-red-200">Resistencias Notables</th>
                    </tr>
                  </thead>
                  <tbody>
                  {allMicros.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-slate-500">No hay cultivos registrados con los filtros actuales.</td></tr>}
                  {allMicros.map((mic, idx) => {
                    const originalPatient = patients.find(px => px.id === mic.patientId);
                    const otherActiveUsers = originalPatient ? listOtherActiveUsers(originalPatient, currentUser.id) : [];

                    return (
                    <tr key={idx} onClick={() => onSelect(mic.patientId, 'micro')} className={`border-b border-slate-100 transition-colors hover:bg-purple-50 cursor-pointer`}>
                      <td className="p-3 text-slate-600 font-medium text-sm">{formatExcelDate(mic.fechaMuestra).split(' ')[0]}</td>
                      <td className="p-3">
                        <p className="font-bold text-slate-800 text-sm flex items-center">
                            {otherActiveUsers.length > 0 && <Users className="w-3 h-3 text-blue-500 mr-1" title="Otros editando"/>}
                            {mic.patientName || 'Sin Nombre'}
                        </p>
                        <p className="text-xs text-slate-500 font-mono">FV: {mic.patientFv || '-'} | Exp: {mic.patientExp}</p>
                      </td>
                      <td className="p-3">
                         <p className="font-bold text-slate-700 text-sm">{mic.tipoMuestra || '-'}</p>
                         <p className="text-xs text-slate-500">Sitio: {mic.sitioCultivo || '-'}</p>
                      </td>
                      <td className="p-3">
                         {mic.microorganismo ? (
                           <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200"><Bug className="w-3 h-3 mr-1"/> {mic.microorganismo}</span>
                         ) : <span className="text-xs text-slate-400 italic">Sin crecimiento / Pendiente</span>}
                         {mic.observaciones && <p className="text-[10px] text-slate-500 mt-1">{mic.observaciones}</p>}
                      </td>
                      <td className="p-3">
                         <p className="text-xs text-red-700 font-medium max-w-xs">{mic.resistentes || '-'}</p>
                      </td>
                    </tr>
                  )})}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ---------------- VISTA EXCLUSIVA CALIDAD Y CONCILIACIÓN ---------------- */}
        {dashboardTab === 'calidad' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-center border-l-4 border-l-slate-400">
                <div className="bg-slate-50 p-2 rounded-lg mr-3"><Users className="w-6 h-6 text-slate-600" /></div>
                <div><p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Pacientes Vista</p><p className="text-2xl font-black text-slate-800">{totalPacientesCalidad}</p></div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-center border-l-4 border-l-blue-500">
                <div className="bg-blue-50 p-2 rounded-lg mr-3"><CheckCircle className="w-6 h-6 text-blue-600" /></div>
                <div><p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Idoneidad (1ra Dosis)</p><p className="text-2xl font-black text-blue-600">{idoneidadCount}</p></div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-center border-l-4 border-l-emerald-500">
                <div className="bg-emerald-50 p-2 rounded-lg mr-3"><ClipboardList className="w-6 h-6 text-emerald-600" /></div>
                <div><p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Conciliación Ingreso</p><p className="text-2xl font-black text-emerald-600">{ingresoCount}</p></div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-center border-l-4 border-l-purple-500">
                <div className="bg-purple-50 p-2 rounded-lg mr-3"><CheckSquare className="w-6 h-6 text-purple-600" /></div>
                <div><p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Conciliación Egreso</p><p className="text-2xl font-black text-purple-600">{egresoCount}</p></div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-wrap gap-2 items-center">
               <span className="text-sm font-bold text-slate-500 mr-2"><Filter className="w-4 h-4 inline mr-1"/> Filtros Tabla:</span>
               
               <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg mr-4">
                  <button onClick={() => setView('activos')} className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${view === 'activos' ? 'bg-white text-emerald-700 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-800'}`}>Activos</button>
                  <button onClick={() => setView('egresados')} className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${view === 'egresados' ? 'bg-white text-emerald-700 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-800'}`}>Egresados</button>
               </div>

               <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="py-1.5 px-2 border border-slate-300 rounded-lg text-xs shadow-sm text-slate-700">
                 <option value="">Mes (Todos)</option>{MESES.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
               </select>
               <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="py-1.5 px-2 border border-slate-300 rounded-lg text-xs shadow-sm text-slate-700">
                 <option value="">Año (Todos)</option>{ANIOS.map(y => <option key={y} value={y}>{y}</option>)}
               </select>

               <div className="w-full sm:flex-1 sm:text-right">
                  <button onClick={handleExportGeneral} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg inline-flex items-center font-medium shadow-sm transition text-sm" title="Exportar métricas e información general"><FileSpreadsheet className="w-4 h-4 mr-2" /> Exportar KPIs de Calidad</button>
               </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto print:overflow-visible">
                <table className="min-w-[980px] w-full text-left border-collapse">
                  <thead className="bg-slate-800 text-white border-b border-slate-700">
                    <tr>
                      <th className="p-3 font-semibold text-sm">Paciente y Expediente</th>
                      <th className="p-3 font-semibold text-sm text-center border-l border-slate-700">Habitación</th>
                      <th className="p-3 font-semibold text-sm text-center border-l border-slate-700">Validación Idoneidad<br/><span className="text-[10px] font-normal text-slate-300">(Previo 1ra Dosis)</span></th>
                      <th className="p-3 font-semibold text-sm text-center border-l border-slate-700">1. Conciliación<br/>al Ingreso</th>
                      <th className="p-3 font-semibold text-sm text-center border-l border-slate-700">2. Transición<br/>de Área</th>
                      <th className="p-3 font-semibold text-sm text-center border-l border-slate-700">3. Transición<br/>de Médico</th>
                      <th className="p-3 font-semibold text-sm text-center border-l border-slate-700">4. Conciliación<br/>al Egreso</th>
                    </tr>
                  </thead>
                  <tbody>
                  {filteredPatients.length === 0 && <tr><td colSpan="7" className="p-8 text-center text-slate-500">No hay registros para mostrar.</td></tr>}
                  {filteredPatients.map((p, idx) => {
                    const idoneidadDone = p.perfilFarmacoMeta?.evaluadoPrevioPrimeraDosis;
                    const ingresoDone = p.conciliacion.ingreso.length > 0;
                    const ingresoNA = p.conciliacion.ingresoNA;
                    const transAreaDone = p.conciliacion.transicionesArea?.length > 0;
                    const transAreaNA = p.conciliacion.transicionAreaNA;
                    const transMedDone = p.conciliacion.transicionMedico;
                    const transMedNA = p.conciliacion.transicionMedicoNA;
                    const egresoDone = p.conciliacion.egreso.length > 0;
                    const egresoNA = p.conciliacion.egresoNA;

                    const otherActiveUsers = listOtherActiveUsers(p, currentUser.id);

                    return (
                      <tr key={idx} onClick={() => onSelect(p.id, 'conciliation')} className={`border-b border-slate-100 transition-colors hover:bg-emerald-50 cursor-pointer`}>
                        <td className="p-3">
                          <p className="font-bold text-slate-800 text-sm flex items-center">
                             {otherActiveUsers.length > 0 && <Users className="w-3 h-3 text-blue-500 mr-1" title="Otros editando"/>}
                             {p.demographics.nombre || 'Sin Nombre'}
                          </p>
                          <p className="text-xs text-slate-500 font-mono">FV: {p.demographics.identificadorInterno || '-'} | Exp: {p.demographics.numeroPaciente} | Ep: {p.demographics.numeroEpisodio}</p>
                        </td>
                        <td className="p-3 text-center border-l border-slate-100">
                          <span className="inline-flex items-center justify-center px-2 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold min-w-[72px]">
                            {p.demographics.habitacion || '-'}
                          </span>
                        </td>
                        <td className="p-3 text-center border-l border-slate-100">
                           <StatusBadge done={idoneidadDone} isNA={false} />
                        </td>
                        <td className="p-3 text-center border-l border-slate-100 bg-slate-50">
                           <StatusBadge done={ingresoDone} isNA={ingresoNA} />
                        </td>
                        <td className="p-3 text-center border-l border-slate-100">
                           <StatusBadge done={transAreaDone} isNA={transAreaNA} />
                        </td>
                        <td className="p-3 text-center border-l border-slate-100 bg-slate-50">
                           <StatusBadge done={transMedDone} isNA={transMedNA} />
                        </td>
                        <td className="p-3 text-center border-l border-slate-100">
                           <StatusBadge done={egresoDone} isNA={egresoNA} />
                        </td>
                      </tr>
                    );
                  })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}

// ==========================================
// VISTAS DEL PACIENTE (Pestañas)
// ==========================================

function DemographicsTab({ patient, updatePatient, allPatients = [] }) {
  const d = patient.demographics;
  const { years: edad, group: grupoEtario } = calculateAge(d.fechaNacimiento);
  const imc = calculateIMC(d.peso, d.altura);
  const sc = calculateSC(d.peso, d.altura);
  const pesoIdeal = calculateIdealWeight(d.altura, d.genero);
  const pesoAjustado = calculateAdjustedWeight(d.peso, pesoIdeal);
  const [comorbiditySelection, setComorbiditySelection] = useState('');
  const [otherComorbidity, setOtherComorbidity] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    const nextDemographics = { ...d, [name]: value };

    if (name === 'genero' && value !== 'Femenino') {
      nextDemographics.embarazada = '';
      nextDemographics.semanasGestacion = '';
    }

    if (name === 'embarazada' && value !== 'Sí') {
      nextDemographics.semanasGestacion = '';
    }

    updatePatient({ demographics: nextDemographics });
  };

  const comorbidityItems = useMemo(
    () =>
      (d.comorbilidades || '')
        .split(/[;,|\n]+/)
        .map((item) => item.trim())
        .filter(Boolean),
    [d.comorbilidades]
  );

  const persistComorbidities = (items) => {
    updatePatient({ demographics: { ...d, comorbilidadesTipo: '', comorbilidades: items.join('; ') } });
  };

  const addComorbidity = (rawValue) => {
    const value = (rawValue || '').trim();
    if (!value) return;

    if (value.toLowerCase() === 'sin comorbilidades') {
      persistComorbidities(['Sin comorbilidades']);
      return;
    }

    const next = comorbidityItems.filter((item) => item.toLowerCase() !== 'sin comorbilidades');
    const alreadyExists = next.some((item) => item.toLowerCase() === value.toLowerCase());
    if (alreadyExists) return;

    persistComorbidities([...next, value]);
  };

  const handleAddComorbidity = () => {
    if (!comorbiditySelection) return;

    if (comorbiditySelection === 'OTRO') {
      addComorbidity(otherComorbidity);
      setOtherComorbidity('');
      return;
    }

    addComorbidity(comorbiditySelection);
    setComorbiditySelection('');
  };

  const removeComorbidityAt = (indexToRemove) => {
    persistComorbidities(comorbidityItems.filter((_, index) => index !== indexToRemove));
  };

  // DETECCIÓN DE DUPLICADOS EN TIEMPO REAL (Solo por Nombre y Fecha de Nacimiento)
  const possibleDuplicates = allPatients.filter(p => {
    if (p.id === patient.id || p.deleted) return false;
    
    const myBase = patient.pacienteBaseId || patient.id;
    const theirBase = p.pacienteBaseId || p.id;
    if (myBase === theirBase) return false;

    const hasName = p.demographics.nombre && d.nombre && d.nombre.trim().length > 3;
    const sameName = hasName && p.demographics.nombre.toLowerCase().trim() === d.nombre.toLowerCase().trim();
    
    const hasDob = p.demographics.fechaNacimiento && d.fechaNacimiento;
    const sameDob = hasDob && p.demographics.fechaNacimiento === d.fechaNacimiento;
    
    return sameName && sameDob;
  });

  const vincularComoReingreso = (dup) => {
    const baseId = dup.pacienteBaseId || dup.id;
    updatePatient({
      pacienteBaseId: baseId,
      demographics: {
        ...d,
        nombre: dup.demographics.nombre,
        fechaNacimiento: dup.demographics.fechaNacimiento,
        genero: dup.demographics.genero,
        peso: dup.demographics.peso,
        altura: dup.demographics.altura,
        alergias: dup.demographics.alergias,
        intolerancias: dup.demographics.intolerancias,
        embarazada: dup.demographics.embarazada,
        semanasGestacion: dup.demographics.semanasGestacion,
        toxicomania: dup.demographics.toxicomania,
        alcoholismo: dup.demographics.alcoholismo,
        detallesAdicciones: dup.demographics.detallesAdicciones,
        fuma: dup.demographics.fuma,
        tipoPaciente: dup.demographics.tipoPaciente
      }
    });
  };

  let imcColorClass = 'bg-slate-100 text-slate-800 border-slate-200';
  let imcLabel = '';
  if (imc) {
    if (imc < 18.5) { imcColorClass = 'bg-blue-100 text-blue-800 border-blue-300 font-bold'; imcLabel = '(Bajo Peso)'; }
    else if (imc >= 18.5 && imc <= 24.9) { imcColorClass = 'bg-green-100 text-green-800 border-green-300 font-bold'; imcLabel = '(Normal)'; }
    else if (imc >= 25 && imc <= 29.9) { imcColorClass = 'bg-orange-100 text-orange-800 border-orange-300 font-bold'; imcLabel = '(Sobrepeso)'; }
    else if (imc >= 30) { imcColorClass = 'bg-red-100 text-red-800 border-red-300 font-bold'; imcLabel = '(Obesidad)'; }
  }

  return (
    <div className="space-y-6">
      {/* ALERTA DE DUPLICIDAD */}
      {possibleDuplicates.length > 0 && !patient.pacienteBaseId && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6 rounded-r-md flex flex-col md:flex-row justify-between items-start md:items-center shadow-sm print:hidden">
           <div>
             <h4 className="font-bold text-amber-800 flex items-center"><AlertTriangle className="w-5 h-5 mr-2" /> Posible paciente duplicado detectado</h4>
             <p className="text-sm text-amber-700 mt-1">Se encontró un registro existente para <strong>{possibleDuplicates[0].demographics.nombre}</strong> (Ingreso: {formatExcelDate(possibleDuplicates[0].demographics.ingreso).split(' ')[0]}).</p>
           </div>
           <button onClick={() => vincularComoReingreso(possibleDuplicates[0])} className="mt-3 md:mt-0 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded text-sm font-bold shadow transition flex items-center">
              <Layers className="w-4 h-4 mr-2" /> Vincular como Reingreso
           </button>
        </div>
      )}

      <section className="fc-panel print:bg-transparent print:border-none print:p-0 print:shadow-none">
        <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-1 text-blue-800 print:text-black">1. Identificación y Ubicación</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="flex flex-col">
            <label className="fc-label truncate">Identificador Interno (FV)</label>
            <input type="text" name="identificadorInterno" value={d.identificadorInterno || ''} onChange={handleChange} className="fc-input font-mono" title="ID interno editable" />
          </div>
          <FormInput label="No. de Paciente (Expediente)" name="numeroPaciente" value={d.numeroPaciente} onChange={handleChange} />
          <FormInput label="No. de Episodio" name="numeroEpisodio" value={d.numeroEpisodio} onChange={handleChange} />
          <FormInput label="Habitación" name="habitacion" value={d.habitacion} onChange={handleChange} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="col-span-2"><FormInput label="Nombre Completo" name="nombre" value={d.nombre} onChange={handleChange} /></div>
          <div className="col-span-1"><FormInput label="Médico Tratante" name="medico" value={d.medico} onChange={handleChange} /></div>
          <FormInput label="Fecha de Nacimiento" type="date" name="fechaNacimiento" value={d.fechaNacimiento} onChange={handleChange} />
        </div>
      </section>

      <section className="fc-panel print:bg-transparent print:border-none print:p-0 print:shadow-none">
        <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-1 text-blue-800 print:text-black">2. Clínica y Hospitalización</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <FormSelect label="Género" name="genero" value={d.genero} onChange={handleChange} options={["Masculino", "Femenino"]} />
          <FormInput label="Fecha de Ingreso (con hora)" type="datetime-local" name="ingreso" value={d.ingreso} onChange={handleChange} />
          <FormInput label="Fecha de Egreso (con hora)" type="datetime-local" name="egreso" value={d.egreso} onChange={handleChange} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <FormSelect label="Tipo de paciente" name="tipoPaciente" value={d.tipoPaciente} onChange={handleChange} options={TIPOS_PACIENTE} />
          <FormSelect label="Especialidad" name="especialidad" value={d.especialidad} onChange={handleChange} options={ESPECIALIDADES} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <FormInput label="Motivo de Ingreso / Procedimiento" name="motivoIngreso" value={d.motivoIngreso} onChange={handleChange} />
          <FormInput label="Diagnóstico Principal" name="diagnosticoPrincipal" value={d.diagnosticoPrincipal} onChange={handleChange} />
        </div>
        {d.genero === 'Femenino' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <FormSelect label="¿Paciente embarazada?" name="embarazada" value={d.embarazada} onChange={handleChange} options={["Sí", "No"]} />
            {d.embarazada === 'Sí' ? (
              <FormInput label="Semanas de gestación" type="number" name="semanasGestacion" value={d.semanasGestacion} onChange={handleChange} placeholder="Ej. 24" />
            ) : (
              <div />
            )}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="flex flex-col"><label className="fc-label">Antecedentes Médicos</label><textarea name="antecedentes" value={d.antecedentes || ''} onChange={handleChange} rows={2} className="fc-textarea"></textarea></div>
          <div className="flex flex-col">
            <label className="fc-label">Comorbilidades Actuales</label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <select value={comorbiditySelection} onChange={(e) => setComorbiditySelection(e.target.value)} className="fc-input">
                  <option value="">Sel...</option>
                  {COMORBILIDADES_PREDEFINIDAS.map((item) => <option key={item} value={item}>{item}</option>)}
                  <option value="OTRO">OTRO</option>
                </select>
                <button
                  type="button"
                  onClick={handleAddComorbidity}
                  className="px-3 py-2 text-sm font-medium rounded-md border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                >
                  Agregar
                </button>
              </div>

              {comorbiditySelection === 'OTRO' && (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={otherComorbidity}
                    onChange={(e) => setOtherComorbidity(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddComorbidity();
                      }
                    }}
                    placeholder="Especificar comorbilidad..."
                    className="fc-input"
                  />
                  <button
                    type="button"
                    onClick={handleAddComorbidity}
                    className="px-3 py-2 text-sm font-medium rounded-md border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                  >
                    Agregar
                  </button>
                </div>
              )}

              {comorbidityItems.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {comorbidityItems.map((item, index) => (
                    <span key={`${item}-${index}`} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-xs border border-slate-200">
                      {item}
                      <button
                        type="button"
                        onClick={() => removeComorbidityAt(index)}
                        className="text-slate-500 hover:text-red-600 transition-colors"
                        title="Eliminar comorbilidad"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">Sin comorbilidades registradas.</p>
              )}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <FormInput label="Alergias" name="alergias" value={d.alergias} onChange={handleChange} />
          <FormInput label="Intolerancias" name="intolerancias" value={d.intolerancias} onChange={handleChange} />
        </div>
        <div className="flex flex-col mb-4">
          <label className="fc-label">Observaciones Generales Clínicas</label>
          <textarea name="observacionesGenerales" value={d.observacionesGenerales || ''} onChange={handleChange} rows={3} className="fc-textarea" placeholder="Cualquier otra observación relevante sobre el paciente..."></textarea>
        </div>
      </section>

      <section className="fc-panel print:bg-transparent print:border-none print:p-0 print:shadow-none">
         <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-1 text-blue-800 print:text-black">3. Hábitos y Estilo de Vida</h3>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <FormSelect label="¿Tabaquismo?" name="fuma" value={d.fuma} onChange={handleChange} options={["Sí", "No"]} />
            <FormSelect label="¿Alcoholismo Crónico?" name="alcoholismo" value={d.alcoholismo} onChange={handleChange} options={["Sí", "No"]} />
            <FormSelect label="¿Toxicomanías?" name="toxicomania" value={d.toxicomania} onChange={handleChange} options={["Sí", "No"]} />
         </div>
         {(d.alcoholismo === 'Sí' || d.toxicomania === 'Sí' || d.fuma === 'Sí') && (
            <div className="flex flex-col mb-4">
              <label className="fc-label">Detallar consumo (Frecuencia, cantidad, etc.)</label>
              <textarea name="detallesAdicciones" value={d.detallesAdicciones || ''} onChange={handleChange} rows={2} className="fc-textarea bg-amber-50"></textarea>
            </div>
         )}
      </section>

      <section className="fc-panel print:bg-transparent print:border-none print:p-0 print:shadow-none">
        <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-1 text-blue-800 print:text-black">4. Antropometría Farmacocinética</h3>
        <div className="grid grid-cols-2 md:grid-cols-7 gap-4 items-end">
          <div className="flex flex-col justify-end">
            <span className="text-sm font-semibold text-slate-600 mb-1">Edad</span>
            <div className="bg-slate-100 p-2 rounded-md border border-slate-200 h-[38px] flex items-center text-sm px-2 truncate">
              {edad !== '' ? `${edad} a. (${grupoEtario})` : '-'}
            </div>
          </div>
          <FormInput label="Peso Real (kg)" type="number" name="peso" value={d.peso} onChange={handleChange} />
          <FormInput label="Altura (cm)" type="number" name="altura" value={d.altura} onChange={handleChange} />
          <div className="flex flex-col justify-end">
            <span className="text-sm font-semibold text-slate-600 mb-1 truncate" title="IMC">IMC {imcLabel}</span>
            <div className={`p-2 rounded-md border h-[38px] flex items-center justify-center font-mono text-sm ${imcColorClass}`}>{imc || '-'}</div>
          </div>
          <ReadOnlyField label="Sup. Corp (m²)" value={sc} />
          <ReadOnlyField label="Peso Ideal (kg)" value={pesoIdeal} />
          <ReadOnlyField label="Peso Ajust." value={pesoAjustado} />
        </div>
        
        {/* NUEVA ADVERTENCIA DE CÁLCULOS */}
        <div className="mt-4 bg-blue-50 border border-blue-200 p-3 rounded-md text-xs text-blue-800 flex items-start">
           <AlertTriangle className="w-4 h-4 mr-2 shrink-0 mt-0.5" />
           <p><strong>Nota Clínica:</strong> Los cálculos de Edad, IMC, Superficie Corporal, Peso Ideal, Peso Ajustado y Tasa de Filtrado Glomerular son estimaciones matemáticas orientativas generadas automáticamente y <strong>no sustituyen el juicio clínico del profesional</strong> de la salud.</p>
        </div>
      </section>
    </div>
  );
}

function ConciliationTab({ patient, updatePatient }) {
  const i = patient.interview || {};
  const conc = patient.conciliacion || { ingresoNA: false, egresoNA: false, ingreso: [], egreso: [], transicionesArea: [], transicionMedico: false, transicionAreaNA: false, transicionMedicoNA: false };
  const [showInterviewModal, setShowInterviewModal] = useState(false);

  const handleAnswer = (qId, value) => updatePatient({ interview: { ...i, [qId]: value } });
  
  const addItem = (type) => {
    const newItem = {
      id: Date.now().toString(),
      principio: '',
      marcaComercial: '',
      dosis: '',
      frecuencia: '',
      via: '',
      desdeCuando: '',
      ultimaTomaMedicamento: '',
      activo: 'Continua',
      diasTratamiento: '',
      sabeParaQue: 'No',
      observacion: ''
    };
    updatePatient({ conciliacion: { ...conc, [type]: [...(conc[type] || []), newItem] } });
  };
  const updateItem = (type, id, field, value) => {
    const list = conc[type] || [];
    updatePatient({ conciliacion: { ...conc, [type]: list.map(item => item.id === id ? { ...item, [field]: value } : item) } });
  };
  const removeItem = (type, id) => updatePatient({ conciliacion: { ...conc, [type]: (conc[type] || []).filter(item => item.id !== id) } });

  const toggleNA = (field) => {
    updatePatient({ conciliacion: { ...conc, [field]: !conc[field] } });
  };

  const addTransicionArea = () => {
    const nuevaTransicion = { id: Date.now().toString(), fecha: new Date().toISOString().split('T')[0], origen: '', destino: '' };
    updatePatient({ conciliacion: { ...conc, transicionesArea: [...(conc.transicionesArea || []), nuevaTransicion] } });
  };
  const updateTransicionArea = (id, field, value) => {
    updatePatient({ conciliacion: { ...conc, transicionesArea: conc.transicionesArea.map(t => t.id === id ? { ...t, [field]: value } : t) } });
  };
  const removeTransicionArea = (id) => {
    updatePatient({ conciliacion: { ...conc, transicionesArea: conc.transicionesArea.filter(t => t.id !== id) } });
  };

  const sections = [...new Set(PREGUNTAS_ENTREVISTA.map(q => q.section))];

  return (
    <div className="space-y-8">
      <section className="fc-panel print:hidden">
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center border-b pb-2 mb-2">
          <h2 className="text-2xl font-bold text-slate-800">1. Entrevista de conciliación</h2>
          <button onClick={() => setShowInterviewModal(true)} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded text-sm flex items-center justify-center font-medium">
            <FileText className="w-4 h-4 mr-1" /> Abrir entrevista
          </button>
        </div>
        <p className="text-sm text-slate-600">Completa la entrevista en una ventana emergente para mantener la vista de conciliación más limpia.</p>
      </section>

      {showInterviewModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 p-4 flex items-center justify-center print:hidden" onClick={() => setShowInterviewModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="bg-indigo-600 text-white px-4 py-3 flex items-center justify-between">
              <h3 className="font-bold text-base sm:text-lg">Entrevista de conciliación</h3>
              <button onClick={() => setShowInterviewModal(false)} className="text-indigo-100 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
              {sections.map(sec => (
                <div key={sec} className="mb-4">
                  <h3 className="text-sm font-bold uppercase text-slate-500 mb-2">{sec}</h3>
                  <div className="space-y-2">
                    {PREGUNTAS_ENTREVISTA.filter(q => q.section === sec).map(q => (
                      <div key={q.id} className="flex flex-col md:flex-row md:items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-3 shadow-sm">
                        <span className="text-slate-700 text-sm font-medium md:w-1/2 mb-2 md:mb-0">{q.text}</span>
                        <input type="text" className="fc-input flex-1 md:ml-4" placeholder="Respuesta detallada..." value={i[q.id] || ''} onChange={(e) => handleAnswer(q.id, e.target.value)} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-200 px-4 py-3 flex justify-end bg-slate-50">
              <button onClick={() => setShowInterviewModal(false)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-sm font-medium">
                Guardar y cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="fc-panel print:bg-transparent print:border-none print:p-0 print:shadow-none">
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center border-b pb-2 mb-2">
          <h2 className="text-2xl font-bold text-slate-800">2. Conciliación al Ingreso</h2>
          {!conc.ingresoNA && (
            <button onClick={() => addItem('ingreso')} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm flex items-center justify-center font-medium print:hidden"><Plus className="w-4 h-4 mr-1" /> Añadir Fármaco</button>
          )}
        </div>
        <label className="flex items-center space-x-2 text-sm text-slate-600 mb-4 cursor-pointer w-max print:mb-2">
           <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" checked={conc.ingresoNA || false} onChange={() => toggleNA('ingresoNA')} />
           <span className="font-medium">No aplica / No se realizó (Paciente no tomaba medicamentos previos)</span>
        </label>
        
        {conc.ingresoNA ? (
          <div className="p-4 bg-slate-100 text-slate-500 rounded border border-slate-200 italic print:bg-transparent">Conciliación al ingreso marcada como No Aplica.</div>
        ) : (
          <ConciliationTable items={conc.ingreso || []} type="ingreso" onUpdate={updateItem} onRemove={removeItem} />
        )}
      </section>

      <section className="fc-panel bg-slate-50 print:bg-transparent print:border-none print:p-0 print:shadow-none">
        <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center print:border-b print:pb-2 print:mb-2"><CheckCircle className="w-5 h-5 mr-2 text-blue-600 print:text-black" /> 3. Conciliación de Transición (Checklist)</h2>
        <div className="flex flex-col space-y-4">
          
          <div className="bg-white p-4 rounded-lg border border-slate-200 print:border-b print:rounded-none">
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-3 border-b pb-2 print:border-none">
              <span className="font-medium text-slate-700">Se realizó conciliación por Cambio de Área</span>
              <button onClick={addTransicionArea} className="w-full sm:w-auto text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1.5 rounded font-bold transition flex items-center justify-center print:hidden" disabled={conc.transicionAreaNA}>
                <Plus className="w-3 h-3 mr-1" /> Registrar Cambio
              </button>
            </div>
            
            <label className="flex items-center space-x-2 text-sm text-slate-600 mb-4 cursor-pointer w-max print:mb-2">
               <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" checked={conc.transicionAreaNA || false} onChange={() => toggleNA('transicionAreaNA')} />
               <span className="font-medium">No aplica / No se realizó (No hubo cambios de área)</span>
            </label>

            {!conc.transicionAreaNA && (!conc.transicionesArea || conc.transicionesArea.length === 0) && (
              <p className="text-sm text-slate-400 italic">No hay cambios de área registrados.</p>
            )}
            {!conc.transicionAreaNA && conc.transicionesArea && conc.transicionesArea.length > 0 && (
              <div className="space-y-3">
                {conc.transicionesArea.map((t, index) => (
                  <div key={t.id} className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4 items-end bg-slate-50 p-3 rounded border border-slate-200 relative print:bg-transparent print:p-1">
                    <span className="absolute top-2 left-2 text-xs font-bold text-slate-400">#{index + 1}</span>
                    <div className="flex-1 w-full pl-6 md:pl-0"><FormInput label="Fecha del Cambio" type="date" value={t.fecha} onChange={(e) => updateTransicionArea(t.id, 'fecha', e.target.value)} /></div>
                    <div className="flex-1 w-full"><FormInput label="Área de Origen" value={t.origen} onChange={(e) => updateTransicionArea(t.id, 'origen', e.target.value)} placeholder="Ej. Urgencias" /></div>
                    <div className="flex-1 w-full"><FormInput label="Área de Destino" value={t.destino} onChange={(e) => updateTransicionArea(t.id, 'destino', e.target.value)} placeholder="Ej. Piso 3" /></div>
                    <button onClick={() => removeTransicionArea(t.id)} className="p-2 mb-1 text-red-500 hover:bg-red-100 rounded transition print:hidden"><Trash2 className="w-5 h-5"/></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-200 print:border-b print:rounded-none">
            <label className="flex items-center space-x-3 cursor-pointer mb-2">
              <input type="checkbox" className="w-5 h-5 text-blue-600 rounded" checked={conc.transicionMedico || false} onChange={(e) => updatePatient({ conciliacion: { ...conc, transicionMedico: e.target.checked } })} disabled={conc.transicionMedicoNA} />
              <span className={`font-medium ${conc.transicionMedicoNA ? 'text-slate-400' : 'text-slate-700'}`}>Se realizó conciliación por Cambio de Médico Tratante</span>
            </label>
            <label className="flex items-center space-x-2 text-sm text-slate-600 cursor-pointer w-max">
               <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" checked={conc.transicionMedicoNA || false} onChange={() => {
                   // Si lo marco como NA, desmarco el de "Se realizó"
                   const newVal = !conc.transicionMedicoNA;
                   updatePatient({ conciliacion: { ...conc, transicionMedicoNA: newVal, transicionMedico: newVal ? false : conc.transicionMedico } });
               }} />
               <span className="font-medium">No aplica (No hubo cambio de médico tratante)</span>
            </label>
          </div>
        </div>
      </section>

      <section className="fc-panel print:bg-transparent print:border-none print:p-0 print:shadow-none">
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center border-b pb-2 mb-2">
          <h2 className="text-2xl font-bold text-slate-800">4. Conciliación al Egreso</h2>
          {!conc.egresoNA && (
            <button onClick={() => addItem('egreso')} className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-sm flex items-center justify-center font-medium print:hidden"><Plus className="w-4 h-4 mr-1" /> Añadir Fármaco</button>
          )}
        </div>
        <label className="flex items-center space-x-2 text-sm text-slate-600 mb-4 cursor-pointer w-max print:mb-2">
           <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" checked={conc.egresoNA || false} onChange={() => toggleNA('egresoNA')} />
           <span className="font-medium">No aplica / No se realizó (Egresado sin medicamentos u otro motivo)</span>
        </label>
        
        {conc.egresoNA ? (
          <div className="p-4 bg-slate-100 text-slate-500 rounded border border-slate-200 italic print:bg-transparent">Conciliación al egreso marcada como No Aplica.</div>
        ) : (
          <ConciliationTable items={conc.egreso || []} type="egreso" onUpdate={updateItem} onRemove={removeItem} />
        )}
      </section>
    </div>
  );
}

function ConciliationTable({ items, type, onUpdate, onRemove }) {
  const isIngreso = type === 'ingreso';
  const emptyColSpan = isIngreso ? 9 : 9;

  return (
    <div className="overflow-x-auto overscroll-x-contain print:overflow-visible">
      <table className="min-w-[1120px] text-xs sm:text-sm border-collapse bg-white border border-slate-200 shadow-sm rounded-lg print:shadow-none print:border-slate-300">
        <thead className="bg-slate-50 border-b print:bg-slate-100">
          <tr>
            <th className="p-2 text-left font-semibold">Principio Activo</th>
            {isIngreso && <th className="p-2 text-left font-semibold w-24">Marca Com.</th>}
            <th className="p-2 text-left font-semibold w-24">Dosis</th>
            {!isIngreso && <th className="p-2 text-left font-semibold w-24">Frecuencia</th>}
            <th className="p-2 text-left font-semibold w-20">Vía</th>
            {isIngreso && <th className="p-2 text-left font-semibold w-32">Desde Cuándo</th>}
            {isIngreso && <th className="p-2 text-left font-semibold w-36">Última toma medicamento</th>}
            {!isIngreso && <th className="p-2 text-left font-semibold w-28" title="Cuántos días lo tomará al egreso">Días Tratm.</th>}
            {!isIngreso && <th className="p-2 text-center font-semibold w-24" title="¿Sabe para qué se lo tomará?">¿Sabe uso?</th>}
            {isIngreso && <th className="p-2 text-left font-semibold w-28">Estado</th>}
            <th className="p-2 text-left font-semibold">Observaciones</th>
            <th className="p-2 text-center font-semibold w-10 print:hidden"></th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && <tr><td colSpan={emptyColSpan} className="p-4 text-center text-slate-500">No hay medicamentos registrados.</td></tr>}
          {items.map(item => (
            <tr key={item.id} className="border-b hover:bg-slate-50">
              <td className="p-1"><input type="text" className="w-full border-slate-300 rounded text-sm print:border-none print:bg-transparent" value={item.principio} onChange={(e) => onUpdate(type, item.id, 'principio', e.target.value)} /></td>
              
              {isIngreso && <td className="p-1"><input type="text" className="w-full border-slate-300 rounded text-sm print:border-none print:bg-transparent" placeholder="Opcional" value={item.marcaComercial || ''} onChange={(e) => onUpdate(type, item.id, 'marcaComercial', e.target.value)} /></td>}
              
              <td className="p-1"><input type="text" className="w-full border-slate-300 rounded text-sm print:border-none print:bg-transparent" value={item.dosis} onChange={(e) => onUpdate(type, item.id, 'dosis', e.target.value)} /></td>
              {!isIngreso && <td className="p-1"><input type="text" className="w-full border-slate-300 rounded text-sm print:border-none print:bg-transparent" value={item.frecuencia || ''} onChange={(e) => onUpdate(type, item.id, 'frecuencia', e.target.value)} /></td>}
              <td className="p-1"><select className="w-full border-slate-300 rounded text-sm p-1 print:appearance-none print:border-none print:bg-transparent" value={item.via} onChange={(e) => onUpdate(type, item.id, 'via', e.target.value)}><option value="">-</option>{VIAS.map(v => <option key={v} value={v}>{v}</option>)}</select></td>
              
              {isIngreso && <td className="p-1"><input type="text" className="w-full border-slate-300 rounded text-sm print:border-none print:bg-transparent" placeholder="Ej. 2 meses" value={item.desdeCuando || ''} onChange={(e) => onUpdate(type, item.id, 'desdeCuando', e.target.value)} /></td>}
              {isIngreso && <td className="p-1"><input type="date" className="w-full border-slate-300 rounded text-sm p-1 print:border-none print:bg-transparent" value={item.ultimaTomaMedicamento || ''} onChange={(e) => onUpdate(type, item.id, 'ultimaTomaMedicamento', e.target.value)} /></td>}
              
              {!isIngreso && <td className="p-1"><input type="text" className="w-full border-slate-300 rounded text-sm print:border-none print:bg-transparent" placeholder="Ej. 7 días" value={item.diasTratamiento || ''} onChange={(e) => onUpdate(type, item.id, 'diasTratamiento', e.target.value)} /></td>}
              {!isIngreso && (
                <td className="p-1 text-center">
                  <select className="w-full border-slate-300 rounded text-sm p-1 print:appearance-none print:border-none print:bg-transparent" value={item.sabeParaQue || 'No'} onChange={(e) => onUpdate(type, item.id, 'sabeParaQue', e.target.value)}>
                    <option value="Sí">Sí</option><option value="No">No</option>
                  </select>
                </td>
              )}
              
              {isIngreso && (
                <td className="p-1">
                  <select className="w-full border-slate-300 rounded text-sm p-1 print:appearance-none print:border-none print:bg-transparent" value={item.activo} onChange={(e) => onUpdate(type, item.id, 'activo', e.target.value)}>
                    <option value="Continua">Continua</option><option value="Suspende">Suspende</option><option value="Modifica">Modifica</option>
                  </select>
                </td>
              )}
              <td className="p-1"><input type="text" className="w-full border-slate-300 rounded text-sm print:border-none print:bg-transparent" value={item.observacion} onChange={(e) => onUpdate(type, item.id, 'observacion', e.target.value)} /></td>
              <td className="p-1 text-center print:hidden"><button onClick={() => onRemove(type, item.id)} className="text-red-500 hover:text-red-700 p-1"><Trash2 className="w-4 h-4" /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PharmacotherapyTab({ patient, sourcePatient, updatePatient }) {
  const items = patient.perfilFarmaco || [];
  const solItems = patient.solucionesIV || [];
  const meta = patient.perfilFarmacoMeta || { evaluadoPrevioPrimeraDosis: false };
  const [detailModal, setDetailModal] = useState({ open: false, type: 'pharma', itemId: '' });
  const [deleteModal, setDeleteModal] = useState({ open: false, type: 'pharma', itemId: '', label: '' });
  const persistedPharmaById = useMemo(
    () => new Map((sourcePatient?.perfilFarmaco || []).map((item) => [item.id, item])),
    [sourcePatient?.perfilFarmaco],
  );
  const persistedSolById = useMemo(
    () => new Map((sourcePatient?.solucionesIV || []).map((item) => [item.id, item])),
    [sourcePatient?.solucionesIV],
  );

  const PHARMA_MODAL_FIELDS = ['presentacion', 'via', 'frecuencia', 'volumen', 'tiempo', 'velocidad', 'idoneidad', 'fechaSuspension', 'observaciones', 'prn', 'prnSituacion'];
  const PHARMA_DEFAULTS = {
    presentacion: '',
    via: '',
    frecuencia: '',
    volumen: '',
    tiempo: '',
    velocidad: '',
    idoneidad: 'Pendiente',
    fechaSuspension: '',
    observaciones: '',
    prn: false,
    prnSituacion: '',
  };

  const SOL_MODAL_FIELDS = ['tiempo', 'velocidad', 'frecuencia', 'fechaSuspension'];
  const SOL_DEFAULTS = {
    tiempo: '',
    velocidad: '',
    frecuencia: '',
    fechaSuspension: '',
  };

  const normalizeFieldValue = (value) => {
    if (value === undefined || value === null) return '';
    return String(value).trim();
  };

  const hasModalOnlyChanges = (currentItem, persistedItem, fields, defaults = {}) => {
    if (!currentItem) return false;

    if (!persistedItem) {
      return fields.some((field) => normalizeFieldValue(currentItem[field]) !== normalizeFieldValue(defaults[field] ?? ''));
    }

    return fields.some((field) => normalizeFieldValue(currentItem[field]) !== normalizeFieldValue(persistedItem[field]));
  };

  const recalculateInfusionFields = (item, field) => {
    const updatedItem = { ...item };
    const v = parseFloat(updatedItem.volumen);
    const t = parseFloat(updatedItem.tiempo);
    const r = parseFloat(updatedItem.velocidad);
    const hasV = Number.isFinite(v) && v > 0;
    const hasT = Number.isFinite(t) && t > 0;
    const hasR = Number.isFinite(r) && r > 0;

    if (field === 'volumen') {
      if (hasV && hasT) updatedItem.velocidad = (v / t).toFixed(2);
      else if (hasV && hasR) updatedItem.tiempo = (v / r).toFixed(2);
      else if (!hasV) {
        updatedItem.tiempo = '';
        updatedItem.velocidad = '';
      }
    } else if (field === 'tiempo') {
      if (hasV && hasT) updatedItem.velocidad = (v / t).toFixed(2);
      else if (!hasT) updatedItem.velocidad = '';
    } else if (field === 'velocidad') {
      if (hasV && hasR) updatedItem.tiempo = (v / r).toFixed(2);
      else if (!hasR) updatedItem.tiempo = '';
    }

    return updatedItem;
  };

  const addItem = () => {
    const newItem = { id: Date.now().toString(), categoria: '', principio: '', marcaComercial: '', presentacion: '', dosis: '', via: '', frecuencia: '', volumen: '', tiempo: '', velocidad: '', fechaInicio: new Date().toISOString().split('T')[0], estado: 'Activo', idoneidad: 'Pendiente', fechaSuspension: '', observaciones: '', prn: false, prnSituacion: '' };
    updatePatient({ perfilFarmaco: [...items, newItem] });
  };

  const updateItem = (id, field, value) => {
    const newList = items.map((item) => {
      if (item.id !== id) return item;
      let updatedItem = { ...item, [field]: value };
      if (field === 'volumen' || field === 'tiempo' || field === 'velocidad') {
        updatedItem = recalculateInfusionFields(updatedItem, field);
      }
      return updatedItem;
    });
    updatePatient({ perfilFarmaco: newList });
  };

  const updateItemStatus = (id, estado) => {
    const today = new Date().toISOString().split('T')[0];
    const newList = items.map((item) => {
      if (item.id !== id) return item;
      return {
        ...item,
        estado,
        fechaSuspension: estado === 'Suspendido' ? (item.fechaSuspension || today) : '',
      };
    });
    updatePatient({ perfilFarmaco: newList });
  };

  const removeItem = (id) => updatePatient({ perfilFarmaco: items.filter((item) => item.id !== id) });

  const addSolucion = () => {
    const newItem = { id: Date.now().toString(), solucion: '', volumen: '', tiempo: '', velocidad: '', frecuencia: '', fechaInicio: new Date().toISOString().split('T')[0], estado: 'Activo', fechaSuspension: '' };
    updatePatient({ solucionesIV: [...solItems, newItem] });
  };

  const updateSolucion = (id, field, value) => {
    const newList = solItems.map((item) => {
      if (item.id !== id) return item;
      let updatedItem = { ...item, [field]: value };
      if (field === 'volumen' || field === 'tiempo' || field === 'velocidad') {
        updatedItem = recalculateInfusionFields(updatedItem, field);
      }
      return updatedItem;
    });
    updatePatient({ solucionesIV: newList });
  };

  const updateSolucionStatus = (id, estado) => {
    const today = new Date().toISOString().split('T')[0];
    const newList = solItems.map((item) => {
      if (item.id !== id) return item;
      return {
        ...item,
        estado,
        fechaSuspension: estado === 'Suspendido' ? (item.fechaSuspension || today) : '',
      };
    });
    updatePatient({ solucionesIV: newList });
  };

  const removeSolucion = (id) => updatePatient({ solucionesIV: solItems.filter((item) => item.id !== id) });
  const updateMeta = (field, value) => updatePatient({ perfilFarmacoMeta: { ...meta, [field]: value } });

  const pendientes = items.filter((i) => !CATEGORIAS_FARMACO.includes(i.categoria));
  const atbs = items.filter((i) => i.categoria === 'Antibiótico');
  const altos = items.filter((i) => i.categoria === 'Alto Riesgo');
  const gens = items.filter((i) => i.categoria === 'General');

  const openPharmaDetail = (itemId) => setDetailModal({ open: true, type: 'pharma', itemId });
  const openSolucionDetail = (itemId) => setDetailModal({ open: true, type: 'solucion', itemId });
  const closeDetailModal = () => setDetailModal({ open: false, type: 'pharma', itemId: '' });
  const closeDeleteModal = () => setDeleteModal({ open: false, type: 'pharma', itemId: '', label: '' });

  const requestDeletePharma = (item) => {
    setDeleteModal({
      open: true,
      type: 'pharma',
      itemId: item.id,
      label: item.principio || 'este medicamento',
    });
  };

  const requestDeleteSolucion = (item) => {
    setDeleteModal({
      open: true,
      type: 'solucion',
      itemId: item.id,
      label: item.solucion || 'esta solución IV',
    });
  };

  const confirmDeleteItem = () => {
    if (!deleteModal.itemId) {
      closeDeleteModal();
      return;
    }

    if (deleteModal.type === 'pharma') removeItem(deleteModal.itemId);
    if (deleteModal.type === 'solucion') removeSolucion(deleteModal.itemId);
    closeDeleteModal();
  };

  const selectedPharmaItem = detailModal.type === 'pharma'
    ? items.find((item) => item.id === detailModal.itemId) || null
    : null;

  const selectedSolucionItem = detailModal.type === 'solucion'
    ? solItems.find((item) => item.id === detailModal.itemId) || null
    : null;

  useEffect(() => {
    if (!detailModal.open) return;
    if (detailModal.type === 'pharma' && !selectedPharmaItem) closeDetailModal();
    if (detailModal.type === 'solucion' && !selectedSolucionItem) closeDetailModal();
  }, [detailModal, selectedPharmaItem, selectedSolucionItem]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center border-b pb-2">
        <h2 className="text-2xl font-bold text-slate-800">Prescripciones Intrahospitalarias</h2>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button onClick={addSolucion} className="w-full sm:w-auto bg-cyan-600 hover:bg-cyan-700 text-white px-3 py-2 rounded text-sm flex items-center justify-center font-medium shadow-sm print:hidden"><Plus className="w-4 h-4 mr-1" /> Añadir Solución IV</button>
          <button onClick={addItem} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm flex items-center justify-center font-medium shadow-sm print:hidden"><Plus className="w-4 h-4 mr-1" /> Añadir Fármaco</button>
        </div>
      </div>

      <div className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-800 flex items-center gap-2">
        <span className="inline-block w-3 h-3 rounded-full bg-violet-500" aria-hidden="true"></span>
        Si una fila aparece en morado, significa que es un medicamento PRN (Por Razón Necesaria).
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 flex justify-start sm:justify-end shadow-sm print:bg-transparent print:border-none print:shadow-none mb-4">
        <label className="flex items-center space-x-2 cursor-pointer bg-white px-3 py-1.5 rounded-md shadow-sm border border-blue-200 print:border-none print:shadow-none print:bg-transparent print:p-0 w-full sm:w-auto">
          <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" checked={meta.evaluadoPrevioPrimeraDosis} onChange={(e) => updateMeta('evaluadoPrevioPrimeraDosis', e.target.checked)} />
          <span className="font-semibold text-sm text-slate-800">Idoneidad evaluada antes de 1ra dosis</span>
        </label>
      </div>

      {pendientes.length > 0 && (
        <PharmaSection
          title="Clasificación inicial de fármacos"
          items={pendientes}
          updateItem={updateItem}
          updateItemStatus={updateItemStatus}
          onDeleteItem={requestDeletePharma}
          onViewItem={openPharmaDetail}
          hasModalOnlyChanges={(item) => hasModalOnlyChanges(item, persistedPharmaById.get(item.id), PHARMA_MODAL_FIELDS, PHARMA_DEFAULTS)}
          theme="blue"
        />
      )}
      <PharmaSection
        title="Terapia Antimicrobiana"
        items={atbs}
        updateItem={updateItem}
        updateItemStatus={updateItemStatus}
        onDeleteItem={requestDeletePharma}
        onViewItem={openPharmaDetail}
        hasModalOnlyChanges={(item) => hasModalOnlyChanges(item, persistedPharmaById.get(item.id), PHARMA_MODAL_FIELDS, PHARMA_DEFAULTS)}
        theme="orange"
      />
      <PharmaSection
        title="Medicamentos de Alto Riesgo"
        items={altos}
        updateItem={updateItem}
        updateItemStatus={updateItemStatus}
        onDeleteItem={requestDeletePharma}
        onViewItem={openPharmaDetail}
        hasModalOnlyChanges={(item) => hasModalOnlyChanges(item, persistedPharmaById.get(item.id), PHARMA_MODAL_FIELDS, PHARMA_DEFAULTS)}
        theme="red"
      />
      <PharmaSection
        title="Medicamentos Generales"
        items={gens}
        updateItem={updateItem}
        updateItemStatus={updateItemStatus}
        onDeleteItem={requestDeletePharma}
        onViewItem={openPharmaDetail}
        hasModalOnlyChanges={(item) => hasModalOnlyChanges(item, persistedPharmaById.get(item.id), PHARMA_MODAL_FIELDS, PHARMA_DEFAULTS)}
        theme="blue"
      />

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden mb-6 print:border-slate-300 print:shadow-none mt-8">
        <div className="px-4 py-2 font-bold border-b bg-cyan-100 text-cyan-900 border-cyan-200 print:bg-slate-100 print:text-black print:border-slate-300">Soluciones Intravenosas (Fluidos)</div>
        <div className="overflow-x-auto md:overflow-x-visible overscroll-x-contain print:overflow-visible">
          <table className="w-full min-w-[720px] md:min-w-0 table-fixed text-[11px] md:text-xs lg:text-sm border-collapse">
            <thead className="bg-slate-50 border-b print:bg-white">
              <tr>
                <th className="p-1.5 md:p-2 text-left font-semibold uppercase tracking-wide text-[10px] md:text-[11px] text-slate-600 w-[12%]">Categoría</th>
                <th className="p-1.5 md:p-2 text-left font-semibold uppercase tracking-wide text-[10px] md:text-[11px] text-slate-600 w-[28%]">Principio Activo</th>
                <th className="p-1.5 md:p-2 text-left font-semibold uppercase tracking-wide text-[10px] md:text-[11px] text-slate-600 w-[8%]">Marca Com.</th>
                <th className="p-1.5 md:p-2 text-left font-semibold uppercase tracking-wide text-[10px] md:text-[11px] text-slate-600 w-[14%]">Dosis</th>
                <th className="p-1.5 md:p-2 text-left font-semibold uppercase tracking-wide text-[10px] md:text-[11px] text-slate-600 w-[15%]">F. Inicio</th>
                <th className="p-1.5 md:p-2 text-left font-semibold uppercase tracking-wide text-[10px] md:text-[11px] text-slate-600 w-[13%]">Estado</th>
                <th className="p-1.5 md:p-2 text-center font-semibold uppercase tracking-wide text-[10px] md:text-[11px] text-slate-600 w-[10%] print:hidden">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {solItems.length === 0 && <tr><td colSpan="7" className="p-3 text-center text-slate-400 italic">No hay soluciones IV registradas.</td></tr>}
              {solItems.map((item) => {
                const isSuspended = item.estado === 'Suspendido';
                const modalOnlyChanged = hasModalOnlyChanges(item, persistedSolById.get(item.id), SOL_MODAL_FIELDS, SOL_DEFAULTS);

                return (
                  <tr key={item.id} className={`border-b border-slate-200 transition-colors ${isSuspended ? 'bg-slate-100/90 opacity-80 print:opacity-100 print:bg-slate-50' : 'hover:bg-cyan-50/50'}`}>
                    <td className="p-1.5 md:p-2 text-[11px] font-semibold text-cyan-800">Solución IV</td>
                    <td className="p-1 md:p-1.5"><input type="text" placeholder="Ej. Sol. Salina 0.9%" className={`w-full h-8 lg:h-9 border-slate-300 rounded-md text-xs lg:text-sm font-medium print:border-none print:bg-transparent ${isSuspended ? 'line-through text-slate-500 bg-slate-200' : ''}`} value={item.solucion} onChange={(e) => updateSolucion(item.id, 'solucion', e.target.value)} /></td>
                    <td className="p-1.5 md:p-2 text-center text-slate-400">-</td>
                    <td className="p-1 md:p-1.5"><input type="number" step="0.1" className={`w-full h-8 lg:h-9 border-slate-300 rounded-md text-xs lg:text-sm print:border-none print:bg-transparent ${isSuspended ? 'bg-slate-200' : ''}`} value={item.volumen || ''} onChange={(e) => updateSolucion(item.id, 'volumen', e.target.value)} /></td>
                    <td className="p-1 md:p-1.5"><input type="date" className={`w-full h-8 lg:h-9 border-slate-300 rounded-md text-xs lg:text-sm p-1 md:p-1.5 print:border-none print:bg-transparent ${isSuspended ? 'bg-slate-200' : ''}`} value={item.fechaInicio} onChange={(e) => updateSolucion(item.id, 'fechaInicio', e.target.value)} /></td>
                    <td className="p-1 md:p-1.5">
                      <select className={`w-full h-8 lg:h-9 rounded-md text-xs lg:text-sm p-1 md:p-1.5 font-semibold border print:appearance-none print:border-none print:bg-transparent ${isSuspended ? 'bg-red-100 text-red-800 border-red-300' : 'bg-green-50 text-green-800 border-green-300'}`} value={item.estado} onChange={(e) => updateSolucionStatus(item.id, e.target.value)}>
                        <option value="Activo">Activo</option>
                        <option value="Suspendido">Suspendido</option>
                      </select>
                    </td>
                    <td className="p-1 md:p-1.5 text-center print:hidden">
                      <div className="flex items-center justify-center gap-1.5 lg:gap-2">
                        <button onClick={() => openSolucionDetail(item.id)} className={`inline-flex h-8 w-8 lg:h-9 lg:w-9 items-center justify-center rounded-md border shadow-sm transition ${modalOnlyChanged ? 'border-violet-300 bg-violet-100 text-violet-700 hover:bg-violet-200 hover:border-violet-400' : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-300'}`} title={modalOnlyChanged ? 'Hay cambios pendientes en campos del detalle' : 'Ver detalle'}><Eye className="w-4 h-4" /></button>
                        <button onClick={() => requestDeleteSolucion(item)} className="inline-flex h-8 w-8 lg:h-9 lg:w-9 items-center justify-center rounded-md border border-red-200 bg-red-50 text-red-700 shadow-sm hover:bg-red-100 hover:border-red-300 transition" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {deleteModal.open && (
        <div className="fixed inset-0 z-[90] bg-slate-900/60 backdrop-blur-[1px] flex items-center justify-center p-4 print:hidden" onClick={closeDeleteModal}>
          <div className="w-full max-w-md rounded-xl border border-red-200 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-red-100 bg-red-50 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white border border-red-200 text-red-700 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Confirmar eliminación</h3>
                <p className="text-xs text-slate-600">Esta acción no se puede deshacer.</p>
              </div>
            </div>
            <div className="px-5 py-4 space-y-2">
              <p className="text-sm text-slate-700 leading-relaxed">
                ¿Deseas eliminar {deleteModal.type === 'solucion' ? 'la solución IV' : 'el medicamento'} <span className="font-semibold text-slate-900">"{deleteModal.label}"</span>?
              </p>
            </div>
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button onClick={closeDeleteModal} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-100 font-medium">Cancelar</button>
              <button onClick={confirmDeleteItem} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {detailModal.open && (
        <MedicationDetailModal
          type={detailModal.type}
          item={detailModal.type === 'pharma' ? selectedPharmaItem : selectedSolucionItem}
          onClose={closeDetailModal}
          onPharmaFieldChange={updateItem}
          onPharmaStatusChange={updateItemStatus}
          onSolFieldChange={updateSolucion}
          onSolStatusChange={updateSolucionStatus}
          patient={patient}
        />
      )}
    </div>
  );
}

function PharmaSection({ title, items, updateItem, updateItemStatus, onDeleteItem, onViewItem, hasModalOnlyChanges, theme }) {
  const headerColors = { orange: 'bg-orange-100 text-orange-900 border-orange-200', red: 'bg-red-100 text-red-900 border-red-200', blue: 'bg-slate-100 text-slate-800 border-slate-200' };
  const isMarSection = title === 'Medicamentos de Alto Riesgo';

  const sortedItems = [...items].sort((a, b) => {
    if (a.estado === 'Suspendido' && b.estado !== 'Suspendido') return 1;
    if (a.estado !== 'Suspendido' && b.estado === 'Suspendido') return -1;
    return 0;
  });

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-visible mb-6 print:border-slate-300 print:shadow-none">
      <div className={`px-4 py-2 font-bold border-b ${headerColors[theme]} print:bg-slate-100 print:text-black print:border-slate-300 flex items-center justify-between gap-3`}>
        <span>{title}</span>
        {isMarSection && (
          <div className="relative group print:hidden">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-full p-1.5 bg-white/70 border border-red-300 text-red-700 hover:bg-white focus:outline-none focus:ring-2 focus:ring-red-400"
              aria-label="Ver guía de medicamentos de alto riesgo"
              title="Ver recomendaciones MAR"
            >
              <CircleHelp className="w-4 h-4" />
            </button>
            <div className="absolute right-0 top-10 z-20 w-72 rounded-lg border border-red-200 bg-white p-3 text-xs text-slate-700 shadow-xl opacity-0 pointer-events-none transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
              <p className="font-bold text-red-800 mb-1">MAR</p>
              <p className="text-slate-500 mb-2">Medicamentos de alto riesgo (ejemplos):</p>
              <ol className="list-decimal pl-4 space-y-0.5">
                {MAR_RECOMENDACIONES.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </div>

      <div className="overflow-x-auto md:overflow-x-visible overscroll-x-contain print:overflow-visible">
        <table className="w-full min-w-[720px] md:min-w-0 table-fixed text-[11px] md:text-xs lg:text-sm border-collapse">
          <thead className="bg-slate-50 border-b print:bg-white">
            <tr>
              <th className="p-1.5 md:p-2 text-left font-semibold uppercase tracking-wide text-[10px] md:text-[11px] text-slate-600 w-[12%]">Categoría</th>
              <th className="p-1.5 md:p-2 text-left font-semibold uppercase tracking-wide text-[10px] md:text-[11px] text-slate-600 w-[26%]">Principio Activo</th>
              <th className="p-1.5 md:p-2 text-left font-semibold uppercase tracking-wide text-[10px] md:text-[11px] text-slate-600 w-[15%]">Marca Com.</th>
              <th className="p-1.5 md:p-2 text-left font-semibold uppercase tracking-wide text-[10px] md:text-[11px] text-slate-600 w-[14%]">Dosis</th>
              <th className="p-1.5 md:p-2 text-left font-semibold uppercase tracking-wide text-[10px] md:text-[11px] text-slate-600 w-[15%]">F. Inicio</th>
              <th className="p-1.5 md:p-2 text-left font-semibold uppercase tracking-wide text-[10px] md:text-[11px] text-slate-600 w-[12%]">Estado</th>
              <th className="p-1.5 md:p-2 text-center font-semibold uppercase tracking-wide text-[10px] md:text-[11px] text-slate-600 w-[10%] print:hidden">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.length === 0 && <tr><td colSpan="7" className="p-3 text-center text-slate-400 italic">No hay registros.</td></tr>}
            {sortedItems.map((item) => {
              const isSuspended = item.estado === 'Suspendido';
              const isPrn = item.prn === true;
              const modalOnlyChanged = hasModalOnlyChanges?.(item) === true;

              return (
                <tr key={item.id} className={`border-b border-slate-200 transition-colors ${isPrn ? 'bg-violet-100/75 hover:bg-violet-100/90 [&_input]:bg-violet-50 [&_select]:bg-violet-50 [&_input]:border-violet-200 [&_select]:border-violet-200' : isSuspended ? 'bg-slate-100/90 opacity-80 print:opacity-100 print:bg-slate-50' : 'hover:bg-slate-50/70'} ${isPrn && isSuspended ? 'opacity-80 print:opacity-100' : ''}`}>
                  <td className="p-1 md:p-1.5"><select className={`w-full h-8 lg:h-9 border-slate-300 rounded-md text-xs lg:text-sm p-1 md:p-1.5 print:appearance-none print:border-none print:bg-transparent ${isSuspended ? 'bg-slate-200' : ''}`} value={item.categoria} onChange={(e) => updateItem(item.id, 'categoria', e.target.value)}><option value="">Seleccionar</option>{CATEGORIAS_FARMACO.map((c) => <option key={c} value={c}>{c}</option>)}</select></td>
                  <td className="p-1 md:p-1.5"><input type="text" className={`w-full h-8 lg:h-9 border-slate-300 rounded-md text-xs lg:text-sm font-medium print:border-none print:bg-transparent ${isSuspended ? 'line-through text-slate-500 bg-slate-200' : ''}`} value={item.principio} onChange={(e) => updateItem(item.id, 'principio', e.target.value)} /></td>
                  <td className="p-1 md:p-1.5"><input type="text" className={`w-full h-8 lg:h-9 border-slate-300 rounded-md text-xs lg:text-sm print:border-none print:bg-transparent ${isSuspended ? 'bg-slate-200' : ''}`} placeholder="Opcional" value={item.marcaComercial || ''} onChange={(e) => updateItem(item.id, 'marcaComercial', e.target.value)} /></td>
                  <td className="p-1 md:p-1.5"><input type="text" className={`w-full h-8 lg:h-9 border-slate-300 rounded-md text-xs lg:text-sm print:border-none print:bg-transparent ${isSuspended ? 'bg-slate-200' : ''}`} value={item.dosis} onChange={(e) => updateItem(item.id, 'dosis', e.target.value)} /></td>
                  <td className="p-1 md:p-1.5"><input type="date" className={`w-full h-8 lg:h-9 border-slate-300 rounded-md text-xs lg:text-sm p-1 md:p-1.5 print:border-none print:bg-transparent ${isSuspended ? 'bg-slate-200' : ''}`} value={item.fechaInicio} onChange={(e) => updateItem(item.id, 'fechaInicio', e.target.value)} /></td>
                  <td className="p-1 md:p-1.5">
                    <select className={`w-full h-8 lg:h-9 rounded-md text-xs lg:text-sm p-1 md:p-1.5 font-semibold border print:appearance-none print:border-none print:bg-transparent ${isPrn ? 'bg-violet-100 text-violet-800 border-violet-300' : isSuspended ? 'bg-red-100 text-red-800 border-red-300' : 'bg-green-50 text-green-800 border-green-300'}`} value={item.estado} onChange={(e) => updateItemStatus(item.id, e.target.value)}>
                      <option value="Activo">Activo</option>
                      <option value="Suspendido">Suspendido</option>
                    </select>
                  </td>
                  <td className="p-1 md:p-1.5 text-center print:hidden">
                    <div className="flex items-center justify-center gap-1.5 lg:gap-2">
                      <button onClick={() => onViewItem(item.id)} className={`inline-flex h-8 w-8 lg:h-9 lg:w-9 items-center justify-center rounded-md border shadow-sm transition ${modalOnlyChanged ? 'border-violet-300 bg-violet-100 text-violet-700 hover:bg-violet-200 hover:border-violet-400' : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-300'}`} title={modalOnlyChanged ? 'Hay cambios pendientes en campos del detalle' : 'Ver detalle'}><Eye className="w-4 h-4" /></button>
                      <button onClick={() => onDeleteItem(item)} className="inline-flex h-8 w-8 lg:h-9 lg:w-9 items-center justify-center rounded-md border border-red-200 bg-red-50 text-red-700 shadow-sm hover:bg-red-100 hover:border-red-300 transition" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MedicationDetailModal({ type, item, onClose, onPharmaFieldChange, onPharmaStatusChange, onSolFieldChange, onSolStatusChange, patient }) {
  if (!item) return null;

  const isSolution = type === 'solucion';
  const isHighRiskMed = !isSolution && item.categoria === 'Alto Riesgo';
  const isSuspended = item.estado === 'Suspendido';
  const endDate = isSuspended ? item.fechaSuspension : patient.demographics.egreso;
  const days = calculateDaysOfUse(item.fechaInicio, endDate);
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [showMarHelp, setShowMarHelp] = useState(false);

  const requestClose = useCallback(() => {
    setIsVisible(false);
    setIsClosing((prev) => prev || true);
  }, []);

  useEffect(() => {
    const frameId = requestAnimationFrame(() => setIsVisible(true));
    return () => cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    if (!isClosing) return undefined;
    const timeoutId = setTimeout(() => {
      onClose();
    }, 180);
    return () => clearTimeout(timeoutId);
  }, [isClosing, onClose]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') requestClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [requestClose]);

  useEffect(() => {
    setShowMarHelp(false);
  }, [item.id, isHighRiskMed]);

  const updateStatus = (value) => {
    if (isSolution) {
      onSolStatusChange(item.id, value);
      return;
    }
    onPharmaStatusChange(item.id, value);
  };

  const updateField = (field, value) => {
    if (isSolution) {
      onSolFieldChange(item.id, field, value);
      return;
    }
    onPharmaFieldChange(item.id, field, value);
  };

  return (
    <div
      className={`fixed inset-0 z-[85] flex items-center justify-center p-2 sm:p-4 lg:p-6 print:hidden transition-all duration-200 ${isVisible ? 'bg-slate-900/65 backdrop-blur-[1px] opacity-100' : 'bg-slate-900/0 backdrop-blur-0 opacity-0'}`}
      onClick={requestClose}
    >
      <div
        className={`w-full max-w-[98vw] sm:max-w-[94vw] md:max-w-[92vw] lg:max-w-6xl max-h-[96vh] md:max-h-[92vh] overflow-hidden rounded-xl md:rounded-2xl bg-gradient-to-br from-sky-200 via-violet-100 to-cyan-100 p-[1px] shadow-2xl transition-all duration-200 ${isVisible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-4 scale-[0.98] opacity-0'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-full w-full overflow-hidden rounded-[inherit] bg-white">
          <div className="px-4 sm:px-5 py-4 border-b border-white/30 bg-gradient-to-r from-sky-600 via-blue-700 to-indigo-700 flex items-center justify-between gap-3 text-white">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-white/15 border border-white/25 text-white flex items-center justify-center shadow-sm"><Eye className="w-5 h-5" /></div>
              <div className="min-w-0">
                <h3 className="font-bold text-white truncate">{isSolution ? 'Detalle de Solución IV' : 'Detalle de Medicamento'}</h3>
                <p className="text-xs text-blue-100 truncate">{isSolution ? (item.solucion || 'Sin nombre') : (item.principio || 'Sin nombre')}</p>
                <div className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
                  <span className="px-2 py-0.5 rounded-full border border-white/30 bg-white/10">{item.estado || 'Sin estado'}</span>
                  <span className="px-2 py-0.5 rounded-full border border-white/30 bg-white/10">{isSolution ? 'Solución IV' : (item.categoria || 'Sin categoría')}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isHighRiskMed && (
                <button
                  type="button"
                  onClick={() => setShowMarHelp((prev) => !prev)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-semibold transition ${showMarHelp ? 'border-red-200 bg-red-100 text-red-800' : 'border-white/40 bg-white/15 text-white hover:bg-white/25'}`}
                  title="Ver recomendaciones MAR"
                  aria-label="Ver recomendaciones MAR"
                >
                  <CircleHelp className="w-3.5 h-3.5" /> MAR
                </button>
              )}
              <button onClick={requestClose} className="p-2 rounded-lg text-white/90 hover:text-white hover:bg-white/15"><X className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="p-3 sm:p-4 md:p-5 overflow-y-auto max-h-[calc(96vh-190px)] md:max-h-[calc(92vh-198px)] space-y-4 bg-gradient-to-b from-white to-sky-50/30">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2.5"><p className="text-emerald-700">Estado</p><p className="font-bold text-emerald-900 mt-0.5">{item.estado || '-'}</p></div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-2.5"><p className="text-blue-700">Fecha inicio</p><p className="font-bold text-blue-900 mt-0.5">{item.fechaInicio || '-'}</p></div>
              <div className="rounded-xl border border-violet-200 bg-violet-50 p-2.5"><p className="text-violet-700">Días activos</p><p className="font-bold text-violet-900 mt-0.5">{item.fechaInicio ? days : '-'}</p></div>
              <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-2.5"><p className="text-cyan-700">Categoría</p><p className="font-bold text-cyan-900 mt-0.5">{isSolution ? 'Solución IV' : (item.categoria || '-')}</p></div>
            </div>

            {isHighRiskMed && showMarHelp && (
              <div className="rounded-xl border border-red-200 bg-white/95 p-3 text-xs text-slate-700 shadow-sm">
                <p className="font-bold text-red-700 mb-1">Recomendaciones MAR</p>
                <p className="text-slate-500 mb-2">Medicamentos de alto riesgo a vigilar:</p>
                <ol className="list-decimal pl-4 space-y-0.5">
                  {MAR_RECOMENDACIONES.map((marItem) => (
                    <li key={marItem}>{marItem}</li>
                  ))}
                </ol>
              </div>
            )}

            {!isSolution ? (
              <>
                <div className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-blue-50 p-3 sm:p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center"><ListChecks className="w-4 h-4" /></div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-700">Vista principal (orden de tabla)</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                    <div className="rounded-lg border border-white/80 bg-white/80 p-2 shadow-sm"><FormSelect label="Categoría" value={item.categoria || ''} onChange={(e) => updateField('categoria', e.target.value)} options={CATEGORIAS_FARMACO} /></div>
                    <div className="rounded-lg border border-white/80 bg-white/80 p-2 shadow-sm"><FormInput label="Principio Activo" value={item.principio || ''} onChange={(e) => updateField('principio', e.target.value)} /></div>
                    <div className="rounded-lg border border-white/80 bg-white/80 p-2 shadow-sm"><FormInput label="Marca Com." value={item.marcaComercial || ''} onChange={(e) => updateField('marcaComercial', e.target.value)} /></div>
                    <div className="rounded-lg border border-white/80 bg-white/80 p-2 shadow-sm"><FormInput label="Dosis" value={item.dosis || ''} onChange={(e) => updateField('dosis', e.target.value)} /></div>
                    <div className="rounded-lg border border-white/80 bg-white/80 p-2 shadow-sm"><FormInput label="F. Inicio" type="date" value={item.fechaInicio || ''} onChange={(e) => updateField('fechaInicio', e.target.value)} /></div>
                    <div className="rounded-lg border border-white/80 bg-white/80 p-2 shadow-sm"><FormSelect label="Estado" value={item.estado || 'Activo'} onChange={(e) => updateStatus(e.target.value)} options={['Activo', 'Suspendido']} /></div>
                  </div>
                </div>

                <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-fuchsia-50 p-3 sm:p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center"><Layers className="w-4 h-4" /></div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">Detalle farmacoterapéutico</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                    <div className="rounded-lg border border-white/80 bg-white/85 p-2 shadow-sm"><FormSelect label="Presentación" value={item.presentacion || ''} onChange={(e) => updateField('presentacion', e.target.value)} options={PRESENTACIONES} /></div>
                    <div className="rounded-lg border border-white/80 bg-white/85 p-2 shadow-sm"><FormSelect label="Vía" value={item.via || ''} onChange={(e) => updateField('via', e.target.value)} options={VIAS} /></div>
                    <div className="rounded-lg border border-white/80 bg-white/85 p-2 shadow-sm"><FormInput label="Frecuencia" value={item.frecuencia || ''} onChange={(e) => updateField('frecuencia', e.target.value)} /></div>
                    <div className="rounded-lg border border-white/80 bg-white/85 p-2 shadow-sm"><FormSelect label="Idoneidad" value={item.idoneidad || 'Pendiente'} onChange={(e) => updateField('idoneidad', e.target.value)} options={IDONEIDAD_OPCIONES} /></div>
                    <div className="rounded-lg border border-white/80 bg-white/85 p-2 shadow-sm"><FormInput label="Volumen (mL)" type="number" value={item.volumen || ''} onChange={(e) => updateField('volumen', e.target.value)} /></div>
                    <div className="rounded-lg border border-white/80 bg-white/85 p-2 shadow-sm"><FormInput label="Tiempo (hr)" type="number" value={item.tiempo || ''} onChange={(e) => updateField('tiempo', e.target.value)} /></div>
                    <div className="rounded-lg border border-white/80 bg-white/85 p-2 shadow-sm"><FormInput label="Velocidad (mL/hr)" type="number" value={item.velocidad || ''} onChange={(e) => updateField('velocidad', e.target.value)} /></div>
                    {isSuspended && <div className="rounded-lg border border-white/80 bg-white/85 p-2 shadow-sm"><FormInput label="Fecha suspensión" type="date" value={item.fechaSuspension || ''} onChange={(e) => updateField('fechaSuspension', e.target.value)} /></div>}
                    <div className="rounded-lg border border-white/80 bg-white/90 p-2 shadow-sm md:col-span-2 xl:col-span-2">
                      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-slate-300 text-violet-600"
                          checked={item.prn === true}
                          onChange={(e) => updateField('prn', e.target.checked)}
                        />
                        PRN (Por Razón Necesaria)
                      </label>
                      <textarea
                        rows={2}
                        disabled={item.prn !== true}
                        placeholder="Especifica en qué situación se debe administrar este medicamento..."
                        className={`w-full border rounded-md shadow-sm sm:text-sm p-2 ${item.prn === true ? 'border-violet-300 bg-white text-slate-800 focus:border-violet-400 focus:ring-2 focus:ring-violet-100' : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                        value={item.prnSituacion || ''}
                        onChange={(e) => updateField('prnSituacion', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-3 sm:p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center"><FileText className="w-4 h-4" /></div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">Observaciones clínicas</p>
                  </div>
                  <div className="rounded-lg border border-white/85 bg-white/90 p-2 shadow-sm">
                    <div className="flex flex-col">
                      <label className="text-sm font-semibold text-slate-600 mb-1">Observaciones</label>
                      <textarea rows={4} className="border-slate-300 rounded-md shadow-sm sm:text-sm p-2 focus:border-blue-400 focus:ring-2 focus:ring-blue-100" value={item.observaciones || ''} onChange={(e) => updateField('observaciones', e.target.value)} />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50 to-sky-50 p-3 sm:p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-cyan-100 text-cyan-700 flex items-center justify-center"><ListChecks className="w-4 h-4" /></div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-cyan-700">Vista principal (orden de tabla)</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                    <div className="rounded-lg border border-white/80 bg-white/85 p-2 shadow-sm"><ReadOnlyField label="Categoría" value="Solución IV" /></div>
                    <div className="rounded-lg border border-white/80 bg-white/85 p-2 shadow-sm"><FormInput label="Principio Activo" value={item.solucion || ''} onChange={(e) => updateField('solucion', e.target.value)} /></div>
                    <div className="rounded-lg border border-white/80 bg-white/85 p-2 shadow-sm"><ReadOnlyField label="Marca Com." value="-" /></div>
                    <div className="rounded-lg border border-white/80 bg-white/85 p-2 shadow-sm"><FormInput label="Dosis" type="number" value={item.volumen || ''} onChange={(e) => updateField('volumen', e.target.value)} /></div>
                    <div className="rounded-lg border border-white/80 bg-white/85 p-2 shadow-sm"><FormInput label="F. Inicio" type="date" value={item.fechaInicio || ''} onChange={(e) => updateField('fechaInicio', e.target.value)} /></div>
                    <div className="rounded-lg border border-white/80 bg-white/85 p-2 shadow-sm"><FormSelect label="Estado" value={item.estado || 'Activo'} onChange={(e) => updateStatus(e.target.value)} options={['Activo', 'Suspendido']} /></div>
                  </div>
                </div>

                <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-violet-50 p-3 sm:p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center"><Layers className="w-4 h-4" /></div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-700">Detalle de infusión</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                    <div className="rounded-lg border border-white/80 bg-white/85 p-2 shadow-sm"><FormInput label="Tiempo (hr)" type="number" value={item.tiempo || ''} onChange={(e) => updateField('tiempo', e.target.value)} /></div>
                    <div className="rounded-lg border border-white/80 bg-white/85 p-2 shadow-sm"><FormInput label="Velocidad (mL/hr)" type="number" value={item.velocidad || ''} onChange={(e) => updateField('velocidad', e.target.value)} /></div>
                    <div className="rounded-lg border border-white/80 bg-white/85 p-2 shadow-sm"><FormInput label="Frecuencia" value={item.frecuencia || ''} onChange={(e) => updateField('frecuencia', e.target.value)} /></div>
                    {isSuspended && <div className="rounded-lg border border-white/80 bg-white/85 p-2 shadow-sm"><FormInput label="Fecha suspensión" type="date" value={item.fechaSuspension || ''} onChange={(e) => updateField('fechaSuspension', e.target.value)} /></div>}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="px-4 sm:px-5 py-3 border-t border-slate-200 bg-white/95 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">Edición visual optimizada para tablet y desktop.</p>
            <button onClick={requestClose} className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-semibold shadow-sm">Cerrar detalle</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PrmTab({ patient, updatePatient }) {
  const prms = patient.prms || [];
  const interacciones = patient.interacciones || [];
  
  const addPrm = () => updatePatient({ prms: [...prms, { id: Date.now().toString(), fecha: new Date().toISOString().split('T')[0], area: patient.demographics.habitacion || '', medicamento: '', via: '', grupo: '', descripcion: '', categoria: '', analisis: '', causaRaiz: '', intervencion: '', descIntervencion: '', aceptacion: '', resolucion: '', gravedad: '', reportadoCalidad: 'No' }] });
  const updatePrm = (id, field, value) => updatePatient({ prms: prms.map(item => item.id === id ? { ...item, [field]: value } : item) });
  const removePrm = (id) => updatePatient({ prms: prms.filter(item => item.id !== id) });

  const addInteraccion = () => updatePatient({ interacciones: [...interacciones, { id: Date.now().toString(), fecha: new Date().toISOString().split('T')[0], medicamentos: '', grado: '', consecuencia: '' }] });
  const updateInteraccion = (id, field, value) => updatePatient({ interacciones: interacciones.map(item => item.id === id ? { ...item, [field]: value } : item) });
  const removeInteraccion = (id) => updatePatient({ interacciones: interacciones.filter(item => item.id !== id) });

  return (
    <div className="space-y-12">
      {/* SECCIÓN 1: PRM */}
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center border-b pb-2">
          <div><h2 className="text-2xl font-bold text-orange-700 flex items-center print:text-black"><FileWarning className="w-6 h-6 mr-2"/> Problemas Relacionados con Medicamentos (PRM)</h2></div>
          <button onClick={addPrm} className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded text-sm flex items-center justify-center font-medium print:hidden"><Plus className="w-4 h-4 mr-1" /> Registrar PRM</button>
        </div>
        <div className="grid gap-6">
          {prms.length === 0 && <div className="text-center p-8 bg-slate-50 border border-dashed border-slate-300 rounded-lg text-slate-500 print:bg-transparent">No hay PRMs registrados.</div>}
          {prms.map((item, index) => (
            <div key={item.id} className="bg-white border border-orange-200 shadow-sm rounded-lg p-5 relative print:border-slate-300 print:shadow-none">
              <button onClick={() => removePrm(item.id)} className="absolute top-4 right-4 text-slate-400 hover:text-red-600 print:hidden"><Trash2 className="w-5 h-5"/></button>
              <div className="text-xs font-bold text-orange-600 mb-3 print:text-black">PRM #{index + 1}</div>
              
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4 pr-6">
                <FormInput label="Fecha" type="date" value={item.fecha} onChange={(e) => updatePrm(item.id, 'fecha', e.target.value)} />
                <FormInput label="Área / Servicio" value={item.area} onChange={(e) => updatePrm(item.id, 'area', e.target.value)} />
                <FormInput label="Medicamento Involucrado" value={item.medicamento} onChange={(e) => updatePrm(item.id, 'medicamento', e.target.value)} />
                <FormSelect label="Vía" value={item.via} onChange={(e) => updatePrm(item.id, 'via', e.target.value)} options={VIAS} />
                <FormSelect label="Grupo / Clase" value={item.grupo} onChange={(e) => updatePrm(item.id, 'grupo', e.target.value)} options={CATEGORIAS_FARMACO} />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <FormSelect label="Categoría PRM" value={item.categoria} onChange={(e) => updatePrm(item.id, 'categoria', e.target.value)} options={CATEGORIAS_PRM} />
                <FormInput label="Análisis Categoría" value={item.analisis} onChange={(e) => updatePrm(item.id, 'analisis', e.target.value)} placeholder="Ej. Dosis sub-terapéutica..." />
                <FormInput label="Causa Raíz" value={item.causaRaiz} onChange={(e) => updatePrm(item.id, 'causaRaiz', e.target.value)} placeholder="Ej. Omisión de lectura de labs..." />
              </div>

              <div className="mb-4">
                <div className="flex flex-col"><label className="text-sm font-semibold text-slate-600 mb-1">Descripción del PRM</label><textarea value={item.descripcion} onChange={(e) => updatePrm(item.id, 'descripcion', e.target.value)} rows={2} className="border-slate-300 rounded-md shadow-sm sm:text-sm p-2 print:border-none print:bg-transparent"></textarea></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <FormInput label="Intervención Propuesta" value={item.intervencion} onChange={(e) => updatePrm(item.id, 'intervencion', e.target.value)} placeholder="Ej. Ajuste de dosis..." />
                <div className="flex flex-col col-span-2"><label className="text-sm font-semibold text-slate-600 mb-1">Descripción Intervención</label><textarea value={item.descIntervencion} onChange={(e) => updatePrm(item.id, 'descIntervencion', e.target.value)} rows={1} className="border-slate-300 rounded-md shadow-sm sm:text-sm p-2 print:border-none print:bg-transparent"></textarea></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100 print:bg-transparent print:border-none print:p-0">
                <FormSelect label="Aceptación (Médico)" value={item.aceptacion} onChange={(e) => updatePrm(item.id, 'aceptacion', e.target.value)} options={['Aceptada', 'Parcialmente Aceptada', 'No Aceptada']} />
                <FormSelect label="Resolución Final" value={item.resolucion} onChange={(e) => updatePrm(item.id, 'resolucion', e.target.value)} options={['Resuelto', 'No Resuelto']} />
                <FormSelect label="Gravedad" value={item.gravedad} onChange={(e) => updatePrm(item.id, 'gravedad', e.target.value)} options={['Leve', 'Moderada', 'Grave', 'Letal']} />
                <FormSelect label="¿Reportado a Calidad?" value={item.reportadoCalidad} onChange={(e) => updatePrm(item.id, 'reportadoCalidad', e.target.value)} options={['No', 'Sí']} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECCIÓN 2: INTERACCIONES */}
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center border-b pb-2">
          <div><h2 className="text-2xl font-bold text-amber-600 flex items-center print:text-black">Interacciones Medicamentosas</h2></div>
          <button onClick={addInteraccion} className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded text-sm flex items-center justify-center font-medium print:hidden"><Plus className="w-4 h-4 mr-1" /> Registrar Interacción</button>
        </div>
        <div className="grid gap-6">
          {interacciones.length === 0 && <div className="text-center p-8 bg-slate-50 border border-dashed border-slate-300 rounded-lg text-slate-500 print:bg-transparent">No hay interacciones registradas.</div>}
          {interacciones.map((item, index) => (
            <div key={item.id} className="bg-white border border-amber-200 shadow-sm rounded-lg p-5 relative print:border-slate-300 print:shadow-none">
              <button onClick={() => removeInteraccion(item.id)} className="absolute top-4 right-4 text-slate-400 hover:text-red-600 print:hidden"><Trash2 className="w-5 h-5"/></button>
              <div className="text-xs font-bold text-amber-600 mb-3 print:text-black">Interacción #{index + 1}</div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 pr-6">
                <FormInput label="Fecha" type="date" value={item.fecha} onChange={(e) => updateInteraccion(item.id, 'fecha', e.target.value)} />
                <FormSelect label="Grado de Interacción" value={item.grado} onChange={(e) => updateInteraccion(item.id, 'grado', e.target.value)} options={['Contraindicada', 'Mayor', 'Moderada', 'Menor']} />
                <div className="col-span-2"><FormInput label="Medicamentos que Interactúan (Ej. Fármaco A + Fármaco B)" value={item.medicamentos} onChange={(e) => updateInteraccion(item.id, 'medicamentos', e.target.value)} /></div>
              </div>
              <div className="flex flex-col"><label className="text-sm font-semibold text-slate-600 mb-1">Consecuencia (¿Qué puede pasar?)</label><textarea value={item.consecuencia} onChange={(e) => updateInteraccion(item.id, 'consecuencia', e.target.value)} rows={2} className="border-slate-300 rounded-md shadow-sm sm:text-sm p-2 print:border-none print:bg-transparent" placeholder="Describe los efectos clínicos de la interacción..."></textarea></div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// COMPONENTE: Mini Gráfico Evolutivo de Laboratorios
function Sparkline({ data }) {
  if (!data || data.length < 2) return null;
  const values = data.map(d => Number(d.value)).filter(v => !isNaN(v) && v !== null && v !== 0); // Omitimos ceros o vacíos
  if (values.length < 2) return null;
  
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = (max - min) || 1; // Evita div/0 si son iguales
  
  const width = 80;
  const height = 24;
  const padding = 3;
  
  const points = values.map((v, i) => {
    const x = padding + (i / (values.length - 1)) * (width - 2 * padding);
    const y = padding + (height - 2 * padding) - ((v - min) / range) * (height - 2 * padding);
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible" title="Tendencia histórica del paciente">
      <polyline points={points} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {values.map((v, i) => {
        const x = padding + (i / (values.length - 1)) * (width - 2 * padding);
        const y = padding + (height - 2 * padding) - ((v - min) / range) * (height - 2 * padding);
        return <circle key={i} cx={x} cy={y} r="2.5" fill="#1d4ed8" />
      })}
    </svg>
  );
}

function LabsTab({ patient, updatePatient }) {
  const labs = patient.labs || {};
  const d = patient.demographics;
  const { years: age } = calculateAge(d.fechaNacimiento);
  
  const creatData = labs["Creatinina Sérica"] || [];
  const latestCreat = creatData.length > 0 ? creatData[creatData.length - 1].value : '';
  const crcl = calculateCrCl(age, d.peso, d.genero, latestCreat);

  const addLabEntry = (paramName) => {
    const currentData = labs[paramName] || [];
    updatePatient({ labs: { ...labs, [paramName]: [...currentData, { id: Date.now().toString(), date: new Date().toISOString().split('T')[0], value: '' }] } });
  };
  
  const updateLabEntry = (paramName, id, field, value) => {
    const currentData = labs[paramName] || [];
    updatePatient({ labs: { ...labs, [paramName]: currentData.map(item => item.id === id ? { ...item, [field]: value } : item) } });
  };

  const removeLabEntry = (paramName, id) => {
    const currentData = labs[paramName] || [];
    updatePatient({ labs: { ...labs, [paramName]: currentData.filter(item => item.id !== id) } });
  };

  const labGroupEntries = Object.entries(LAB_TEMPLATES);
  const preferredGroupOrder = ['Función Renal', 'Marcadores de Infección / Inflamación'];
  const orderedLabGroups = [
    ...preferredGroupOrder
      .map((name) => labGroupEntries.find(([groupName]) => groupName === name))
      .filter(Boolean),
    ...labGroupEntries.filter(([groupName]) => !preferredGroupOrder.includes(groupName)),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-end border-b pb-2">
        <h2 className="text-2xl font-bold text-slate-800">Resultados Históricos de Laboratorio</h2>
        {crcl && (
           <div className="flex flex-col items-start sm:items-end">
               <div className={`px-4 py-2 rounded-lg flex items-center shadow-sm border print:shadow-none ${getTfgColorClass(crcl)}`}>
                  <Activity className="w-5 h-5 mr-2" />
                  <div className="flex flex-col"><span className="text-xs font-bold uppercase">TFG Est. (Cockcroft-Gault)</span><span className="text-lg font-black">{crcl} <span className="text-sm font-normal">mL/min</span></span></div>
               </div>
               <span className="text-[10px] text-slate-500 mt-1 flex items-center"><AlertTriangle className="w-3 h-3 mr-1"/> Cálculo orientativo. No sustituye juicio clínico.</span>
           </div>
        )}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {orderedLabGroups.map(([groupName, params]) => (
          <div key={groupName} className="bg-white border rounded-xl shadow-sm overflow-hidden print:shadow-none print:border-slate-300">
            <h3 className="bg-slate-100 p-3 font-bold text-slate-700 border-b print:bg-slate-100">{groupName}</h3>
            <div className="p-4 space-y-4">
              {params.map(param => {
                const labData = labs[param.name] || [];
                
                return (
                  <div key={param.name} className="flex flex-col border-b border-dashed border-slate-200 pb-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center mb-2">
                        <div>
                          <span className="block text-sm font-bold text-slate-700">{param.name}</span>
                          <span className="block text-xs text-slate-400">Rango: {param.min !== null ? `${param.min}-${param.max}` : 'N/A'} {param.unit}</span>
                        </div>
                      <div className="flex items-center gap-2 self-start sm:self-auto">
                           <Sparkline data={labData} />
                           <button onClick={() => addLabEntry(param.name)} className="text-[10px] uppercase font-bold bg-blue-50 hover:bg-blue-100 text-blue-600 px-2 py-1.5 rounded flex items-center transition-colors print:hidden"><Plus className="w-3 h-3 mr-1"/> Añadir Dato</button>
                        </div>
                     </div>
                     
                     {labData.length > 0 ? (
                       <div className="space-y-1.5 mt-1">
                          {labData.map((entry) => {
                             const isOutOfRange = entry.value && param.min !== null && (Number(entry.value) < param.min || Number(entry.value) > param.max);
                             return (
                               <div key={entry.id} className="flex flex-wrap items-center gap-2 bg-slate-50 p-1.5 rounded-md border border-slate-100 print:bg-transparent print:border-none print:p-0">
                                 <input type="date" value={entry.date} onChange={(e) => updateLabEntry(param.name, entry.id, 'date', e.target.value)} className="text-xs p-1 border border-slate-200 rounded w-full sm:w-28 print:border-none print:p-0" />
                                 <input type="number" step="0.01" value={entry.value} onChange={(e) => updateLabEntry(param.name, entry.id, 'value', e.target.value)} className={`text-xs p-1 border rounded w-full sm:flex-1 ${isOutOfRange ? 'border-red-400 bg-red-100 text-red-800 font-bold' : 'border-slate-200'} print:border-none print:p-0`} placeholder="Resultado..." />
                                 <span className="text-xs text-slate-500 w-full sm:w-10 sm:text-right">{param.unit}</span>
                                 <button onClick={() => removeLabEntry(param.name, entry.id)} className="text-red-400 hover:text-red-600 sm:ml-2 print:hidden" title="Borrar este registro"><X className="w-4 h-4"/></button>
                               </div>
                             );
                          })}
                       </div>
                     ) : (
                       <span className="text-xs text-slate-400 italic">Sin datos registrados.</span>
                     )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MicrobiologyTab({ patient, updatePatient }) {
  const items = patient.microbiologia || [];
  
  const addItem = () => updatePatient({ microbiologia: [...items, { id: Date.now().toString(), fechaMuestra: new Date().toISOString().split('T')[0], tipoMuestra: '', sitioCultivo: '', microorganismo: '', sensibles: '', resistentes: '', observaciones: '' }] });
  const updateItem = (id, field, value) => updatePatient({ microbiologia: items.map(item => item.id === id ? { ...item, [field]: value } : item) });
  const removeItem = (id) => updatePatient({ microbiologia: items.filter(item => item.id !== id) });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center border-b pb-2">
        <div><h2 className="text-2xl font-bold text-purple-800 flex items-center print:text-black"><Microscope className="w-6 h-6 mr-2"/> Microbiología y Antibiograma</h2></div>
        <button onClick={addItem} className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded text-sm flex items-center justify-center font-medium print:hidden"><Plus className="w-4 h-4 mr-1" /> Nueva Muestra</button>
      </div>
      <div className="grid gap-6">
        {items.length === 0 && <div className="text-center p-8 bg-slate-50 border border-dashed border-slate-300 rounded-lg text-slate-500 print:bg-transparent">No hay cultivos ni aislamientos registrados.</div>}
        {items.map(item => (
          <div key={item.id} className="bg-white border border-purple-200 shadow-sm rounded-lg p-5 relative print:border-slate-300 print:shadow-none">
            <button onClick={() => removeItem(item.id)} className="absolute top-4 right-4 text-slate-400 hover:text-red-600 print:hidden"><Trash2 className="w-5 h-5"/></button>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 pr-8">
              <FormInput label="Fecha de Toma" type="date" value={item.fechaMuestra} onChange={(e) => updateItem(item.id, 'fechaMuestra', e.target.value)} />
              <FormInput label="Tipo de Muestra" value={item.tipoMuestra} onChange={(e) => updateItem(item.id, 'tipoMuestra', e.target.value)} placeholder="Ej. Hemocultivo, Urocultivo..." />
              <FormInput label="Sitio de Toma" value={item.sitioCultivo} onChange={(e) => updateItem(item.id, 'sitioCultivo', e.target.value)} placeholder="Ej. Catéter, Sonda..." />
              <FormInput label="Microorganismo Aislado" value={item.microorganismo} onChange={(e) => updateItem(item.id, 'microorganismo', e.target.value)} placeholder="Dejar vacío si negativo"/>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="flex flex-col"><label className="text-sm font-semibold text-green-700 mb-1">Sensibilidad (S)</label><textarea value={item.sensibles} onChange={(e) => updateItem(item.id, 'sensibles', e.target.value)} rows={2} className="border-green-300 bg-green-50 rounded-md shadow-sm sm:text-sm p-2 print:border-none print:bg-transparent" placeholder="Antibióticos sensibles..."></textarea></div>
              <div className="flex flex-col"><label className="text-sm font-semibold text-red-700 mb-1">Resistencia (R)</label><textarea value={item.resistentes} onChange={(e) => updateItem(item.id, 'resistentes', e.target.value)} rows={2} className="border-red-300 bg-red-50 rounded-md shadow-sm sm:text-sm p-2 print:border-none print:bg-transparent" placeholder="Antibióticos resistentes..."></textarea></div>
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-semibold text-slate-600 mb-1">Observaciones (MIC, BLEE, KPC, etc.)</label>
              <input type="text" value={item.observaciones} onChange={(e) => updateItem(item.id, 'observaciones', e.target.value)} className="w-full border-slate-300 rounded-md shadow-sm sm:text-sm px-3 py-2 print:border-none print:bg-transparent" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RamTab({ patient, updatePatient }) {
  const items = patient.ram || [];
  const addItem = () => updatePatient({ ram: [...items, { id: Date.now().toString(), medicamento: '', fecha: new Date().toISOString().split('T')[0], severidad: 'Leve', gravedad: 'No grave', quePaso: '', queSeHizo: '' }] });
  const updateItem = (id, field, value) => updatePatient({ ram: items.map(item => item.id === id ? { ...item, [field]: value } : item) });
  const removeItem = (id) => updatePatient({ ram: items.filter(item => item.id !== id) });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center border-b pb-2">
        <div><h2 className="text-2xl font-bold text-red-700 flex items-center print:text-black"><ShieldAlert className="w-6 h-6 mr-2"/> Reacciones Adversas (RAM)</h2></div>
        <button onClick={addItem} className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-sm flex items-center justify-center font-medium print:hidden"><Plus className="w-4 h-4 mr-1" /> Registrar RAM</button>
      </div>
      <div className="grid gap-6">
        {items.length === 0 && <div className="text-center p-8 bg-slate-50 border border-dashed border-slate-300 rounded-lg text-slate-500 print:bg-transparent">Sin sospechas de RAM documentadas.</div>}
        {items.map(item => (
          <div key={item.id} className="bg-white border-2 border-red-100 shadow-sm rounded-lg p-5 relative print:border-slate-300 print:shadow-none">
            <button onClick={() => removeItem(item.id)} className="absolute top-4 right-4 text-slate-400 hover:text-red-600 print:hidden"><Trash2 className="w-5 h-5"/></button>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 pr-8">
              <div className="col-span-2"><FormInput label="Medicamento Sospechoso" value={item.medicamento} onChange={(e) => updateItem(item.id, 'medicamento', e.target.value)} /></div>
              <FormInput label="Fecha" type="date" value={item.fecha} onChange={(e) => updateItem(item.id, 'fecha', e.target.value)} />
              <div className="flex space-x-2">
                <FormSelect label="Severidad" value={item.severidad} onChange={(e) => updateItem(item.id, 'severidad', e.target.value)} options={["Leve", "Moderada", "Severa"]} />
                <FormSelect label="Gravedad" value={item.gravedad} onChange={(e) => updateItem(item.id, 'gravedad', e.target.value)} options={["No grave", "Grave"]} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col"><label className="text-sm font-semibold text-slate-600 mb-1">¿Qué pasó? (Descripción clínica)</label><textarea value={item.quePaso} onChange={(e) => updateItem(item.id, 'quePaso', e.target.value)} rows={3} className="border-slate-300 rounded-md shadow-sm sm:text-sm p-2 print:border-none print:bg-transparent"></textarea></div>
              <div className="flex flex-col"><label className="text-sm font-semibold text-slate-600 mb-1">¿Qué se hizo? (Intervención)</label><textarea value={item.queSeHizo} onChange={(e) => updateItem(item.id, 'queSeHizo', e.target.value)} rows={3} className="border-slate-300 rounded-md shadow-sm sm:text-sm p-2 print:border-none print:bg-transparent" placeholder="Ej. Suspensión, antídoto, reporte Cofepris..."></textarea></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FormInput({ label, name, type = "text", value = "", onChange, placeholder }) {
  return (
    <div className="flex flex-col">
      <label className="fc-label truncate" title={label}>{label}</label>
      <input type={type} name={name} value={value || ''} onChange={onChange} placeholder={placeholder} className="fc-input print:border-none print:bg-transparent print:p-0 print:font-medium print:text-slate-800" />
    </div>
  );
}

function FormSelect({ label, name, value = "", onChange, options }) {
  return (
    <div className="flex flex-col w-full">
      <label className="fc-label truncate" title={label}>{label}</label>
      <select name={name} value={value || ''} onChange={onChange} className="fc-input print:appearance-none print:border-none print:bg-transparent print:p-0 print:font-medium print:text-slate-800">
        <option value="">Sel...</option>{options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );
}

function ReadOnlyField({ label, value }) {
  return (
    <div className="flex flex-col justify-end">
      <span className="fc-label truncate" title={label}>{label}</span>
      <div className="bg-slate-100 p-2 rounded-lg border border-slate-200 h-[40px] flex items-center justify-center font-mono text-sm print:border-none print:bg-transparent print:p-0 print:justify-start print:font-medium print:text-slate-800">{value || '-'}</div>
    </div>
  );
}

