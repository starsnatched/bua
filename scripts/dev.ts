import { spawn } from "child_process";

const proc = spawn("bun", ["next", "dev", "--turbopack"], {
  stdio: ["inherit", "pipe", "pipe"],
  env: process.env,
});

proc.stdout?.on("data", (data: Buffer) => {
  const lines = data.toString().split("\n");
  for (const line of lines) {
    if (line.includes("/api/screenshot")) continue;
    if (line.trim()) process.stdout.write(line + "\n");
  }
});

proc.stderr?.on("data", (data: Buffer) => {
  process.stderr.write(data);
});

proc.on("close", (code) => {
  process.exit(code ?? 0);
});

process.on("SIGINT", () => {
  proc.kill("SIGINT");
});

process.on("SIGTERM", () => {
  proc.kill("SIGTERM");
});
