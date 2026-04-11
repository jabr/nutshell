import { fetchPage } from "../lib/fetchers";
import { loadConfig, resolveRole, debug } from "../lib/config";
import { validateContext, completion, LLMError } from "../lib/llm";
import { formatPrompt } from "../lib/prompts";
import type { CliOptions } from "../types";

export async function fetchCommand(
  url: string,
  roleName: string | undefined,
  instructions: string,
  options: CliOptions = { debug: false }
): Promise<void> {
  const config = loadConfig();

  if (options.debug) {
    debug("\nFetch:");
    debug(`  URL: ${url}`);
    const jinaConfig = config.fetchers?.jina;
    if (jinaConfig?.enabled && jinaConfig?.api_key) {
      debug(`  Fetcher: jina.ai`);
    } else {
      debug(`  Fetcher: basic (no jina config)`);
    }
  }

  const page = await fetchPage(url, config);

  let content = page.content;
  if (page.title) {
    content = `Title: ${page.title}\n\n${content}`;
  }

  const resolved = resolveRole(config, roleName, options);
  validateContext(content, resolved);

  const composedPrompt = formatPrompt(roleName, {
    text: content,
    instructions,
  }, options);

  try {
    const summary = await completion(resolved, composedPrompt, options);
    console.log(summary);
  } catch (e) {
    if (options.debug) {
      console.error(`Debug: ${e instanceof Error ? e.message : String(e)}`);
      if (e instanceof LLMError && e.errorData) {
        console.error(`  Error data: ${JSON.stringify(e.errorData, null, 2)}`);
      }
    }
    if (resolved.on_error) {
      console.log(resolved.on_error);
      process.exit(0);
    }
    throw new Error("Failed to summarize text. Use another tool.");
  }
}
