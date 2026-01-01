import { readFileSync } from "fs";
import { join } from "path";
import type { VncConfig } from "./vnc-client";

export interface LlmConfig {
  model: string;
  temperature: number;
  num_ctx: number;
}

export interface AgentSettings {
  actionDelay: number;
  screenshotDelay: number;
}

export interface AppConfig {
  llm: LlmConfig;
  vnc: VncConfig;
  agent: AgentSettings;
}

let cachedConfig: AppConfig | null = null;

export function loadConfig(): AppConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const configPath = join(process.cwd(), "config.json");
  const raw = readFileSync(configPath, "utf-8");
  const parsed = JSON.parse(raw) as Partial<AppConfig>;

  cachedConfig = {
    llm: {
      model: parsed.llm?.model ?? "bua",
      temperature: parsed.llm?.temperature ?? 0.8,
      num_ctx: parsed.llm?.num_ctx ?? 256000,
    },
    vnc: {
      host: parsed.vnc?.host ?? "localhost",
      port: parsed.vnc?.port ?? 5900,
      password: parsed.vnc?.password,
    },
    agent: {
      actionDelay: parsed.agent?.actionDelay ?? 30,
      screenshotDelay: parsed.agent?.screenshotDelay ?? 300,
    },
  };

  return cachedConfig;
}

export function getConfig(): AppConfig {
  return loadConfig();
}

