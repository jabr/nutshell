import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { homedir } from "os";

import { debug } from "./config";
import { estimateTokens } from "./llm";
import type { CliOptions } from "./types";

const PROMPTS_DIR = resolve(homedir(), ".config", "nutshell", "prompts");

export class PromptNotFoundError extends Error {
  constructor(path: string) {
    super(`Prompt not found at ${path}`);
    this.name = "PromptNotFoundError";
  }
}

export function loadPrompt(roleName?: string): string {
  const baseName = roleName || "default";
  const rolePromptPath = resolve(PROMPTS_DIR, `${baseName}.md`);
  const defaultPromptPath = resolve(PROMPTS_DIR, "default.md");

  if (existsSync(rolePromptPath)) {
    try {
      return readFileSync(rolePromptPath, "utf-8");
    } catch {
      throw new PromptNotFoundError(rolePromptPath);
    }
  }

  if (roleName && existsSync(defaultPromptPath)) {
    try {
      return readFileSync(defaultPromptPath, "utf-8");
    } catch {
      throw new PromptNotFoundError(defaultPromptPath);
    }
  }

  throw new PromptNotFoundError(
    roleName ? `${rolePromptPath} or ${defaultPromptPath}` : defaultPromptPath
  );
}

export function formatPrompt(
  roleName: string | undefined,
  params: { text: string; instructions?: string },
  options: CliOptions = { debug: false }
): string {
  const template = loadPrompt(roleName);
  const { text, instructions } = params;

  let result = template.replace(/\{text\}/g, text);

  result = result.replace(/\{instructions:"([^"]*)"\}/g, (_, prefix) => {
    return instructions ? `${prefix}${instructions}` : "";
  });

  result = result.replace(/\{instructions\}/g, instructions || "");

  if (options.debug) {
    debug(`  Input tokens (est): ${estimateTokens(result)}`);
    debug("\nComposed Prompt:");
    debug(">>>>>>>>");
    debug(result);
    debug("<<<<<<<<\n");
  }

  return result;
}
