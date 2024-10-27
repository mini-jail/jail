import { computed, effect, onCleanup, signal } from "space/signal"
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
export const path = signal("")
const routeTypeHandlerMap = {
  hash() {
    effect(() => {
      path(hash())
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
            path(pathname)
            url.pathname = pathname
            return history.pushState(null, "", url)
          }
        }
        elt = elt?.parentElement
      }
    }
    effect(() => {
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
  path(location.pathname)
}
function hash() {
  return location.hash.slice(1) || "/"
}
function hashChangeListener() {
  path(hash())
}
/**
 * @template Child
 * @param {{ type: keyof typeof routeTypeHandlerMap }} props
 * @param {...({ path: string, child: Child })} children
 */
export function Router(props, ...children) {
  const routes = children.map(({ child, path }) => ({
    matcher: createMatcher(path),
    child,
  }))
  routeTypeHandlerMap[props.type]()
  onCleanup(() => routes.length = 0)
  return computed(() => {
    const nextPath = path()
    for (const route of routes) {
      if (route.matcher.test(nextPath)) {
        routerContext.provide({
          path: nextPath,
          params: route.matcher.exec(nextPath)?.groups,
        })
        return route.child
      }
    }
  })
}
