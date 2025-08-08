"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SiteHeader } from '@/components/site-header'
import { Card, CardContent } from '@/components/ui/card'

export default function SearchPage() {
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any[]>([])

  async function onSearch() {
    setLoading(true)
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
    const data = await res.json()
    setResults(data)
    setLoading(false)
  }

  return (
    <main>
      <SiteHeader />
      <section className="container-padding py-8">
        <h1 className="text-2xl font-semibold">Search trips</h1>
        <div className="mt-4 flex gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="City or route"
          />
          <Button onClick={onSearch} disabled={loading} variant="accent">{loading ? 'Searching…' : 'Search'}</Button>
        </div>
        <ul className="mt-6 space-y-3">
          {results.map((t) => (
            <li key={t.id}>
              <Card>
                <CardContent className="p-4">
                  <div className="font-medium">{t.route?.fromCity} → {t.route?.toCity}</div>
                  <div className="text-zinc-400">{t.departureDate} at {t.departureTime} · ${t.priceCents / 100} · Seats: {t.availableSeats}</div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}