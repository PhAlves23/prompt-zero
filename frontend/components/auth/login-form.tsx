"use client"

import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { z } from "zod/v4"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const schema = z.object({
  email: z.email(),
  password: z.string().min(6),
})

type LoginFormValues = z.infer<typeof schema>

export function LoginForm({ lang }: { lang: string }) {
  const router = useRouter()
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

    const response = await fetch("/api/session/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(parsed.data),
    })

    if (!response.ok) {
      toast.error("Falha ao autenticar")
      return
    }

    toast.success("Sessão iniciada")
    router.push(`/${lang}/dashboard`)
    router.refresh()
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          placeholder="voce@empresa.com"
          autoComplete="email"
          {...form.register("email")}
          aria-invalid={Boolean(form.formState.errors.email)}
        />
        {form.formState.errors.email ? (
          <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
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
        {form.formState.isSubmitting ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  )
}
