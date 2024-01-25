/**
 * @param {HTMLElement} elt
 * @param {import("../mod.js").Binding<boolean | "true" | "false">} binding
 */
export default function (elt, binding) {
  elt.style.display = binding.value + "" === "true" ? "" : "none"
}
