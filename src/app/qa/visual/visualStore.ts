// Per-visitor visual-regression baselines. The site has no login, so a baseline
// screenshot lives in the browser — IndexedDB, not localStorage, because a PNG
// base64 blob is far larger than localStorage's ~5MB quota. Every access is
// guarded: storage can be unavailable (private window, blocked) or throw.

export type Baseline = {
  url: string;
  png: string;        // base64 PNG (no data: prefix)
  width: number;
  height: number;
  savedAt: number;
};

const DB_NAME = "qa_visual";
const STORE = "baselines";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "url" });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  });
}

export async function getBaseline(url: string): Promise<Baseline | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE, "readonly").objectStore(STORE).get(url);
      tx.onsuccess = () => resolve((tx.result as Baseline) ?? null);
      tx.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function saveBaseline(b: Baseline): Promise<boolean> {
  try {
    const db = await openDb();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE, "readwrite").objectStore(STORE).put(b);
      tx.onsuccess = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

export async function deleteBaseline(url: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise((resolve) => {
      const tx = db.transaction(STORE, "readwrite").objectStore(STORE).delete(url);
      tx.onsuccess = () => resolve(null);
      tx.onerror = () => resolve(null);
    });
  } catch { /* unavailable — nothing to clear */ }
}
