/// <reference types="./mod.d.ts" />
import {
  createComputed,
  createRoot,
  createSignal,
  inject,
  provide,
} from "jail/signal"

/** @type {"jail/router/params"} */
const Params = Symbol()
export const path = createSignal("")

export function getParams() {
  return inject(Params)
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
 * @param {jail.RouteMap} routeMap
 * @returns {jail.Route[]}
 */
function createRoutes(routeMap) {
  return Object.keys(routeMap).map((path) => ({
    path,
    regexp: createMatcher(path),
    handler: routeMap[path],
  }))
}

/**
 * @param {string} path
 * @param {jail.RouteHandler} handler
 * @returns {() => unknown | undefined}
 */
export function createRoute(routePath, routeHandler) {
  const matcher = createMatcher(routePath)
  return createComputed(() => {
    const nextPath = path()
    if (matcher.test(nextPath)) {
      return createRoot(() => {
        provide(Params, matcher.exec(nextPath)?.groups)
        return routeHandler()
      })
    }
  })
}

/**
 * @param {jail.RouteMap} routeMap
 * @param {jail.RouterOptions} [options]
 * @returns {() => unknown | undefined}
 */
export function createRouter(routeMap, options) {
  const routeArray = createRoutes(routeMap)
  return createComputed(() => {
    const nextPath = path()
    return createRoot(() => {
      for (const route of routeArray) {
        if (route.regexp.test(nextPath)) {
          provide(Params, route.regexp.exec(nextPath)?.groups)
          return route.handler()
        }
      }
      if (options.fallback) {
        return options.fallback()
      }
    })
  })
}
