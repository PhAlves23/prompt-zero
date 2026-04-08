"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, ChevronsUpDown, Copy } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useRef, useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { z } from "zod/v4"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { isProviderApiKeyNotConfiguredError } from "@/lib/api/backend-errors"
import { bffFetch, ClientHttpError } from "@/lib/api/client"
import { queryKeys } from "@/lib/api/query-keys"
import { runExecutionStream } from "@/lib/features/executions/stream-execution"
import { formatDateTimeLocale } from "@/lib/format-datetime"
import { cn } from "@/lib/utils"
import { PromptCommentsSection } from "@/components/prompt-comments-section"
import type {
  EvaluationCriteria,
  Execution,
  ExecutionEvaluation,
  ExperimentResults,
  ExperimentRunResult,
  PaginatedResult,
  Prompt,
  Tag,
  PromptVariable,
  PromptVersion,
} from "@/lib/api/types"
import type { Dictionary } from "@/app/[lang]/dictionaries"
import { validationMessages } from "@/lib/zod-i18n"

function interpolate(template: string, params: Record<string, string>) {
  return Object.entries(params).reduce((current, [key, value]) => current.replaceAll(`{${key}}`, value), template)
}

function createUpdateSchema(dict: Dictionary) {
  const m = validationMessages(dict)
  return z.object({
    title: z.string().min(3, { message: m.stringMin(3) }).max(120, { message: m.stringMax(120) }),
    description: z.string().optional(),
    content: z.string().min(10, { message: m.contentMin(10) }),
    isPublic: z.boolean(),
    tagIds: z.array(z.string()).optional(),
  })
}

function createExecuteSettingsSchema(dict: Dictionary) {
  const m = validationMessages(dict)
  return z.object({
    temperature: z.number().min(0, { message: m.numberMin(0) }).max(2, { message: m.numberMax(2) }),
    topP: z.number().min(0, { message: m.numberMin(0) }).max(1, { message: m.numberMax(1) }),
    topK: z
      .number()
      .int({ message: m.numberInt() })
      .min(1, { message: m.numberMin(1) })
      .max(200, { message: m.numberMax(200) }),
    maxTokens: z
      .number()
      .int({ message: m.numberInt() })
      .min(1, { message: m.numberMin(1) })
      .max(4000, { message: m.numberMax(4000) }),
  })
}

type UpdatePromptValues = z.infer<ReturnType<typeof createUpdateSchema>>
type ExecuteSettingsValues = z.infer<ReturnType<typeof createExecuteSettingsSchema>>

function extractPromptTagIds(prompt: Prompt | undefined): string[] {
  if (!prompt?.tags || prompt.tags.length === 0) {
    return []
  }
  return prompt.tags
    .map((tagItem) => {
      const candidate = tagItem as unknown as { id?: string; tagId?: string; tag?: { id?: string } }
      return candidate.id ?? candidate.tagId ?? candidate.tag?.id
    })
    .filter((value): value is string => typeof value === "string" && value.length > 0)
}

