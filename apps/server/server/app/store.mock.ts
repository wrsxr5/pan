import { CacheFactory } from "../runtime/factory/cache";
import { MockedCacheFactory } from "../runtime/factory/cache.mock";
import { isDBDefined } from "../runtime/runtime";
import { DEFAULT_CONFIG } from "./config";
import { Store, type Injectable } from "./store";

export async function storeOf(items: (typeof Injectable)[]) {
  const store = new Store(DEFAULT_CONFIG);
  for (const item of items) {
    if (item.name === CacheFactory.name) {
      if (isDBDefined()) {
        const injectable = new item(store);
        await (injectable as CacheFactory).clear();
      } else {
        new MockedCacheFactory(store);
      }
    } else {
      new item(store);
    }
  }
  await store.inject();
  await store.afterInjected();
  return store;
}
