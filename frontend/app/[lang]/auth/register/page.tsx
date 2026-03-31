import { notFound, redirect } from "next/navigation"
import { AuthSplitShell } from "@/components/auth/auth-split-shell"
import { RegisterForm } from "@/components/auth/register-form"
import { getSessionUser } from "@/lib/auth/session"
import { getDictionary, hasLocale, type Locale } from "../../dictionaries"

type RegisterPageProps = {
  params: Promise<{ lang: string }>
}

export default async function RegisterPage({ params }: RegisterPageProps) {
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
      title={dict.auth.registerPage.title}
      description={dict.auth.registerPage.description}
      footerText={dict.auth.registerPage.footerText}
      footerActionLabel={dict.auth.registerPage.footerActionLabel}
      footerActionHref={`/${lang}/auth/login`}
      leftTagline={dict.auth.shell.leftTagline}
    >
      <RegisterForm lang={lang} dict={dict} />
    </AuthSplitShell>
  )
}
