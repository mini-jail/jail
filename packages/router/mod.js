/// <reference types="./mod.d.ts" />
import { computed, inject, injection, signal, tree } from "signal";

export const path = signal("");
/**
 * @type {Injection<Params>}
 */
const Params = injection();

export function params() {
  return inject(Params);
}

/**
 * @param {string} path
 * @returns {RegExp}
 */
function matcher(path) {
  return RegExp(
    "^" + path.replace(/:([^/:]+)/g, (_, name) => `(?<${name}>[^/]+)`) + "$",
  );
}

/**
 * @template T
 * @param {RouteMap<T>} routeMap
 * @returns {Route[]}
 */
function routes(routeMap) {
  return Object.keys(routeMap).map((path) => ({
    path,
    regexp: matcher(path),
    handler: routeMap[path],
  }));
}

/**
 * @template T
 * @param {RouteMap<T>} routeMap
 * @returns {() => T | undefined}
 */
export function routed(routeMap) {
  const routeArray = routes(routeMap);
  return tree(() => {
    return computed(() => {
      const nextPath = path();
      for (const route of routeArray) {
        if (route.regexp.test(nextPath)) {
          const params = route.regexp.exec(nextPath)?.groups;
          return Params.provide(params, () => {
            return route.handler();
          });
        }
      }
    });
  });
}
