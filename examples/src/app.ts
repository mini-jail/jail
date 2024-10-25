import { create, mount } from "space/element"
import { path, Router } from "space/element/router"
import { animate } from "./components/mod.ts"

import About from "./routes/about.ts"
import Counter from "./routes/counter.ts"
import Home from "./routes/home.ts"
import NotFound from "./routes/notfound.ts"
import Sierpinski from "./routes/sierpinski.ts"
import ToDo from "./routes/todo.ts"

function Header() {
  return create("header", null, [
    create("h3", [["children", "space", path]]),
    create("nav", null, [
      create("a", [["href", "/"]], "home"),
      create("a", [["href", "/counter"]], "counter"),
      create("a", [["href", "/sierpinski"]], "sierpinski"),
      create("a", [["href", "/todo"]], "todo"),
      create("a", [["href", "/about"]], "about"),
      create("a", [["href", "/error"]], "error"),
      create("a", [["on:click", unmount]], "unmount"),
    ]),
  ])
}

function* App() {
  const animateProps = {
    signal: path,
    delay: 50,
    duration: 250,
    fill: <FillMode> "both",
    keyframes: <Keyframe[]> [
      { opacity: 0, transform: "translateY(-10px)" },
      { opacity: 1, transform: "unset" },
    ],
  }
  yield Header()
  yield create("main", [[animate(animateProps)]], [
    Router("pathname", [
      ["/", Home],
      ["/counter", Counter],
      ["/about", About],
      ["/sierpinski", Sierpinski],
      ["/todo", ToDo],
      ["/[^]*", NotFound],
    ]),
  ])
}

const unmount = mount(document.body, App)
