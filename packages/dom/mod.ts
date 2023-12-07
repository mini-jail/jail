// deno-lint-ignore-file no-explicit-any
import {
  Cleanup,
  createEffect,
  createRoot,
  inject,
  onCleanup,
  provide,
} from "jail/signal"
interface DOMElement extends Element {
  [unknown: string | number | symbol]: any
  [eventsSymbol]?: Record<string, EventListener[]>
  content?: DocumentFragment
}
interface DOMNode extends ChildNode {
  [unknown: string | number | symbol]: any
}
export interface DOMEvent<Target extends DOMElement = DOMElement>
  extends Event {
  [unknown: string | number | symbol]: any
  currentTarget: Target & EventTarget
  target: Target & EventTarget
}
export interface DOMEventListener<
  Target extends DOMElement = DOMElement,
  Event extends DOMEvent = DOMEvent,
> {
  (this: Target, event: Event): void
}
type ResolvedValue<Type> = Type extends ((...args: any[]) => any) ? Type
  : Type extends (() => any) ? ReturnType<Type>
  : Type
type Slot =
  | string
  | number
  | boolean
  | null
  | undefined
  | void
  | SlotObject
  | Slot[]
  | Generator<Slot>
  | ((arg: DOMElement | DOMEvent) => void)
  | (() => Slot)
type RenderResult = DOMNode | DOMNode[] | undefined
type ComponentResult =
  | DOMNode
  | DOMNode[]
  | null
  | string
  | number
  | boolean
  | null
  | undefined
  | void
  | Generator<ComponentResult>
  | ComponentResult[]
  | (() => ComponentResult)
