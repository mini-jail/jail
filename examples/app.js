import { createEffect, mount, path, template } from "jail"
import { installRouter } from "./router.js"
import Home from "./routes/home.js"
import Counter from "./routes/counter.js"
import SimpleCounter from "./routes/simple-counter.js"
import Sierpinski from "./routes/sierpinski.js"
import About from "./routes/about.js"
import Todo from "./routes/todo.js"
import Compiler from "./routes/compiler.js"
import NotFound from "./routes/notfound.js"

const App = () => {
  createEffect(() => document.title = `jail${path()}`)

  const routes = {
    "/": Home,
    "/counter": Counter,
    "/counter/simple": SimpleCounter,
    "/sierpinski": Sierpinski,
    "/sierpinski/:target": Sierpinski,
    "/sierpinski/:target/:size": Sierpinski,
    "/about": About,
    "/todo": Todo,
    "/compiler": Compiler,
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
    <main>
      <Router type="hash" fallback="${NotFound}" routes="${routes}"></Router>
    </main>
  `
}

mount(document.body, () => {
  installRouter()
  return App()
})
