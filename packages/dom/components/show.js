import { computed } from "space/signal"

/**
 * @template Type
 * @param {{ when: boolean | "true" | "false", children?: Type, fallback?: Type }} props
 */
export function Show(props) {
  return computed(() => {
    if (props.when + "" === "true") {
      return props.children
    }
    return props.fallback
  })
}
