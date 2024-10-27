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
  const pages = [
    { href: "/", text: "home" },
    { href: "/counter", text: "counter" },
    { href: "/sierpinski", text: "sierpinski" },
    { href: "/todo", text: "todo" },
    { href: "/about", text: "about" },
    { href: "/error", text: "error" },
  ]
  return create("header", null, [
    create("h3", null, "space", path),
    create("nav", null, [
      pages.map(({ href, text }) => create("a", { href }, text)),
      create("a", { onClick: unmount }, "unmount"),
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
  yield create(Header)
  yield create("main", { ref: animate(animateProps) }, [
    create(
      Router,
      { type: "pathname" },
      { path: "/", child: Home },
      { path: "/counter", child: Counter },
      { path: "/about", child: About },
      { path: "/sierpinski", child: Sierpinski },
      { path: "/todo", child: ToDo },
      { path: "/[^]*", child: NotFound },
    ),
  ])
}

const unmount = mount(document.body, App)
