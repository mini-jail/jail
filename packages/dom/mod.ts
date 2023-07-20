import {
  Cleanup,
  createEffect,
  createRoot,
  inject,
  isReactive,
  onCleanup,
  onUnmount,
  provide,
  toValue,
} from "jail/signal"

const ATTRIBUTE = "a", INSERTION = "i", COMPONENT = "c"
const TYPE = "__t", VALUE = "__v"
const Query = `[${TYPE}]`
const DirPrefix = "d-", DirPrefixLength = DirPrefix.length
const DirRegExp = RegExp(`${DirPrefix.replace("-", "\\-")}[^"'<>=\\s]`)
const DirKeyRegExp = /[a-z\-\_]+/
const ArgRegExp = /#{([^}]+)}/g,
  SValRegExp = /^@{([^}]+)}$/,
  MValRegExp = /@{([^}]+)}/g
const BindingModRegExp = /\.(?:[^"'.])+/g, BindingArgRegExp = /:([^"'<>.]+)/
const WSAndTabsRegExp = /^[\s\t]+/gm
const QuoteRegExp = /["']/, DataRegExp = /data\-__\d+/
const ComRegExp = /^<((?:[A-Z][a-z]+)+)/,
  ClosingComRegExp = /<\/((?:[A-Z][a-z]+)+)>/g
const TagRegExp = /<([a-zA-Z\-]+(?:"[^"]*"|'[^']*'|[^'">])*)>/g
const AtrRegExp =
  /\s(?:([^"'<>=\s]+)=(?:"([^"]*)"|'([^']*)'))|(?:\s([^"'<>=\s]+))/g
const AttributeDataReplacement = `<$1 ${TYPE}="${ATTRIBUTE}">`
const InsertionReplacement =
  `<slot ${TYPE}="${INSERTION}" ${VALUE}="$1"></slot>`
const ComponentReplacement = [
  `<template ${TYPE}="${COMPONENT}" ${VALUE}="$1"`,
  "</template>",
]
const TemplateCache: Map<TemplateStringsArray, DocumentFragment> = new Map()
const ValueCacheMap: Map<string, string | string[] | null> = new Map()
const App = Symbol("App")
const Events = Symbol("Events")
const If = Symbol("If")
const RegisteredEvents = {}

function toCamelCase(data: string): string {
  return data.replace(/-[a-z]/g, (match) => match.slice(1).toUpperCase())
}

function toKebabCase(data: string): string {
  return data.replace(/([A-Z])/g, "-$1").toLowerCase()
}

function eventLoop(event: Event): void {
  const type = event.type
  let elt = event.target as Node | null
  while (elt !== null) {
    elt?.[Events]?.[type]?.call(elt, event)
    elt = elt.parentNode
  }
}

function refDirective(
  elt: DOMElement,
  binding: Binding<(elt: DOMElement) => any>,
): void {
  binding.rawValue?.(elt)
}

function styleDirective(elt: DOMElement, binding: Binding<string>): void {
  elt.style[binding.arg!] = binding.value || null
}

function bindDirective(elt: DOMElement, binding: Binding): void {
  let prop = binding.arg!
  if (binding.modifiers?.camel) {
    prop = toCamelCase(prop)
  }
  if (binding.modifiers?.attr) {
    prop = toKebabCase(prop)
  }
  if (
    binding.modifiers?.prop === true ||
    (prop in elt && binding.modifiers?.attr === false)
  ) {
    elt[prop] = binding.value
  } else {
    elt.setAttribute(prop, binding.value + "")
  }
}

function htmlDirective(elt: DOMElement, binding: Binding<string>): void {
  elt.innerHTML = binding.value
}

function textDirective(elt: DOMElement, binding: Binding<string>): void {
  elt.textContent = binding.value
}

function showDirective(elt: DOMElement, binding: Binding<boolean>): void {
  elt.style.display = binding.value ? "" : "none"
}

function ifDirective(elt: DOMElement, binding: Binding<boolean>): void {
  elt[If] = elt[If] || new Text()
  const value = binding.value,
    target = value ? elt[If] : elt
  target.replaceWith(value ? elt : elt[If])
}

function onDirective(elt: DOMElement, binding: Binding<EventListener>): void {
  const name = binding.arg!
  const modifiers = binding.modifiers
  let id = name,
    listener = binding.rawValue,
    eventOptions: AddEventListenerOptions | undefined
  if (modifiers) {
    if (modifiers.prevent) {
      id = id + "-prevent"
      const listenerCopy = listener
      listener = function (event) {
        event.preventDefault()
        listenerCopy.call(elt, event)
      }
    }
    if (modifiers.stop) {
      id = id + "-stop"
      const listenerCopy = listener
      listener = function (event) {
        event.stopPropagation()
        listenerCopy.call(elt, event)
      }
    }
    if (modifiers.once) {
      id = id + "-once"
      eventOptions = eventOptions || {}
      eventOptions.once = true
    }
    if (modifiers.capture) {
      id = id + "-capture"
      eventOptions = eventOptions || {}
      eventOptions.capture = true
    }
    if (modifiers.passive) {
      id = id + "-passive"
      eventOptions = eventOptions || {}
      eventOptions.passive = true
    }
  }
  if (modifiers?.delegate) {
    elt[Events] = elt[Events] || {}
    if (elt[Events][name]) {
      const listenerCopy = elt[Events][name]
      elt[Events][name] = function (event) {
        listenerCopy.call(elt, event)
        listener.call(elt, event)
      }
    } else {
      elt[Events][name] = listener
    }
    if (RegisteredEvents[id] === undefined) {
      addEventListener(name, eventLoop, eventOptions)
      RegisteredEvents[id] = true
    }
  } else {
    elt.addEventListener(name, listener, eventOptions)
  }
}

function extendApp(key: string, name: string, item: any): void {
  const items = inject(App)![key], copy = items[name]
  items[name] = item
  if (copy) {
    onUnmount(() => items[name] = copy)
  }
}

export function createDirective<K extends keyof jail.Directives>(
  name: K,
  directive: Directive<jail.Directives[K]>,
): void
export function createDirective<T>(name: string, directive: Directive<T>): void
export function createDirective(name: string, directive: Directive) {
  extendApp("directives", name, directive)
}

export function createComponent<K extends keyof jail.Components>(
  name: K,
  component: Component<jail.Components[K]>,
): void
export function createComponent<T extends object>(
  name: string,
  component: Component<T>,
): void
export function createComponent(name: string, component: Component) {
  extendApp("components", name, component)
}

export function mount(
  rootElement: DOMElement,
  rootComponent: RootComponent,
): Cleanup {
  return createRoot((cleanup) => {
    const defaultDirectives = {
      on: onDirective,
      ref: refDirective,
      show: showDirective,
      html: htmlDirective,
      text: textDirective,
      style: styleDirective,
      bind: bindDirective,
      if: ifDirective,
    }
    provide(App, { directives: defaultDirectives, components: {} })
    let anchor: ChildNode | null = rootElement.appendChild(new Text())
    let currentNodes: ChildNode[] | null = null
    createEffect(() => {
      const nextNodes = createNodeArray([], rootComponent())
      reconcileNodes(anchor!, currentNodes, nextNodes)
      currentNodes = nextNodes as ChildNode[]
    })
    onCleanup(() => {
      reconcileNodes(anchor!, currentNodes, [])
      anchor!.remove()
      anchor = null
      currentNodes = null
    })
    return cleanup
  })!
}

export function template(strings: TemplateStringsArray): TemplateResult
export function template(
  strings: TemplateStringsArray,
  ...args: any[]
): TemplateResult
export function template(
  strings: TemplateStringsArray,
  ...args: any[]
): TemplateResult {
  const template = TemplateCache.get(strings) || createTemplate(strings)
  return render(template.cloneNode(true) as DocumentFragment, args)
}

const renderMap = {
  a(elt: DOMElement, args: any[]) {
    const props = createProps(elt, args)
    for (const key in props) {
      renderAttribute(elt, key, props[key])
    }
  },
  i(elt: HTMLSlotElement, args: any[]) {
    const slot = elt.getAttribute(VALUE)!
    renderChild(elt, getValue(slot, args))
  },
  c(elt: HTMLTemplateElement, args: any[]) {
    const name = elt.getAttribute(VALUE)!
    const component = inject(App)!.components![name]
    if (component === undefined) {
      elt.remove()
      return
    }
    createRoot(() => {
      const props = createProps(elt, args)
      if (elt.content.hasChildNodes()) {
        props.children = render(elt.content, args)
      }
      renderChild(elt, component(props))
    })
  },
}

function attribute(elt: DOMElement, name: string): string | null {
  const value = elt.getAttribute(name)
  elt.removeAttribute(name)
  return value
}

function render(fragment: DocumentFragment, args: any[]): TemplateResult {
  for (const elt of fragment.querySelectorAll(Query)) {
    renderMap[attribute(elt, TYPE)!](elt, args)
  }
  const nodeList = fragment.childNodes
  if (nodeList.length === 0) {
    return
  }
  if (nodeList.length === 1) {
    return nodeList[0]
  }
  return Array.from(nodeList)
}

function createProps(elt: DOMElement, args: any[]): { [key: string]: any } {
  const props = {}
  for (const key in elt.dataset) {
    if (key.startsWith("__")) {
      const data = attribute(elt, `data-${key}`)!,
        prop = data.split(" ", 1)[0]
      props[prop] = createValue(data.slice(prop.length + 1), args)
    }
  }
  return props
}

function getValueCache(value: string): string | string[] | null {
  if (ValueCacheMap.has(value)) {
    return ValueCacheMap.get(value)!
  }
  const id = value.match(SValRegExp)?.[1]
  if (id) {
    ValueCacheMap.set(value, id)
    return id
  }
  const matches = [...value.matchAll(MValRegExp)]
  if (matches.length === 0) {
    ValueCacheMap.set(value, null)
    return null
  }
  const ids = matches.map((match) => match[1])
  ValueCacheMap.set(value, ids)
  return ids
}

function createValue(value: string, args: any[]): any {
  const cached = getValueCache(value)
  if (cached === null) {
    return value
  }
  if (typeof cached === "string") {
    return getValue(cached, args)
  }
  if (cached.some((id) => isReactive(getValue(id, args)))) {
    return String.prototype.replace.bind(
      value,
      MValRegExp,
      (_, id) => toValue(getValue(id, args)),
    )
  }
  return String.prototype.replace.call(
    value,
    MValRegExp,
    (_, id) => getValue(id, args),
  )
}

function getValue(id: string, args: any[]): any {
  return id in args ? args[id] : getInjectedValue(id)
}

function getInjectedValue(id: string): any {
  const value = inject(id)
  if (value) {
    return value
  }
  const [mainId, ...keys] = id.split(".")
  const initialValue = inject(mainId)
  if (initialValue == null || keys.length === 0) {
    return
  }
  return keys.reduce((value, key) => value[key], initialValue)
}

export function createTemplateString(
  strings: TemplateStringsArray | string[],
): string {
  let data = "", arg = 0
  while (arg < strings.length - 1) {
    data = data + strings[arg] + `#{${arg++}}`
  }
  data = data + strings[arg]
  data = data.replace(WSAndTabsRegExp, "")
  data = data.replace(ClosingComRegExp, ComponentReplacement[1])
  data = data.replace(TagRegExp, (match) => {
    const isComponent = ComRegExp.test(match)
    let id = 0
    match = match.replace(AtrRegExp, (data, name, val, val2, name2) => {
      if (isComponent === false) {
        if (!ArgRegExp.test(data) && !DirRegExp.test(data)) {
          return data
        }
      }
      const quote = data.match(QuoteRegExp)![0]
      val = (val || val2).replace(ArgRegExp, "@{$1}")
      return ` data-__${id++}=${quote}${name || name2} ${val}${quote}`
    })
    if (isComponent) {
      match = match.replace(ComRegExp, ComponentReplacement[0])
    } else if (DataRegExp.test(match)) {
      match = match.replace(TagRegExp, AttributeDataReplacement)
    }
    return match.replace(ArgRegExp, "")
  })
  data = data.replace(ArgRegExp, InsertionReplacement)
  return data
}

function createTemplate(strings: TemplateStringsArray): DocumentFragment {
  const template = document.createElement("template")
  template.innerHTML = createTemplateString(strings)
  TemplateCache.set(strings, template.content)
  return template.content
}

function renderChild(elt: DOMElement, value: any): void {
  if (value == null || typeof value === "boolean") {
    elt.remove()
  } else if (value instanceof Node) {
    elt.replaceWith(value)
  } else if (isReactive(value)) {
    renderDynamicChild(elt, value)
  } else if (Array.isArray(value)) {
    if (value.length === 0) {
      elt.remove()
    } else if (value.length === 1) {
      renderChild(elt, value[0])
    } else if (value.some((item) => isReactive(item))) {
      renderDynamicChild(elt, value)
    } else {
      elt.replaceWith(...createNodeArray([], ...value))
    }
  } else {
    elt.replaceWith(value + "")
  }
}

function renderDynamicChild(
  elt: DOMElement,
  childElement: (() => any) | any[],
): void {
  const anchor = new Text()
  elt.replaceWith(anchor)
  createEffect<ChildNode[] | null>((currentNodes) => {
    const nextNodes = createNodeArray([], toValue(childElement)) as ChildNode[]
    reconcileNodes(anchor, currentNodes, nextNodes)
    return nextNodes
  }, null)
}

function renderAttribute(elt: DOMElement, prop: string, data: any): void {
  if (prop.startsWith(DirPrefix)) {
    const key = prop.slice(DirPrefixLength).match(DirKeyRegExp)![0]
    const directive = inject(App)!.directives[key]
    if (directive) {
      const binding = createBinding(prop, data)
      createEffect(() => directive(elt, binding))
    }
  } else if (isReactive(data)) {
    createEffect((currentValue) => {
      const nextValue = toValue(data)
      if (nextValue !== currentValue) {
        setProperty(elt, prop, nextValue)
      }
      return nextValue
    })
  } else {
    setProperty(elt, prop, data)
  }
}

function createBinding<T>(prop: string, rawValue: T): Binding<T> {
  const arg = prop.match(BindingArgRegExp)?.[1] || null
  const modifiers = prop.match(BindingModRegExp)?.reduce((modifiers, key) => {
    modifiers[key.slice(1)] = true
    return modifiers
  }, {}) || null
  return {
    get value() {
      return toValue(rawValue)
    },
    rawValue,
    arg,
    modifiers,
  }
}

function setProperty(elt: DOMElement, prop: string, value: any): void {
  if (prop in elt) {
    elt[prop] = value
    return
  }
  const name = toKebabCase(prop)
  if (value != null) {
    elt.setAttribute(name, value + "")
  } else {
    elt.removeAttribute(name)
  }
}

function createNodeArray(nodeArray: Node[], ...elements: any[]): Node[] {
  for (const elt of elements) {
    if (elt == null || typeof elt === "boolean") {
      continue
    }
    if (elt instanceof DocumentFragment) {
      nodeArray.push(...Array.from(elt.childNodes))
    } else if (elt instanceof Node) {
      nodeArray.push(elt)
    } else if (typeof elt === "string" || typeof elt === "number") {
      const previousNode = nodeArray.at(-1)
      if (previousNode instanceof Text) {
        previousNode.data = previousNode.data + elt
      } else {
        nodeArray.push(new Text(elt + ""))
      }
    } else if (isReactive(elt)) {
      createNodeArray(nodeArray, toValue(elt))
    } else if (Symbol.iterator in elt) {
      createNodeArray(nodeArray, ...elt)
    }
  }
  return nodeArray
}

function reconcileNodes(
  anchor: ChildNode,
  currentNodes: (ChildNode | null)[] | null | undefined,
  nextNodes: (Node | ChildNode)[],
): void {
  const parentNode = anchor.parentNode
  if (currentNodes == null) {
    for (const nextNode of nextNodes) {
      parentNode?.insertBefore(nextNode, anchor)
    }
    return
  }
  let i = 0, j = 0, c = currentNodes.length, n = nextNodes.length
  next:
  for (; i < n; i++) {
    const currentNode = currentNodes[i]
    for (; j < c; j++) {
      if (currentNodes[j] === null) {
        continue
      }
      if (sameCharacterDataType(currentNodes[j]!, nextNodes[i])) {
        currentNodes[j]!.data = nextNodes[i].data
        nextNodes[i] = currentNodes[j]!
      } else if (currentNodes[j]!.isEqualNode(nextNodes[i])) {
        nextNodes[i] = currentNodes[j]!
      }
      if (nextNodes[i] === currentNodes[j]) {
        currentNodes[j] = null
        if (i === j) {
          continue next
        }
        break
      }
    }
    parentNode?.insertBefore(nextNodes[i], currentNode?.nextSibling || anchor)
  }
  while (currentNodes.length) {
    currentNodes.pop()?.remove()
  }
}

function sameCharacterDataType(
  node: Node,
  otherNode: Node,
): node is CharacterData {
  const type = node.nodeType
  return (type === 3 || type === 8) && otherNode.nodeType === type
}

export type DOMElement = HTMLElement | SVGElement

export type TemplateResult = Node | Node[] | undefined

export interface Binding<T = unknown> {
  readonly value: T
  readonly rawValue: (() => T) | T
  readonly arg: string | null
  readonly modifiers: Modifiers | null
}

export type Modifiers = { [key: string]: boolean }

export interface AppInjection {
  directives: jail.Directives
  components: jail.Components
}

export interface Directive<T = unknown> {
  (elt: DOMElement, binding: Binding<T>): void
}

export interface RootComponent {
  (): any
}

export interface Component<P extends object = {}> {
  (props: P & Props): any
}

export type Props = {
  children?: any
}

declare global {
  namespace jail {
    interface Directives {
      on?: (this: DOMElement, ev: Event) => void
      ref?: (elt: DOMElement) => void
      show?: boolean
      if?: boolean
      html?: string
      text?: string
      style?: string
      bind?: any
    }

    interface Components {}

    interface Injections {
      [App]?: AppInjection
    }
  }

  interface Node {
    [unknownProperty: string | symbol]: any
  }

  interface HTMLElement {
    [unknownProperty: string | symbol]: any
  }

  interface SVGElement {
    [unknownProperty: string | symbol]: any
  }

  interface DocumentFragment {
    querySelectorAll(selectors: string): Iterable<DOMElement>
  }
}
