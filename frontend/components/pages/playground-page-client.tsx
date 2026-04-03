"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { formatDistanceToNow } from "date-fns"
import { enUS, es, ptBR } from "date-fns/locale"
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject } from "react"
import { toast } from "sonner"
import { AdvancedSettings } from "@/components/playground/advanced-settings"
import { ModelCombobox } from "@/components/playground/model-combobox"
import { PlaygroundDiffPanel } from "@/components/playground/playground-diff-panel"
import { PlaygroundResultCard } from "@/components/playground/playground-result-card"
import { PromptSelector } from "@/components/playground/prompt-selector"
import { PlaygroundVariablesForm } from "@/components/playground/variables-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Dictionary } from "@/app/[lang]/dictionaries"

type PlaygroundDictSlice = Dictionary["playgroundPage"]
import type { Locale } from "@/lib/locales"
import { usePlaygroundHistory, type PlaygroundHistoryEntry } from "@/hooks/use-playground-history"
import { bffFetch, ClientHttpError } from "@/lib/api/client"
import type { PlaygroundCompareResponse, Prompt, PromptVariable } from "@/lib/api/types"
import { DEFAULT_ADVANCED, type AdvancedSettingsValues } from "@/lib/playground/types"

const MAX_VARIANTS = 6
const MIN_VARIANTS = 1

type VariantRow = {
  id: string
  model: string
  advanced: AdvancedSettingsValues
}

function newVariantRow(model = "gpt-4o-mini"): VariantRow {
  return {
    id: crypto.randomUUID(),
    model,
    advanced: { ...DEFAULT_ADVANCED },
  }
}

function dateFnsLocale(lang: Locale) {
  if (lang === "pt-BR") return ptBR
  if (lang === "es-ES") return es
  return enUS
}

function PlaygroundTemplateVariablesHost({
  variables,
  seed,
  valuesRef,
  disabled,
  labels,
}: {
  variables: PromptVariable[]
  seed?: Record<string, string> | null
  valuesRef: MutableRefObject<Record<string, string>>
  disabled?: boolean
  labels: Pick<PlaygroundDictSlice, "variablesTitle" | "variablesHint">
}) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const base = Object.fromEntries(variables.map((v) => [v.name, v.defaultValue ?? ""]))
    return { ...base, ...(seed ?? {}) }
  })

  useLayoutEffect(() => {
    valuesRef.current = values
  }, [values, valuesRef])

  const onValuesChange = useCallback(
    (next: Record<string, string>) => {
      setValues(next)
      valuesRef.current = next
    },
    [valuesRef],
  )

  return (
    <PlaygroundVariablesForm
      variables={variables}
      values={values}
      onChange={onValuesChange}
      disabled={disabled}
      title={labels.variablesTitle}
      requiredHint={labels.variablesHint}
    />
  )
}

