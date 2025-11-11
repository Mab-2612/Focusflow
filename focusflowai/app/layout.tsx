// app/layout.tsx
"use client" 

import { ThemeProvider } from '@/components/ThemeContext'
import { SoundProvider } from '@/contexts/SoundContext'
import AppProvider from '@/components/AppProvider'
import AuthGuard from '@/components/AuthGuard'
import GlobalSoundControl from '@/components/GlobalSoundControl'
import GlobalElementsLoader from '@/components/GlobalElementsLoader'
import { SidebarProvider } from '@/contexts/SidebarContext' // Import new provider
import MobileHeader from '@/components/MobileHeader'
import Sidebar from '@/components/Sidebar'
import GlobalStopButton from '@/components/GlobalStopButton'
import { usePathname } from 'next/navigation' // Import usePathname

import './globals.css'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // State for sidebar is now in SidebarProvider
  const pathname = usePathname()
  const isChatPage = pathname === '/chat'

  return (
    <html lang="en">
      <head>
        <title>FocusFlow - AI Productivity Assistant</title>
        <meta name="description" content="Your AI-powered productivity companion with voice control, task management, and focus tools" />
        <meta name="theme-color" content="#ffffff" />
      </head>
      <body>
        <ThemeProvider>
          <SoundProvider>
            <AppProvider>
              <AuthGuard>
                {/* Wrap everything in the new provider */}
                <SidebarProvider>
                  <GlobalElementsLoader />
                  
                  {/* FIXED: Only show MobileHeader if NOT on chat page */}
                  {!isChatPage && <MobileHeader />}
                  
                  <Sidebar />
                  <GlobalSoundControl />
                  <GlobalStopButton />
                  
                  {children}
                </SidebarProvider>
              </AuthGuard>
            </AppProvider>
          </SoundProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}