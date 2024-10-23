import { computed } from "space/signal"

/**
 * @template Type
 * @param {{
 *   each: Iterable<Type>,
 *   children: (item: Type, index: number) => Type,
 *   fallback?: Type
 * }} props
 */
export function For(props) {
  return computed(() => {
    const array = Array.from(props.each)
    if (array.length === 0) {
      return props.fallback
    }
    return array.map((item, index) => props.children(item, index))
  })
}
