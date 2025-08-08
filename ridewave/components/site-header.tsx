"use client"

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { Menu, User } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs'

export function SiteHeader() {
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
        <SignedOut>
          <SignInButton>
            <Button variant="secondary">Sign in</Button>
          </SignInButton>
          <SignUpButton>
            <Button variant="accent">Create account</Button>
          </SignUpButton>
        </SignedOut>
        <SignedIn>
          <UserButton afterSignOutUrl="/" />
        </SignedIn>
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
              <SignedOut>
                <SignInButton>
                  <Button variant="secondary">Sign in</Button>
                </SignInButton>
                <SignUpButton>
                  <Button variant="accent">Create account</Button>
                </SignUpButton>
              </SignedOut>
              <SignedIn>
                <Link href="/dashboard"><Button variant="ghost">Dashboard</Button></Link>
                <UserButton afterSignOutUrl="/" />
              </SignedIn>
              <ThemeToggle />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}