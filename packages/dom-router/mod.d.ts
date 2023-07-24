import type { ParamsInjectionKey } from "jail/dom-router"
import type { Getter, Signal } from "jail/signal"

declare module "jail/signal" {
  interface InjectionValues {
    [ParamsInjectionKey]?: Params
  }
}

declare module "jail/dom-router" {
  type RouterType = "pathname" | "hash"
  type Params = { readonly [param: string]: string }
  type RouteHandler<Type = any> = Getter<Type>
  type Route<Type = any> = {
    path: string
    regexp: RegExp
    handler: RouteHandler<Type>
  }
  type RouteMap<Type = any> = { [path: string]: RouteHandler<Type> }
  type RouterOptions<Type = any> = {
    fallback?: RouteHandler<Type>
  }
  type RouterProperties<Type = any> = {
    type: RouterType
    fallback?: RouteHandler<Type>
    routeMap: RouteMap<Type>
  }
  const ParamsInjectionKey: unique symbol
  const path: Signal<string>
  function getParams(): Params | undefined
  function Router<Type>(
    props: RouterProperties<Type>,
  ): [any, import("jail/signal").Getter<Type | undefined>]
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
   *   <Router
   *     type="hash"
   *     routeMap=${routeMap}
   *     fallback=${fallbackRoute}>
   *   </Router>
   * `
   * ```
   */
  function install(): void
}
