"use client"

import { useQuery } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import { Label } from "@/components/ui/label"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { bffFetch } from "@/lib/api/client"
import type { PaginatedResult, Prompt } from "@/lib/api/types"

type PromptSelectorProps = {
  promptId: string
  onPromptChange: (id: string, title: string) => void
  disabled?: boolean
  labels: {
    field: string
    placeholder: string
    empty: string
    loading: string
  }
}

function mergePromptLists(current: Prompt[], extra: Prompt | undefined): Prompt[] {
  if (!extra) return current
  if (current.some((p) => p.id === extra.id)) return current
  return [extra, ...current]
}

export function PromptSelector({
  promptId,
  onPromptChange,
  disabled,
  labels,
}: PromptSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearch = useDebouncedValue(searchQuery, 300)

  const { data: listData, isFetching: listLoading } = useQuery({
    queryKey: ["playground-prompts", debouncedSearch],
    queryFn: () =>
      bffFetch<PaginatedResult<Prompt>>(
        `/prompts?page=1&limit=20&search=${encodeURIComponent(debouncedSearch.trim())}`,
      ),
  })

  const { data: selectedDetail } = useQuery({
    queryKey: ["prompt", promptId],
    queryFn: () => bffFetch<Prompt>(`/prompts/${promptId}`),
    enabled: Boolean(promptId),
  })

  const items = useMemo(() => mergePromptLists(listData?.data ?? [], selectedDetail), [listData?.data, selectedDetail])

  const selected = items.find((p) => p.id === promptId) ?? null

  return (
    <div className="grid gap-2">
      <Label>{labels.field}</Label>
      <Combobox
        items={items}
        value={selected}
        onValueChange={(p) => {
          if (p) {
            onPromptChange(p.id, p.title)
            setSearchQuery("")
          } else {
            onPromptChange("", "")
            setSearchQuery("")
          }
        }}
        onInputValueChange={(v) => setSearchQuery(v)}
        disabled={disabled}
        autoHighlight
        isItemEqualToValue={(a, b) => a.id === b.id}
        itemToStringLabel={(p) => p.title}
        itemToStringValue={(p) => p.id}
      >
        <ComboboxInput placeholder={labels.placeholder} disabled={disabled} />
        <ComboboxContent>
          <ComboboxEmpty>{listLoading ? labels.loading : labels.empty}</ComboboxEmpty>
          <ComboboxList className="max-h-60">
            {(item: Prompt) => (
              <ComboboxItem key={item.id} value={item}>
                <span className="truncate font-medium">{item.title}</span>
                <span className="text-muted-foreground block truncate text-xs">{item.id}</span>
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  )
}
