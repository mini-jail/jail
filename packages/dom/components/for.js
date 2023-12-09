import { createComputed } from "space/signal"
import { resolve } from "../helpers/mod.js"

/**
 * @param {space.ForProps} props
 */
export function For(props) {
  return createComputed(() => resolve(props.each).map(props.do), [])
}
