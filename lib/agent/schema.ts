import { z } from "zod";

export const MoveAction = z
  .object({
    action: z.literal("move"),
    x: z
      .number()
      .int()
      .min(0)
      .max(800)
      .describe(
        "Horizontal pixel coordinate from left edge (0) to right edge (800). The screen center is x=400."
      ),
    y: z
      .number()
      .int()
      .min(0)
      .max(600)
      .describe(
        "Vertical pixel coordinate from top edge (0) to bottom edge (600). The taskbar occupies y=560-600. Desktop icons typically start at y=20-50."
      ),
  })
  .describe(
    "Move the mouse cursor to absolute screen coordinates (x, y). This does NOT click - it only repositions the cursor. Always move before clicking. The red dot overlay shows current cursor position."
  );

export const DownAction = z
  .object({
    action: z.literal("down"),
    button: z
      .enum(["left", "right", "middle"])
      .optional()
      .default("left")
      .describe(
        "Which mouse button to press. 'left' for primary actions (select, activate, drag start). 'right' for context menus. 'middle' for special functions like open link in new tab or auto-scroll."
      ),
  })
  .describe(
    "Press and HOLD a mouse button down. The button stays pressed until you send an 'up' action. Used for clicking (down+up), double-clicking (down+up+down+up), and dragging (down, move, up)."
  );

export const UpAction = z
  .object({
    action: z.literal("up"),
    button: z
      .enum(["left", "right", "middle"])
      .optional()
      .default("left")
      .describe(
        "Which mouse button to release. Must match the button used in the preceding 'down' action."
      ),
  })
  .describe(
    "Release a mouse button that was previously pressed with 'down'. Completes a click when preceded by 'down'. Ends a drag operation when mouse was moved while button was held."
  );

export const PressAction = z
  .object({
    action: z.literal("press"),
    key: z
      .string()
      .describe(
        "Key identifier to press. Modifiers: 'ctrl', 'alt', 'shift', 'win' (Windows/Super key). Navigation: 'up', 'down', 'left', 'right', 'home', 'end', 'pageup', 'pagedown'. Editing: 'enter', 'tab', 'backspace', 'delete', 'space', 'escape'. Function keys: 'f1' through 'f12'. For letters and numbers, use lowercase: 'a', 'b', '1', '2'. For symbols, use the character directly: '/', '.', '-'."
      ),
  })
  .describe(
    "Press and HOLD a keyboard key. The key stays pressed until you send a 'release' action. For key combinations like Ctrl+C: press 'ctrl', press 'c', release 'c', release 'ctrl'. Order matters - press modifiers first, release them last."
  );

export const ReleaseAction = z
  .object({
    action: z.literal("release"),
    key: z
      .string()
      .describe(
        "Key identifier to release. Must exactly match a key that was previously pressed and is still held down."
      ),
  })
  .describe(
    "Release a keyboard key that was pressed with 'press'. Always release keys in reverse order of pressing. Failing to release modifier keys (ctrl, alt, shift, win) will cause subsequent actions to behave unexpectedly."
  );

export const TypeAction = z
  .object({
    action: z.literal("type"),
    text: z
      .string()
      .min(1)
      .describe(
        "Text string to type. Supports full Unicode including letters, numbers, symbols, and spaces. Each character is typed sequentially. Does NOT support special keys - use 'press'/'release' for Enter, Tab, Backspace, etc. Escape special JSON characters properly: use \\n for actual newlines if needed."
      ),
  })
  .describe(
    "Type a sequence of characters as if on a keyboard. Use this for entering text into fields, search boxes, documents, or terminals. The target element must already have keyboard focus - click on it first if needed. For special keys or shortcuts, use 'press'/'release' instead."
  );

export const ScrollAction = z
  .object({
    action: z.literal("scroll"),
    direction: z
      .enum(["up", "down"])
      .describe(
        "'up' scrolls content upward (reveals content above, like scrolling toward the top of a page). 'down' scrolls content downward (reveals content below, like scrolling toward the bottom of a page)."
      ),
  })
  .describe(
    "Scroll the mouse wheel at the current cursor position. First move the cursor over the scrollable area, then scroll. Most applications scroll vertically. Scroll amount is typically 3-5 lines per action. Repeat scroll actions for larger movements."
  );

