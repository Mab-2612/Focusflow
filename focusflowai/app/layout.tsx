// app/layout.tsx
import type { Metadata, Viewport } from 'next'
import { ThemeProvider } from '@/components/ThemeContext'
import { SoundProvider } from '@/contexts/SoundContext'
import AppProvider from '@/components/AppProvider'
import AuthGuard from '@/components/AuthGuard'
import PageTransition from '@/components/PageTransition'
import GlobalSoundControl from '@/components/GlobalSoundControl'
// import GlobalVoiceAssistant from '@/components/GlobalVoiceAssistant'
import GlobalThemeToggle from '@/components/GlobalThemeToggle'
import GlobalElementsLoader from '@/components/GlobalElementsLoader'
import './globals.css'

export const metadata: Metadata = {
  title: 'FocusFlow - AI Productivity Assistant',
  description: 'Your AI-powered productivity companion with voice control, task management, and focus tools',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
}

// Add this viewport export
export const viewport: Viewport = {
  themeColor: '#ffffff',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      {/* The <head> tag is now managed by Next.js, so we can remove the manual one */}
      <body>
        <ThemeProvider>
          <SoundProvider>
            <AppProvider>
              <AuthGuard>
                <PageTransition>
                  <GlobalElementsLoader />
                  <GlobalThemeToggle />
                  {/* <GlobalVoiceAssistant /> */}
                  <GlobalSoundControl />
                  {children}
                </PageTransition>
              </AuthGuard>
            </AppProvider>
          </SoundProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}