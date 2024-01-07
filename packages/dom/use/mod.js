import { animate } from "./animate.js"
import { when } from "./when.js"
import { show } from "./show.js"
import { text } from "./text.js"
import { ref } from "./ref.js"

/**
 * ## For devs only!
 * Extend it only, if you know what you do :3
 * @type {Record<string, import("space/dom").Directive<any>>}
 */
export const directives = Object.create(null)
export default directives

directives.animate = animate
directives.when = when
directives.show = show
directives.text = text
directives.ref = ref

export { animate, ref, show, text, when }
