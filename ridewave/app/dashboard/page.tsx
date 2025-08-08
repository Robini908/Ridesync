import { auth, currentUser } from '@clerk/nextjs/server'
import { SiteHeader } from '@/components/site-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const { userId } = auth()
  const user = await currentUser()

  if (!userId) {
    redirect('/sign-in')
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-black to-zinc-950">
      <SiteHeader />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-8">
            Welcome to your Dashboard, {user?.firstName || 'User'}!
          </h1>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">My Bookings</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-zinc-400">View and manage your trip bookings</p>
              </CardContent>
            </Card>

            <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Profile</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-zinc-400">Update your account settings</p>
              </CardContent>
            </Card>

            <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Trip History</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-zinc-400">View your past trips</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur mt-6">
            <CardHeader>
              <CardTitle className="text-white">User Information</CardTitle>
            </CardHeader>
            <CardContent className="text-zinc-300">
              <p><strong>Email:</strong> {user?.emailAddresses[0]?.emailAddress}</p>
              <p><strong>User ID:</strong> {userId}</p>
              <p><strong>Created:</strong> {user?.createdAt?.toLocaleDateString()}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}