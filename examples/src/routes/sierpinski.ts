import {
  createComputed,
  createSignal,
  inject,
  onMount,
  onUnmount,
  provide,
  type Signal,
} from "jail/signal"
import { createDirective, template } from "jail/dom"
import { getParams } from "jail/dom-router"

const Dot = (x: number, y: number, target: number) => {
  const counter = inject<Signal<number>>("counter")!
  const hover = createSignal(false)
  const text = () => hover() ? "*" + counter() + "*" : counter()
  const bgColor = () => hover() ? "lightpink" : "white"

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

  return template`
    <div
      d-my-text=${text} style=${css} d-style:background-color=${bgColor}
      d-on:mouseover.delegate=${() => hover(true)}
      d-on:mouseout.delegate=${() => hover(false)}
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

export default function Component() {
  const { target = "750", size = "25" } = getParams() || {}
  let id: number
  const elapsed = createSignal(0)
  const count = createSignal(0)
  const scale = createComputed(() => {
    const e = (elapsed() / 1000) % 10
    return (1 + (e > 5 ? 10 - e : e) / 10) / 2
  }, 0)

  provide("counter", count)

  onMount(() => {
    id = setInterval(() => count((count() % 10) + 1), 1000)
    const start = Date.now()
    const frame = () => {
      elapsed(Date.now() - start)
      requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  })

  onUnmount(() => clearInterval(id))

  createDirective<string>("my-text", (elt, binding) => {
    const value = binding.value + ""
    if (elt.firstChild?.nodeType === 3) {
      const textNode = elt.firstChild as Text
      textNode.data = value
    } else {
      elt.prepend(value)
    }
  })

  return template`
    <div style="position: absolute; left: 50%; top: 50%;" d-style:transform="scale(${scale}) translateZ(0.1px)">
      ${Triangle(0, 0, +target, +size)}
    </div>
  `
}
