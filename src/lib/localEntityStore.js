import { DEFAULT_SERVICES } from './seedServices.js';
import { getFirebaseInstance } from './firebaseConfig.js';
import { doc, setDoc, deleteDoc, collection, onSnapshot } from 'firebase/firestore';
import { queryClientInstance } from './query-client.js';

const DEFAULT_SETTINGS = [{
  id: 'set_1',
  next_year_inflation: 0,
  following_year_inflation: 0,
  quinta_name: 'Quinta La Juliana',
  quinta_phone: '',
}];

const activeFirestoreListeners = {};

export function initFirestoreRealtimeSync() {
  const { db } = getFirebaseInstance();
  if (!db) return;

  const entities = ['Service', 'Budget', 'Event', 'Cabin', 'CabinReservation', 'Payment', 'Graduate', 'Setting', 'User', 'QuoteRequest'];
  entities.forEach((entityName) => {
    const colName = `${entityName.toLowerCase()}s`;
    if (activeFirestoreListeners[colName]) return;

    try {
      const colRef = collection(db, colName);
      activeFirestoreListeners[colName] = onSnapshot(colRef, (snapshot) => {
        if (snapshot) {
          const remoteItems = [];
          snapshot.forEach((d) => remoteItems.push({ ...d.data(), id: d.id }));
          saveLocalEntities(entityName, remoteItems);
          try {
            queryClientInstance.invalidateQueries();
          } catch (e) {}
        }
      }, (err) => {
        console.warn(`Firestore onSnapshot error for ${colName}:`, err);
      });
    } catch (e) {
      console.warn(`Failed to attach listener for ${colName}:`, e);
    }
  });
}

if (typeof window !== 'undefined') {
  setTimeout(() => {
    initFirestoreRealtimeSync();
  }, 500);
}

async function syncToFirestore(entityName, item, isDelete = false) {
  try {
    const { db } = getFirebaseInstance();
    if (!db || !item || !item.id) return;
    const colName = `${entityName.toLowerCase()}s`;
    const docRef = doc(db, colName, String(item.id));
    if (isDelete) {
      await deleteDoc(docRef);
    } else {
      await setDoc(docRef, item, { merge: true });
    }
  } catch (e) {
    console.warn('Firestore sync error:', e);
  }
}

const DEFAULT_CABINS = [
  { id: 'cab_1', name: 'Cabaña 1 (Standard)', number: 1, capacity: 2, price_per_person: 15000, active: true },
  { id: 'cab_2', name: 'Cabaña 2 (Familiar)', number: 2, capacity: 5, price_per_person: 14000, active: true },
  { id: 'cab_3', name: 'Cabaña 3 (Grande)', number: 3, capacity: 6, price_per_person: 13500, active: true },
  { id: 'cab_4', name: 'Cabaña 4 (Standard)', number: 4, capacity: 2, price_per_person: 15000, active: true },
  { id: 'cab_5', name: 'Cabaña 5 (Familiar)', number: 5, capacity: 5, price_per_person: 14000, active: true },
  { id: 'cab_6', name: 'Cabaña 6 (Grande)', number: 6, capacity: 6, price_per_person: 13500, active: true },
];

function getStorageKey(entityName) {
  return `antigravity_quinta_${entityName.toLowerCase()}s`;
}

function getInitialData(entityName) {
  if (entityName === 'Service') {
    return DEFAULT_SERVICES.map((s, idx) => ({ ...s, id: `svc_seed_${idx + 1}` }));
  }
  if (entityName === 'Setting') {
    return DEFAULT_SETTINGS;
  }
  if (entityName === 'Cabin') {
    return DEFAULT_CABINS;
  }
  return [];
}

export function getLocalEntities(entityName) {
  const key = getStorageKey(entityName);
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        if (entityName === 'Service') {
          const hasMixedCatering = parsed.some((s) => s.measurement_type === 'mixed_menu' && s.category === 'catering');
          const hasMixedVajilla = parsed.some((s) => s.measurement_type === 'mixed_menu' && s.category === 'servicios');
          let updated = false;
          if (!hasMixedCatering) {
            parsed.unshift({ ...DEFAULT_SERVICES[0], id: `svc_seed_mixed_cat` });
            updated = true;
          }
          if (!hasMixedVajilla) {
            parsed.splice(1, 0, { ...DEFAULT_SERVICES[1], id: `svc_seed_mixed_vaj` });
            updated = true;
          }
          if (updated) {
            localStorage.setItem(key, JSON.stringify(parsed));
          }
        }
        return parsed;
      }
    }
  } catch (e) {
    console.warn('LocalStorage read error:', e);
  }
  const initial = getInitialData(entityName);
  try {
    localStorage.setItem(key, JSON.stringify(initial));
  } catch (e) {}
  return initial;
}

