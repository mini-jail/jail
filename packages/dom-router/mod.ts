import {
  createComputed,
  createRoot,
  createSignal,
  inject,
  onCleanup,
  onMount,
  provide,
} from "jail/signal"
import { createComponent, type Props } from "jail/dom"

const Params = Symbol("Params")
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
    const clickListener = (event: MouseEvent) => {
      let elt = event.target as Node | null, pathname: string | undefined
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
  return inject(Params)
}

function createMatcher(path: string): RegExp {
  return RegExp(
    "^" + path.replace(/:([^/:]+)/g, (_, name) => `(?<${name}>[^/]+)`) + "$",
  )
}

function createRoutes<T>(routeMap: RouteMap<T>): Route<T>[] {
  return Object.keys(routeMap).map((path) => ({
    path,
    regexp: createMatcher(path),
    handler: routeMap[path],
  }))
}

function createRouter<T>(
  routeMap: RouteMap<T>,
  options?: RouterOptions<T>,
): () => T | undefined {
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
      return options?.fallback?.()
    })!
  })
}

export function Router<T>(props: RouterProps<T>): () => T | undefined
export function Router<T, C>(
  props: RouterProps<T> & { children: C },
): [C, (() => T | undefined)]
export function Router(props: RouterProps & Props): any {
  const router = createRouter(props.routeMap, { fallback: props.fallback })
  routeTypeHandlerMap[props.type]()
  return props.children ? [props.children, router] : router
}

export default function installRouter(): void {
  createComponent("Router", Router)
}

export type RouteHandler<T = any> = {
  (): T
}

export type Params = {
  [param: string]: string
}

export type Route<T = any> = {
  path: string
  regexp: RegExp
  handler: RouteHandler<T>
}

export type RouteMap<T = any> = {
  [path: string]: RouteHandler<T>
}

export type RouterOptions<T> = {
  fallback?: RouteHandler<T>
}

export interface RouterProps<T = any> {
  type: "pathname" | "hash"
  fallback?: RouteHandler<T>
  routeMap: RouteMap<T>
}

declare global {
  namespace jail {
    interface Components {
      Router: RouterProps
    }

    interface Injections {
      [Params]?: Params
    }
  }
}
