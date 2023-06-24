/// <reference types="./mod.d.ts" />
import { computed, inject, injection, signal, tree } from "signal";

export const path = signal("");
const ParamsInjection = injection();

export function params() {
  return inject(ParamsInjection);
}

function createUrlMatcher(path) {
  return new RegExp(
    "^" + path.replace(/:(\w+)/g, (_, name) => `(?<${name}>[^\\/]+)`) + "$",
  );
}

function createRoutes(routeMap) {
  return Object.keys(routeMap).map((path) => ({
    path,
    regexp: createUrlMatcher(path),
    handler: routeMap[path],
  }));
}

export function routed(routeMap) {
  const routes = createRoutes(routeMap);
  return tree(() => {
    return computed(() => {
      const nextPath = path();
      for (const route of routes) {
        if (route.regexp.test(nextPath)) {
          const params = route.regexp.exec(nextPath)?.groups;
          return ParamsInjection.provide(params, () => {
            return route.handler();
          });
        }
      }
    });
  });
}
