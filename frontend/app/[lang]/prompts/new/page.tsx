import { notFound, redirect } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { PromptCreatePageClient } from "@/components/pages/prompt-create-page-client"
import { getSessionUser } from "@/lib/auth/session"
import { getDictionary, hasLocale, type Locale } from "../../dictionaries"

type PromptCreatePageProps = {
  params: Promise<{ lang: string }>
}

export default async function PromptCreatePage({ params }: PromptCreatePageProps) {
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
    <AppShell title={dict.prompts.create} lang={lang} user={{ name: user.name, email: user.email }} dict={dict}>
      <PromptCreatePageClient lang={lang} dict={dict} />
    </AppShell>
  )
}
