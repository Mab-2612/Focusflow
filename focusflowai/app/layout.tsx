import type { Metadata } from 'next'
import { ThemeProvider } from '@/components/ThemeContext'
import { SoundProvider } from '@/contexts/SoundContext'
import AppProvider from '@/components/AppProvider'
// import AuthGuard from '@/components/AuthGuard' // COMMENT OUT
import PageTransition from '@/components/PageTransition'
import GlobalThemeToggle from '@/components/GlobalThemeToggle'
import GlobalElementsLoader from '@/components/GlobalElementsLoader'
import './globals.css'

export const metadata: Metadata = {
  title: 'FocusFlow - AI Productivity Assistant',
  description: 'Your AI-powered productivity companion with voice control, task management, and focus tools',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#ffffff" />
      </head>
      <body>
        <ThemeProvider>
          <SoundProvider>
            <AppProvider>
              {/* AUTHGUARD COMMENTED OUT - NO REDIRECT LOOPS */}
              {/* <AuthGuard> */}
                <PageTransition>
                  <GlobalElementsLoader />
                  <GlobalThemeToggle />
                  {children}
                </PageTransition>
              {/* </AuthGuard> */}
            </AppProvider>
          </SoundProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}