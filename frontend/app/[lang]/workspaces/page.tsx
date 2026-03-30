import { notFound, redirect } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { WorkspacesPageClient } from "@/components/pages/workspaces-page-client"
import { getSessionUser } from "@/lib/auth/session"
import { hasLocale } from "../dictionaries"

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

  return (
    <AppShell title="Workspaces" lang={lang} user={{ name: user.name, email: user.email }}>
      <WorkspacesPageClient />
    </AppShell>
  )
}
