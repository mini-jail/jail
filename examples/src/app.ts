import { createEffect } from "jail/signal"
import html, { Animate, mount } from "jail/dom"
import { path, Router } from "jail/dom-router"
import Home from "./routes/home.ts"
import Counter from "./routes/counter.ts"
import SimpleCounter from "./routes/simple-counter.ts"
import Sierpinski from "./routes/sierpinski.ts"
import About from "./routes/about.ts"
import ToDo from "./routes/todo.ts"
import NotFound from "./routes/notfound.ts"

const App = () => {
  createEffect(() => {
    document.title = `jail${path()}`
  })

  return html`
    <header>
      <h3>jail${path}</h3>
      <nav>
        <a href="/">home</a>
        <a href="/counter">counter</a>
        <a href="/sierpinski">sierpinski</a>
        <a href="/todo">todo</a>
        <a href="/about">about</a>
      </nav>
    </header>
    <main use:${Animate}=${pathAnimation}>
      <${Router} type="pathname" fallback=${NotFound} routeMap=${routeMap} />
    </main>
  `
}

const pathAnimation = () => {
  path()
  return {
    keyframes: [
      { opacity: 0, transform: "translateY(-10px)" },
      { opacity: 1, transform: "unset" },
    ],
    delay: 50,
    duration: 250,
    fill: "both",
  }
}

const routeMap = {
  "/": Home,
  "/counter": Counter,
  "/counter/simple": SimpleCounter,
  "/sierpinski": Sierpinski,
  "/sierpinski/:target": Sierpinski,
  "/sierpinski/:target/:size": Sierpinski,
  "/about": About,
  "/todo": ToDo,
}

mount(document.body, App)
