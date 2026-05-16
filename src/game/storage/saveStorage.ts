/**
 * IndexedDB-backed key/value store for save envelopes.
 *
 * Why not localStorage:
 * - localStorage caps at ~5-10 MB per origin; the SFT state easily exceeds
 *   this once history + roster + galaxy data accumulate.
 * - IndexedDB has gigabytes of quota per origin and stores binary natively
 *   (we still write JSON strings for envelope compatibility).
 *
 * The public API surface here is intentionally synchronous to match the
 * legacy localStorage callers (MainMenuScene's `hasSaveGame()` etc. cannot
 * easily become async). We achieve this by maintaining an in-memory mirror
 * loaded once at boot via {@link initSaveStorage}. After init, reads come
 * from the mirror and writes are committed to IDB in the background.
 *
 * Migration: the first time the app runs after this code lands, any
 * pre-existing `sft_*` keys in localStorage are copied into IDB and then
 * removed. Subsequent runs ignore localStorage entirely.
 */

const DB_NAME = "sft-saves";
const DB_VERSION = 1;
const STORE = "kv";

/** Keys that this storage layer manages (used for migration from localStorage). */
const MANAGED_KEYS = ["sft_save", "sft_autosave", "sft_draft"] as const;
type ManagedKey = (typeof MANAGED_KEYS)[number];

let db: IDBDatabase | null = null;
let initialized = false;
const cache = new Map<string, string>();

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("idb open failed"));
  });
}

function idbGet(handle: IDBDatabase, key: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const tx = handle.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => {
      const v = req.result;
      resolve(typeof v === "string" ? v : null);
    };
    req.onerror = () => reject(req.error);
  });
}

function idbPut(
  handle: IDBDatabase,
  key: string,
  value: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = handle.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function idbDelete(handle: IDBDatabase, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = handle.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Initialize the IDB store and warm the in-memory cache. Call once at app
 * boot, awaited, BEFORE any scene that reads save state runs.
 *
 * On any error (private browsing, IDB disabled), falls back to a pure
 * in-memory cache — saves work for the session but don't persist.
 */
export async function initSaveStorage(): Promise<void> {
  if (initialized) return;
  initialized = true;

  try {
    db = await openDb();
  } catch (err) {
    console.warn(
      "[saveStorage] IndexedDB unavailable, using memory only:",
      err,
    );
    db = null;
  }

  // Warm cache from IDB.
  if (db) {
    for (const key of MANAGED_KEYS) {
      try {
        const value = await idbGet(db, key);
        if (value !== null) cache.set(key, value);
      } catch (err) {
        console.warn(`[saveStorage] failed to read ${key} from IDB:`, err);
      }
    }
  }

  // One-time migration: copy any pre-existing localStorage saves into IDB,
  // then clear them so the user never sees QuotaExceededError again.
  await migrateFromLocalStorage();
}

async function migrateFromLocalStorage(): Promise<void> {
  if (typeof localStorage === "undefined") return;
  for (const key of MANAGED_KEYS) {
    const legacy = localStorage.getItem(key);
    if (legacy === null) continue;
    // If IDB already has a copy, the IDB version wins.
    if (!cache.has(key)) {
      cache.set(key, legacy);
      if (db) {
        try {
          await idbPut(db, key, legacy);
        } catch (err) {
          console.warn(`[saveStorage] failed to migrate ${key} to IDB:`, err);
        }
      }
    }
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore — best effort
    }
  }
}

/** Synchronous read from the cache. Returns null if no value. */
export function readItem(key: ManagedKey | string): string | null {
  return cache.get(key) ?? null;
}

/**
 * Synchronously update the cache and fire-and-forget the IDB write.
 * No quota errors propagate — IDB writes fail silently to the console
 * but the in-memory state remains valid.
 */
export function writeItem(key: ManagedKey | string, value: string): void {
  cache.set(key, value);
  if (db) {
    void idbPut(db, key, value).catch((err) => {
      console.warn(`[saveStorage] failed to persist ${key}:`, err);
    });
  }
}

/**
 * Test-only: clear the in-memory cache and reset init state. Lets unit tests
 * run a fresh SaveManager session without relying on jsdom's IndexedDB stub.
 */
export function __resetForTests(): void {
  cache.clear();
  db = null;
  initialized = true; // skip async init so synchronous tests don't hang
}

/** Remove a key from both cache and IDB. */
export function removeItem(key: ManagedKey | string): void {
  cache.delete(key);
  if (db) {
    void idbDelete(db, key).catch((err) => {
      console.warn(`[saveStorage] failed to delete ${key}:`, err);
    });
  }
}
