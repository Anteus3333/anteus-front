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
  onUpdate
}: { 
  todo: Todo
  onDelete: (id: string | number) => void
  onUpdate: (todo: Todo) => void
}) {

  const [isEditing, setIsEditing] = useState(false)

  // --- MODE ÉDITION ---
  if (isEditing) {
    return (
      <div className="border p-4 rounded-md bg-gray-50 flex items-center">
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
            className="border p-2 rounded w-1/3" 
          />

          <input 
            name="description" 
            defaultValue={todo.description || ''} 
            className="border p-2 rounded w-1/2" 
          />

          <div className="flex gap-2">
            <button 
              type="submit"
              className="bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700"
            >
              Sauver
            </button>

            <button 
              type="button" 
              onClick={() => setIsEditing(false)} 
              className="bg-gray-400 text-white px-3 py-2 rounded text-sm hover:bg-gray-500"
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
    <div className="border p-4 rounded-md flex justify-between items-center hover:shadow-sm transition">
      <div>
        <p className="font-semibold">{todo.title}</p>
        {todo.description && (
          <p className="text-sm text-gray-500">{todo.description}</p>
        )}
      </div>

      <div className="flex gap-4 items-center">
        <button 
          onClick={() => setIsEditing(true)} 
          className="text-blue-500 hover:text-blue-700 font-medium"
        >
          Modifier
        </button>

        <button 
          onClick={() => onDelete(todo.id)}
          className="text-red-500 hover:text-red-700 font-medium"
        >
          Supprimer
        </button>
      </div>
    </div>
  )
}