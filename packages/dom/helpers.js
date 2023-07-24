/**
 * @param {string} data
 * @returns {string}
 */
export function toCamelCase(data) {
  return data.replace(/-[a-z]/g, (match) => match.slice(1).toUpperCase())
}

/**
 * @param {string} data
 * @returns {string}
 */
export function toKebabCase(data) {
  return data.replace(/([A-Z])/g, "-$1").toLowerCase()
}

/**
 * @param {import("./mod.js").DOMElement} elt
 * @param {string} prop
 * @param {any} value
 */
export function setProperty(elt, prop, value) {
  if (prop in elt) {
    elt[prop] = value
    return
  }
  const name = toKebabCase(prop)
  if (value != null) {
    elt.setAttribute(name, value + "")
  } else {
    elt.removeAttribute(name)
  }
}

/**
 * @param {import("./mod.js").DOMElement} elt
 * @param {string} name
 * @returns {string | null}
 */
export function attribute(elt, name) {
  const value = elt.getAttribute(name)
  elt.removeAttribute(name)
  return value
}

export function sameCharacterDataType(node, otherNode) {
  const type = node.nodeType
  return (type === 3 || type === 8) && otherNode.nodeType === type
}
