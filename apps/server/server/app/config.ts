import { LogLevels, type LogLevel } from "@pan/types";

export const MODES = ["PROD", "DEV"] as const;

export type Mode = (typeof MODES)[number];

export interface Config {
  mode: Mode;
  port: number;
  logLevel: LogLevel;
}

export const DEFAULT_CONFIG = {
  mode: "DEV",
  port: 3000,
  logLevel: "DEBUG",
} as const;

function parseMode(arg: string): Mode {
  if ((MODES as readonly string[]).includes(arg)) {
    return arg as Mode;
  }
  return DEFAULT_CONFIG.mode;
}

function parsePort(arg: string): number {
  const port = parseInt(arg);
  if (!isNaN(port) && port >= 0 && port <= 65535) {
    return port;
  }
  return DEFAULT_CONFIG.port;
}

function parseLogLevel(arg: string): LogLevel {
  if (arg in LogLevels) return arg as LogLevel;
  return DEFAULT_CONFIG.logLevel;
}

export function parseConfig(): Config {
  const args = process.argv.slice(2);
  const config: Config = DEFAULT_CONFIG;

  args.forEach((arg, index) => {
    if (arg.length === 0 || !arg.startsWith("--")) return;
    const nextArg = args[index + 1];
    if (nextArg === undefined) return;
    if (arg === "--mode") {
      config.mode = parseMode(nextArg);
    } else if (arg === "--port") {
      config.port = parsePort(nextArg);
    } else if (arg === "--log-level") {
      config.logLevel = parseLogLevel(nextArg);
    }
  });

  if (process.env.MODE !== undefined) {
    config.mode = parseMode(process.env.MODE);
  }
  if (process.env.PORT !== undefined) {
    config.port = parsePort(process.env.PORT);
  }
  if (process.env.LOG_LEVEL !== undefined) {
    config.logLevel = parseLogLevel(process.env.LOG_LEVEL);
  }

  return config;
}
