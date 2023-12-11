import {
  createEffect,
  createRoot,
  createSignal,
  inject,
  onCleanup,
  onMount,
  provide,
} from "space/signal"
export const paramsSymbol = Symbol("Params")
export const routeSymbol = Symbol("Route")
export const routesSymbol = Symbol("Routes")
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
  let regexp = regexpCache[path]
  if (regexp === undefined) {
    regexp = RegExp(
      "^" + path.replace(/:([^/:]+)/g, (_, name) => `(?<${name}>[^/]+)`) + "$",
    )
    regexpCache[path] = regexp
  }
  return regexp
}

/**
 * @type {Record<string, RegExp | undefined>}
 */
const regexpCache = {}

/**
 * Allows usage of the following:
 * @example
 * ```javascript
 * template`
 *   <Router type="hash">
 *     Static Child
 *     <Route path="/" children="home" />
 *     <Route path="/about">
 *       about
 *     </Route>
 *     <Route path="/etc" children=${Component} />
 *   </Router>
 * `
 * ```
 * @param {space.RouterProps} props
 * @returns {space.Slot}
 */
export function Router(props) {
  routeTypeHandlerMap[props.type]()
  /**
   * @type {Set<space.Route>}
   */
  const routes = new Set()
  provide(routesSymbol, routes)
  return function* () {
    const nextPath = path()
    yield props.children
    for (const route of routes) {
      if (route.regexp.test(nextPath)) {
        yield createRoot(() => {
          provide(paramsSymbol, route.regexp.exec(nextPath)?.groups)
          return route.children
        })
        return
      }
    }
    yield props.fallback
  }
}

/**
 * @param {space.RouteProps} props
 * @returns {space.Slot}
 */
export function Route(props) {
  createEffect(() => {
    /**
     * @type {space.Route}
     */
    const route = {
      path: props.path,
      regexp: createMatcher(props.path),
      get children() {
        return props.children
      },
      childRoutes: [],
    }
    provide(routeSymbol, route)
    inject(routesSymbol)?.add(route)
  })
}
