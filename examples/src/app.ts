import { createEffect } from "jail/signal"
import html, { createComponent, createDirective, mount } from "jail/dom"
import { installDOMRouter, path } from "jail/dom-router"

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

  const pathAnimation = (): Keyframe[] => {
    path()
    return [
      { opacity: 0, transform: "translateY(-10px)" },
      { opacity: 1, transform: "unset" },
    ]
  }

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
    <main 
      d-animate
        .delay(30)
        .fill(both)
        .duration(250)=${pathAnimation}
    >
      <Router type="pathname" fallback=${NotFound} routeMap=${routeMap} />
    </main>
  `
}

mount(document.body, () => {
  installDOMRouter()
  createDirective<Keyframe[]>("animate", (elt, binding) => {
    const options: KeyframeAnimationOptions = {}
    if (binding.modifiers) {
      const delayRegExp = /delay\((\d+)\)/
      const fillRegExp = /fill\((\w+)\)/
      const durationRegExp = /duration\((\d+)\)/
      for (const key in binding.modifiers) {
        if (delayRegExp.test(key)) {
          options.delay = +(delayRegExp.exec(key)![1]!)
        } else if (fillRegExp.test(key)) {
          options.fill = fillRegExp.exec(key)![1]! as FillMode
        } else if (durationRegExp.test(key)) {
          options.duration = +(durationRegExp.exec(key)![1]!)
        }
      }
    }
    elt.animate(binding.value, options)
  })
  return App()
})