export function saveLocalEntities(entityName, items) {
  const key = getStorageKey(entityName);
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch (e) {
    console.error('LocalStorage write error:', e);
  }
}

export function createLocalEntityHandler(entityName) {
  return {
    async list(sortField, limit) {
      let items = getLocalEntities(entityName);
      if (sortField) {
        const field = sortField.startsWith('-') ? sortField.substring(1) : sortField;
        const asc = !sortField.startsWith('-');
        items = [...items].sort((a, b) => {
          const va = a[field] ?? '';
          const vb = b[field] ?? '';
          if (typeof va === 'number' && typeof vb === 'number') {
            return asc ? va - vb : vb - va;
          }
          return asc ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
        });
      }
      return limit ? items.slice(0, limit) : items;
    },

    async filter(query = {}) {
      const items = getLocalEntities(entityName);
      return items.filter((item) => {
        return Object.entries(query).every(([k, v]) => item[k] === v);
      });
    },

    async get(id) {
      const items = getLocalEntities(entityName);
      return items.find((i) => String(i.id) === String(id)) || null;
    },

    async create(data) {
      const items = getLocalEntities(entityName);
      const newEntity = {
        ...data,
        id: data.id || `${entityName.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        created_at: new Date().toISOString(),
      };
      items.push(newEntity);
      saveLocalEntities(entityName, items);
      syncToFirestore(entityName, newEntity);
      return newEntity;
    },

    async update(id, data) {
      const items = getLocalEntities(entityName);
      const idx = items.findIndex((i) => String(i.id) === String(id));
      if (idx !== -1) {
        items[idx] = { ...items[idx], ...data, updated_at: new Date().toISOString() };
        saveLocalEntities(entityName, items);
        syncToFirestore(entityName, items[idx]);
        return items[idx];
      }
      const newItem = { ...data, id, updated_at: new Date().toISOString() };
      items.push(newItem);
      saveLocalEntities(entityName, items);
      syncToFirestore(entityName, newItem);
      return newItem;
    },

    async delete(id) {
      const items = getLocalEntities(entityName);
      const filtered = items.filter((i) => String(i.id) !== String(id));
      saveLocalEntities(entityName, filtered);
      syncToFirestore(entityName, { id }, true);
      return { success: true };
    },

    async deleteMany(query = {}) {
      const items = getLocalEntities(entityName);
      const toDelete = items.filter((item) => Object.entries(query).every(([k, v]) => item[k] === v));
      const filtered = items.filter((item) => !Object.entries(query).every(([k, v]) => item[k] === v));
      saveLocalEntities(entityName, filtered);
      toDelete.forEach((item) => syncToFirestore(entityName, item, true));
      return { success: true };
    },
  };
}

function sha256Pure(str) {
  function rightRotate(value, amount) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const lengthProperty = 'length';
  let i, j;
  let result = '';

  const words = [];
  const asciiBitLength = str[lengthProperty] * 8;

  const hash = [];
  const k = [];
  let primeCounter = 0;

  const isPrime = (candidate) => {
    for (let factor = 2; factor * factor <= candidate; factor++) {
      if (candidate % factor === 0) return false;
    }
    return true;
  };

  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (isPrime(candidate)) {
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
      primeCounter++;
    }
  }

  let utf8Str = unescape(encodeURIComponent(str));
  const utf8Len = utf8Str[lengthProperty];

  for (i = 0; i < utf8Len; i++) {
    words[i >> 2] |= utf8Str.charCodeAt(i) << ((3 - (i % 4)) * 8);
  }
  words[utf8Len >> 2] |= 0x80 << ((3 - (utf8Len % 4)) * 8);
  words[(((utf8Len + 8) >> 6) << 4) + 15] = utf8Len * 8;

  const w = [];
  const h = hash.slice(0);

  for (i = 0; i < words[lengthProperty]; i += 16) {
    const wChunk = words.slice(i, i + 16);
    for (j = 0; j < 64; j++) {
      if (j < 16) {
        w[j] = wChunk[j] || 0;
      } else {
        const s0 = rightRotate(w[j - 15], 7) ^ rightRotate(w[j - 15], 18) ^ (w[j - 15] >>> 3);
        const s1 = rightRotate(w[j - 2], 17) ^ rightRotate(w[j - 2], 19) ^ (w[j - 2] >>> 10);
        w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
      }
    }

    let a = h[0], b = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], hVal = h[7];

    for (j = 0; j < 64; j++) {
      const s1Val = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (hVal + s1Val + ch + k[j] + w[j]) | 0;
      const s0Val = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0Val + maj) | 0;

      hVal = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    h[0] = (h[0] + a) | 0;
    h[1] = (h[1] + b) | 0;
    h[2] = (h[2] + c) | 0;
    h[3] = (h[3] + d) | 0;
    h[4] = (h[4] + e) | 0;
    h[5] = (h[5] + f) | 0;
    h[6] = (h[6] + g) | 0;
    h[7] = (h[7] + hVal) | 0;
  }

  for (i = 0; i < 8; i++) {
    result += ((h[i] >>> 0).toString(16)).padStart(8, '0');
  }

  return result;
}

function sortObjectKeys(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sortObjectKeys);
  const sorted = {};
  Object.keys(obj).sort().forEach((key) => {
    sorted[key] = sortObjectKeys(obj[key]);
  });
  return sorted;
}

function canonicalizeItems(items) {
  if (!Array.isArray(items)) return '[]';
  const sortedItems = [...items].sort((a, b) =>
    String(a?.id || '').localeCompare(String(b?.id || ''))
  );
  return JSON.stringify(sortObjectKeys(sortedItems));
}

function normalizeString(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function generateGraduateIntegrity(events = [], graduates = [], payments = []) {
  const egresadosEvents = events.filter((e) => e.type === 'egresados' || graduates.some((g) => g.event_id === e.id));

  return egresadosEvents.map((evt) => {
    const evtGrads = graduates.filter((g) => g.event_id === evt.id);
    const evtPays = payments.filter((p) => p.event_id === evt.id);

    const gradIdsSorted = evtGrads.map((g) => g.id).filter(Boolean).sort();
    const payIdsSorted = evtPays.map((p) => p.id).filter(Boolean).sort();

    const nameCounts = {};
    evtGrads.forEach((g) => {
      const nameKey = (g.name || '').trim().toLowerCase();
      if (nameKey) {
        nameCounts[nameKey] = (nameCounts[nameKey] || 0) + 1;
      }
    });
    const duplicateStudentNames = Object.entries(nameCounts)
      .filter(([_, count]) => count > 1)
      .map(([name]) => name);

    let gradsWithPaymentsCount = 0;
    let gradsWithoutPaymentsCount = 0;

    evtGrads.forEach((g) => {
      const gNameKey = (g.name || '').trim().toLowerCase();
      const hasPay = evtPays.some((p) => (p.payer_name || '').trim().toLowerCase() === gNameKey);
      if (hasPay) gradsWithPaymentsCount++;
      else gradsWithoutPaymentsCount++;
    });

    const unmatchedPayments = [];
    evtPays.forEach((p) => {
      const pName = (p.payer_name || '').trim();
      const pNameKey = pName.toLowerCase();

      const exactMatch = evtGrads.some((g) => (g.name || '').trim().toLowerCase() === pNameKey);
      if (!exactMatch) {
        const normPName = normalizeString(pName);
        const normMatches = evtGrads.filter((g) => normalizeString(g.name) === normPName);

        let matchType = 'exact_mismatch';
        let candidateName = null;

        if (normMatches.length === 1) {
          matchType = 'normalized_match';
          candidateName = normMatches[0].name;
        } else if (normMatches.length > 1) {
          matchType = 'ambiguous_match';
          candidateName = normMatches.map((g) => g.name).join(' / ');
        }

        unmatchedPayments.push({
          payment_id: p.id,
          payer_name: pName,
          amount: Number(p.amount || 0),
          match_type: matchType,
          candidate_graduate_name: candidateName,
        });
      }
    });

    const monetaryTotal = evtPays.reduce((sum, p) => sum + Number(p.amount || 0), 0);

    return {
      event_id: evt.id,
      event_title: evt.title || 'Sin Título',
      event_date: evt.start_date || '',
      card_value: Number(evt.card_value || 0),
      graduate_count: evtGrads.length,
      graduate_ids: gradIdsSorted,
      payment_count: evtPays.length,
      payment_ids: payIdsSorted,
      monetary_total: monetaryTotal,
      graduates_with_payments: gradsWithPaymentsCount,
      graduates_without_payments: gradsWithoutPaymentsCount,
      unmatched_payments: unmatchedPayments,
      duplicate_student_names: duplicateStudentNames,
    };
  });
}

export function validateBackup(backupObj) {
  if (!backupObj || typeof backupObj !== 'object') {
    throw new Error('Estructura de backup inválida: no es un objeto JSON.');
  }

  const data = backupObj.data || backupObj;
  const entities = ['Service', 'Budget', 'Event', 'Cabin', 'CabinReservation', 'CabinPayment', 'Payment', 'Graduate', 'Setting', 'User', 'QuoteRequest'];

  entities.forEach((ent) => {
    if (!Array.isArray(data[ent])) {
      throw new Error(`Validación fallida: Falta la entidad requerida '${ent}' en los datos.`);
    }

    data[ent].forEach((item, idx) => {
      if (!item || typeof item !== 'object' || !item.id) {
        throw new Error(`Validación fallida: El registro #${idx + 1} de '${ent}' no tiene un campo 'id' válido.`);
      }
    });
  });

  if (backupObj.manifest) {
    entities.forEach((ent) => {
      const manifestEntry = backupObj.manifest[ent];
      if (!manifestEntry) {
        throw new Error(`Validación fallida: Falta la entrada del manifest para '${ent}'.`);
      }
      if (manifestEntry.count !== data[ent].length) {
        throw new Error(`Validación fallida: El conteo en manifest (${manifestEntry.count}) no coincide con la longitud real de '${ent}' (${data[ent].length}).`);
      }
      const computedHash = sha256Pure(canonicalizeItems(data[ent]));
      if (manifestEntry.hash_sha256 !== computedHash) {
        throw new Error(`Validación fallida: El hash SHA-256 de '${ent}' no coincide con los datos canónicos.`);
      }
    });
  }

  return true;
}

