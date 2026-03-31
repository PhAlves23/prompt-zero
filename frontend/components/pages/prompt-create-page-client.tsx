"use client"

import { useMutation, useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { useFieldArray, useForm, useWatch } from "react-hook-form"
import { ArrowLeft, Check, ChevronsUpDown, Plus, Trash2 } from "lucide-react"
import { z } from "zod/v4"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { bffFetch, ClientHttpError } from "@/lib/api/client"
import { queryKeys } from "@/lib/api/query-keys"
import type { Prompt, Tag, Workspace } from "@/lib/api/types"
import { cn } from "@/lib/utils"
import type { Dictionary } from "@/app/[lang]/dictionaries"

const languageByLocalePrefix = {
  pt: "pt",
  en: "en",
  es: "es",
} as const

type PromptLanguage = (typeof languageByLocalePrefix)[keyof typeof languageByLocalePrefix]

const createPromptSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  content: z.string().min(10),
  workspaceId: z.string().optional(),
  isPublic: z.boolean(),
  language: z.enum(["pt", "en", "es"]),
  model: z.string().min(1),
  temperature: z.number().min(0).max(2),
  topP: z.number().min(0).max(1),
  topK: z.number().int().min(1).max(200),
  maxTokens: z.number().int().min(1).max(4000),
  tagIds: z.array(z.string()).optional(),
  variables: z.array(
    z.object({
      name: z.string().min(1),
      type: z.enum(["text", "textarea", "select"]),
      defaultValue: z.string().optional(),
      description: z.string().optional(),
      optionsText: z.string().optional(),
    }),
  ),
})

type CreatePromptValues = z.infer<typeof createPromptSchema>
type CreatePromptPayload = Pick<
  CreatePromptValues,
  "title" | "description" | "content" | "workspaceId" | "isPublic" | "language" | "model" | "tagIds"
>
type SyncVariablePayload = {
  name: string
  type: "text" | "textarea" | "select"
  defaultValue?: string
  description?: string
  options?: string[]
}

function extractVariableNames(content: string): string[] {
  const matches = [...content.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)]
  const unique = new Set(matches.map((match) => match[1]))
  return Array.from(unique)
}

