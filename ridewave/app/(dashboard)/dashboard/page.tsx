import { SiteHeader } from '@/components/site-header'
import { Shell } from '@/components/shell'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

export default function DashboardPage() {
  return (
    <main>
      <SiteHeader />
      <Shell className="py-8">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Tabs defaultValue="bookings" className="mt-6">
          <TabsList>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="fleet">Fleet</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>
          <TabsContent value="bookings">
            <Card>
              <CardHeader>
                <CardTitle>Recent Bookings</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Trip</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Seats</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>SF → LA</TableCell>
                      <TableCell>2025-08-09</TableCell>
                      <TableCell>2</TableCell>
                      <TableCell><Badge>CONFIRMED</Badge></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>NYC → Boston</TableCell>
                      <TableCell>2025-08-12</TableCell>
                      <TableCell>1</TableCell>
                      <TableCell><Badge variant="secondary">PENDING</Badge></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="fleet">
            <Card>
              <CardHeader>
                <CardTitle>Vehicles</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Seats</TableHead>
                      <TableHead>Amenities</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>Wave Bus 01</TableCell>
                      <TableCell>BUS</TableCell>
                      <TableCell>50</TableCell>
                      <TableCell><Badge variant="outline">WIFI</Badge></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">AI-driven analytics coming soon.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </Shell>
    </main>
  )
}