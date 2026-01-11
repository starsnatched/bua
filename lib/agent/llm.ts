import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { parseResponse, AgentResponseJsonSchema, type AgentResponse } from "./schema";
import { getConfig, type LlmConfig } from "./config";

const SYSTEM_PROMPT = `You are autonomously operating an Android tablet through touch inputs. You receive screenshots showing the current screen state. A red dot overlay marks your last touch position. You respond with JSON containing action sequences to execute.

## SCREEN GEOMETRY
- Resolution: 1000x1000 pixels
- Coordinate system: (0,0) is top-left, (1000,1000) is bottom-right
## GOAL
Continue without Google account.`;

export class LlmClient {
  private messages: ChatCompletionMessageParam[] = [];
  private llmConfig: LlmConfig;
  private openai: OpenAI;

  constructor(model?: string) {
    const config = getConfig();
    this.llmConfig = {
      ...config.llm,
      model: model ?? config.llm.model,
    };

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: this.llmConfig.baseUrl,
    });

    this.messages = [{ role: "system", content: SYSTEM_PROMPT }];
  }

  async infer(screenshotBase64: string): Promise<AgentResponse> {
    this.messages.push({
      role: "user",
      content: [
        {
          type: "text",
          text: "Current screen state. Analyze and respond with your next touch actions:",
        },
        {
          type: "image_url",
          image_url: {
            url: `data:image/png;base64,${screenshotBase64}`,
            detail: "high",
          },
        },
      ],
    });

    const response = await this.openai.chat.completions.create({
      model: this.llmConfig.model,
      messages: this.messages,
      temperature: this.llmConfig.temperature,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "agent_response",
          strict: true,
          schema: AgentResponseJsonSchema,
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response content from OpenAI");
    }

    const parsed = parseResponse(content);
    this.messages.push({ role: "assistant", content });

    return parsed;
  }

  reset(): void {
    this.messages = [{ role: "system", content: SYSTEM_PROMPT }];
  }
}
