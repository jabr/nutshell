import { completion, validateContext, LLMError } from "../lib/llm";
import { loadConfig, resolveRole } from "../lib/config";
import { formatPrompt } from "../lib/prompts";

interface CliOptions {
  verbose: boolean;
}

export async function summarizeCommand(
  roleName: string | undefined,
  instructions: string,
  options: CliOptions = { verbose: false }
): Promise<void> {
  const config = loadConfig();
  const resolved = resolveRole(config, roleName);

  let input = "";

  if (process.stdin.isTTY) {
    throw new Error("No input provided. Pipe text to stdin or provide a URL.");
  }

  for await (const chunk of Bun.stdin.stream()) {
    input += new TextDecoder().decode(chunk);
  }

  input = input.trim();

  if (!input) {
    throw new Error("Empty input provided.");
  }

  validateContext(input, resolved);

  const composedPrompt = formatPrompt(roleName, {
    text: input,
    instructions,
  });

  if (options.verbose) {
    console.error("\n[VERBOSE] LLM Call:");
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
    console.error(`  Input tokens (est): ${Math.ceil(input.length / 4)}`);
    console.error("\n[VERBOSE] Composed Prompt:");
    console.error("---");
    console.error(composedPrompt);
    console.error("---\n");
  }

  const summary = await completion(resolved, composedPrompt);

  console.log(summary);
}
