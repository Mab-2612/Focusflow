import type { Metadata } from 'next'
import { ThemeProvider } from '@/components/ThemeContext'
import { SoundProvider } from '@/contexts/SoundContext'
import AppProvider from '@/components/AppProvider'
import AuthGuard from '@/components/AuthGuard'
import PageTransition from '@/components/PageTransition'
import GlobalSoundControl from '@/components/GlobalSoundControl'
import './globals.css'

export const metadata: Metadata = {
  title: 'FocusFlow',
  description: 'AI-Powered Productivity App',
}

// This component will only be rendered on the client side
function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <SoundProvider>
        <AppProvider>
          <AuthGuard>
            <PageTransition>
              {children}
            </PageTransition>
          </AuthGuard>
          <GlobalSoundControl />
        </AppProvider>
      </SoundProvider>
    </ThemeProvider>
  )
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  )
}