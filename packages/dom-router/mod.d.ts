import type { Getter, Signal } from "jail/signal"

declare global {
  interface InjectionValueMap {
    [PARAMS_INJECTION_KEY]?: Params
  }
  interface ComponentPropertyMap {
    Router: RouterProperties
  }
}

export type RouterType = "pathname" | "hash"
export type Params = { readonly [param: string]: string }
export type RouteHandler<Type = any> = Getter<Type>
export type Route<Type = any> = {
  path: string
  regexp: RegExp
  handler: RouteHandler<Type>
}
export type RouteMap<Type = any> = { [path: string]: RouteHandler<Type> }
export type RouterOptions<Type = any> = {
  fallback?: RouteHandler<Type>
}
export type RouterProperties<Type = any> = {
  type: RouterType
  fallback?: RouteHandler<Type>
  routeMap: RouteMap<Type>
}
export const PARAMS_INJECTION_KEY: unique symbol
export const path: Signal<string>
export function getParams(): Params | undefined
export function Router<Type>(
  props: RouterProperties<Type>,
): [any, Getter<Type | undefined>]
/**
 * Allows usage of the following:
 * @example
 * ```javascript
 * const routeMap = {
 *   "/": () => {
 *     ...
 *   }
 * }
 * const fallbackRoute = () => {
 *   ...
 * }
 * template`
 *   <Router type="hash" routeMap=${routeMap} fallback=${fallbackRoute} />
 * `
 * ```
 */
export function install(): void
