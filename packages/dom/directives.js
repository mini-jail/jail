/**
 * @type {Record<string, import("./mod.js").Directive<any>>}
 */
export const directives = Object.create(null)

/**
 * @template Type
 * @param {string} name
 * @param {import("./mod.js").Directive<Type>} fn
 */
export function directive(name, fn) {
  directives[name] = fn
}
