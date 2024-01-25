import { effect } from "space/signal"

/**
 * @param {{ keyframes: Keyframe[], children: Element, options: KeyframeAnimationOptions }} props
 */
export function Animate(props) {
  effect(() => {
    props.children.animate(props.keyframes, props.options)
  })
  return props.children
}
