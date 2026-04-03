export type PromptZeroClientOptions = {
  /** e.g. https://api.example.com/api/v1 */
  baseUrl: string
  apiKey: string
}

export type ExecutePromptInput = {
  variables?: Record<string, string>
  model?: string
  temperature?: number
  maxTokens?: number
}

export class PromptZero {
  private readonly baseUrl: string
  private readonly apiKey: string

  constructor(options: PromptZeroClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "")
    this.apiKey = options.apiKey
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`
    const response = await fetch(url, {
      ...init,
      headers: {
        "content-type": "application/json",
        "X-PromptZero-Api-Key": this.apiKey,
        ...(init?.headers ?? {}),
      },
    })
    if (!response.ok) {
      const text = await response.text()
      throw new Error(`PromptZero ${response.status}: ${text}`)
    }
    return response.json() as Promise<T>
  }

  prompts = {
    execute: (promptId: string, input: ExecutePromptInput = {}) =>
      this.request<unknown>(`/public/prompts/${promptId}/execute`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
  }
}