interface RootComponent {
  (): ComponentResult
}
type SlotObject = { [key: string | number | symbol]: any }
type ComponentDataProps = Record<string, string | number | true>
type ComponentData = {
  readonly slot: number | null
  readonly tagName: string | null
  readonly props: ComponentDataProps
  readonly children: boolean
}
type Data = { [element: number]: number | ComponentData | AttributeData[] }
type Template = {
  readonly fragment: DocumentFragment
  readonly templateString: string
  readonly hash: string
  readonly data: Data
}
type Modifiers = { readonly [name: string]: true | undefined }
interface Binding<Type> {
  readonly value: ResolvedValue<Type>
  readonly arg: string | null
  readonly modifiers: Modifiers | null
}
type AttributeData = {
  readonly name: string | null
  readonly slot: number | null
  readonly slots: number[] | null
  readonly value: string | null
  readonly arg: string | null
  readonly modifiers: Modifiers | null
  readonly directiveName: string | null
  readonly directiveSlot: number | null
  readonly hasDynamicArg: boolean
  readonly hasDynamicModifers: boolean
}
export type Directive<Type> = (elt: DOMElement, binding: Binding<Type>) => void
export interface Component<Props extends Record<string, any>> {
  (props: Props): any
}
type DirectiveMap = Record<string, Directive<any> | undefined>
type ComponentMap = Record<string, Component<any> | undefined>
type AttributeMatches = [
  fullMatch: string,
  directiveName: string | undefined,
  directiveSlot: string | undefined,
  name: string | undefined,
  arg: string | undefined,
  modifiers: string | undefined,
  slot: string | undefined,
  slot: string | undefined,
  slot: string | undefined,
  value: string | undefined,
  value: string | undefined,
  value: string | undefined,
]
interface App {
  delegatedEvents: Record<string, true | undefined>
  directiveMap: DirectiveMap
  componentMap: ComponentMap
}
const appSymbol = Symbol()
const ifSymbol = Symbol()
const eventsSymbol = Symbol()
const directive = "d-"
const placeholder = `###(\\d+)###`
const placeholderRegExp = RegExp(placeholder, "g")
const tagRegExp = /<[a-z\-]+(?:"[^"]*"|'[^']*'|[^'">])*>/g
const validValue = [
  `(?:="${placeholder}")`,
  `(?:='${placeholder}')`,
  `(?:=${placeholder})`,
  `(?:="([^"]*)")`,
  `(?:='([^']*)')`,
  `(?:=([^\\s=>"']+))`,
].join("|")
const validName = `[a-z][\\w\\-]*`
const tagAttributeRegExp = RegExp(
  [
    `\\s`,
    `(?:`,
    [
      `(?:${directive}(?:(${validName})|${placeholder}))`,
      `(${validName})`,
    ].join("|"),
    `)`,
    `(?:\\s*:([^.:\\s=]+))?`,
    `((?:\\s*\\.[^.:\\s=]+)*)?`,
    `(?:${validValue})?`,
  ].join(""),
  "gi",
)
const componentRegExp = RegExp(
  [
    `<\\s*`,
    `(?:${placeholder}|(?:([A-Z][\\w]+)+))`,
    `((?:"[^"]*"|'[^']*'|[^'">])*)`,
    `>`,
  ].join(""),
  "g",
)
const componentRegExp2 = RegExp(
  [
    `<\\s*\\/\\s*`,
    `(?:${placeholder}|(?:([A-Z][\\w]+)+))`,
    `\\s*>`,
  ].join(""),
  "g",
)
const componentPropsRegExp = RegExp(
  `\\s(${validName})(?:${validValue})?`,
  "gi",
)
const templateCache = new Map<TemplateStringsArray, Template>()
const styleDirective: Directive<string | SlotObject> = (elt, binding) => {
  const value = binding.value
  if (binding.arg) {
    elt.style[binding.arg] = value || null
  }
  if (typeof value === "object") {
    for (const key in value) {
      elt.style[key] = value[key] || null
    }
  }
}
const onDirective: Directive<string | EventListener> = (elt, binding) => {
  let listener = typeof binding.value === "function"
    ? binding.value
    : Function(binding.value) as EventListener
  let options: AddEventListenerOptions | undefined
  const name = binding.arg, modifiers = binding.modifiers
  if (name === null) {
    throw new Error(`Missing binding.arg for ${directive}:on`)
  }
  if (modifiers) {
    const { once, capture, passive, prevent, stop, delegate } = modifiers
    options = { once, capture, passive }
    if (prevent) {
      const listenerCopy = listener
      listener = function (event) {
        event.preventDefault()
        return listenerCopy.call(elt, event)
      }
    }
    if (stop) {
      const listenerCopy = listener
      listener = function (event) {
        event.stopPropagation()
        return listenerCopy.call(elt, event)
      }
    }
    if (delegate) {
      elt[eventsSymbol] = elt[eventsSymbol] || {}
      elt[eventsSymbol][name] = elt[eventsSymbol][name] || []
      elt[eventsSymbol][name].push(listener)
      const id = JSON.stringify({ name, options })
      const delegatedEvents = injectApp().delegatedEvents
      if (delegatedEvents[id] === undefined) {
        addEventListener(name, delegatedEventListener, options)
        delegatedEvents[id] = true
      }
      return
    }
  }
  elt.addEventListener(name, listener, options)
}
const refDirective: Directive<(elt: DOMElement) => void> = (elt, binding) => {
  binding.value(elt)
}
const htmlDirective: Directive<string> = (elt, binding) => {
  elt.innerHTML = binding.value
}
const textDirective: Directive<string> = (elt, binding) => {
  elt.textContent = binding.value
}
const showDirective: Directive<string | boolean> = (elt, binding) => {
  elt.style.display = binding.value + "" === "true" ? "" : "none"
}
const ifDirective: Directive<string | boolean> = (elt, binding) => {
  if (elt[ifSymbol] === undefined) {
    elt[ifSymbol] = new Text()
  }
  const isTrue = binding.value + "" === "true",
    target = isTrue ? elt[ifSymbol] : elt
  target.replaceWith(isTrue ? elt : elt[ifSymbol])
}

function setElementData(
  elt: DOMElement,
  value: unknown,
  attribute: AttributeData,
  slots: Slot[],
): void {
  if (attribute.directiveName !== null || attribute.directiveSlot !== null) {
    let directive: Directive<any> | undefined
    if (attribute.directiveSlot !== null) {
      directive = slots[attribute.directiveSlot] as Directive<any>
    } else if (attribute.directiveName) {
      directive = injectApp().directiveMap[attribute.directiveName]
    }
    if (directive === undefined) {
      throw new Error(`Missing Directive "${attribute.name}"`)
    }
    createEffect(() => {
      bindingAttribute = attribute
      bindingValue = value
      bindingSlots = slots
      directive!(elt, binding)
      bindingAttribute = null
      bindingValue = null
      bindingSlots = null
    })
    return
  }
  let name = attribute.name as string
  if (attribute.modifiers?.kebab) {
    name = name.replace(/([A-Z])/g, "-$1").toLowerCase()
  }
  if (typeof value === "function") {
    createEffect<unknown>((currentValue) => {
      const nextValue = value()
      if (currentValue !== nextValue) {
        setPropertyOrAttribute(elt, name, nextValue)
      }
      return nextValue
    })
    return
  }
  setPropertyOrAttribute(elt, name, value)
}

