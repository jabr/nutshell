export interface LLMParameters {
  temperature?: number;
  top_p?: number;
  top_k?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  chat_template_kwargs?: Record<string, unknown>;
  provider?: Record<string, unknown>;
}

export interface LLMConfig extends LLMParameters {
  api_key: string;
  base_url: string;
  max_context: number;
  model: string;
}

export interface RoleConfig {
  uses: string;
  options?: LLMParameters;
  on_overflow?: string;
  on_error?: string;
}

export interface FetcherConfig {
  enabled: boolean;
  api_key: string;
}

export interface Config {
  provider: Record<string, LLMConfig>;
  role: Record<string, RoleConfig>;
  fetchers?: {
    jina?: FetcherConfig;
  };
}

export interface ResolvedConfig extends LLMConfig {
  name: string;
  on_overflow?: string;
  on_error?: string;
}
