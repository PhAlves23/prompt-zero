import { notFound, redirect } from "next/navigation"
import { AuthSplitShell } from "@/components/auth/auth-split-shell"
import { RegisterForm } from "@/components/auth/register-form"
import { getSessionUser } from "@/lib/auth/session"
import { hasLocale } from "../../dictionaries"

type RegisterPageProps = {
  params: Promise<{ lang: string }>
}

export default async function RegisterPage({ params }: RegisterPageProps) {
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
      title="Criar conta"
      description="Comece a organizar e testar seus prompts de IA."
      footerText="Ja possui conta?"
      footerActionLabel="Entrar"
      footerActionHref={`/${lang}/auth/login`}
    >
      <RegisterForm lang={lang} />
    </AuthSplitShell>
  )
}
