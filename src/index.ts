#!/usr/bin/env bun

import { summarizeCommand } from "./commands/summarize";
import { fetchCommand } from "./commands/fetch";
import { rolesCommand } from "./commands/roles";
import { LLMError } from "./lib/llm";
import { PromptNotFoundError } from "./lib/prompts";
import type { CliOptions } from "./types";

function printUsage(fullHelp = false) {
  const lines = [
    "Usage:",
    "  nutshell [--debug] summarize[:role] [instructions]",
    "  echo \"text\" | nutshell [--debug] summarize[:role] [instructions]",
    "  nutshell [--debug] fetch[:role] <url> [instructions]",
    "  nutshell [--debug] roles",
    "  nutshell --help",
  ];
  if (fullHelp) {
    lines.push(
      "",
      "Options:",
      "  -d, --debug    Print debug info (URL, model, prompt, errors)",
      "",
      "Commands:",
      "  summarize (s)    Summarize text from stdin",
      "  fetch (f) <url>  Fetch URL and summarize",
      "  roles             List available roles",
      "",
      "Examples:",
      "  cat file.txt | nutshell s",
      "  cat file.txt | nutshell summarize:quick \"focus on numbers\"",
      "  nutshell --debug f https://example.com",
      "  nutshell fetch:local https://example.com",
      "  nutshell roles"
    );
  }
  console.error(lines.join("\n"));
}

function parseArgs(args: string[]): {
  options: CliOptions;
  command: string;
  roleName: string | undefined;
  remainingArgs: string[];
} {
  const options: CliOptions = { debug: false };
  const remaining: string[] = [];

  for (const arg of args) {
    if (arg === "-d" || arg === "--debug") {
      options.debug = true;
    } else if (arg === "-h" || arg === "--help") {
      options.help = true;
    } else {
      remaining.push(arg);
    }
  }

  if (remaining.length === 0) {
    return { options, command: "", roleName: undefined, remainingArgs: [] };
  }

  const command = remaining[0];
  let roleName: string | undefined;
  let commandName = command;

  if (command.includes(":")) {
    const parts = command.split(":");
    commandName = parts[0];
    roleName = parts[1];
  }

  return {
    options,
    command: commandName,
    roleName,
    remainingArgs: remaining.slice(1),
  };
}

async function main() {
  const rawArgs = process.argv.slice(2);

  if (rawArgs.length === 0) {
    printUsage(false);
    process.exit(1);
  }

  const { options, command, roleName, remainingArgs } = parseArgs(rawArgs);

  if (command === "" || command === "help") {
    console.error("Nutshell - LLM Summarization CLI");
    printUsage(true);
    process.exit(0);
  }

  try {
    const cmd = command === "s" ? "summarize" : command === "f" ? "fetch" : command;

    if (cmd === "summarize") {
      let instructions = "";

      if (remainingArgs.length > 0 && !remainingArgs[0].startsWith("-")) {
        instructions = remainingArgs.join(" ");
      }

      await summarizeCommand(roleName, instructions, options);
    } else if (cmd === "fetch") {
      const url = remainingArgs[0];

      if (!url) {
        throw new Error("URL required for fetch command");
      }

      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        throw new Error("Invalid URL: must start with http:// or https://");
      }

      const instructions = remainingArgs.slice(1).join(" ");

      await fetchCommand(url, roleName, instructions, options);
    } else if (command === "roles") {
      await rolesCommand(options);
    } else {
      throw new Error(`Unknown command: ${command}`);
    }
  } catch (e) {
    if (e instanceof LLMError) {
      console.error(`Error: ${e.message}`);
      if (options.debug && e.errorData) {
        console.error(`  Error data: ${JSON.stringify(e.errorData, null, 2)}`);
      }
      if (e.statusCode) {
        process.exit(e.statusCode >= 500 ? 1 : 0);
      }
      process.exit(1);
    }

    if (e instanceof PromptNotFoundError) {
      console.error(`Error: ${e.message}`);
      console.error(`\nCreate a prompt file at ~/.config/nutshell/prompts/` +
        (roleName ? `${roleName}.md` : "default.md"));
      process.exit(1);
    }

    if (e instanceof Error) {
      console.error(`Error: ${e.message}`);
    } else {
      console.error("An unknown error occurred");
    }
    process.exit(1);
  }
}

main();
