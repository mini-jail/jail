declare global {
  namespace jail {
    interface ExtendableComponentMap {
      Router: {
        fallback?: () => unknown
        type?: "pathname" | "hash"
        routeMap: { [path: string]: () => unknown }
      }
    }
  }
}

/**
 * Installs Router Component
 * @example
 * ```javascript
 * import Router from "jail/dom-router"
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
 *   Router()
 *   return App()
 * })
 * ```
 */
export default VoidFunction
