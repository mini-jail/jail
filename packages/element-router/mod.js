import { Effect, onCleanup, State } from "space/signal"
import { Context } from "space/signal/context"
/**
 * @typedef {{
 *   path: string
 *   matcher: RegExp
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
  _routes = []
  /**
   * @param {"hash" | "pathname"} type
   */
  constructor(type) {
    super()
    routeTypeHandlerMap[type]()
    onCleanup(() => this._routes.length = 0)
    new Effect(() => {
      const nextPath = path.value
      const route = this._routes.find((route) => route.matcher.test(nextPath))
      if (route) {
        routerContext.provide({
          path: nextPath,
          matcher: route.matcher,
          params: route.matcher.exec(nextPath)?.groups,
        })
      }
      super.value = route?.child()
    })
  }
  /**
   * @param {string} path
   * @param {import("space/element").FunctionChild} child
   * @returns {this}
   */
  route(path, child) {
    this._routes.push({ matcher: createMatcher(path), child })
    return this
  }
  /**
   * @param {import("space/element").FunctionChild} child
   * @returns {this}
   */
  fallback(child) {
    queueMicrotask(() => {
      this._routes.push({ matcher: createMatcher("/[^]*"), child })
    })
    return this
  }
  /**
   * @override
   */
  get value() {
    return super.value
  }
}
