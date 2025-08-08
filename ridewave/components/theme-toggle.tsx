"use client"

import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  // Don't render anything until mounted to prevent hydration mismatch
  if (!mounted) {
    return (
      <Button
        aria-label="Toggle theme"
        variant="outline"
        size="icon"
        disabled
      >
        <Sun size={18} />
      </Button>
    )
  }

  const isDark = theme === 'dark'
  
  return (
    <Button
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      variant="outline"
      size="icon"
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </Button>
  )
}