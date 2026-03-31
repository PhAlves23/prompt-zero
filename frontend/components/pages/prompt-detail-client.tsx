"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, ChevronsUpDown, Copy } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useRef, useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { z } from "zod/v4"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { bffFetch, ClientHttpError } from "@/lib/api/client"
import { queryKeys } from "@/lib/api/query-keys"
import { runExecutionStream } from "@/lib/features/executions/stream-execution"
import { cn } from "@/lib/utils"
import type {
  Execution,
  ExperimentResults,
  ExperimentRunResult,
  PaginatedResult,
  Prompt,
  PromptVariable,
  PromptVersion,
} from "@/lib/api/types"

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
  const [executeVariables, setExecuteVariables] = useState<Record<string, string>>({})
  const [streamOutput, setStreamOutput] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamStatus, setStreamStatus] = useState<"idle" | "running" | "done" | "error" | "cancelled">("idle")
  const [streamError, setStreamError] = useState("")
  const [lastExecutionInput, setLastExecutionInput] = useState("")
  const [experimentId, setExperimentId] = useState("")
  const [experimentPromptBId, setExperimentPromptBId] = useState("")
  const [openPromptB, setOpenPromptB] = useState(false)
  const [sampleSizeTarget, setSampleSizeTarget] = useState("")
  const [trafficSplitA, setTrafficSplitA] = useState("50")
  const [abRunVariables, setAbRunVariables] = useState<Record<string, string>>({})
  const [abLastExposureId, setAbLastExposureId] = useState("")
  const [abLastVariant, setAbLastVariant] = useState<"A" | "B" | null>(null)
  const [abLastOutput, setAbLastOutput] = useState("")
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

  const promptsForExperimentQuery = useQuery({
    queryKey: queryKeys.prompts.list(`ab-${promptId}`),
    queryFn: () => bffFetch<PaginatedResult<Prompt>>("/prompts?page=1&limit=20"),
  })
  const promptsForExperiment = useMemo(
    () => promptsForExperimentQuery.data?.data ?? [],
    [promptsForExperimentQuery.data?.data],
  )
  const promptBOptions = promptsForExperiment.filter((prompt) => prompt.id !== promptId)
  const selectedPromptB = useMemo(
    () => promptsForExperiment.find((prompt) => prompt.id === experimentPromptBId),
    [promptsForExperiment, experimentPromptBId],
  )

  const promptBVariablesQuery = useQuery({
    queryKey: queryKeys.prompts.variables(experimentPromptBId),
    queryFn: () => bffFetch<PromptVariable[]>(`/prompts/${experimentPromptBId}/variables`),
    enabled: experimentPromptBId.length > 0,
  })

  const abTemplateVariables = useMemo(() => {
    const merged = new Map<string, PromptVariable>()
    for (const variable of variablesQuery.data ?? []) {
      merged.set(variable.name, variable)
    }
    for (const variable of promptBVariablesQuery.data ?? []) {
      if (!merged.has(variable.name)) {
        merged.set(variable.name, variable)
      }
    }
    return Array.from(merged.values())
  }, [variablesQuery.data, promptBVariablesQuery.data])

  const abUsesTemplate = Boolean(promptQuery.data?.isTemplate || selectedPromptB?.isTemplate)
  const isLoadingAbTemplateVariables =
    abUsesTemplate && (variablesQuery.isFetching || promptBVariablesQuery.isFetching)

  const experimentResultsQuery = useQuery({
    queryKey: queryKeys.experiments.results(experimentId),
    queryFn: () => bffFetch<ExperimentResults>(`/experiments/${experimentId}/results`),
    enabled: experimentId.length > 0,
    refetchInterval: 5000,
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

  const createExperiment = useMutation({
    mutationFn: (payload: {
      promptAId: string
      promptBId: string
      sampleSizeTarget?: number
      trafficSplitA?: number
    }) =>
      bffFetch<{ id: string }>(`/experiments`, {
        method: "POST",
        body: payload,
      }),
    onSuccess: (result) => {
      setExperimentId(result.id)
      setAbLastExposureId("")
      setAbLastOutput("")
      setAbLastVariant(null)
      toast.success("Experimento A/B criado")
      void queryClient.invalidateQueries({ queryKey: queryKeys.experiments.results(result.id) })
    },
    onError: () => {
      toast.error("Nao foi possivel criar o experimento")
    },
  })

  const runExperiment = useMutation({
    mutationFn: () => {
      const settings = executeSettingsForm.getValues()
      const body: Record<string, unknown> = {
        model: promptQuery.data?.model ?? "gpt-4o-mini",
        temperature: settings.temperature,
        topP: settings.topP,
        topK: settings.topK,
        maxTokens: settings.maxTokens,
      }
      const filteredVariables = Object.fromEntries(
        abTemplateVariables
          .map((variable) => [
            variable.name,
            (abRunVariables[variable.name] ?? variable.defaultValue ?? "").trim(),
          ])
          .filter(([, value]) => value !== ""),
      )
      if (Object.keys(filteredVariables).length > 0) {
        body.variables = filteredVariables
      }
      return bffFetch<ExperimentRunResult>(`/experiments/${experimentId}/run`, {
        method: "POST",
        body,
      })
    },
    onSuccess: (result) => {
      setAbLastExposureId(result.exposureId)
      setAbLastVariant(result.variant)
      setAbLastOutput(result.output)
      toast.success(`Rodada executada na variante ${result.variant}`)
    },
    onError: (error) => {
      if (
        error instanceof ClientHttpError &&
        (error.payload.code === "errors.providerApiKeyNotConfigured" ||
          error.payload.message === "errors.providerApiKeyNotConfigured")
      ) {
        toast.error("Configure uma API key para o provedor/modelo selecionado em Settings > API Keys.")
      } else if (error instanceof ClientHttpError) {
        toast.error(error.payload.message)
      } else if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error("Falha ao executar rodada A/B")
      }
    },
  })

  const voteExperiment = useMutation({
    mutationFn: (winnerVariant: "A" | "B") =>
      bffFetch<ExperimentResults>(`/experiments/${experimentId}/vote`, {
        method: "POST",
        body: {
          exposureId: abLastExposureId,
          winnerVariant,
        },
      }),
    onSuccess: (result) => {
      queryClient.setQueryData(queryKeys.experiments.results(experimentId), result)
      setAbLastExposureId("")
      setAbLastVariant(null)
      setAbLastOutput("")
      toast.success("Voto registrado")
    },
    onError: (error) => {
      if (
        error instanceof ClientHttpError &&
        (error.payload.code === "errors.experimentVoteAlreadyRegistered" ||
          error.payload.message === "errors.experimentVoteAlreadyRegistered")
      ) {
        setAbLastExposureId("")
        setAbLastVariant(null)
        setAbLastOutput("")
        toast.error("Esse resultado ja foi votado. Execute uma nova rodada para votar novamente.")
        return
      }
      toast.error("Nao foi possivel registrar o voto")
    },
  })

  const stopExperiment = useMutation({
    mutationFn: () =>
      bffFetch<ExperimentResults>(`/experiments/${experimentId}/stop`, {
        method: "POST",
      }),
    onSuccess: (result) => {
      queryClient.setQueryData(queryKeys.experiments.results(experimentId), result)
      toast.success("Experimento encerrado")
    },
    onError: () => {
      toast.error("Nao foi possivel encerrar o experimento")
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
              model: promptQuery.data?.model ?? "gpt-4o-mini",
              temperature: payload.settings.temperature,
              topP: payload.settings.topP,
              topK: payload.settings.topK,
              maxTokens: payload.settings.maxTokens,
              variables: Object.fromEntries(
                (variablesQuery.data ?? [])
                  .map((variable) => [
                    variable.name,
                    (executeVariables[variable.name] ?? variable.defaultValue ?? "").trim(),
                  ])
                  .filter(([, value]) => value !== ""),
              ),
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
        setStreamError((current) => current || "Falha ao executar prompt")
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
    if (promptQuery.data?.isTemplate) {
      const missingRequired = (variablesQuery.data ?? []).filter((variable) => {
        if (!variable.required) {
          return false
        }
        const value = executeVariables[variable.name] ?? variable.defaultValue ?? ""
        return !value || value.trim() === ""
      })
      if (missingRequired.length > 0) {
        toast.error(`Preencha as variaveis obrigatorias: ${missingRequired.map((item) => item.name).join(", ")}`)
        return
      }
    }
    executePrompt.mutate({ input, settings: parsed.data })
  }

  async function copyExecutionOutput(output: string | null) {
    if (!output || output.trim() === "") {
      toast.error("Essa execucao nao possui output para copiar")
      return
    }
    try {
      await navigator.clipboard.writeText(output)
      toast.success("Output copiado")
    } catch {
      toast.error("Nao foi possivel copiar o output")
    }
  }

  function createAbExperiment() {
    if (!experimentPromptBId) {
      toast.error("Selecione o Prompt B")
      return
    }
    const target = Number(sampleSizeTarget)
    const parsedTarget = Number.isFinite(target) && target > 0 ? target : undefined
    const parsedSplitA = Number(trafficSplitA)
    if (!Number.isFinite(parsedSplitA) || parsedSplitA < 1 || parsedSplitA > 99) {
      toast.error("Divisao A/B invalida. Use um valor entre 1 e 99 para A.")
      return
    }
    createExperiment.mutate({
      promptAId: promptId,
      promptBId: experimentPromptBId,
      sampleSizeTarget: parsedTarget,
      trafficSplitA: parsedSplitA,
    })
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
          {promptQuery.data?.isTemplate ? (
            <div className="grid gap-3 rounded-lg border p-3">
              <p className="text-sm font-medium">Variaveis do template</p>
              {variablesQuery.isPending ? (
                <p className="text-xs text-muted-foreground">Carregando variaveis...</p>
              ) : variablesQuery.data && variablesQuery.data.length > 0 ? (
                variablesQuery.data.map((variable) => (
                  <div key={`execute-variable-${variable.name}`} className="grid gap-1.5">
                    <Label htmlFor={`execute-variable-${variable.name}`}>
                      {variable.name}
                      {variable.required ? " *" : ""}
                    </Label>
                    <Input
                      id={`execute-variable-${variable.name}`}
                      placeholder={variable.defaultValue ?? "Informe um valor"}
                      value={executeVariables[variable.name] ?? variable.defaultValue ?? ""}
                      onChange={(event) => {
                        const value = event.currentTarget.value
                        setExecuteVariables((current) => ({
                          ...current,
                          [variable.name]: value,
                        }))
                      }}
                    />
                    {variable.description ? (
                      <p className="text-xs text-muted-foreground">{variable.description}</p>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">
                  Nenhuma variavel configurada. Sincronize as variaveis do template para evitar erro na execucao.
                </p>
              )}
            </div>
          ) : null}
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
          <CardTitle>Experimento A/B</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Prompt B</Label>
            <Popover open={openPromptB} onOpenChange={setOpenPromptB}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={openPromptB}
                  className="w-full justify-between"
                  disabled={promptsForExperimentQuery.isPending || promptsForExperimentQuery.isError}
                >
                  {experimentPromptBId
                    ? promptBOptions.find((prompt) => prompt.id === experimentPromptBId)?.title
                    : "Selecione um prompt"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-(--radix-popover-trigger-width) p-0">
                <Command>
                  <CommandInput placeholder="Buscar prompt por nome..." />
                  <CommandList>
                    <CommandEmpty>Nenhum prompt encontrado.</CommandEmpty>
                    <CommandGroup>
                      {promptBOptions.map((prompt) => (
                        <CommandItem
                          key={prompt.id}
                          value={`${prompt.title} ${prompt.id}`}
                          onSelect={() => {
                            setExperimentPromptBId(prompt.id)
                            setOpenPromptB(false)
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              experimentPromptBId === prompt.id ? "opacity-100" : "opacity-0",
                            )}
                          />
                          {prompt.title}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="sample-size-target">Amostra alvo (opcional)</Label>
            <Input
              id="sample-size-target"
              type="number"
              min={1}
              value={sampleSizeTarget}
              onChange={(event) => setSampleSizeTarget(event.currentTarget.value)}
              placeholder="Ex.: 100"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="traffic-split-a">Percentual para Prompt A (1-99)</Label>
            <Input
              id="traffic-split-a"
              type="number"
              min={1}
              max={99}
              value={trafficSplitA}
              onChange={(event) => setTrafficSplitA(event.currentTarget.value)}
              placeholder="Ex.: 80"
            />
            <p className="text-xs text-muted-foreground">
              Prompt B recebe automaticamente {Math.max(1, 100 - (Number(trafficSplitA) || 50))}%.
            </p>
          </div>
          {!abUsesTemplate ? (
            <p className="text-xs text-muted-foreground">
              Se algum prompt do experimento usar template, os campos aparecem aqui automaticamente.
            </p>
          ) : isLoadingAbTemplateVariables ? (
            <p className="text-xs text-muted-foreground">Carregando variaveis dos prompts A/B...</p>
          ) : abTemplateVariables.length > 0 ? (
            <div className="grid gap-2 rounded border p-3">
              <p className="text-xs text-muted-foreground">
                Variaveis da rodada A/B (uniao de placeholders dos prompts A e B).
              </p>
              {abTemplateVariables.map((variable) => (
                <div key={variable.name} className="grid gap-1.5">
                  <Label htmlFor={`ab-variable-${variable.name}`}>{variable.name}</Label>
                  <Input
                    id={`ab-variable-${variable.name}`}
                    placeholder={variable.defaultValue ?? "Informe um valor"}
                    value={abRunVariables[variable.name] ?? variable.defaultValue ?? ""}
                    onChange={(event) => {
                      const value = event.currentTarget.value
                      setAbRunVariables((current) => ({
                        ...current,
                        [variable.name]: value,
                      }))
                    }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Nenhuma variavel configurada para os prompts selecionados.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="cursor-pointer"
              disabled={createExperiment.isPending || !experimentPromptBId}
              onClick={createAbExperiment}
            >
              {createExperiment.isPending ? "Criando..." : "Criar experimento"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              disabled={!experimentId || runExperiment.isPending}
              onClick={() => runExperiment.mutate()}
            >
              {runExperiment.isPending ? "Executando rodada..." : "Executar rodada A/B"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              disabled={!experimentId || stopExperiment.isPending}
              onClick={() => stopExperiment.mutate()}
            >
              {stopExperiment.isPending ? "Encerrando..." : "Encerrar experimento"}
            </Button>
          </div>

          {experimentId ? (
            <div className="rounded border p-3 text-sm">
              <p className="font-medium">Experimento atual: {experimentId}</p>
              <p className="text-muted-foreground">
                Status: {experimentResultsQuery.data?.status ?? "carregando"}
              </p>
              <p className="text-muted-foreground">
                Distribuicao: {experimentResultsQuery.data?.trafficSplitA ?? 50}% (A) /{" "}
                {experimentResultsQuery.data?.trafficSplitB ?? 50}% (B)
              </p>
              <p className="text-muted-foreground">
                Votos A: {experimentResultsQuery.data?.votesA ?? 0} | Votos B: {experimentResultsQuery.data?.votesB ?? 0}
              </p>
              <p className="text-muted-foreground">
                Percentual A: {experimentResultsQuery.data?.percentA ?? 0}% | Percentual B: {experimentResultsQuery.data?.percentB ?? 0}%
              </p>
            </div>
          ) : null}

          {abLastExposureId ? (
            <div className="grid gap-2 rounded border p-3 text-sm">
              <p className="font-medium">
                Ultima rodada: variante {abLastVariant} (exposicao {abLastExposureId})
              </p>
              <p className="max-h-40 overflow-auto whitespace-pre-wrap text-muted-foreground">
                {abLastOutput}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="cursor-pointer"
                  onClick={() => voteExperiment.mutate("A")}
                  disabled={voteExperiment.isPending || !experimentId}
                >
                  Votar A
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="cursor-pointer"
                  onClick={() => voteExperiment.mutate("B")}
                  disabled={voteExperiment.isPending || !experimentId}
                >
                  Votar B
                </Button>
              </div>
            </div>
          ) : null}
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
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="font-medium">{execution.model}</div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="cursor-pointer"
                    disabled={!execution.output}
                    onClick={() => copyExecutionOutput(execution.output)}
                  >
                    <Copy className="h-4 w-4" />
                    Copiar output
                  </Button>
                </div>
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
