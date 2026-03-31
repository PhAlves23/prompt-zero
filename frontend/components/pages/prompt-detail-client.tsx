"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useRef, useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { z } from "zod/v4"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { bffFetch } from "@/lib/api/client"
import { queryKeys } from "@/lib/api/query-keys"
import { runExecutionStream } from "@/lib/features/executions/stream-execution"
import type { Execution, PaginatedResult, Prompt, PromptVariable, PromptVersion } from "@/lib/api/types"

const updateSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  content: z.string().min(10),
  isPublic: z.boolean(),
})

const executeSettingsSchema = z.object({
  temperature: z.number().min(0).max(2),
  topP: z.number().min(0).max(1),
  topK: z.number().int().min(1).max(200),
  maxTokens: z.number().int().min(1).max(4000),
})

type UpdatePromptValues = z.infer<typeof updateSchema>
type ExecuteSettingsValues = z.infer<typeof executeSettingsSchema>

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR")
}

export function PromptDetailClient({
  lang,
  promptId,
}: {
  lang: string
  promptId: string
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [executeInput, setExecuteInput] = useState("")
  const [streamOutput, setStreamOutput] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamStatus, setStreamStatus] = useState<"idle" | "running" | "done" | "error" | "cancelled">("idle")
  const [streamError, setStreamError] = useState("")
  const [lastExecutionInput, setLastExecutionInput] = useState("")
  const abortControllerRef = useRef<AbortController | null>(null)

  const promptQuery = useQuery({
    queryKey: queryKeys.prompts.detail(promptId),
    queryFn: () => bffFetch<Prompt>(`/prompts/${promptId}`),
  })

  const versionsQuery = useQuery({
    queryKey: queryKeys.prompts.versions(promptId),
    queryFn: () => bffFetch<PromptVersion[]>(`/prompts/${promptId}/versions`),
  })

  const variablesQuery = useQuery({
    queryKey: queryKeys.prompts.variables(promptId),
    queryFn: () => bffFetch<PromptVariable[]>(`/prompts/${promptId}/variables`),
  })

  const executionsQuery = useQuery({
    queryKey: queryKeys.prompts.executions(promptId),
    queryFn: () => bffFetch<PaginatedResult<Execution>>(`/prompts/${promptId}/executions?page=1&limit=10`),
  })

  const form = useForm<UpdatePromptValues>({
    values: {
      title: promptQuery.data?.title ?? "",
      description: promptQuery.data?.description ?? "",
      content: promptQuery.data?.content ?? "",
      isPublic: promptQuery.data?.isPublic ?? false,
    },
  })
  const updateIsPublic = useWatch({
    control: form.control,
    name: "isPublic",
  })

  const executeSettingsForm = useForm<ExecuteSettingsValues>({
    defaultValues: {
      temperature: 0.7,
      topP: 0.95,
      topK: 40,
      maxTokens: 2048,
    },
  })

  const updatePrompt = useMutation({
    mutationFn: (values: UpdatePromptValues) =>
      bffFetch<Prompt>(`/prompts/${promptId}`, {
        method: "PATCH",
        body: values,
      }),
    onSuccess: (updatedPrompt) => {
      toast.success("Prompt atualizado")
      queryClient.setQueryData(queryKeys.prompts.detail(promptId), updatedPrompt)
      void queryClient.invalidateQueries({ queryKey: queryKeys.prompts.detail(promptId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.prompts.versions(promptId) })
      void queryClient.invalidateQueries({ queryKey: ["prompts", "list"] })
    },
  })

  const forkPrompt = useMutation({
    mutationFn: () => bffFetch<Prompt>(`/prompts/${promptId}/fork`, { method: "POST" }),
    onSuccess: (prompt) => {
      toast.success("Prompt duplicado")
      router.push(`/${lang}/prompts/${prompt.id}`)
      router.refresh()
    },
  })

  const deletePrompt = useMutation({
    mutationFn: () => bffFetch<void>(`/prompts/${promptId}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Prompt removido")
      router.push(`/${lang}/prompts`)
      router.refresh()
    },
  })

  const restoreVersion = useMutation({
    mutationFn: (versionId: string) =>
      bffFetch<Prompt>(`/prompts/${promptId}/versions/${versionId}/restore`, { method: "POST" }),
    onSuccess: () => {
      toast.success("Versao restaurada")
      void queryClient.invalidateQueries({ queryKey: queryKeys.prompts.detail(promptId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.prompts.versions(promptId) })
    },
  })

  const syncVariables = useMutation({
    mutationFn: (variables: PromptVariable[]) =>
      bffFetch<PromptVariable[]>(`/prompts/${promptId}/variables`, {
        method: "PUT",
        body: { variables },
      }),
    onSuccess: () => {
      toast.success("Variaveis sincronizadas")
      void queryClient.invalidateQueries({ queryKey: queryKeys.prompts.variables(promptId) })
    },
  })

  const executePrompt = useMutation({
    mutationFn: async (payload: { input: string; settings: ExecuteSettingsValues }) => {
      abortControllerRef.current?.abort()
      const controller = new AbortController()
      abortControllerRef.current = controller
      setIsStreaming(true)
      setStreamStatus("running")
      setStreamError("")
      setStreamOutput("")
      setLastExecutionInput(payload.input)

      await runExecutionStream({
        input: payload.input,
        signal: controller.signal,
        maxRetries: 2,
        fetchExecution: (executionInput, signal) =>
          fetch(`/api/bff/prompts/${promptId}/execute`, {
            method: "POST",
            headers: {
              "content-type": "application/json",
            },
            body: JSON.stringify({
              input: executionInput,
              model: promptQuery.data?.model ?? "gpt-4o-mini",
              temperature: payload.settings.temperature,
              topP: payload.settings.topP,
              topK: payload.settings.topK,
              maxTokens: payload.settings.maxTokens,
            }),
            signal,
          }),
        onChunk: (content) => {
          setStreamOutput((current) => `${current}${content}`)
        },
        onErrorMessage: (message) => {
          setStreamError(message)
        },
      })
      setIsStreaming(false)
      setStreamStatus("done")
      abortControllerRef.current = null
    },
    onSuccess: () => {
      toast.success("Execucao concluida")
      void queryClient.invalidateQueries({ queryKey: queryKeys.prompts.executions(promptId) })
    },
    onError: (error) => {
      if (error instanceof Error && error.name === "AbortError") {
        setStreamStatus("cancelled")
        setStreamError("")
      } else {
        setStreamStatus("error")
        if (!streamError) {
          setStreamError("Falha ao executar prompt")
        }
      }
      setIsStreaming(false)
      abortControllerRef.current = null
      toast.error("Falha ao executar prompt")
    },
  })

  function cancelExecution() {
    abortControllerRef.current?.abort()
  }

  function runWithSettings(input: string) {
    const parsed = executeSettingsSchema.safeParse(executeSettingsForm.getValues())
    if (!parsed.success) {
      toast.error("Configuracoes avancadas invalidas")
      return
    }
    executePrompt.mutate({ input, settings: parsed.data })
  }

  if (promptQuery.isPending) {
    return <div className="px-4 lg:px-6 text-sm text-muted-foreground">Carregando prompt...</div>
  }
  if (promptQuery.isError || !promptQuery.data) {
    return <div className="px-4 lg:px-6 text-sm text-destructive">Nao foi possivel carregar o prompt.</div>
  }

  return (
    <div className="grid gap-4 px-4 lg:px-6">
      <Card>
        <CardHeader>
          <CardTitle>Editar prompt</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-xs text-muted-foreground">
            Ultima edicao: {formatDateTime(promptQuery.data.updatedAt)}
          </p>
          <form
            className="grid gap-4"
            onSubmit={form.handleSubmit((values) => {
              const parsed = updateSchema.safeParse(values)
              if (!parsed.success) {
                parsed.error.issues.forEach((issue) => {
                  const field = issue.path[0]
                  if (
                    field === "title" ||
                    field === "description" ||
                    field === "content" ||
                    field === "isPublic"
                  ) {
                    form.setError(field, { message: issue.message })
                  }
                })
                return
              }
              updatePrompt.mutate(parsed.data)
            })}
          >
            <div className="grid gap-2">
              <Label htmlFor="title">Titulo</Label>
              <Input id="title" {...form.register("title")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Descricao</Label>
              <Input id="description" {...form.register("description")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="content">Conteudo</Label>
              <Textarea id="content" rows={10} {...form.register("content")} />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={updateIsPublic}
                onCheckedChange={(checked) => form.setValue("isPublic", checked)}
                aria-label="Definir prompt como publico"
              />
              <span className="text-sm text-muted-foreground">Prompt publico</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" className="cursor-pointer" disabled={updatePrompt.isPending}>
                Salvar
              </Button>
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer"
                onClick={() => forkPrompt.mutate()}
                disabled={forkPrompt.isPending}
              >
                Duplicar
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="cursor-pointer"
                onClick={() => deletePrompt.mutate()}
                disabled={deletePrompt.isPending}
              >
                Excluir
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Executar prompt</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <Textarea
            rows={4}
            placeholder="Informe o input para executar"
            value={executeInput}
            onChange={(event) => setExecuteInput(event.currentTarget.value)}
          />
          <div className="grid gap-3 rounded-lg border p-3 md:grid-cols-2">
            <p className="md:col-span-2 text-sm font-medium">Configuracoes avancadas</p>
            <div className="grid gap-1.5">
              <Label htmlFor="temperature">Temperature</Label>
              <Input
                id="temperature"
                type="number"
                step="0.01"
                min={0}
                max={2}
                {...executeSettingsForm.register("temperature", { valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground">Controla a aleatoriedade (0-2)</p>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="top-p">Top P</Label>
              <Input
                id="top-p"
                type="number"
                step="0.01"
                min={0}
                max={1}
                {...executeSettingsForm.register("topP", { valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground">Nucleus sampling (0-1)</p>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="top-k">Top K</Label>
              <Input
                id="top-k"
                type="number"
                min={1}
                max={200}
                {...executeSettingsForm.register("topK", { valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground">Limita o numero de tokens considerados</p>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="max-tokens">Max Tokens</Label>
              <Input
                id="max-tokens"
                type="number"
                min={1}
                max={4000}
                {...executeSettingsForm.register("maxTokens", { valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground">Numero maximo de tokens na resposta</p>
            </div>
          </div>
          <Button
            type="button"
            className="w-fit cursor-pointer"
            disabled={isStreaming || executeInput.trim().length === 0}
            onClick={() => runWithSettings(executeInput)}
          >
            {isStreaming ? "Executando..." : "Executar"}
          </Button>
          {isStreaming ? (
            <Button type="button" variant="outline" className="w-fit cursor-pointer" onClick={cancelExecution}>
              Cancelar execucao
            </Button>
          ) : null}
          {!isStreaming && streamStatus === "error" && lastExecutionInput ? (
            <Button
              type="button"
              variant="outline"
              className="w-fit cursor-pointer"
              onClick={() => runWithSettings(lastExecutionInput)}
            >
              Tentar novamente
            </Button>
          ) : null}
          <div className="rounded border bg-card p-3">
            <p className="text-xs text-muted-foreground">Output em tempo real ({streamStatus})</p>
            <p className="mt-2 min-h-10 whitespace-pre-wrap text-sm">
              {streamOutput || "Aguardando execucao"}
            </p>
            {streamError ? <p className="mt-2 text-sm text-destructive">{streamError}</p> : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Versoes ({versionsQuery.data?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {versionsQuery.isPending ? (
            <p className="text-sm text-muted-foreground">Carregando versoes...</p>
          ) : versionsQuery.isError ? (
            <p className="text-sm text-destructive">Falha ao carregar versoes.</p>
          ) : versionsQuery.data && versionsQuery.data.length > 0 ? (
            versionsQuery.data.map((version) => (
              <div key={version.id} className="rounded border p-3 text-sm">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="font-medium">Versao {version.version}</p>
                    <p className="text-xs text-muted-foreground">
                      Data/hora: {formatDateTime(version.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="cursor-pointer"
                      onClick={() => restoreVersion.mutate(version.id)}
                      disabled={restoreVersion.isPending}
                    >
                      Restaurar
                    </Button>
                    <Button type="button" variant="outline" asChild>
                      <Link href={`/${lang}/prompts/${promptId}/versions/${version.id}`} className="cursor-pointer">
                        Ver detalhes
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <Empty className="border">
              <EmptyHeader>
                <EmptyTitle>Nenhuma versao disponivel</EmptyTitle>
                <EmptyDescription>Edite o prompt para criar novas versoes.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Variaveis ({variablesQuery.data?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {variablesQuery.isPending ? (
            <p className="text-sm text-muted-foreground">Carregando variaveis...</p>
          ) : variablesQuery.isError ? (
            <p className="text-sm text-destructive">Falha ao carregar variaveis.</p>
          ) : variablesQuery.data && variablesQuery.data.length > 0 ? (
            <>
              {variablesQuery.data.map((variable) => (
                <div key={variable.name} className="rounded border p-3 text-sm">
                  <span className="font-medium">{variable.name}</span> ({variable.type})
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer"
                onClick={() => syncVariables.mutate(variablesQuery.data ?? [])}
                disabled={syncVariables.isPending}
              >
                Sincronizar variaveis
              </Button>
            </>
          ) : (
            <Empty className="border">
              <EmptyHeader>
                <EmptyTitle>Nenhuma variavel detectada</EmptyTitle>
                <EmptyDescription>Esse prompt nao possui placeholders no template.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Execucoes ({executionsQuery.data?.data.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {executionsQuery.isPending ? (
            <p className="text-sm text-muted-foreground">Carregando execucoes...</p>
          ) : executionsQuery.isError ? (
            <p className="text-sm text-destructive">Falha ao carregar execucoes.</p>
          ) : executionsQuery.data && executionsQuery.data.data.length > 0 ? (
            executionsQuery.data.data.map((execution) => (
              <div key={execution.id} className="rounded border p-3 text-sm">
                <div className="font-medium">{execution.model}</div>
                <div className="text-muted-foreground">{execution.output ?? "Sem output"}</div>
              </div>
            ))
          ) : (
            <Empty className="border">
              <EmptyHeader>
                <EmptyTitle>Nenhuma execucao encontrada</EmptyTitle>
                <EmptyDescription>Rode o prompt para ver o historico de execucoes.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
