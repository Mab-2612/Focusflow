//app/layout.tsx
import type { Metadata } from 'next'
import { ThemeProvider } from '@/components/ThemeContext'
import { SoundProvider } from '@/contexts/SoundContext'
import GlobalSoundControl from '@/components/GlobalSoundControl'
import AppProvider from '@/components/AppProvider'
import AuthGuard from '@/components/AuthGuard'
import PageTransition from '@/components/PageTransition'
import AuthDebug from '@/components/AuthDebug'
import './globals.css'

export const metadata: Metadata = {
  title: 'FocusFlow',
  description: 'AI-Powered Productivity App',
}

// In your layout.tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <SoundProvider>
            <AppProvider>
              <AuthGuard>
                <PageTransition>
                  {children}
                  <AuthDebug />
                </PageTransition>
              </AuthGuard>
              <GlobalSoundControl />
            </AppProvider>
          </SoundProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}