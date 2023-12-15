/// <reference path="./types.d.ts" />
import { mount, template } from "./renderer/mod.js"
export { mount, template }
export {
  attr,
  classList,
  namespaces,
  on,
  prop,
  style,
  use,
} from "./namespaces/mod.js"
export { animate, directives, ref, show, text, when } from "./use/mod.js"
export {
  components,
  ErrorBoundary,
  For,
  getParams,
  Match,
  path,
  Portal,
  Route,
  Router,
  Show,
  Switch,
} from "./components/mod.js"
export default template
