import { createComputed, createRoot } from "space/signal"

/**
 * @template [Type = any]
 * @param {{
 *   each: Iterable<Type>,
 *   children: (item: Type, index: number) => any,
 *   fallback?: any
 * }} props
 */
export function For(props) {
  return createComputed(() => {
    const array = Array.from(props.each)
    if (array.length === 0) {
      return props.fallback
    }
    return array.map((item, index) =>
      createRoot(() => props.children(item, index))
    )
  })
}
