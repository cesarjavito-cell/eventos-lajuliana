// Cloud Sync Manager for La Juliana Catering
// Synchronizes Productos, Categorias, Menus, Eventos in real-time across all devices (PC & Phone)

const CLOUD_SYNC_KEY = 'catering_juliana_db_v1';
const CLOUD_API_ENDPOINT = `https://kvdb.io/catering_juliana_secret_key_2026/${CLOUD_SYNC_KEY}`;

let lastSyncTimestamp = 0;
let isSyncing = false;

// Sync functions
export const fetchCloudData = async () => {
  try {
    const res = await fetch(CLOUD_API_ENDPOINT, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data === 'object') {
        return data;
      }
    }
  } catch (err) {
    // network or offline fallback
  }
  return null;
};

export const pushCloudData = async (allData) => {
  if (isSyncing) return;
  isSyncing = true;
  try {
    await fetch(CLOUD_API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...allData,
        _updatedAt: Date.now()
      })
    });
  } catch (err) {
    // fallback gracefully
  } finally {
    isSyncing = false;
  }
};
