"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { bffFetch, ClientHttpError } from "@/lib/api/client"
import { queryKeys } from "@/lib/api/query-keys"
import type { WebhookDeliveryItem, WebhookItem } from "@/lib/api/types"
import type { Dictionary } from "@/app/[lang]/dictionaries"
import {
  WebhookForm,
  buildCreateWebhookBody,
  type WebhookCreateFormState,
} from "@/components/webhooks/webhook-form"
import { WebhookListFilters } from "@/components/webhooks/webhook-filters"
import { WebhookList } from "@/components/webhooks/webhook-list"
import { TemplateSelector } from "@/components/webhooks/template-selector"
import {
  TestWebhookDialog,
  type TestWebhookResult,
} from "@/components/webhooks/test-webhook-dialog"
import { DeliveryDetailsDialog } from "@/components/webhooks/delivery-details-dialog"
import { WebhookEditDialog } from "@/components/webhooks/webhook-edit-dialog"
import { WebhookScenarios } from "@/components/webhooks/webhook-scenarios"
import { WebhookSignatureValidator } from "@/components/webhooks/webhook-signature-validator"

const defaultForm = (): WebhookCreateFormState => ({
  name: "",
  url: "https://example.com/hook",
  events: ["execution.completed"],
  filtersText: "",
  retryCount: 3,
  timeoutMs: 60_000,
})

