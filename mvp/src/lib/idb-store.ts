const DB_NAME = "toolia-studio";
const DB_VERSION = 6;
const STORE_SOURCES = "sources";
const STORE_KB = "kb";
const STORE_BRIEF = "brief";
const STORE_MAP = "map";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("IndexedDB not available (SSR)"));
  }
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_SOURCES)) {
        db.createObjectStore(STORE_SOURCES);
      }
      if (!db.objectStoreNames.contains(STORE_KB)) {
        db.createObjectStore(STORE_KB);
      }
      if (!db.objectStoreNames.contains(STORE_BRIEF)) {
        db.createObjectStore(STORE_BRIEF);
      }
      if (!db.objectStoreNames.contains(STORE_MAP)) {
        db.createObjectStore(STORE_MAP);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

export async function idbGet<T>(
  storeName: string,
  key: string,
): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const os = tx.objectStore(storeName);
    const req = os.get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function idbSet<T>(
  storeName: string,
  key: string,
  value: T,
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const os = tx.objectStore(storeName);
    const req = os.put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function idbDelete(storeName: string, key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const os = tx.objectStore(storeName);
    const req = os.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export const SOURCES_STORE = STORE_SOURCES;
export const KB_STORE = STORE_KB;
export const BRIEF_STORE = STORE_BRIEF;
export const MAP_STORE = STORE_MAP;
