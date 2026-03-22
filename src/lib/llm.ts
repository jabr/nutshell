import type { ResolvedConfig } from "../types";

interface ChatMessage {
  role: "user";
  content: string;
}

interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  temperature: number;
  top_p: number;
  top_k: number;
  presence_penalty: number;
  frequency_penalty: number;
  chat_template_kwargs?: Record<string, unknown>;
  provider?: Record<string, unknown>;
}

interface ChatResponse {
  choices: { message: { content: string } }[];
  error?: { message: string; code?: string };
}

export class LLMError extends Error {
  constructor(
    message: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = "LLMError";
  }
}

export async function completion(
  config: ResolvedConfig,
  template: string,
  text: string
): Promise<string> {
  const content = template
    .replace(/\{text\}/g, text)
    .replace(/\{instructions\}/g, text);

  const messages: ChatMessage[] = [{ role: "user", content }];

  const body: ChatRequest = {
    model: config.model,
    messages,
    temperature: config.temperature,
    top_p: config.top_p,
    top_k: config.top_k,
    presence_penalty: config.presence_penalty,
    frequency_penalty: config.frequency_penalty,
    ...(config.chat_template_kwargs && { chat_template_kwargs: config.chat_template_kwargs }),
    ...(config.provider && { provider: config.provider }),
  };

  const apiKey =
    config.api_key || process.env.OPENAI_API_KEY || "";

  const url = config.base_url.endsWith("/")
    ? `${config.base_url}chat/completions`
    : `${config.base_url}/chat/completions`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as ChatResponse;
    throw new LLMError(
      errorData?.error?.message || `API error: ${response.status}`,
      response.status
    );
  }

  const data = (await response.json()) as ChatResponse;

  if (data.error) {
    throw new LLMError(data.error.message);
  }

  const choice = data.choices?.[0]?.message?.content;
  if (!choice) {
    throw new LLMError("No response content from LLM");
  }

  return choice.trim();
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function validateContext(
  text: string,
  config: ResolvedConfig
): void {
  const tokens = estimateTokens(text);
  if (tokens > config.max_context) {
    throw new LLMError(
      `Input requires ~${tokens} tokens, but "${config.model}" ` +
        `has max context of ${config.max_context} tokens.\n` +
        `Hint: Reduce input size or use a role with larger context.`
    );
  }
}
