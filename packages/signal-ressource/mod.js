import { effect, signal } from "space/signal"
/**
 * @template Type
 */
export class Ressource {
  /**
   * @private
   */
  valueSignal = signal()
  /**
   * @private
   */
  errorSignal = signal(/** @type {Error?} */ (null))
  /**
   * @private
   */
  loadingSignal = signal(false)
  /**
   * @param {() => Promise<Type>} fn
   */
  constructor(fn) {
    effect(() => {
      this.loadingSignal(true)
      fn()
        .then((value) => {
          this.errorSignal(null)
          this.valueSignal(value)
        })
        .catch((error) => {
          this.valueSignal(undefined)
          this.errorSignal(error)
        })
        .finally(() => {
          this.loadingSignal(false)
        })
    })
  }
  get value() {
    if (this.loadingSignal() || this.errorSignal()) {
      return undefined
    }
    return this.valueSignal()
  }
  get error() {
    return this.errorSignal()
  }
  get isLoading() {
    return this.loadingSignal()
  }
}
/**
 * @template Type
 * @param {() => Promise<Type>} fn
 */
export function ressource(fn) {
  return new Ressource(fn)
}
