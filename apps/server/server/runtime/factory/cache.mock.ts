import { Injectable } from "../../app/store";
import { fromBase64 } from "../../util/util";
import { CacheFactory, type Row } from "./cache";

export class MockedLocalCache<K, V> {
  private cache = new Map<K, V>();

  constructor(public name: string) {}

  get(k: K) {
    return this.cache.get(k);
  }

  has(k: K) {
    return this.cache.has(k);
  }

  get size() {
    return this.cache.size;
  }

  get keys() {
    return this.cache.keys();
  }

  forEach(callback: (v: V, k: K) => void) {
    this.cache.forEach((v, k) => {
      callback(v, k);
    });
  }

  delete(k: K) {
    return this.cache.delete(k);
  }

  set(k: K, v: V) {
    this.cache.set(k, v);
  }

  addCacheRow(row: Row) {
    if (!row.value || row.value.length === 0) return;
    (fromBase64(row.value) as [K, V][]).forEach(([k, v]) =>
      this.cache.set(k, v)
    );
  }
}

export class MockedCacheFactory extends Injectable {
  private storage = new Map<string, MockedLocalCache<any, any>>();

  override get name() {
    return CacheFactory.name;
  }

  get<K, V>(name: string) {
    let cache = this.storage.get(name);
    if (cache === undefined) {
      cache = new MockedLocalCache(name);
      this.storage.set(name, cache);
    }
    return cache as MockedLocalCache<K, V>;
  }

  async clear() {
    this.storage.clear();
  }
}
