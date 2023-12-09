import "./space.d.ts"
import type {
  AnimateValue,
  Component,
  Directive,
  DOMElement,
  DOMEvent,
  DOMEventListener,
  DOMNode,
  NamespaceDirective,
} from "./types.d.ts"
import namespaces from "./namespaces/mod.ts"
import { mount, template } from "./renderer/mod.ts"
import on from "./namespaces/on.ts"
import prop from "./namespaces/prop.ts"
import use from "./namespaces/use.ts"
import attr from "./namespaces/attr.ts"
import style from "./namespaces/style.ts"
import If from "./use/if.ts"
import Show from "./use/show.ts"
import Text from "./use/text.ts"
import Animate from "./use/animate.ts"
import For from "./components/for.ts"
export type {
  AnimateValue,
  Component,
  Directive,
  DOMElement,
  DOMEvent,
  DOMEventListener,
  DOMNode,
  NamespaceDirective,
}
export { Animate, For, If, mount, namespaces, Show, template, Text }
export default template
namespaces.attr = attr
namespaces.prop = prop
namespaces.use = use
namespaces.on = on
namespaces.style = style
