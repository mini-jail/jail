import { Computed } from "space/signal"

/**
 * @template Type
 * @param {{ when: boolean | "true" | "false", children?: Type, fallback?: Type }} props
 */
export function Show(props) {
  return new Computed(() => {
    if (props.when + "" === "true") {
      return props.children
    }
    return props.fallback
  })
}
