import { notFound, redirect } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { TagsPageClient } from "@/components/pages/tags-page-client"
import { getSessionUser } from "@/lib/auth/session"
import { getDictionary, hasLocale, type Locale } from "../dictionaries"

type TagsPageProps = {
  params: Promise<{ lang: string }>
}

export default async function TagsPage({ params }: TagsPageProps) {
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
    <AppShell title={dict.tags.title} lang={lang} user={{ name: user.name, email: user.email }} dict={dict}>
      <TagsPageClient dict={dict} />
    </AppShell>
  )
}
