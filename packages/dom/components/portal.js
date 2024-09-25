import { createEffect, createSignal, onCleanup } from "space/signal"
import { mount } from "../renderer.js"

/**
 * @overload
 * @param {{ selector: string, children?: any }} props
 */
/**
 * @overload
 * @param {{ mount: Element, children?: any }} props
 */
/**
 * @param {{ selector?: string, mount?: Element, children?: any }} props
 */
export function Portal(props) {
  const isLive = createSignal(true)
  createEffect(() => {
    const target = props.selector
      ? document.querySelector(props.selector)
      : props.mount
      ? props.mount
      : document.body
    if (target === null) {
      throw new Error(`Portal target is null!`)
    }
    mount(target, () => isLive.value && props.children)
  })
  onCleanup(() => isLive.value = false)
}
