import type { Config } from "../app/config";
import { getLogger } from "./logger";

export interface Command {
  key: string;
  value: any;
}

export interface Child {
  idle: boolean;
  worker: Worker;
}

export interface Instruction {
  input: Command;
  callback?: (output: any) => void;
}

export interface Handler {
  [key: string]: (value: any) => any;
}

export function register(worker: Worker, handler: Handler) {
  worker.onmessage = async (event: MessageEvent) => {
    const command = event.data as Command;
    if (command.key in handler) {
      const value = await handler[command.key](command.value);
      worker.postMessage({ key: command.key, value });
    } else {
      worker.postMessage({ key: command.key });
    }
  };
}

export class Pool {
  private logger;
  private children: Child[] = [];

  private addChild(id: number, scriptPath: string, init?: Instruction) {
    const name = this.name + "_" + id;
    const child = { idle: true, worker: new Worker(scriptPath, { name }) };
    init = init || { input: { key: "init", value: {} } };
    init.input.value.name = name;
    init.input.value.config = this.config;
    this.instruct(child, init);
    this.children.push(child);
  }

  constructor(
    private name: string,
    scriptPath: string,
    private config: Config,
    size?: number,
    init?: Instruction
  ) {
    this.logger = getLogger(name, config.logLevel);
    if (size === undefined || size <= 0 || size >= 11) {
      size = 4;
    }
    for (let i = 0; i < size; i++) {
      this.addChild(i, scriptPath, init);
    }
    this.logger.debug("created");
  }

  private async child() {
    while (true) {
      for (const child of this.children) {
        if (child.idle) {
          child.idle = false;
          return child;
        }
      }
      await Bun.sleep(233);
    }
  }

  private instruct(child: Child, inst: Instruction) {
    child.idle = false;
    child.worker.postMessage(inst.input);
    let callback: (output: any) => void = () => {};
    if (inst.callback !== undefined && typeof inst.callback === "function") {
      callback = inst.callback;
    }
    child.worker.onmessage = (event: MessageEvent) => {
      callback(event.data.value);
      child.worker.onmessage = null;
      child.idle = true;
    };
  }

  async send(inst: Instruction) {
    const child = await this.child();
    this.instruct(child, inst);
  }

  clear() {
    this.children.forEach((child) => {
      child.worker.terminate();
    });
    this.children = [];
    this.logger.debug("cleared");
  }
}
