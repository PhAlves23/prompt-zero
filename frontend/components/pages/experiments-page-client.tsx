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
  const isPt = lang.startsWith("pt")
  const isEs = lang.startsWith("es")
  const t = {
    runFailed: isEs ? "Error al ejecutar la ronda A/B" : isPt ? "Falha ao executar rodada A/B" : "Failed to run A/B round",
    stopFailed: isEs ? "Error al finalizar el experimento" : isPt ? "Falha ao encerrar experimento" : "Failed to stop experiment",
    selectAB: isEs ? "Selecciona Prompt A y Prompt B" : isPt ? "Selecione Prompt A e Prompt B" : "Select Prompt A and Prompt B",
    promptsLoadError:
      isEs
        ? "Error al cargar prompts. Verifica si tienes prompts creados."
        : isPt
          ? "Falha ao carregar prompts. Verifique se você possui prompts cadastrados."
          : "Failed to load prompts. Make sure you have created prompts.",
    selectPrompt: isEs ? "Selecciona un prompt" : isPt ? "Selecione um prompt" : "Select a prompt",
    noPromptFound: isEs ? "No se encontró ningún prompt." : isPt ? "Nenhum prompt encontrado." : "No prompt found.",
    creating: isEs ? "Creando..." : isPt ? "Criando..." : "Creating...",
    createExperiment: isEs ? "Crear experimento" : isPt ? "Criar experimento" : "Create experiment",
    selectTemplateHint:
      isEs
        ? "Selecciona al menos un prompt con template para cargar los campos automáticamente."
        : isPt
          ? "Selecione ao menos um prompt em template para carregar os campos automaticamente."
          : "Select at least one template prompt to load fields automatically.",
    loadingVariables:
      isEs
        ? "Cargando variables de los prompts seleccionados..."
        : isPt
          ? "Carregando variáveis dos prompts selecionados..."
          : "Loading variables from selected prompts...",
    noVariables:
      isEs
        ? "No hay variables configuradas para los prompts seleccionados."
        : isPt
          ? "Nenhuma variável configurada para os prompts selecionados."
          : "No variables configured for selected prompts.",
    loadingExperiments: isEs ? "Cargando experimentos..." : isPt ? "Carregando experimentos..." : "Loading experiments...",
    experimentsLoadError: isEs ? "Error al cargar experimentos." : isPt ? "Falha ao carregar experimentos." : "Failed to load experiments.",
    runRound: isEs ? "Ejecutar ronda" : isPt ? "Executar rodada" : "Run round",
    stop: isEs ? "Finalizar" : isPt ? "Encerrar" : "Stop",
    voteA: isEs ? "Votar A" : "Votar A",
    voteB: isEs ? "Votar B" : "Votar B",
    noExperimentTitle: isEs ? "No se encontró ningún experimento" : isPt ? "Nenhum experimento encontrado" : "No experiment found",
    roundExecuted: isEs ? "Ronda A/B ejecutada" : isPt ? "Rodada A/B executada" : "A/B round executed",
    voteRegistered: isEs ? "Voto registrado" : "Voto registrado",
    alreadyVoted:
      isEs
        ? "Este resultado ya fue votado. Ejecuta una nueva ronda para votar de nuevo."
        : isPt
          ? "Esse resultado já foi votado. Execute uma nova rodada para votar novamente."
          : "This result has already been voted. Run a new round to vote again.",
    voteFailed: isEs ? "No se pudo registrar el voto" : isPt ? "Não foi possível registrar o voto" : "Could not register vote",
    experimentStopped: isEs ? "Experimento finalizado" : isPt ? "Experimento encerrado" : "Experiment stopped",
    experimentCreated: isEs ? "Experimento creado" : isPt ? "Experimento criado" : "Experiment created",
    createFailed: isEs ? "No se pudo crear el experimento" : isPt ? "Não foi possível criar o experimento" : "Could not create experiment",
    invalidSplit:
      isEs
        ? "División inválida: usa un valor de 1 a 99 para Prompt A"
        : isPt
          ? "Divisão inválida: use um valor de 1 a 99 para Prompt A"
          : "Invalid split: use a value from 1 to 99 for Prompt A",
    searchPromptByName: isEs ? "Buscar prompt por nombre..." : isPt ? "Buscar prompt por nome..." : "Search prompt by name...",
    trafficSplitLabel: isEs ? "Porcentaje A (1-99)" : isPt ? "Percentual A (1-99)" : "Percentage A (1-99)",
    sampleTargetLabel: isEs ? "Muestra objetivo (opcional)" : isPt ? "Amostra alvo (opcional)" : "Target sample (optional)",
    promptBReceives:
      isEs ? "Prompt B recibe automáticamente" : isPt ? "Prompt B recebe automaticamente" : "Prompt B automatically receives",
    runVariablesTitle:
      isEs ? "Variables para rondas (templates)" : isPt ? "Variáveis para rodadas (templates)" : "Round variables (templates)",
    generatedFieldsHint:
      isEs
        ? "Campos generados dinámicamente por los placeholders de los prompts A/B. Los valores se usarán en la ronda A/B."
        : isPt
          ? "Campos gerados dinamicamente pelos placeholders dos prompts A/B. Os valores enviados serao usados na rodada A/B."
          : "Fields generated dynamically from A/B prompt placeholders. Values are used in the A/B round.",
    valuePlaceholder: isEs ? "Introduce un valor" : isPt ? "Informe um valor" : "Enter a value",
    createdExperiments: isEs ? "Experimentos creados" : isPt ? "Experimentos criados" : "Created experiments",
    createdAt: isEs ? "Creado en" : isPt ? "Criado em" : "Created at",
    lastRound:
      isEs ? "Última ronda: variante" : isPt ? "Última rodada: variante" : "Last round: variant",
    exposure: isEs ? "exposición" : isPt ? "exposição" : "exposure",
  }
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
  const promptsPage = promptsQuery.data
  const availablePrompts = useMemo(
    () => (promptsPage?.data ? [...promptsPage.data] : []),
    [promptsPage],
  )
  const promptBOptions = useMemo(
    () => availablePrompts.filter((prompt) => prompt.id !== promptAId),
    [availablePrompts, promptAId],
  )

  const selectedPromptA = availablePrompts.find((prompt) => prompt.id === promptAId)
  const selectedPromptB = availablePrompts.find((prompt) => prompt.id === promptBId)

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

  // Mantém defaults de template e valores já preenchidos alinhados à lista de variáveis.
  /* eslint-disable react-hooks/set-state-in-effect -- sincronização derivada (lista de variáveis / modo template) */
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
  /* eslint-enable react-hooks/set-state-in-effect */

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
      toast.success(t.roundExecuted)
      void queryClient.invalidateQueries({ queryKey: queryKeys.experiments.list })
    },
    onError: (error) => {
      if (error instanceof ClientHttpError) {
        toast.error(error.payload.message)
      } else if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error(t.runFailed)
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
      toast.success(t.voteRegistered)
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
          toast.error(t.alreadyVoted)
          return
        }
        toast.error(error.payload.message)
      } else if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error(t.voteFailed)
      }
    },
  })

  const stopExperiment = useMutation({
    mutationFn: (experimentId: string) =>
      bffFetch<ExperimentResults>(`/experiments/${experimentId}/stop`, {
        method: "POST",
      }),
    onSuccess: () => {
      toast.success(t.experimentStopped)
      void queryClient.invalidateQueries({ queryKey: queryKeys.experiments.list })
    },
    onError: () => {
      toast.error(t.stopFailed)
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
      toast.success(t.experimentCreated)
      void queryClient.invalidateQueries({ queryKey: queryKeys.experiments.list })
    },
    onError: () => {
      toast.error(t.createFailed)
    },
  })

  function handleCreateExperiment() {
    const splitA = Number(trafficSplitA)
    if (!promptAId || !promptBId) {
      toast.error(t.selectAB)
      return
    }
    if (!Number.isFinite(splitA) || splitA < 1 || splitA > 99) {
      toast.error(t.invalidSplit)
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
              {t.promptsLoadError}
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
                    : t.selectPrompt}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-(--radix-popover-trigger-width) p-0">
                <Command>
                  <CommandInput placeholder={t.searchPromptByName} />
                  <CommandList>
                    <CommandEmpty>{t.noPromptFound}</CommandEmpty>
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
                    : t.selectPrompt}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-(--radix-popover-trigger-width) p-0">
                <Command>
                  <CommandInput placeholder={t.searchPromptByName} />
                  <CommandList>
                    <CommandEmpty>{t.noPromptFound}</CommandEmpty>
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
            <Label htmlFor="traffic-split-a">{t.trafficSplitLabel}</Label>
            <Input
              id="traffic-split-a"
              type="number"
              min={1}
              max={99}
              value={trafficSplitA}
              onChange={(event) => setTrafficSplitA(event.currentTarget.value)}
            />
            <p className="min-h-8 text-xs leading-snug text-muted-foreground">
              {t.promptBReceives} {Math.max(1, 100 - (Number(trafficSplitA) || 50))}%.
            </p>
          </div>
          <div className="grid w-full gap-1.5 self-start">
            <Label htmlFor="sample-size-target">{t.sampleTargetLabel}</Label>
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
              {createExperiment.isPending ? t.creating : t.createExperiment}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.runVariablesTitle}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          {!selectedUsesTemplate ? (
            <p className="text-sm text-muted-foreground">
              {t.selectTemplateHint}
            </p>
          ) : isLoadingTemplateVariables ? (
            <p className="text-sm text-muted-foreground">{t.loadingVariables}</p>
          ) : templateVariables.length > 0 ? (
            <>
              <p className="text-sm text-muted-foreground">
                {t.generatedFieldsHint}
              </p>
              {templateVariables.map((variable) => (
                <div key={variable.name} className="grid gap-1.5">
                  <Label htmlFor={`run-variable-${variable.name}`}>{variable.name}</Label>
                  <Input
                    id={`run-variable-${variable.name}`}
                    placeholder={variable.defaultValue ?? t.valuePlaceholder}
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
              {t.noVariables}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.createdExperiments}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {experimentsQuery.isPending ? (
            <p className="text-sm text-muted-foreground">{t.loadingExperiments}</p>
          ) : experimentsQuery.isError ? (
            <p className="text-sm text-destructive">{t.experimentsLoadError}</p>
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
                  {t.createdAt}: {formatDateTime(item.createdAt, lang)}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="cursor-pointer"
                    onClick={() => runExperiment.mutate(item)}
                    disabled={runExperiment.isPending || item.status !== "running"}
                  >
                    {t.runRound}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="cursor-pointer"
                    onClick={() => stopExperiment.mutate(item.id)}
                    disabled={stopExperiment.isPending || item.status !== "running"}
                  >
                    {t.stop}
                  </Button>
                </div>
                {lastRunsByExperiment[item.id] ? (
                  <div className="mt-3 grid gap-2 rounded border p-3">
                    <p className="font-medium">
                      {t.lastRound} {lastRunsByExperiment[item.id].variant} ({t.exposure}{" "}
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
                        {t.voteA}
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
                        {t.voteB}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <Empty className="border">
              <EmptyHeader>
                <EmptyTitle>{t.noExperimentTitle}</EmptyTitle>
                <EmptyDescription>Crie seu primeiro experimento A/B acima.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
