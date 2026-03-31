import { notFound, redirect } from "next/navigation"

import { AppShell } from "@/components/app-shell"
import { DashboardPageClient } from "@/components/pages/dashboard-page-client"
import { getSessionUser } from "@/lib/auth/session"
import { getDictionary, hasLocale, type Locale } from "../dictionaries"

type DashboardPageProps = {
  params: Promise<{ lang: string }>
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { lang } = await params

  if (!hasLocale(lang)) {
    notFound()
  }
  const user = await getSessionUser()
  if (!user) {
    redirect(`/${lang}/auth/login`)
  }

  const dict = await getDictionary(lang as Locale)

  return (
    <AppShell title={dict.nav.dashboard} lang={lang} user={{ name: user.name, email: user.email }}>
      <DashboardPageClient lang={lang} experiments={dict.experiments} />
    </AppShell>
  )
}
