import { Effect, State } from "space/signal"

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
  new Effect(() => {
    props.state?.value
    props.children.animate(props.keyframes, props.options)
  })
  return props.children
}
