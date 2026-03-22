import { fetchPage } from "../lib/fetchers";
import { loadConfig, resolveRole } from "../lib/config";
import { validateContext, LLMError, completion } from "../lib/llm";
import { formatPrompt } from "../lib/prompts";

interface CliOptions {
  verbose: boolean;
}

export async function fetchCommand(
  url: string,
  roleName: string | undefined,
  instructions: string,
  options: CliOptions = { verbose: false }
): Promise<void> {
  const config = loadConfig();

  if (options.verbose) {
    console.error("\n[VERBOSE] Fetch:");
    console.error(`  URL: ${url}`);
    const jinaConfig = config.fetchers?.jina;
    if (jinaConfig?.enabled && jinaConfig?.api_key) {
      console.error(`  Fetcher: jina.ai`);
    } else {
      console.error(`  Fetcher: basic (no jina config)`);
    }
    console.error("");
  }

  const page = await fetchPage(url, config);

  let content = page.content;
  if (page.title) {
    content = `Title: ${page.title}\n\n${content}`;
  }

  const resolved = resolveRole(config, roleName);
  validateContext(content, resolved);

  const composedPrompt = formatPrompt(roleName, {
    text: content,
    instructions,
  });

  if (options.verbose) {
    console.error("[VERBOSE] LLM Call:");
    console.error(`  Role: ${roleName || "default"}`);
    console.error(`  Provider: ${config.role[roleName || "default"]?.uses}`);
    console.error(`  Endpoint: ${resolved.base_url}/chat/completions`);
    console.error(`  Model: ${resolved.model}`);
    console.error(`  Temperature: ${resolved.temperature}`);
    console.error(`  Top_p: ${resolved.top_p}`);
    console.error(`  Top_k: ${resolved.top_k}`);
    console.error(`  Max context: ${resolved.max_context}`);
    if (resolved.chat_template_kwargs) {
      console.error(`  chat_template_kwargs: ${JSON.stringify(resolved.chat_template_kwargs)}`);
    }
    if (resolved.provider) {
      console.error(`  provider: ${JSON.stringify(resolved.provider)}`);
    }
    console.error(`  Input tokens (est): ${Math.ceil(content.length / 4)}`);
    console.error("\n[VERBOSE] Composed Prompt:");
    console.error("---");
    console.error(composedPrompt);
    console.error("---\n");
  }

  const summary = await completion(resolved, composedPrompt);

  console.log(summary);
}
