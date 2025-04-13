import { ACTION_KEY, type ServerAction } from "@pan/types";
import { join } from "path";
import { Injectable } from "../../app/store";
import { PoolFactory } from "../factory/pool";

const ACTIONS_DIR = join(import.meta.dirname, "actions");

export class ActionRunner extends Injectable {
  private poolFactory!: PoolFactory;

  override async inject() {
    this.poolFactory = this.store.get(PoolFactory.name);
  }

  async run(action: ServerAction) {
    const scriptPath = join(ACTIONS_DIR, action.config.filename);
    await Bun.write(scriptPath, action.config.file);
    return new Promise<void>((resolve, reject) => {
      this.poolFactory.create({ name: ACTION_KEY, scriptPath, size: 1 }).send({
        input: { key: ACTION_KEY, value: action.context },
        callback: (error: any) => {
          this.poolFactory.delete(ACTION_KEY);
          if (error === undefined) {
            resolve();
          } else {
            reject(error);
          }
        },
      });
    });
  }
}
