import { onCleanup, onMount } from "jail/signal"
import { createRouter, path } from "jail/router"
import { createComponent } from "jail/dom"

export function installRouter() {
  createComponent("Router", ({ type, children, fallback, routes }) => {
    const router = createRouter(routes, { fallback })
    let listener, accessor, eventName

    if (type === "hash") {
      eventName = "hashchange"
      accessor = () => location.hash.slice(1) || "/"
      listener = () => path(accessor())
    }

    if (type === "pathname") {
      eventName = "click"
      accessor = () => location.pathname
      listener = (event) => {
        event.preventDefault()
        let elt = event.target, pathname = null
        while (elt !== null) {
          pathname = elt.getAttribute?.("href") || null
          if (pathname != null) {
            break
          }
          elt = elt.parentNode
        }
        if (pathname !== null && pathname !== accessor()) {
          path(pathname)
          history.pushState(null, "", pathname)
        }
      }
    }

    onMount(() => {
      path(accessor())
      addEventListener(eventName, listener)
    })

    onCleanup(() => removeEventListener(eventName, listener))

    return children ? [children, router] : router
  })
}
