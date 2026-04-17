// proxy.ts (à la racine)
import { type NextRequest } from 'next/server'
// On utilise ./ car le dossier utils est au même niveau que proxy.ts
import { createClient } from './utils/supabase/middleware' 

export async function proxy(request: NextRequest) {
  return createClient(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}