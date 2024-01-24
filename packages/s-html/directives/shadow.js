/**
 * @param {Element} elt
 * @param {import("../mod.js").Binding} param1
 */
export default function (elt, { expression }) {
  const template = document.querySelector(expression)
  if (template instanceof HTMLTemplateElement) {
    elt.attachShadow({ mode: "open" })
      .appendChild(template.content.cloneNode(true))
    return
  }
  throw new Error(
    `s-shadow: ${expression} must reference to an template-Element`,
  )
}
