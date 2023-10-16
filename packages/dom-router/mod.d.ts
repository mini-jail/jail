// deno-lint-ignore-file no-explicit-any
import type { Getter, Signal } from "jail/signal"

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
  routeMap: RouteMap<Type>
  children?: any
  fallback?: RouteHandler<Type>
}
export const path: Signal<string>
export function getParams(): Params | undefined
export function Router<Type>(
  props: RouterProperties<Type>,
): Getter<[children: any, result: Type]>
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
export function installDOMRouter(): void
