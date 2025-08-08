import './globals.css'
import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { ReactQueryProvider } from '@/components/providers/react-query-provider'
import { ThemeProvider } from 'next-themes'

export const metadata: Metadata = {
  title: 'RideWave – Smart Vehicle Booking',
  description: 'AI-powered bookings for buses, minibuses, and shuttles',
}

const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
const isValidClerk = !!pk && /^pk_(test|live)_[A-Za-z0-9]+/.test(pk) && !pk.includes('xxxxxxxx')

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const app = (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <ReactQueryProvider>
            {children}
          </ReactQueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )

  if (!isValidClerk) return app

  return (
    <ClerkProvider publishableKey={pk}>
      {app}
    </ClerkProvider>
  )
}