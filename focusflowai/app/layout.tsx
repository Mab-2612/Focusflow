// app/layout.tsx
import React from 'react'
import { ThemeProvider } from '@/components/ThemeContext'
import { SoundProvider } from '@/contexts/SoundContext'
import AppProvider from '@/components/AppProvider'
import { SidebarProvider } from '@/contexts/SidebarContext'
import LayoutClient from '@/components/LayoutClient' // NEW: We'll create this

import './globals.css'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <title>FocusFlow - AI Productivity Assistant</title>
        <meta name="description" content="Your AI-powered productivity companion" />
        <meta name="theme-color" content="#ffffff" />
      </head>
      <body>
        <ThemeProvider>
          <SoundProvider>
            <AppProvider>
              <SidebarProvider>
                <LayoutClient>
                  {children}
                </LayoutClient>
              </SidebarProvider>
            </AppProvider>
          </SoundProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}