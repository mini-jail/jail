import { createEffect } from "jail/signal"
import { path } from "jail/router"
import { component, mount, template } from "jail/dom"
import HashRouter from "./router.js"

const Navigation = component(() => {
  return template`
    <nav>
      <a href="#/">home</a>
      <a href="#/counter">counter</a>
      <a href="#/sierpinski">sierpinski</a>
      <a href="#/todo">todo</a>
      <a href="#/about">about</a>
      <a href="#/compiler">compiler</a>
    </nav>
  `
})

const App = () => {
  createEffect(() => document.title = `jail${path()}`)

  return template`
    <header>
      <h3>jail${path}</h3>
      ${Navigation()}
    </header>
    <main>
      ${HashRouter()}
    </main>
  `
}

mount(document.body, App)