function injectApp(): App {
  const app = inject<App>(appSymbol)
  if (app === undefined) {
    throw new Error(`Missing App Injection`)
  }
  return app
}

function renderElement(
  elt: DOMElement,
  template: Template,
  slots: Slot[],
): void {
  const data = template.data[+elt.getAttribute(template.hash)!]
  if (typeof data === "number") {
    return renderChild(elt, slots[data])
  }
  if (Array.isArray(data)) {
    elt.removeAttribute(template.hash)
    for (const attribute of data) {
      setElementData(elt, createValue(attribute, slots), attribute, slots)
    }
    return
  }
  let component: Component<any> | undefined
  if (data.tagName) {
    component = injectApp().componentMap[data.tagName]
  } else if (data.slot) {
    component = slots[data.slot] as Component<any> | undefined
  }
  if (component == null || typeof component !== "function") {
    throw new TypeError(`Component type must me callable`)
  }
  createRoot(() => {
    const props: Record<string, any> = {}
    for (const prop in data.props) {
      const value = data.props[prop]
      props[prop] = typeof value === "number" ? slots[value] : value
    }
    if (data.children) {
      props.children = renderFragment(elt.content!, template, slots)
    }
    renderChild(elt, component!(props))
  })
}

function renderFragment(
  fragment: DocumentFragment,
  template: Template,
  slots: Slot[],
): RenderResult {
  fragment.querySelectorAll(`[${template.hash}]`)
    .forEach((elt) => renderElement(elt, template, slots))
  return fragment.childNodes.length === 0
    ? undefined
    : fragment.childNodes.length === 1
    ? fragment.childNodes[0]
    : Array.from(fragment.childNodes)
}

function render(template: Template, slots: Slot[]): RenderResult {
  return renderFragment(
    template.fragment.cloneNode(true) as DocumentFragment,
    template,
    slots,
  )
}

function stringArrayToString(strings: TemplateStringsArray): string {
  let templateString = "", arg = 0
  while (arg < strings.length - 1) {
    templateString = templateString + strings[arg] + `###${arg++}###`
  }
  templateString = templateString + strings[arg]
  return templateString
}

function setPropertyOrAttribute(
  elt: DOMElement,
  name: string,
  value: unknown,
): void {
  if (name in elt) {
    elt[name] = value
  } else if (value == null) {
    return elt.removeAttribute(name)
  } else {
    elt.setAttribute(name, value + "")
  }
}

function createValue(attribute: AttributeData, slots: Slot[]): Slot {
  if (attribute.slot !== null) {
    return slots[attribute.slot]
  }
  if (attribute.slots === null) {
    return attribute.value
  }
  if (attribute.slots.some((slot) => typeof slots[slot] === "function")) {
    return String.prototype.replace.bind(
      attribute.value,
      placeholderRegExp,
      (_match, slot) => resolve(slots[slot]) + "",
    )
  }
  return String.prototype.replace.call(
    attribute.value,
    placeholderRegExp,
    (_match, slot) => slots[slot] + "",
  )
}

let bindingSlots: Slot[] | null = null
let bindingValue: unknown | null = null
let bindingAttribute: AttributeData | null = null
const binding: Binding<unknown> = {
  get value() {
    if (typeof bindingValue === "function" && bindingValue.length === 0) {
      return bindingValue()
    }
    return bindingValue
  },
  get arg() {
    if (bindingAttribute?.arg == null) {
      return null
    }
    if (bindingAttribute.hasDynamicArg) {
      return bindingAttribute.arg.replace(
        placeholderRegExp,
        (_match, slot) => resolve(bindingSlots![+slot]) + "",
      )
    }
    return bindingAttribute.arg
  },
  get modifiers() {
    if (bindingAttribute?.modifiers == null) {
      return null
    }
    if (bindingAttribute.hasDynamicModifers) {
      return Object.keys(bindingAttribute.modifiers)
        .reduce((modifiers, key) => {
          const field = key.replace(
            placeholderRegExp,
            (_match, slot) => resolve(bindingSlots![+slot]) + "",
          )
          modifiers[field] = true
          return modifiers
        }, {})
    }
    return bindingAttribute.modifiers
  },
}

