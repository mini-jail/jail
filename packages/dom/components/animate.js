import { effect } from "space/signal"

/**
 * @param {{
 *   keyframes: Keyframe[],
 *   children: Element,
 *   options: KeyframeAnimationOptions
 *   on?: import("space/signal").Signal
 * }} props
 */
export function Animate(props) {
  effect(() => {
    props.on?.value
    props.children.animate(props.keyframes, props.options)
  })
  return props.children
}
