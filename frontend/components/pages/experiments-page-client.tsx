"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { bffFetch, ClientHttpError } from "@/lib/api/client"
import { queryKeys } from "@/lib/api/query-keys"
import { cn } from "@/lib/utils"
import type {
  ExperimentListItem,
  ExperimentResults,
  ExperimentRunResult,
  PaginatedResult,
  Prompt,
  PromptVariable,
} from "@/lib/api/types"

export type ExperimentsPageDictionary = {
  title: string
  status: {
    running: string
    stopped: string
  }
}

function formatDateTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value))
}

export function ExperimentsPageClient({
  lang,
  experiments: experimentsI18n,
}: {
  lang: string
  experiments: ExperimentsPageDictionary
}) {
  const queryClient = useQueryClient()
  const [promptAId, setPromptAId] = useState("")
  const [promptBId, setPromptBId] = useState("")
  const [openPromptA, setOpenPromptA] = useState(false)
  const [openPromptB, setOpenPromptB] = useState(false)
  const [sampleSizeTarget, setSampleSizeTarget] = useState("")
  const [trafficSplitA, setTrafficSplitA] = useState("50")
  const [runVariables, setRunVariables] = useState<Record<string, string>>({})
  const [lastRunsByExperiment, setLastRunsByExperiment] = useState<Record<string, ExperimentRunResult>>({})

  const promptsQuery = useQuery({
    queryKey: queryKeys.prompts.list("experiments-create"),
    queryFn: () => bffFetch<PaginatedResult<Prompt>>("/prompts?page=1&limit=20"),
  })

  const experimentsQuery = useQuery({
    queryKey: queryKeys.experiments.list,
    queryFn: () => bffFetch<ExperimentListItem[]>("/experiments"),
  })
  const availablePrompts = promptsQuery.data?.data ?? []
  const promptBOptions = availablePrompts.filter((prompt) => prompt.id !== promptAId)

  const selectedPromptA = useMemo(
    () => availablePrompts.find((prompt) => prompt.id === promptAId),
    [availablePrompts, promptAId],
  )
  const selectedPromptB = useMemo(
    () => availablePrompts.find((prompt) => prompt.id === promptBId),
    [availablePrompts, promptBId],
  )

  const promptAVariablesQuery = useQuery({
    queryKey: queryKeys.prompts.variables(promptAId),
    queryFn: () => bffFetch<PromptVariable[]>(`/prompts/${promptAId}/variables`),
    enabled: !!promptAId,
  })
  const promptBVariablesQuery = useQuery({
    queryKey: queryKeys.prompts.variables(promptBId),
    queryFn: () => bffFetch<PromptVariable[]>(`/prompts/${promptBId}/variables`),
    enabled: !!promptBId,
  })

  const templateVariables = useMemo(() => {
    const merged = new Map<string, PromptVariable>()
    for (const variable of promptAVariablesQuery.data ?? []) {
      merged.set(variable.name, variable)
    }
    for (const variable of promptBVariablesQuery.data ?? []) {
      if (!merged.has(variable.name)) {
        merged.set(variable.name, variable)
      }
    }
    return Array.from(merged.values())
  }, [promptAVariablesQuery.data, promptBVariablesQuery.data])

  const selectedUsesTemplate = Boolean(selectedPromptA?.isTemplate || selectedPromptB?.isTemplate)
  const isLoadingTemplateVariables =
    selectedUsesTemplate && (promptAVariablesQuery.isFetching || promptBVariablesQuery.isFetching)

  useEffect(() => {
    if (!selectedUsesTemplate) {
      setRunVariables({})
      return
    }
    setRunVariables((current) => {
      const next: Record<string, string> = {}
      for (const variable of templateVariables) {
        const existing = current[variable.name]
        if (existing && existing.trim() !== "") {
          next[variable.name] = existing
          continue
        }
        const fallback = variable.defaultValue ?? ""
        if (fallback.trim() !== "") {
          next[variable.name] = fallback
        }
      }
      return next
    })
  }, [selectedUsesTemplate, templateVariables])

  const runExperiment = useMutation({
    mutationFn: async (experiment: Pick<ExperimentListItem, "id">) => {
      const body: Record<string, unknown> = {}
      const filteredVariables = Object.fromEntries(
        Object.entries(runVariables).filter(([, value]) => value.trim() !== ""),
      )
      if (Object.keys(filteredVariables).length > 0) {
        body.variables = filteredVariables
      }
      return bffFetch<ExperimentRunResult>(`/experiments/${experiment.id}/run`, {
        method: "POST",
        body,
      })
    },
    onSuccess: (result, experiment) => {
      setLastRunsByExperiment((current) => ({
        ...current,
        [experiment.id]: result,
      }))
      toast.success("Rodada A/B executada")
      void queryClient.invalidateQueries({ queryKey: queryKeys.experiments.list })
    },
    onError: (error) => {
      if (error instanceof ClientHttpError) {
        toast.error(error.payload.message)
      } else if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error("Falha ao executar rodada A/B")
      }
    },
  })

  const voteExperiment = useMutation({
    mutationFn: (payload: { experimentId: string; exposureId: string; winnerVariant: "A" | "B" }) =>
      bffFetch<ExperimentResults>(`/experiments/${payload.experimentId}/vote`, {
        method: "POST",
        body: {
          exposureId: payload.exposureId,
          winnerVariant: payload.winnerVariant,
        },
      }),
    onSuccess: (_, payload) => {
      setLastRunsByExperiment((current) => {
        const next = { ...current }
        delete next[payload.experimentId]
        return next
      })
      toast.success("Voto registrado")
      void queryClient.invalidateQueries({ queryKey: queryKeys.experiments.list })
    },
    onError: (error, payload) => {
      if (error instanceof ClientHttpError) {
        if (
          error.payload.code === "errors.experimentVoteAlreadyRegistered" ||
          error.payload.message === "errors.experimentVoteAlreadyRegistered"
        ) {
          setLastRunsByExperiment((current) => {
            const next = { ...current }
            delete next[payload.experimentId]
            return next
          })
          toast.error("Esse resultado ja foi votado. Execute uma nova rodada para votar novamente.")
          return
        }
        toast.error(error.payload.message)
      } else if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error("Nao foi possivel registrar o voto")
      }
    },
  })

  const stopExperiment = useMutation({
    mutationFn: (experimentId: string) =>
      bffFetch<ExperimentResults>(`/experiments/${experimentId}/stop`, {
        method: "POST",
      }),
    onSuccess: () => {
      toast.success("Experimento encerrado")
      void queryClient.invalidateQueries({ queryKey: queryKeys.experiments.list })
    },
    onError: () => {
      toast.error("Falha ao encerrar experimento")
    },
  })

  const createExperiment = useMutation({
    mutationFn: (payload: {
      promptAId: string
      promptBId: string
      sampleSizeTarget?: number
      trafficSplitA: number
    }) =>
      bffFetch("/experiments", {
        method: "POST",
        body: payload,
      }),
    onSuccess: () => {
      setSampleSizeTarget("")
      toast.success("Experimento criado")
      void queryClient.invalidateQueries({ queryKey: queryKeys.experiments.list })
    },
    onError: () => {
      toast.error("Nao foi possivel criar o experimento")
    },
  })

  function handleCreateExperiment() {
    const splitA = Number(trafficSplitA)
    if (!promptAId || !promptBId) {
      toast.error("Selecione Prompt A e Prompt B")
      return
    }
    if (!Number.isFinite(splitA) || splitA < 1 || splitA > 99) {
      toast.error("Divisao invalida: use um valor de 1 a 99 para Prompt A")
      return
    }
    const target = Number(sampleSizeTarget)
    const parsedTarget = Number.isFinite(target) && target > 0 ? target : undefined

    createExperiment.mutate({
      promptAId,
      promptBId,
      sampleSizeTarget: parsedTarget,
      trafficSplitA: splitA,
    })
  }

  return (
    <div className="grid gap-4 px-4 lg:px-6">
      <Card>
        <CardHeader>
          <CardTitle>Novo experimento A/B</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 md:items-start">
          {promptsQuery.isError ? (
            <p className="md:col-span-2 text-sm text-destructive">
              Falha ao carregar prompts. Verifique se voce possui prompts cadastrados.
            </p>
          ) : null}
          <div className="grid w-full gap-1.5 self-start">
            <Label>Prompt A</Label>
            <Popover open={openPromptA} onOpenChange={setOpenPromptA}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={openPromptA}
                  className="w-full justify-between"
                  disabled={promptsQuery.isPending || promptsQuery.isError}
                >
                  {promptAId
                    ? availablePrompts.find((prompt) => prompt.id === promptAId)?.title
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
                      {availablePrompts.map((prompt) => (
                        <CommandItem
                          key={prompt.id}
                          value={`${prompt.title} ${prompt.id}`}
                          onSelect={() => {
                            setPromptAId(prompt.id)
                            if (prompt.id === promptBId) {
                              setPromptBId("")
                            }
                            setOpenPromptA(false)
                          }}
                        >
                          <Check
                            className={cn("mr-2 h-4 w-4", promptAId === prompt.id ? "opacity-100" : "opacity-0")}
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
          <div className="grid w-full gap-1.5 self-start">
            <Label>Prompt B</Label>
            <Popover open={openPromptB} onOpenChange={setOpenPromptB}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={openPromptB}
                  className="w-full justify-between"
                  disabled={promptsQuery.isPending || promptsQuery.isError}
                >
                  {promptBId
                    ? promptBOptions.find((prompt) => prompt.id === promptBId)?.title
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
                            setPromptBId(prompt.id)
                            setOpenPromptB(false)
                          }}
                        >
                          <Check
                            className={cn("mr-2 h-4 w-4", promptBId === prompt.id ? "opacity-100" : "opacity-0")}
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
          <div className="grid w-full gap-1.5 self-start">
            <Label htmlFor="traffic-split-a">Percentual A (1-99)</Label>
            <Input
              id="traffic-split-a"
              type="number"
              min={1}
              max={99}
              value={trafficSplitA}
              onChange={(event) => setTrafficSplitA(event.currentTarget.value)}
            />
            <p className="min-h-8 text-xs leading-snug text-muted-foreground">
              Prompt B recebe automaticamente {Math.max(1, 100 - (Number(trafficSplitA) || 50))}%.
            </p>
          </div>
          <div className="grid w-full gap-1.5 self-start">
            <Label htmlFor="sample-size-target">Amostra alvo (opcional)</Label>
            <Input
              id="sample-size-target"
              type="number"
              min={1}
              value={sampleSizeTarget}
              onChange={(event) => setSampleSizeTarget(event.currentTarget.value)}
            />
            <p className="min-h-8 text-xs leading-snug text-muted-foreground" aria-hidden>
              &nbsp;
            </p>
          </div>
          <div className="md:col-span-2">
            <Button
              type="button"
              className="cursor-pointer"
              onClick={handleCreateExperiment}
              disabled={createExperiment.isPending}
            >
              {createExperiment.isPending ? "Criando..." : "Criar experimento"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Variaveis para rodadas (templates)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          {!selectedUsesTemplate ? (
            <p className="text-sm text-muted-foreground">
              Selecione ao menos um prompt em template para carregar os campos automaticamente.
            </p>
          ) : isLoadingTemplateVariables ? (
            <p className="text-sm text-muted-foreground">Carregando variaveis dos prompts selecionados...</p>
          ) : templateVariables.length > 0 ? (
            <>
              <p className="text-sm text-muted-foreground">
                Campos gerados dinamicamente pelos placeholders dos prompts A/B. Os valores enviados serao usados na
                rodada A/B.
              </p>
              {templateVariables.map((variable) => (
                <div key={variable.name} className="grid gap-1.5">
                  <Label htmlFor={`run-variable-${variable.name}`}>{variable.name}</Label>
                  <Input
                    id={`run-variable-${variable.name}`}
                    placeholder={variable.defaultValue ?? "Informe um valor"}
                    value={runVariables[variable.name] ?? ""}
                    onChange={(event) => {
                      const value = event.currentTarget.value
                      setRunVariables((current) => ({
                        ...current,
                        [variable.name]: value,
                      }))
                    }}
                  />
                  {variable.description ? (
                    <p className="text-xs text-muted-foreground">{variable.description}</p>
                  ) : null}
                </div>
              ))}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhuma variavel configurada para os prompts selecionados.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Experimentos criados</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {experimentsQuery.isPending ? (
            <p className="text-sm text-muted-foreground">Carregando experimentos...</p>
          ) : experimentsQuery.isError ? (
            <p className="text-sm text-destructive">Falha ao carregar experimentos.</p>
          ) : experimentsQuery.data && experimentsQuery.data.length > 0 ? (
            experimentsQuery.data.map((item) => (
              <div key={item.id} className="rounded-lg border p-3 text-sm">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{item.id}</p>
                  <Badge
                    variant={item.status === "running" ? "default" : "secondary"}
                    className="shrink-0"
                  >
                    {item.status === "running"
                      ? experimentsI18n.status.running
                      : experimentsI18n.status.stopped}
                  </Badge>
                </div>
                <p className="text-muted-foreground">A: {item.promptATitle}</p>
                <p className="text-muted-foreground">B: {item.promptBTitle}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Split: {item.trafficSplitA}%/{item.trafficSplitB}% | Votos: {item.totalVotes} | A{" "}
                  {item.percentA}% / B {item.percentB}%
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Criado em: {formatDateTime(item.createdAt, lang)}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="cursor-pointer"
                    onClick={() => runExperiment.mutate(item)}
                    disabled={runExperiment.isPending || item.status !== "running"}
                  >
                    Executar rodada
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="cursor-pointer"
                    onClick={() => stopExperiment.mutate(item.id)}
                    disabled={stopExperiment.isPending || item.status !== "running"}
                  >
                    Encerrar
                  </Button>
                </div>
                {lastRunsByExperiment[item.id] ? (
                  <div className="mt-3 grid gap-2 rounded border p-3">
                    <p className="font-medium">
                      Ultima rodada: variante {lastRunsByExperiment[item.id].variant} (exposicao{" "}
                      {lastRunsByExperiment[item.id].exposureId})
                    </p>
                    <p className="max-h-40 overflow-auto whitespace-pre-wrap text-muted-foreground">
                      {lastRunsByExperiment[item.id].output}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="cursor-pointer"
                        onClick={() =>
                          voteExperiment.mutate({
                            experimentId: item.id,
                            exposureId: lastRunsByExperiment[item.id].exposureId,
                            winnerVariant: "A",
                          })
                        }
                        disabled={voteExperiment.isPending || item.status !== "running"}
                      >
                        Votar A
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="cursor-pointer"
                        onClick={() =>
                          voteExperiment.mutate({
                            experimentId: item.id,
                            exposureId: lastRunsByExperiment[item.id].exposureId,
                            winnerVariant: "B",
                          })
                        }
                        disabled={voteExperiment.isPending || item.status !== "running"}
                      >
                        Votar B
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <Empty className="border">
              <EmptyHeader>
                <EmptyTitle>Nenhum experimento encontrado</EmptyTitle>
                <EmptyDescription>Crie seu primeiro experimento A/B acima.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
