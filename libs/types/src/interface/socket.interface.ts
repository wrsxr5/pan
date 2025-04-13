export const LOG_TOPIC = "LOG";
export const TOAST_TOPIC = "TOAST";

export type ToastStyle = "success" | "info" | "warning" | "error";

export interface Toast {
  duration: number;
  style: ToastStyle;
  message: string;
}

export interface SocketMessage {
  topic: string;
  data: string;
}

export interface StreamLogsRequest {
  enabled: boolean;
}
