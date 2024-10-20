import { createApp, createElement } from "space/element"
import { path, Router } from "space/element/router"
import { Anchor, animate } from "./components/mod.ts"

import About from "./routes/about.ts"
import Counter from "./routes/counter.ts"
import Home from "./routes/home.ts"
import NotFound from "./routes/notfound.ts"
import Sierpinski from "./routes/sierpinski.ts"
import ToDo from "./routes/todo.ts"

function Header() {
  return createElement("header")
    .add(
      createElement("h3").add("space", path),
      createElement("nav")
        .add(
          Anchor("/", "home"),
          Anchor("/counter", "counter"),
          Anchor("/sierpinski", "sierpinski"),
          Anchor("/todo", "todo"),
          Anchor("/about", "about"),
          Anchor("/error", "error"),
        ),
    )
}

function* App() {
  const router = new Router("pathname")
    .route("/", Home)
    .route("/counter", Counter)
    .route("/about", About)
    .route("/sierpinski", Sierpinski)
    .route("/todo", ToDo)
    .fallback(NotFound)

  yield Header()
  yield createElement("main")
    .add(router)
    .use(animate, {
      state: path,
      delay: 50,
      duration: 250,
      fill: "both",
      keyframes: [
        { opacity: 0, transform: "translateY(-10px)" },
        { opacity: 1, transform: "unset" },
      ],
    })
}

createApp(document.body)
  .render(App)
