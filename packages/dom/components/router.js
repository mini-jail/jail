import { effect, inject, onCleanup, provide, signal } from "space/signal"

export const path = signal("")
const paramsKey = Symbol("Params")
const routesKey = Symbol("Routes")

const routeTypeHandlerMap = {
  hash() {
    effect(() => {
      path.value = hash()
      addEventListener("hashchange", hashChangeListener)
    })
    onCleanup(() => {
      removeEventListener("hashchange", hashChangeListener)
    })
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
            path.value = pathname
            url.pathname = pathname
            return history.pushState(null, "", url)
          }
        }
        elt = elt?.parentElement
      }
    }

    effect(() => {
      path.value = location.pathname
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
 * @returns {{ [field: string]: string | undefined } | undefined}
 */
export function getParams() {
  return inject(paramsKey)
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
 * @param {PopStateEvent} event
 */
function popStateListener(event) {
  event.preventDefault()
  path.value = location.pathname
}

function hash() {
  return location.hash.slice(1) || "/"
}

function hashChangeListener() {
  path.value = hash()
}

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
 * @param {{ type: string, children?: any, fallback?: any }} props
 */
export function* Router(props) {
  /**
   * @type {{ matcher: RegExp, path: string, children: any }[]}
   */
  const routes = []
  provide(routesKey, routes)
  routeTypeHandlerMap[props.type]()
  yield props.children
  yield function Router() {
    const nextRoute = path.value
    for (const route of routes) {
      if (route.matcher.test(nextRoute)) {
        provide(paramsKey, route.matcher.exec(nextRoute)?.groups)
        return route.children
      }
    }
    return props.fallback
  }
}

/**
 * @param {{ path: string, children?: any }} props
 */
export function Route(props) {
  inject(routesKey).push({
    matcher: createMatcher(props.path),
    path: props.path,
    children: props.children,
  })
}
