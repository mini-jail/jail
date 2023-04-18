import { effect, onCleanup, scoped, signal } from "./mod.ts"

scoped((cleanup) => {
  const counter = signal(0)
  const id = setInterval(() => {
    counter(counter() + 1)
    if (counter() === 10) {
      cleanup()
    }
  }, 1000)
  effect(() => {
    onCleanup(() => {
      console.log("cleanup: effect")
    })
    console.log(`counter: ${counter()}`)
  })
  onCleanup(() => {
    console.log("cleanup: root")
    clearInterval(id)
  })
})
