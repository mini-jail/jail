import {
  createComputed,
  createInjection,
  createScope,
  createSignal,
  inject,
} from "signal";

/**
 * @template [T = any]
 * @typedef {() => T} RouteHandler
 */

/**
 * @typedef {() => string} PathListener
 */

/**
 * @typedef {{ [param: string]: string }} Params
 */

/**
 * @typedef {{
 *   path: string
 *   regexp: RegExp
 *   handler: RouteHandler
 * }} Route
 */

/**
 * @template [T = any]
 * @typedef {{ [path: string]: RouteHandler<T>}} RouteMap
 */

/** @type {import("signal").Signal<string>} */
export const pathSignal = createSignal();
/** @type {import("signal").Injection<Params>} */
const Params = createInjection();

export function getParams() {
  return inject(Params);
}

/**
 * @param {string} path
 * @returns {RegExp}
 */
function createUrlMatcher(path) {
  return new RegExp(
    "^" + path.replace(/:(\w+)/g, (_, name) => `(?<${name}>[^\\/]+)`) + "$",
  );
}

/**
 * @param {RouteMap} routeMap
 * @returns {Iterable<Route>}
 */
function createRoutes(routeMap) {
  return Object.keys(routeMap).map((path) => ({
    path,
    regexp: createUrlMatcher(path),
    handler: routeMap[path],
  }));
}

/**
 * @template [T = any]
 * @param {RouteMap<T>} routeMap
 * @returns {() => T | undefined}
 */
export function createRouter(routeMap) {
  const routes = createRoutes(routeMap);
  return createScope(() => {
    return createComputed(() => {
      const nextPath = pathSignal();
      for (const route of routes) {
        if (route.regexp.test(nextPath)) {
          const params = route.regexp.exec(nextPath)?.groups;
          return Params.provide(params, route.handler);
        }
      }
    });
  });
}
