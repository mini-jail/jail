import { effect } from "space/signal"
import html, { Animate, mount, path, Route, Router } from "space/dom"
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
      state=${path}
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

/* import { createElement, mount } from "space/element"
import { createRouter, path } from "space/element-router"
import { computed, effect, state } from "space/signal"
function Paragraph(...children) {
  return createElement("p").add(...children)
}
function Anchor(href, ...children) {
  return createElement("a").property("href", href).add(...children)
}
function Header() {
  return createElement("header")
    .add(
      createElement("h3").add("space/"),
      createElement("nav")
        .add(
          Anchor("/", "home"),
          Anchor("/counter", "counter"),
          Anchor("/sierpinski", "sierpinski"),
          Anchor("/todo", "todo"),
          Anchor("/about", "about"),
        ),
    )
}
function Title(title: string, description: string) {
  return createElement("h4")
    .add(
      title,
      createElement("sub")
        .add(description),
    )
}
function About() {
  return createElement("article")
    .add(Title("about", "(signal? me? idk...)"))
    .add(createElement("h5").add("special thx to:"))
}
function Sierpinski() {
  return createElement("article")
    .add(Title("sierpinski", "(i mean...why??)"))
}
function ToDo() {
  return createElement("article")
    .add(Title("todo", "(no-one ever have done that, i promise!)"))
}
function Counter() {
  const counter = state(0)
  const show = state(false)
  const code = `
import { state } from "space/signal"
import { createElement } from "space/element"

function* SimpleCounter() {
  const counter = state(0)
  yield createElement("button")
    .add("-")
    .on("click", () => counter.value--)
  yield createElement("span")
    .add("current value: ", counter)
  yield createElement("button")
    .add("+")
    .on("click", () => counter.value++)
}`.trim()

  return createElement("article").add(
    Title("counter example", "(...what else?)").add(
      createElement("button")
        .add(() => show.get() ? "hide code" : "show code")
        .on("click", () => show.set(!show.get())),
    ),
    createElement("button").add("-").on("click", () => counter.value--),
    createElement("span").add("current value: ", counter),
    createElement("button").add("+").on("click", () => counter.value++),
    createElement("code")
      .style("display", computed(() => show.get() ? "" : "none"))
      .add(...code.split("\n").map((line) => createElement("pre").add(line))),
  )
}
function Home() {
  return createElement("article")
    .add(Title("welcome home!", "(sucker)"))
    .add(
      Paragraph(
        "just look at my examples like ",
        Anchor("/counter", "counter"),
        ".",
      ),
      Paragraph(
        "i tend to create examples like ",
        Anchor("/sierpinski", "sierpinski"),
        ' because i want to test out the performance of my libraries ^^"',
      ),
      Paragraph("btw. this whole page is just an example, lol."),
    )
}

function Animate(child) {
  let rendered, keys, opts, st
  effect(() => {
    st.value
    rendered?.animate(keys, opts)
  })
  return {
    on(state) {
      st = state
      return this
    },
    keyframes(...keyframes) {
      keys = keyframes
      return this
    },
    options(options) {
      opts = options
      return this
    },
    render() {
      return rendered = child.render()
    },
  }
}

function* Application() {
  yield Header()
  yield Animate(
    createElement("main")
      .add(
        createRouter("pathname")
          .route("/", Home)
          .route("/counter", Counter)
          .route("/about", About)
          .route("/sierpinski", Sierpinski)
          .route("/todo", ToDo),
      ),
  )
    .on(path)
    .keyframes(
      { opacity: 0, transform: "translateY(-10px)" },
      { opacity: 1, transform: "unset" },
    )
    .options({ delay: 50, duration: 250, fill: "both" })
}

mount(document.body, Application) */
