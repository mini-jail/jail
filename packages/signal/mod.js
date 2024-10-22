/**
 * @type {WeakMap<State, Set<Effect>>}
 */
const effectMap = new WeakMap()
/**
 * @type {Set<Effect>}
 */
const effectQueue = new Set()
const errorKey = Symbol("Error")
let isRunning = false
/**
 * @type {BasicNode?}
 */
let activeNode = null
/**
 * @template [Type = any]
 */
export class BasicNode {
  /**
   * @type {Type | undefined}
   */
  value
  /**
   * @type {BasicNode?}
   */
  parentNode = activeNode
  /**
   * @type {BasicNode[]?}
   */
  childNodes = null
  /**
   * @type {{ [key: string |  symbol]: any }?}
   */
  context = null
  /**
   * @type {(() => void)[]?}
   */
  cleanups = null
  /**
   * @type {((value: Type | undefined) => Type)?}
   */
  onupdate = null
  constructor() {
    if (activeNode) {
      if (activeNode.childNodes === null) {
        activeNode.childNodes = [this]
      } else {
        activeNode.childNodes.push(this)
      }
    }
  }
  /**
   * @param {boolean} [dispose]
   */
  clean(dispose) {
    if (this.childNodes?.length) {
      let childNode = this.childNodes.pop()
      while (childNode) {
        childNode.clean(childNode.onupdate ? true : dispose)
        childNode = this.childNodes.pop()
      }
    }
    if (this.cleanups?.length) {
      let cleanup = this.cleanups.pop()
      while (cleanup) {
        cleanup()
        cleanup = this.cleanups.pop()
      }
    }
    this.context = null
    if (dispose) {
      this.value = undefined
      this.parentNode = null
      this.childNodes = null
      this.cleanups = null
      this.onupdate = null
    }
  }
}
/**
 * @template [Type = any]
 * @extends {BasicNode<Type>}
 */
export class Root extends BasicNode {
  /**
   * @param {() => Type} fn
   */
  constructor(fn) {
    super()
    activeNode = this
    try {
      this.value = fn()
    } catch (error) {
      handleError(error)
    } finally {
      activeNode = this.parentNode
    }
  }
}
/**
 * @template [Type = any]
 * @extends {BasicNode<Type>}
 */
export class Effect extends BasicNode {
  /**
   * @type {State[]?}
   */
  states = null
  /**
   * @param {((value: Type | undefined) => Type)} update
   */
  constructor(update) {
    super()
    this.onupdate = update
    if (isRunning) {
      effectQueue.add(this)
    } else {
      queueMicrotask(() => this.update())
    }
  }
  queue() {
    effectQueue.add(this)
    if (isRunning === false) {
      isRunning = true
      queueMicrotask(() => {
        for (const effect of effectQueue) {
          effect.update()
        }
        effectQueue.clear()
        isRunning = false
      })
    }
  }
  update() {
    this.clean()
    if (this.onupdate === null) {
      return
    }
    const prevNode = activeNode
    try {
      activeNode = this
      this.value = this.onupdate(this.value)
    } catch (error) {
      handleError(error)
    } finally {
      activeNode = prevNode
    }
  }
  /**
   * @override
   * @param {boolean} [dispose]
   */
  clean(dispose) {
    if (this.states?.length) {
      let state = this.states.pop()
      while (state) {
        effectMap.get(state)?.delete(this)
        state = this.states.pop()
      }
    }
    if (dispose) {
      this.states = null
    }
    super.clean(dispose)
  }
}
/**
 * @template [Type = any]
 */
export class State {
  /**
   * @private
   * @type {Type}
   */
  _value
  /**
   * @param {Type} [value]
   */
  constructor(value) {
    this._value = /** @type {Type} */ (value)
  }
  get value() {
    if (activeNode?.onupdate) {
      const activeEffect = /** @type {Effect} */ (activeNode)
      let effects = effectMap.get(this)
      if (effects === undefined) {
        effectMap.set(this, effects = new Set())
      }
      effects.add(activeEffect)
      if (activeEffect.states === null) {
        activeEffect.states = [this]
      } else if (!activeEffect.states.includes(this)) {
        activeEffect.states.push(this)
      }
    }
    return this._value
  }
  set value(value) {
    this._value = value
    effectMap.get(this)?.forEach((effect) => effect.queue())
  }
}
/**
 * @template [Type = any]
 * @extends {State<Type>}
 */
export class Computed extends State {
  /**
   * @param {() => Type} fn
   */
  constructor(fn) {
    super()
    new Effect(() => {
      super.value = fn()
    })
  }
  /**
   * @override
   */
  get value() {
    return super.value
  }
}
/**
 * @template Type
 * @param {Type} [value]
 */
export function state(value) {
  return new State(value)
}
/**
 * @template Type
 * @param {() => Type} fn
 */
export function computed(fn) {
  return new Computed(fn)
}
/**
 * @overload
 * @param {() => void} update
 * @returns {void}
 */
/**
 * @template Type
 * @overload
 * @param {(value: Type | undefined) => Type} update
 * @returns {void}
 */
/**
 * @param {(value: any) => any} update
 * @returns {void}
 */
export function effect(update) {
  new Effect(update)
}
/**
 * @template Type
 * @param {() => Type} fn
 * @returns {Type | undefined}
 */
export function root(fn) {
  return new Root(fn).value
}
/**
 * @template Type
 * @param {string | symbol} key
 * @param {Type} value
 * @returns {void}
 */
export function provide(key, value) {
  if (activeNode === null) {
    throw new Error("provide(key, value): activeNode is null!")
  }
  if (activeNode.context === null) {
    activeNode.context = {}
  }
  activeNode.context[key] = value
}
/**
 * @template Type
 * @overload
 * @param {string | symbol} key
 * @returns {Type | undefined}
 */
/**
 * @template Type
 * @overload
 * @param {string | symbol} key
 * @param {Type} value
 * @returns {Type}
 */
/**
 * @template Type
 * @param {string | symbol} key
 * @param {Type} [value]
 * @returns {Type | undefined}
 */
export function inject(key, value) {
  return lookup(activeNode, key) ?? value
}
/**
 * @template Type
 * @param {() => Type} fn
 * @returns {Type}
 */
export function untrack(fn) {
  const node = activeNode
  activeNode = null
  try {
    return fn()
  } finally {
    activeNode = node
  }
}
/**
 * @param {() => void} cleanup
 */
export function onCleanup(cleanup) {
  if (activeNode === null) {
    throw new Error("onCleanup(cleanup): activeNode is null!")
  }
  if (activeNode.cleanups === null) {
    activeNode.cleanups = [cleanup]
  } else {
    activeNode.cleanups.push(cleanup)
  }
}
/**
 * @param {(error: any) => void} fn
 */
export function catchError(fn) {
  if (activeNode === null) {
    throw new Error(`catchError(fn): activeNode is null!`)
  }
  if (activeNode.context === null) {
    activeNode.context = {}
  }
  if (activeNode.context[errorKey]) {
    activeNode.context[errorKey].push(fn)
  } else {
    activeNode.context[errorKey] = [fn]
  }
}
/**
 * @param {BasicNode | null} node
 * @param {string | symbol} key
 * @returns {any}
 */
function lookup(node, key) {
  return node === null
    ? undefined
    : node.context !== null && key in node.context
    ? node.context[key]
    : lookup(node.parentNode, key)
}
/**
 * @param {any} error
 */
function handleError(error) {
  const errorFns = lookup(activeNode, errorKey)
  if (!errorFns) {
    return reportError(error)
  }
  for (const errorFn of errorFns) {
    errorFn(error)
  }
}
