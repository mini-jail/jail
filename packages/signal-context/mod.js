import { inject, provide } from "space/signal"
/**
 * @template Type
 */
export class Context {
  /**
   * @private
   * @readonly
   */
  _id = Symbol()
  /**
   * @private
   * @readonly
   */
  _defaultValue
  /**
   * @param {Type} [defaultValue]
   */
  constructor(defaultValue) {
    this._defaultValue = /** @type {Type} */ (defaultValue)
  }
  /**
   * @param {Type} value
   */
  provide(value) {
    provide(this._id, value)
  }
  inject() {
    return inject(this._id, this._defaultValue)
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
/**
 * @param {unknown} [defaultValue]
 * @returns {Context<unknown>}
 */
export function context(defaultValue) {
  return new Context(defaultValue)
}
