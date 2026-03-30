import { notFound, redirect } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { PromptVersionDetailClient } from "@/components/pages/prompt-version-detail-client"
import { getSessionUser } from "@/lib/auth/session"
import { hasLocale } from "../../../../dictionaries"

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

  return (
    <AppShell title="Versao do prompt" lang={lang} user={{ name: user.name, email: user.email }}>
      <PromptVersionDetailClient promptId={id} versionId={versionId} />
    </AppShell>
  )
}
