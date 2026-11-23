import type { LearnerEvent } from './events';

/** Where the event log lives. IndexedDB in the browser; in memory where IndexedDB is unavailable (tests, private modes). */
export interface EventStore {
  load(): Promise<LearnerEvent[]>;
  append(e: LearnerEvent): Promise<void>;
  /** Replaces the whole log (import / reset). */
  replace(events: readonly LearnerEvent[]): Promise<void>;
  readonly persistent: boolean;
}

export function memoryStore(initial: readonly LearnerEvent[] = []): EventStore {
  let events = [...initial];
  return {
    persistent: false,
    load: async () => [...events],
    append: async (e) => void events.push(e),
    replace: async (es) => void (events = [...es]),
  };
}

const DB = 'cs-universe';
const STORE = 'events';

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((res, rej) => {
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
function done(tx: IDBTransaction): Promise<void> {
  return new Promise((res, rej) => {
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
    tx.onabort = () => rej(tx.error);
  });
}

async function openDb(): Promise<IDBDatabase> {
  const open = indexedDB.open(DB, 1);
  open.onupgradeneeded = () => open.result.createObjectStore(STORE, { autoIncrement: true });
  return req(open);
}

export async function idbStore(): Promise<EventStore> {
  const db = await openDb();
  return {
    persistent: true,
    load: async () => req(db.transaction(STORE).objectStore(STORE).getAll()) as Promise<LearnerEvent[]>,
    append: async (e) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).add(e);
      await done(tx);
    },
    replace: async (es) => {
      const tx = db.transaction(STORE, 'readwrite');
      const st = tx.objectStore(STORE);
      st.clear();
      for (const e of es) st.add(e);
      await done(tx);
    },
  };
}

/** IndexedDB when available, otherwise memory (progress then lasts for the tab only). */
export async function openEventStore(): Promise<EventStore> {
  if (typeof indexedDB === 'undefined') return memoryStore();
  try {
    return await idbStore();
  } catch {
    return memoryStore();
  }
}
