// app/page.tsx
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { signOut } from './actions/auth'

// import TodoItem from '@/app/components/TodoItem'
// import AddTodoForm from '@/app/components/AddTodoForm'

import OptimisticTodos from '@/app/components/OptimisticTodos' // On importe notre nouveau composant


export default async function Page() {

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user }, error: authError } = await supabase.auth.getUser()


  if (authError) {
    console.error(authError)
    redirect('/login')
  }

  if (!user) {
    redirect('/login')
  }

  // Fetch initial des todos
  const { data: todos, error } = await supabase
    .from('todos')
    .select('*')
    .order('created_at', { ascending: false }) // Optionnel : affiche les plus récents en haut

  if (error) console.error(error)

  return (
    <div className="max-w-3xl mx-auto p-6">

      {/* QUI EST CONNECTE */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Anteus Todos</h1>

        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            Connecté : {user.email}
          </span>

          <form action={signOut}>
            <button className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-sm">
              Logout
            </button>
          </form>
        </div>
      </div>

      {/* COMPOSANT CLIENT AVEC OPTIMISTIC UI ET ANIMATIONS */}
      <OptimisticTodos initialTodos={todos || []} />


    </div>
  )
}

