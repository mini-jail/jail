/**
 * @param {space.DOMElement} elt
 * @param {string} name
 * @param {unknown} value
 * @returns {boolean}
 */
export function setAttribute(elt, name, value) {
  name = name.replace(/([A-Z])/g, "-$1").toLowerCase()
  if (value != null) {
    elt.setAttribute(name, value + "")
    return true
  }
  elt.removeAttribute(name)
  return false
}

/**
 * @param {space.DOMElement} elt
 * @param {string} name
 * @param {unknown} value
 */
export function setPropertyOrAttribute(elt, name, value) {
  if (name in elt) {
    elt[name] = value
  } else {
    setAttribute(elt, name, value)
  }
}

/**
 * @param {unknown} data
 * @returns {data is () => any}
 */
export function isResolvable(data) {
  return typeof data === "function" ? data.length > 0 ? false : true : false
}

/**
 * @template T
 * @param {T} data
 * @returns {space.Resolved<T>}
 */
export function resolve(data) {
  return isResolvable(data) ? data() : data
}
