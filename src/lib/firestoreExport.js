import { getFirebaseInstance } from './firebaseConfig.js';
import { collection, getDocs } from 'firebase/firestore';

function sha256Pure(str) {
  function rightRotate(value, amount) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = Math.pow(2, 32);
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

function processFirestoreValue(val) {
  if (val === null || val === undefined) return val;

  // Firestore Timestamp
  if (typeof val === 'object' && (val.seconds !== undefined || typeof val.toDate === 'function')) {
    const sec = val.seconds !== undefined ? val.seconds : Math.floor(val.toDate().getTime() / 1000);
    const nano = val.nanoseconds !== undefined ? val.nanoseconds : (val.toDate().getTime() % 1000) * 1000000;
    let iso = '';
    try {
      iso = typeof val.toDate === 'function' ? val.toDate().toISOString() : new Date(sec * 1000).toISOString();
    } catch (e) {
      iso = new Date(sec * 1000).toISOString();
    }
    return {
      __type__: 'FirestoreTimestamp',
      seconds: sec,
      nanoseconds: nano,
      iso,
    };
  }

  // Firestore DocumentReference
  if (typeof val === 'object' && val.path && val.id && typeof val.onSnapshot !== 'function') {
    return {
      __type__: 'FirestoreDocumentReference',
      path: val.path,
      id: val.id,
    };
  }

  // Firestore GeoPoint
  if (typeof val === 'object' && val.latitude !== undefined && val.longitude !== undefined) {
    return {
      __type__: 'FirestoreGeoPoint',
      latitude: val.latitude,
      longitude: val.longitude,
    };
  }

  // Array
  if (Array.isArray(val)) {
    return val.map(processFirestoreValue);
  }

  // Object
  if (typeof val === 'object') {
    const processed = {};
    Object.keys(val).forEach((k) => {
      processed[k] = processFirestoreValue(val[k]);
    });
    return processed;
  }

  return val;
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

function canonicalizeFirestoreDocs(docs) {
  if (!Array.isArray(docs)) return '[]';
  const sortedDocs = [...docs].sort((a, b) =>
    String(a?.firestore_id || '').localeCompare(String(b?.firestore_id || ''))
  );
  return JSON.stringify(sortObjectKeys(sortedDocs));
}

export async function exportFirestoreDirectJSON() {
  const { db } = getFirebaseInstance();
  if (!db) {
    throw new Error('No se pudo inicializar la conexión con Google Firebase.');
  }

  const collectionsToExport = [
    'services',
    'budgets',
    'events',
    'cabins',
    'cabinreservations',
    'cabinpayments',
    'payments',
    'graduates',
    'settings',
    'users',
    'quoterequests',
  ];

  const exportData = {};
  const manifest = {};
  let totalDocsCount = 0;
  let readErrorCount = 0;

  for (const colName of collectionsToExport) {
    try {
      const colRef = collection(db, colName);
      const snapshot = await getDocs(colRef);

      const docsList = [];
      snapshot.forEach((docSnap) => {
        const rawData = docSnap.data() || {};
        const firestoreId = docSnap.id;
        const internalId = rawData.id !== undefined ? String(rawData.id) : null;
        const idMismatch = internalId !== null && internalId !== firestoreId;

        const processedData = processFirestoreValue(rawData);

        docsList.push({
          firestore_id: firestoreId,
          internal_id: internalId,
          id_mismatch: idMismatch,
          data: processedData,
        });
      });

      exportData[colName] = docsList;
      totalDocsCount += docsList.length;

      const idsSorted = docsList.map((d) => d.firestore_id).sort();

      let monetaryTotal = 0;
      if (colName === 'payments' || colName === 'cabinpayments') {
        monetaryTotal = docsList.reduce((sum, d) => sum + Number(d.data?.amount || 0), 0);
      } else if (colName === 'budgets' || colName === 'events' || colName === 'cabinreservations') {
        monetaryTotal = docsList.reduce((sum, d) => sum + Number(d.data?.total_amount || d.data?.total_price || 0), 0);
      }

      const canonicalStr = canonicalizeFirestoreDocs(docsList);
      const hash = sha256Pure(canonicalStr);

      manifest[colName] = {
        status: 'SUCCESS',
        count: docsList.length,
        id_list: idsSorted,
        monetary_total: monetaryTotal,
        hash_sha256: hash,
      };
    } catch (err) {
      console.warn(`Firestore read error for collection '${colName}':`, err);
      readErrorCount++;
      exportData[colName] = {
        status: 'READ_ERROR',
        error_code: err.code || 'UNKNOWN_ERROR',
        error_message: err.message || 'Error de lectura de Firestore',
      };
      manifest[colName] = {
        status: 'READ_ERROR',
        count: 0,
        id_list: [],
        monetary_total: 0,
        hash_sha256: 'ERROR',
        error_code: err.code || 'UNKNOWN_ERROR',
      };
    }
  }

  const backupObj = {
    metadata: {
      application: 'Quinta La Juliana',
      source: 'firestore-direct-readonly',
      project_id: 'eventos-la-juliana',
      generated_at: new Date().toISOString(),
      collection_count: collectionsToExport.length,
      total_documents: totalDocsCount,
      read_errors_count: readErrorCount,
      backup_format_version: '2.0-firestore-direct',
    },
    manifest,
    data: exportData,
  };

  return JSON.stringify(backupObj, null, 2);
}
