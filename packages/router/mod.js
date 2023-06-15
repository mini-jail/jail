import {
  createEffect,
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
 * @typedef {{ [path: string]: RouteHandler}} RouteMap
 */

/** @type {import("signal").Signal<string>} */
const pathSignal = createSignal();
/** @type {import("signal").Injection<Params>} */
const Params = createInjection();

/**
 * @param {(callback: (setter: string) => void) => void} listener
 * @returns {void}
 */
export function setPathListener(listener) {
  listener((path) => pathSignal(path));
}

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
 * @param {RouteMap} routeMap
 * @returns {void}
 */
export function createRouter(routeMap) {
  const routes = createRoutes(routeMap);
  createScope(() => {
    createEffect(() => {
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