export function PromptCreatePageClient({ lang, dict }: { lang: string; dict: Dictionary }) {
  const router = useRouter()
  const [openTags, setOpenTags] = useState(false)
  const localePrefix = (lang.split("-")[0] ?? "pt") as keyof typeof languageByLocalePrefix
  const defaultLanguage: PromptLanguage = languageByLocalePrefix[localePrefix] ?? "pt"

  const form = useForm<CreatePromptValues>({
    defaultValues: {
      title: "",
      description: "",
      content: "",
      workspaceId: "",
      isPublic: false,
      language: defaultLanguage,
      model: "gpt-4o-mini",
      temperature: 0.7,
      topP: 0.95,
      topK: 40,
      maxTokens: 2048,
      tagIds: [],
      variables: [],
    },
  })
  const createIsPublic = useWatch({
    control: form.control,
    name: "isPublic",
  })
  const createLanguage = useWatch({
    control: form.control,
    name: "language",
  })
  const createModel = useWatch({
    control: form.control,
    name: "model",
  })
  const createContent = useWatch({
    control: form.control,
    name: "content",
  })
  const createWorkspaceId = useWatch({
    control: form.control,
    name: "workspaceId",
  })
  const selectedTagIds = useWatch({
    control: form.control,
    name: "tagIds",
  })
  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "variables",
  })
  const watchedVariables = useWatch({
    control: form.control,
    name: "variables",
  })

  useEffect(() => {
    const detectedNames = extractVariableNames(createContent ?? "")
    if (detectedNames.length === 0) {
      return
    }

    const currentVariables = form.getValues("variables")
    const currentByName = new Map(currentVariables.map((variable) => [variable.name, variable]))
    const nextVariables = detectedNames.map((name) => {
      const existing = currentByName.get(name)
      return {
        name,
        type: existing?.type ?? "text",
        defaultValue: existing?.defaultValue ?? "",
        description: existing?.description ?? "",
        optionsText: existing?.optionsText ?? "",
      }
    })
    const hasSameShape =
      currentVariables.length === nextVariables.length &&
      currentVariables.every((variable, index) => variable.name === nextVariables[index]?.name)
    if (!hasSameShape) {
      replace(nextVariables)
    }
  }, [createContent, form, replace])

  const createPrompt = useMutation({
    mutationFn: async (values: { prompt: CreatePromptPayload; variables: SyncVariablePayload[] }) => {
      const createdPrompt = await bffFetch<Prompt>("/prompts", {
        method: "POST",
        body: values.prompt,
      })
      if (values.variables.length > 0) {
        await bffFetch(`/prompts/${createdPrompt.id}/variables`, {
          method: "PUT",
          body: { variables: values.variables },
        })
      }
      return createdPrompt
    },
    onSuccess: () => {
      toast.success(dict.prompts.create)
      router.push(`/${lang}/prompts`)
      router.refresh()
    },
    onError: (error) => {
      if (error instanceof ClientHttpError) {
        toast.error(error.payload.message)
        return
      }
      toast.error(dict.prompts.createForm.toastCreateError)
    },
  })
  const workspacesQuery = useQuery({
    queryKey: queryKeys.workspaces.list,
    queryFn: () => bffFetch<Workspace[]>("/workspaces"),
  })
  const tagsQuery = useQuery({
    queryKey: queryKeys.tags.list,
    queryFn: () => bffFetch<Tag[]>("/tags"),
  })
  const selectedTags = useMemo(
    () => (tagsQuery.data ?? []).filter((tag) => (selectedTagIds ?? []).includes(tag.id)),
    [tagsQuery.data, selectedTagIds],
  )

  return (
    <div className="grid gap-4 px-4 lg:px-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>{dict.prompts.create}</CardTitle>
            <Button asChild variant="outline" className="cursor-pointer">
              <Link href={`/${lang}/prompts`}>
                <ArrowLeft className="h-4 w-4" />
                {dict.prompts.createForm.backToList}
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form
            method="post"
            noValidate
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              void form.handleSubmit(
                (data) => {
                  const baseline = form.getValues()
                  const values: CreatePromptValues = {
                    ...baseline,
                    ...data,
                    variables: data.variables ?? baseline.variables,
                    tagIds: data.tagIds ?? baseline.tagIds,
                    model: data.model ?? baseline.model,
                    language: data.language ?? baseline.language,
                    workspaceId: data.workspaceId ?? baseline.workspaceId,
                    isPublic: data.isPublic ?? baseline.isPublic,
                    temperature: Number.isFinite(data.temperature)
                      ? data.temperature
                      : baseline.temperature,
                    topP: Number.isFinite(data.topP) ? data.topP : baseline.topP,
                    topK: Number.isFinite(data.topK) ? data.topK : baseline.topK,
                    maxTokens: Number.isFinite(data.maxTokens)
                      ? data.maxTokens
                      : baseline.maxTokens,
                  }
                  const parsed = createPromptSchema.safeParse(values)
                  if (!parsed.success) {
                    const [first] = parsed.error.issues
                    if (first?.message) {
                      toast.error(first.message)
                    }
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
                  createPrompt.mutate({
                    prompt: {
                      title: parsed.data.title,
                      description: parsed.data.description,
                      content: parsed.data.content,
                      workspaceId: parsed.data.workspaceId?.trim() ? parsed.data.workspaceId : undefined,
                      isPublic: parsed.data.isPublic,
                      language: parsed.data.language,
                      model: parsed.data.model,
                      tagIds: parsed.data.tagIds?.length ? parsed.data.tagIds : undefined,
                    },
                    variables: parsed.data.variables.map((variable) => ({
                      name: variable.name,
                      type: variable.type,
                      defaultValue: variable.defaultValue?.trim() || undefined,
                      description: variable.description?.trim() || undefined,
                      options:
                        variable.type === "select"
                          ? (variable.optionsText ?? "")
                              .split(",")
                              .map((item) => item.trim())
                              .filter(Boolean)
                          : undefined,
                    })),
                  })
                },
                (errors) => {
                  const first = Object.entries(errors)[0]
                  toast.error(
                    first
                      ? `${String(first[0])}: ${first[1]?.message ?? "inválido"}`
                      : dict.prompts.createForm.toastCreateError,
                  )
                },
              )(event)
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="title">{dict.prompts.createForm.fields.title}</Label>
              <Input id="title" {...form.register("title")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">{dict.prompts.createForm.fields.description}</Label>
              <Input id="description" {...form.register("description")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="content">{dict.prompts.createForm.fields.content}</Label>
              <Textarea id="content" rows={8} {...form.register("content")} />
            </div>
            <div className="grid gap-4 rounded-lg border p-4">
              <p className="text-sm font-medium">{dict.prompts.createForm.promptSettings}</p>
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                <div className="grid gap-2">
                  <Label htmlFor="language">{dict.prompts.createForm.fields.language}</Label>
                  <Select
                    value={createLanguage}
                    onValueChange={(value) => {
                      if (value === "pt" || value === "en" || value === "es") {
                        form.setValue("language", value)
                      }
                    }}
                  >
                    <SelectTrigger id="language" className="cursor-pointer">
                      <SelectValue placeholder={dict.prompts.createForm.selectLanguage} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pt" className="cursor-pointer">Portugues</SelectItem>
                      <SelectItem value="en" className="cursor-pointer">English</SelectItem>
                      <SelectItem value="es" className="cursor-pointer">Espanol</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="category-tags">{dict.prompts.detail.edit.fields.categories}</Label>
                  <Popover open={openTags} onOpenChange={setOpenTags}>
                    <PopoverTrigger asChild>
                      <Button
                        id="category-tags"
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={openTags}
                        className="justify-between"
                        disabled={tagsQuery.isPending || tagsQuery.isError}
                      >
                        {selectedTags.length > 0
                          ? selectedTags.map((tag) => tag.name).join(", ")
                          : dict.prompts.createForm.selectCategories}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-(--radix-popover-trigger-width) p-0">
                      <Command>
                        <CommandInput placeholder={dict.prompts.createForm.searchCategory} />
                        <CommandList>
                          <CommandEmpty>{dict.prompts.createForm.emptyCategories}</CommandEmpty>
                          <CommandGroup>
                            {(tagsQuery.data ?? []).map((tag) => {
                              const isSelected = (selectedTagIds ?? []).includes(tag.id)
                              return (
                                <CommandItem
                                  key={tag.id}
                                  value={`${tag.name} ${tag.id}`}
                                  onSelect={() => {
                                    const current = selectedTagIds ?? []
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
                    <p className="text-xs text-muted-foreground">{dict.prompts.createForm.loadingCategories}</p>
                  ) : null}
                  {tagsQuery.isError ? (
                    <p className="text-xs text-destructive">Nao foi possivel carregar as categorias.</p>
                  ) : null}
                  {!tagsQuery.isPending && !tagsQuery.isError && (tagsQuery.data?.length ?? 0) === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      {dict.prompts.createForm.emptyCategoriesHintPrefix} <Link href={`/${lang}/tags`} className="underline">Tags</Link>.
                    </p>
                  ) : null}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="model">{dict.prompts.createForm.fields.model}</Label>
                  <Select
                    value={createModel}
                    onValueChange={(value) => form.setValue("model", value)}
                  >
                    <SelectTrigger id="model" className="cursor-pointer">
                      <SelectValue placeholder={dict.prompts.createForm.selectModel} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-4o-mini" className="cursor-pointer">gpt-4o-mini</SelectItem>
                      <SelectItem value="gpt-4o" className="cursor-pointer">gpt-4o</SelectItem>
                      <SelectItem value="claude-3-5-sonnet" className="cursor-pointer">claude-3-5-sonnet</SelectItem>
                      <SelectItem value="gemini-1.5-flash" className="cursor-pointer">gemini-1.5-flash</SelectItem>
                      <SelectItem value="openrouter/default" className="cursor-pointer">openrouter/default</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="workspace">{dict.prompts.createForm.fields.workspace}</Label>
                  <Select
                    value={createWorkspaceId?.trim() ? createWorkspaceId : "__none"}
                    onValueChange={(value) => form.setValue("workspaceId", value === "__none" ? "" : value)}
                  >
                    <SelectTrigger id="workspace" className="cursor-pointer">
                      <SelectValue placeholder={dict.prompts.createForm.selectWorkspace} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none" className="cursor-pointer">
                        {dict.prompts.createForm.noWorkspace}
                      </SelectItem>
                      {(workspacesQuery.data ?? []).map((workspace) => (
                        <SelectItem key={workspace.id} value={workspace.id} className="cursor-pointer">
                          {workspace.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {workspacesQuery.isPending ? (
                    <p className="text-xs text-muted-foreground">{dict.prompts.createForm.loadingWorkspaces}</p>
                  ) : null}
                  {workspacesQuery.isError ? (
                    <p className="text-xs text-destructive">Nao foi possivel carregar os workspaces.</p>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="grid gap-3 rounded-lg border p-4 md:grid-cols-2">
              <p className="md:col-span-2 text-sm font-medium">{dict.prompts.createForm.advancedSettings}</p>
              <div className="grid gap-1.5">
                <Label htmlFor="temperature">Temperature</Label>
                <Input
                  id="temperature"
                  type="number"
                  step="0.01"
                  min={0}
                  max={2}
                  {...form.register("temperature", { valueAsNumber: true })}
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
                  {...form.register("topP", { valueAsNumber: true })}
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
                  {...form.register("topK", { valueAsNumber: true })}
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
                  {...form.register("maxTokens", { valueAsNumber: true })}
                />
                <p className="text-xs text-muted-foreground">Numero maximo de tokens na resposta</p>
              </div>
            </div>
            <div className="grid gap-3 rounded-lg border p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{dict.prompts.createForm.templateVariablesTitle}</p>
                <Button
                  type="button"
                  variant="outline"
                  className="cursor-pointer"
                  onClick={() =>
                    append({
                      name: "",
                      type: "text",
                      defaultValue: "",
                      description: "",
                      optionsText: "",
                    })
                  }
                >
                  <Plus className="h-4 w-4" />
                  {dict.prompts.createForm.addVariable}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {dict.prompts.createForm.templateHint}
              </p>
              {fields.length === 0 ? (
                <p className="text-sm text-muted-foreground">{dict.prompts.createForm.noVariables}</p>
              ) : (
                <div className="grid gap-3">
                  {fields.map((field, index) => {
                    const variableType = watchedVariables?.[index]?.type ?? field.type
                    return (
                      <div key={field.id} className="grid gap-3 rounded-md border p-3 md:grid-cols-2">
                        <div className="grid gap-1.5">
                          <Label htmlFor={`variable-name-${field.id}`}>{dict.prompts.createForm.fields.name}</Label>
                          <Input id={`variable-name-${field.id}`} {...form.register(`variables.${index}.name`)} />
                        </div>
                        <div className="grid gap-1.5">
                          <Label htmlFor={`variable-type-${field.id}`}>{dict.prompts.createForm.fields.type}</Label>
                          <Select
                            value={variableType}
                            onValueChange={(value) => {
                              if (value === "text" || value === "textarea" || value === "select") {
                                form.setValue(`variables.${index}.type`, value)
                              }
                            }}
                          >
                            <SelectTrigger id={`variable-type-${field.id}`} className="cursor-pointer">
                              <SelectValue placeholder={dict.prompts.createForm.selectType} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text" className="cursor-pointer">Text</SelectItem>
                              <SelectItem value="textarea" className="cursor-pointer">Textarea</SelectItem>
                              <SelectItem value="select" className="cursor-pointer">Select</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-1.5">
                          <Label htmlFor={`variable-default-${field.id}`}>{dict.prompts.createForm.fields.default}</Label>
                          <Input id={`variable-default-${field.id}`} {...form.register(`variables.${index}.defaultValue`)} />
                        </div>
                        <div className="grid gap-1.5">
                          <Label htmlFor={`variable-description-${field.id}`}>{dict.prompts.createForm.fields.description}</Label>
                          <Input
                            id={`variable-description-${field.id}`}
                            {...form.register(`variables.${index}.description`)}
                          />
                        </div>
                        {variableType === "select" ? (
                          <div className="grid gap-1.5 md:col-span-2">
                            <Label htmlFor={`variable-options-${field.id}`}>Opcoes (separadas por virgula)</Label>
                            <Input
                              id={`variable-options-${field.id}`}
                              placeholder="casual, formal, tecnico"
                              {...form.register(`variables.${index}.optionsText`)}
                            />
                          </div>
                        ) : null}
                        <div className="md:col-span-2">
                          <Button
                            type="button"
                            variant="destructive"
                            className="cursor-pointer"
                            onClick={() => remove(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                            {dict.prompts.createForm.removeVariable}
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={createIsPublic}
                onCheckedChange={(checked) => form.setValue("isPublic", checked)}
                aria-label={dict.prompts.createForm.publicPromptAria}
              />
              <span className="text-sm text-muted-foreground">{dict.prompts.createForm.publicPromptLabel}</span>
            </div>
            <Button
              type="submit"
              className="w-fit cursor-pointer"
              disabled={createPrompt.isPending || form.formState.isSubmitting}
            >
              {createPrompt.isPending ? dict.prompts.createForm.creating : dict.prompts.create}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
