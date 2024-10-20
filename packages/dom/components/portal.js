import { Effect, onCleanup, State } from "space/signal"
import { mount } from "../renderer.js"

/**
 * @template Type
 * @overload
 * @param {{ selector: string, children?: Type }} props
 */
/**
 * @template Type
 * @overload
 * @param {{ mount: Element, children?: Type }} props
 */
/**
 * @param {{ selector?: string, mount?: Element, children?: any }} props
 */
export function Portal(props) {
  const isLive = new State(true)
  new Effect(() => {
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
