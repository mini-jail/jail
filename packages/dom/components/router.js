import {
  Computed,
  Effect,
  inject,
  onCleanup,
  provide,
  Root,
  state,
} from "space/signal"

export const path = state("")
const paramsKey = Symbol("Params")
const routesKey = Symbol("Routes")

const routeTypeHandlerMap = {
  hash() {
    new Effect(() => {
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
    new Effect(() => {
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
 * @param {{ type: "hash" | "pathname", children?: any, fallback?: any }} props
 */
export function* Router(props) {
  /**
   * @type {{ matcher: RegExp, children: any }[]}
   */
  const routes = []
  provide(routesKey, routes)
  routeTypeHandlerMap[props.type]()
  yield props.children
  yield new Computed(() => {
    const nextRoute = path.value
    return new Root(() => {
      for (const route of routes) {
        if (route.matcher.test(nextRoute)) {
          const params = route.matcher.exec(nextRoute)?.groups
          provide(paramsKey, params)
          return route.children
        }
      }
      return props.fallback
    }).value
  })
}

/**
 * @param {{ path: string, children?: any }} props
 */
export function Route(props) {
  new Effect(() => {
    inject(routesKey).push({
      matcher: createMatcher(props.path),
      children: props.children,
    })
  })
}