function resolve<Type>(data: Type): ResolvedValue<Type> {
  return typeof data === "function" ? data() : data
}

function createNodeArray(nodeArray: DOMNode[], ...elements: Slot[]): DOMNode[] {
  if (elements.length > 0) {
    for (const elt of elements) {
      if (elt == null || typeof elt === "boolean") {
        continue
      }
      if (elt instanceof Node) {
        nodeArray.push(<DOMNode> elt)
      } else if (typeof elt === "string" || typeof elt === "number") {
        nodeArray.push(new Text(elt + ""))
      } else if (typeof elt === "function") {
        createNodeArray(nodeArray, (<() => any> elt)())
      } else if (Symbol.iterator in elt) {
        createNodeArray(nodeArray, ...<Iterable<Slot>> elt)
      }
    }
  }
  return nodeArray
}

function reconcileNodes(
  anchor: DOMNode,
  currentNodes: DOMNode[],
  nextNodes: DOMNode[],
): void {
  if (nextNodes.length > 0) {
    nextNodes.forEach((nextNode, i) => {
      const child = currentNodes[i]
      if (currentNodes.length > 0) {
        currentNodes.some((currentNode, j) => {
          if (nextNode.nodeType === 3 && currentNode.nodeType === 3) {
            currentNode.data = nextNode.data
          }
          if (nextNode.isEqualNode(currentNode)) {
            nextNodes[i] = currentNode
            currentNodes.splice(j, 1)
            return true
          }
        })
      }
      if (nextNodes[i] !== child) {
        anchor.parentNode!.insertBefore(
          nextNodes[i],
          child?.nextSibling || anchor,
        )
      }
    })
  }
  if (currentNodes.length > 0) {
    currentNodes.forEach((node) => node.remove())
  }
}

function createAttributeData(matches: AttributeMatches): AttributeData {
  const arg = matches[4] ?? null
  const modifiers = matches[5]?.slice(1).split(".").reduce((modifiers, key) => {
    modifiers[key] = true
    return modifiers
  }, {}) ?? null
  const slot = matches[6] ?? matches[7] ?? matches[8] ?? null
  const value = matches[9] ?? matches[10] ?? matches[11] ?? null
  return {
    name: matches[3] ?? null,
    slot: slot === null ? slot : +slot,
    slots: value
      ?.match(placeholderRegExp)
      ?.map((match) => +match.slice(3, -3)) ?? null,
    value,
    arg,
    modifiers,
    directiveName: matches[1] ?? null,
    directiveSlot: matches[2] ? +matches[2] : null,
    hasDynamicArg: arg ? placeholderRegExp.test(arg) : false,
    hasDynamicModifers: modifiers ? placeholderRegExp.test(matches[5]!) : false,
  }
}

function renderDynamicChild(
  targetElt: DOMElement,
  childElement: Slot,
  replaceElt: boolean,
): void {
  const anchor = new Text()
  replaceElt ? targetElt.replaceWith(anchor) : targetElt.appendChild(anchor)
  createEffect<DOMNode[]>((currentNodes) => {
    const nextNodes = createNodeArray([], resolve(childElement))
    reconcileNodes(anchor, currentNodes, nextNodes)
    return nextNodes
  }, [])
}

function renderChild(targetElt: DOMElement, child: Slot): void {
  if (child == null || typeof child === "boolean") {
    targetElt.remove()
  } else if (child instanceof Node) {
    targetElt.replaceWith(child)
  } else if (typeof child === "string" || typeof child === "number") {
    targetElt.replaceWith(child + "")
  } else if (typeof child === "function") {
    renderDynamicChild(targetElt, child, true)
  } else if (Symbol.iterator in child) {
    const iterableChild = Array.isArray(child)
      ? child
      : Array.from(<Iterable<Slot>> child)
    if (iterableChild.length === 0) {
      targetElt.remove()
    } else if (iterableChild.length === 1) {
      renderChild(targetElt, iterableChild[0])
    } else if (iterableChild.some((item) => typeof item === "function")) {
      renderDynamicChild(targetElt, iterableChild, true)
    } else {
      targetElt.replaceWith(...createNodeArray([], ...iterableChild))
    }
  } else {
    targetElt.replaceWith(String(child))
  }
}

