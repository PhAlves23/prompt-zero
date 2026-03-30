import { notFound } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { ExplorePageClient } from "@/components/pages/explore-page-client"
import { getSessionUser } from "@/lib/auth/session"
import { hasLocale } from "../dictionaries"

type ExplorePageProps = {
  params: Promise<{ lang: string }>
}

export default async function ExplorePage({ params }: ExplorePageProps) {
  const { lang } = await params
  if (!hasLocale(lang)) {
    notFound()
  }

  const user = await getSessionUser()
  return (
    <AppShell
      title="Explore"
      lang={lang}
      user={user ? { name: user.name, email: user.email } : null}
    >
      <ExplorePageClient lang={lang} />
    </AppShell>
  )
}
