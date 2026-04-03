"use client"

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import { Label } from "@/components/ui/label"
import { PLAYGROUND_MODEL_ITEMS_FLAT } from "@/lib/playground/models-catalog"

type ModelComboboxProps = {
  id?: string
  label: string
  value: string
  onChange: (model: string) => void
  disabled?: boolean
  placeholder?: string
  emptyLabel: string
}

export function ModelCombobox({
  id,
  label,
  value,
  onChange,
  disabled,
  placeholder,
  emptyLabel,
}: ModelComboboxProps) {
  const isListed = PLAYGROUND_MODEL_ITEMS_FLAT.includes(value)

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Combobox
        items={PLAYGROUND_MODEL_ITEMS_FLAT}
        value={isListed ? value : null}
        onValueChange={(v) => {
          if (v != null) onChange(String(v))
        }}
        inputValue={value}
        onInputValueChange={(v) => onChange(v)}
        disabled={disabled}
        autoHighlight
      >
        <ComboboxInput id={id} placeholder={placeholder} disabled={disabled} />
        <ComboboxContent>
          <ComboboxEmpty>{emptyLabel}</ComboboxEmpty>
          <ComboboxList className="max-h-60">
            {(item: string) => (
              <ComboboxItem key={item} value={item}>
                {item}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  )
}
