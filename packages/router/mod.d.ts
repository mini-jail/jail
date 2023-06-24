declare global {
  type RouteHandler<T = unknown> = {
    (): T;
  };

  type Params = {
    [param: string]: string;
  };

  type Route<T = unknown> = {
    path: string;
    regexp: RegExp;
    handler: RouteHandler<T>;
  };

  type RouteMap<T = unknown> = {
    [path: string]: RouteHandler<T>;
  };
}

export const path: Signal<string>;

export function params(): Params;

export function routed<T>(routeMap: RouteMap<T>): () => T | undefined;
