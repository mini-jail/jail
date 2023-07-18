import { onCleanup, onMount } from "jail/signal"
import { createRouter, path } from "jail/router"
import { createComponent } from "jail/dom"

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
    const url = new URL(location)
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

/**
 * @param {object} props
 * @param {string} [props.type] - standard listener logic
 * @param {jail.RouteMap} props.routeMap
 * @param {unknown} [props.children]
 * @param {jail.RouteHandler} [props.fallback]
 * @returns {unknown | [unknown, () => unknown] | (() => unknown)}
 */
function Router(props) {
  const router = createRouter(props.routeMap, { fallback: props.fallback })
  routeTypeHandlerMap[props.type]?.(props)
  return props.children ? [props.children, router] : router
}

export function installRouter() {
  createComponent("Router", Router)
}
