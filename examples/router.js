import { onCleanup, onMount } from "jail/signal"
import { createRouter, path } from "jail/router"
import { createComponent } from "jail/dom"

export function installRouter() {
  const getHash = () => location.hash.slice(1) || "/"
  const listener = () => path(getHash())

  onMount(() => {
    path(getHash())
    addEventListener("hashchange", listener)
  })

  onCleanup(() => {
    removeEventListener("hashchange", listener)
  })

  createComponent("HashRouter", ({ routes }) => createRouter(routes))
}
