import { memo, root } from "space/signal"

/**
 * @template [Type = any]
 * @param {{
 *   each: Iterable<Type>,
 *   children: (item: Type, index: number) => any,
 *   fallback?: any
 * }} props
 */
export function For(props) {
  return memo(() => {
    const array = Array.from(props.each)
    if (array.length === 0) {
      return props.fallback
    }
    return array.map((item, index) => root(() => props.children(item, index)))
  })
}
