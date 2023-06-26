/// <reference types="./mod.d.ts" />
import {
  createComputed,
  createInjection,
  createRoot,
  createSignal,
  inject,
  provide,
} from "signal"

/**
 * @type {jail.Injection<jail.Params>}
 */
const Params = createInjection()
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
 * @template T
 * @param {jail.RouteMap<T>} routeMap
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
 * @template T
 * @param {jail.RouteMap<T>} routeMap
 * @returns {() => T | undefined}
 */
export function createRouter(routeMap) {
  const routeArray = createRoutes(routeMap)
  return createComputed(() => {
    const nextPath = path()
    for (const route of routeArray) {
      if (route.regexp.test(nextPath)) {
        return createRoot(() => {
          provide(Params, route.regexp.exec(nextPath)?.groups)
          return route.handler()
        })
      }
    }
  })
}
