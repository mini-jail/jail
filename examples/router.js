import { onCleanup, onMount } from "jail/signal"
import { createRouter, path } from "jail/router"
import { createComponent } from "jail/dom"

const routeTypes = {
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
    const clickListener = (event) => {
      event.preventDefault()
      let elt = event.target, pathname = null
      while (elt !== null) {
        pathname = elt.getAttribute?.("href") || null
        if (pathname !== null) {
          break
        }
        elt = elt.parentNode
      }
      if (pathname !== null && pathname !== location.pathname) {
        path(pathname)
        history.pushState(null, "", pathname)
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

export function installRouter() {
  createComponent("Router", (props) => {
    const router = createRouter(props.routes, { fallback: props.fallback })
    routeTypes[props.type]?.()
    return props.children ? [props.children, router] : router
  })
}
