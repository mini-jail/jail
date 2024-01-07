import { effect, memo } from "space/signal"
import html, { mount, path } from "space/dom"
import Home from "./routes/home.ts"
import Counter from "./routes/counter.ts"
import SimpleCounter from "./routes/simple-counter.ts"
import Sierpinski from "./routes/sierpinski.ts"
import About from "./routes/about.ts"
import ToDo from "./routes/todo.ts"
import NotFound from "./routes/notfound.ts"

function App() {
  effect(() => {
    document.title = `space${path.value}`
  })

  return html`
    <header>
      <h3>space${path}</h3>
      <nav>
        <a href="/">home</a>
        <a href="/counter">counter</a>
        <a href="/sierpinski">sierpinski</a>
        <a href="/todo">todo</a>
        <a href="/about">about</a>
      </nav>
    </header>
    <main use:animate=${pathAnimation}>
      <Router type="pathname">
        <Route path="/" children=${Home} />
        <Route path="/counter" children=${Counter} />
        <Route path="/counter/simple" children=${SimpleCounter} />
        <Route path="/sierpinski" children=${Sierpinski} />
        <Route path="/sierpinski/:target" children=${Sierpinski} />
        <Route path="/sierpinski/:target/:size" children=${Sierpinski} />
        <Route path="/about" children=${About} />
        <Route path="/todo" children=${ToDo} />
        <Route path="/.+" children=${NotFound} />
      </Router>
    </main>
  `
}

const pathAnimation = memo(() => {
  path.value
  return {
    keyframes: [
      { opacity: 0, transform: "translateY(-10px)" },
      { opacity: 1, transform: "unset" },
    ],
    delay: 50,
    duration: 250,
    fill: "both",
  }
})

const _clean = mount(document.body, App)
