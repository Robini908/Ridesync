"use client"

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Menu } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'

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
        <Link href="/sign-in">
          <Button variant="secondary">Sign in</Button>
        </Link>
        <Link href="/sign-up">
          <Button variant="accent">Create account</Button>
        </Link>
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
            <div className="mt-10 flex flex-col gap-3">
              <Link href="/search"><Button variant="ghost">Find a ride</Button></Link>
              <Link href="/operators"><Button variant="ghost">For operators</Button></Link>
              <Link href="/sign-in"><Button variant="secondary">Sign in</Button></Link>
              <Link href="/sign-up"><Button variant="accent">Create account</Button></Link>
              <ThemeToggle />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}