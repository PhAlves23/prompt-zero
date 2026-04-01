import { notFound } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { ExplorePageClient } from "@/components/pages/explore-page-client"
import { getSessionUser } from "@/lib/auth/session"
import { getDictionary, hasLocale, type Locale } from "../dictionaries"

type ExplorePageProps = {
  params: Promise<{ lang: string }>
}

export default async function ExplorePage({ params }: ExplorePageProps) {
  const { lang } = await params
  if (!hasLocale(lang)) {
    notFound()
  }
  const dict = await getDictionary(lang as Locale)

  const user = await getSessionUser()
  return (
    <AppShell
      title={dict.nav.explore}
      lang={lang}
      user={user ? { name: user.name, email: user.email } : null}
      dict={dict}
    >
      <ExplorePageClient lang={lang} dict={dict} />
    </AppShell>
  )
}
