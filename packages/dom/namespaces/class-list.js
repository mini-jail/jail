/**
 * @param {space.Element} elt
 * @param {string} arg
 * @param {space.BooleanLike} value
 */
export function classList(elt, arg, value) {
  if (value + "" === "true") {
    elt.classList.add(arg)
  } else {
    elt.classList.remove(arg)
  }
}
