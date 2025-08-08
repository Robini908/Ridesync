"use client"

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { Menu, User } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useEffect, useState } from 'react'

export function SiteHeader() {
  const [hasClerk, setHasClerk] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
    const isValidClerk = !!pk && /^pk_(test|live)_[A-Za-z0-9]+/.test(pk) && !pk.includes('xxxxxxxx')
    setHasClerk(isValidClerk)
  }, [])
  
  // Don't render authentication-related content until mounted to prevent hydration mismatch
  if (!mounted) {
    return (
      <header className="container-padding py-6 flex items-center justify-between">
        <Link href="/" className="text-xl font-semibold">
          <span className="text-[--accent-gold]">Ride</span>
          <span className="text-[--accent-blue]">Wave</span>
        </Link>
        <nav className="hidden md:flex items-center gap-3">
          <Link href="/search">
            <Button variant="ghost">Find a ride</Button>
          </Link>
          <Link href="/operators">
            <Button variant="ghost">For operators</Button>
          </Link>
          <div className="w-9 h-9" /> {/* Placeholder for theme toggle */}
        </nav>
        <div className="md:hidden">
          <Button variant="outline" size="icon" aria-label="Open menu" disabled>
            <Menu size={18} />
          </Button>
        </div>
      </header>
    )
  }
  
  return (
    <header className="container-padding py-6 flex items-center justify-between">
      <Link href="/" className="text-xl font-semibold">
        <span className="text-[--accent-gold]">Ride</span>
        <span className="text-[--accent-blue]">Wave</span>
      </Link>
      <nav className="hidden md:flex items-center gap-3">
        <Link href="/search">
          <Button variant="ghost">Find a ride</Button>
        </Link>
        <Link href="/operators">
          <Button variant="ghost">For operators</Button>
        </Link>
        {hasClerk ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Account">
                <User size={18} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <Link href="/dashboard"><DropdownMenuItem>Dashboard</DropdownMenuItem></Link>
              <Link href="/profile"><DropdownMenuItem>Profile</DropdownMenuItem></Link>
              <DropdownMenuSeparator />
              <Link href="/sign-out"><DropdownMenuItem>Sign out</DropdownMenuItem></Link>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <>
            <Link href="/sign-in">
              <Button variant="secondary">Sign in</Button>
            </Link>
            <Link href="/sign-up">
              <Button variant="accent">Create account</Button>
            </Link>
          </>
        )}
        <ThemeToggle />
      </nav>
      <div className="md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Open menu">
              <Menu size={18} />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <div className="mt-10 flex flex-col gap-3">
              <Link href="/search"><Button variant="ghost">Find a ride</Button></Link>
              <Link href="/operators"><Button variant="ghost">For operators</Button></Link>
              {hasClerk ? (
                <>
                  <Link href="/dashboard"><Button variant="ghost">Dashboard</Button></Link>
                  <Link href="/profile"><Button variant="ghost">Profile</Button></Link>
                  <Link href="/sign-out"><Button variant="secondary">Sign out</Button></Link>
                </>
              ) : (
                <>
                  <Link href="/sign-in"><Button variant="secondary">Sign in</Button></Link>
                  <Link href="/sign-up"><Button variant="accent">Create account</Button></Link>
                </>
              )}
              <ThemeToggle />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}