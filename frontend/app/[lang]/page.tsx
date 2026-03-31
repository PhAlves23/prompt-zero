import { notFound, redirect } from "next/navigation"
import { getSessionUser } from "@/lib/auth/session"
import { hasLocale } from "./dictionaries"

type PageProps = {
  params: Promise<{ lang: string }>
}

export default async function Home({ params }: PageProps) {
  const { lang } = await params

  if (!hasLocale(lang)) {
    notFound()
  }

  const user = await getSessionUser()

  if (user) {
    redirect(`/${lang}/dashboard`)
  }

  redirect(`/${lang}/auth/login`)
}
