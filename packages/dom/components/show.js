import { computed } from "space/signal"

/**
 * @param {{ when: boolean | "true" | "false", children?: any, fallback?: any }} props
 */
export function Show(props) {
  return computed(() => {
    if (props.when + "" === "true") {
      return props.children
    }
    return props.fallback
  })
}
