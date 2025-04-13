import type { Token, User, Verification } from "@pan/types";
import { randomUUIDv7 } from "bun";
import type { Endpoint, Interceptor } from "../../app/endpoint";
import { Injectable } from "../../app/store";
import { CacheFactory, type LocalCache } from "../factory/cache";

function extractCookie(headers: Headers) {
  const cookieHeader = headers.get("cookie");
  if (!cookieHeader) return "";
  const match = cookieHeader.match(/(?:^|; )pan_webui=([^;]*)/);
  return match ? match[1] : "";
}

export class Auth extends Injectable {
  private static ALLOWED_TOKEN = "ALLOWED";
  private static LOGIN_PATH = "/api/auth/login";
  private static VERIFY_PATH = "/api/auth/verify";
  private static CACHE_NAME = "AUTH_C";
  private users!: LocalCache<string, User>;
  private sessions = new Set<string>();
  private allowedPaths = new Map<string, Set<string>>();
  private contentPaths = new Set<string>();

  addAllowedPath(method: string, path: string, id: string) {
    const key = method + " " + path;
    const tokens = this.allowedPaths.get(key) || new Set<string>();
    tokens.add(id);
    this.allowedPaths.set(key, tokens);
    this.logger.debug("add allowed path", key, id);
  }

  removeAllowedPath(method: string, path: string, id: string) {
    const key = method + " " + path;
    const tokens = this.allowedPaths.get(key);
    if (tokens) {
      tokens.delete(id);
      if (tokens.size === 0) {
        this.allowedPaths.delete(key);
      }
      this.logger.debug("remove allowed path", key, id);
    }
  }

  addContentPath(method: string, path: string) {
    const key = method + " " + path;
    this.contentPaths.add(key);
    this.logger.info("add content path", key);
  }

  override async inject() {
    const cacheFactory: CacheFactory = this.store.get(CacheFactory.name);
    this.users = cacheFactory.get(Auth.CACHE_NAME);
    this.addAllowedPath("POST", Auth.LOGIN_PATH, Auth.ALLOWED_TOKEN);
    this.addAllowedPath("POST", Auth.VERIFY_PATH, Auth.ALLOWED_TOKEN);
  }

  private createSession() {
    const sessionId = randomUUIDv7();
    this.sessions.add(sessionId);
    return sessionId;
  }

  private register(user: User): Token {
    this.users.set(user.name, {
      name: user.name,
      hash: Bun.password.hashSync(user.hash),
    });
    this.logger.info(user.name, "registered");
    return { token: this.createSession() };
  }

  verify({ token }: Token): Verification {
    if (!token) return { authorized: false };
    return {
      authorized: this.sessions.has(token),
    };
  }

  login(user: User): Token {
    if (!user || !user.name || !user.hash) return {};
    if (this.users.size === 0) return this.register(user);
    const registered = this.users.get(user.name);
    if (registered === undefined) return {};
    if (!Bun.password.verifySync(user.hash, registered.hash)) return {};
    this.logger.info(user.name, "logged in");
    return { token: this.createSession() };
  }

  logout({ token }: Token) {
    if (token) {
      this.sessions.delete(token);
    }
  }

  private isAllowed(method: string, path: string, cookie: string) {
    const key = method + " " + path;
    if (this.contentPaths.has(key)) {
      return this.sessions.has(cookie);
    }
    const tokens = this.allowedPaths.get(key);
    if (tokens === undefined) {
      return false;
    }
    if (tokens.has(Auth.ALLOWED_TOKEN)) {
      return true;
    }
    return tokens.has(cookie);
  }

  private verifyAuthHeader(header: string | null) {
    if (!header || !header.startsWith("Bearer ")) return false;
    return this.sessions.has(header.slice(7));
  }

  interceptor(): Interceptor {
    return (route) => ({
      endpoint: route.endpoint,
      handler: (req, server) => {
        const url = new URL(req.url);
        const path = url.pathname;
        const method = req.method;
        const isAllowed = this.isAllowed(
          method,
          route.endpoint.path,
          extractCookie(req.headers)
        );
        if (
          !isAllowed &&
          !this.verifyAuthHeader(req.headers.get("Authorization"))
        ) {
          this.logger.warning("unauthorized", method, path);
          return new Response("Unauthorized", { status: 401 });
        }
        this.logger.debug(method, path);
        return route.handler(req, server);
      },
    });
  }

  override get endpoints(): Endpoint[] {
    return [
      {
        method: "POST",
        path: Auth.LOGIN_PATH,
        handle: (body) => this.login(body),
      },
      {
        method: "POST",
        path: Auth.VERIFY_PATH,
        handle: (body) => this.verify(body),
      },
      {
        method: "POST",
        path: "/api/auth/logout",
        handle: (body) => this.logout(body),
      },
    ];
  }
}
