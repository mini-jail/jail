import { animate } from "./animate.js"
import { when } from "./when.js"
import { show } from "./show.js"
import { text } from "./text.js"

/**
 * ## For devs only!
 * Extend it only, if you know what you do :3
 * @type {space.Directives}
 */
export const directives = Object.create(null)
export default directives

directives.animate = animate
directives.when = when
directives.show = show
directives.text = text

export { animate, show, text, when }
