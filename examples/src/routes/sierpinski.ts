import {
  computed,
  effect,
  inject,
  onCleanup,
  provide,
  type State,
  state,
} from "space/signal"
import html from "space/dom"

type DotProps = { x: number; y: number; target: number }

const Dot = ({ x, y, target }: DotProps) => {
  const counter = inject<State<number>>("counter")!
  const hover = state(false)
  const text = computed(() => {
    return hover.value ? "*" + counter.value + "*" : counter.value + ""
  })
  const bgColor = computed(() => hover.value ? "lightpink" : "white")
  const css = `
    width: ${target}px;
    height: ${target}px;
    line-height: ${target}px;
    left: ${x}px;
    top: ${y}px;
    font-size: ${(target / 2.5)}px;
    border-radius: ${target}px;
  `
  return html`
    <div
      textContent=${text}
      style=${css}
      style:backgroundColor=${bgColor}
      class="sierpinski-dot"
      @mouseover=${() => hover.value = true}
      @mouseout=${() => hover.value = false}>
    </div>
  `
}

type TriangleProps = { x: number; y: number; target: number; size: number }

const Triangle = ({ x, y, target, size }: TriangleProps) => {
  if (target <= size) {
    return html`<${Dot} x=${x} y=${y} target=${target} />`
  }
  target = target / 2
  return html`
    <${Triangle} 
      x=${x} 
      y=${y - target / 2} 
      target=${target} 
      size=${size}
    />
    <${Triangle} 
      x=${x - target} 
      y=${y + target / 2} 
      target=${target} 
      size=${size}
    />
    <${Triangle} 
      x=${x + target} 
      y=${y + target / 2} 
      target=${target} 
      size=${size}
    />
  `
}

export default function Sierpinski() {
  let id: number
  const elapsed = state(0)
  const count = state(0)
  const scale = computed(() => {
    const e = (elapsed.value / 1000) % 10
    return (1 + (e > 5 ? 10 - e : e) / 10) / 2
  })

  provide("counter", count)

  effect(() => {
    id = setInterval(() => count.value = (count.value % 10) + 1, 1000)
    const start = Date.now()
    const frame = () => {
      elapsed.value = Date.now() - start
      requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  })

  onCleanup(() => {
    clearInterval(id)
    console.log("Sierpinski is dead")
  })

  const transform = computed(() => `scale(${scale.value}) translateZ(0.1px)`)

  return html`
    <div class="sierpinski-wrapper" style:transform=${transform}>
      <${Triangle} x=${0} y=${0} target=${750} size=${25} />
    </div>
  `
}
