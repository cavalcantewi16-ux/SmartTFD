import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'SmartTFD Motorista',
  description: 'App do Motorista — SmartTFD',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SmartTFD',
  },
}

export const viewport: Viewport = {
  themeColor: '#1d4ed8',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function MotoristaLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Ícone para iOS (adicionar à tela inicial) */}
      <link rel="apple-touch-icon" href="/icon-192.png" />
      {children}
    </>
  )
}
