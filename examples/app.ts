import { createEffect, on } from "jail/signal"
import { createDirective, mount, template } from "jail/dom"
import { install, path } from "jail/dom-router"
import Home from "./routes/home.js"
import Counter from "./routes/counter.js"
import SimpleCounter from "./routes/simple-counter.js"
import Sierpinski from "./routes/sierpinski.ts"
import About from "./routes/about.js"
import ToDo from "./routes/todo.ts"
import Compiler from "./routes/compiler.js"
import NotFound from "./routes/notfound.js"

const App = () => {
  createEffect(() => {
    document.title = `jail${path()}`
  })

  const routeMap = {
    "/": Home,
    "/counter": Counter,
    "/counter/simple": SimpleCounter,
    "/sierpinski": Sierpinski,
    "/sierpinski/:target": Sierpinski,
    "/sierpinski/:target/:size": Sierpinski,
    "/about": About,
    "/todo": ToDo,
    "/compiler": Compiler,
  }

  const animation = () => ({
    frames: [
      { opacity: 0, transform: "translateY(-10px)" },
      { opacity: 1, transform: "unset" },
    ],
    options: { duration: 250, delay: 50, fill: "both" },
  })

  return template`
    <header>
      <h3>jail${path}</h3>
      <nav>
        <a href="/">home</a>
        <a href="/counter">counter</a>
        <a href="/sierpinski">sierpinski</a>
        <a href="/todo">todo</a>
        <a href="/about">about</a>
        <a href="/compiler">compiler</a>
      </nav>
    </header>
    <main d-animate=${on(path, animation)}>
      <Router type="pathname" fallback="${NotFound}" routeMap="${routeMap}"></Router>
    </main>
  `
}

mount(document.body, () => {
  install()
  createDirective("animate", (elt, binding) => {
    const { frames, options } = binding.value
    elt.animate(frames, options)
  })
  return App()
})

declare module "jail/dom" {
  interface AnimateDirective {
    frames: Keyframe[]
    options?: KeyframeAnimationOptions | number
  }

  interface Directives {
    animate: AnimateDirective
  }
}
