import type { BunRequest, RouterTypes } from "bun";

export interface Endpoint<T extends string = string> {
  method?: RouterTypes.HTTPMethod;
  path: T;
  handle: (body: any, req: BunRequest<T>) => any;
  as?: (result: any) => Response;
}

export type Interceptor<T extends string = string> = (
  handler: EndpointRoute<T>
) => EndpointRoute<T>;

export interface EndpointRoute<T extends string> {
  endpoint: Endpoint<T>;
  handler: RouterTypes.RouteHandler<T>;
}

export function routeOf<T extends string>(
  endpoint: Endpoint<T>
): EndpointRoute<T> {
  return {
    endpoint,
    handler: async (req) => {
      let body: any;
      if (req.method === "GET") {
        body = req.params;
      } else {
        try {
          body = await req.json();
        } catch {
          body = {};
        }
      }
      const result = await endpoint.handle(body, req);
      if (endpoint.as) {
        return endpoint.as(result);
      }
      return Response.json(result);
    },
  };
}
