import { onCleanup, onMount } from "jail/signal"
import { createRouter, path } from "jail/router"
import { createComponent } from "jail/dom"
import Home from "./routes/home.js"
import Counter from "./routes/counter.js"
import SimpleCounter from "./routes/simple-counter.js"
import Sierpinski from "./routes/sierpinski.js"
import About from "./routes/about.js"
import Todo from "./routes/todo.js"
import Compiler from "./routes/compiler.js"
import NotFound from "./routes/notfound.js"

export default createComponent(() => {
  const getHash = () => location.hash.slice(1) || "/"
  const listener = () => path(getHash())

  onMount(() => {
    path(getHash())
    addEventListener("hashchange", listener)
  })

  onCleanup(() => {
    removeEventListener("hashchange", listener)
  })

  return createRouter({
    "/": Home,
    "/counter": Counter,
    "/counter/simple": SimpleCounter,
    "/sierpinski": Sierpinski,
    "/sierpinski/:target": Sierpinski,
    "/sierpinski/:target/:size": Sierpinski,
    "/about": About,
    "/todo": Todo,
    "/compiler": Compiler,
    "/:url": NotFound,
  })
})
