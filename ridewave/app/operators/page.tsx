"use client"

import { SiteHeader } from '@/components/site-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useForm } from 'react-hook-form'
import { useState } from 'react'
import { Toast, ToastProvider, ToastTitle, ToastDescription } from '@/components/ui/toast'

export default function OperatorsPage() {
  const form = useForm<{ name: string; email: string }>()
  const [submitted, setSubmitted] = useState(false)

  async function onSubmit(values: { name: string; email: string }) {
    setSubmitted(true)
    // TODO: submit to API
  }

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
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-md">
                <FormField name="name" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company name</FormLabel>
                    <FormControl>
                      <Input placeholder="Wave Transit" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField name="email" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="ops@company.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" variant="accent">Apply</Button>
              </form>
            </Form>
          </CardContent>
        </Card>
        {submitted && (
          <Toast open>
            <ToastTitle>Application received</ToastTitle>
            <ToastDescription>We will get back to you shortly.</ToastDescription>
          </Toast>
        )}
      </section>
    </main>
  )
}