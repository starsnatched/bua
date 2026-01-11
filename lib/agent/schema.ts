import { z } from "zod";

export const TapAction = z.object({
  type: z.literal("tap"),
  x: z.number().int().min(0).max(1000),
  y: z.number().int().min(0).max(1000),
});

export const HoldAction = z.object({
  type: z.literal("hold"),
  x: z.number().int().min(0).max(1000),
  y: z.number().int().min(0).max(1000),
  ms: z.number().int().min(100).max(5000).default(800),
});

export const SwipeAction = z.object({
  type: z.literal("swipe"),
  startX: z.number().int().min(0).max(1000),
  startY: z.number().int().min(0).max(1000),
  endX: z.number().int().min(0).max(1000),
  endY: z.number().int().min(0).max(1000),
  ms: z.number().int().min(50).max(2000).default(200),
});

export const DragAction = z.object({
  type: z.literal("drag"),
  startX: z.number().int().min(0).max(1000),
  startY: z.number().int().min(0).max(1000),
  endX: z.number().int().min(0).max(1000),
  endY: z.number().int().min(0).max(1000),
  ms: z.number().int().min(100).max(3000).default(500),
});

export const WaitAction = z.object({
  type: z.literal("wait"),
  ms: z.number().int().min(0).max(10000),
});

export const Action = z.discriminatedUnion("type", [
  TapAction,
  HoldAction,
  SwipeAction,
  DragAction,
  WaitAction,
]);

export type Action = z.infer<typeof Action>;
export type TapAction = z.infer<typeof TapAction>;
export type HoldAction = z.infer<typeof HoldAction>;
export type SwipeAction = z.infer<typeof SwipeAction>;
export type DragAction = z.infer<typeof DragAction>;
export type WaitAction = z.infer<typeof WaitAction>;

export const AgentResponse = z.array(Action).min(1).max(20);

export type AgentResponse = z.infer<typeof AgentResponse>;

export const AgentResponseJsonSchema = {
  type: "array",
  description:
    "Sequence of touch actions to execute on Android (1000x1000 resolution). " +
    "The red dot shows your last touch. Execute actions to achieve the goal.",
  minItems: 1,
  maxItems: 20,
  items: {
    oneOf: [
      {
        type: "object",
        description: "Quick tap at a point.",
        properties: {
          type: { const: "tap" },
          x: { type: "integer", minimum: 0, maximum: 1000 },
          y: { type: "integer", minimum: 0, maximum: 1000 },
        },
        required: ["type", "x", "y"],
        additionalProperties: false,
      },
      {
        type: "object",
        description: "Long press at a point. Use for context menus.",
        properties: {
          type: { const: "hold" },
          x: { type: "integer", minimum: 0, maximum: 1000 },
          y: { type: "integer", minimum: 0, maximum: 1000 },
          ms: { type: "integer", minimum: 100, maximum: 5000, default: 800 },
        },
        required: ["type", "x", "y"],
        additionalProperties: false,
      },
      {
        type: "object",
        description: "Swipe gesture from start to end. Use for scrolling.",
        properties: {
          type: { const: "swipe" },
          startX: { type: "integer", minimum: 0, maximum: 1000 },
          startY: { type: "integer", minimum: 0, maximum: 1000 },
          endX: { type: "integer", minimum: 0, maximum: 1000 },
          endY: { type: "integer", minimum: 0, maximum: 1000 },
          ms: { type: "integer", minimum: 50, maximum: 2000, default: 200 },
        },
        required: ["type", "startX", "startY", "endX", "endY"],
        additionalProperties: false,
      },
      {
        type: "object",
        description: "Hold and drag from start to end. Use for moving items.",
        properties: {
          type: { const: "drag" },
          startX: { type: "integer", minimum: 0, maximum: 1000 },
          startY: { type: "integer", minimum: 0, maximum: 1000 },
          endX: { type: "integer", minimum: 0, maximum: 1000 },
          endY: { type: "integer", minimum: 0, maximum: 1000 },
          ms: { type: "integer", minimum: 100, maximum: 3000, default: 500 },
        },
        required: ["type", "startX", "startY", "endX", "endY"],
        additionalProperties: false,
      },
      {
        type: "object",
        description: "Wait for a duration.",
        properties: {
          type: { const: "wait" },
          ms: { type: "integer", minimum: 0, maximum: 10000 },
        },
        required: ["type", "ms"],
        additionalProperties: false,
      },
    ],
  },
};

export function parseResponse(content: string): AgentResponse {
  return AgentResponse.parse(JSON.parse(content));
}
