import { notFound } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { ExploreDetailPageClient } from "@/components/pages/explore-detail-page-client"
import { getSessionUser } from "@/lib/auth/session"
import { hasLocale } from "../../dictionaries"

type ExploreDetailPageProps = {
  params: Promise<{ lang: string; id: string }>
}

export default async function ExploreDetailPage({ params }: ExploreDetailPageProps) {
  const { lang, id } = await params
  if (!hasLocale(lang)) {
    notFound()
  }

  const user = await getSessionUser()
  return (
    <AppShell
      title="Prompt publico"
      lang={lang}
      user={user ? { name: user.name, email: user.email } : null}
    >
      <ExploreDetailPageClient lang={lang} promptId={id} />
    </AppShell>
  )
}
