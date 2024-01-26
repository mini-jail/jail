import { effect } from "space/signal"

/**
 * @param {{
 *   keyframes: Keyframe[],
 *   children: Element,
 *   options: KeyframeAnimationOptions
 *   signal?: import("space/signal").Signal
 *   on?: () => void
 * }} props
 */
export function Animate(props) {
  effect(() => {
    props.on?.()
    props.signal?.value
    props.children.animate(props.keyframes, props.options)
  })
  return props.children
}
