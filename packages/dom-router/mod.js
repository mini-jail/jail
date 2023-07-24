import {
  createComputed,
  createRoot,
  createSignal,
  inject,
  onCleanup,
  onMount,
  provide,
} from "jail/signal"
import { createComponent } from "jail/dom"

/**
 * @typedef {{ readonly [param: string]: string }} Params
 */

/**
 * @template [Type = any]
 * @typedef {() => Type} RouteHandler
 */

/**
 * @template [Type = any]
 * @typedef {{
 *   path: string
 *   regexp: RegExp
 *   handler: RouteHandler<Type>
 * }} Route
 */

/**
 * @template [Type = any]
 * @typedef {{ [path: string]: RouteHandler<Type> }} RouteMap
 */

/**
 * @template [Type = any]
 * @typedef {{
 *   fallback?: RouteHandler<Type>
 * }} RouterOptions
 */

/**
 * @template [Type = any]
 * @typedef {{
 *   type: "pathname" | "hash"
 *   fallback?: RouteHandler<Type>
 *   routeMap: RouteMap<Type>
 * }} RouterProperties
 */

const ParamsInjectionKey = Symbol()
export const path = createSignal("")

const routeTypeHandlerMap = {
  hash() {
    const hash = () => location.hash.slice(1) || "/"
    const listener = () => path(hash())
    onMount(() => {
      path(hash())
      addEventListener("hashchange", listener)
    })
    onCleanup(() => removeEventListener("hashchange", listener))
  },
  pathname() {
    const url = new URL(location.toString())
    /**
     * @param {MouseEvent} event
     */
    const clickListener = (event) => {
      let elt = event.target, pathname
      while (elt != null) {
        pathname = elt.getAttribute?.("href")
        if (pathname?.startsWith("/")) {
          event.preventDefault()
          if (pathname !== url.pathname) {
            path(pathname)
            url.pathname = pathname
            return history.pushState(null, "", url)
          }
        }
        elt = elt?.parentNode
      }
    }
    /**
     * @param {PopStateEvent} event
     */
    const popStateListener = (event) => {
      event.preventDefault()
      path(location.pathname)
    }
    onMount(() => {
      path(location.pathname)
      addEventListener("click", clickListener)
      addEventListener("popstate", popStateListener)
    })
    onCleanup(() => {
      removeEventListener("click", clickListener)
      removeEventListener("popstate", popStateListener)
    })
  },
}

export function getParams() {
  return inject(ParamsInjectionKey)
}

/**
 * @param {string} path
 * @returns {RegExp}
 */
function createMatcher(path) {
  return RegExp(
    "^" + path.replace(/:([^/:]+)/g, (_, name) => `(?<${name}>[^/]+)`) + "$",
  )
}

/**
 * @param {RouteMap} routeMap
 * @returns {Route[]}
 */
function createRoutes(routeMap) {
  return Object.keys(routeMap).map((path) => ({
    path,
    regexp: createMatcher(path),
    handler: routeMap[path],
  }))
}

/**
 * @template Type
 * @param {RouteMap<Type>} routeMap
 * @param {RouterOptions<Type>} options
 * @returns {() => Type | undefined}
 */
function createRouter(routeMap, options) {
  const routeArray = createRoutes(routeMap)
  return createComputed(() => {
    const nextPath = path()
    return createRoot(() => {
      for (const route of routeArray) {
        if (route.regexp.test(nextPath)) {
          provide(ParamsInjectionKey, route.regexp.exec(nextPath)?.groups)
          return route.handler()
        }
      }
      return options?.fallback?.()
    })
  })
}

/**
 * @template Type
 * @param {RouterProperties<Type>} props
 * @returns {[any, (() => Type | undefined)]}
 */
export function Router(props) {
  const router = createRouter(props.routeMap, {
    fallback: props.fallback,
  })
  routeTypeHandlerMap[props.type]()
  return [props.children, router]
}

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
export default function installRouter() {
  createComponent("Router", Router)
}
