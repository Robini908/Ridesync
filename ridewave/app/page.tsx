import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'

export default function HomePage() {
  return (
    <main className="min-h-dvh bg-gradient-to-b from-black to-zinc-950">
      <header className="container-padding py-6 flex items-center justify-between">
        <Link href="/" className="text-xl font-semibold">
          <span className="text-[--accent-gold]">Ride</span>
          <span className="text-[--accent-blue]">Wave</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/sign-in" className="btn-secondary">Sign in</Link>
          <Link href="/sign-up" className="btn-primary">Create account</Link>
          <ThemeToggle />
        </div>
      </header>
      <section className="container-padding py-16 text-center">
        <h1 className="mx-auto max-w-3xl text-4xl sm:text-6xl font-bold tracking-tight">
          Smarter rides. Seamless bookings.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-zinc-400">
          Book buses, minibuses, and shuttles with AI-powered recommendations, live tracking, and global payments.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link href="/search" className="btn-primary">Find a ride</Link>
          <Link href="/operators" className="btn-secondary">For operators</Link>
        </div>
      </section>
    </main>
  )
}