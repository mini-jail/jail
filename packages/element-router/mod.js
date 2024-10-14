import {
  createRoot,
  effect,
  inject,
  onCleanup,
  provide,
  state,
} from "space/signal"

export const path = state("")
const paramsKey = Symbol("Params")

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
 * @returns {{ [field: string]: string | undefined }?}
 */
export function getParams() {
  return inject(paramsKey) ?? null
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
 * @param {"hash" | "pathname"} type
 * @returns {Router}
 */
export function createRouter(type) {
  return new Router(type)
}

export class Router {
  /**
   * @type {{ matcher: RegExp, child: import("space/element").Child }[]}
   */
  #routes = []
  /**
   * @param {"hash" | "pathname"} type
   */
  constructor(type) {
    createRoot(() => routeTypeHandlerMap[type]())
  }
  /**
   * @param {string} path
   * @param {() => import("space/element").Child} child
   * @returns {this}
   */
  route(path, child) {
    this.#routes.push({ matcher: createMatcher(path), child })
    return this
  }
  render() {
    const nextRoute = path.value
    for (const route of this.#routes) {
      if (route.matcher.test(nextRoute)) {
        const params = route.matcher.exec(nextRoute)?.groups
        provide(paramsKey, params)
        return route.child
      }
    }
  }
}
