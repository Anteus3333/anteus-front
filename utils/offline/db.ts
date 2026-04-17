'use client'

// Minimal IndexedDB helpers — zéro dépendance.
// Deux object stores :
//   - `todos` (keyPath 'id')   : cache local des todos (lecture offline)
//   - `queue` (autoIncrement)  : mutations en attente de synchro

const DB_NAME = 'anteus-offline'
const DB_VERSION = 1

export const STORE_TODOS = 'todos'
export const STORE_QUEUE = 'queue'

export type CachedTodo = {
  id: string | number
  title: string
  description?: string
  created_at?: string
}

export type QueuedMutation =
  | {
      id?: number
      type: 'add'
      tempId: string
      payload: { title: string; description: string }
      createdAt: number
    }
  | {
      id?: number
      type: 'update'
      payload: { id: string | number; title: string; description: string }
      createdAt: number
    }
  | {
      id?: number
      type: 'delete'
      payload: { id: string | number }
      createdAt: number
    }

function isBrowser() {
  return typeof window !== 'undefined' && typeof indexedDB !== 'undefined'
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = () => {
      const db = req.result

      if (!db.objectStoreNames.contains(STORE_TODOS)) {
        db.createObjectStore(STORE_TODOS, { keyPath: 'id' })
      }

      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        db.createObjectStore(STORE_QUEUE, {
          keyPath: 'id',
          autoIncrement: true,
        })
      }
    }

    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function toPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

// -----------------------------------------------------------------------------
// Todos cache
// -----------------------------------------------------------------------------

export async function cacheTodos(todos: CachedTodo[]): Promise<void> {
  if (!isBrowser()) return
  const db = await openDb()
  const tx = db.transaction(STORE_TODOS, 'readwrite')
  const store = tx.objectStore(STORE_TODOS)
  await toPromise(store.clear())
  for (const todo of todos) {
    store.put(todo)
  }
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
  db.close()
}

export async function getCachedTodos(): Promise<CachedTodo[]> {
  if (!isBrowser()) return []
  try {
    const db = await openDb()
    const tx = db.transaction(STORE_TODOS, 'readonly')
    const all = await toPromise(tx.objectStore(STORE_TODOS).getAll())
    db.close()
    return (all as CachedTodo[]) || []
  } catch {
    return []
  }
}

// -----------------------------------------------------------------------------
// Mutation queue
// -----------------------------------------------------------------------------

// Omit distributif : préserve l'union discriminée (sinon `tempId` disparaît).
type DistributiveOmit<T, K extends keyof never> = T extends unknown
  ? Omit<T, K>
  : never

export type PendingMutation = DistributiveOmit<QueuedMutation, 'id' | 'createdAt'>

export async function enqueueMutation(
  m: PendingMutation
): Promise<number | null> {
  if (!isBrowser()) return null
  const db = await openDb()
  const tx = db.transaction(STORE_QUEUE, 'readwrite')
  const record = { ...m, createdAt: Date.now() }
  const id = await toPromise(tx.objectStore(STORE_QUEUE).add(record))
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
  return id as number
}

export async function readQueue(): Promise<QueuedMutation[]> {
  if (!isBrowser()) return []
  try {
    const db = await openDb()
    const tx = db.transaction(STORE_QUEUE, 'readonly')
    const all = await toPromise(tx.objectStore(STORE_QUEUE).getAll())
    db.close()
    return ((all as QueuedMutation[]) || []).sort(
      (a, b) => a.createdAt - b.createdAt
    )
  } catch {
    return []
  }
}

export async function removeFromQueue(id: number): Promise<void> {
  if (!isBrowser()) return
  const db = await openDb()
  const tx = db.transaction(STORE_QUEUE, 'readwrite')
  await toPromise(tx.objectStore(STORE_QUEUE).delete(id))
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

export async function clearQueue(): Promise<void> {
  if (!isBrowser()) return
  const db = await openDb()
  const tx = db.transaction(STORE_QUEUE, 'readwrite')
  await toPromise(tx.objectStore(STORE_QUEUE).clear())
  db.close()
}
