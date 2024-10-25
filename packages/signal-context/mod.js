import { inject, provide } from "space/signal"
/**
 * @template Type
 */
export class Context {
  /**
   * @private
   * @readonly
   */
  id = Symbol()
  /**
   * @private
   * @readonly
   */
  defaultValue
  /**
   * @param {Type} [defaultValue]
   */
  constructor(defaultValue) {
    this.defaultValue = /** @type {Type} */ (defaultValue)
  }
  /**
   * @param {Type} value
   */
  provide(value) {
    provide(this.id, value)
  }
  inject() {
    return inject(this.id, this.defaultValue)
  }
}
/**
 * @template Type
 * @overload
 * @returns {Context<Type | undefined>}
 */
/**
 * @template Type
 * @overload
 * @param {Type} defaultValue
 * @returns {Context<Type>}
 */
export function context(defaultValue) {
  return new Context(defaultValue)
}