export function WebhooksPageClient({ lang, dict }: { lang: string; dict: Dictionary }) {
  const d = dict.webhooksPage
  const qc = useQueryClient()
  const [createForm, setCreateForm] = useState<WebhookCreateFormState>(defaultForm)
  const [secretFlash, setSecretFlash] = useState<string | null>(null)
  const [openDeliveries, setOpenDeliveries] = useState<string | null>(null)
  const [searchUrl, setSearchUrl] = useState("")
  const [filterEvent, setFilterEvent] = useState("__all__")
  const [editingWebhook, setEditingWebhook] = useState<WebhookItem | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [testingWebhook, setTestingWebhook] = useState<WebhookItem | null>(null)
  const [testOpen, setTestOpen] = useState(false)
  const [testResult, setTestResult] = useState<TestWebhookResult | null>(null)
  const [detailDelivery, setDetailDelivery] = useState<WebhookDeliveryItem | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [toggleActivePendingId, setToggleActivePendingId] = useState<string | null>(null)

  const listQuery = useQuery({
    queryKey: queryKeys.webhooks.list,
    queryFn: () => bffFetch<WebhookItem[]>("/webhooks"),
  })

  const deliveriesQuery = useQuery({
    queryKey: queryKeys.webhooks.deliveries(openDeliveries ?? ""),
    queryFn: () => bffFetch<WebhookDeliveryItem[]>(`/webhooks/${openDeliveries}/deliveries`),
    enabled: Boolean(openDeliveries),
  })

  const filteredItems = useMemo(() => {
    const rows = listQuery.data ?? []
    return rows.filter((w) => {
      if (searchUrl.trim()) {
        if (!w.url.toLowerCase().includes(searchUrl.trim().toLowerCase())) {
          return false
        }
      }
      if (filterEvent !== "__all__" && !w.events.includes(filterEvent)) {
        return false
      }
      return true
    })
  }, [listQuery.data, searchUrl, filterEvent])

  const globallyEmpty = !listQuery.data?.length
  const filterEmpty =
    Boolean(listQuery.data?.length) && filteredItems.length === 0

  const createMutation = useMutation({
    mutationFn: () =>
      bffFetch<WebhookItem & { secret: string }>("/webhooks", {
        method: "POST",
        body: buildCreateWebhookBody(createForm),
      }),
    onSuccess: (row) => {
      setSecretFlash(row.secret)
      void qc.invalidateQueries({ queryKey: queryKeys.webhooks.list })
      toast.success(d.toastCreated)
    },
    onError: (e) => toast.error(e instanceof ClientHttpError ? e.message : d.toastError),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => bffFetch(`/webhooks/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.webhooks.list })
      toast.success(d.toastRemoved)
    },
  })

  const patchMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      bffFetch<WebhookItem>(`/webhooks/${id}`, { method: "PATCH", body }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.webhooks.list })
      toast.success(d.toastUpdated)
      setEditOpen(false)
      setEditingWebhook(null)
    },
    onError: (e) => toast.error(e instanceof ClientHttpError ? e.message : d.toastError),
  })

  const testMutation = useMutation({
    mutationFn: ({
      id,
      event,
      payload,
    }: {
      id: string
      event: string
      payload?: Record<string, unknown>
    }) =>
      bffFetch<TestWebhookResult>(`/webhooks/${id}/test`, {
        method: "POST",
        body: { event, payload },
      }),
    onSuccess: (res) => {
      setTestResult(res)
      toast.success(res.ok ? d.testOk : d.testFail)
    },
    onError: (e) => toast.error(e instanceof ClientHttpError ? e.message : d.toastError),
  })

  const applyFormPatch = (patch: Partial<WebhookCreateFormState>) => {
    setCreateForm((prev) => ({ ...prev, ...patch }))
  }

  return (
    <div className="grid gap-4 px-4 lg:px-6">
      <TemplateSelector dict={d} onApply={applyFormPatch} />
      <WebhookScenarios dict={d} onApply={applyFormPatch} />
      <WebhookSignatureValidator dict={d} />

      <WebhookForm
        dict={d}
        form={createForm}
        onChange={setCreateForm}
        secretFlash={secretFlash}
        isSubmitting={createMutation.isPending}
        onSubmit={() => createMutation.mutate()}
      />

      <WebhookListFilters
        dict={d}
        searchUrl={searchUrl}
        onSearchUrlChange={setSearchUrl}
        filterEvent={filterEvent}
        onFilterEventChange={setFilterEvent}
      />

      <WebhookList
        dict={d}
        lang={lang}
        items={filteredItems}
        empty={globallyEmpty}
        filterEmpty={filterEmpty}
        openDeliveriesId={openDeliveries}
        onToggleDeliveries={setOpenDeliveries}
        deliveries={deliveriesQuery.data}
        deliveriesLoading={deliveriesQuery.isFetching}
        onDelete={(id) => deleteMutation.mutate(id)}
        onToggleActive={(w, next) => {
          setToggleActivePendingId(w.id)
          patchMutation.mutate(
            { id: w.id, body: { isActive: next } },
            {
              onSettled: () => setToggleActivePendingId(null),
            },
          )
        }}
        onEdit={(w) => {
          setEditingWebhook(w)
          setEditOpen(true)
        }}
        onTest={(w) => {
          setTestingWebhook(w)
          setTestOpen(true)
        }}
        onDeliveryOpenDetail={(del) => {
          setDetailDelivery(del)
          setDetailOpen(true)
        }}
        toggleActivePendingId={toggleActivePendingId}
      />

      {editingWebhook ? (
        <WebhookEditDialog
          key={editingWebhook.id}
          dict={d}
          webhook={editingWebhook}
          open={editOpen}
          onOpenChange={(o) => {
            setEditOpen(o)
            if (!o) setEditingWebhook(null)
          }}
          isPending={patchMutation.isPending}
          onSave={(id, body) => patchMutation.mutate({ id, body })}
        />
      ) : null}

      {testingWebhook ? (
        <TestWebhookDialog
          key={testingWebhook.id}
          dict={d}
          open={testOpen}
          onOpenChange={(o) => {
            setTestOpen(o)
            if (!o) {
              setTestingWebhook(null)
              setTestResult(null)
            }
          }}
          defaultEvent={testingWebhook.events[0] ?? "execution.completed"}
          isPending={testMutation.isPending}
          onRun={(event, payload) => {
            setTestResult(null)
            testMutation.mutate({ id: testingWebhook.id, event, payload })
          }}
          invalidPayloadMessage={d.invalidPayloadJson}
          result={testResult}
        />
      ) : null}

      <DeliveryDetailsDialog
        dict={d}
        delivery={detailDelivery}
        open={detailOpen}
        onOpenChange={(o) => {
          setDetailOpen(o)
          if (!o) setDetailDelivery(null)
        }}
      />
    </div>
  )
}
