import { walkNode } from "../helpers.js"

/**
 * @param {Element} elt
 * @param {import("../mod.js").Binding} binding
 */
export default function (elt, binding) {
  fetch(binding.expression)
    .then((res) => res.text())
    .then((html) => {
      const template = document.createElement("template")
      template.innerHTML = html
      walkNode(template.content, binding.context)
      elt.replaceWith(template.content)
    })
}
