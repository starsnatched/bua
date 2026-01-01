"use client";

import { useRef, useMemo, useEffect, useState, useCallback } from "react";

interface VirtualDesktopProps {
  host?: string;
  port?: number;
  hideControls?: boolean;
}

interface ContainerSize {
  width: number;
  height: number;
}

export default function VirtualDesktop({
  host = "localhost",
  port = 8006,
  hideControls = false,
}: VirtualDesktopProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [containerSize, setContainerSize] = useState<ContainerSize>({ width: 0, height: 0 });

  const viewerUrl = useMemo(
    () => `http://${host}:${port}/vnc_lite.html?autoconnect=true&resize=scale&reconnect=true`,
    [host, port]
  );

  const updateSize = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setContainerSize({ width: rect.width, height: rect.height });
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    updateSize();

    const resizeObserver = new ResizeObserver(() => {
      updateSize();
    });

    resizeObserver.observe(container);

    const handleResize = () => {
      updateSize();
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, [updateSize]);

  const iframeStyle = useMemo(() => {
    if (hideControls) {
      const controlBarHeight = 32;
      const sidebarWidth = 130;
      return {
        position: "absolute" as const,
        top: `-${controlBarHeight}px`,
        left: `-${sidebarWidth}px`,
        width: `calc(100% + ${sidebarWidth}px)`,
        height: `calc(100% + ${controlBarHeight}px)`,
        border: "none",
        background: "#000",
      };
    }
    return {
      position: "absolute" as const,
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      border: "none",
      background: "#000",
    };
  }, [hideControls]);

  return (
    <div
      ref={containerRef}
      className="desktop-stream-container"
      data-width={containerSize.width}
      data-height={containerSize.height}
    >
      <iframe
        ref={iframeRef}
        src={viewerUrl}
        style={iframeStyle}
        allow="clipboard-read; clipboard-write; fullscreen"
        title="Windows Virtual Desktop Stream"
      />
    </div>
  );
}
