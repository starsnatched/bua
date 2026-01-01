declare module "rfb2" {
  interface RfbConnectionOptions {
    host: string;
    port: number;
    password?: string;
    securityType?: string;
  }

  interface RfbRect {
    x: number;
    y: number;
    width: number;
    height: number;
    data: Buffer;
    encoding: number;
  }

  interface RfbClient {
    width: number;
    height: number;
    on(event: "connect", listener: () => void): void;
    on(event: "error", listener: (err: Error) => void): void;
    on(event: "rect", listener: (rect: RfbRect) => void): void;
    on(event: "end", listener: () => void): void;
    requestUpdate(incremental: boolean, x: number, y: number, width: number, height: number): void;
    pointerEvent(x: number, y: number, buttonMask: number): void;
    keyEvent(keysym: number, isDown: boolean): void;
    end(): void;
  }

  function createConnection(options: RfbConnectionOptions | Record<string, unknown>): RfbClient;

  const rfb: {
    createConnection: typeof createConnection;
  };

  export { createConnection, RfbClient, RfbRect, RfbConnectionOptions };
  export default rfb;
}