export function PromptDetailClient({
  lang,
  promptId,
  dict,
}: {
  lang: string
  promptId: string
  dict: Dictionary
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
  const [openPromptTags, setOpenPromptTags] = useState(false)
  const [selectedCriteriaId, setSelectedCriteriaId] = useState("")
  const [judgingExecutionId, setJudgingExecutionId] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const lastExecuteProviderApiKeyRef = useRef(false)

  const updateSchemaMemo = useMemo(() => createUpdateSchema(dict), [dict])
  const executeSettingsSchemaMemo = useMemo(() => createExecuteSettingsSchema(dict), [dict])

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
  const tagsQuery = useQuery({
    queryKey: queryKeys.tags.list,
    queryFn: () => bffFetch<Tag[]>("/tags"),
  })

  const executionsQuery = useQuery({
    queryKey: queryKeys.prompts.executions(promptId),
    queryFn: () => bffFetch<PaginatedResult<Execution>>(`/prompts/${promptId}/executions?page=1&limit=10`),
  })

  const evaluationCriteriaQuery = useQuery({
    queryKey: queryKeys.settings.evaluationCriteria,
    queryFn: () => bffFetch<EvaluationCriteria[]>("/evaluation/criteria"),
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
      tagIds: extractPromptTagIds(promptQuery.data),
    },
  })
  const updateIsPublic = useWatch({
    control: form.control,
    name: "isPublic",
  })
  const updateTagIds = useWatch({
    control: form.control,
    name: "tagIds",
  })
  const selectedPromptTags = useMemo(
    () => (tagsQuery.data ?? []).filter((tag) => (updateTagIds ?? []).includes(tag.id)),
    [tagsQuery.data, updateTagIds],
  )

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
      toast.success(dict.prompts.detail.toasts.promptUpdated)
      queryClient.setQueryData(queryKeys.prompts.detail(promptId), updatedPrompt)
      void queryClient.invalidateQueries({ queryKey: queryKeys.prompts.detail(promptId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.prompts.versions(promptId) })
      void queryClient.invalidateQueries({ queryKey: ["prompts", "list"] })
    },
  })

  const forkPrompt = useMutation({
    mutationFn: () => bffFetch<Prompt>(`/prompts/${promptId}/fork`, { method: "POST" }),
    onSuccess: (prompt) => {
      toast.success(dict.prompts.detail.toasts.promptDuplicated)
      void queryClient.invalidateQueries({ queryKey: ["prompts", "list"] })
      router.push(`/${lang}/prompts/${prompt.id}`)
      router.refresh()
    },
  })

  const deletePrompt = useMutation({
    mutationFn: () => bffFetch<void>(`/prompts/${promptId}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success(dict.prompts.detail.toasts.promptRemoved)
      void queryClient.invalidateQueries({ queryKey: ["prompts", "list"] })
      router.push(`/${lang}/prompts`)
      router.refresh()
    },
  })

  const judgeExecution = useMutation({
    mutationFn: (executionId: string) =>
      bffFetch<ExecutionEvaluation>("/evaluation/judge", {
        method: "POST",
        body: { executionId, criteriaId: selectedCriteriaId },
      }),
    onMutate: (executionId) => {
      setJudgingExecutionId(executionId)
    },
    onSettled: () => {
      setJudgingExecutionId(null)
    },
    onSuccess: (row) => {
      toast.success(dict.prompts.detail.executions.judgeDone.replace("{score}", String(row.score)))
    },
    onError: (error) => {
      toast.error(error instanceof ClientHttpError ? error.message : dict.prompts.detail.executions.judgeError)
    },
  })

  const restoreVersion = useMutation({
    mutationFn: (versionId: string) =>
      bffFetch<Prompt>(`/prompts/${promptId}/versions/${versionId}/restore`, { method: "POST" }),
    onSuccess: () => {
      toast.success(dict.prompts.detail.toasts.versionRestored)
      void queryClient.invalidateQueries({ queryKey: queryKeys.prompts.detail(promptId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.prompts.versions(promptId) })
    },
  })
  const removeVersion = useMutation({
    mutationFn: (versionId: string) =>
      bffFetch<{ deleted: boolean }>(`/prompts/${promptId}/versions/${versionId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      toast.success(dict.prompts.detail.toasts.versionRemoved)
      void queryClient.invalidateQueries({ queryKey: queryKeys.prompts.versions(promptId) })
    },
    onError: (error) => {
      if (error instanceof ClientHttpError) {
        if (
          error.payload.message === "errors.versionDeleteLastNotAllowed" ||
          error.payload.message === "Cannot delete the last prompt version"
        ) {
          toast.error(dict.prompts.detail.toasts.cannotRemoveLastVersion)
          return
        }
        if (
          error.payload.message === "errors.versionHasExecutions" ||
          error.payload.message === "Cannot delete a version with associated executions"
        ) {
          toast.error(dict.prompts.detail.toasts.cannotRemoveVersionWithExecutions)
          return
        }
        toast.error(error.payload.message)
        return
      }
      toast.error(dict.prompts.detail.toasts.removeVersionFailed)
    },
  })

  const syncVariables = useMutation({
    mutationFn: (variables: PromptVariable[]) =>
      bffFetch<PromptVariable[]>(`/prompts/${promptId}/variables`, {
        method: "PUT",
        body: { variables },
      }),
    onSuccess: () => {
      toast.success(dict.prompts.detail.toasts.variablesSynced)
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
      toast.success(dict.prompts.detail.toasts.abExperimentCreated)
      void queryClient.invalidateQueries({ queryKey: queryKeys.experiments.results(result.id) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.experiments.list })
    },
    onError: () => {
      toast.error(dict.prompts.detail.toasts.abExperimentCreateFailed)
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
      toast.success(interpolate(dict.prompts.detail.toasts.abRunExecuted, { variant: result.variant }))
    },
    onError: (error) => {
      if (
        error instanceof ClientHttpError &&
        isProviderApiKeyNotConfiguredError(error.payload.message)
      ) {
        toast.error(dict.prompts.detail.toasts.configureApiKeys)
      } else if (error instanceof ClientHttpError) {
        toast.error(error.payload.message)
      } else if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error(dict.prompts.detail.toasts.abRunFailed)
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
      void queryClient.invalidateQueries({ queryKey: queryKeys.experiments.list })
      setAbLastExposureId("")
      setAbLastVariant(null)
      setAbLastOutput("")
      toast.success(dict.prompts.detail.toasts.voteRegistered)
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
        toast.error(dict.prompts.detail.toasts.voteAlreadyRegistered)
        return
      }
      toast.error(dict.prompts.detail.toasts.voteFailed)
    },
  })

  const stopExperiment = useMutation({
    mutationFn: () =>
      bffFetch<ExperimentResults>(`/experiments/${experimentId}/stop`, {
        method: "POST",
      }),
    onSuccess: (result) => {
      queryClient.setQueryData(queryKeys.experiments.results(experimentId), result)
      void queryClient.invalidateQueries({ queryKey: queryKeys.experiments.list })
      toast.success(dict.prompts.detail.toasts.experimentStopped)
    },
    onError: () => {
      toast.error(dict.prompts.detail.toasts.experimentStopFailed)
    },
  })

  const executePrompt = useMutation({
    mutationFn: async (payload: { input: string; settings: ExecuteSettingsValues }) => {
      lastExecuteProviderApiKeyRef.current = false
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
          const isApiKey = isProviderApiKeyNotConfiguredError(message)
          lastExecuteProviderApiKeyRef.current = isApiKey
          setStreamError(
            isApiKey ? dict.prompts.detail.toasts.configureApiKeys : message,
          )
        },
      })
      setIsStreaming(false)
      setStreamStatus("done")
      abortControllerRef.current = null
    },
    onSuccess: () => {
      lastExecuteProviderApiKeyRef.current = false
      toast.success(dict.prompts.detail.toasts.executionCompleted)
      void queryClient.invalidateQueries({ queryKey: queryKeys.prompts.executions(promptId) })
    },
    onError: (error) => {
      if (error instanceof Error && error.name === "AbortError") {
        lastExecuteProviderApiKeyRef.current = false
        setStreamStatus("cancelled")
        setStreamError("")
      } else {
        setStreamStatus("error")
        setStreamError((current) => current || dict.prompts.detail.toasts.executePromptFailed)
        toast.error(
          lastExecuteProviderApiKeyRef.current
            ? dict.prompts.detail.toasts.configureApiKeys
            : dict.prompts.detail.toasts.executePromptFailed,
        )
        lastExecuteProviderApiKeyRef.current = false
      }
      setIsStreaming(false)
      abortControllerRef.current = null
    },
  })

  function cancelExecution() {
    abortControllerRef.current?.abort()
  }

  function runWithSettings(input: string) {
    const parsed = executeSettingsSchemaMemo.safeParse(executeSettingsForm.getValues())
    if (!parsed.success) {
      toast.error(dict.prompts.detail.toasts.invalidAdvancedSettings)
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
        toast.error(
          interpolate(dict.prompts.detail.toasts.missingRequiredVariables, {
            variables: missingRequired.map((item) => item.name).join(", "),
          }),
        )
        return
      }
    }
    executePrompt.mutate({ input, settings: parsed.data })
  }

  async function copyExecutionOutput(output: string | null) {
    if (!output || output.trim() === "") {
      toast.error(dict.prompts.detail.toasts.noOutputToCopy)
      return
    }
    try {
      await navigator.clipboard.writeText(output)
      toast.success(dict.prompts.detail.toasts.outputCopied)
    } catch {
      toast.error(dict.prompts.detail.toasts.copyOutputFailed)
    }
  }

  function createAbExperiment() {
    if (!experimentPromptBId) {
      toast.error(dict.prompts.detail.toasts.selectPromptB)
      return
    }
    const target = Number(sampleSizeTarget)
    const parsedTarget = Number.isFinite(target) && target > 0 ? target : undefined
    const parsedSplitA = Number(trafficSplitA)
    if (!Number.isFinite(parsedSplitA) || parsedSplitA < 1 || parsedSplitA > 99) {
      toast.error(dict.prompts.detail.toasts.invalidTrafficSplit)
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
    return (
      <div className="px-4 lg:px-6 text-sm text-muted-foreground">{dict.common.loading}</div>
    )
  }
  if (promptQuery.isError || !promptQuery.data) {
    return <div className="px-4 lg:px-6 text-sm text-destructive">{dict.prompts.detail.errors.loadPromptFailed}</div>
  }

  return (
    <div className="grid gap-4 px-4 lg:px-6">
      <Card>
        <CardHeader>
          <CardTitle>{dict.prompts.detail.edit.cardTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-xs text-muted-foreground">
            {dict.prompts.detail.labels.lastEdit}: {formatDateTimeLocale(promptQuery.data.updatedAt, lang)}
          </p>
          <form
            className="grid gap-4"
            onSubmit={form.handleSubmit((values) => {
              const parsed = updateSchemaMemo.safeParse(values)
              if (!parsed.success) {
                parsed.error.issues.forEach((issue) => {
                  const pathKey = issue.path.length > 0 ? issue.path.map(String).join(".") : ""
                  if (pathKey) {
                    form.setError(pathKey as never, { message: issue.message })
                  }
                })
                return
              }
              updatePrompt.mutate(parsed.data)
            })}
          >
            <div className="grid gap-2">
              <Label htmlFor="title">{dict.prompts.detail.edit.fields.title}</Label>
              <Input id="title" {...form.register("title")} aria-invalid={Boolean(form.formState.errors.title)} />
              {form.formState.errors.title ? (
                <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">{dict.prompts.detail.edit.fields.description}</Label>
              <Input
                id="description"
                {...form.register("description")}
                aria-invalid={Boolean(form.formState.errors.description)}
              />
              {form.formState.errors.description ? (
                <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="content">{dict.prompts.detail.edit.fields.content}</Label>
              <Textarea id="content" rows={10} {...form.register("content")} aria-invalid={Boolean(form.formState.errors.content)} />
              {form.formState.errors.content ? (
                <p className="text-sm text-destructive">{form.formState.errors.content.message}</p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="prompt-categories">{dict.prompts.detail.edit.fields.categories}</Label>
              <Popover open={openPromptTags} onOpenChange={setOpenPromptTags}>
                <PopoverTrigger asChild>
                  <Button
                    id="prompt-categories"
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={openPromptTags}
                    className="min-w-0 w-full justify-between"
                    disabled={tagsQuery.isPending || tagsQuery.isError}
                  >
                    <span className="truncate text-left">
                      {selectedPromptTags.length > 0
                        ? selectedPromptTags.map((tag) => tag.name).join(", ")
                        : dict.prompts.detail.edit.selectCategories}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-(--radix-popover-trigger-width) p-0">
                  <Command>
                    <CommandInput placeholder={dict.prompts.detail.placeholders.searchCategory} />
                    <CommandList>
                      <CommandEmpty>{dict.prompts.detail.edit.emptyCategories}</CommandEmpty>
                      <CommandGroup>
                        {(tagsQuery.data ?? []).map((tag) => {
                          const isSelected = (updateTagIds ?? []).includes(tag.id)
                          return (
                            <CommandItem
                              key={tag.id}
                              value={`${tag.name} ${tag.id}`}
                              onSelect={() => {
                                const current = updateTagIds ?? []
                                const next = isSelected
                                  ? current.filter((id) => id !== tag.id)
                                  : [...current, tag.id]
                                form.setValue("tagIds", next, { shouldDirty: true })
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", isSelected ? "opacity-100" : "opacity-0")} />
                              {tag.name}
                            </CommandItem>
                          )
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {tagsQuery.isPending ? (
                <p className="text-xs text-muted-foreground">{dict.prompts.detail.edit.loadingCategories}</p>
              ) : null}
              {tagsQuery.isError ? (
                <p className="text-xs text-destructive">{dict.prompts.detail.errors.loadCategoriesFailed}</p>
              ) : null}
              {!tagsQuery.isPending && !tagsQuery.isError && (tagsQuery.data?.length ?? 0) === 0 ? (
                <p className="text-xs text-muted-foreground">{dict.prompts.detail.edit.noCategoriesHint}</p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={updateIsPublic}
                onCheckedChange={(checked) => form.setValue("isPublic", checked)}
                aria-label={dict.prompts.detail.aria.setPublic}
              />
              <span className="text-sm text-muted-foreground">{dict.prompts.detail.edit.publicLabel}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" className="cursor-pointer" disabled={updatePrompt.isPending}>
                {dict.common.save}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer"
                onClick={() => forkPrompt.mutate()}
                disabled={forkPrompt.isPending}
              >
                {dict.prompts.detail.edit.actions.duplicate}
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="cursor-pointer"
                onClick={() => deletePrompt.mutate()}
                disabled={deletePrompt.isPending}
              >
                {dict.common.delete}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{dict.prompts.detail.execute.cardTitle}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <Textarea
            rows={4}
            placeholder={dict.prompts.detail.placeholders.executionInput}
            value={executeInput}
            onChange={(event) => setExecuteInput(event.currentTarget.value)}
          />
          <div className="grid gap-3 rounded-lg border p-3 md:grid-cols-2">
            <p className="md:col-span-2 text-sm font-medium">{dict.prompts.detail.execute.advancedSettingsTitle}</p>
            <div className="grid gap-1.5">
              <Label htmlFor="temperature">{dict.prompts.detail.execute.labels.temperature}</Label>
              <Input
                id="temperature"
                type="number"
                step="0.01"
                min={0}
                max={2}
                {...executeSettingsForm.register("temperature", { valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground">{dict.prompts.detail.execute.settingsHelp.temperature}</p>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="top-p">{dict.prompts.detail.execute.labels.topP}</Label>
              <Input
                id="top-p"
                type="number"
                step="0.01"
                min={0}
                max={1}
                {...executeSettingsForm.register("topP", { valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground">{dict.prompts.detail.execute.settingsHelp.topP}</p>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="top-k">{dict.prompts.detail.execute.labels.topK}</Label>
              <Input
                id="top-k"
                type="number"
                min={1}
                max={200}
                {...executeSettingsForm.register("topK", { valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground">{dict.prompts.detail.execute.settingsHelp.topK}</p>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="max-tokens">{dict.prompts.detail.execute.labels.maxTokens}</Label>
              <Input
                id="max-tokens"
                type="number"
                min={1}
                max={4000}
                {...executeSettingsForm.register("maxTokens", { valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground">{dict.prompts.detail.execute.settingsHelp.maxTokens}</p>
            </div>
          </div>
          {promptQuery.data?.isTemplate ? (
            <div className="grid gap-3 rounded-lg border p-3">
              <p className="text-sm font-medium">{dict.prompts.detail.execute.templateVariablesTitle}</p>
              {variablesQuery.isPending ? (
                <p className="text-xs text-muted-foreground">{dict.prompts.detail.execute.loadingVariables}</p>
              ) : variablesQuery.data && variablesQuery.data.length > 0 ? (
                variablesQuery.data.map((variable) => (
                  <div key={`execute-variable-${variable.name}`} className="grid gap-1.5">
                    <Label htmlFor={`execute-variable-${variable.name}`}>
                      {variable.name}
                      {variable.required ? " *" : ""}
                    </Label>
                    <Input
                      id={`execute-variable-${variable.name}`}
                      placeholder={variable.defaultValue ?? dict.prompts.detail.execute.variableValuePlaceholder}
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
                <p className="text-xs text-muted-foreground">{dict.prompts.detail.execute.noVariablesHint}</p>
              )}
            </div>
          ) : null}
          <Button
            type="button"
            className="w-fit cursor-pointer"
            disabled={isStreaming || executeInput.trim().length === 0}
            onClick={() => runWithSettings(executeInput)}
          >
            {isStreaming ? dict.prompts.detail.executions.running : dict.prompts.detail.executions.run}
          </Button>
          {isStreaming ? (
            <Button type="button" variant="outline" className="w-fit cursor-pointer" onClick={cancelExecution}>
              {dict.prompts.detail.execute.cancelExecution}
            </Button>
          ) : null}
          {!isStreaming && streamStatus === "error" && lastExecutionInput ? (
            <Button
              type="button"
              variant="outline"
              className="w-fit cursor-pointer"
              onClick={() => runWithSettings(lastExecutionInput)}
            >
              {dict.prompts.detail.execute.retryExecution}
            </Button>
          ) : null}
          <div className="rounded border bg-card p-3">
            <p className="text-xs text-muted-foreground">
              {interpolate(dict.prompts.detail.execute.realtimeOutput, { status: streamStatus })}
            </p>
            <p className="mt-2 min-h-10 whitespace-pre-wrap text-sm">
              {streamOutput || dict.prompts.detail.execute.waitingOutput}
            </p>
            {streamError ? <p className="mt-2 text-sm text-destructive">{streamError}</p> : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{dict.experiments.newCardTitle}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>{dict.prompts.detail.ab.promptBLabel}</Label>
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
                    : dict.prompts.detail.ab.selectPrompt}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-(--radix-popover-trigger-width) p-0">
                <Command>
                  <CommandInput placeholder={dict.prompts.detail.placeholders.searchPromptByName} />
                  <CommandList>
                    <CommandEmpty>{dict.prompts.detail.ab.emptyPrompts}</CommandEmpty>
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
            <Label htmlFor="sample-size-target">{dict.prompts.detail.ab.sampleSizeLabel}</Label>
            <Input
              id="sample-size-target"
              type="number"
              min={1}
              value={sampleSizeTarget}
              onChange={(event) => setSampleSizeTarget(event.currentTarget.value)}
              placeholder={dict.prompts.detail.placeholders.exampleSampleSize}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="traffic-split-a">{dict.prompts.detail.ab.trafficSplitLabel}</Label>
            <Input
              id="traffic-split-a"
              type="number"
              min={1}
              max={99}
              value={trafficSplitA}
              onChange={(event) => setTrafficSplitA(event.currentTarget.value)}
              placeholder={dict.prompts.detail.placeholders.exampleTrafficSplit}
            />
            <p className="text-xs text-muted-foreground">
              {interpolate(dict.prompts.detail.ab.promptBReceives, {
                percent: String(Math.max(1, 100 - (Number(trafficSplitA) || 50))),
              })}
            </p>
          </div>
          {!abUsesTemplate ? (
            <p className="text-xs text-muted-foreground">
              {dict.prompts.detail.ab.templateHint}
            </p>
          ) : isLoadingAbTemplateVariables ? (
            <p className="text-xs text-muted-foreground">{dict.prompts.detail.ab.loadingTemplateVariables}</p>
          ) : abTemplateVariables.length > 0 ? (
            <div className="grid gap-2 rounded border p-3">
              <p className="text-xs text-muted-foreground">
                {dict.prompts.detail.ab.variablesDescription}
              </p>
              {abTemplateVariables.map((variable) => (
                <div key={variable.name} className="grid gap-1.5">
                  <Label htmlFor={`ab-variable-${variable.name}`}>{variable.name}</Label>
                  <Input
                    id={`ab-variable-${variable.name}`}
                    placeholder={variable.defaultValue ?? dict.prompts.detail.ab.variableValuePlaceholder}
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
            <p className="text-xs text-muted-foreground">{dict.prompts.detail.ab.noVariablesForSelectedPrompts}</p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="cursor-pointer"
              disabled={createExperiment.isPending || !experimentPromptBId}
              onClick={createAbExperiment}
            >
              {createExperiment.isPending
                ? dict.prompts.detail.ab.actions.creatingExperiment
                : dict.prompts.detail.ab.actions.createExperiment}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              disabled={!experimentId || runExperiment.isPending}
              onClick={() => runExperiment.mutate()}
            >
              {runExperiment.isPending ? dict.prompts.detail.ab.actions.runningRound : dict.prompts.detail.ab.actions.runRound}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              disabled={!experimentId || stopExperiment.isPending}
              onClick={() => stopExperiment.mutate()}
            >
              {stopExperiment.isPending ? dict.prompts.detail.executions.stopping : dict.prompts.detail.executions.stopExperiment}
            </Button>
          </div>

          {experimentId ? (
            <div className="rounded border p-3 text-sm">
              <p className="font-medium">
                {interpolate(dict.prompts.detail.ab.currentExperiment, { id: experimentId })}
              </p>
              <p className="text-muted-foreground">
                {dict.prompts.detail.ab.statusLabel}{" "}
                {experimentResultsQuery.data?.status ?? dict.prompts.detail.ab.statusLoading}
              </p>
              <p className="text-muted-foreground">
                {dict.prompts.detail.ab.distributionLabel}{" "}
                {experimentResultsQuery.data?.trafficSplitA ?? 50}% (A) /{" "}
                {experimentResultsQuery.data?.trafficSplitB ?? 50}% (B)
              </p>
              <p className="text-muted-foreground">
                {interpolate(dict.prompts.detail.ab.votesLine, {
                  votesA: String(experimentResultsQuery.data?.votesA ?? 0),
                  votesB: String(experimentResultsQuery.data?.votesB ?? 0),
                })}
              </p>
              <p className="text-muted-foreground">
                {interpolate(dict.prompts.detail.ab.percentLine, {
                  percentA: String(experimentResultsQuery.data?.percentA ?? 0),
                  percentB: String(experimentResultsQuery.data?.percentB ?? 0),
                })}
              </p>
            </div>
          ) : null}

          {abLastExposureId ? (
            <div className="grid gap-2 rounded border p-3 text-sm">
              <p className="font-medium">
                {interpolate(dict.prompts.detail.ab.lastRoundSummary, {
                  variant: abLastVariant ?? "",
                  exposureId: abLastExposureId,
                })}
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
                  {dict.prompts.detail.executions.voteA}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="cursor-pointer"
                  onClick={() => voteExperiment.mutate("B")}
                  disabled={voteExperiment.isPending || !experimentId}
                >
                  {dict.prompts.detail.executions.voteB}
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {dict.prompts.detail.versions.listTitle} ({versionsQuery.data?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {versionsQuery.isPending ? (
            <p className="text-sm text-muted-foreground">{dict.common.loading}</p>
          ) : versionsQuery.isError ? (
            <p className="text-sm text-destructive">{dict.prompts.detail.versions.loadError}</p>
          ) : versionsQuery.data && versionsQuery.data.length > 0 ? (
            versionsQuery.data.map((version) => (
              <div key={version.id} className="rounded border p-3 text-sm">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="font-medium">
                      {interpolate(dict.prompts.detail.versions.versionNumber, {
                        number: String(version.version),
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {dict.prompts.detail.versions.dateTimePrefix} {formatDateTimeLocale(version.createdAt, lang)}
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
                      {dict.prompts.detail.versions.restoreButton}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          type="button"
                          variant="destructive"
                          className="cursor-pointer"
                          disabled={removeVersion.isPending}
                        >
                          {dict.prompts.detail.versions.deleteVersion}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{dict.prompts.detail.versions.deleteDialogTitle}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {dict.prompts.detail.versions.deleteDialogDescription}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{dict.prompts.detail.versions.cancelDialog}</AlertDialogCancel>
                          <AlertDialogAction
                            variant="destructive"
                            onClick={() => removeVersion.mutate(version.id)}
                            disabled={removeVersion.isPending}
                          >
                            {dict.prompts.detail.versions.confirmDeleteButton}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <Button type="button" variant="outline" asChild>
                      <Link href={`/${lang}/prompts/${promptId}/versions/${version.id}`} className="cursor-pointer">
                        {dict.prompts.detail.versions.viewDetails}
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <Empty className="border">
              <EmptyHeader>
                <EmptyTitle>{dict.prompts.detail.versions.emptyTitle}</EmptyTitle>
                <EmptyDescription>{dict.prompts.detail.versions.emptyDescription}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {dict.prompts.detail.variables.title} ({variablesQuery.data?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {variablesQuery.isPending ? (
            <p className="text-sm text-muted-foreground">{dict.prompts.detail.variables.loading}</p>
          ) : variablesQuery.isError ? (
            <p className="text-sm text-destructive">{dict.prompts.detail.variables.loadError}</p>
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
                {dict.prompts.detail.variables.sync}
              </Button>
            </>
          ) : (
            <Empty className="border">
              <EmptyHeader>
                <EmptyTitle>{dict.prompts.detail.variables.emptyTitle}</EmptyTitle>
                <EmptyDescription>{dict.prompts.detail.variables.emptyDescription}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>

      <PromptCommentsSection promptId={promptId} lang={lang} dict={dict} />

      <Card>
        <CardHeader>
          <CardTitle>
            {dict.prompts.detail.executions.listTitle} ({executionsQuery.data?.data.length ?? 0})
          </CardTitle>
          <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:gap-3">
            <label className="flex min-w-0 flex-1 items-center gap-2 text-sm text-muted-foreground">
              <span className="shrink-0">{dict.prompts.detail.executions.judgeSelect}</span>
              <select
                className="border-input bg-background text-foreground max-w-full flex-1 rounded-md border px-2 py-1 text-sm"
                value={selectedCriteriaId}
                onChange={(e) => setSelectedCriteriaId(e.target.value)}
              >
                <option value="">—</option>
                {evaluationCriteriaQuery.data?.map((cr) => (
                  <option key={cr.id} value={cr.id}>
                    {cr.name}
                  </option>
                ))}
              </select>
            </label>
            {!evaluationCriteriaQuery.data?.length ? (
              <p className="text-xs text-muted-foreground">{dict.prompts.detail.executions.judgeNoCriteria}</p>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {executionsQuery.isPending ? (
            <p className="text-sm text-muted-foreground">{dict.prompts.detail.executions.loading}</p>
          ) : executionsQuery.isError ? (
            <p className="text-sm text-destructive">{dict.prompts.detail.executions.loadError}</p>
          ) : executionsQuery.data && executionsQuery.data.data.length > 0 ? (
            executionsQuery.data.data.map((execution) => (
              <div key={execution.id} className="rounded border p-3 text-sm">
                <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                  <div className="flex min-w-0 max-w-[70%] flex-wrap items-center gap-2">
                    <span className="truncate font-medium" title={execution.model}>
                      {execution.model}
                    </span>
                    {execution.fromCache ? (
                      <Badge variant="secondary" className="shrink-0 text-xs">
                        {dict.prompts.detail.executions.cachedBadge}
                      </Badge>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="cursor-pointer"
                      disabled={!selectedCriteriaId || !execution.output || judgingExecutionId !== null}
                      onClick={() => judgeExecution.mutate(execution.id)}
                    >
                      {judgingExecutionId === execution.id
                        ? dict.prompts.detail.executions.judgeRunning
                        : dict.prompts.detail.executions.judge}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="cursor-pointer"
                      disabled={!execution.output}
                      onClick={() => copyExecutionOutput(execution.output)}
                    >
                      <Copy className="h-4 w-4" />
                      {dict.prompts.detail.executions.copyOutput}
                    </Button>
                  </div>
                </div>
                <div className="max-h-32 overflow-y-auto whitespace-pre-wrap wrap-break-word text-muted-foreground">
                  {execution.output ?? dict.prompts.detail.executions.noOutput}
                </div>
              </div>
            ))
          ) : (
            <Empty className="border">
              <EmptyHeader>
                <EmptyTitle>{dict.prompts.detail.executions.emptyTitle}</EmptyTitle>
                <EmptyDescription>{dict.prompts.detail.executions.emptyDescription}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
