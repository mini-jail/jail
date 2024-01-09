import { effect, memo } from "space/signal"
import html, { component, mount, path } from "space/dom"
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
    <main d-animate=${pathAnimation}>
      <AppRouter />
    </main>
  `
}

component("AppRouter", () => {
  return html`
    <Router type="pathname" fallback=${NotFound}>
      <Route path="/">
        <${Home} />
      </Route>
      <Route path="/counter">
        <${Counter} />
      </Route>
      <Route path="/counter/simple">
        <${SimpleCounter} />
      </Route>
      <Route path="/sierpinski">
        <${Sierpinski} />
      </Route>
      <Route path="/sierpinski/:target">
        <${Sierpinski} />
      </Route>
      <Route path="/sierpinski/:target/:size">
        <${Sierpinski} />
      </Route>
      <Route path="/about">
        <${About} />
      </Route>
      <Route path="/todo">
        <${ToDo} />
      </Route>
    </Router>
  `
})

const _clean = mount(document.body, App)
