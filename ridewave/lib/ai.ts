const XAI_BASE_URL = 'https://api.x.ai/v1'

export async function grokChat(messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>) {
  const apiKey = process.env.XAI_API_KEY
  if (!apiKey) throw new Error('Missing XAI_API_KEY')

  const res = await fetch(`${XAI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'grok-2-latest',
      messages,
      temperature: 0.4,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Grok API error: ${res.status} ${text}`)
  }
  return res.json()
}