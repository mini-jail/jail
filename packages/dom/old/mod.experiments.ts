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
  [eventsSymbol]?: Record<string, Set<DOMEventListener>>
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
  readonly hasChildren: boolean
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
  readonly argSlot: number | null
  readonly modifierSlots: number[] | null
}
export interface Directive<Type> {
  (elt: DOMElement, binding: Binding<Type>): Cleanup | undefined | void | null
}
export interface Component<Props extends Record<string, any>> {
  (props: Props): any
}
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
  readonly delegatedEvents: Record<string, true | undefined>
  readonly directiveMap: Record<string, Directive<any> | undefined>
  readonly componentMap: Record<string, Component<any> | undefined>
}
const appSymbol = Symbol()
const ifSymbol = Symbol()
const eventsSymbol = Symbol()
const directive = "d-"
const placeholder = "_" + Math.random().toString(36).slice(2, 7) + "_"
const placeholderSize = placeholder.length
const validPlaceholder = `${placeholder}(\\d+)${placeholder}`
const validName = `[a-z][\\w\\-]*`
const validComponentName = `(?:([A-Z][\\w]+)+)`
const validExtension = `[^.:\\s=]+`
const validAttributes = `(?:"[^"]*"|'[^']*'|[^'">])*`
const validValue = [
  `(?:="${validPlaceholder}")`,
  `(?:='${validPlaceholder}')`,
  `(?:=${validPlaceholder})`,
  `(?:="([^"]*)")`,
  `(?:='([^']*)')`,
  `(?:=([^\\s=>"']+))`,
].join("|")
const placeholderRegExp = RegExp(validPlaceholder, "g")
const tagRegExp = RegExp(`<[a-z\\-]+${validAttributes}>`, "g")
const tagAttributeRegExp = RegExp(
  [
    `\\s`,
    `(?:`,
    [
      `(?:${directive}(?:(${validName})|${validPlaceholder}))`,
      `(${validName})`,
    ].join("|"),
    `)`,
    `(?:\\s*:(${validExtension}))?`,
    `((?:\\s*\\.${validExtension})*)?`,
    `(?:${validValue})?`,
  ].join(""),
  "gi",
)
const componentRegExp = RegExp(
  `<\\s*(?:${validPlaceholder}|${validComponentName})(${validAttributes})>`,
  "g",
)
const componentRegExp2 = RegExp(
  `<\\s*\\/\\s*(?:${validPlaceholder}|${validComponentName})\\s*>`,
  "g",
)
const componentPropsRegExp = RegExp(`\\s(${validName})(?:${validValue})?`, "gi")
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
const onDirective: Directive<string | DOMEventListener> = (elt, binding) => {
  let listener = typeof binding.value === "function"
      ? binding.value
      : Function(binding.value) as DOMEventListener,
    options: AddEventListenerOptions | undefined
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
      elt[eventsSymbol][name] = elt[eventsSymbol][name] || new Set()
      elt[eventsSymbol][name].add(listener)
      const id = JSON.stringify({ name, options })
      const delegatedEvents = injectApp().delegatedEvents
      if (delegatedEvents[id] === undefined) {
        addEventListener(name, <EventListener> delegatedEventListener, options)
        delegatedEvents[id] = true
      }
      return () => elt[eventsSymbol]![name].delete(listener)
    }
  }
  elt.addEventListener(name, <EventListener> listener, options)
  return () => elt.removeEventListener(name, <EventListener> listener, options)
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
      if (attribute.directiveName) {
        throw new Error(`Missing Directive "${attribute.directiveName}".`)
      }
      throw new TypeError(`Directive is not a function.`)
    }
    createEffect(() => {
      bindingAttribute = attribute
      bindingValue = value
      bindingSlots = slots
      const cleanup = directive!(elt, binding)
      if (typeof cleanup === "function") {
        onCleanup(cleanup)
      }
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
  if (component == null) {
    if (data.tagName) {
      throw new Error(`Missing Component "${data.tagName}".`)
    }
    throw new TypeError(`Component is not a function.`)
  }
  createRoot(() => {
    const props: Record<string, any> = {}
    for (const prop in data.props) {
      const value = data.props[prop]
      props[prop] = typeof value === "number" ? slots[value] : value
    }
    if (data.hasChildren) {
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
  let data = "", arg = 0
  const length = strings.length - 1
  while (arg < length) {
    data = data + strings[arg] + `${placeholder}${arg++}${placeholder}`
  }
  data = data + strings[arg]
  return data
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

let bindingSlots: Slot[] | null = null,
  bindingValue: unknown | null = null,
  bindingAttribute: AttributeData | null = null
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
    if (bindingAttribute.argSlot !== null) {
      return String(bindingSlots![bindingAttribute.argSlot])
    }
    return bindingAttribute.arg
  },
  get modifiers() {
    if (bindingAttribute?.modifiers == null) {
      return null
    }
    if (bindingAttribute.modifierSlots) {
      return bindingAttribute.modifierSlots.reduce((modifiers, slot) => {
        modifiers[String(resolve(bindingSlots![+slot]))] = true
        return modifiers
      }, { ...bindingAttribute.modifiers })
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
  const arg = matches[4] ?? null,
    argSlot = arg ? placeholderRegExp.exec(arg)?.[1] ?? null : null,
    slot = matches[6] ?? matches[7] ?? matches[8] ?? null,
    value = matches[9] ?? matches[10] ?? matches[11] ?? null,
    modifierSlots: number[] = [],
    modifiers = matches[5]?.split(".").reduce((modifiers, key) => {
      if ((key = key.trim()).length > 0) {
        const modifierSlot = placeholderRegExp.exec(key)?.[1] ?? null
        if (modifierSlot !== null) {
          modifierSlots.push(+modifierSlot)
        } else {
          modifiers[key] = true
        }
      }
      return modifiers
    }, {}) ?? null
  return {
    name: matches[3] ?? null,
    slot: slot === null ? slot : +slot,
    slots: value
      ?.match(placeholderRegExp)
      ?.map((match) => +match.slice(placeholderSize, -placeholderSize)) ?? null,
    value,
    arg,
    modifiers,
    directiveName: matches[1] ?? null,
    directiveSlot: matches[2] ? +matches[2] : null,
    argSlot: argSlot ? +argSlot : null,
    modifierSlots: modifierSlots.length > 0 ? modifierSlots : null,
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
    } else if (iterableChild.some((child) => typeof child === "function")) {
      renderDynamicChild(targetElt, iterableChild, true)
    } else {
      targetElt.replaceWith(...createNodeArray([], ...iterableChild))
    }
  } else {
    targetElt.replaceWith(String(child))
  }
}

function delegatedEventListener(event: DOMEvent): void {
  const type = event.type
  let elt = event.target as DOMElement
  while (elt !== null) {
    elt?.[eventsSymbol]?.[type]?.forEach?.((fn) => fn.call(elt, event))
    elt = elt.parentNode as DOMElement
  }
}

function throwOnAttributeSyntaxError(data: string): void {
  for (const _matches of data.matchAll(placeholderRegExp)) {
    throw new SyntaxError(`Unsupported Syntax\n${data}`)
  }
}

function createComponentData(matches: string[]): ComponentData {
  const props: ComponentDataProps = {},
    content = matches[3].endsWith("/")
  for (const results of matches[3].matchAll(componentPropsRegExp)) {
    const slot = results[2] ?? results[3] ?? results[4] ?? null,
      value = results[5] ?? results[6] ?? results[7] ?? true
    props[results[1]] = slot ? +slot : value
  }
  return {
    slot: matches[1] ? +matches[1] : null,
    tagName: matches[2] ? matches[2] : null,
    props,
    hasChildren: content,
  }
}

function createTemplate(
  templateStringsArray: TemplateStringsArray,
): Template {
  let template = templateCache.get(templateStringsArray)
  if (template === undefined) {
    let id = -1
    const hash = "_" + Math.random().toString(36).slice(2, 7) + "_",
      data: Data = {},
      elt = document.createElement("template")
    elt.innerHTML = stringArrayToString(templateStringsArray)
      .replace(/^[\s]+/gm, "")
      .replace(componentRegExp, (...matches) => {
        const componentData = createComponentData(matches),
          content = componentData.hasChildren
        data[++id] = componentData
        return `<template ${hash}="${id}">${content ? "</template>" : ""}`
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
              attributes = data[++id] = []
            }
            attributes.push(attribute)
            return ` ${hash}="${id}"`
          })
        throwOnAttributeSyntaxError(match)
        return match
      })
      .replace(placeholderRegExp, (_match, key) => {
        data[++id] = +key
        return `<template ${hash}="${id}"></template>`
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
