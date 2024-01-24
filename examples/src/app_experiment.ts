import { createApplication, type Scope } from "space/s-html"
import { effect, memo, onCleanup, signal } from "space/signal"

type ToDoItem = {
  id: number
  done: boolean
  text: string
}

function useRouter() {
  const path = signal(location.pathname)
  const url = new URL(location.toString())
  const clickListener = (event) => {
    let elt = event.target, pathname
    while (elt != null) {
      pathname = elt?.getAttribute?.("href")
      if (pathname?.startsWith("/")) {
        event.preventDefault()
        if (pathname !== url.pathname) {
          path.value = pathname
          url.pathname = pathname
          return history.pushState(null, "", url)
        }
      }
      elt = elt?.parentElement
    }
  }
  function popStateListener(event) {
    event.preventDefault()
    path.value = location.pathname
  }
  effect(() => {
    path.value = location.pathname
    addEventListener("click", clickListener)
    addEventListener("popstate", popStateListener)
  })
  onCleanup(() => {
    removeEventListener("click", clickListener)
    removeEventListener("popstate", popStateListener)
  })
  return path
}

function App(): Scope {
  const path = useRouter()
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
  return {
    get title() {
      return `smol${path.value}`
    },
    get path() {
      return path.value
    },
    get pathAnimation() {
      return pathAnimation.value
    },
    $directives: {
      animate(elt, binding) {
        const { keyframes, ...options } = binding.evaluate()
        elt.animate(keyframes, options)
      },
    },
  }
}

function Counter(initialValue?: number) {
  const counter = signal(initialValue ?? 0)
  let clickedValue = 0
  const clicked = memo(() => {
    counter.value
    return clickedValue++
  })
  return {
    counter,
    clicked,
    get key() {
      return "key_" + counter.value.toString()
    },
  }
}

const list = signal<ToDoItem[]>([
  { id: 0, done: true, text: "eat cornflakes without soymilk" },
  { id: 1, done: false, text: "buy soymilk" },
])
function ToDo() {
  const text = signal("")
  return {
    text,
    addItem() {
      list.value = list.value.concat({
        id: Date.now(),
        done: false,
        text: text.value,
      })
      text.value = ""
    },
    toggleItem(item: ToDoItem) {
      item.done = !item.done
      list.value = list.value.slice()
    },
    deleteItem(item: ToDoItem) {
      list.value = list.value.filter((value) => value !== item)
    },
    get items() {
      return list.value
    },
    get size() {
      return list.value.length
    },
    get done() {
      return list.value.filter((item) => item.done).length
    },
  }
}

createApplication({ App, Counter, ToDo })
  .mount(document)
