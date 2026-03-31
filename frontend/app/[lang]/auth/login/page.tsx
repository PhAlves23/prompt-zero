import { notFound, redirect } from "next/navigation"
import { AuthSplitShell } from "@/components/auth/auth-split-shell"
import { LoginForm } from "@/components/auth/login-form"
import { getSessionUser } from "@/lib/auth/session"
import { getDictionary, hasLocale, type Locale } from "../../dictionaries"

type LoginPageProps = {
  params: Promise<{ lang: string }>
}

export default async function LoginPage({ params }: LoginPageProps) {
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
      title={dict.auth.loginPage.title}
      description={dict.auth.loginPage.description}
      footerText={dict.auth.loginPage.footerText}
      footerActionLabel={dict.auth.loginPage.footerActionLabel}
      footerActionHref={`/${lang}/auth/register`}
      leftTagline={dict.auth.shell.leftTagline}
    >
      <LoginForm lang={lang} dict={dict} />
    </AuthSplitShell>
  )
}
