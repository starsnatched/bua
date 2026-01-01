import { VncClient, type VncConfig } from "./vnc-client";
import { LlmClient } from "./llm";
import { getConfig } from "./config";

export interface AgentConfig {
  vnc: VncConfig;
  model?: string;
  actionDelay?: number;
  screenshotDelay?: number;
}

let agentInstance: Agent | null = null;

export class Agent {
  private vnc: VncClient;
  private llm: LlmClient | null = null;
  private config: AgentConfig;
  private running = false;
  private iteration = 0;

  constructor(config: AgentConfig) {
    this.config = config;
    this.vnc = new VncClient(config.vnc);
  }

  async start(): Promise<void> {
    if (this.running) return;

    console.log("[Agent] Connecting to VNC...");
    await this.vnc.connect();
    console.log("[Agent] Connected");

    this.llm = new LlmClient(this.config.model ?? "bua");
    this.running = true;

    this.loop();
  }

  private async loop(): Promise<void> {
    while (this.running) {
      this.iteration++;

      try {
        await this.sleep(this.config.screenshotDelay ?? 300);
        const screenshot = await this.vnc.screenshot();

        console.log(`[Agent] Iteration ${this.iteration}`);

        const response = await this.llm!.infer(screenshot);

        for (const action of response.actions) {
          console.log(`[Agent] ${action.action}:`, JSON.stringify(action));
          await this.vnc.execute(action);
          await this.sleep(this.config.actionDelay ?? 150);
        }
      } catch (err) {
        console.error("[Agent] Error:", err);
        await this.sleep(2000);

        if (!this.vnc.isConnected()) {
          console.log("[Agent] Reconnecting...");
          try {
            await this.vnc.connect();
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
    this.vnc.disconnect();
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
    vnc: {
      host: config?.vnc?.host ?? process.env.VNC_HOST ?? appConfig.vnc.host,
      port: config?.vnc?.port ?? parseInt(process.env.VNC_PORT ?? String(appConfig.vnc.port), 10),
      password: config?.vnc?.password ?? process.env.VNC_PASSWORD ?? appConfig.vnc.password,
    },
    model: config?.model ?? process.env.LLM_MODEL ?? appConfig.llm.model,
    actionDelay: config?.actionDelay ?? appConfig.agent.actionDelay,
    screenshotDelay: config?.screenshotDelay ?? appConfig.agent.screenshotDelay,
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
export * from "./vnc-client";
export * from "./llm";
export * from "./config";
