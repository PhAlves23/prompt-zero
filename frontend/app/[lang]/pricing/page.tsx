import { notFound } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { PricingPageClient } from "@/components/pages/pricing-page-client"
import { getSessionUser } from "@/lib/auth/session"
import { getDictionary, hasLocale, type Locale } from "../dictionaries"

export default async function PricingPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()
  const user = await getSessionUser()
  const dict = await getDictionary(lang as Locale)
  return (
    <AppShell
      title={dict.pricingPage.title}
      lang={lang}
      user={user ? { name: user.name, email: user.email } : null}
      dict={dict}
    >
      <PricingPageClient lang={lang} dict={dict} />
    </AppShell>
  )
}
