"use client"

import { useState } from "react"
import type { PlaygroundProviderOption } from "@/lib/api/types"
import type { AdvancedSettingsValues } from "@/lib/playground/types"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowDown01Icon, ArrowUp01Icon } from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"

const PROVIDERS: { value: PlaygroundProviderOption; label: string }[] = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "google", label: "Google" },
  { value: "openrouter", label: "OpenRouter" },
]

type AdvancedSettingsProps = {
  values: AdvancedSettingsValues
  onChange: (next: AdvancedSettingsValues) => void
  disabled?: boolean
  labels: {
    trigger: string
    provider: string
    providerAuto: string
    temperature: string
    maxTokens: string
    topP: string
    topK: string
  }
  /** Sufixo único para ids de inputs (ex.: índice da variante) */
  idSuffix: string
}

export function AdvancedSettings({ values, onChange, disabled, labels, idSuffix }: AdvancedSettingsProps) {
  const [open, setOpen] = useState(false)
  return (
    <Collapsible open={open} onOpenChange={setOpen} disabled={disabled}>
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn("w-full justify-between", disabled && "pointer-events-none opacity-50")}
          disabled={disabled}
        >
          <span>{labels.trigger}</span>
          <HugeiconsIcon icon={open ? ArrowUp01Icon : ArrowDown01Icon} className="size-4" strokeWidth={2} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3 grid gap-4 border-t pt-3">
        <div className="grid gap-2">
          <Label>{labels.provider}</Label>
          <Select
            value={values.provider || "auto"}
            onValueChange={(v) =>
              onChange({
                ...values,
                provider: v === "auto" ? "" : (v as PlaygroundProviderOption),
              })
            }
            disabled={disabled}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={labels.providerAuto} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">{labels.providerAuto}</SelectItem>
              {PROVIDERS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <div className="flex justify-between text-sm">
            <Label>{labels.temperature}</Label>
            <span className="text-muted-foreground">{values.temperature.toFixed(2)}</span>
          </div>
          <Slider
            min={0}
            max={200}
            step={1}
            disabled={disabled}
            value={[Math.round(values.temperature * 100)]}
            onValueChange={([v]) => onChange({ ...values, temperature: v / 100 })}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor={`pg-max-${idSuffix}`}>{labels.maxTokens}</Label>
          <Input
            id={`pg-max-${idSuffix}`}
            type="number"
            min={1}
            max={4000}
            value={values.maxTokens}
            disabled={disabled}
            onChange={(e) => {
              const n = Number(e.target.value)
              if (!Number.isFinite(n)) return
              onChange({ ...values, maxTokens: Math.min(4000, Math.max(1, Math.round(n))) })
            }}
          />
        </div>

        <div className="grid gap-2">
          <div className="flex justify-between text-sm">
            <Label>{labels.topP}</Label>
            <span className="text-muted-foreground">{values.topP.toFixed(2)}</span>
          </div>
          <Slider
            min={0}
            max={100}
            step={1}
            disabled={disabled}
            value={[Math.round(values.topP * 100)]}
            onValueChange={([v]) => onChange({ ...values, topP: v / 100 })}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor={`pg-topk-${idSuffix}`}>{labels.topK}</Label>
          <Input
            id={`pg-topk-${idSuffix}`}
            type="number"
            min={1}
            max={200}
            value={values.topK}
            disabled={disabled}
            onChange={(e) => {
              const n = Number(e.target.value)
              if (!Number.isFinite(n)) return
              onChange({ ...values, topK: Math.min(200, Math.max(1, Math.round(n))) })
            }}
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
