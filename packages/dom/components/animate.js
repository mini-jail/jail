import { effect, State } from "space/signal"

/**
 * @param {{
 *   keyframes: Keyframe[],
 *   children: Element,
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
