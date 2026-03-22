import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { homedir } from "os";
import type { Config, ResolvedConfig, LLMConfig } from "../types";

const CONFIG_PATH = resolve(
  homedir(),
  ".config",
  "nutshell",
  "config.toml"
);

const requiredProviderFields: (keyof LLMConfig)[] = [
  "api_key",
  "base_url",
  "max_context",
  "model",
];

export function loadConfig(): Config {
  if (!existsSync(CONFIG_PATH)) {
    throw new Error(
      `Config not found at ${CONFIG_PATH}\n` +
        `Create it with your LLM API settings.`
    );
  }

  const content = readFileSync(CONFIG_PATH, "utf-8");

  const config = Bun.TOML.parse(content) as Config;

  if (!config.provider) {
    throw new Error("Missing [provider] section in config");
  }

  for (const [providerName, provider] of Object.entries(config.provider)) {
    for (const key of requiredProviderFields) {
      if (provider[key] === undefined || provider[key] === null) {
        throw new Error(
          `Missing required field [provider.${providerName}].${key} in config`
        );
      }
    }
  }

  if (!config.role) {
    throw new Error("Missing [role] section in config");
  }

  for (const [roleName, role] of Object.entries(config.role)) {
    if (!role.uses) {
      throw new Error(
        `Missing required field [role.${roleName}].uses in config`
      );
    }
  }

  if (!config.fetchers) {
    config.fetchers = {};
  }

  return config;
}

export function resolveRole(
  config: Config,
  roleName?: string
): ResolvedConfig {
  const targetRoleName = roleName || "default";
  const role = config.role[targetRoleName];

  if (!role) {
    throw new Error(`Role "${targetRoleName}" not found in config`);
  }

  const provider = config.provider[role.uses];

  if (!provider) {
    throw new Error(`Provider "${role.uses}" not found in config`);
  }

  const resolved: ResolvedConfig = {
    ...provider,
    name: targetRoleName,
    ...role.options,
  };

  return resolved;
}

export function resolveFetcher(
  config: Config,
  fetcherName: string
): { enabled: boolean; api_key: string } | null {
  const fetcher = config.fetchers?.[fetcherName as keyof typeof config.fetchers];
  if (!fetcher) return null;
  return {
    enabled: fetcher.enabled ?? false,
    api_key: fetcher.api_key ?? "",
  };
}
