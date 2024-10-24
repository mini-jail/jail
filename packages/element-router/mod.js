import { computed, effect, onCleanup, state } from "space/signal"
import { Context } from "space/signal/context"
/**
 * @typedef {{
 *   path: string
 *   params?: { [param: string]: string | undefined }
 * }} RouterContext
 */
/**
 * @type {Context<RouterContext>}
 */
export const routerContext = new Context()
export const path = state("")
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
 * @template Child
 * @param {keyof typeof routeTypeHandlerMap} type
 * @param {[path: string, child: () => Child][]} routeArray
 */
export function Router(type, routeArray) {
  /**
   * @type {[ matcher: RegExp, child: () => Child][]}
   */
  const routes = routeArray.map(([path, child]) => [createMatcher(path), child])
  routeTypeHandlerMap[type]()
  onCleanup(() => routes.length = 0)
  return computed(() => {
    const nextPath = path.value
    for (const [matcher, child] of routes) {
      if (matcher.test(nextPath)) {
        routerContext.provide({
          path: nextPath,
          params: matcher.exec(nextPath)?.groups,
        })
        return child()
      }
    }
  })
}
