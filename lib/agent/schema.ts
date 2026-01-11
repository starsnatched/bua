import { z } from "zod";

export const TapAction = z.object({
  type: z.literal("tap").describe(
    "Touch tap action. Quick touch state change at a position."
  ),
  x: z.number().int().min(0).max(1000).describe(
    "Horizontal pixel coordinate. 0=left edge, 500=center, 1000=right edge."
  ),
  y: z.number().int().min(0).max(1000).describe(
    "Vertical pixel coordinate. 0=top edge, 500=center, 1000=bottom edge."
  ),
  pressed: z.boolean().describe(
    "Touch state. true=finger down (press), false=finger up (release). " +
    "For a simple tap: [{type:'tap', x, y, pressed:true}, {type:'tap', x, y, pressed:false}]. " +
    "For a swipe: [{type:'tap', x:startX, y:startY, pressed:true}, {type:'tap', x:endX, y:endY, pressed:false}]."
  ),
}).describe(
  "Touch tap action. Controls finger press/release state at a position. " +
  "Quick touch sequences for taps and swipes. Movement between press and release creates swipe gestures."
);

export const HoldAction = z.object({
  type: z.literal("hold").describe(
    "Touch hold action. Long press state change at a position."
  ),
  x: z.number().int().min(0).max(1000).describe(
    "Horizontal pixel coordinate. 0=left edge, 500=center, 1000=right edge."
  ),
  y: z.number().int().min(0).max(1000).describe(
    "Vertical pixel coordinate. 0=top edge, 500=center, 1000=bottom edge."
  ),
  pressed: z.boolean().describe(
    "Touch state. true=finger down (press and hold), false=finger up (release). " +
    "For a long press: [{type:'hold', x, y, pressed:true}, {type:'wait', ms:800}, {type:'hold', x, y, pressed:false}]. " +
    "For a drag: [{type:'hold', x:startX, y:startY, pressed:true}, {type:'wait', ms:200}, {type:'hold', x:endX, y:endY, pressed:false}]."
  ),
}).describe(
  "Touch hold action. Controls finger press/release state for long press operations. " +
  "Use with wait actions between press and release for proper hold timing. " +
  "Movement between press and release creates drag gestures."
);

export const WaitAction = z.object({
  type: z.literal("wait").describe(
    "Wait action type. Pauses execution for a specified duration."
  ),
  ms: z.number().int().min(0).max(10000).describe(
    "Duration to wait in milliseconds (0-10000). " +
    "Use 50-100ms between tap press/release for quick taps. " +
    "Use 200-500ms between hold press/release for drag pickup. " +
    "Use 500-1000ms for long press context menus."
  ),
}).describe(
  "Execution pause. Delays the next action by the specified duration. " +
  "Essential for timing between press and release in hold/drag operations."
);

export const Action = z.discriminatedUnion("type", [
  TapAction,
  HoldAction,
  WaitAction,
]).describe(
  "A single atomic touch input action. Actions are executed sequentially in array order. " +
  "Complex behaviors are composed from multiple atomic actions."
);

export type Action = z.infer<typeof Action>;
export type TapAction = z.infer<typeof TapAction>;
export type HoldAction = z.infer<typeof HoldAction>;
export type WaitAction = z.infer<typeof WaitAction>;

export const AgentResponse = z.array(Action).min(1).max(100).describe(
  "Ordered sequence of touch input actions to execute. Actions run sequentially. " +
  "Tap: [{type:'tap', x:500, y:500, pressed:true}, {type:'tap', x:500, y:500, pressed:false}]. " +
  "Swipe: [{type:'tap', x:500, y:700, pressed:true}, {type:'tap', x:500, y:300, pressed:false}]. " +
  "Hold: [{type:'hold', x:500, y:500, pressed:true}, {type:'wait', ms:800}, {type:'hold', x:500, y:500, pressed:false}]. " +
  "Drag: [{type:'hold', x:100, y:200, pressed:true}, {type:'wait', ms:200}, {type:'hold', x:400, y:200, pressed:false}]. " +
  "Maximum 100 actions per response."
);

export type AgentResponse = z.infer<typeof AgentResponse>;

export const AgentResponseJsonSchema = {
  type: "array",
  description:
    "Ordered sequence of touch input actions to execute on an Android tablet at 1000x1000 resolution. " +
    "The red dot overlay marks your last touch position. " +
    "Tap: [{type:'tap', x:500, y:500, pressed:true}, {type:'tap', x:500, y:500, pressed:false}]. " +
    "Swipe: [{type:'tap', x:500, y:700, pressed:true}, {type:'tap', x:500, y:300, pressed:false}]. " +
    "Hold: [{type:'hold', x:500, y:500, pressed:true}, {type:'wait', ms:800}, {type:'hold', x:500, y:500, pressed:false}]. " +
    "Drag: [{type:'hold', x:100, y:200, pressed:true}, {type:'wait', ms:200}, {type:'hold', x:400, y:200, pressed:false}].",
  minItems: 1,
  maxItems: 100,
  items: {
    oneOf: [
      {
        type: "object",
        description:
          "Touch tap action. Quick touch state change at a position for taps and swipes.",
        properties: {
          type: {
            const: "tap",
            description: "Tap action type identifier.",
          },
          x: {
            type: "integer",
            minimum: 0,
            maximum: 1000,
            description:
              "Horizontal pixel coordinate. 0=left edge, 500=center, 1000=right edge.",
          },
          y: {
            type: "integer",
            minimum: 0,
            maximum: 1000,
            description:
              "Vertical pixel coordinate. 0=top edge, 500=center, 1000=bottom edge.",
          },
          pressed: {
            type: "boolean",
            description:
              "Touch state. true=finger down (press), false=finger up (release).",
          },
        },
        required: ["type", "x", "y", "pressed"],
        additionalProperties: false,
      },
      {
        type: "object",
        description:
          "Touch hold action. Long press state change at a position for holds and drags.",
        properties: {
          type: {
            const: "hold",
            description: "Hold action type identifier.",
          },
          x: {
            type: "integer",
            minimum: 0,
            maximum: 1000,
            description:
              "Horizontal pixel coordinate. 0=left edge, 500=center, 1000=right edge.",
          },
          y: {
            type: "integer",
            minimum: 0,
            maximum: 1000,
            description:
              "Vertical pixel coordinate. 0=top edge, 500=center, 1000=bottom edge.",
          },
          pressed: {
            type: "boolean",
            description:
              "Touch state. true=finger down (press and hold), false=finger up (release).",
          },
        },
        required: ["type", "x", "y", "pressed"],
        additionalProperties: false,
      },
      {
        type: "object",
        description:
          "Execution pause. Essential for timing between press and release.",
        properties: {
          type: {
            const: "wait",
            description: "Wait action type identifier.",
          },
          ms: {
            type: "integer",
            minimum: 0,
            maximum: 10000,
            description:
              "Duration to wait in milliseconds (0-10000).",
          },
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
