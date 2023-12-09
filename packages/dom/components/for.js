import { createComputed } from "jail/signal"
import { resolve } from "../helpers/mod.js"

/**
 * @param {space.ForProps} props
 * @returns
 */
export function For(props) {
  return createComputed(() => resolve(props.each).map(props.do), [])
}
