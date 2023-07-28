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

export const PARAMS_INJECTION_KEY = Symbol()
export const path = createSignal("")

const routeTypeHandlerMap = {
  hash() {
    const hash = () => location.hash.slice(1) || "/"
    const listener = () => path(hash())
    onMount(() => {
      path(hash())
      addEventListener("hashchange", listener)
    })
    onCleanup(() => removeEventListener("hashchange", listener))
  },
  pathname() {
    const url = new URL(location.toString())
    /**
     * @param {MouseEvent} event
     */
    const clickListener = (event) => {
      let elt = event.target, pathname
      while (elt != null) {
        pathname = elt.getAttribute?.("href")
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
  return inject(PARAMS_INJECTION_KEY)
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
          provide(PARAMS_INJECTION_KEY, route.regexp.exec(nextPath)?.groups)
          return route.handler()
        }
      }
      return options?.fallback?.()
    })
  })
}

/**
 * @param {import("jail/dom-router").RouterProperties} props
 * @returns {[any, import("jail/signal").Getter]}
 */
export function Router(props) {
  const router = createRouter(props.routeMap, {
    fallback: props.fallback,
  })
  routeTypeHandlerMap[props.type]()
  return [props.children, router]
}

export function install() {
  createComponent("Router", Router)
}
