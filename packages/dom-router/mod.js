/// <reference types="./mod.d.ts" />
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
    /**
     * @param {MouseEvent} event
     */
    const clickListener = (event) => {
      let elt = event.target, pathname
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
        elt = elt?.parentNode
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
 * @param {import("jail/dom-router").RouteMap} routeMap
 * @returns {import("jail/dom-router").Route[]}
 */
function createRoutes(routeMap) {
  return Object.keys(routeMap).map((path) => ({
    path,
    regexp: createMatcher(path),
    handler: routeMap[path],
  }))
}

/**
 * @param {import("jail/dom-router").RouteMap} routeMap
 * @param {import("jail/dom-router").RouterOptions} options
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
 * @param {import("jail/dom-router").RouterProperties} props
 * @returns {import("jail/signal").Getter}
 */
export function Router({ routeMap, type, fallback, children }) {
  routeTypeHandlerMap[type]()
  const router = createRouter(routeMap, { fallback })
  return () => [children, router]
}

export function installDOMRouter() {
  createComponent("Router", Router)
}
