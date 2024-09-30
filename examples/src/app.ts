import {
  createEffect,
  createRoot,
  createSignal,
  onCleanup,
  resolve,
} from "space/signal"
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

mount(document.body, App)

/**
 * @param {string} body
 * @returns {(this: object, context: object) => any}
 */
function createHandler(body: string): (this: object, ...args: any[]) => any {
  return Function("$context", `with ($context) { return (${body}) }`) as any
}

const nodeTypesToIgnore = { 4: true, 7: true, 8: true }
const directives = {
  "$"(elt, context, name, handler) {
    context[name](elt, handler)
  },
  "@"(elt, _context, name, handler) {
    elt.addEventListener(name.slice(1), handler)
  },
  "."(elt, _context, name, handler) {
    elt[name.slice(1)] = handler()
  },
  ":"(elt, _context, name, handler) {
    elt.setAttribute(name.slice(1), handler())
  },
}

function traverseNodeAttributes(elt: Element, context: object) {
  for (const attr of Array.from(elt.attributes)) {
    const directive = directives[attr.name[0]]
    if (directive !== undefined) {
      elt.removeAttribute(attr.name)
      const handler = createHandler(attr.value).bind(elt, context)
      createEffect(() => {
        directive(elt, context, attr.name, handler)
      })
    }
  }
}

function traverseNode(node: Node, context: object) {
  for (const childNode of Array.from(node.childNodes)) {
    if (nodeTypesToIgnore[childNode.nodeType]) {
      continue
    }
    if (childNode.nodeType === 3) {
      const data = childNode["data"] as string
      if (!/\S/.test(data)) {
        continue
      }
      if (/{{([^]+?)}}/g.test(data)) {
        createEffect(() => {
          childNode["data"] = data.replaceAll(
            /{{([^]+?)}}/g,
            (_value, body) => createHandler(body).call(childNode, context),
          )
        })
      }
      continue
    }
    traverseNodeAttributes(childNode as Element, context)
    traverseNode(childNode, context)
  }
}

function createApp(
  fn: () =>
    & { [key: string]: any }
    & {
      [key in `$${string}`]: (
        element: HTMLElement,
        evaluate: () => any,
        binding: {
          expression: string
          name: string
          arg: string | null
          modifiers: { [key: string]: true | undefined }
        },
      ) => void
    },
) {
  return {
    mount(element: Element) {
      createRoot(() => traverseNode(element, fn()))
    },
  }
}

function $for(elt, handler) {
  elt["$for"] = elt["$for"] ?? { anchor: elt.previousSibling, children: null }
  const newChildren: any[] = []
  Array.from(handler()).forEach(($value, $index) => {
    const clone = (elt as HTMLTemplateElement).content.cloneNode(true)
    traverseNode(clone, { ...this, $value, $index })
    newChildren.push(...Array.from(clone.childNodes))
    elt.parentElement?.insertBefore(clone, elt["$for"].anchor)
  })
  elt["$for"].children = newChildren
  onCleanup(() => {
    elt["$for"].children?.forEach((node) => node.remove())
  })
}

function $show(elt, handler) {
  elt.style.display = handler() ? "" : "none"
}

function $if(elt, handler) {
  elt["$if"] = elt["$if"] ?? { anchor: elt.previousSibling, children: null }
  const newChildren: any[] = []
  if (handler()) {
    const clone = (elt as HTMLTemplateElement).content.cloneNode(true)
    traverseNode(clone, this)
    elt.parentElement?.insertBefore(clone, elt["$if"].anchor)
    newChildren.push(...Array.from(clone.childNodes))
  }
  elt["$if"].children = newChildren
  onCleanup(() => {
    elt["$if"].children?.forEach((node) => node.remove())
  })
}

const app = createApp(() => {
  const message = createSignal("hello world")

  return {
    message,
    $for,
    $if,
    $show,
  }
})

//app.mount(document.documentElement)
