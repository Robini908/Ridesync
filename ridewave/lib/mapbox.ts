export function getMapboxToken() {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  if (!token) throw new Error('Missing NEXT_PUBLIC_MAPBOX_TOKEN')
  return token
}