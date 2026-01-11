"use client";

import { useRef, useEffect, useState, useCallback } from "react";

interface AdbDisplayProps {
  width?: number;
  height?: number;
  refreshInterval?: number;
}

export default function AdbDisplay({
  width = 1000,
  height = 1000,
  refreshInterval = 100,
}: AdbDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastTimestamp = useRef<string>("");
  const initDone = useRef(false);

  const fetchAndRender = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    try {
      const response = await fetch("/api/screenshot", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });

      if (!response.ok) {
        if (response.status === 503) {
          setError("Waiting for connection...");
          return;
        }
        const data = await response.json();
        throw new Error(data.error || "Screenshot failed");
      }

      const timestamp = response.headers.get("X-Screenshot-Timestamp") || "";

      if (timestamp === lastTimestamp.current) {
        return;
      }
      lastTimestamp.current = timestamp;

      const blob = await response.blob();
      const imageBitmap = await createImageBitmap(blob);

      ctx.drawImage(imageBitmap, 0, 0, width, height);
      imageBitmap.close();

      setConnected(true);
      setError(null);
    } catch (err) {
      setConnected(false);
      setError(err instanceof Error ? err.message : "Connection failed");
    }
  }, [width, height]);

  useEffect(() => {
    const init = async () => {
      if (initDone.current) return;
      initDone.current = true;

      try {
        await fetch("/api/init");
      } catch {
        // Ignore init errors
      }

      fetchAndRender();
      intervalRef.current = setInterval(fetchAndRender, refreshInterval);
    };

    init();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchAndRender, refreshInterval]);

  return (
    <div className="adb-display-container" style={{ position: "relative", width, height }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          width: "100%",
          height: "100%",
          background: "#000",
          borderRadius: "8px",
        }}
      />
      {!connected && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0, 0, 0, 0.8)",
            color: "#fff",
            fontSize: "18px",
            borderRadius: "8px",
          }}
        >
          {error || "Connecting to Android..."}
        </div>
      )}
    </div>
  );
}
