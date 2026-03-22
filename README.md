# Nutshell CLI

A simple, configurable CLI for summarizing (local or fetched) text using OpenAI-compatible LLM endpoints.

## Examples

### Summarize text

```bash
journalctl -u nginx --since "1 hour ago" | nutshell summarize
```

**Output:**
> Nginx service issues: Multiple upstream connection failures to 10.0.0.5:8080 detected at 14:23 and 14:47. Occasional 502 errors on /api endpoints. Recommend checking backend service health on port 8080.

### Summarize with instructions

```bash
cat report.txt | nutshell summarize "Focus on action items and deadlines"
```

**Output:**
> Key action items: Finalize budget allocation by Oct 15, schedule user testing sessions for Nov 1-10, and prepare launch presentation for Dec 1 board meeting.

### Fetch and summarize a URL

```bash
nutshell fetch https://example.com/article
```

### Fetch with role and custom instructions

```bash
nutshell fetch:local https://research-paper.com/ml-analysis "Extract any statistical claims and their sources"
```

**Output:**
> Key findings: Model accuracy improved by 23% (p<0.01) using transfer learning approach. Source: Stanford AI Lab benchmarks (2024).

## Installation

```bash
bun install
bun link  # or: npm install -g
```

## Configuration

All config lives in `~/.config/nutshell/config.toml`.

### Quick Setup

1. Copy `samples/config.toml` to `~/.config/nutshell/config.toml` and update with your API keys
2. Create prompt template at `~/.config/nutshell/prompts/default.md`

### Config Structure

Config is split into **providers** (LLM endpoint configs) and **roles** (which provider to use + optional overrides).

```toml
[provider.openai]
api_key = "sk-..."
base_url = "https://api.openai.com/v1"
max_context = 128000
model = "gpt-4"
temperature = 0.7
top_p = 1.0
top_k = 50
presence_penalty = 0.0
frequency_penalty = 0.0

[provider.openrouter]
api_key = "your-openrouter-api-key"
base_url = "https://openrouter.ai/api/v1"
max_context = 128000
model = "anthropic/claude-3.5-sonnet"
provider = { sort = "throughput" }

[provider.ollama-fast]
api_key = "ollama"
base_url = "http://localhost:11434/v1"
max_context = 8192
model = "llama2"
chat_template_kwargs = { enable_thinking = false }

[role.default]
uses = "openai"

[role.quick]
uses = "openrouter"

[role.local]
uses = "ollama-fast"

[role.openrouter-latency]
uses = "openrouter"
options = { provider = { sort = "latency" } }

[fetchers.jina]
enabled = false
api_key = ""
```

### Provider Fields

| Field | Type | Description |
|-------|------|-------------|
| `api_key` | string | API key for authentication |
| `base_url` | string | API endpoint base URL |
| `max_context` | number | Maximum context window in tokens |
| `model` | string | Model name |
| `temperature` | number | Sampling temperature |
| `top_p` | number | Top-p sampling |
| `top_k` | number | Top-k sampling |
| `presence_penalty` | number | Presence penalty |
| `frequency_penalty` | number | Frequency penalty |
| `chat_template_kwargs` | table | Model-specific params (e.g., `{ enable_thinking = true }`) |
| `provider` | table | API provider params (e.g., `{ sort = "throughput" }` for OpenRouter) |

### Role Fields

| Field | Type | Description |
|-------|------|-------------|
| `uses` | string | **Required.** Provider name to use |
| `options` | table | Optional overrides (see below) |

### Role Options

Role options override parameters from the referenced provider:

| Field | Type | Description |
|-------|------|-------------|
| `temperature` | number | Override provider's temperature |
| `top_p` | number | Override provider's top_p |
| `top_k` | number | Override provider's top_k |
| `presence_penalty` | number | Override provider's presence_penalty |
| `frequency_penalty` | number | Override provider's frequency_penalty |
| `chat_template_kwargs` | table | Override provider's chat_template_kwargs |
| `provider` | table | Override provider's provider params |

### Web Fetching

By default, uses basic HTML fetching. Enable Jina AI for better extraction:

```toml
[fetchers.jina]
enabled = true
api_key = "your-jina-api-key"
```

## Prompt Templates

Prompts are file-based and live in `~/.config/nutshell/prompts/`. The `default.md` file is required.

```
~/.config/nutshell/prompts/
  default.md    # Required
  quick.md      # Optional
  local.md      # Optional
```

### Template Variables

| Variable | Description |
|----------|-------------|
| `{text}` | The text to summarize |
| `{instructions}` | Plain instructions replacement |
| `{instructions:" prefix "}` | Instructions with conditional prefix |

**Conditional prefix example:**
```
Summarize the following text concisely.{instructions:" You must follow these instructions: "}

Text:
{text}
```

- With instructions `"write a poem"` → `Summarize the following text concisely. You must follow these instructions: write a poem`
- With no instructions → `Summarize the following text concisely.`

### Prompt Resolution

1. `summarize:quick` looks for `quick.md` first
2. Falls back to `default.md` if role-specific file not found
3. Throws error if `default.md` doesn't exist

## Usage

```
nutshell [--verbose] <command>[:<role>] ["instructions"]

Commands:
  summarize[:<role>]    Summarize text from stdin
  fetch[:<role>] <url>  Fetch URL and summarize

Options:
  -v, --verbose    Print debug info to stderr (role, provider, endpoint, model, params, composed prompt)
```

### Verbose Output

With `--verbose`, debug info is printed to stderr including:
- Role and provider used
- LLM endpoint and model
- Temperature, top_p, top_k, max_context
- Any chat_template_kwargs or provider options
- The composed prompt before sending

Example:
```bash
nutshell --verbose summarize:deep "Identify risks" < document.txt
```
Outputs the summary to stdout and debug info to stderr.

## Error Handling

- **Context overflow**: Error if input exceeds role's `max_context`
- **Missing config**: Clear error pointing to expected config path
- **Missing prompt**: Error with path that needs to be created
- **API errors**: Forwarded LLM error message and status code
