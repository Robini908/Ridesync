import { SignIn } from '@clerk/nextjs'

export default function Page() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-zinc-950 flex items-center justify-center p-4">
      <SignIn />
    </div>
  )
}