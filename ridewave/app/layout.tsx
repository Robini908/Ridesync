import './globals.css'
import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { ReactQueryProvider } from '@/components/providers/react-query-provider'
import { ThemeProvider } from 'next-themes'
import { ToastProvider, ToastViewport } from '@/components/ui/toast'
import { ChatbotProvider } from '@/components/providers/chatbot-provider'

export const metadata: Metadata = {
  title: 'RideWave – Smart Vehicle Booking',
  description: 'AI-powered bookings for buses, minibuses, and shuttles',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body suppressHydrationWarning>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
            <ReactQueryProvider>
              <ChatbotProvider>
                {children}
              </ChatbotProvider>
            </ReactQueryProvider>
            <ToastProvider>
              <ToastViewport />
            </ToastProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}