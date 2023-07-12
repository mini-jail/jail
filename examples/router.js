import { onCleanup, onMount } from "jail/signal"
import { createRouter, path } from "jail/router"
import { createComponent } from "jail/dom"

export function installRouter() {
  createComponent("Router", (props) => {
    if (props.type === "hash") {
      const getHash = () => location.hash.slice(1) || "/"
      const listener = () => path(getHash())
      onMount(() => {
        path(getHash())
        addEventListener("hashchange", listener)
      })
      onCleanup(() => {
        removeEventListener("hashchange", listener)
      })
    }

    const router = createRouter(props.routes, {
      fallback: props.fallback,
    })

    return [props.children, router]
  })
}
