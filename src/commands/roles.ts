import { loadConfig } from "../lib/config";
import { existsSync } from "fs";
import { resolve } from "path";
import { homedir } from "os";
import type { CliOptions } from "../types";

const PROMPTS_DIR = resolve(homedir(), ".config", "nutshell", "prompts");

export async function rolesCommand(options: CliOptions): Promise<void> {
  const config = loadConfig();
  const roles = Object.entries(config.role);

  const defaultRole = roles.find(([name]) => name === "default");
  const otherRoles = roles.filter(([name]) => name !== "default");
  const ordered = defaultRole ? [defaultRole, ...otherRoles] : otherRoles;

  for (const [name, role] of ordered) {
    const provider = config.provider[role.uses];
    const model = provider ? provider.model : "?";
    const hasPrompt = existsSync(resolve(PROMPTS_DIR, `${name}.md`));
    let flags = "";
    if (name === "default") {
      flags = "\t\t*";
    } else if (hasPrompt) {
      flags = "\t\t(custom prompt)";
    }
    console.log(`${name}\t${role.uses}/${model}${flags}`);
  }
}
