// P1 transport: WebSocket in/out. Validates every frame, then hands off to GlyService.
// It never awaits a handler before reading the next frame, so the chat never blocks.
//
// Client -> server frames:
//   { "type": "user_message", "text": "..." }
//   { "type": "approval", "proposalId": "...", "decision": "approve" | "reject" }
// Connect with ws://host:port/chat?sessionId=...&userId=...
// (In production the userId must come from your auth token, not the URL.)

import type { IncomingMessage, Server } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { z } from "zod";
import type { Logger } from "../../shared/logging/index.ts";
import type { GlyService } from "./handler.ts";
import { MAX_MESSAGE_CHARS } from "./handler.ts";
import type { OutboundEvent } from "./outbound.ts";

const ClientFrame = z.discriminatedUnion("type", [
  z.object({ type: z.literal("user_message"), text: z.string().max(MAX_MESSAGE_CHARS * 2) }),
  z.object({ type: z.literal("approval"), proposalId: z.string().min(1).max(200), decision: z.enum(["approve", "reject"]) }),
]);

const ID = /^[A-Za-z0-9_-]{1,100}$/;

export function attachChatSocket(server: Server, gly: GlyService, log: Logger) {
  const wss = new WebSocketServer({ server, path: "/chat", maxPayload: 64 * 1024 });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const sessionId = url.searchParams.get("sessionId") ?? "";
    const userId = url.searchParams.get("userId") ?? "";
    if (!ID.test(sessionId) || !ID.test(userId)) {
      ws.close(1008, "sessionId and userId are required");
      return;
    }

    try {
      gly.sessions.open(sessionId, userId);
    } catch {
      ws.close(1008, "session belongs to another user");
      return;
    }

    const send = (e: OutboundEvent) => {
      if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(e));
    };
    gly.delivery.connect(sessionId, send); // also flushes the offline inbox
    log.info("socket connected", { sessionId });

    ws.on("message", (data) => {
      let frame: z.infer<typeof ClientFrame>;
      try {
        frame = ClientFrame.parse(JSON.parse(String(data)));
      } catch {
        send({ type: "error", text: "I couldn't read that message." });
        return;
      }
      // Fire and forget: each message is handled on its own.
      if (frame.type === "user_message") void gly.handleUserMessage({ sessionId, userId, text: frame.text });
      else void gly.handleApproval({ sessionId, userId, proposalId: frame.proposalId, decision: frame.decision });
    });

    ws.on("close", () => {
      gly.delivery.disconnect(sessionId, send);
      log.info("socket closed", { sessionId });
    });
  });

  return wss;
}
