import {
  createComputed,
  createRoot,
  createSignal,
  inject,
  onCleanup,
  onMount,
  provide,
} from "space/signal"

export const paramsSymbol = Symbol("Params")
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
    const clickListener = (event) => {
      let elt = event.target
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
 * @returns {space.Params | undefined}
 */
export function getParams() {
  return inject(paramsSymbol)
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
 * @param {space.RouteMap} routeMap
 * @returns {space.Route[]}
 */
function createRoutes(routeMap) {
  return Object.keys(routeMap).map((path) => ({
    path,
    regexp: createMatcher(path),
    handler: routeMap[path],
  }))
}

/**
 * @param {space.RouteMap} routeMap
 * @param {space.RouterOptions} options
 * @returns {space.Getter}
 */
function createRouter(routeMap, options) {
  const routeArray = createRoutes(routeMap)
  return createComputed(() => {
    const nextPath = path()
    return createRoot(() => {
      for (const route of routeArray) {
        if (route.regexp.test(nextPath)) {
          provide(paramsSymbol, route.regexp.exec(nextPath)?.groups)
          return route.handler()
        }
      }
      return options?.fallback?.()
    })
  })
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
 *   <${Router}
 *     type="hash"
 *     routeMap=${routeMap}
 *     fallback=${fallbackRoute}
 *   />
 * `
 * ```
 * @param {space.RouterProps} props
 * @returns {() => [any, space.Getter]}
 */
export function Router(props) {
  routeTypeHandlerMap[props.type]()
  const router = createRouter(props.routeMap, { fallback: props.fallback })
  return () => [props.children, router]
}
