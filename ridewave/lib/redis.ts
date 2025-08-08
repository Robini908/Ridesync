import Redis from 'ioredis'

const { REDIS_URL } = process.env

let client: Redis | null = null

if (REDIS_URL) {
  try {
    client = new Redis(REDIS_URL, { lazyConnect: true })
    // Do not connect during build; connect on demand
  } catch {
    client = null
  }
}

export const redis = {
  async get(key: string) {
    if (!client) return null
    try {
      if (!client.status || client.status === 'wait') await client.connect()
      return await client.get(key)
    } catch {
      return null
    }
  },
  async set(key: string, value: string, mode?: 'EX', seconds?: number) {
    if (!client) return 'OK'
    try {
      if (!client.status || client.status === 'wait') await client.connect()
      if (mode === 'EX' && typeof seconds === 'number') {
        return await client.set(key, value, mode, seconds)
      }
      return await client.set(key, value)
    } catch {
      return 'OK'
    }
  }
}