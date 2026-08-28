import { DEFAULT_SERVICES } from './seedServices';
import { getFirebaseInstance } from './firebaseConfig';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';

const DEFAULT_SETTINGS = [{
  id: 'set_1',
  next_year_inflation: 0,
  following_year_inflation: 0,
  quinta_name: 'Quinta La Juliana',
  quinta_phone: '',
}];

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

export function createLocalEntityHandler(entityName, originalEntity) {
  return {
    async list(sortField, limit) {
      try {
        if (originalEntity?.list) {
          const res = await originalEntity.list(sortField, limit);
          if (Array.isArray(res) && res.length > 0) return res;
        }
      } catch (e) {}
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
      try {
        if (originalEntity?.filter) {
          const res = await originalEntity.filter(query);
          if (Array.isArray(res) && res.length > 0) return res;
        }
      } catch (e) {}
      const items = getLocalEntities(entityName);
      return items.filter((item) => {
        return Object.entries(query).every(([k, v]) => item[k] === v);
      });
    },

    async get(id) {
      try {
        if (originalEntity?.get) {
          const res = await originalEntity.get(id);
          if (res) return res;
        }
      } catch (e) {}
      const items = getLocalEntities(entityName);
      return items.find((i) => String(i.id) === String(id)) || null;
    },

    async create(data) {
      let created = null;
      try {
        if (originalEntity?.create) {
          created = await originalEntity.create(data);
        }
      } catch (e) {}
      const items = getLocalEntities(entityName);
      const newEntity = {
        ...data,
        id: created?.id || `${entityName.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        created_at: new Date().toISOString(),
      };
      items.push(newEntity);
      saveLocalEntities(entityName, items);
      syncToFirestore(entityName, newEntity);
      return newEntity;
    },

    async update(id, data) {
      let updated = null;
      try {
        if (originalEntity?.update) {
          updated = await originalEntity.update(id, data);
        }
      } catch (e) {}
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
      try {
        if (originalEntity?.delete) {
          await originalEntity.delete(id);
        }
      } catch (e) {}
      const items = getLocalEntities(entityName);
      const filtered = items.filter((i) => String(i.id) !== String(id));
      saveLocalEntities(entityName, filtered);
      syncToFirestore(entityName, { id }, true);
      return { success: true };
    },

    async deleteMany(query = {}) {
      try {
        if (originalEntity?.deleteMany) {
          await originalEntity.deleteMany(query);
        }
      } catch (e) {}
      const items = getLocalEntities(entityName);
      saveLocalEntities(entityName, filtered);
      return { success: true };
    },
  };
}

export function exportBackupJSON() {
  const entities = ['Service', 'Budget', 'Event', 'Cabin', 'Payment', 'Graduate', 'Setting'];
  const backup = {};
  entities.forEach((ent) => {
    backup[ent] = getLocalEntities(ent);
  });
  return JSON.stringify(backup, null, 2);
}

export function importBackupJSON(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    if (data && typeof data === 'object') {
      Object.entries(data).forEach(([entityName, items]) => {
        if (Array.isArray(items)) {
          saveLocalEntities(entityName, items);
        }
      });
      return true;
    }
  } catch (e) {
    console.error('Import error:', e);
  }
  return false;
}

