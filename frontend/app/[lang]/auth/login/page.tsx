import { notFound, redirect } from "next/navigation"
import { AuthSplitShell } from "@/components/auth/auth-split-shell"
import { LoginForm } from "@/components/auth/login-form"
import { getSessionUser } from "@/lib/auth/session"
import { hasLocale } from "../../dictionaries"

type LoginPageProps = {
  params: Promise<{ lang: string }>
}

export default async function LoginPage({ params }: LoginPageProps) {
  const { lang } = await params
  if (!hasLocale(lang)) {
    notFound()
  }

  const user = await getSessionUser()
  if (user) {
    redirect(`/${lang}/dashboard`)
  }

  return (
    <AuthSplitShell
      title="Entrar"
      description="Acesse sua conta para gerenciar seus prompts."
      footerText="Ainda nao possui conta?"
      footerActionLabel="Criar conta"
      footerActionHref={`/${lang}/auth/register`}
    >
      <LoginForm lang={lang} />
    </AuthSplitShell>
  )
}
