'use client'

import { useCallback, useEffect, useOptimistic, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import TodoItem from '@/app/components/TodoItem'
import { addTodo, deleteTodo, updateTodo } from '@/app/actions/todos'
import toast from 'react-hot-toast'
import { useOnline } from '@/app/hooks/useOnline'
import {
  cacheTodos,
  enqueueMutation,
  getCachedTodos,
  readQueue,
  removeFromQueue,
  type QueuedMutation,
} from '@/utils/offline/db'

type Todo = {
  id: string | number
  title: string
  description?: string
  created_at?: string
}

type Action =
  | { type: 'add'; todo: Todo }
  | { type: 'delete'; id: string | number }
  | { type: 'update'; todo: Todo }
  | { type: 'replace'; tempId: string | number; todo: Todo }
  | { type: 'set'; todos: Todo[] }

export default function OptimisticTodos({ initialTodos }: { initialTodos: Todo[] }) {

  const router = useRouter()
  const online = useOnline()

  const formRef = useRef<HTMLFormElement>(null)
  const previousTodosRef = useRef<Todo[]>(initialTodos)
  const [, startTransition] = useTransition()

  // Loading par todo (pas global)
  const [isAdding, setIsAdding] = useState(false)
  const [pendingIds, setPendingIds] = useState<Set<string | number>>(new Set())

  // File de synchro (indicateur UI "X modifs en attente")
  const [queueCount, setQueueCount] = useState(0)
  const isReplayingRef = useRef(false)

  const addPending = (id: string | number) => {
    setPendingIds(prev => {
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }

  const removePending = (id: string | number) => {
    setPendingIds(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  // Stockage temporaire pour l'undo delete
  const pendingDeletes = useRef<Map<string | number, Todo>>(new Map())

  const [optimisticTodos, updateOptimistic] = useOptimistic(
    initialTodos,
    (state: Todo[], action: Action): Todo[] => {
      switch (action.type) {
        case 'add':
          return [action.todo, ...state]

        case 'delete':
          return state.filter(todo => todo.id !== action.id)

        case 'update':
          return state.map(todo =>
            todo.id === action.todo.id ? { ...todo, ...action.todo } : todo
          )

        case 'replace':
          return state.map(todo =>
            todo.id === action.tempId ? action.todo : todo
          )

        case 'set':
          return action.todos

        default:
          return state
      }
    }
  )

  const refreshQueueCount = useCallback(async () => {
    const q = await readQueue()
    setQueueCount(q.length)
  }, [])

  // ---------------------------------------------------------------------------
  // Mount : on met en cache les todos serveur et on hydrate l'UI depuis la
  // queue offline (pour que les modifs faites hors-ligne restent visibles
  // après un reload offline).
  // ---------------------------------------------------------------------------
  useEffect(() => {
    cacheTodos(initialTodos).catch(() => {})
    refreshQueueCount()

    ;(async () => {
      const queue = await readQueue()
      if (queue.length === 0) return

      startTransition(() => {
        for (const m of queue) {
          applyQueuedToOptimistic(m, updateOptimistic)
        }
      })
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTodos])

  // ---------------------------------------------------------------------------
  // Replay automatique quand on revient en ligne.
  // ---------------------------------------------------------------------------
  const replayQueue = useCallback(async () => {
    if (isReplayingRef.current) return
    if (typeof navigator !== 'undefined' && !navigator.onLine) return

    isReplayingRef.current = true

    try {
      const queue = await readQueue()
      if (queue.length === 0) return

      const tempIdMap = new Map<string, string | number>()
      let processed = 0
      let failed = 0

      for (const m of queue) {
        const ok = await replayOne(m, tempIdMap)
        if (ok && m.id != null) {
          await removeFromQueue(m.id)
          processed += 1
        } else {
          failed += 1
          break // on s'arrête à la première erreur pour préserver l'ordre
        }
      }

      if (processed > 0) {
        toast.success(
          processed === 1
            ? '1 modification synchronisée'
            : `${processed} modifications synchronisées`
        )
      }
      if (failed > 0) {
        toast.error("Certaines modifs n'ont pas pu être synchronisées")
      }

      await refreshQueueCount()

      // Refetch serveur pour réconcilier.
      router.refresh()
    } finally {
      isReplayingRef.current = false
    }
  }, [refreshQueueCount, router])

  useEffect(() => {
    if (online) {
      replayQueue().catch(() => {})
    }
  }, [online, replayQueue])

  // ---------------------------------------------------------------------------
  // ➜ ADD
  // ---------------------------------------------------------------------------
  const handleAction = async (formData: FormData) => {
    const title = formData.get('title') as string
    const description = (formData.get('description') as string) || ''

    if (!title.trim()) return

    const tempId = `local-${Math.random().toString(36).slice(2)}-${Date.now()}`

    const newOptimisticTodo: Todo = {
      id: tempId,
      title,
      description,
      created_at: new Date().toISOString(),
    }

    const previous = optimisticTodos
    previousTodosRef.current = previous

    setIsAdding(true)
    addPending(tempId)

    startTransition(() => {
      updateOptimistic({ type: 'add', todo: newOptimisticTodo })
    })

    formRef.current?.reset()

    // Mode offline : on enqueue + on garde l'optimistic
    if (!online) {
      await enqueueMutation({
        type: 'add',
        tempId,
        payload: { title, description },
      })
      await refreshQueueCount()
      toast.success('Ajouté (hors ligne)')
      removePending(tempId)
      setIsAdding(false)
      return
    }

    startTransition(async () => {
      const result = await addTodo(formData)

      if (result?.error) {
        toast.error("Erreur lors de l'ajout")

        updateOptimistic({ type: 'set', todos: previousTodosRef.current })
      } else {
        toast.success('Tâche ajoutée')

        updateOptimistic({
          type: 'replace',
          tempId,
          todo: result.todo,
        })
      }

      removePending(tempId)
      setIsAdding(false)
    })
  }

  // ---------------------------------------------------------------------------
  // ➜ DELETE
  // ---------------------------------------------------------------------------
  const handleDelete = (id: string | number) => {
    const todoToDelete = optimisticTodos.find(t => t.id === id)
    if (!todoToDelete) return

    pendingDeletes.current.set(id, todoToDelete)

    startTransition(() => {
      updateOptimistic({ type: 'delete', id })
    })

    const timeout = setTimeout(async () => {
      addPending(id)

      // Mode offline : on enqueue, pas d'appel réseau.
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        await enqueueMutation({
          type: 'delete',
          payload: { id },
        })
        await refreshQueueCount()
        pendingDeletes.current.delete(id)
        removePending(id)
        return
      }

      const result = await deleteTodo(id)

      if (result?.error) {
        toast.error('Erreur suppression')

        startTransition(() => {
          updateOptimistic({
            type: 'add',
            todo: todoToDelete,
          })
        })
      } else {
        pendingDeletes.current.delete(id)
      }

      removePending(id)
    }, 3000) // ⏳ 3 secondes pour undo

    toast(
      (t) => (
        <div className="flex items-center gap-3">
          <span>Supprimé</span>

          <button
            onClick={() => {
              clearTimeout(timeout)

              const todo = pendingDeletes.current.get(id)
              if (!todo) return

              startTransition(() => {
                updateOptimistic({
                  type: 'add',
                  todo,
                })
              })

              pendingDeletes.current.delete(id)
              toast.dismiss(t.id)
            }}
            className="text-blue-500 font-semibold"
          >
            Annuler
          </button>
        </div>
      ),
      { duration: 3000 }
    )
  }

  // ---------------------------------------------------------------------------
  // ➜ UPDATE
  // ---------------------------------------------------------------------------
  const handleUpdate = (updatedTodo: Todo) => {
    const previous = optimisticTodos
    previousTodosRef.current = previous

    addPending(updatedTodo.id)

    startTransition(() => {
      updateOptimistic({ type: 'update', todo: updatedTodo })
    })

    // Mode offline : enqueue
    if (!online) {
      ;(async () => {
        await enqueueMutation({
          type: 'update',
          payload: {
            id: updatedTodo.id,
            title: updatedTodo.title,
            description: updatedTodo.description || '',
          },
        })
        await refreshQueueCount()
        toast.success('Modifié (hors ligne)')
        removePending(updatedTodo.id)
      })()
      return
    }

    startTransition(async () => {
      const formData = new FormData()
      formData.append('id', updatedTodo.id.toString())
      formData.append('title', updatedTodo.title)
      formData.append('description', updatedTodo.description || '')

      const result = await updateTodo(formData)

      if (result?.error) {
        toast.error('Erreur modification')

        updateOptimistic({ type: 'set', todos: previousTodosRef.current })
      } else {
        toast.success('Modifié')

        updateOptimistic({
          type: 'update',
          todo: result.todo,
        })
      }

      removePending(updatedTodo.id)
    })
  }

  // ---------------------------------------------------------------------------
  // Hydratation depuis le cache IDB si on arrive offline sans todos serveur.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (initialTodos.length > 0) return
    if (online) return

    ;(async () => {
      const cached = await getCachedTodos()
      if (cached.length === 0) return
      startTransition(() => {
        updateOptimistic({ type: 'set', todos: cached })
      })
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online])

  return (
    <div className="w-full">
      {/* BANNIÈRE DE QUEUE */}
      {queueCount > 0 && (
        <div className="mb-4 rounded-md bg-amber-50 border border-amber-200 text-amber-900 px-4 py-2 text-sm">
          {queueCount === 1
            ? '1 modification en attente de synchro.'
            : `${queueCount} modifications en attente de synchro.`}{' '}
          {online ? 'Synchronisation…' : 'Reprise dès le retour en ligne.'}
        </div>
      )}

      {/* FORM */}
      <form ref={formRef} action={handleAction} className="mb-8 flex gap-2">
        <input
          name="title"
          type="text"
          placeholder="Nouvelle tâche..."
          className="flex-1 rounded-md border px-4 py-2 focus:ring-1 focus:ring-gray-900"
          required
        />

        <input
          name="description"
          type="text"
          placeholder="Description (optionnelle)"
          className="flex-1 rounded-md border px-4 py-2"
        />

        <button
          type="submit"
          disabled={isAdding}
          className="bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-800 transition disabled:opacity-50"
        >
          {isAdding ? '...' : 'Ajouter'}
        </button>
      </form>

      {/* LIST */}
      <motion.ul layout className="space-y-3">
        <AnimatePresence mode="popLayout">
          {optimisticTodos.map((todo) => (
            <motion.li
              key={todo.id}
              layout
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            >
              <TodoItem
                todo={todo}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
                isPending={pendingIds.has(todo.id)}
              />
            </motion.li>
          ))}
        </AnimatePresence>
      </motion.ul>

      {optimisticTodos.length === 0 && (
        <p className="text-gray-500 italic text-center mt-8">
          Aucune tâche pour le moment.
        </p>
      )}
    </div>
  )
}

// -----------------------------------------------------------------------------
// Helpers hors composant
// -----------------------------------------------------------------------------

function applyQueuedToOptimistic(
  m: QueuedMutation,
  updateOptimistic: (action: Action) => void
) {
  if (m.type === 'add') {
    updateOptimistic({
      type: 'add',
      todo: {
        id: m.tempId,
        title: m.payload.title,
        description: m.payload.description,
        created_at: new Date(m.createdAt).toISOString(),
      },
    })
  } else if (m.type === 'update') {
    updateOptimistic({
      type: 'update',
      todo: {
        id: m.payload.id,
        title: m.payload.title,
        description: m.payload.description,
      },
    })
  } else if (m.type === 'delete') {
    updateOptimistic({ type: 'delete', id: m.payload.id })
  }
}

async function replayOne(
  m: QueuedMutation,
  tempIdMap: Map<string, string | number>
): Promise<boolean> {
  try {
    if (m.type === 'add') {
      const fd = new FormData()
      fd.append('title', m.payload.title)
      fd.append('description', m.payload.description)
      const res = await addTodo(fd)
      if (res?.error) return false
      if (res?.todo?.id != null) {
        tempIdMap.set(m.tempId, res.todo.id)
      }
      return true
    }

    if (m.type === 'update') {
      const realId = resolveId(m.payload.id, tempIdMap)
      const fd = new FormData()
      fd.append('id', String(realId))
      fd.append('title', m.payload.title)
      fd.append('description', m.payload.description)
      const res = await updateTodo(fd)
      if (res?.error) return false
      return true
    }

    if (m.type === 'delete') {
      const realId = resolveId(m.payload.id, tempIdMap)
      const res = await deleteTodo(realId)
      if (res?.error) return false
      return true
    }

    return true
  } catch {
    return false
  }
}

function resolveId(
  id: string | number,
  tempIdMap: Map<string, string | number>
): string | number {
  if (typeof id === 'string' && tempIdMap.has(id)) return tempIdMap.get(id)!
  return id
}
