import { notFound, redirect } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { ExperimentsPageClient } from "@/components/pages/experiments-page-client"
import { getSessionUser } from "@/lib/auth/session"
import { getDictionary, hasLocale, type Locale } from "../dictionaries"

type ExperimentsPageProps = {
  params: Promise<{ lang: string }>
}

export default async function ExperimentsPage({ params }: ExperimentsPageProps) {
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
    <AppShell title={dict.experiments.title} lang={lang} user={{ name: user.name, email: user.email }}>
      <ExperimentsPageClient lang={lang} experiments={dict.experiments} />
    </AppShell>
  )
}
