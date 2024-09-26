import { createEffect } from "space/signal"

/**
 * @param {{
 *   keyframes: Keyframe[],
 *   children: Element,
 *   options: KeyframeAnimationOptions
 *   signal?: import("space/signal").Signal
 * }} props
 */
export function Animate(props) {
  createEffect(() => {
    props.signal?.value
    props.children.animate(props.keyframes, props.options)
  })
  return props.children
}
