import { z } from "zod";

export const MoveAction = z.object({
  action: z.literal("move"),
  x: z.number().int(),
  y: z.number().int(),
});

export const DownAction = z.object({
  action: z.literal("down"),
  button: z.enum(["left", "right", "middle"]).optional(),
});

export const UpAction = z.object({
  action: z.literal("up"),
  button: z.enum(["left", "right", "middle"]).optional(),
});

export const PressAction = z.object({
  action: z.literal("press"),
  key: z.string(),
});

export const ReleaseAction = z.object({
  action: z.literal("release"),
  key: z.string(),
});

export const TypeAction = z.object({
  action: z.literal("type"),
  text: z.string(),
});

export const ScrollAction = z.object({
  action: z.literal("scroll"),
  direction: z.enum(["up", "down"]),
});

export const Action = z.discriminatedUnion("action", [
  MoveAction,
  DownAction,
  UpAction,
  PressAction,
  ReleaseAction,
  TypeAction,
  ScrollAction,
]);

export type Action = z.infer<typeof Action>;

export const AgentResponse = z.object({
  actions: z.array(Action).min(1),
});

export type AgentResponse = z.infer<typeof AgentResponse>;

export const AgentResponseJsonSchema = {
  type: "object",
  properties: {
    actions: {
      type: "array",
      minItems: 1,
      items: {
        oneOf: [
          {
            type: "object",
            properties: {
              action: { const: "move" },
              x: { type: "integer", minimum: 0, maximum: 800 },
              y: { type: "integer", minimum: 0, maximum: 600 },
            },
            required: ["action", "x", "y"],
          },
          {
            type: "object",
            properties: {
              action: { const: "down" },
              button: { type: "string", enum: ["left", "right", "middle"] },
            },
            required: ["action"],
          },
          {
            type: "object",
            properties: {
              action: { const: "up" },
              button: { type: "string", enum: ["left", "right", "middle"] },
            },
            required: ["action"],
          },
          {
            type: "object",
            properties: {
              action: { const: "press" },
              key: { type: "string" },
            },
            required: ["action", "key"],
          },
          {
            type: "object",
            properties: {
              action: { const: "release" },
              key: { type: "string" },
            },
            required: ["action", "key"],
          },
          {
            type: "object",
            properties: {
              action: { const: "type" },
              text: { type: "string" },
            },
            required: ["action", "text"],
          },
          {
            type: "object",
            properties: {
              action: { const: "scroll" },
              direction: { type: "string", enum: ["up", "down"] },
            },
            required: ["action", "direction"],
          },
        ],
      },
    },
  },
  required: ["actions"],
};

export function parseResponse(content: string): AgentResponse {
  return AgentResponse.parse(JSON.parse(content));
}
