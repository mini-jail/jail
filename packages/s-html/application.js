import { root } from "space/signal"
import { createContext, evaluate } from "./context.js"
import { define, walkNode } from "./helpers.js"
import { scopeAttribute } from "./directives.js"

/**
 * @param {import("./mod.js").Scope} app
 * @returns {import("./mod.js").Application}
 */
export function createApplication(app) {
  return {
    directive(name, directive) {
      if (!app.$directives) {
        app.$directives = {}
      }
      app.$directives[name] = directive
      return this
    },
    mount(parentNode) {
      return root((cleanup) => {
        const context = createContext(parentNode)
        define(context, app)
        parentNode.querySelectorAll(`[${scopeAttribute}]`)
          .forEach((elt) => createScope(elt, context))
        return cleanup
      })
    },
  }
}

/**
 * @param {Element} elt
 * @param {import("./mod.js").Context} [parentContext]
 */
export function createScope(elt, parentContext) {
  root(() => {
    const expression = elt.getAttribute(scopeAttribute)
    elt.removeAttribute(scopeAttribute)
    const context = createContext(elt, parentContext)
    if (expression) {
      const injections = evaluate(context, elt, expression)
      if (injections) {
        define(context, injections)
      }
    }
    walkNode(elt, context)
  })
}
