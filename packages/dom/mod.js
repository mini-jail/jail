/// <reference path="./types.d.ts" />
import { mount, template } from "./renderer/mod.js"
export { mount, template }
export { attr, namespaces, on, prop, style, use } from "./namespaces/mod.js"
export { animate, directives, show, text, when } from "./use/mod.js"
export { components, For, Portal, Router, Show } from "./components/mod.js"
export { getParams, path } from "./components/router.js"
export default template
