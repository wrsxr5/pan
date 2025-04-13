export const LogLevels = {
  TRACE: -1,
  DEBUG: 0,
  INFO: 1,
  WARNING: 2,
  ERROR: 3,
} as const;

export type LogLevel = keyof typeof LogLevels;

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  source: string;
  message: string;
}
