export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startAgent } = await import("./lib/agent");

    const delay = parseInt(process.env.AGENT_START_DELAY ?? "5000", 10);

    setTimeout(async () => {
      console.log("[Server] Starting autonomous agent...");
      try {
        await startAgent();
        console.log("[Server] Agent is now running autonomously");
      } catch (err) {
        console.error("[Server] Failed to start agent:", err);
        setTimeout(() => register(), 10000);
      }
    }, delay);
  }
}

