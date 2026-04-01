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

function createRegisterSchema(dict: Dictionary) {
  const m = validationMessages(dict)
  return z.object({
    name: z.string().min(2, { message: m.stringMin(2) }).max(100, { message: m.stringMax(100) }),
    email: z.string().email({ message: m.invalidEmail() }),
    password: z.string().min(8, { message: m.passwordMin(8) }),
  })
}

type RegisterFormValues = z.infer<ReturnType<typeof createRegisterSchema>>

export function RegisterForm({ lang, dict }: { lang: string; dict: Dictionary }) {
  const router = useRouter()
  const schema = useMemo(() => createRegisterSchema(dict), [dict])
  const form = useForm<RegisterFormValues>({
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  })

  async function onSubmit(values: RegisterFormValues) {
    const parsed = schema.safeParse(values)
    if (!parsed.success) {
      parsed.error.issues.forEach((issue) => {
        const field = issue.path[0]
        if (field === "name" || field === "email" || field === "password") {
          form.setError(field, { message: issue.message })
        }
      })
      return
    }

    const localeHeaders = buildBackendLocaleHeadersFromLocale(normalizeAppLocale(lang))
    const response = await fetch("/api/session/register", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...localeHeaders,
      },
      body: JSON.stringify(parsed.data),
    })

    if (!response.ok) {
      toast.error(dict.auth.registerForm.toastRegisterFailed)
      return
    }

    toast.success(dict.auth.registerForm.toastRegisterSuccess)
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
        <Label htmlFor="name">{dict.auth.registerForm.nameLabel}</Label>
        <Input id="name" autoComplete="name" {...form.register("name")} />
        {form.formState.errors.name ? (
          <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">{dict.auth.email}</Label>
        <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
        {form.formState.errors.email ? (
          <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">{dict.auth.password}</Label>
        <Input id="password" type="password" autoComplete="new-password" {...form.register("password")} />
        {form.formState.errors.password ? (
          <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
        ) : null}
      </div>
      <Button type="submit" className="w-full cursor-pointer" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? dict.auth.registerForm.submitting : dict.auth.registerForm.submit}
      </Button>
    </form>
  )
}
