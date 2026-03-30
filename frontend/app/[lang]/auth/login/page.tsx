import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Entrar</CardTitle>
          <CardDescription>Acesse sua conta para gerenciar seus prompts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <LoginForm lang={lang} />
          <p className="text-sm text-muted-foreground">
            Ainda nao possui conta?{" "}
            <Link href={`/${lang}/auth/register`} className="text-primary hover:underline">
              Criar conta
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