export function PlaygroundPageClient({ dict, lang }: { dict: Dictionary; lang: Locale }) {
  const d = dict.playgroundPage
  const qc = useQueryClient()

  const [promptId, setPromptId] = useState("")
  const [promptTitle, setPromptTitle] = useState("")
  const [variants, setVariants] = useState<VariantRow[]>(() => [newVariantRow(), newVariantRow("gpt-4o")])
  const [result, setResult] = useState<PlaygroundCompareResponse | null>(null)
  const templateVarsRef = useRef<Record<string, string>>({})
  const [variablesSeed, setVariablesSeed] = useState<Record<string, string> | null>(null)
  const [varsRemountKey, setVarsRemountKey] = useState(0)

  const { entries: historyEntries, pushEntry, removeEntry, clearAll } = usePlaygroundHistory()

  const { data: promptDetail } = useQuery({
    queryKey: ["prompt", promptId],
    queryFn: () => bffFetch<Prompt>(`/prompts/${promptId}`),
    enabled: Boolean(promptId),
  })

  const { data: promptVariables, isFetching: variablesLoading } = useQuery({
    queryKey: ["prompt", promptId, "variables"],
    queryFn: () => bffFetch<PromptVariable[]>(`/prompts/${promptId}/variables`),
    enabled: Boolean(promptId) && Boolean(promptDetail?.isTemplate),
  })

  const compare = useMutation({
    mutationFn: () => {
      const variablesPayload: Record<string, string> | undefined =
        promptDetail?.isTemplate && promptVariables?.length
          ? Object.fromEntries(promptVariables.map((v) => [v.name, templateVarsRef.current[v.name] ?? ""]))
          : undefined

      return bffFetch<PlaygroundCompareResponse>("/playground/compare", {
        method: "POST",
        body: {
          promptId,
          variables: variablesPayload,
          variants: variants.map((row) => ({
            model: row.model.trim(),
            provider: row.advanced.provider || undefined,
            temperature: row.advanced.temperature,
            maxTokens: row.advanced.maxTokens,
            topP: row.advanced.topP,
            topK: row.advanced.topK,
          })),
        },
      })
    },
    onSuccess: (data) => {
      setResult(data)
      const ms = data.results
        .filter((r): r is Extract<typeof r, { ok: true }> => r.ok)
        .reduce((acc, r) => acc + r.meta.latencyMs, 0)
      toast.success(d.toastOk, { description: `${data.results.length} · ~${ms} ms` })
      pushEntry({
        promptId,
        promptTitle: promptTitle || promptDetail?.title || "",
        variables:
          promptDetail?.isTemplate && promptVariables?.length ? { ...templateVarsRef.current } : {},
        variants: variants.map((v) => ({ model: v.model, advanced: { ...v.advanced } })),
        results: data,
      })
    },
    onError: (e) => toast.error(e instanceof ClientHttpError ? e.message : d.resultErr),
  })

  const addVariant = useCallback(() => {
    setVariants((prev) => {
      if (prev.length >= MAX_VARIANTS) return prev
      const last = prev[prev.length - 1]
      return [...prev, newVariantRow(last?.model ?? "gpt-4o-mini")]
    })
  }, [])

  const removeVariant = useCallback((id: string) => {
    setVariants((prev) => (prev.length <= MIN_VARIANTS ? prev : prev.filter((v) => v.id !== id)))
  }, [])

  const updateVariant = useCallback((id: string, patch: Partial<Pick<VariantRow, "model" | "advanced">>) => {
    setVariants((prev) =>
      prev.map((v) => {
        if (v.id !== id) return v
        return {
          ...v,
          model: patch.model !== undefined ? patch.model : v.model,
          advanced: patch.advanced !== undefined ? patch.advanced : v.advanced,
        }
      }),
    )
  }, [])

  const restoreHistory = useCallback(
    (entry: PlaygroundHistoryEntry) => {
      setPromptId(entry.promptId)
      setPromptTitle(entry.promptTitle)
      setVariablesSeed({ ...entry.variables })
      setVarsRemountKey((k) => k + 1)
      setResult(entry.results)
      setVariants(
        entry.variants.map((v) => ({
          id: crypto.randomUUID(),
          model: v.model,
          advanced: { ...v.advanced },
        })),
      )
      void qc.invalidateQueries({ queryKey: ["prompt", entry.promptId] })
      void qc.invalidateQueries({ queryKey: ["prompt", entry.promptId, "variables"] })
      toast.message(d.historyRestored)
    },
    [qc, d.historyRestored],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault()
        if (!compare.isPending && promptId && variants.every((v) => v.model.trim())) compare.mutate()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [compare, promptId, variants])

  const templateVarsBlocking = Boolean(promptDetail?.isTemplate) && variablesLoading

  const canRun =
    Boolean(promptId) &&
    variants.length > 0 &&
    variants.every((v) => v.model.trim().length > 0) &&
    !compare.isPending &&
    !templateVarsBlocking

  const diffPair = useMemo(() => {
    if (!result) return null
    const ok = result.results.filter((r): r is Extract<(typeof result.results)[0], { ok: true }> => r.ok)
    if (ok.length < 2) return null
    return { a: ok[0], b: ok[1] }
  }, [result])

  const varsSignature = useMemo(() => (promptVariables ?? []).map((v) => v.name).join("\0"), [promptVariables])

  const advancedLabels = useMemo(
    () => ({
      trigger: d.advancedTrigger,
      provider: d.advancedProvider,
      providerAuto: d.advancedProviderAuto,
      temperature: d.advancedTemperature,
      maxTokens: d.advancedMaxTokens,
      topP: d.advancedTopP,
      topK: d.advancedTopK,
    }),
    [d],
  )

  const resultCardLabels = useMemo(
    () => ({
      ok: d.resultOk,
      err: d.resultErr,
      provider: d.metaProvider,
      tokensIn: d.metaTokensIn,
      tokensOut: d.metaTokensOut,
      tokensTotal: d.metaTokensTotal,
      latency: d.metaLatency,
      cost: d.metaCost,
      execution: d.metaExecution,
      pricing: d.metaPricing,
      openPrompt: d.openPrompt,
    }),
    [d],
  )

  return (
    <div className="grid gap-4 px-4 lg:grid-cols-[minmax(200px,260px)_1fr] lg:px-6">
      <Card className="h-fit lg:sticky lg:top-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{d.historyTitle}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          {historyEntries.length === 0 ? (
            <p className="text-muted-foreground text-xs">{d.historyEmpty}</p>
          ) : (
            <ScrollArea className="h-[min(420px,50vh)] pr-2">
              <ul className="grid gap-2">
                {historyEntries.map((e) => (
                  <li key={e.id} className="flex flex-col gap-1 rounded-md border p-2 text-xs">
                    <button
                      type="button"
                      className="text-left font-medium hover:underline"
                      onClick={() => restoreHistory(e)}
                    >
                      {e.promptTitle || e.promptId.slice(0, 8)}…
                    </button>
                    <span className="text-muted-foreground">
                      {formatDistanceToNow(new Date(e.savedAt), { addSuffix: true, locale: dateFnsLocale(lang) })}
                    </span>
                    <Button type="button" variant="ghost" size="sm" className="h-7 self-start px-2 text-xs" onClick={() => removeEntry(e.id)}>
                      {d.historyRemove}
                    </Button>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
          {historyEntries.length > 0 ? (
            <Button type="button" variant="outline" size="sm" onClick={clearAll}>
              {d.historyClear}
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>{d.title}</CardTitle>
            <p className="text-muted-foreground text-sm">{d.hintShortcut}</p>
          </CardHeader>
          <CardContent className="grid gap-4">
            <PromptSelector
              promptId={promptId}
              onPromptChange={(id, title) => {
                setPromptId(id)
                setPromptTitle(title)
                setVariablesSeed(null)
              }}
              disabled={compare.isPending}
              labels={{
                field: d.promptField,
                placeholder: d.promptPlaceholder,
                empty: d.promptEmpty,
                loading: d.promptLoading,
              }}
            />

            {promptDetail?.isTemplate && promptVariables && promptVariables.length > 0 ? (
              <PlaygroundTemplateVariablesHost
                key={`${promptId}-${varsSignature}-${varsRemountKey}`}
                variables={promptVariables}
                seed={variablesSeed}
                valuesRef={templateVarsRef}
                disabled={compare.isPending}
                labels={{ variablesTitle: d.variablesTitle, variablesHint: d.variablesHint }}
              />
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={addVariant} disabled={compare.isPending || variants.length >= MAX_VARIANTS}>
                {d.addVariant}
              </Button>
              <span className="text-muted-foreground text-xs">
                {d.variantCount}: {variants.length}/{MAX_VARIANTS}
              </span>
            </div>

            <div className="grid gap-4">
              {variants.map((row, idx) => (
                <Card key={row.id} className="border-dashed">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm">{d.variantLabel.replace("{n}", String(idx + 1))}</CardTitle>
                    {variants.length > MIN_VARIANTS ? (
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeVariant(row.id)} disabled={compare.isPending}>
                        {d.removeVariant}
                      </Button>
                    ) : null}
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    <ModelCombobox
                      label={d.modelLabel}
                      value={row.model}
                      onChange={(m) => updateVariant(row.id, { model: m })}
                      disabled={compare.isPending}
                      placeholder={d.modelPlaceholder}
                      emptyLabel={d.modelEmpty}
                    />
                    <AdvancedSettings
                      idSuffix={row.id}
                      values={row.advanced}
                      onChange={(next) => updateVariant(row.id, { advanced: next })}
                      disabled={compare.isPending}
                      labels={advancedLabels}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>

            <Button type="button" className="cursor-pointer" disabled={!canRun} onClick={() => compare.mutate()}>
              {compare.isPending ? d.comparing : d.compare}
            </Button>
          </CardContent>
        </Card>

        {result ? (
          <div className="grid gap-3">
            {diffPair ? (
              <PlaygroundDiffPanel
                title={d.diffTitle}
                leftLabel={diffPair.a.model}
                rightLabel={diffPair.b.model}
                leftText={diffPair.a.output}
                rightText={diffPair.b.output}
              />
            ) : null}
            <div className="grid gap-3 md:grid-cols-2">
              {result.results.map((r, i) => (
                <PlaygroundResultCard key={i} result={r} index={i} promptId={promptId} labels={resultCardLabels} lang={lang} />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
