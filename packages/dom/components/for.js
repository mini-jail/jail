import { createComputed } from "space/signal"
import { resolve } from "../helpers/mod.js"

/**
 * @param {space.ForProps} props
 * @returns {space.ReadOnlySignal<space.Slot>}
 */
export function For(props) {
  return createComputed(() => {
    return [props.children, resolve(props.each).map(props.do)]
  }, [])
}
