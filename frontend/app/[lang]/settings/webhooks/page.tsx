import { notFound, redirect } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { WebhooksPageClient } from "@/components/pages/webhooks-page-client"
import { getSessionUser } from "@/lib/auth/session"
import { getDictionary, hasLocale, type Locale } from "../../dictionaries"

export default async function WebhooksSettingsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()
  const user = await getSessionUser()
  if (!user) redirect(`/${lang}/auth/login`)
  const dict = await getDictionary(lang as Locale)
  return (
    <AppShell title={dict.webhooksPage.title} lang={lang} user={{ name: user.name, email: user.email }} dict={dict}>
      <WebhooksPageClient lang={lang} dict={dict} />
    </AppShell>
  )
}
