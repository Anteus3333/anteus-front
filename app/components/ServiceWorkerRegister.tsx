'use client'

import { useEffect } from 'react'

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    // On ne re-enregistre pas en dev si un SW est déjà actif — évite les boucles.
    const url = '/sw.js'

    navigator.serviceWorker
      .register(url, { scope: '/' })
      .catch((err) => {
        // Silencieux en prod, loggable en dev.
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[SW] registration failed:', err)
        }
      })
  }, [])

  return null
}
