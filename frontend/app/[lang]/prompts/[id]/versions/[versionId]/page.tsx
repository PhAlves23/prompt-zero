import { notFound, redirect } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { PromptVersionDetailClient } from "@/components/pages/prompt-version-detail-client"
import { getSessionUser } from "@/lib/auth/session"
import { getDictionary, hasLocale, type Locale } from "../../../../dictionaries"

type PromptVersionDetailPageProps = {
  params: Promise<{ lang: string; id: string; versionId: string }>
}

export default async function PromptVersionDetailPage({ params }: PromptVersionDetailPageProps) {
  const { lang, id, versionId } = await params
  if (!hasLocale(lang)) {
    notFound()
  }

  const user = await getSessionUser()
  if (!user) {
    redirect(`/${lang}/auth/login`)
  }

  const dict = await getDictionary(lang as Locale)

  return (
    <AppShell title={dict.prompts.versionDetailPageTitle} lang={lang} user={{ name: user.name, email: user.email }} dict={dict}>
      <PromptVersionDetailClient lang={lang} promptId={id} versionId={versionId} dict={dict} />
    </AppShell>
  )
}
