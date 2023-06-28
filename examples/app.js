import { createEffect, onCleanup, onMount } from "jail/signal"
import { createRouter, path } from "jail/router"
import { component, mount, template } from "jail/dom"
import Home from "./routes/home.js"
import Counter from "./routes/counter.js"
import SimpleCounter from "./routes/simple-counter.js"
import Sierpinski from "./routes/sierpinski.js"
import About from "./routes/about.js"
import Todo from "./routes/todo.js"
import NotFound from "./routes/notfound.js"

const Navigation = component(() => {
  return template`
    <nav>
      <a href="#/">home</a>
      <a href="#/counter">counter</a>
      <a href="#/sierpinski">sierpinski</a>
      <a href="#/todo">todo</a>
      <a href="#/about">about</a>
      <a href="#/error">error</a>
    </nav>
  `
})

const HashRouter = component(() => {
  const getHash = () => location.hash.slice(1) || "/"

  const router = createRouter({
    "/": Home,
    "/counter": Counter,
    "/counter/simple": SimpleCounter,
    "/sierpinski": Sierpinski,
    "/sierpinski/:target": Sierpinski,
    "/sierpinski/:target/:size": Sierpinski,
    "/about": About,
    "/todo": Todo,
    "/:url": NotFound,
  })

  const listener = () => path(getHash())

  onMount(() => {
    path(getHash())
    addEventListener("hashchange", listener)
  })

  onCleanup(() => {
    removeEventListener("hashchange", listener)
  })

  return router
})

const App = () => {
  createEffect(() => document.title = `signal${path()}`)

  return template`
    <header>
      <h3>signal${path}</h3>
      ${Navigation()}
    </header>
    <main>
      ${HashRouter()}
    </main>
  `
}

mount(document.body, App)
