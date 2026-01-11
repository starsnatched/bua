import { NextResponse } from "next/server";
import { startAgent, getAgent } from "@/lib/agent";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    if (!getAgent()?.isRunning()) {
      await startAgent();
    }
    return NextResponse.json({ success: true, agentRunning: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Init failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    if (!getAgent()?.isRunning()) {
      await startAgent();
    }
    return NextResponse.json({ success: true, agentRunning: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Init failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
