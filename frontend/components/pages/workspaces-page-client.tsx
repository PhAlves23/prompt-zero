"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
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

const schema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function WorkspacesPageClient() {
  const queryClient = useQueryClient()
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
      toast.success("Workspace criado")
      form.reset()
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.list })
    },
  })

  const deleteWorkspace = useMutation({
    mutationFn: (id: string) => bffFetch<void>(`/workspaces/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Workspace removido")
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.list })
    },
  })

  const updateWorkspace = useMutation({
    mutationFn: (input: { id: string; values: FormValues }) =>
      bffFetch<Workspace>(`/workspaces/${input.id}`, { method: "PATCH", body: input.values }),
    onSuccess: () => {
      toast.success("Workspace atualizado")
      setEditingWorkspaceId(null)
      editForm.reset()
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.list })
    },
  })

  return (
    <div className="grid gap-4 px-4 lg:px-6">
      <Card>
        <CardHeader>
          <CardTitle>Novo workspace</CardTitle>
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
              <Label htmlFor="name">Nome</Label>
              <Input id="name" {...form.register("name")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Descricao</Label>
              <Textarea id="description" rows={4} {...form.register("description")} />
            </div>
            <Button type="submit" className="w-fit cursor-pointer">
              Criar workspace
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Workspaces</CardTitle>
        </CardHeader>
        <CardContent>
          {workspacesQuery.isPending ? (
            <p className="text-sm text-muted-foreground">Carregando workspaces...</p>
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
                      <p className="text-sm font-medium">Editar workspace</p>
                      <div className="grid gap-2">
                        <Label htmlFor={`edit-workspace-name-${workspace.id}`}>Nome</Label>
                        <Input id={`edit-workspace-name-${workspace.id}`} {...editForm.register("name")} />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor={`edit-workspace-description-${workspace.id}`}>Descricao</Label>
                        <Textarea
                          id={`edit-workspace-description-${workspace.id}`}
                          rows={3}
                          {...editForm.register("description")}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Button className="cursor-pointer" type="submit" disabled={updateWorkspace.isPending}>
                          <Pencil className="h-4 w-4" />
                          Salvar
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
                          Cancelar
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{workspace.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {workspace.description ?? "Sem descricao"}
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
                          Editar
                        </Button>
                        <Button
                          variant="destructive"
                          className="cursor-pointer"
                          onClick={() => deleteWorkspace.mutate(workspace.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Remover
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
                <EmptyTitle>Nenhum workspace cadastrado</EmptyTitle>
                <EmptyDescription>Crie workspaces para organizar seus prompts.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
