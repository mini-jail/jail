import { createEffect, onCleanup, onMount } from "signal"
import { createRouter, path } from "signal/router"
import { component, mount, template } from "signal/dom"
import Home from "./routes/home.js"
import Counter from "./routes/counter.js"
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

const RootComponent = component(() => {
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
})

mount(document.body, () => {
  return RootComponent()
})
