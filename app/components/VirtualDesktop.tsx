"use client";

import { useRef, useMemo, useEffect, useState, useCallback } from "react";

interface VirtualTabletProps {
  host?: string;
  port?: number;
  hideControls?: boolean;
  viewOnly?: boolean;
}

interface ContainerSize {
  width: number;
  height: number;
}

export default function VirtualTablet({
  host = "localhost",
  port = 6080,
  hideControls = false,
  viewOnly = false,
}: VirtualTabletProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [containerSize, setContainerSize] = useState<ContainerSize>({ width: 0, height: 0 });

  const viewerUrl = useMemo(
    () => `http://${host}:${port}/vnc_lite.html?autoconnect=true&resize=scale&reconnect=true${viewOnly ? "&view_only=true" : ""}`,
    [host, port, viewOnly]
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
    const base = {
      position: "absolute" as const,
      border: "none",
      background: "#000",
    };

    if (hideControls) {
      const controlBarHeight = 32;
      const sidebarWidth = 130;
      return {
        ...base,
        top: `-${controlBarHeight}px`,
        left: `-${sidebarWidth}px`,
        width: `calc(100% + ${sidebarWidth}px)`,
        height: `calc(100% + ${controlBarHeight}px)`,
      };
    }

    return {
      ...base,
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
    };
  }, [hideControls]);

  const overlayStyle = useMemo(() => ({
    position: "absolute" as const,
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    zIndex: 1000,
    cursor: "not-allowed",
    background: "transparent",
  }), []);

  const handleBlockEvent = useCallback((e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  return (
    <div
      ref={containerRef}
      className="tablet-stream-container"
      data-width={containerSize.width}
      data-height={containerSize.height}
    >
      <iframe
        ref={iframeRef}
        src={viewerUrl}
        style={iframeStyle}
        allow="clipboard-read; clipboard-write; fullscreen"
        title="Android Virtual Tablet Stream"
        tabIndex={viewOnly ? -1 : 0}
      />
      {viewOnly && (
        <div
          style={overlayStyle}
          onMouseDown={handleBlockEvent}
          onMouseUp={handleBlockEvent}
          onMouseMove={handleBlockEvent}
          onClick={handleBlockEvent}
          onDoubleClick={handleBlockEvent}
          onContextMenu={handleBlockEvent}
          onWheel={handleBlockEvent}
          onTouchStart={handleBlockEvent}
          onTouchMove={handleBlockEvent}
          onTouchEnd={handleBlockEvent}
          onDragStart={handleBlockEvent}
          onDrop={handleBlockEvent}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
