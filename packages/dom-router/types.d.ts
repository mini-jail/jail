import type { ParamsInjectionKey } from "./mod.js"

export type RouteHandler<T = any> = {
  (): T
}

export type Params = {
  [param: string]: string
}

export type Route<T = any> = {
  path: string
  regexp: RegExp
  handler: RouteHandler<T>
}

export type RouteMap<T = any> = {
  [path: string]: RouteHandler<T>
}

export type RouterOptions<T> = {
  fallback?: RouteHandler<T>
}

export interface RouterProps<T = any> {
  type: "pathname" | "hash"
  fallback?: RouteHandler<T>
  routeMap: RouteMap<T>
}

declare global {
  interface ComponentMap {
    Router: (props: RouterProps) => any
  }

  interface InjectionMap {
    [ParamsInjectionKey]?: Params
  }
}
