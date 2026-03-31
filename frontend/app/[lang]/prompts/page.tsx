import { notFound, redirect } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { PromptsPageClient } from "@/components/pages/prompts-page-client"
import { getSessionUser } from "@/lib/auth/session"
import { getDictionary, hasLocale, type Locale } from "../dictionaries"

type PromptsPageProps = {
  params: Promise<{ lang: string }>
}

export default async function PromptsPage({ params }: PromptsPageProps) {
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
    <AppShell title={dict.nav.prompts} lang={lang} user={{ name: user.name, email: user.email }}>
      <PromptsPageClient lang={lang} dict={dict} />
    </AppShell>
  )
}