export const WaitAction = z
  .object({
    action: z.literal("wait"),
    ms: z
      .number()
      .int()
      .min(0)
      .max(10000)
      .describe(
        "Duration to wait in milliseconds. Range: 0-10000 (0ms to 10 seconds). Use 100-500ms for brief pauses between rapid actions. Use 1000-3000ms when waiting for UI transitions, dialogs, or page loads."
      ),
  })
  .describe(
    "Pause execution for a specified duration. Use sparingly - the agent loop already provides delays between screenshot captures. Useful when multiple actions must execute in rapid succession before the next screenshot, such as double-clicks or complex keyboard shortcuts. Prefer relying on visual feedback from screenshots over explicit waits."
  );

export const Action = z.discriminatedUnion("action", [
  MoveAction,
  DownAction,
  UpAction,
  PressAction,
  ReleaseAction,
  TypeAction,
  ScrollAction,
  WaitAction,
]);

export type Action = z.infer<typeof Action>;

export const AgentResponse = z
  .object({
    actions: z
      .array(Action)
      .min(1)
      .max(20)
      .describe(
        "Ordered sequence of low-level input actions to execute. Actions run sequentially with brief pauses between them. Plan multi-step interactions carefully: a single click requires [move, down, up]. Keep action sequences focused - prefer smaller batches with visual feedback over long blind sequences."
      ),
  })
  .describe(
    "Your response containing the next actions to perform on the computer. Analyze the screenshot to understand current state, identify what to interact with, and produce precise actions. Be methodical: verify UI state, target visible elements, and account for loading times."
  );

export type AgentResponse = z.infer<typeof AgentResponse>;

