// Cloud Sync Manager for La Juliana Catering
// Synchronizes Productos, Categorias, Menus, Eventos in real-time across all devices (PC & Phone)

const OBJECT_ID = 'ff8081819ff5b11001a03e3740ce2922';
const API_URL = `https://api.restful-api.dev/objects/${OBJECT_ID}`;

let isSyncing = false;

export const fetchCloudData = async () => {
  try {
    const res = await fetch(API_URL, { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      if (json && json.data && typeof json.data === 'object') {
        return json.data;
      }
    }
  } catch (err) {
    // network fallback
  }
  return null;
};

export const pushCloudData = async (allData) => {
  if (isSyncing) return;
  isSyncing = true;
  try {
    await fetch(API_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'catering_juliana_database',
        data: {
          ...allData,
          _updatedAt: Date.now()
        }
      })
    });
  } catch (err) {
    // fallback gracefully
  } finally {
    isSyncing = false;
  }
};
