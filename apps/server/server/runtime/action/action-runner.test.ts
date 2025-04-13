import type { ServerAction } from "@pan/types";
import { beforeAll, describe, expect, it } from "bun:test";
import { join } from "path";
import { storeOf } from "../../app/store.mock";
import { PoolFactory } from "../factory/pool";
import { ActionRunner } from "./action-runner";

let actionRunner: ActionRunner;

beforeAll(async () => {
  const store = await storeOf([ActionRunner, PoolFactory]);
  actionRunner = store.get(ActionRunner.name);
});

describe("ActionRunner", () => {
  it("should have name", () => {
    expect(actionRunner.name).toBe(ActionRunner.name);
  });

  it("should run example action", async () => {
    const filename = "example.worker.ts";
    const filePath = join(import.meta.dirname, "actions", filename);
    const file = await Bun.file(filePath).text();
    const exampleAction: ServerAction = {
      config: { name: "example", type: "SERVER", filename, file },
      context: {
        directory: "/test",
        selectedEntries: ["selected.a", "selected.b"],
      },
    };
    await actionRunner.run(exampleAction);
  });

  it("should run example action with error", async () => {
    const filename = "error-example.worker.ts";
    const filePath = join(import.meta.dirname, "actions", filename);
    const file = await Bun.file(filePath).text();
    const exampleAction: ServerAction = {
      config: { name: "error-example", type: "SERVER", filename, file },
      context: {
        directory: "/test/error",
        selectedEntries: ["selected.a", "selected.b"],
      },
    };
    let error;
    try {
      await actionRunner.run(exampleAction);
    } catch (err) {
      error = err;
    }
    expect(error).toBeDefined();
    expect((error as Error).message).toBe("an error occurred");
  });
});
