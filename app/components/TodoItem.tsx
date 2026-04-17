"use client"

import { useState } from 'react'

type Todo = {
  id: string | number
  title: string
  description?: string
}

export default function TodoItem({ 
  todo, 
  onDelete,
  onUpdate,
  isPending = false,
}: { 
  todo: Todo
  onDelete: (id: string | number) => void
  onUpdate: (todo: Todo) => void
  isPending?: boolean
}) {

  const [isEditing, setIsEditing] = useState(false)

  // --- MODE ÉDITION ---
  if (isEditing) {
    return (
      <div
        className={`border p-4 rounded-md bg-gray-50 flex items-center transition-opacity ${
          isPending ? 'opacity-60' : ''
        }`}
      >
        <form 
          onSubmit={(e) => {
            e.preventDefault()

            const formData = new FormData(e.currentTarget)

            const updatedTodo = {
              id: todo.id,
              title: (formData.get('title') as string) || '',
              description: (formData.get('description') as string) || '',
            }

            onUpdate(updatedTodo)
            setIsEditing(false)
          }}
          className="flex-1 flex gap-2 w-full"
        >
          <input 
            name="title" 
            defaultValue={todo.title} 
            required 
            disabled={isPending}
            className="border p-2 rounded w-1/3 disabled:bg-gray-100" 
          />

          <input 
            name="description" 
            defaultValue={todo.description || ''} 
            disabled={isPending}
            className="border p-2 rounded w-1/2 disabled:bg-gray-100" 
          />

          <div className="flex gap-2">
            <button 
              type="submit"
              disabled={isPending}
              className="bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? "..." : "Sauver"}
            </button>

            <button 
              type="button" 
              onClick={() => setIsEditing(false)} 
              disabled={isPending}
              className="bg-gray-400 text-white px-3 py-2 rounded text-sm hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    )
  }

  // --- MODE NORMAL ---
  return (
    <div
      className={`border p-4 rounded-md flex justify-between items-center hover:shadow-sm transition ${
        isPending ? 'opacity-60' : ''
      }`}
      aria-busy={isPending}
    >
      <div>
        <p className="font-semibold">{todo.title}</p>
        {todo.description && (
          <p className="text-sm text-gray-500">{todo.description}</p>
        )}
      </div>

      <div className="flex gap-4 items-center">
        {isPending && (
          <span
            className="inline-block h-4 w-4 rounded-full border-2 border-gray-400 border-t-transparent animate-spin"
            role="status"
            aria-label="Chargement"
          />
        )}

        <button 
          onClick={() => setIsEditing(true)} 
          disabled={isPending}
          className="text-blue-500 hover:text-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Modifier
        </button>

        <button 
          onClick={() => onDelete(todo.id)}
          disabled={isPending}
          className="text-red-500 hover:text-red-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Supprimer
        </button>
      </div>
    </div>
  )
}
