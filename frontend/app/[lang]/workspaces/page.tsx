import { notFound, redirect } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { WorkspacesPageClient } from "@/components/pages/workspaces-page-client"
import { getSessionUser } from "@/lib/auth/session"
import { getDictionary, hasLocale, type Locale } from "../dictionaries"

type WorkspacesPageProps = {
  params: Promise<{ lang: string }>
}

export default async function WorkspacesPage({ params }: WorkspacesPageProps) {
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
    <AppShell title={dict.workspaces.title} lang={lang} user={{ name: user.name, email: user.email }} dict={dict}>
      <WorkspacesPageClient dict={dict} />
    </AppShell>
  )
}
