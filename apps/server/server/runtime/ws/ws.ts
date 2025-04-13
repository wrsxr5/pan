import {
  LOG_TOPIC,
  TOAST_TOPIC,
  type SocketMessage,
  type StreamLogsRequest,
  type ToastStyle,
} from "@pan/types";
import type { Server, WebSocketHandler } from "bun";
import type { Endpoint } from "../../app/endpoint";
import { Injectable } from "../../app/store";
import { Auth } from "../auth/auth";

export class WS extends Injectable {
  private static WS_PATH = "/ws";
  private static DEFAULT_TOPIC = "PAN";
  private server: Server | null = null;

  override async inject() {
    const auth = this.store.get<Auth>(Auth.name);
    auth.addContentPath("GET", WS.WS_PATH);
  }

  init(server: Server) {
    this.server = server;
  }

  publish(message: SocketMessage) {
    if (!this.server) return;
    this.server.publish(WS.DEFAULT_TOPIC, JSON.stringify(message));
  }

  toast(style: ToastStyle, message: string, duration = 2333) {
    if (!this.server) return;
    this.publish({
      topic: TOAST_TOPIC,
      data: JSON.stringify({ style, message, duration }),
    });
  }

  get handler(): WebSocketHandler {
    return {
      open: (ws) => {
        this.logger.debug("open", ws.remoteAddress);
        ws.subscribe(WS.DEFAULT_TOPIC);
      },
      close: (ws) => {
        this.logger.debug("close", ws.remoteAddress);
        ws.unsubscribe(WS.DEFAULT_TOPIC);
      },
      message: (ws, msg) => {
        this.logger.debug("message", ws.remoteAddress, msg);
      },
    };
  }

  private upgrade(req: Request) {
    if (!this.server) {
      this.logger.warning("no ws server");
      return;
    }
    this.server.upgrade(req);
  }

  private streamLogs({ enabled }: StreamLogsRequest) {
    if (enabled === true) {
      this.store.sessionLogger.callback = (entry) =>
        this.publish({
          topic: LOG_TOPIC,
          data: JSON.stringify(entry),
        });
    } else {
      this.store.sessionLogger.callback = null;
    }
  }

  override get endpoints(): Endpoint[] {
    return [
      {
        path: WS.WS_PATH,
        handle: (_, req) => this.upgrade(req),
      },
      {
        method: "POST",
        path: "/api/stream/logs",
        handle: (body) => this.streamLogs(body),
      },
    ];
  }
}
