import { notFound, redirect } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { PromptDetailClient } from "@/components/pages/prompt-detail-client"
import { getSessionUser } from "@/lib/auth/session"
import { getDictionary, hasLocale, type Locale } from "../../dictionaries"

type PromptDetailsPageProps = {
  params: Promise<{ lang: string; id: string }>
}

export default async function PromptDetailsPage({ params }: PromptDetailsPageProps) {
  const { lang, id } = await params
  if (!hasLocale(lang)) {
    notFound()
  }

  const user = await getSessionUser()
  if (!user) {
    redirect(`/${lang}/auth/login`)
  }

  const dict = await getDictionary(lang as Locale)

  return (
    <AppShell title={dict.prompts.detailPageTitle} lang={lang} user={{ name: user.name, email: user.email }}>
      <PromptDetailClient lang={lang} promptId={id} dict={dict} />
    </AppShell>
  )
}
