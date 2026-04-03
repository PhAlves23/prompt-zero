import { notFound, redirect } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { TraceDetailPageClient } from "@/components/pages/trace-detail-page-client"
import { getSessionUser } from "@/lib/auth/session"
import { getDictionary, hasLocale, type Locale } from "../../dictionaries"

export default async function TraceDetailPage({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang, id } = await params
  if (!hasLocale(lang)) notFound()
  const user = await getSessionUser()
  if (!user) redirect(`/${lang}/auth/login`)
  const dict = await getDictionary(lang as Locale)
  return (
    <AppShell title={dict.traceDetailPage.title} lang={lang} user={{ name: user.name, email: user.email }} dict={dict}>
      <TraceDetailPageClient traceId={id} lang={lang} dict={dict} />
    </AppShell>
  )
}
