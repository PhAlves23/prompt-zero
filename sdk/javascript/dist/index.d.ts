export type PromptZeroClientOptions = {
    /** e.g. https://api.example.com/api/v1 */
    baseUrl: string;
    apiKey: string;
};
export type ExecutePromptInput = {
    variables?: Record<string, string>;
    model?: string;
    temperature?: number;
    maxTokens?: number;
};
export declare class PromptZero {
    private readonly baseUrl;
    private readonly apiKey;
    constructor(options: PromptZeroClientOptions);
    private request;
    prompts: {
        execute: (promptId: string, input?: ExecutePromptInput) => Promise<unknown>;
    };
}