export function exportBackupJSON() {
  const entities = ['Service', 'Budget', 'Event', 'Cabin', 'CabinReservation', 'CabinPayment', 'Payment', 'Graduate', 'Setting', 'User', 'QuoteRequest'];
  const data = {};
  let totalRecords = 0;

  entities.forEach((ent) => {
    const items = getLocalEntities(ent) || [];
    data[ent] = items;
    totalRecords += items.length;
  });

  const manifest = {};
  entities.forEach((ent) => {
    const items = data[ent] || [];
    const idsSorted = items.map((i) => i.id).filter(Boolean).sort();

    let monetaryTotal = 0;
    if (ent === 'Payment' || ent === 'CabinPayment') {
      monetaryTotal = items.reduce((sum, i) => sum + Number(i.amount || 0), 0);
    } else if (ent === 'Budget' || ent === 'Event' || ent === 'CabinReservation') {
      monetaryTotal = items.reduce((sum, i) => sum + Number(i.total_amount || i.total_price || 0), 0);
    }

    const canonicalString = canonicalizeItems(items);
    const hash = sha256Pure(canonicalString);

    manifest[ent] = {
      count: items.length,
      id_list: idsSorted,
      monetary_total: monetaryTotal,
      hash_sha256: hash,
    };
  });

  const graduateIntegrity = generateGraduateIntegrity(data.Event || [], data.Graduate || [], data.Payment || []);

  const backupObj = {
    metadata: {
      application: 'Quinta La Juliana',
      backup_format_version: 2,
      generated_at: new Date().toISOString(),
      entity_count: entities.length,
      total_records: totalRecords,
    },
    manifest,
    graduate_integrity: graduateIntegrity,
    data,
  };

  validateBackup(backupObj);

  return JSON.stringify(backupObj, null, 2);
}

export function importBackupJSON(jsonString) {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== 'object') return false;

    const rawData = parsed.data && typeof parsed.data === 'object' ? parsed.data : parsed;

    if (parsed.manifest && parsed.data) {
      validateBackup(parsed);
    }

    const entitiesToImport = ['Service', 'Budget', 'Event', 'Cabin', 'CabinReservation', 'CabinPayment', 'Payment', 'Graduate', 'Setting', 'User', 'QuoteRequest'];

    entitiesToImport.forEach((entityName) => {
      const items = rawData[entityName];
      if (Array.isArray(items)) {
        saveLocalEntities(entityName, items);
        items.forEach((item) => syncToFirestore(entityName, item));
      }
    });

    try {
      queryClientInstance.invalidateQueries();
    } catch (e) {}
    return true;
  } catch (e) {
    console.error('Import error:', e);
  }
  return false;
}
