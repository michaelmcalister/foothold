// Tiny key-value store on IndexedDB, with an in-memory fallback when
// storage is blocked (private windows, some embedded browsers).

const DB_NAME = 'foothold'
const STORE = 'kv'
let dbp = null
const memory = new Map()

function open() {
  if (dbp) return dbp
  dbp = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 1)
      req.onupgradeneeded = () => req.result.createObjectStore(STORE)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
  return dbp
}

export async function get(key, fallback = null) {
  const db = await open()
  if (!db) return memory.has(key) ? memory.get(key) : fallback
  return new Promise((resolve) => {
    const r = db.transaction(STORE).objectStore(STORE).get(key)
    r.onsuccess = () => resolve(r.result === undefined ? fallback : r.result)
    r.onerror = () => resolve(fallback)
  })
}

// Reactive (Vue proxy) values can't be stored directly; store a plain copy.
function plain(value) {
  try { return structuredClone(value) } catch { return JSON.parse(JSON.stringify(value)) }
}

export async function set(key, value) {
  value = plain(value)
  const db = await open()
  if (!db) { memory.set(key, value); return }
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => resolve()
  })
}

export async function del(key) {
  const db = await open()
  if (!db) { memory.delete(key); return }
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => resolve()
  })
}

export async function clearAll() {
  const db = await open()
  memory.clear()
  if (!db) return
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).clear()
    tx.oncomplete = () => resolve()
    tx.onerror = () => resolve()
  })
}
