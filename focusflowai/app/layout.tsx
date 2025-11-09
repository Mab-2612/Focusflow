// app/layout.tsx
"use client"

import { ThemeProvider } from '@/components/ThemeContext'
import { SoundProvider } from '@/contexts/SoundContext'
import AppProvider from '@/components/AppProvider'
import AuthGuard from '@/components/AuthGuard'
// GlobalSoundControl is no longer needed here
import GlobalElementsLoader from '@/components/GlobalElementsLoader'

// Import new components
import { useState } from 'react'
import MobileHeader from '@/components/MobileHeader'
import Sidebar from '@/components/Sidebar'
import GlobalStopButton from '@/components/GlobalStopButton' // Import new button

import './globals.css'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // State to manage sidebar visibility
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

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
                <GlobalElementsLoader />
                
                <MobileHeader onMenuClick={() => setIsSidebarOpen(true)} />
                <Sidebar 
                  isOpen={isSidebarOpen} 
                  onClose={() => setIsSidebarOpen(false)} 
                />
                
                {/* GlobalSoundControl is removed.
                  GlobalThemeToggle is now inside the Sidebar.
                */}
                
                {/* Add the new GlobalStopButton here */}
                <GlobalStopButton />
                
                {children}
              </AuthGuard>
            </AppProvider>
          </SoundProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}