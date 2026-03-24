import { completion, validateContext } from "../lib/llm";
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

  const resolved = resolveRole(config, roleName, options.verbose);
  validateContext(input, resolved);

  const composedPrompt = formatPrompt(roleName, {
    text: input,
    instructions,
  }, options.verbose);

  const summary = await completion(resolved, composedPrompt);

  console.log(summary);
}