function delegatedEventListener(event: Event): void {
  const type = event.type
  let elt = event.target as DOMElement
  while (elt !== null) {
    elt?.[eventsSymbol]?.[type]?.forEach?.((fn) => fn.call(elt, event))
    elt = elt.parentNode as DOMElement
  }
}

function throwOnAttributeSyntaxError(data: string) {
  for (const _matches of data.matchAll(placeholderRegExp)) {
    throw new SyntaxError(`Unsupported Syntax\n${data}`)
  }
}

function createComponentData(matches: string[]): ComponentData {
  const props: ComponentDataProps = {},
    content = matches[3].endsWith("/")
  for (const results of matches[3].matchAll(componentPropsRegExp)) {
    const slot = results[2] ?? results[3] ?? results[4] ?? null
    const value = results[5] ?? results[6] ?? results[7] ?? true
    props[results[1]] = slot ? +slot : value
  }
  return {
    slot: matches[1] ? +matches[1] : null,
    tagName: matches[2] ? matches[2] : null,
    props,
    children: content,
  }
}

function createTemplate(
  templateStringsArray: TemplateStringsArray,
): Template {
  let template = templateCache.get(templateStringsArray)
  if (template === undefined) {
    let element = -1
    const hash = "_" + Math.random().toString(36).slice(2, 7) + "_",
      data: Data = {},
      elt = document.createElement("template")
    elt.innerHTML = stringArrayToString(templateStringsArray)
      .replace(/^[\s]+/gm, "")
      .replace(componentRegExp, (...matches) => {
        const componentData = createComponentData(matches),
          content = componentData.children
        data[++element] = componentData
        return `<template ${hash}="${element}">${content ? "</template>" : ""}`
      })
      .replace(componentRegExp2, "</template>")
      .replace(tagRegExp, (match) => {
        let attributes: AttributeData[] | null = null
        match = match
          .replace(tagAttributeRegExp, (...matches: AttributeMatches) => {
            const attribute = createAttributeData(matches)
            if (
              attribute.directiveSlot === null &&
              attribute.directiveName === null &&
              attribute.slot === null &&
              attribute.slots === null
            ) {
              return matches[0]
            }
            if (attributes === null) {
              attributes = data[++element] = []
            }
            attributes.push(attribute)
            return ` ${hash}="${element}"`
          })
        throwOnAttributeSyntaxError(match)
        return match
      })
      .replace(placeholderRegExp, (_match, key) => {
        data[++element] = +key
        return `<template ${hash}="${element}"></template>`
      })
      .replace(/^\r\n|\n|\r(>)\s+(<)$/gm, "$1$2")
    template = {
      hash,
      data,
      fragment: elt.content,
      templateString: elt.innerHTML,
    }
    templateCache.set(templateStringsArray, template)
  }
  return template
}

export default template
export function template(
  templateStringsArray: TemplateStringsArray,
): RenderResult
export function template(
  templateStringsArray: TemplateStringsArray,
  ...slots: Slot[]
): RenderResult
export function template(
  templateStringsArray: TemplateStringsArray,
  ...slots: Slot[]
): RenderResult {
  return render(createTemplate(templateStringsArray), slots)
}

export function createDirective<Type>(
  name: string,
  directive: Directive<Type>,
): void {
  const directiveMap = injectApp().directiveMap
  const previousDirective = directiveMap[name]
  directiveMap[name] = directive
  onCleanup(() => directiveMap[name] = previousDirective)
}

export function createComponent<Props extends Record<string, any>>(
  name: string,
  component: Component<Props>,
): void {
  const componentMap = injectApp().componentMap
  const previousComponent = componentMap[name]
  componentMap[name] = component
  onCleanup(() => componentMap[name] = previousComponent)
}

export function mount(
  rootElement: DOMElement,
  rootComponent: RootComponent,
): Cleanup {
  return createRoot((cleanup) => {
    provide<App>(appSymbol, {
      directiveMap: {
        style: styleDirective,
        on: onDirective,
        ref: refDirective,
        html: htmlDirective,
        text: textDirective,
        show: showDirective,
        if: ifDirective,
      },
      componentMap: {},
      delegatedEvents: {},
    })
    renderDynamicChild(rootElement, rootComponent, false)
    return cleanup
  })!
}
