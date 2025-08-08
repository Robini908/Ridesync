import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { SiteHeader } from '@/components/site-header'

export default function HomePage() {
  return (
    <main className="min-h-dvh bg-gradient-to-b from-black to-zinc-950">
      <SiteHeader />
      <section className="container-padding py-16 text-center">
        <h1 className="mx-auto max-w-3xl text-4xl sm:text-6xl font-bold tracking-tight">
          Smarter rides. Seamless bookings.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-zinc-400">
          Book buses, minibuses, and shuttles with AI-powered recommendations, live tracking, and global payments.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link href="/search"><Button variant="accent">Find a ride</Button></Link>
          <Link href="/operators"><Button variant="secondary">For operators</Button></Link>
        </div>
      </section>
    </main>
  )
}