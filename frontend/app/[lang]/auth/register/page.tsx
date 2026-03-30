import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Criar conta</CardTitle>
          <CardDescription>Comece a organizar e testar seus prompts de IA.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RegisterForm lang={lang} />
          <p className="text-sm text-muted-foreground">
            Ja possui conta?{" "}
            <Link href={`/${lang}/auth/login`} className="text-primary hover:underline">
              Entrar
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
