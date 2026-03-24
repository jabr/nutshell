# Nutshell Development Guide

## Project Structure

```
nutshell/
├── src/
│   ├── index.ts          # CLI entry point, argument parsing
│   ├── commands/
│   │   ├── summarize.ts  # Summarize command implementation
│   │   └── fetch.ts      # Fetch + summarize command
│   ├── lib/
│   │   ├── config.ts     # TOML config loading and validation
│   │   ├── llm.ts        # OpenAI-compatible API client
│   │   ├── fetchers/
│   │   │   ├── index.ts  # Fetcher registry
│   │   │   └── jina.ts   # Jina AI fetcher
│   │   └── prompts.ts    # Prompt loading and formatting
│   └── types.ts          # TypeScript interfaces
├── samples/
│   ├── config.toml       # Sample configuration
│   └── prompts/           # Sample prompt templates
├── package.json
└── tsconfig.json
```

## Setup

```bash
bun install
```

## Running

```bash
# Run directly
bun ./src/index.ts --help

# Run with config from non-default location (for testing)
HOME=/tmp/test-home bun ./src/index.ts summarize
```

## Building

```bash
bun build --bun --target=bun src/index.ts --outdir=dist
```

Or link for global use:
```bash
bun link
```

## Config Loading

Config is loaded from `~/.config/nutshell/config.toml` via `loadConfig()` in `lib/config.ts`.

The config is parsed into two main sections:
- `[provider.*]` - LLM endpoint configurations
- `[role.*]` - Role definitions that reference providers

Each role must specify a `uses` field pointing to a provider name, and optionally an `options` table with parameter overrides.

## Prompt System

Prompts are loaded from `~/.config/nutshell/prompts/`:
- `loadPrompt(roleName)` - loads the appropriate prompt file
- `formatPrompt(roleName, { text, instructions })` - replaces template variables

Template variables:
- `{text}` - replaced with input text
- `{instructions}` - replaced with instructions (can be empty)
- `{instructions:" prefix "}` - replaced with prefix+instructions if instructions provided, otherwise removed

## Adding a New Fetcher

1. Create a new fetcher file in `src/lib/fetchers/` (e.g., `firecrawl.ts`)
2. Export a function: `async function fetchWithX(url: string, apiKey: string): Promise<PageContent>`
3. Register in `src/lib/fetchers/index.ts`

```typescript
// src/lib/fetchers/firecrawl.ts
export interface PageContent {
  title?: string;
  content: string;
  url: string;
}

export async function fetchWithFirecrawl(
  url: string,
  apiKey: string
): Promise<PageContent> {
  // implementation
}
```

## Type Definitions

All types are defined in `src/types.ts`:

```typescript
interface LLMConfig {
  api_key: string;
  base_url: string;
  max_context: number;
  model: string;
  // ... other LLM params
  chat_template_kwargs?: Record<string, unknown>;
  provider?: Record<string, unknown>;
}

interface RoleConfig {
  uses: string;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    presence_penalty?: number;
    frequency_penalty?: number;
    chat_template_kwargs?: Record<string, unknown>;
    provider?: Record<string, unknown>;
  };
}

interface Config {
  provider: Record<string, LLMConfig>;
  role: Record<string, RoleConfig>;
  fetchers?: { jina?: FetcherConfig };
}
```

## Testing

Test manually by creating a test config:

```bash
mkdir -p ~/.config/nutshell
cp samples/config.toml ~/.config/nutshell/config.toml
# Edit with your API keys
cp -r samples/prompts/* ~/.config/nutshell/prompts/

echo "test text" | bun ./src/index.ts summarize
```

## Key Implementation Details

### Config Resolution

`resolveRole(config, roleName)` merges a role's config with its referenced provider:
1. Start with provider's full config
2. Spread role's `options` on top to override

### Context Validation

Before sending to LLM, `validateContext()` estimates token count (text.length / 4) and errors if it exceeds `max_context`.

### LLM API Calls

`completion(config, composedPrompt)` sends a chat completion request to `${config.base_url}/chat/completions`.

### Error Handling

Custom error classes:
- `LLMError` - API errors with optional status code
- `PromptNotFoundError` - Missing prompt files

## Adding New LLM Parameters

1. Add to `LLMConfig` in `types.ts`
2. Add to `requiredProviderFields` in `config.ts` if required
3. Add to `ChatRequest` interface in `llm.ts`
4. Add to body object in `completion()` function
5. Update verbose output in commands if needed
