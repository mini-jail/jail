import { effect, State } from "space/signal"

/**
 * @template {Element} Type
 * @param {{
 *   keyframes: Keyframe[],
 *   children: Type,
 *   options: KeyframeAnimationOptions
 *   state: State
 * }} props
 */
export function Animate(props) {
  effect(() => {
    props.state?.value
    props.children.animate(props.keyframes, props.options)
  })
  return props.children
}
