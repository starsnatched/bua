import rfb from "rfb2";
import sharp from "sharp";
import type { Action } from "./schema";

const KEY_MAP: Record<string, number> = {
  backspace: 0xff08, tab: 0xff09, enter: 0xff0d, return: 0xff0d,
  escape: 0xff1b, esc: 0xff1b, insert: 0xff63, delete: 0xffff, del: 0xffff,
  home: 0xff50, end: 0xff57, pageup: 0xff55, pagedown: 0xff56,
  left: 0xff51, up: 0xff52, right: 0xff53, down: 0xff54,
  f1: 0xffbe, f2: 0xffbf, f3: 0xffc0, f4: 0xffc1, f5: 0xffc2, f6: 0xffc3,
  f7: 0xffc4, f8: 0xffc5, f9: 0xffc6, f10: 0xffc7, f11: 0xffc8, f12: 0xffc9,
  shift: 0xffe1, ctrl: 0xffe3, control: 0xffe3, alt: 0xffe9,
  meta: 0xffe7, win: 0xffeb, super: 0xffeb, space: 0x0020, " ": 0x0020,
};

interface RfbClient {
  width: number;
  height: number;
  on(event: string, listener: (...args: unknown[]) => void): void;
  requestUpdate(inc: boolean, x: number, y: number, w: number, h: number): void;
  pointerEvent(x: number, y: number, mask: number): void;
  keyEvent(keysym: number, down: boolean): void;
  end(): void;
}

interface RfbRect {
  x: number;
  y: number;
  width: number;
  height: number;
  data: Buffer;
  encoding: number;
}

export interface VncConfig {
  host: string;
  port: number;
  password?: string;
}

export class VncClient {
  private client: RfbClient | null = null;
  private frameBuffer: Buffer | null = null;
  private config: VncConfig;
  private width = 800;
  private height = 600;
  private connected = false;
  private mouseX = 0;
  private mouseY = 0;
  private buttonMask = 0;

  constructor(config: VncConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const opts: Record<string, unknown> = { host: this.config.host, port: this.config.port };
      if (this.config.password) opts.password = this.config.password;

      this.client = rfb.createConnection(opts) as RfbClient;
      const timeout = setTimeout(() => reject(new Error("VNC timeout")), 30000);

      this.client.on("connect", () => {
        clearTimeout(timeout);
        this.width = this.client!.width;
        this.height = this.client!.height;
        this.frameBuffer = Buffer.alloc(this.width * this.height * 4);
        this.connected = true;
        this.requestUpdate();
        resolve();
      });

      this.client.on("error", (err: unknown) => {
        clearTimeout(timeout);
        this.connected = false;
        reject(err);
      });

      this.client.on("rect", (rect: unknown) => this.updateBuffer(rect as RfbRect));
      this.client.on("end", () => (this.connected = false));
    });
  }

  private updateBuffer(rect: RfbRect): void {
    if (!this.frameBuffer || rect.encoding !== 0) return;
    for (let y = 0; y < rect.height; y++) {
      const src = y * rect.width * 4;
      const dst = ((rect.y + y) * this.width + rect.x) * 4;
      rect.data.subarray(src, src + rect.width * 4).copy(this.frameBuffer, dst);
    }
  }

  private requestUpdate(): void {
    if (this.client && this.connected) {
      this.client.requestUpdate(false, 0, 0, this.width, this.height);
    }
  }

  async screenshot(): Promise<string> {
    if (!this.connected || !this.frameBuffer) throw new Error("Not connected");
    this.requestUpdate();
    await this.sleep(100);

    const rgba = Buffer.alloc(this.width * this.height * 4);
    for (let i = 0; i < this.width * this.height; i++) {
      rgba[i * 4] = this.frameBuffer[i * 4 + 2];
      rgba[i * 4 + 1] = this.frameBuffer[i * 4 + 1];
      rgba[i * 4 + 2] = this.frameBuffer[i * 4];
      rgba[i * 4 + 3] = 255;
    }

    const cursorSize = 12;
    const cursorSvg = Buffer.from(`
      <svg width="${cursorSize}" height="${cursorSize}">
        <circle cx="${cursorSize / 2}" cy="${cursorSize / 2}" r="${cursorSize / 2 - 1}" fill="#ff0000" stroke="#ffffff" stroke-width="2"/>
      </svg>
    `);

    const cursorLeft = Math.max(0, Math.min(this.mouseX - cursorSize / 2, this.width - cursorSize));
    const cursorTop = Math.max(0, Math.min(this.mouseY - cursorSize / 2, this.height - cursorSize));

    const png = await sharp(rgba, { raw: { width: this.width, height: this.height, channels: 4 } })
      .composite([
        {
          input: cursorSvg,
          left: Math.round(cursorLeft),
          top: Math.round(cursorTop),
        },
      ])
      .png({ quality: 80 })
      .toBuffer();

    return png.toString("base64");
  }

  private clamp(val: number, max: number): number {
    return Math.max(0, Math.min(val, max - 1));
  }

  private getKeysym(key: string): number {
    const lower = key.toLowerCase();
    if (KEY_MAP[lower]) return KEY_MAP[lower];
    if (key.length === 1) return key.charCodeAt(0);
    throw new Error(`Unknown key: ${key}`);
  }

  private getButtonBit(button?: string): number {
    if (button === "right") return 4;
    if (button === "middle") return 2;
    return 1;
  }

  async execute(action: Action): Promise<void> {
    if (!this.client || !this.connected) throw new Error("Not connected");

    switch (action.action) {
      case "move": {
        this.mouseX = this.clamp(action.x, this.width);
        this.mouseY = this.clamp(action.y, this.height);
        this.client.pointerEvent(this.mouseX, this.mouseY, this.buttonMask);
        break;
      }

      case "down": {
        this.buttonMask |= this.getButtonBit(action.button);
        this.client.pointerEvent(this.mouseX, this.mouseY, this.buttonMask);
        break;
      }

      case "up": {
        this.buttonMask &= ~this.getButtonBit(action.button);
        this.client.pointerEvent(this.mouseX, this.mouseY, this.buttonMask);
        break;
      }

      case "press": {
        this.client.keyEvent(this.getKeysym(action.key), true);
        break;
      }

      case "release": {
        this.client.keyEvent(this.getKeysym(action.key), false);
        break;
      }

      case "type": {
        for (const char of action.text) {
          const keysym = char.charCodeAt(0);
          this.client.keyEvent(keysym, true);
          await this.sleep(20);
          this.client.keyEvent(keysym, false);
          await this.sleep(20);
        }
        break;
      }

      case "wait": {
        await this.sleep(action.ms);
        break;
      }

      case "scroll": {
        const btn = action.direction === "up" ? 8 : 16;
        this.client.pointerEvent(this.mouseX, this.mouseY, btn);
        await this.sleep(30);
        this.client.pointerEvent(this.mouseX, this.mouseY, 0);
        break;
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }

  disconnect(): void {
    if (this.client) {
      this.client.end();
      this.client = null;
      this.connected = false;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}
