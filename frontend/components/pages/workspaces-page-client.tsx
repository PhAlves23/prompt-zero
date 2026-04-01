"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { Pencil, Trash2 } from "lucide-react"
import { z } from "zod/v4"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { bffFetch } from "@/lib/api/client"
import { queryKeys } from "@/lib/api/query-keys"
import type { Workspace } from "@/lib/api/types"
import type { Dictionary } from "@/app/[lang]/dictionaries"
import { validationMessages } from "@/lib/zod-i18n"

function createWorkspaceSchema(dict: Dictionary) {
  const m = validationMessages(dict)
  return z.object({
    name: z.string().min(2, { message: m.stringMin(2) }).max(100, { message: m.stringMax(100) }),
    description: z.string().max(500, { message: m.stringMax(500) }).optional(),
  })
}

type FormValues = z.infer<ReturnType<typeof createWorkspaceSchema>>

export function WorkspacesPageClient({ dict }: { dict: Dictionary }) {
  const queryClient = useQueryClient()
  const schema = useMemo(() => createWorkspaceSchema(dict), [dict])
  const [editingWorkspaceId, setEditingWorkspaceId] = useState<string | null>(null)
  const form = useForm<FormValues>({
    defaultValues: {
      name: "",
      description: "",
    },
  })
  const editForm = useForm<FormValues>({
    defaultValues: {
      name: "",
      description: "",
    },
  })

  const workspacesQuery = useQuery({
    queryKey: queryKeys.workspaces.list,
    queryFn: () => bffFetch<Workspace[]>("/workspaces"),
  })

  const createWorkspace = useMutation({
    mutationFn: (values: FormValues) =>
      bffFetch<Workspace>("/workspaces", { method: "POST", body: values }),
    onSuccess: () => {
      toast.success(dict.workspaces.toastCreated)
      form.reset()
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.list })
    },
  })

  const deleteWorkspace = useMutation({
    mutationFn: (id: string) => bffFetch<void>(`/workspaces/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success(dict.workspaces.toastRemoved)
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.list })
    },
  })

  const updateWorkspace = useMutation({
    mutationFn: (input: { id: string; values: FormValues }) =>
      bffFetch<Workspace>(`/workspaces/${input.id}`, { method: "PATCH", body: input.values }),
    onSuccess: () => {
      toast.success(dict.workspaces.toastUpdated)
      setEditingWorkspaceId(null)
      editForm.reset()
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.list })
    },
  })

  return (
    <div className="grid gap-4 px-4 lg:px-6">
      <Card>
        <CardHeader>
          <CardTitle>{dict.workspaces.newTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4"
            onSubmit={form.handleSubmit((values) => {
              const parsed = schema.safeParse(values)
              if (!parsed.success) {
                parsed.error.issues.forEach((issue) => {
                  const field = issue.path[0]
                  if (field === "name" || field === "description") {
                    form.setError(field, { message: issue.message })
                  }
                })
                return
              }
              createWorkspace.mutate(parsed.data)
            })}
          >
            <div className="grid gap-2">
              <Label htmlFor="name">{dict.workspaces.fields.name}</Label>
              <Input id="name" {...form.register("name")} aria-invalid={Boolean(form.formState.errors.name)} />
              {form.formState.errors.name ? (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">{dict.workspaces.fields.description}</Label>
              <Textarea
                id="description"
                rows={4}
                {...form.register("description")}
                aria-invalid={Boolean(form.formState.errors.description)}
              />
              {form.formState.errors.description ? (
                <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
              ) : null}
            </div>
            <Button type="submit" className="w-fit cursor-pointer">
              {dict.workspaces.createCta}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{dict.workspaces.title}</CardTitle>
        </CardHeader>
        <CardContent>
          {workspacesQuery.isPending ? (
            <p className="text-sm text-muted-foreground">{dict.workspaces.loading}</p>
          ) : workspacesQuery.data && workspacesQuery.data.length > 0 ? (
            <div className="grid gap-2">
              {workspacesQuery.data.map((workspace) => (
                <div key={workspace.id} className="rounded border p-3">
                  {editingWorkspaceId === workspace.id ? (
                    <form
                      className="grid gap-4"
                      onSubmit={editForm.handleSubmit((values) => {
                        const parsed = schema.safeParse(values)
                        if (!parsed.success) {
                          parsed.error.issues.forEach((issue) => {
                            const field = issue.path[0]
                            if (field === "name" || field === "description") {
                              editForm.setError(field, { message: issue.message })
                            }
                          })
                          return
                        }
                        updateWorkspace.mutate({ id: workspace.id, values: parsed.data })
                      })}
                    >
                      <p className="text-sm font-medium">{dict.workspaces.editTitle}</p>
                      <div className="grid gap-2">
                        <Label htmlFor={`edit-workspace-name-${workspace.id}`}>{dict.workspaces.fields.name}</Label>
                        <Input
                          id={`edit-workspace-name-${workspace.id}`}
                          {...editForm.register("name")}
                          aria-invalid={Boolean(editForm.formState.errors.name)}
                        />
                        {editForm.formState.errors.name ? (
                          <p className="text-sm text-destructive">{editForm.formState.errors.name.message}</p>
                        ) : null}
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor={`edit-workspace-description-${workspace.id}`}>{dict.workspaces.fields.description}</Label>
                        <Textarea
                          id={`edit-workspace-description-${workspace.id}`}
                          rows={3}
                          {...editForm.register("description")}
                          aria-invalid={Boolean(editForm.formState.errors.description)}
                        />
                        {editForm.formState.errors.description ? (
                          <p className="text-sm text-destructive">{editForm.formState.errors.description.message}</p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button className="cursor-pointer" type="submit" disabled={updateWorkspace.isPending}>
                          <Pencil className="h-4 w-4" />
                          {dict.common.save}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="cursor-pointer"
                          onClick={() => {
                            setEditingWorkspaceId(null)
                            editForm.reset()
                          }}
                        >
                          {dict.common.cancel}
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex min-w-0 items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium" title={workspace.name}>
                          {workspace.name}
                        </p>
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {workspace.description ?? dict.workspaces.noDescription}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          className="cursor-pointer"
                          onClick={() => {
                            setEditingWorkspaceId(workspace.id)
                            editForm.reset({
                              name: workspace.name,
                              description: workspace.description ?? "",
                            })
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                          {dict.common.edit}
                        </Button>
                        <Button
                          variant="destructive"
                          className="cursor-pointer"
                          onClick={() => deleteWorkspace.mutate(workspace.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          {dict.common.delete}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <Empty className="border">
              <EmptyHeader>
                <EmptyTitle>{dict.workspaces.emptyTitle}</EmptyTitle>
                <EmptyDescription>{dict.workspaces.emptyDescription}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
