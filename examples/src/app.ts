import { catchError, createEffect } from "jail/signal"
import { createDirective, mount, template } from "jail/dom"
import { installDOMRouter, path } from "jail/dom-router"

import Home from "./routes/home.ts"
import Counter from "./routes/counter.ts"
import SimpleCounter from "./routes/simple-counter.ts"
import Sierpinski from "./routes/sierpinski.ts"
import About from "./routes/about.ts"
import ToDo from "./routes/todo.ts"
import Compiler from "./routes/compiler.ts"
import NotFound from "./routes/notfound.ts"

const App = () => {
  const _stopUpdatingTitle = createEffect(() => {
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

  const pathAnimation = (): AnimateDirective => {
    path()
    return {
      frames: [
        { opacity: 0, transform: "translateY(-10px)" },
        { opacity: 1, transform: "unset" },
      ],
      options: { duration: 250, delay: 50, fill: "both" },
    }
  }

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
    <main d-animate=${pathAnimation}>
      <Router type="pathname" fallback=${NotFound} routeMap=${routeMap} />
    </main>
  `
}

mount(document.body, () => {
  catchError(console.error)
  installDOMRouter()
  createDirective<AnimateDirective>("animate", (elt, binding) => {
    const { frames, options } = binding.value
    elt.animate(frames, options)
  })
  return App()
})

interface AnimateDirective {
  frames: Keyframe[]
  options?: KeyframeAnimationOptions | number
}
