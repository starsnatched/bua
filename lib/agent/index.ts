import { type AdbConfig } from "./adb-client";
import { LlmClient } from "./llm";
import { getConfig } from "./config";
import { getAdbClient, getScreenshotForAgent } from "./adb-singleton";
import type { AdbClient } from "./adb-client";

export interface AgentConfig {
  adb: AdbConfig;
  model?: string;
  actionDelay?: number;
}

let agentInstance: Agent | null = null;

export class Agent {
  private adb: AdbClient | null = null;
  private llm: LlmClient | null = null;
  private config: AgentConfig;
  private running = false;
  private iteration = 0;

  constructor(config: AgentConfig) {
    this.config = config;
  }

  async start(): Promise<void> {
    if (this.running) return;

    console.log("[Agent] Connecting to ADB...");
    this.adb = await getAdbClient();
    console.log("[Agent] Connected");

    this.llm = new LlmClient(this.config.model ?? "bua");
    this.running = true;

    this.loop();
  }

  private async loop(): Promise<void> {
    while (this.running) {
      this.iteration++;

      try {
        const screenshot = await getScreenshotForAgent();
        console.log(`[Agent] Iteration ${this.iteration} - requesting actions`);

        const response = await this.llm!.infer(screenshot);
        console.log(`[Agent] Received ${response.length} action(s)`);

        for (const action of response) {
          console.log(`[Agent] Executing: ${action.type}`, JSON.stringify(action));
          await this.adb!.execute(action);
          await this.sleep(this.config.actionDelay ?? 50);
        }

        await this.sleep(500);
      } catch (err) {
        console.error("[Agent] Error:", err);
        await this.sleep(2000);

        if (!this.adb?.isConnected()) {
          console.log("[Agent] Reconnecting...");
          try {
            this.adb = await getAdbClient();
            this.llm?.reset();
          } catch (reconnectErr) {
            console.error("[Agent] Reconnect failed:", reconnectErr);
            await this.sleep(5000);
          }
        }
      }
    }
  }

  stop(): void {
    this.running = false;
    console.log("[Agent] Stopped");
  }

  isRunning(): boolean {
    return this.running;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}

export async function startAgent(config?: Partial<AgentConfig>): Promise<Agent> {
  if (agentInstance?.isRunning()) {
    return agentInstance;
  }

  const appConfig = getConfig();

  agentInstance = new Agent({
    adb: {
      containerName: config?.adb?.containerName ?? process.env.ANDROID_CONTAINER ?? "bua-android-tablet",
      targetWidth: config?.adb?.targetWidth ?? parseInt(process.env.TARGET_WIDTH ?? "1000", 10),
      targetHeight: config?.adb?.targetHeight ?? parseInt(process.env.TARGET_HEIGHT ?? "1000", 10),
      displayDensity: config?.adb?.displayDensity ?? parseInt(process.env.DISPLAY_DENSITY ?? "200", 10),
    },
    model: config?.model ?? process.env.LLM_MODEL ?? appConfig.llm.model,
    actionDelay: config?.actionDelay ?? appConfig.agent.actionDelay,
  });

  await agentInstance.start();
  return agentInstance;
}

export function stopAgent(): void {
  agentInstance?.stop();
  agentInstance = null;
}

export function getAgent(): Agent | null {
  return agentInstance;
}

export * from "./schema";
export * from "./adb-client";
export * from "./llm";
export * from "./config";
