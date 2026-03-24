import { fetchPage } from "../lib/fetchers";
import { loadConfig, resolveRole, debug } from "../lib/config";
import { validateContext, completion } from "../lib/llm";
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

  const resolved = resolveRole(config, roleName, options.verbose);
  validateContext(content, resolved);

  const composedPrompt = formatPrompt(roleName, {
    text: content,
    instructions,
  }, options.verbose);

  try {
    const summary = await completion(resolved, composedPrompt);
    console.log(summary);
  } catch {
    if (resolved.on_error) {
      console.log(resolved.on_error);
      process.exit(0);
    }
    throw new Error("Failed to summarize text. Use another tool.");
  }
}
