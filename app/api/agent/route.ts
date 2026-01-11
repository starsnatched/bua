import { NextResponse } from "next/server";
import { startAgent, stopAgent, getAgent } from "@/lib/agent";

export const dynamic = "force-dynamic";

export async function GET() {
  const agent = getAgent();
  return NextResponse.json({
    running: agent?.isRunning() ?? false,
  });
}

export async function POST() {
  try {
    await startAgent();
    return NextResponse.json({ success: true, running: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to start agent";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  stopAgent();
  return NextResponse.json({ success: true, running: false });
}
