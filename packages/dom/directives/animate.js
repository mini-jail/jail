/**
 * @param {HTMLElement} elt
 * @param {import("../mod.js").Binding<{ [key: string]: any}>} binding
 */
export function animate(elt, binding) {
  const { keyframes, ...options } = binding.value
  elt.animate(keyframes, options)
}
