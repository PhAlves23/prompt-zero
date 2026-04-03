"use client"

import { useCallback, useState } from "react"
import type { AdvancedSettingsValues } from "@/lib/playground/types"
import type { PlaygroundCompareResponse } from "@/lib/api/types"

const STORAGE_KEY = "promptzero-playground-history-v1"
const MAX_ENTRIES = 20

export type PlaygroundHistoryVariant = {
  model: string
  advanced: AdvancedSettingsValues
}

export type PlaygroundHistoryEntry = {
  id: string
  savedAt: string
  promptId: string
  promptTitle: string
  variables: Record<string, string>
  variants: PlaygroundHistoryVariant[]
  results: PlaygroundCompareResponse | null
}

function loadRaw(): PlaygroundHistoryEntry[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (e): e is PlaygroundHistoryEntry =>
        e &&
        typeof e === "object" &&
        typeof (e as PlaygroundHistoryEntry).id === "string" &&
        typeof (e as PlaygroundHistoryEntry).promptId === "string",
    )
  } catch {
    return []
  }
}

function saveRaw(entries: PlaygroundHistoryEntry[]) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    /* ignore quota */
  }
}

export function usePlaygroundHistory() {
  const [entries, setEntries] = useState<PlaygroundHistoryEntry[]>(() => loadRaw())

  const pushEntry = useCallback((entry: Omit<PlaygroundHistoryEntry, "id" | "savedAt">) => {
    const full: PlaygroundHistoryEntry = {
      ...entry,
      id: crypto.randomUUID(),
      savedAt: new Date().toISOString(),
    }
    setEntries((prev) => {
      const next = [full, ...prev].slice(0, MAX_ENTRIES)
      saveRaw(next)
      return next
    })
  }, [])

  const removeEntry = useCallback((id: string) => {
    setEntries((prev) => {
      const next = prev.filter((e) => e.id !== id)
      saveRaw(next)
      return next
    })
  }, [])

  const clearAll = useCallback(() => {
    setEntries([])
    saveRaw([])
  }, [])

  return { entries, pushEntry, removeEntry, clearAll }
}
