import { sql, type TransactionSQL } from "bun";
import { Injectable } from "../../app/store";
import { SessionLogger, type Logger } from "../../util/logger";
import { fromBase64, toBase64 } from "../../util/util";

function insertCommandOf(obj: any) {
  const keys = Object.keys(obj);
  if (keys.length === 0) {
    throw new TypeError("unknown object: " + obj);
  }
  const ks = keys.join(", ");
  const vs = keys
    .map((k) => {
      const v = obj[k];
      if (typeof v === "number") return v;
      return `'${v}'`;
    })
    .join(", ");
  return `(${ks}) VALUES (${vs})`;
}

export interface Row {
  name: string;
  chunk: number;
  value: string;
}

export class LocalCache<K, V> {
  private static CHUNK_SIZE = 233;
  private static PERSIST_TIMEOUT = 2333;
  private logger: Logger;
  private _keys = new Map<K, number>();
  private chunks = new Map<number, Map<K, V>>();
  private nextChunkId = 0;
  private availableChunks: number[] = [];
  private persistedChunks = new Set<number>();
  private dirtyChunks = new Set<number>();
  private persistTimer: Timer | null = null;

  constructor(
    public name: string,
    sessionLogger: SessionLogger
  ) {
    this.logger = sessionLogger.getLogger(name);
  }

  clearTimer() {
    if (this.persistTimer !== null) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }
  }

  private checkTimer() {
    this.clearTimer();
    this.persistTimer = setTimeout(
      () => this.persist(),
      LocalCache.PERSIST_TIMEOUT
    );
  }

  get(k: K) {
    const chunkId = this._keys.get(k);
    if (chunkId !== undefined) {
      const map = this.chunks.get(chunkId);
      if (map !== undefined) {
        return map.get(k);
      }
    }
    return undefined;
  }

  has(k: K) {
    return this._keys.has(k);
  }

  get size() {
    return this._keys.size;
  }

  get keys() {
    return this._keys.keys();
  }

  forEach(callback: (v: V, k: K) => void) {
    this._keys.forEach((id, key) => {
      callback(this.chunks.get(id)!.get(key)!, key);
    });
  }

  delete(k: K) {
    const chunkId = this._keys.get(k);
    if (chunkId === undefined) return false;
    this._keys.delete(k);
    const map = this.chunks.get(chunkId);
    if (map === undefined) return false;
    if (!map.has(k)) return false;
    map.delete(k);
    this.dirtyChunks.add(chunkId);
    if (
      !this.availableChunks.includes(chunkId) &&
      map.size < LocalCache.CHUNK_SIZE
    ) {
      this.availableChunks.push(chunkId);
    }
    this.checkTimer();
    return true;
  }

  private getValue(chunkId: number) {
    const chunk = this.chunks.get(chunkId);
    if (chunk === undefined) {
      return "";
    }
    return toBase64(Array.from(chunk.entries()));
  }

  private async insert(tx: TransactionSQL, chunkId: number) {
    const row: Row = {
      name: this.name,
      chunk: chunkId,
      value: this.getValue(chunkId),
    };
    await tx.unsafe(`INSERT INTO cache ${insertCommandOf(row)}`);
    this.logger.debug("insert chunk", chunkId);
  }

  private async update(tx: TransactionSQL, chunkId: number) {
    const value = this.getValue(chunkId);
    const filter = `name = '${this.name}' AND chunk = ${chunkId}`;
    await tx.unsafe(`UPDATE cache SET value = '${value}' WHERE ${filter}`);
    this.logger.debug("update chunk", chunkId);
  }

  private async persist() {
    await sql.begin(async (tx) => {
      for (const chunkId of this.dirtyChunks) {
        if (this.persistedChunks.has(chunkId)) {
          await this.update(tx, chunkId);
        } else {
          await this.insert(tx, chunkId);
          this.persistedChunks.add(chunkId);
        }
      }
    });
    this.dirtyChunks.clear();
  }

  set(k: K, v: V) {
    let chunkId = this._keys.get(k);
    if (chunkId === undefined) {
      if (this.availableChunks.length > 0) {
        chunkId = this.availableChunks[0];
      } else {
        chunkId = this.nextChunkId;
        this.nextChunkId += 1;
        this.availableChunks.push(chunkId);
      }
    }
    this._keys.set(k, chunkId);
    let map = this.chunks.get(chunkId);
    if (map === undefined) {
      map = new Map<K, V>();
      this.chunks.set(chunkId, map);
    }
    map.set(k, v);
    this.dirtyChunks.add(chunkId);
    if (map.size >= LocalCache.CHUNK_SIZE) {
      this.availableChunks.shift();
    }
    this.checkTimer();
  }

  addCacheRow(row: Row) {
    if (!row.value || row.value.length === 0) return;
    const chunkId = Number(row.chunk);
    const value = fromBase64(row.value) as [K, V][];
    const map = new Map<K, V>(value);
    map.keys().forEach((k) => this._keys.set(k, chunkId));
    this.chunks.set(chunkId, map);
    if (map.size < LocalCache.CHUNK_SIZE) {
      this.availableChunks.push(chunkId);
    }
    if (chunkId > this.nextChunkId) {
      this.nextChunkId = chunkId + 1;
    }
    this.persistedChunks.add(chunkId);
    this.logger.debug("init chunk", chunkId);
  }
}

export class CacheFactory extends Injectable {
  private storage = new Map<string, LocalCache<any, any>>();

  get<K, V>(name: string) {
    let cache = this.storage.get(name);
    if (cache === undefined) {
      cache = new LocalCache(name, this.store.sessionLogger);
      this.storage.set(name, cache);
    }
    return cache as LocalCache<K, V>;
  }

  override async inject() {
    if (!(await this.hasTable())) {
      await this.createTable();
    }
    const ids: { id: number }[] = await sql`SELECT (id) FROM cache`;
    for (const { id } of ids) {
      await this.addCacheRow(id);
    }
  }

  private async getRow(id: number) {
    const [row]: Row[] = await sql`SELECT * FROM cache WHERE id = ${id}`;
    return row;
  }

  private async addCacheRow(id: number) {
    const row = await this.getRow(id);
    this.get(row.name).addCacheRow(row);
  }

  private async hasTable() {
    const res = await sql`
      SELECT 1 
      FROM information_schema.tables 
      WHERE table_name = 'cache'
    `;
    return res.length == 1;
  }

  private async createTable() {
    await sql.begin(async (tx) => {
      await tx`CREATE TABLE cache (
          id    SERIAL      PRIMARY KEY,
          name  VARCHAR(16) NOT NULL,
          chunk BIGINT      NOT NULL,
          value TEXT        NOT NULL
      )`;
      await tx`CREATE INDEX idx_cache_name  ON cache (name)`;
      await tx`CREATE INDEX idx_cache_chunk ON cache (name, chunk)`;
    });
  }

  async clear() {
    this.storage.forEach((v) => v.clearTimer());
    await sql`DROP TABLE IF EXISTS cache`;
    this.storage.clear();
  }
}
