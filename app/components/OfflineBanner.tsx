'use client'

import { useOnline } from '@/app/hooks/useOnline'

export default function OfflineBanner() {
  const online = useOnline()

  if (online) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-50 w-full bg-amber-500 text-white text-sm text-center py-2 px-4"
    >
      Hors ligne — tes modifications sont enregistrées localement et seront synchronisées au retour de la connexion.
    </div>
  )
}
