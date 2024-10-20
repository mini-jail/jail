import { Computed, State } from "space/signal"

/**
 * @template Type
 * @overload
 * @param {() => Type} fn
 * @returns {Computed<Type>}
 */
/**
 * @template Type
 * @overload
 * @param {Type} value
 * @returns {State<Type>}
 */
export default function (fnOrValue) {
  if (typeof fnOrValue === "function") {
    return new Computed(fnOrValue)
  }
  return new State(fnOrValue)
}
