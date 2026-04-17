import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {

  async function signIn(formData: FormData) {
    'use server'

    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error("Erreur de connexion:", error.message)
      return redirect('/login?error=true')
    }

    return redirect('/')
  }

  return (
    <div className="max-w-md mx-auto mt-20 p-6 border rounded-xl shadow-sm">
      <h1 className="text-2xl font-semibold mb-6 text-center">
        Connexion
      </h1>

      {searchParams?.error && (
        <p className="text-red-500 text-sm mb-4 text-center">
          Email ou mot de passe incorrect
        </p>
      )}

      <form action={signIn} className="flex flex-col gap-4">
        <input
          name="email"
          type="email"
          placeholder="Email"
          required
          className="border p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <input
          name="password"
          type="password"
          placeholder="Mot de passe"
          required
          className="border p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <button
          type="submit"
          className="bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          Se connecter
        </button>
      </form>
    </div>
  )
}

/*
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default function LoginPage() {

  async function signIn(formData: FormData) {

    'use server'
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error("Erreur de connexion:", error.message)
      return redirect('/login?error=true')
    }

    // Si ça marche, on redirige vers la page d'accueil (tes todos)
       return redirect('/')
  }

  return (
    <div className="max-w-md mx-auto mt-20 p-6 border rounded shadow">
      <h1 className="text-2xl font-bold mb-6">Connexion</h1>
      <form action={signIn} className="flex flex-col gap-4">
        <input
          name="email"
          type="email"
          placeholder="Email"
          required
          className="border p-2 rounded"
        />
        <input
          name="password"
          type="password"
          placeholder="Mot de passe"
          required
          className="border p-2 rounded"
        />
        <button className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
          Se connecter
        </button>
      </form>
    </div>
  )
}
  */

