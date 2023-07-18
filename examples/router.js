import { onCleanup, onMount } from "jail/signal"
import { createRouter, path } from "jail/router"
import { createComponent } from "jail/dom"

const routeTypes = {
  hash(props) {
    const hash = () => location.hash.slice(1) || "/"
    const listener = () => path(hash())
    onMount(() => {
      path(hash())
      addEventListener("hashchange", listener)
    })
    onCleanup(() => removeEventListener("hashchange", listener))
  },
  pathname(props) {
    const { host } = new URL(location)
    const clickListener = (event) => {
      let elt = event.target,
        url = null,
        pathname = location.pathname,
        nextPathName = null
      while (elt !== null) {
        url = elt.href || null
        if (url !== null) {
          url = new URL(url)
          if (url.host === host) {
            nextPathName = url.pathname
            event.preventDefault()
            break
          }
        }
        elt = elt.parentNode
      }
      if (nextPathName !== null && pathname !== nextPathName) {
        path(nextPathName)
        history.pushState(null, "", nextPathName)
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
    routeTypes[props.type]?.(props)
    return props.children ? [props.children, router] : router
  })
}
