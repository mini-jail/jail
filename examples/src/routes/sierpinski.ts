import {
  cleanup,
  effect,
  inject,
  memo,
  provide,
  signal,
  untrack,
} from "space/signal"
import html, { getParams } from "space/dom"

const Dot = (x: number, y: number, target: number) => {
  const counter = inject<{ value: number }>("counter")!
  const hover = signal(false)
  const text = memo(() => {
    return hover.value ? "*" + counter.value + "*" : counter.value + ""
  })
  const bgColor = memo(() => hover.value ? "lightpink" : "white")

  const css = `
    width: ${target}px;
    height: ${target}px;
    line-height: ${target}px;
    left: ${x}px;
    top: ${y}px;
    font-size: ${(target / 2.5)}px;
    border-radius: ${target}px;
    position: absolute;
    text-align: center;
    cursor: pointer;
    user-select: none;
  `

  return html`
    <div
      use:text=${text} style=${css} style:background-color=${bgColor}
      on:mouseoverDelegate=${(_event) => hover.value = true}
      on:mouseoutDelegate=${(_event) => hover.value = false}
    ></div>
  `
}

const Triangle = (x: number, y: number, target: number, size: number) => {
  if (target <= size) {
    return Dot(x, y, target)
  }
  target = target / 2
  return [
    Triangle(x, y - target / 2, target, size),
    Triangle(x - target, y + target / 2, target, size),
    Triangle(x + target, y + target / 2, target, size),
  ]
}

export default function Sierpinski() {
  const { target = "750", size = "25" } = getParams() || {}
  let id: number
  const elapsed = signal(0)
  const count = signal(0)
  const scale = memo(() => {
    const e = (elapsed.value / 1000) % 10
    return (1 + (e > 5 ? 10 - e : e) / 10) / 2
  }, 1)

  provide("counter", count)

  effect(() => {
    untrack(() => {
      id = setInterval(() => count.value = (count.value % 10) + 1, 1000)
      const start = Date.now()
      const frame = () => {
        elapsed.value = Date.now() - start
        requestAnimationFrame(frame)
      }
      requestAnimationFrame(frame)
    })
  })

  cleanup(() => {
    clearInterval(id)
    console.log("Sierpinski is dead")
  })

  return html`
    <div 
      style="position: absolute; left: 50%; top: 50%;" 
      style:transform="scale(${scale}) translateZ(0.1px)"
    >
      ${Triangle(0, 0, +target, +size)}
    </div>
  `
}
