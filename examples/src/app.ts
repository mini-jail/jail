import { createEffect } from "space/signal"
import html, { Animate, mount, path, Route, Router } from "space/dom"
import Home from "./routes/home.ts"
import Counter from "./routes/counter.ts"
import SimpleCounter from "./routes/simple-counter.ts"
import Sierpinski from "./routes/sierpinski.ts"
import About from "./routes/about.ts"
import ToDo from "./routes/todo.ts"
import NotFound from "./routes/notfound.ts"

function App() {
  createEffect(() => {
    document.title = `space${path.value}`
  })

  const keyframes = [
    { opacity: 0, transform: "translateY(-10px)" },
    { opacity: 1, transform: "unset" },
  ]

  return html`
    <header>
      <h3>space${path}</h3>
      <nav>
        <a href="/">home</a>
        <a href="/counter">counter</a>
        <a href="/sierpinski">sierpinski</a>
        <a href="/todo">todo</a>
        <a href="/about">about</a>
        <a @click=${unmount}>unmount</a>
      </nav>
    </header>
    <${Animate}
      signal=${path}
      keyframes=${keyframes}
      options=${{ delay: 50, duration: 250, fill: "both" }}
    >
      <main>
        <${Router} type="pathname" fallback=${NotFound}>
          <${Route} path="/" children=${Home} />
          <${Route} path="/counter" children=${Counter} />
          <${Route} path="/counter/simple" children=${SimpleCounter} />
          <${Route} path="/sierpinski" children=${Sierpinski} />
          <${Route} path="/about" children=${About} />
          <${Route} path="/todo" children=${ToDo} />
        <//>
      </main>
    <//>
  `
}

const unmount = mount(document.body, App)
