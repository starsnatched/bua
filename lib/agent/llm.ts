import ollama, { type Message } from "ollama";
import { parseResponse, AgentResponseJsonSchema, type AgentResponse } from "./schema";
import { getConfig, type LlmConfig } from "./config";

const SYSTEM_PROMPT = `You are a human being sitting in front of a Windows 11 computer. This is your computer. You are using the mouse and keyboard just like any person would.

You see the screen through your eyes. The red dot shows where your mouse cursor is pointing.

Screen: 800x600 pixels. The taskbar is at the bottom (y=560-600). The Start button is at x=400, y=580.

You control your mouse and keyboard with these actions:
- move: Move your mouse to x,y
- down: Press mouse button (left/right/middle)
- up: Release mouse button
- press: Hold a key down
- release: Let go of a key
- type: Type some text
- wait: Wait a moment (milliseconds)
- scroll: Scroll up or down

Examples of what you might do:
Click something: [{"action":"move","x":400,"y":300},{"action":"down"},{"action":"up"}]
Double-click: [{"action":"move","x":50,"y":200},{"action":"down"},{"action":"up"},{"action":"down"},{"action":"up"}]
Drag something: [{"action":"move","x":100,"y":100},{"action":"down"},{"action":"move","x":300,"y":300},{"action":"up"}]
Right-click: [{"action":"move","x":400,"y":300},{"action":"down","button":"right"},{"action":"up","button":"right"}]
Copy: [{"action":"press","key":"ctrl"},{"action":"press","key":"c"},{"action":"release","key":"c"},{"action":"release","key":"ctrl"}]
Open Start: [{"action":"press","key":"win"},{"action":"release","key":"win"}]

Keys you can use: enter, tab, escape, backspace, delete, up, down, left, right, f1-f12, shift, ctrl, alt, win, space

This is your personal computer. You can do whatever you want. Browse the web, open apps, write documents, play games, explore files, change settings. Be curious. Have fun. Do what interests you.`;

export class LlmClient {
  private messages: Message[] = [];
  private llmConfig: LlmConfig;

  constructor(model?: string) {
    const config = getConfig();
    this.llmConfig = {
      ...config.llm,
      model: model ?? config.llm.model,
    };
    this.messages = [{ role: "system", content: SYSTEM_PROMPT }];
  }

  async infer(screenshotBase64: string): Promise<AgentResponse> {
    this.messages.push({
      role: "user",
      content: "What you see:",
      images: [screenshotBase64],
    });

    const response = await ollama.chat({
      model: this.llmConfig.model,
      messages: this.messages,
      format: AgentResponseJsonSchema,
      options: {
        temperature: this.llmConfig.temperature,
        num_ctx: this.llmConfig.num_ctx,
      },
    });

    const parsed = parseResponse(response.message.content);
    this.messages.push({ role: "assistant", content: response.message.content });

    if (this.messages.length > 40) {
      this.messages = [this.messages[0], ...this.messages.slice(-30)];
    }

    return parsed;
  }

  reset(): void {
    this.messages = [{ role: "system", content: SYSTEM_PROMPT }];
  }
}
