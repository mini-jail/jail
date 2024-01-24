/**
 * @param {Element} elt
 * @param {import("../mod.js").Binding} binding
 */
export default function (elt, binding) {
  elt.innerHTML = binding.evaluate()
}
