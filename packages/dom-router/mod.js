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
 * @typedef {"pathname" | "hash"} RouterType
 * @typedef {{ readonly [param: string]: string }} Params
 */
/**
 * @template [Type = *]
 * @typedef {() => Type} RouteHandler
 */
/**
 * @template [Type = *]
 * @typedef {{
 *   path: string
 *   regexp: RegExp
 *   handler: RouteHandler<Type>
 * }} Route
 */
/**
 * @template [Type = *]
 * @typedef {{ [path: string]: RouteHandler<Type> }} RouteMap
 */
/**
 * @template [Type = *]
 * @typedef {{
 *   fallback?: RouteHandler<Type>
 * }} RouterOptions
 */
/**
 * @template [Type = *]
 * @typedef {{
 *   type: RouterType
 *   routeMap: RouteMap<Type>
 *   children?: *
 *   fallback?: RouteHandler<Type>
 * }} RouterProperties
 */

const ParamsInjectionKey = Symbol()
export const path = createSignal("")

const routeTypeHandlerMap = {
  hash() {
    const hash = () => location.hash.slice(1) || "/"
    const hashChangeListener = () => path(hash())
    onMount(() => {
      path(hash())
      addEventListener("hashchange", hashChangeListener)
    })
    onCleanup(() => removeEventListener("hashchange", hashChangeListener))
  },
  pathname() {
    const url = new URL(location.toString())
    /** @type {import("jail/dom").DOMListener & ((this: Window, event: MouseEvent) => void)} */
    const clickListener = (event) => {
      /** @type {HTMLElement | null} */
      let elt = event.target
      /** @type {string | undefined | null} */
      let pathname
      while (elt != null) {
        pathname = elt?.getAttribute?.("href")
        if (pathname?.startsWith("/")) {
          event.preventDefault()
          if (pathname !== url.pathname) {
            path(pathname)
            url.pathname = pathname
            return history.pushState(null, "", url)
          }
        }
        elt = elt?.parentElement
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

/**
 * @returns {Params | undefined}
 */
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
 * @param {RouteMap} routeMap
 * @param {RouterOptions} options
 * @returns {import("jail/signal").Getter}
 */
function createRouter(routeMap, options) {
  const routeArray = createRoutes(routeMap)
  return createComputed(() => {
    const nextPath = path()
    return createRoot(() => {
      for (const route of routeArray) {
        if (route.regexp.test(nextPath)) {
          const params = route.regexp.exec(nextPath)?.groups
          provide(ParamsInjectionKey, params)
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
 * @returns {() => [children, import("jail/signal").Getter<Type | undefined>]}
 */
export function Router({ routeMap, type, fallback, children }) {
  routeTypeHandlerMap[type]()
  const router = createRouter(routeMap, { fallback })
  return () => [children, router]
}

/**
 * Allows usage of the following:
 * @example
 * ```javascript
 * const routeMap = {
 *   "/": () => { ... }
 * }
 * const fallbackRoute = () => { ... }
 * template`
 *   <Router
 *     type="hash"
 *     routeMap=${routeMap}
 *     fallback=${fallbackRoute}
 *   />
 * `
 * ```
 * @returns {void}
 */
export function installDOMRouter() {
  // @ts-expect-error: honestly? no idea for now
  createComponent("Router", Router)
}
