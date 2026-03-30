import { notFound, redirect } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { PromptCreatePageClient } from "@/components/pages/prompt-create-page-client"
import { getSessionUser } from "@/lib/auth/session"
import { hasLocale } from "../../dictionaries"

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

  return (
    <AppShell title="Novo prompt" lang={lang} user={{ name: user.name, email: user.email }}>
      <PromptCreatePageClient lang={lang} />
    </AppShell>
  )
}
