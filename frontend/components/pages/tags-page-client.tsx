"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { z } from "zod/v4"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { bffFetch } from "@/lib/api/client"
import { queryKeys } from "@/lib/api/query-keys"
import type { Tag } from "@/lib/api/types"
import type { Dictionary } from "@/app/[lang]/dictionaries"

const schema = z.object({
  name: z.string().min(2),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
})

type FormValues = z.infer<typeof schema>
const presetColors = ["#9EFF00", "#22C55E", "#06B6D4", "#8B5CF6", "#EF4444", "#F97316"]

export function TagsPageClient({ dict }: { dict: Dictionary }) {
  const queryClient = useQueryClient()
  const [editingTagId, setEditingTagId] = useState<string | null>(null)
  const form = useForm<FormValues>({
    defaultValues: { name: "", color: "#9EFF00" },
  })
  const editForm = useForm<FormValues>({
    defaultValues: { name: "", color: "#9EFF00" },
  })
  const createColor = useWatch({ control: form.control, name: "color" }) ?? "#9EFF00"
  const editColor = useWatch({ control: editForm.control, name: "color" }) ?? "#9EFF00"

  const tagsQuery = useQuery({
    queryKey: queryKeys.tags.list,
    queryFn: () => bffFetch<Tag[]>("/tags"),
  })

  const createTag = useMutation({
    mutationFn: (values: FormValues) =>
      bffFetch<Tag>("/tags", { method: "POST", body: values }),
    onSuccess: () => {
      toast.success(dict.tags.toastCreated)
      form.reset()
      void queryClient.invalidateQueries({ queryKey: queryKeys.tags.list })
    },
  })

  const deleteTag = useMutation({
    mutationFn: (id: string) => bffFetch<void>(`/tags/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success(dict.tags.toastRemoved)
      void queryClient.invalidateQueries({ queryKey: queryKeys.tags.list })
    },
  })

  const updateTag = useMutation({
    mutationFn: (input: { id: string; values: FormValues }) =>
      bffFetch<Tag>(`/tags/${input.id}`, { method: "PATCH", body: input.values }),
    onSuccess: () => {
      toast.success(dict.tags.toastUpdated)
      setEditingTagId(null)
      editForm.reset()
      void queryClient.invalidateQueries({ queryKey: queryKeys.tags.list })
    },
  })

  return (
    <div className="grid gap-4 px-4 lg:px-6">
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>{dict.tags.newTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4"
            onSubmit={form.handleSubmit((values) => {
              const parsed = schema.safeParse(values)
              if (!parsed.success) {
                parsed.error.issues.forEach((issue) => {
                  const field = issue.path[0]
                  if (field === "name" || field === "color") {
                    form.setError(field, { message: issue.message })
                  }
                })
                return
              }
              createTag.mutate(parsed.data)
            })}
          >
            <div className="grid gap-2">
              <Label htmlFor="name">{dict.tags.fields.name}</Label>
              <Input id="name" {...form.register("name")} />
            </div>
            <div className="grid gap-3 rounded-lg border border-border/60 p-3">
              <Label htmlFor="color" className="text-sm">{dict.tags.fields.color}</Label>
              <div className="flex flex-wrap items-center gap-3">
                <Input
                  id="color-picker"
                  type="color"
                  value={createColor}
                  onChange={(event) => form.setValue("color", event.currentTarget.value.toUpperCase())}
                  className="h-9 w-16 cursor-pointer p-1"
                />
                <Input
                  id="color"
                  placeholder="#9EFF00"
                  value={createColor}
                  onChange={(event) => form.setValue("color", event.currentTarget.value.toUpperCase())}
                  className="max-w-[140px] uppercase"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {presetColors.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className="h-6 w-6 rounded border cursor-pointer"
                    style={{ backgroundColor: preset }}
                    onClick={() => form.setValue("color", preset)}
                    aria-label={`${dict.tags.selectColorAria} ${preset}`}
                  />
                ))}
              </div>
            </div>
            <Button type="submit" className="w-fit cursor-pointer">
              <Plus className="h-4 w-4" />
              {dict.tags.createCta}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>{dict.tags.title}</CardTitle>
        </CardHeader>
        <CardContent>
          {tagsQuery.isPending ? (
            <p className="text-sm text-muted-foreground">{dict.tags.loading}</p>
          ) : tagsQuery.data && tagsQuery.data.length > 0 ? (
            <div className="grid gap-2">
              {tagsQuery.data.map((tag) => {
                const tagColor = tag.color ?? "#9EFF00"
                const isEditing = editingTagId === tag.id
                return (
                  <div key={tag.id} className="rounded-lg border p-3">
                    {isEditing ? (
                      <form
                        className="grid gap-4"
                        onSubmit={editForm.handleSubmit((values) => {
                          const parsed = schema.safeParse(values)
                          if (!parsed.success) {
                            parsed.error.issues.forEach((issue) => {
                              const field = issue.path[0]
                              if (field === "name" || field === "color") {
                                editForm.setError(field, { message: issue.message })
                              }
                            })
                            return
                          }
                          updateTag.mutate({ id: tag.id, values: parsed.data })
                        })}
                      >
                        <p className="text-sm font-medium">{dict.tags.editTitle}</p>
                        <div className="grid gap-2">
                          <Label htmlFor={`edit-tag-name-${tag.id}`}>{dict.tags.fields.name}</Label>
                          <Input id={`edit-tag-name-${tag.id}`} {...editForm.register("name")} />
                        </div>
                        <div className="grid gap-3 rounded-lg border border-border/60 p-3">
                          <Label htmlFor={`edit-tag-color-${tag.id}`}>{dict.tags.fields.colorShort}</Label>
                          <div className="flex flex-wrap items-center gap-3">
                            <Input
                              id={`edit-tag-color-picker-${tag.id}`}
                              type="color"
                              value={editColor}
                              onChange={(event) => editForm.setValue("color", event.currentTarget.value.toUpperCase())}
                              className="h-9 w-16 cursor-pointer p-1"
                            />
                            <Input
                              id={`edit-tag-color-${tag.id}`}
                              value={editColor}
                              onChange={(event) => editForm.setValue("color", event.currentTarget.value.toUpperCase())}
                              className="max-w-[140px] uppercase"
                            />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {presetColors.map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                className="h-6 w-6 rounded border cursor-pointer"
                                style={{ backgroundColor: preset }}
                                onClick={() => editForm.setValue("color", preset)}
                                aria-label={`${dict.tags.selectColorAria} ${preset}`}
                              />
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button className="cursor-pointer" type="submit" disabled={updateTag.isPending}>
                            <Pencil className="h-4 w-4" />
                            {dict.common.save}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="cursor-pointer"
                            onClick={() => {
                              setEditingTagId(null)
                              editForm.reset()
                            }}
                          >
                            {dict.common.cancel}
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className="h-3 w-3 rounded-full border"
                              style={{ backgroundColor: tagColor }}
                              aria-hidden="true"
                            />
                            <p className="font-medium">{tag.name}</p>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{tagColor}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            className="cursor-pointer"
                            onClick={() => {
                              setEditingTagId(tag.id)
                              editForm.reset({
                                name: tag.name,
                                color: tagColor,
                              })
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                            {dict.common.edit}
                          </Button>
                          <Button
                            variant="destructive"
                            className="cursor-pointer"
                            onClick={() => deleteTag.mutate(tag.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            {dict.common.delete}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <Empty className="border">
              <EmptyHeader>
                <EmptyTitle>{dict.tags.emptyTitle}</EmptyTitle>
                <EmptyDescription>{dict.tags.emptyDescription}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}

        </CardContent>
      </Card>
    </div>
  )
}
