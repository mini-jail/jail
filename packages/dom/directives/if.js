/**
 * @param {HTMLElement} elt
 * @param {import("../mod.js").Binding<boolean | "true" | "false">} binding
 */
export default function (elt, binding) {
  if (elt["__if"] === undefined) {
    elt["__if"] = new Text()
  }
  const isTrue = binding.value + "" === "true",
    target = isTrue ? elt["__if"] : elt
  target.replaceWith(isTrue ? elt : elt["__if"])
}
