import { notFound, redirect } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { TracesListPageClient } from "@/components/pages/traces-list-page-client"
import { getSessionUser } from "@/lib/auth/session"
import { getDictionary, hasLocale, type Locale } from "../dictionaries"

export default async function TracesPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()
  const user = await getSessionUser()
  if (!user) redirect(`/${lang}/auth/login`)
  const dict = await getDictionary(lang as Locale)
  return (
    <AppShell title={dict.tracesPage.title} lang={lang} user={{ name: user.name, email: user.email }} dict={dict}>
      <TracesListPageClient lang={lang} dict={dict} />
    </AppShell>
  )
}
