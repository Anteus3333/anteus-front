import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { Toaster } from "react-hot-toast"
import OfflineBanner from "@/app/components/OfflineBanner"
import ServiceWorkerRegister from "@/app/components/ServiceWorkerRegister"

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
  applicationName: "Anteus Todos",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Anteus Todos",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/icon.svg",
  },
}

export const viewport: Viewport = {
  themeColor: "#111827",
  width: "device-width",
  initialScale: 1,
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
        <OfflineBanner />
        <ServiceWorkerRegister />
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
