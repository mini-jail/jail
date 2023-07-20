declare global {
  namespace jail {
    type RouteHandler<T = unknown> = {
      (): T
    }

    type Params = {
      [param: string]: string
    }

    type Route<T = unknown> = {
      path: string
      regexp: RegExp
      handler: RouteHandler<T>
    }

    type RouteMap<T = unknown> = {
      [path: string]: RouteHandler<T>
    }

    type RouterOptions<T> = {
      fallback?: RouteHandler<T>
    }

    interface RouterParameters<T = unknown> {
      type: "pathname" | "hash"
      fallback?: RouteHandler<T>
      routeMap: RouteMap<T>
    }

    interface Components {
      Router: RouterParameters
    }
  }
}

export const path: jail.Signal<string>

export function getParams(): jail.Params

/**
 * Installs Router Component
 * @example
 * ```javascript
 * import installRouter from "jail/dom-router"
 *
 * const App = () => {
 *   const routeMap = {
 *     "/": () => "home"
 *   }
 *   const fallback = () => "route not found"
 *
 *   return template`
 *     <Router
 *       type="pathname"
 *       routeMap="${routeMap}"
 *       fallback="${fallback}">
 *     </Router>
 *   `
 * }
 *
 * mount(() => {
 *   installRouter()
 *   return App()
 * })
 * ```
 */
export default function installRouter(): void
