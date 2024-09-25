import { createMemo } from "space/signal"

/**
 * @param {{ when: boolean | "true" | "false", children?: any, fallback?: any }} props
 */
export function Show(props) {
  return createMemo(() => {
    if (props.when + "" === "true") {
      return props.children
    }
    return props.fallback
  })
}
