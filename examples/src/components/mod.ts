import { type Child, create } from "space/element"
import { Context } from "space/signal/context"
import { effect, onCleanup, signal } from "space/signal"

type TriangleProps = { x: number; y: number; target: number; size: number }
type DotProps = { x: number; y: number; target: number }
interface AnimateProps extends KeyframeAnimationOptions {
  signal?: () => void
  keyframes: Keyframe[]
}
interface PageProps {
  title: string
  description: string
}
const counterContext = new Context(signal(0))

export function animate(props: AnimateProps) {
  return (elt: HTMLElement) => {
    const { keyframes, signal, ...options } = props
    signal?.()
    elt.animate(keyframes, options)
  }
}

export function Page(props: PageProps, ...children: Child[]) {
  return create("article", null, [
    create("h4", null, props.title, create("sub", null, props.description)),
    ...children,
  ])
}

export function Paragraph(
  stringArray: TemplateStringsArray,
  ...children: unknown[]
) {
  return create("p", null, [stringArray.map((string, index) => {
    if (children[index] != null) {
      return [string, children[index]]
    }
    return string
  })])
}

export function Anchor(href: string, ...children: Child[]) {
  return create("a", { href }, ...children)
}

function Dot({ x, y, target }: DotProps) {
  const counter = counterContext.inject()
  const hover = signal(false)
  const cssText = `
    width: ${target}px;
    height: ${target}px;
    line-height: ${target}px;
    left: ${x}px;
    top: ${y}px;
    font-size: ${(target / 2.5)}px;
    border-radius: ${target}px;
  `
  return create("div", {
    class: "sierpinski-dot",
    "style:cssText": cssText,
    "style:backgroundColor": () => hover() ? "lightpink" : "white",
    onMouseOver: () => hover(true),
    onMouseOut: () => hover(false),
    children: () => {
      return hover() ? "*" + counter() + "*" : counter() + ""
    },
  })
}

function* Triangle(
  { x, y, target, size }: TriangleProps,
): Generator<HTMLDivElement> {
  if (target <= size) {
    return yield Dot({ x, y, target })
  }
  target = target / 2
  yield* Triangle({ x, y: y - target / 2, target, size })
  yield* Triangle({ x: x - target, y: y + target / 2, target, size })
  yield* Triangle({ x: x + target, y: y + target / 2, target, size })
}

export function SierpinskiTriangle() {
  let id: number, frameId: number
  const elapsed = signal(0)
  const count = signal(0)
  const scale = () => {
    const e = (elapsed() / 1000) % 10
    return (1 + (e > 5 ? 10 - e : e) / 10) / 2
  }
  counterContext.provide(count)
  effect(() => {
    console.log("Sierpinski is alive")
    id = setInterval(() => count((count() % 10) + 1), 1000)
    const start = Date.now()
    const frame = () => {
      elapsed(Date.now() - start)
      frameId = requestAnimationFrame(frame)
    }
    frameId = requestAnimationFrame(frame)
  })
  onCleanup(() => {
    clearInterval(id)
    cancelAnimationFrame(frameId)
    console.log("Sierpinski is dead")
  })
  return create("div", {
    class: "sierpinski-wrapper",
    "style:transform": () => `scale(${scale()}) translateZ(0.1px)`,
    children: Triangle({ x: 0, y: 0, target: 750, size: 25 }),
  })
}
