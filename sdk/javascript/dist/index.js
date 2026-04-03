export class PromptZero {
    baseUrl;
    apiKey;
    constructor(options) {
        this.baseUrl = options.baseUrl.replace(/\/+$/, "");
        this.apiKey = options.apiKey;
    }
    async request(path, init) {
        const url = `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
        const response = await fetch(url, {
            ...init,
            headers: {
                "content-type": "application/json",
                "X-PromptZero-Api-Key": this.apiKey,
                ...(init?.headers ?? {}),
            },
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`PromptZero ${response.status}: ${text}`);
        }
        return response.json();
    }
    prompts = {
        execute: (promptId, input = {}) => this.request(`/public/prompts/${promptId}/execute`, {
            method: "POST",
            body: JSON.stringify(input),
        }),
    };
}
