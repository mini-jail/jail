import { effect, onCleanup, State } from "space/signal"
import { Context } from "space/signal/context"
/**
 * @typedef {{
 *   path: string
 *   params?: { [param: string]: string | undefined }
 * }} RouterContext
 */
export const path = new State("")
/**
 * @type {Context<RouterContext>}
 */
export const routerContext = new Context()
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
 * @extends {State<import("space/element").Child>}
 */
export class Router extends State {
  /**
   * @private
   * @type {{ matcher: RegExp, child: import("space/element").FunctionChild }[]}
   */
  routes = []
  /**
   * @private
   * @type {import("space/element").FunctionChild?}
   */
  fallbackRoute = null
  /**
   * @param {"hash" | "pathname"} type
   */
  constructor(type) {
    super()
    routeTypeHandlerMap[type]()
    onCleanup(() => this.routes.length = 0)
    effect(() => {
      const nextPath = path.value
      const route = this.routes.find((route) => route.matcher.test(nextPath))
      if (route) {
        routerContext.provide({
          path: nextPath,
          params: route.matcher.exec(nextPath)?.groups,
        })
        super.value = route.child()
        return
      }
      super.value = this.fallbackRoute?.()
    })
  }
  /**
   * @param {string} path
   * @param {import("space/element").FunctionChild} child
   * @returns {this}
   */
  route(path, child) {
    this.routes.push({ matcher: createMatcher(path), child })
    return this
  }
  /**
   * @param {import("space/element").FunctionChild} child
   * @returns {this}
   */
  fallback(child) {
    this.fallbackRoute = child
    return this
  }
  /**
   * @override
   */
  get value() {
    return super.value
  }
}
