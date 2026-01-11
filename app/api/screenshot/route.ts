import { NextResponse } from "next/server";
import { getCachedScreenshot, getScreenshotTimestamp } from "@/lib/agent/adb-singleton";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const cachedScreenshot = getCachedScreenshot();
    const timestamp = getScreenshotTimestamp();

    if (!cachedScreenshot) {
      return NextResponse.json({ error: "No screenshot available yet" }, { status: 503 });
    }

    return new NextResponse(cachedScreenshot, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "Pragma": "no-cache",
        "Expires": "0",
        "X-Screenshot-Timestamp": String(timestamp),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Screenshot failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
