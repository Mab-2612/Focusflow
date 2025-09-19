import type { Metadata } from 'next'
import { ThemeProvider } from '@/components/ThemeContext'
import { SoundProvider } from '@/contexts/SoundContext'
import GlobalSoundControl from '@/components/GlobalSoundControl'
import AppProvider from '@/components/AppProvider'
import AuthGuard from '@/components/AuthGuard'
import PageTransition from '@/components/PageTransition'
import './globals.css'

export const metadata: Metadata = {
  title: 'FocusFlow',
  description: 'AI-Powered Productivity App',
}

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
              <AuthGuard> {/* Wrap with AuthGuard */}
                <PageTransition>
                  {children}
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