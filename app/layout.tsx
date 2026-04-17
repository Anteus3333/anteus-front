import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { Toaster } from "react-hot-toast"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Anteus App",
  description: "Gestion de todos moderne avec Next.js & Supabase",
}

/*
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900">
        {children}

        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              borderRadius: "8px",
              background: "#333",
              color: "#fff",
            },
          }}
        />
      </body>
    </html>
  )
}
*/

// ... (le haut de ton fichier layout.tsx reste identique)

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900">
        {children}

        {/* Toast notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            // Style global par défaut (pour les toasts neutres)
            style: {
              borderRadius: "8px",
              background: "#333",
              color: "#fff",
            },
            // Styles spécifiques pour les succès
            success: {
              style: { 
                background: "#22c55e",
              },
            },
            // Styles spécifiques pour les erreurs
            error: {
              style: { 
                background: "#ef4444",
              },
            },
          }}
        />
      </body>
    </html>
  )
}
