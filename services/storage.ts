import { Sticker } from '../types';

const DB_NAME = 'SkieVisionDB';
const DB_VERSION = 2; // Incremented for new store
const STORE_GALLERY = 'gallery';
const STORE_AUTOSAVE = 'autosave';
const STORE_SETTINGS = 'settings'; // New store for Key/Quota

export interface AutosaveState {
  id: string;
  generatedSticker: string | null;
  prompt: string;
  caption: string;
}

/**
 * Opens the IndexedDB database.
 */
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_GALLERY)) {
        db.createObjectStore(STORE_GALLERY, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORE_AUTOSAVE)) {
        db.createObjectStore(STORE_AUTOSAVE, { keyPath: 'id' });
      }

      // New Settings Store (Key-Value pair style)
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Generic Setting Helper
const getSetting = async <T>(key: string): Promise<T | null> => {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_SETTINGS, 'readonly');
      const store = tx.objectStore(STORE_SETTINGS);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result?.value ?? null);
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
};

const saveSetting = async (key: string, value: any) => {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_SETTINGS, 'readwrite');
    const store = tx.objectStore(STORE_SETTINGS);
    const req = store.put({ key, value });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

// --- QUOTA & KEY MANAGEMENT ---

export const getDeviceId = async (): Promise<string> => {
  let id = await getSetting<string>('device_id');
  if (!id) {
    id = crypto.randomUUID();
    await saveSetting('device_id', id);
  }
  return id;
};

export const getFreeImageCount = async (): Promise<number> => {
  return (await getSetting<number>('free_generations_count')) || 0;
};

export const incrementFreeImageCount = async () => {
  const current = await getFreeImageCount();
  await saveSetting('free_generations_count', current + 1);
};

export const getUserApiKey = async (): Promise<string | null> => {
  return getSetting<string>('user_api_key');
};

export const saveUserApiKey = async (key: string) => {
  await saveSetting('user_api_key', key);
};

export const clearUserApiKey = async () => {
  const db = await openDB();
  const tx = db.transaction(STORE_SETTINGS, 'readwrite');
  const store = tx.objectStore(STORE_SETTINGS);
  store.delete('user_api_key');
};

// --- EXISTING FUNCTIONS ---

export const getStickers = async (): Promise<Sticker[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_GALLERY, 'readonly');
    const store = tx.objectStore(STORE_GALLERY);
    const request = store.getAll();

    request.onsuccess = () => {
      const res = request.result as Sticker[];
      res.sort((a, b) => b.timestamp - a.timestamp);
      resolve(res);
    };
    request.onerror = () => reject(request.error);
  });
};

export const saveSticker = async (sticker: Sticker): Promise<Sticker[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_GALLERY, 'readwrite');
    const store = tx.objectStore(STORE_GALLERY);
    store.put(sticker);

    tx.oncomplete = async () => {
      const list = await getStickers();
      resolve(list);
    };
    tx.onerror = () => reject(tx.error);
  });
};

export const deleteStickers = async (ids: string[]): Promise<Sticker[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_GALLERY, 'readwrite');
    const store = tx.objectStore(STORE_GALLERY);
    ids.forEach(id => store.delete(id));

    tx.oncomplete = async () => {
      const list = await getStickers();
      resolve(list);
    };
    tx.onerror = () => reject(tx.error);
  });
};

export const saveAutosave = async (data: Omit<AutosaveState, 'id'>) => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_AUTOSAVE, 'readwrite');
    const store = tx.objectStore(STORE_AUTOSAVE);
    store.put({ ...data, id: 'current_session' });
  } catch (e) {
    console.warn("Autosave failed", e);
  }
};

export const getAutosave = async (): Promise<AutosaveState | null> => {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_AUTOSAVE, 'readonly');
      const store = tx.objectStore(STORE_AUTOSAVE);
      const request = store.get('current_session');
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
};

export const clearAutosave = async () => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_AUTOSAVE, 'readwrite');
    const store = tx.objectStore(STORE_AUTOSAVE);
    store.delete('current_session');
  } catch (e) {
    console.warn("Clear autosave failed", e);
  }
};