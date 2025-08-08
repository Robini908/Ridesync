"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'

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
    <main className="container-padding py-8">
      <h1 className="text-2xl font-semibold">Search trips</h1>
      <div className="mt-4 flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="City or route"
          className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2"
        />
        <Button onClick={onSearch} disabled={loading}>{loading ? 'Searching…' : 'Search'}</Button>
      </div>
      <ul className="mt-6 space-y-3">
        {results.map((t) => (
          <li key={t.id} className="rounded-md border border-zinc-800 p-4">
            <div className="font-medium">{t.route?.fromCity} → {t.route?.toCity}</div>
            <div className="text-zinc-400">{t.departureDate} at {t.departureTime} · ${t.priceCents / 100} · Seats: {t.availableSeats}</div>
          </li>
        ))}
      </ul>
    </main>
  )
}