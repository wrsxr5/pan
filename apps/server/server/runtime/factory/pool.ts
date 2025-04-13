import { Injectable } from "../../app/store";
import { Pool, type Instruction } from "../../util/worker";

export interface PoolConfig {
  name: string;
  scriptPath: string;
  size?: number;
  init?: Instruction;
}

export class PoolFactory extends Injectable {
  private pools = new Map<string, Pool>();

  create({ name, scriptPath, size, init }: PoolConfig) {
    this.delete(name);
    const pool = new Pool(name, scriptPath, this.store.config, size, init);
    this.pools.set(name, pool);
    return pool;
  }

  get(name: string) {
    return this.pools.get(name);
  }

  delete(name: string) {
    const pool = this.pools.get(name);
    if (pool !== undefined) {
      pool.clear();
      this.pools.delete(name);
    }
  }
}
