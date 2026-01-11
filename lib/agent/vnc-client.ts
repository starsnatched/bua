import rfb from "rfb2";
import sharp from "sharp";
import type { Action } from "./schema";

interface RfbClient {
  width: number;
  height: number;
  on(event: string, listener: (...args: unknown[]) => void): void;
  requestUpdate(inc: boolean, x: number, y: number, w: number, h: number): void;
  pointerEvent(x: number, y: number, mask: number): void;
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
  private width = 1000;
  private height = 1000;
  private connected = false;
  private lastTouchX = 0;
  private lastTouchY = 0;
  private touchPressed = false;
  private touchStartX = 0;
  private touchStartY = 0;
  private touchType: "tap" | "hold" | null = null;

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

    const touchIndicatorSize = 16;
    const touchIndicatorSvg = Buffer.from(`
      <svg width="${touchIndicatorSize}" height="${touchIndicatorSize}">
        <circle cx="${touchIndicatorSize / 2}" cy="${touchIndicatorSize / 2}" r="${touchIndicatorSize / 2 - 1}" fill="#ff0000" stroke="#ffffff" stroke-width="2"/>
      </svg>
    `);

    const indicatorLeft = Math.max(0, Math.min(this.lastTouchX - touchIndicatorSize / 2, this.width - touchIndicatorSize));
    const indicatorTop = Math.max(0, Math.min(this.lastTouchY - touchIndicatorSize / 2, this.height - touchIndicatorSize));

    const png = await sharp(rgba, { raw: { width: this.width, height: this.height, channels: 4 } })
      .composite([
        {
          input: touchIndicatorSvg,
          left: Math.round(indicatorLeft),
          top: Math.round(indicatorTop),
        },
      ])
      .png({ quality: 80 })
      .toBuffer();

    return png.toString("base64");
  }

  private clamp(val: number, max: number): number {
    return Math.max(0, Math.min(val, max - 1));
  }

  private sendPointer(x: number, y: number, pressed: boolean): void {
    if (!this.client || !this.connected) return;
    this.client.pointerEvent(x, y, pressed ? 1 : 0);
  }

  private async interpolateMovement(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    duration: number
  ): Promise<void> {
    const steps = Math.max(10, Math.floor(duration / 16));
    const stepDelay = duration / steps;

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const currentX = Math.round(startX + (endX - startX) * t);
      const currentY = Math.round(startY + (endY - startY) * t);
      this.sendPointer(currentX, currentY, true);
      await this.sleep(stepDelay);
    }
  }

  async execute(action: Action): Promise<void> {
    if (!this.client || !this.connected) throw new Error("Not connected");

    switch (action.type) {
      case "tap": {
        const x = this.clamp(action.x, this.width);
        const y = this.clamp(action.y, this.height);

        if (action.pressed) {
          this.touchPressed = true;
          this.touchStartX = x;
          this.touchStartY = y;
          this.touchType = "tap";
          this.lastTouchX = x;
          this.lastTouchY = y;
          this.sendPointer(x, y, true);
        } else {
          if (this.touchPressed && (x !== this.touchStartX || y !== this.touchStartY)) {
            await this.interpolateMovement(this.touchStartX, this.touchStartY, x, y, 200);
          }
          this.lastTouchX = x;
          this.lastTouchY = y;
          this.sendPointer(x, y, false);
          this.touchPressed = false;
          this.touchType = null;
        }
        break;
      }

      case "hold": {
        const x = this.clamp(action.x, this.width);
        const y = this.clamp(action.y, this.height);

        if (action.pressed) {
          this.touchPressed = true;
          this.touchStartX = x;
          this.touchStartY = y;
          this.touchType = "hold";
          this.lastTouchX = x;
          this.lastTouchY = y;
          this.sendPointer(x, y, true);
        } else {
          if (this.touchPressed && (x !== this.touchStartX || y !== this.touchStartY)) {
            await this.interpolateMovement(this.touchStartX, this.touchStartY, x, y, 400);
          }
          this.lastTouchX = x;
          this.lastTouchY = y;
          await this.sleep(50);
          this.sendPointer(x, y, false);
          this.touchPressed = false;
          this.touchType = null;
        }
        break;
      }

      case "wait": {
        await this.sleep(action.ms);
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
