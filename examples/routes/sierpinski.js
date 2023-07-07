import {
  createComputed,
  createSignal,
  inject,
  onMount,
  onUnmount,
  provide,
} from "jail/signal"
import { createDirective, template } from "jail/dom"
import { getParams } from "jail/router"

const Dot = (x, y, target) => {
  const counter = inject("counter")
  const hover = createSignal(false)
  const clicked = createSignal(false)
  const onMouseOut = () => hover(false)
  const onMouseOver = () => hover(true)
  const onMouseDown = () => clicked(true)
  const onMouseUp = () => clicked(false)
  const text = () => hover() ? "*" + counter() + "*" : counter()
  const bgColor = () => hover() ? clicked() ? "hotpink" : "lightpink" : "white"

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
      d-my-text="${text}" style="${css}" d-style:background-color="${bgColor}"
      d-on:mousedown.delegate="${onMouseDown}"
      d-on:mouseup.delegate="${onMouseUp}"
      d-on:mouseover.delegate="${onMouseOver}"
      d-on:mouseout.delegate="${onMouseOut}"
    ></div>
  `
}

const Triangle = (x, y, target, size) => {
  if (target <= size) {
    return Dot(x, y, target)
  }
  target = target / 2
  return template`
    ${Triangle(x, y - target / 2, target, size)}
    ${Triangle(x - target, y + target / 2, target, size)}
    ${Triangle(x + target, y + target / 2, target, size)}
  `
}

export default () => {
  const { target = "750", size = "25" } = getParams() || {}
  let id
  const elapsed = createSignal(0)
  const count = createSignal(0)
  const scale = createComputed(() => {
    const e = (elapsed() / 1000) % 10
    return (1 + (e > 5 ? 10 - e : e) / 10) / 2
  })

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

  createDirective("my-text", (elt, binding) => {
    const value = String(binding.value)
    if (elt.firstChild?.nodeType === 3) {
      elt.firstChild.data = value
    } else {
      elt.prepend(value)
    }
  })

  return template`
    <div style="position: absolute; left: 50%; top: 50%;" d-style:transform="scale(${scale}) translateZ(0.1px)">
      ${Triangle(0, 0, Number(target), Number(size))}
    </div>
  `
}
