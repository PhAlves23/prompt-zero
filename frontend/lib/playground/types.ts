import type { PlaygroundProviderOption } from "@/lib/api/types"

export type AdvancedSettingsValues = {
  provider: PlaygroundProviderOption | ""
  temperature: number
  maxTokens: number
  topP: number
  topK: number
}

export const DEFAULT_ADVANCED: AdvancedSettingsValues = {
  provider: "",
  temperature: 0.7,
  maxTokens: 512,
  topP: 0.95,
  topK: 40,
}