export const AgentResponseJsonSchema = {
  type: "object",
  description:
    "Response containing computer control actions. You are operating a Windows 11 desktop at 800x600 resolution. The red dot overlay marks your current cursor position. Analyze the screenshot carefully before acting. Prefer short, verifiable action sequences over long chains.",
  properties: {
    actions: {
      type: "array",
      description:
        "Ordered list of input actions to execute sequentially. Each action is atomic - a click requires separate move, down, and up actions. Actions execute with ~150ms delay between them. Limit to 1-5 actions per response for reliability, using visual feedback to confirm success before continuing.",
      minItems: 1,
      maxItems: 20,
      items: {
        oneOf: [
          {
            type: "object",
            description:
              "MOVE: Reposition mouse cursor to absolute screen coordinates. Does not click. Always move before clicking a new target. The red dot shows current position - compare against target to verify movement.",
            properties: {
              action: { const: "move" },
              x: {
                type: "integer",
                minimum: 0,
                maximum: 800,
                description:
                  "X coordinate in pixels. 0=left edge, 400=center, 800=right edge. Desktop icons: x=30-60. Start button: x=400. System tray: x=700-790. Titlebar buttons (minimize/maximize/close): x=720-795.",
              },
              y: {
                type: "integer",
                minimum: 0,
                maximum: 600,
                description:
                  "Y coordinate in pixels. 0=top edge, 300=center, 600=bottom edge. Desktop icons: y=20-400. Window titlebars: y=0-30. Taskbar: y=560-600. Taskbar app icons: y=575. Start button: y=575.",
              },
            },
            required: ["action", "x", "y"],
            additionalProperties: false,
          },
          {
            type: "object",
            description:
              "DOWN: Press and hold a mouse button. Stays pressed until UP action. For single click: DOWN then UP. For double-click: DOWN, UP, DOWN, UP (fast). For drag: DOWN, MOVE to destination, UP. For right-click context menu: DOWN with button='right', then UP with button='right'.",
            properties: {
              action: { const: "down" },
              button: {
                type: "string",
                enum: ["left", "right", "middle"],
                default: "left",
                description:
                  "Mouse button. 'left' (default): select, click, activate. 'right': context menu. 'middle': special browser/app functions.",
              },
            },
            required: ["action"],
            additionalProperties: false,
          },
          {
            type: "object",
            description:
              "UP: Release a held mouse button. Always pair with preceding DOWN. Button must match the DOWN action's button. Completes click/drag operations.",
            properties: {
              action: { const: "up" },
              button: {
                type: "string",
                enum: ["left", "right", "middle"],
                default: "left",
                description: "Mouse button to release. Must match the preceding DOWN action's button.",
              },
            },
            required: ["action"],
            additionalProperties: false,
          },
          {
            type: "object",
            description:
              "PRESS: Press and hold a keyboard key. Stays pressed until RELEASE. For shortcuts like Ctrl+C: PRESS ctrl, PRESS c, RELEASE c, RELEASE ctrl. Modifier order matters. Common shortcuts: Ctrl+A (select all), Ctrl+C (copy), Ctrl+V (paste), Ctrl+Z (undo), Ctrl+S (save), Alt+F4 (close window), Alt+Tab (switch window), Win (start menu), Win+E (file explorer), Win+D (show desktop).",
            properties: {
              action: { const: "press" },
              key: {
                type: "string",
                description:
                  "Key name. Modifiers: ctrl, alt, shift, win. Navigation: up, down, left, right, home, end, pageup, pagedown. Editing: enter, tab, backspace, delete, space, escape. Function: f1-f12. Letters: a-z (lowercase). Numbers: 0-9. Symbols: use character directly.",
              },
            },
            required: ["action", "key"],
            additionalProperties: false,
          },
          {
            type: "object",
            description:
              "RELEASE: Release a held keyboard key. Must follow a PRESS for the same key. Release in reverse order of pressing - release non-modifiers first, then modifiers. Unreleased modifiers cause erratic behavior in subsequent actions.",
            properties: {
              action: { const: "release" },
              key: {
                type: "string",
                description: "Key name to release. Must exactly match a currently held key from a prior PRESS action.",
              },
            },
            required: ["action", "key"],
            additionalProperties: false,
          },
          {
            type: "object",
            description:
              "TYPE: Input a text string character by character. Use for text fields, search boxes, address bars, document editing. Element must have keyboard focus first - click on it before typing. Does NOT support special keys (Enter, Tab, arrows) - use PRESS/RELEASE for those. Combine: TYPE your text, then PRESS enter to submit.",
            properties: {
              action: { const: "type" },
              text: {
                type: "string",
                minLength: 1,
                description:
                  "Text to type. Supports letters, numbers, symbols, spaces, punctuation. For newlines within text, use actual line breaks or \\n. For special keys, use PRESS/RELEASE instead.",
              },
            },
            required: ["action", "text"],
            additionalProperties: false,
          },
          {
            type: "object",
            description:
              "SCROLL: Scroll mouse wheel at current cursor position. First MOVE cursor over the scrollable area (document, list, webpage), then SCROLL. 'up' reveals content above (toward page top). 'down' reveals content below (toward page bottom). Each scroll moves ~3-5 lines. Repeat for larger scroll distances.",
            properties: {
              action: { const: "scroll" },
              direction: {
                type: "string",
                enum: ["up", "down"],
                description:
                  "'up': scroll toward top, reveal content above. 'down': scroll toward bottom, reveal content below.",
              },
            },
            required: ["action", "direction"],
            additionalProperties: false,
          },
          {
            type: "object",
            description:
              "WAIT: Pause execution for specified milliseconds. Use sparingly - prefer visual feedback from screenshots. Useful for rapid multi-action sequences (double-clicks, keyboard shortcuts) that must complete before next screenshot. Max 10 seconds.",
            properties: {
              action: { const: "wait" },
              ms: {
                type: "integer",
                minimum: 0,
                maximum: 10000,
                description:
                  "Wait duration in milliseconds. 100-500ms for brief pauses between rapid actions. 1000-3000ms for UI transitions or page loads.",
              },
            },
            required: ["action", "ms"],
            additionalProperties: false,
          },
        ],
      },
    },
  },
  required: ["actions"],
  additionalProperties: false,
};

export function parseResponse(content: string): AgentResponse {
  return AgentResponse.parse(JSON.parse(content));
}
