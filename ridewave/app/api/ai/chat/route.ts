import { NextRequest, NextResponse } from 'next/server'
import { grokChat } from '@/lib/ai'

export async function POST(req: NextRequest) {
  const { messages } = await req.json()
  if (!Array.isArray(messages)) return new NextResponse('Invalid messages', { status: 400 })
  const result = await grokChat(messages)
  return NextResponse.json(result)
}