/**
 * @type {import("./mod.js").Directives}
 */
export const directives = {}
export const scopeAttribute = "s-scope"
export const shorthands = { ":": "bind", "@": "on" }

/**
 * @param {Lowercase<string>} name
 * @param {import("./mod.js").Directive} directive
 */
export function directive(name, directive) {
  directives[name] = directive
}

/**
 * @param {import("./mod.js").Context} context
 * @param {string} name
 * @returns {import("./mod.js").Directive | undefined}
 */
export function getDirective(context, name) {
  let directive = context.$directives[name]
  if (directive !== undefined) {
    return directive
  }
  let parentContext = context.$parent
  while (parentContext) {
    directive = parentContext.$directives[name]
    if (directive !== undefined) {
      return directive
    }
    parentContext = parentContext.$parent
  }
  return directives[name]
}
