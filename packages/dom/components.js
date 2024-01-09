/**
 * @type {Record<Capitalize<string>, import("./mod.js").Component<any>>}
 */
export const components = Object.create(null)

/**
 * @template {import("./mod.js").Props} Type
 * @param {Capitalize<string>} name
 * @param {import("./mod.js").Component<Type>} fn
 */
export function component(name, fn) {
  components[name] = fn
}
