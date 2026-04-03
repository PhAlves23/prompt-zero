"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { PromptVariable } from "@/lib/api/types"

type VariablesFormProps = {
  variables: PromptVariable[]
  values: Record<string, string>
  onChange: (next: Record<string, string>) => void
  disabled?: boolean
  title: string
  requiredHint: string
}

export function PlaygroundVariablesForm({
  variables,
  values,
  onChange,
  disabled,
  title,
  requiredHint,
}: VariablesFormProps) {
  if (variables.length === 0) return null

  return (
    <div className="grid gap-3 rounded-lg border bg-muted/30 p-3">
      <p className="text-sm font-medium">{title}</p>
      <p className="text-muted-foreground text-xs">{requiredHint}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {variables.map((v) => (
          <div key={v.name} className="grid gap-1.5">
            <Label htmlFor={`pg-var-${v.name}`}>
              {v.name}
              {v.required ? <span className="text-destructive"> *</span> : null}
            </Label>
            <Input
              id={`pg-var-${v.name}`}
              value={values[v.name] ?? ""}
              disabled={disabled}
              placeholder={v.defaultValue ?? undefined}
              onChange={(e) => onChange({ ...values, [v.name]: e.target.value })}
            />
            {v.description ? <p className="text-muted-foreground text-xs">{v.description}</p> : null}
          </div>
        ))}
      </div>
    </div>
  )
}
