import { notFound, redirect } from "next/navigation"
import { AuthSplitShell } from "@/components/auth/auth-split-shell"
import { OAuthCallbackClient } from "@/components/auth/oauth-callback-client"
import { getSessionUser } from "@/lib/auth/session"
import { getDictionary, hasLocale, type Locale } from "../../dictionaries"

type PageProps = {
  params: Promise<{ lang: string }>
}

export default async function OAuthCallbackPage({ params }: PageProps) {
  const { lang } = await params
  if (!hasLocale(lang)) {
    notFound()
  }

  const dict = await getDictionary(lang as Locale)
  const user = await getSessionUser()
  if (user) {
    redirect(`/${lang}/dashboard`)
  }

  return (
    <AuthSplitShell
      title={dict.auth.oauthCallback.pageTitle}
      description={dict.auth.oauthCallback.pageDescription}
      footerText={dict.auth.loginPage.footerText}
      footerActionLabel={dict.auth.loginPage.footerActionLabel}
      footerActionHref={`/${lang}/auth/register`}
      leftTagline={dict.auth.shell.leftTagline}
    >
      <OAuthCallbackClient lang={lang} dict={dict} />
    </AuthSplitShell>
  )
}
