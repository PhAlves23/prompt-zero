import { notFound, redirect } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { SettingsPageClient } from "@/components/pages/settings-page-client"
import { getSessionUser } from "@/lib/auth/session"
import { hasLocale } from "../dictionaries"

type SettingsPageProps = {
  params: Promise<{ lang: string }>
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { lang } = await params
  if (!hasLocale(lang)) {
    notFound()
  }
  const user = await getSessionUser()
  if (!user) {
    redirect(`/${lang}/auth/login`)
  }

  return (
    <AppShell title="Settings" lang={lang} user={{ name: user.name, email: user.email }}>
      <SettingsPageClient />
    </AppShell>
  )
}
