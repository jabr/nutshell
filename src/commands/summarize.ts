import { completion, validateContext, LLMError } from "../lib/llm";
import { loadConfig, resolveRole } from "../lib/config";
import { formatPrompt } from "../lib/prompts";
import type { CliOptions } from "../types";

export async function summarizeCommand(
  roleName: string | undefined,
  instructions: string,
  options: CliOptions = { debug: false }
): Promise<void> {
  const config = loadConfig();

  if (process.stdin.isTTY) {
    throw new Error("No input provided. Pipe text to stdin or provide a URL.");
  }

  let input = "";
  for await (const chunk of Bun.stdin.stream()) {
    input += new TextDecoder().decode(chunk);
  }

  input = input.trim();
  if (!input) {
    throw new Error("Empty input provided.");
  }

  const resolved = resolveRole(config, roleName, options);
  validateContext(input, resolved);

  const composedPrompt = formatPrompt(roleName, {
    text: input,
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
