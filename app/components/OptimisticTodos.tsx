'use client'

import { useOptimistic, useRef, useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import TodoItem from '@/app/components/TodoItem'
import { addTodo, deleteTodo, updateTodo } from '@/app/actions/todos'
import toast from 'react-hot-toast'

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

  const formRef = useRef<HTMLFormElement>(null)
  const previousTodosRef = useRef<Todo[]>(initialTodos)
  const [, startTransition] = useTransition()

  // Loading par todo (pas global)
  const [isAdding, setIsAdding] = useState(false)
  const [pendingIds, setPendingIds] = useState<Set<string | number>>(new Set())

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

  // Stockage temporaire
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

  // ➜ ADD
  const handleAction = async (formData: FormData) => {
    const title = formData.get('title') as string
    const description = formData.get('description') as string

    if (!title.trim()) return

    const tempId = Math.random().toString()

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

    startTransition(async () => {
      const result = await addTodo(formData)

      if (result?.error) {
        toast.error("Erreur lors de l'ajout")

        updateOptimistic({ type: 'set', todos: previousTodosRef.current })
      } else {
        toast.success("Tâche ajoutée")

        // ✅ remplace le fake par le vrai
        updateOptimistic({
          type: 'replace',
          tempId,
          todo: result.todo
        })
      }

      removePending(tempId)
      setIsAdding(false)
    })
  }

  // ➜ DELETE
  const handleDelete = (id: string | number) => {
    const todoToDelete = optimisticTodos.find(t => t.id === id)
    if (!todoToDelete) return

    // stocker pour undo
    pendingDeletes.current.set(id, todoToDelete)

    // suppression optimiste
    startTransition(() => {
      updateOptimistic({ type: 'delete', id })
    })

    // timer avant suppression réelle
    const timeout = setTimeout(async () => {
      // marque comme en cours de suppression (au cas où on rollback)
      addPending(id)

      const result = await deleteTodo(id)

      if (result?.error) {
        toast.error("Erreur suppression")

        // rollback
        startTransition(() => {
          updateOptimistic({
            type: 'add',
            todo: todoToDelete
          })
        })
      } else {
        pendingDeletes.current.delete(id)
      }

      removePending(id)
    }, 3000) // ⏳ 3 secondes pour undo

    // toast avec bouton Undo
    toast(
      (t) => (
        <div className="flex items-center gap-3">
          <span>Supprimé</span>

          <button
            onClick={() => {
              clearTimeout(timeout)

              const todo = pendingDeletes.current.get(id)
              if (!todo) return

              // restauration
              startTransition(() => {
                updateOptimistic({
                  type: 'add',
                  todo
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

  /*
  const handleDelete = (id: string | number) => {
    const previous = optimisticTodos
    previousTodosRef.current = previous

    startTransition(() => {
      updateOptimistic({ type: 'delete', id })
    })

    startTransition(async () => {
      const result = await deleteTodo(id)

      if (result?.error) {
        toast.error("Erreur suppression")

        updateOptimistic({ type: 'set', todos: previousTodosRef.current })
      } else {
        toast.success("Supprimé")
      }
    })
  }
    */

  // ➜ UPDATE
  const handleUpdate = (updatedTodo: Todo) => {
    const previous = optimisticTodos
    previousTodosRef.current = previous

    addPending(updatedTodo.id)

    startTransition(() => {
      updateOptimistic({ type: 'update', todo: updatedTodo })
    })

    startTransition(async () => {
      const formData = new FormData()
      formData.append('id', updatedTodo.id.toString())
      formData.append('title', updatedTodo.title)
      formData.append('description', updatedTodo.description || '')

      const result = await updateTodo(formData)

      if (result?.error) {
        toast.error("Erreur modification")

        updateOptimistic({ type: 'set', todos: previousTodosRef.current })
      } else {
        toast.success("Modifié")

        // ✅ sync avec DB (optionnel mais propre)
        updateOptimistic({
          type: 'update',
          todo: result.todo
        })
      }

      removePending(updatedTodo.id)
    })
  }

  return (
    <div className="w-full">

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
          {isAdding ? "..." : "Ajouter"}
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
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
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
