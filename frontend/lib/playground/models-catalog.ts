/** Grupos para exibição; lista plana para o Combobox. */
export type PlaygroundModelGroup = {
  /** Rótulo do grupo (ex.: provedor) */
  label: string
  models: string[]
}

export const PLAYGROUND_MODEL_GROUPS: PlaygroundModelGroup[] = [
  {
    label: "OpenAI",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
  },
  {
    label: "Anthropic",
    models: [
      "claude-3-5-sonnet-20241022",
      "claude-3-opus-20240229",
      "claude-3-haiku-20240307",
    ],
  },
  {
    label: "Google",
    models: ["gemini-2.0-flash-exp", "gemini-1.5-pro", "gemini-1.5-flash"],
  },
  {
    label: "OpenRouter",
    models: [
      "anthropic/claude-3.5-sonnet",
      "meta-llama/llama-3.3-70b-instruct",
      "google/gemini-pro-1.5",
    ],
  },
]

export const PLAYGROUND_MODEL_ITEMS_FLAT: string[] = PLAYGROUND_MODEL_GROUPS.flatMap((g) => g.models)
