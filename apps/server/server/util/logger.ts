import { type LogEntry, type LogLevel, LogLevels } from "@pan/types";

type Printer = (...messages: any[]) => void;

export interface Logger {
  trace: Printer;
  debug: Printer;
  info: Printer;
  warning: Printer;
  error: Printer;
}

const COLORS = {
  BLUE: "\x1b[34m",
  YELLOW: "\x1b[33m",
  RED: "\x1b[31m",
} as const;

type COLOR = keyof typeof COLORS;

const RESET = "\x1b[0m" as const;

function pad(text: string, length = 11) {
  if (text.length >= length) {
    return text.slice(0, length);
  }
  return text.padEnd(length, " ");
}

function log(
  config: LogLevel,
  forLevel: LogLevel,
  name: string,
  color?: COLOR
): Printer {
  if (LogLevels[config] > LogLevels[forLevel]) {
    return () => {};
  }
  const label = pad(forLevel);
  return (...messages: any[]) => {
    const timestamp = new Date().toISOString();
    let message = `${label} ${messages.join(" ")}`;
    if (color !== undefined) {
      message = COLORS[color] + message + RESET;
    }
    console.log(timestamp, name, message);
  };
}

function colorOf(level: LogLevel) {
  switch (level) {
    case "INFO":
      return "BLUE";
    case "WARNING":
      return "YELLOW";
    case "ERROR":
      return "RED";
    default:
      return;
  }
}

export function getLogger(name: string, level: LogLevel): Logger {
  name = pad(name);
  return {
    trace: log(level, "TRACE", name),
    debug: log(level, "DEBUG", name),
    info: log(level, "INFO", name, colorOf("INFO")),
    warning: log(level, "WARNING", name, colorOf("WARNING")),
    error: log(level, "ERROR", name, colorOf("ERROR")),
  };
}

function printLogEntry(entry: LogEntry) {
  let message = `${pad(entry.level)} ${entry.message}`;
  const color = colorOf(entry.level);
  if (color !== undefined) {
    message = COLORS[color] + message + RESET;
  }
  console.log(entry.timestamp.toISOString(), pad(entry.source), message);
}

type LoggerCallback = (msg: LogEntry) => void;

export class SessionLogger {
  private static CACHE_SIZE = 23333;
  callback: LoggerCallback | null = null;
  logs: LogEntry[] = [];

  constructor(private level: LogLevel) {}

  private addEntry(entry: LogEntry) {
    this.logs.push(entry);
    this.logs = this.logs.slice(-SessionLogger.CACHE_SIZE);
  }

  private log(level: LogLevel, source: string) {
    if (LogLevels[this.level] > LogLevels[level]) {
      return () => {};
    }
    return (...messages: any[]) => {
      const entry: LogEntry = {
        timestamp: new Date(),
        level,
        source,
        message: messages.join(" "),
      };
      this.addEntry(entry);
      printLogEntry(entry);
      if (this.callback !== null) {
        this.callback(entry);
      }
    };
  }

  getLogger(source: string): Logger {
    return {
      trace: this.log("TRACE", source),
      debug: this.log("DEBUG", source),
      info: this.log("INFO", source),
      warning: this.log("WARNING", source),
      error: this.log("ERROR", source),
    };
  }
}
