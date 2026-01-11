import { AdbClient, type AdbConfig } from "./adb-client";
import sharp from "sharp";

interface AdbGlobalState {
  client: AdbClient | null;
  connectionPromise: Promise<AdbClient> | null;
  cachedScreenshot: Buffer | null;
  screenshotTimestamp: number;
  streamingInterval: ReturnType<typeof setInterval> | null;
  streamingActive: boolean;
}

const GLOBAL_KEY = "__adb_state__" as const;
const STREAM_INTERVAL_MS = 100;

function getGlobalState(): AdbGlobalState {
  const g = globalThis as unknown as Record<string, AdbGlobalState | undefined>;
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = {
      client: null,
      connectionPromise: null,
      cachedScreenshot: null,
      screenshotTimestamp: 0,
      streamingInterval: null,
      streamingActive: false,
    };
  }
  return g[GLOBAL_KEY];
}

export async function getAdbClient(): Promise<AdbClient> {
  const state = getGlobalState();

  if (state.client?.isConnected()) {
    return state.client;
  }

  if (state.connectionPromise) {
    return state.connectionPromise;
  }

  state.connectionPromise = initAdbClient();
  try {
    const client = await state.connectionPromise;
    return client;
  } finally {
    state.connectionPromise = null;
  }
}

async function initAdbClient(): Promise<AdbClient> {
  const state = getGlobalState();

  const config: AdbConfig = {
    containerName: process.env.ANDROID_CONTAINER ?? "bua-android-tablet",
    targetWidth: parseInt(process.env.TARGET_WIDTH ?? "1000", 10),
    targetHeight: parseInt(process.env.TARGET_HEIGHT ?? "1000", 10),
    displayDensity: parseInt(process.env.DISPLAY_DENSITY ?? "200", 10),
  };

  state.client = new AdbClient(config);
  await state.client.connect();

  await captureScreenshot();
  startStreaming();

  return state.client;
}

async function captureScreenshot(): Promise<Buffer | null> {
  const state = getGlobalState();

  if (!state.client?.isConnected()) {
    return null;
  }

  try {
    const rawPng = await state.client.screencapRaw();
    const targetWidth = parseInt(process.env.TARGET_WIDTH ?? "1000", 10);
    const targetHeight = parseInt(process.env.TARGET_HEIGHT ?? "1000", 10);

    const { x: lastX, y: lastY } = state.client.getLastTouchPosition();

    const touchIndicatorSize = 20;
    const indicatorLeft = Math.max(0, Math.min(lastX - touchIndicatorSize / 2, targetWidth - touchIndicatorSize));
    const indicatorTop = Math.max(0, Math.min(lastY - touchIndicatorSize / 2, targetHeight - touchIndicatorSize));

    const touchIndicatorSvg = Buffer.from(`
      <svg width="${touchIndicatorSize}" height="${touchIndicatorSize}">
        <circle cx="${touchIndicatorSize / 2}" cy="${touchIndicatorSize / 2}" r="${touchIndicatorSize / 2 - 2}" fill="#ff0000" fill-opacity="0.7" stroke="#ffffff" stroke-width="2"/>
      </svg>
    `);

    state.cachedScreenshot = await sharp(rawPng)
      .resize(targetWidth, targetHeight, { fit: "fill" })
      .composite([
        {
          input: touchIndicatorSvg,
          left: Math.round(indicatorLeft),
          top: Math.round(indicatorTop),
        },
      ])
      .png({ quality: 80 })
      .toBuffer();

    state.screenshotTimestamp = Date.now();
    return state.cachedScreenshot;
  } catch (err) {
    console.error("[ADB] Screenshot capture failed:", err);
    return null;
  }
}

function startStreaming(): void {
  const state = getGlobalState();

  if (state.streamingActive) {
    return;
  }

  state.streamingActive = true;
  state.streamingInterval = setInterval(async () => {
    if (state.client?.isConnected()) {
      await captureScreenshot();
    }
  }, STREAM_INTERVAL_MS);
}

function stopStreaming(): void {
  const state = getGlobalState();

  if (state.streamingInterval) {
    clearInterval(state.streamingInterval);
    state.streamingInterval = null;
  }
  state.streamingActive = false;
}

export async function refreshScreenshot(): Promise<Buffer> {
  const result = await captureScreenshot();
  if (!result) {
    throw new Error("Failed to capture screenshot");
  }
  return result;
}

export function getCachedScreenshot(): Buffer | null {
  return getGlobalState().cachedScreenshot;
}

export function getScreenshotTimestamp(): number {
  return getGlobalState().screenshotTimestamp;
}

export async function getScreenshotForAgent(): Promise<string> {
  const screenshot = await captureScreenshot();
  if (!screenshot) {
    throw new Error("Failed to capture screenshot for agent");
  }
  return screenshot.toString("base64");
}

export function disconnectAdb(): void {
  const state = getGlobalState();
  stopStreaming();
  state.client?.disconnect();
  state.client = null;
  state.cachedScreenshot = null;
}

export function getAdbClientSync(): AdbClient | null {
  return getGlobalState().client;
}
