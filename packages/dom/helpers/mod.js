/**
 * @param {space.Element} elt
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
 * @param {space.Element} elt
 * @param {string} name
 * @param {unknown} value
 */
export function setPropertyOrAttribute(elt, name, value) {
  if (isReadOnly(elt, name)) {
    setAttribute(elt, name, value)
  } else {
    elt[name] = value
  }
}

/**
 * @param {unknown} data
 * @returns {data is () => any}
 */
export function isResolvable(data) {
  return typeof data === "function" && data.length === 0
}

/**
 * @template T
 * @param {T} data
 * @returns {space.Resolved<T>}
 */
export function resolve(data) {
  return isResolvable(data) ? data() : data
}

/**
 * @param {object} obj
 * @param {string | symbol | number} prop
 */
export function isReadOnly(obj, prop) {
  return Object.getOwnPropertyDescriptor(obj, prop)?.writable === false
}
