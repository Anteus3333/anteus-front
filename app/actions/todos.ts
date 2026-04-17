'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

// ➜ AJOUT
export async function addTodo(formData: FormData) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autorisé' }

  const title = formData.get('title') as string
  const description = formData.get('description') as string

  if (!title?.trim()) {
    return { error: 'Titre requis' }
  }

  const { data, error } = await supabase
    .from('todos')
    .insert([
      {
        title,
        description,
        user_id: user.id,
      },
    ])
    .select()
    .single()

  if (error) {
    console.error('Erreur insert:', error.message)
    return { error: error.message }
  }

  revalidatePath('/')
  return { success: true, todo: data }
}


// ➜ DELETE
export async function deleteTodo(id: string | number) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autorisé' }

  const { error } = await supabase
    .from('todos')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Erreur delete:', error.message)
    return { error: error.message }
  }

  revalidatePath('/')
  return { success: true }
}


// ➜ UPDATE
export async function updateTodo(formData: FormData) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autorisé' }

  const id = formData.get('id')
  const title = formData.get('title') as string
  const description = formData.get('description') as string

  if (!title?.trim()) {
    return { error: 'Titre requis' }
  }

  const { data, error } = await supabase
    .from('todos')
    .update({
      title,
      description,
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    console.error('Erreur update:', error.message)
    return { error: error.message }
  }

  revalidatePath('/')
  return { success: true, todo: data }
}