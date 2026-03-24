import WebSocket from "ws";
import { v4 as uuid } from "uuid";
import {
  type EventFrame,
  type ResFrame,
  parseFrame,
} from "./protocol.js";
import { getOrCreateDeviceKeys, signConnectPayload } from "./device-auth.js";

const CLIENT_ID = "cli";
const CLIENT_MODE = "cli";
const PLATFORM = "docker";
const DEVICE_FAMILY = "server";
const ROLE = "operator";
const SCOPES = ["operator.read", "operator.write"];

type HandshakeResult = {
  connId: string;
  sessionDefaults: {
    defaultAgentId: string;
    mainSessionKey: string;
  };
  methods: string[];
};

export function performHandshake(
  ws: WebSocket,
  token: string,
): Promise<HandshakeResult> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("handshake timeout")),
      15000,
    );

    const keys = getOrCreateDeviceKeys();

    const onMessage = (data: WebSocket.Data) => {
      const frame = parseFrame(data.toString());
      if (!frame) return;

      if (frame.type === "event" && frame.event === "connect.challenge") {
        const challenge = frame as EventFrame;
        const nonce = challenge.payload.nonce as string;
        const reqId = uuid();

        const device = signConnectPayload({
          keys,
          clientId: CLIENT_ID,
          clientMode: CLIENT_MODE,
          role: ROLE,
          scopes: SCOPES,
          token,
          nonce,
          platform: PLATFORM,
          deviceFamily: DEVICE_FAMILY,
        });

        const connectReq = {
          type: "req",
          id: reqId,
          method: "connect",
          params: {
            minProtocol: 3,
            maxProtocol: 3,
            client: {
              id: CLIENT_ID,
              displayName: "Mini Maverick",
              version: "1.0.0",
              platform: PLATFORM,
              deviceFamily: DEVICE_FAMILY,
              mode: CLIENT_MODE,
            },
            role: ROLE,
            scopes: SCOPES,
            caps: [],
            commands: [],
            permissions: {},
            auth: { token },
            device,
            locale: "en-US",
            userAgent: "mini-maverick/1.0.0",
          },
        };

        ws.send(JSON.stringify(connectReq));
      }

      if (frame.type === "res") {
        const res = frame as ResFrame;
        clearTimeout(timeout);
        ws.removeListener("message", onMessage);

        if (res.ok && res.payload) {
          const payload = res.payload as Record<string, unknown>;
          const server = payload.server as Record<string, string>;
          const features = payload.features as Record<string, string[]>;
          const snapshot = payload.snapshot as Record<string, unknown>;
          const sessionDefaults = snapshot?.sessionDefaults as Record<
            string,
            string
          >;

          resolve({
            connId: server?.connId ?? "unknown",
            sessionDefaults: {
              defaultAgentId: sessionDefaults?.defaultAgentId ?? "main",
              mainSessionKey:
                sessionDefaults?.mainSessionKey ??
                "agent:main:webchat:direct:user1",
            },
            methods: features?.methods ?? [],
          });
        } else {
          console.error("[openclaw] handshake error:", JSON.stringify(res.error));
          reject(
            new Error(
              `handshake failed: ${res.error?.message ?? "unknown error"}`,
            ),
          );
        }
      }
    };

    ws.on("message", onMessage);
  });
}
