import { cleanup, effect, signal } from "space/signal"
import { mount } from "../renderer/mod.js"

/**
 * @param {space.PortalProps} props
 */
export function Portal(props) {
  const live = signal(true)
  effect(() => {
    const target = props.selector
      ? document.querySelector(props.selector)
      : props.mount
      ? props.mount
      : document.body
    if (target === null) {
      throw new Error(`Portal target is null!`)
    }
    mount(target, () => live.value && props.children)
    cleanup(() => live.value = false)
  })
}
