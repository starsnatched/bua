import { exec, spawn } from "child_process";
import { promisify } from "util";
import type { Action } from "./schema";

const execAsync = promisify(exec);

export interface AdbConfig {
  containerName: string;
  targetWidth: number;
  targetHeight: number;
  displayDensity?: number;
}

export class AdbClient {
  private config: AdbConfig;
  private connected = false;
  private deviceWidth = 1000;
  private deviceHeight = 1000;
  private lastTouchX = 500;
  private lastTouchY = 500;

  constructor(config: AdbConfig) {
    this.config = config;
  }

  private async dockerExec(command: string): Promise<string> {
    const { stdout } = await execAsync(
      `docker exec ${this.config.containerName} ${command}`,
      { maxBuffer: 50 * 1024 * 1024 }
    );
    return stdout;
  }

  private async adb(command: string): Promise<string> {
    return this.dockerExec(`adb ${command}`);
  }

  async connect(): Promise<void> {
    try {
      let retries = 60;
      while (retries > 0) {
        try {
          const output = await this.adb("shell getprop sys.boot_completed");
          if (output.trim() === "1") {
            break;
          }
        } catch {
          // Device not ready yet
        }
        await this.sleep(2000);
        retries--;
      }

      if (retries === 0) {
        throw new Error("Device boot timeout");
      }

      const wmSize = await this.adb("shell wm size");
      const match = wmSize.match(/Physical size:\s*(\d+)x(\d+)/);
      if (match) {
        this.deviceWidth = parseInt(match[1], 10);
        this.deviceHeight = parseInt(match[2], 10);
      }

      if (this.config.displayDensity) {
        await this.adb(`shell wm density ${this.config.displayDensity}`);
      }

      this.connected = true;
    } catch (err) {
      this.connected = false;
      throw err;
    }
  }

  async screencapRaw(): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const proc = spawn("docker", [
        "exec",
        this.config.containerName,
        "adb",
        "exec-out",
        "screencap",
        "-p",
      ]);

      proc.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
      proc.stderr.on("data", (data: Buffer) => {
        const msg = data.toString();
        if (msg.includes("error") || msg.includes("Error")) {
          reject(new Error(msg));
        }
      });

      proc.on("close", (code) => {
        if (code === 0) {
          resolve(Buffer.concat(chunks));
        } else {
          reject(new Error(`screencap exit code ${code}`));
        }
      });

      proc.on("error", reject);
    });
  }

  private scaleToDevice(x: number, y: number): { dx: number; dy: number } {
    const dx = Math.round((x / this.config.targetWidth) * this.deviceWidth);
    const dy = Math.round((y / this.config.targetHeight) * this.deviceHeight);
    return {
      dx: Math.max(0, Math.min(dx, this.deviceWidth - 1)),
      dy: Math.max(0, Math.min(dy, this.deviceHeight - 1)),
    };
  }

  private async inputTap(x: number, y: number): Promise<void> {
    const { dx, dy } = this.scaleToDevice(x, y);
    this.lastTouchX = x;
    this.lastTouchY = y;
    await this.adb(`shell input tap ${dx} ${dy}`);
  }

  private async inputSwipe(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    duration: number
  ): Promise<void> {
    const start = this.scaleToDevice(x1, y1);
    const end = this.scaleToDevice(x2, y2);
    this.lastTouchX = x2;
    this.lastTouchY = y2;
    await this.adb(`shell input swipe ${start.dx} ${start.dy} ${end.dx} ${end.dy} ${duration}`);
  }

  private async inputLongPress(x: number, y: number, duration: number): Promise<void> {
    const { dx, dy } = this.scaleToDevice(x, y);
    this.lastTouchX = x;
    this.lastTouchY = y;
    await this.adb(`shell input swipe ${dx} ${dy} ${dx} ${dy} ${duration}`);
  }

  async execute(action: Action): Promise<void> {
    if (!this.connected) throw new Error("Not connected");

    switch (action.type) {
      case "tap": {
        await this.inputTap(action.x, action.y);
        break;
      }

      case "hold": {
        const duration = action.ms ?? 800;
        await this.inputLongPress(action.x, action.y, duration);
        break;
      }

      case "swipe": {
        const duration = action.ms ?? 200;
        await this.inputSwipe(
          action.startX,
          action.startY,
          action.endX,
          action.endY,
          duration
        );
        break;
      }

      case "drag": {
        const duration = action.ms ?? 500;
        await this.inputSwipe(
          action.startX,
          action.startY,
          action.endX,
          action.endY,
          duration
        );
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
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  getDeviceDimensions(): { width: number; height: number } {
    return { width: this.deviceWidth, height: this.deviceHeight };
  }

  getLastTouchPosition(): { x: number; y: number } {
    return { x: this.lastTouchX, y: this.lastTouchY };
  }
}
