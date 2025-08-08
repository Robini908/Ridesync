import { NextResponse } from 'next/server'

export async function POST() {
  // Process Clerk events (user.created, user.updated) if you need to sync extra data
  return NextResponse.json({ ok: true })
}