"use client"

import { useRouter } from "next/navigation"
import { useMemo } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod/v4"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Dictionary } from "@/app/[lang]/dictionaries"
import { buildBackendLocaleHeadersFromLocale, normalizeAppLocale } from "@/lib/locale-i18n"
import { validationMessages } from "@/lib/zod-i18n"

function createLoginSchema(dict: Dictionary) {
  const m = validationMessages(dict)
  return z.object({
    email: z.string().email({ message: m.invalidEmail() }),
    password: z.string().min(6, { message: m.passwordMin(6) }),
  })
}

type LoginFormValues = z.infer<ReturnType<typeof createLoginSchema>>

export function LoginForm({ lang, dict }: { lang: string; dict: Dictionary }) {
  const router = useRouter()
  const schema = useMemo(() => createLoginSchema(dict), [dict])
  const form = useForm<LoginFormValues>({
    defaultValues: {
      email: "",
      password: "",
    },
  })

  async function onSubmit(values: LoginFormValues) {
    const parsed = schema.safeParse(values)
    if (!parsed.success) {
      parsed.error.issues.forEach((issue) => {
        const field = issue.path[0]
        if (field === "email" || field === "password") {
          form.setError(field, { message: issue.message })
        }
      })
      return
    }

    const localeHeaders = buildBackendLocaleHeadersFromLocale(normalizeAppLocale(lang))
    const response = await fetch("/api/session/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...localeHeaders,
      },
      body: JSON.stringify(parsed.data),
    })

    if (!response.ok) {
      toast.error(dict.auth.loginForm.toastAuthFailed)
      return
    }

    toast.success(dict.auth.loginForm.toastSessionStarted)
    router.push(`/${lang}/dashboard`)
    router.refresh()
  }

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit(onSubmit)(event)
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="email">{dict.auth.email}</Label>
        <Input
          id="email"
          type="email"
          placeholder={dict.auth.loginForm.emailPlaceholder}
          autoComplete="email"
          {...form.register("email")}
          aria-invalid={Boolean(form.formState.errors.email)}
        />
        {form.formState.errors.email ? (
          <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">{dict.auth.password}</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          {...form.register("password")}
          aria-invalid={Boolean(form.formState.errors.password)}
        />
        {form.formState.errors.password ? (
          <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
        ) : null}
      </div>
      <Button type="submit" className="w-full cursor-pointer" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? dict.auth.loginForm.submitting : dict.auth.loginForm.submit}
      </Button>
    </form>
  )
}
