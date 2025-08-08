import { SiteHeader } from '@/components/site-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function OperatorsPage() {
  return (
    <main>
      <SiteHeader />
      <section className="container-padding py-8">
        <Card>
          <CardHeader>
            <CardTitle>For Operators</CardTitle>
            <CardDescription>Apply to list your fleet, manage schedules, and access AI insights.</CardDescription>
          </CardHeader>
          <CardContent>
            {/* TODO: add operator application form using shadcn/ui Form */}
          </CardContent>
        </Card>
      </section>
    </main>
  )
}