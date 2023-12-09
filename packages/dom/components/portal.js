import { createSignal, onMount, onUnmount } from "space/signal"
import { renderDynamicChild } from "../renderer/mod.js"

/**
 * @param {space.PortalProps} props
 */
export function Portal(props) {
  const live = createSignal(true)
  onMount(() => {
    const target = props.selector
      ? document.querySelector(props.selector)
      : props.mount
      ? props.mount
      : document.body
    if (target === null) {
      throw new Error(`Portal target is null (${props.selector})`)
    }
    renderDynamicChild(target, () => live() && props.children, false)
  })
  onUnmount(() => live(false))
}
