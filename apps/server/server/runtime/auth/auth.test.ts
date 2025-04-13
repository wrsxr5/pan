import { randomUUIDv7, type BunRequest, type Server } from "bun";
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { routeOf } from "../../app/endpoint";
import { storeOf } from "../../app/store.mock";
import { CacheFactory } from "../factory/cache";
import { Auth } from "./auth";

let auth: Auth;
let factory: CacheFactory;

beforeAll(async () => {
  const store = await storeOf([Auth, CacheFactory]);
  auth = store.get(Auth.name);
  factory = store.get(CacheFactory.name);
});

afterAll(async () => {
  await factory.clear();
});

describe("Auth", () => {
  it("should register user", () => {
    const user = {
      name: "test",
      hash: "1234",
    };
    const { token } = auth.login(user);
    expect(token).toBeString();
    expect(auth.verify({ token }).authorized).toBe(true);
  });

  it("should not login", () => {
    const user = {
      name: "test",
      hash: "4321",
    };
    const { token } = auth.login(user);
    expect(token).toBeUndefined();
  });

  it("should logout", () => {
    const user = {
      name: "test",
      hash: "1234",
    };
    const token = auth.login(user);
    auth.logout(token);
    expect(auth.verify(token).authorized).toBe(false);
  });

  it("should add allowed path", async () => {
    const content = { allowed: true };
    const handler = auth.interceptor()(
      routeOf({
        path: "/api/test",
        handle: () => content,
      })
    ).handler;
    const id = randomUUIDv7();
    const server = {} as Server;
    const req = new Request("http://localhost/api/test", {
      headers: {
        cookie: `pan_webui=${id}`,
      },
    }) as BunRequest;
    auth.addAllowedPath("GET", "/api/test", id);
    const resp = await (await handler(req, server)).json();
    expect(resp.allowed).toBe(content.allowed);
  });
});
