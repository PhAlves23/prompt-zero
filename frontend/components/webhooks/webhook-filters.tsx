"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Dictionary } from "@/app/[lang]/dictionaries"
import { WEBHOOK_EVENTS } from "@/lib/webhooks/events"

type Dict = Dictionary["webhooksPage"]

type Props = {
  dict: Dict
  searchUrl: string
  onSearchUrlChange: (v: string) => void
  filterEvent: string
  onFilterEventChange: (v: string) => void
}

export function WebhookListFilters({
  dict,
  searchUrl,
  onSearchUrlChange,
  filterEvent,
  onFilterEventChange,
}: Props) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="grid flex-1 gap-2 min-w-[200px]">
        <Label>{dict.filterUrl}</Label>
        <Input
          value={searchUrl}
          onChange={(e) => onSearchUrlChange(e.target.value)}
          placeholder={dict.filterUrlPlaceholder}
        />
      </div>
      <div className="grid gap-2 w-full sm:w-64">
        <Label>{dict.filterEvent}</Label>
        <Select value={filterEvent} onValueChange={onFilterEventChange}>
          <SelectTrigger>
            <SelectValue placeholder={dict.filterEventAll} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{dict.filterEventAll}</SelectItem>
            {WEBHOOK_EVENTS.map((ev) => (
              <SelectItem key={ev} value={ev}>
                {ev}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
