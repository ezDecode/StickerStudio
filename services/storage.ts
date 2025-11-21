import { Sticker } from '../types';

const DB_NAME = 'QuirkDB';
const DB_VERSION = 1;
const STORE_GALLERY = 'gallery';
const STORE_AUTOSAVE = 'autosave';

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
      
      // Create Gallery Store
      if (!db.objectStoreNames.contains(STORE_GALLERY)) {
        db.createObjectStore(STORE_GALLERY, { keyPath: 'id' });
      }

      // Create Autosave Store
      if (!db.objectStoreNames.contains(STORE_AUTOSAVE)) {
        db.createObjectStore(STORE_AUTOSAVE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Migration Helper: Moves data from legacy localStorage to IndexedDB
 * This runs once to ensure users don't lose their existing stickers.
 */
const migrateFromLocalStorage = async () => {
  const LEGACY_KEY = 'quirk_gallery_v1';
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (raw) {
      const stickers: Sticker[] = JSON.parse(raw);
      if (stickers.length > 0) {
        console.log(`Migrating ${stickers.length} stickers to IndexedDB...`);
        const db = await openDB();
        const tx = db.transaction(STORE_GALLERY, 'readwrite');
        const store = tx.objectStore(STORE_GALLERY);
        
        for (const s of stickers) {
          store.put(s);
        }
        
        // Clear old storage only after successful transaction start
        localStorage.removeItem(LEGACY_KEY);
      }
    }
  } catch (e) {
    console.warn("Migration failed", e);
  }
};

export const getStickers = async (): Promise<Sticker[]> => {
  await migrateFromLocalStorage(); // Check for legacy data first
  
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_GALLERY, 'readonly');
    const store = tx.objectStore(STORE_GALLERY);
    const request = store.getAll();

    request.onsuccess = () => {
      const res = request.result as Sticker[];
      // Sort by timestamp desc (newest first)
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
      // Return updated list
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

// --- Autosave / Session Persistence ---

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