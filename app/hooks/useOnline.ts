'use client'

import { useEffect, useState } from 'react'

/**
 * Retourne `true` tant que le navigateur rapporte une connexion (`navigator.onLine`).
 * SSR-safe : renvoie `true` par défaut tant que le JS client n'a pas tourné.
 */
export function useOnline(): boolean {
  const [online, setOnline] = useState(true)

  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    update()

    window.addEventListener('online', update)
    window.addEventListener('offline', update)

    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  return online
}
