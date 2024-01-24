import { effect } from "space/signal"
import { evaluate } from "./context.js"
import { getDirective, scopeAttribute, shorthands } from "./directives.js"
import { attrRE, templateRE } from "./regular-expressions.js"
import { createScope } from "./application.js"

const consumedName = "__consumed"
const consumedAttributes = { value: true, writable: false }

/**
 * @param {object} target
 * @param {object} source
 */
export function define(target, source) {
  Object.defineProperties(
    target,
    Object.getOwnPropertyDescriptors(source),
  )
}

/**
 * @param {Node} node
 * @param {import("./mod.js").Context} context
 */
export function walkNode(node, context) {
  if (Reflect.has(node, consumedName)) {
    return
  }
  if (node instanceof Text && templateRE.test(node.data)) {
    textEffect(node, context)
  } else if (node instanceof Element) {
    walkAttributes(node, context)
  }
  let childNode = node.firstChild
  while (childNode) {
    walkNode(childNode, context)
    childNode = childNode.nextSibling
  }
  Reflect.defineProperty(node, consumedName, consumedAttributes)
}

/**
 * @param {ParentNode | null} rootElement
 * @param {ChildNode | null} anchor
 * @param {(ChildNode & { data?: string })[] | undefined} currentNodes
 * @param {(Node & { data?: string })[] | undefined} nextNodes
 */
export function reconcile(rootElement, anchor, currentNodes, nextNodes) {
  if (nextNodes?.length) {
    nextNodes?.forEach((nextNode, i) => {
      const child = currentNodes?.[i]
      if (currentNodes?.length) {
        currentNodes.some((currentNode, j) => {
          if (currentNode.nodeType === 3 && nextNode.nodeType === 3) {
            currentNode.data = nextNode.data
          } else if (currentNode.nodeType === 8 && nextNode.nodeType === 8) {
            currentNode.data = nextNode.data
          }
          if (currentNode.isEqualNode(nextNode)) {
            nextNodes[i] = currentNode
            currentNodes.splice(j, 1)
            return true
          }
          return false
        })
      }
      if (nextNodes[i] !== child) {
        rootElement?.insertBefore(nextNodes[i], child?.nextSibling ?? anchor)
      }
    })
  }
  removeNodes(currentNodes)
}

/**
 * @param {ChildNode[] | undefined} currentNodes
 */
export function removeNodes(currentNodes) {
  while (currentNodes?.length) {
    currentNodes.pop()?.remove()
  }
}

/**
 * @param {CharacterData} node
 * @param {import("./mod.js").Context} context
 */
function textEffect(node, context) {
  const original = node.data
  effect(() => {
    node.data = original.replace(templateRE, (_match, expression) => {
      return evaluate(context, null, expression) + ""
    })
  })
}

/**
 * @param {Element} elt
 * @param {import("./mod.js").Context} context
 */
function walkAttributes(elt, context) {
  if (elt.getAttribute(scopeAttribute)) {
    createScope(elt, context)
  }
  for (const attr of Array.from(elt.attributes)) {
    const longhand = shorthands[attr.name[0]]
    if (longhand || attr.name.startsWith("s-")) {
      const binding = createBinding(
        elt,
        longhand ? longhand + ":" + attr.name.slice(1) : attr.name.slice(2),
        attr.value,
        context,
      )
      elt.removeAttributeNode(attr)
      const directiveName = longhand ?? binding.name,
        directive = getDirective(context, directiveName)
      if (directive === undefined) {
        throw new Error(`Unknown directive s-${directiveName}`)
      }
      effect(() => directive(elt, binding))
    }
  }
}

/**
 * @param {Element} elt
 * @param {string} name
 * @param {string} value
 * @param {import("./mod.js").Context} context
 * @returns {import("./mod.js").Binding}
 */
function createBinding(elt, name, value, context) {
  const groups = attrRE.exec(name)?.groups
  if (groups === undefined) {
    throw new SyntaxError(`${name}="${value}" doesn't match ${attrRE}`)
  }
  return {
    name: groups.n,
    expression: value,
    get arg() {
      if (groups.a) {
        if (groups.a.startsWith("[") && groups.a.endsWith("]")) {
          return evaluate(context, elt, groups.a.slice(1, -1))
        }
        return groups.a
      }
      return null
    },
    modifiers: groups.m?.split(".").reduce((mods, key) => {
      mods[key] = true
      return mods
    }, {}) ?? null,
    context,
    evaluate(expression) {
      return evaluate(context, elt, expression ?? value)
    },
  }
}
