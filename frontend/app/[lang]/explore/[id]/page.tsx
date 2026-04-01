import { notFound } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { ExploreDetailPageClient } from "@/components/pages/explore-detail-page-client"
import { getSessionUser } from "@/lib/auth/session"
import { getDictionary, hasLocale, type Locale } from "../../dictionaries"

type ExploreDetailPageProps = {
  params: Promise<{ lang: string; id: string }>
}

export default async function ExploreDetailPage({ params }: ExploreDetailPageProps) {
  const { lang, id } = await params
  if (!hasLocale(lang)) {
    notFound()
  }
  const dict = await getDictionary(lang as Locale)

  const user = await getSessionUser()
  return (
    <AppShell
      title={dict.explore.detail.pageTitle}
      lang={lang}
      user={user ? { name: user.name, email: user.email } : null}
      dict={dict}
    >
      <ExploreDetailPageClient lang={lang} promptId={id} dict={dict} />
    </AppShell>
  )
}
