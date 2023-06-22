import {
  createEffect,
  createInjection,
  createScope,
  inject,
  nodeRef,
  onCleanup,
  withNode,
} from "signal";

/**
 * @typedef {{
 *   directive(name: string): Directive | undefined
 *   directive(name: string, directive: Directive): App
 *   method(name: string): ((...args: any[]) => any) | undefined
 *   method(name: string, method: (...args: any[]) => any): App
 *   component(name: `${string}-${string}`, rootComponent: Component, options?: ComponentOptions): App
 *   mount(rootElement: Element): App
 *   unmount(): App
 *   run<T>(callback: () => T): T
 *   use(plugin: Plugin): App
 * }} App
 */

/**
 * @typedef {{
 *   node: import("signal").Node | null
 *   cleanup: import("signal").Cleanup | null
 *   mounted: boolean
 *   anchor: Node | null
 *   rootElement: Document | Element | null
 *   currentNodes: Node[] | null
 *   methods: { [name: string]: (...args: any[]) => any }
 *   directives: { [name: string]: Directive }
 *   registeredEvents: { [name: string]: boolean }
 * }} AppInjection
 */

/**
 * @template [P = any], [R = any]
 * @typedef {{ (...params: P): R }} Component
 */

/**
 * @typedef {{
 *   shadow?: boolean
 * }} ComponentOptions
 */

/**
 * @typedef {{
 *   install(app: App): void
 * }} Plugin
 */

/**
 * @typedef {{
 *   fragment: DocumentFragment
 *   attributes: number[] | null
 *   staticAttributes: { [id: number]: string } | null
 *   insertions: number[]
 * }} Template
 */

/**
 * @template [T = any]
 * @callback Directive
 * @param {HTMLElement | SVGElement} elt
 * @param {T} value
 * @returns {void}
 */

const { replace, slice, includes, startsWith, toLowerCase, match, trim } =
  String.prototype;
const { replaceChild, insertBefore, isEqualNode, cloneNode } = Node.prototype;
const { setAttribute, removeAttribute } = Element.prototype;
const { preventDefault, stopPropagation } = Event.prototype;
const { push } = Array.prototype;

const Events = Symbol("Events");
/** @type {Map<TemplateStringsArray, Template>} */
const TemplateCache = new Map();

/** @type {import("signal").Injection<AppInjection>} */
const App = createInjection({
  node: null,
  cleanup: null,
  mounted: false,
  anchor: null,
  rootElement: document,
  methods: {},
  directives: {},
  registeredEvents: {},
  currentNodes: null,
});

/**
 * @returns {AppInjection}
 */
function useApp() {
  return inject(App);
}

/**
 * @template T
 * @param {(app: AppInjection) => T} callback
 * @returns {T}
 */
function createAppInjection(callback) {
  return App.provide({}, (cleanup) => {
    const app = useApp();
    app.node = nodeRef();
    app.mounted = false;
    app.anchor = null;
    app.currentNodes = null;
    app.methods = {};
    app.directives = {};
    app.registeredEvents = {};
    app.cleanup = cleanup;
    return callback(app);
  });
}

/**
 * @param {Component} rootComponent
 * @returns {App}
 */
export function createApp(rootComponent) {
  return createAppInjection((app) => ({
    directive(name, directive) {
      if (arguments.length === 1) {
        return app.directives[name];
      }
      app.directives[name] = directive;
      return this;
    },
    method(name, callback) {
      if (arguments.length === 1) {
        return app.methods[name];
      }
      app.methods[name] = callback;
      return this;
    },
    component(name, rootComponent, options) {
      customElements.define(
        name,
        class Component extends HTMLElement {
          #onDestroy = null;
          constructor() {
            super();
            withNode(app.node, () => {
              this.#onDestroy = mount(
                options?.shadow ? this.attachShadow({ mode: "open" }) : this,
                rootComponent,
              );
            });
          }
          disconnectedCallback() {
            this.#onDestroy?.();
          }
        },
      );
      return this;
    },
    mount(rootElement) {
      if (app.mounted === true) {
        return this;
      }
      app.mounted = true;
      app.rootElement = rootElement;
      app.anchor = rootElement.appendChild(new Text());
      withNode(app.node, () => {
        createEffect(() => {
          const nextNodes = createNodeArray([], rootComponent());
          reconcileNodes(app.anchor, app.currentNodes, nextNodes);
          app.currentNodes = nextNodes;
        });
      });
      return this;
    },
    unmount() {
      app.cleanup();
      reconcileNodes(app.anchor, app.currentNodes, []);
      app.anchor?.remove();
      app.anchor = null;
      app.rootElement = null;
      app.currentNodes = null;
      app.mounted = false;
      return this;
    },
    run(callback) {
      return withNode(app.node, callback);
    },
    use(plugin) {
      plugin.install(this);
      return this;
    },
  }));
}

/**
 * @template T, [P = Parameters<T>], [R = ReturnType<T>]
 * @param {T & Component<P, R>} component
 * @returns {Component<P, R>}
 */
export function component(component) {
  return function Component(...args) {
    return createScope(() => component(...args));
  };
}

/**
 * @template [T = any]
 * @param {string} name
 * @param {Directive<T>} directive
 * @returns {void}
 */
export function directive(name, directive) {
  useApp().directives[name] = directive;
}

/**
 * @template T
 * @param {string} name
 * @param {T & (...args: any[]) => any} [method]
 * @returns {void}
 */
export function method(name, method) {
  useApp().methods[name] = method;
}

/**
 * @param {Element} rootElement
 * @param {Component} rootComponent
 * @returns {import("signal").Cleanup}
 */
export function mount(rootElement, rootComponent) {
  return createScope((cleanup) => {
    const anchor = rootElement.appendChild(new Text());
    let currentNodes = null;
    createEffect(() => {
      const nextNodes = createNodeArray([], rootComponent());
      reconcileNodes(anchor, currentNodes, nextNodes);
      currentNodes = nextNodes;
    });
    onCleanup(() => {
      reconcileNodes(anchor, currentNodes, []);
      anchor?.remove();
      currentNodes = null;
    });
    return cleanup;
  });
}

/**
 * @param {TemplateStringsArray} strings
 * @param {...any} [args]
 * @returns {DocumentFragment}
 */
export function template(strings, ...args) {
  const template = TemplateCache.get(strings) || createTemplate(strings);
  const fragment = cloneNode.call(template.fragment, true);
  if (template.attributes) {
    insertAttributes(
      fragment,
      template.attributes.reduce((attributeMap, id) => {
        attributeMap[id] = id in args
          ? args[id]
          : template.staticAttributes[id];
        return attributeMap;
      }, {}),
    );
  }
  if (template.insertions) {
    insertChildren(
      fragment,
      template.insertions.reduce((insertMap, id) => {
        insertMap["__arg__" + id] = args[id];
        return insertMap;
      }, {}),
    );
  }
  return fragment;
}

/**
 * @param {TemplateStringsArray} strings
 * @returns {Template}
 */
function createTemplate(strings) {
  /** @type {number[] | null} */
  let insertions = null;
  /** @type {number[] | null} */
  let attributes = null;
  /** @type {{ [id: number]: string } | null} */
  let staticAttributes = null;
  let data = "", id = 0;
  while (id < strings.length - 1) {
    data = data + strings[id] + `{{__arg__${id++}}}`;
  }
  data = data + strings[id];
  data = replace.call(data, /^\n+/, "");
  data = replace.call(data, /\n+$/, "");
  data = replace.call(data, /^ +/gm, "");
  data = replace.call(data, /<(\w+-\w+)[\s]+?\/>/gm, "<$1></$1>");
  data = replace.call(data, /<(\w+)([^>]+)>/gm, (_match, tag, attributes) => {
    return `<${tag}${replace.call(attributes, /(\n| )+/g, " ")}>`;
  });
  data = replace.call(
    data,
    / ([.|@|:|*]?[\w\-]+[.\w\-\d\[\]]+)=(["']){{__arg__(\d+)}}["']/gi,
    (_match, name, delimiter, id) => {
      attributes = attributes || [];
      push.call(attributes, Number(id));
      return ` data-__arg__${id}=${delimiter}${name}${delimiter} __arg__ `;
    },
  );
  data = replace.call(
    data,
    / ([.|@|:|*]+[\w\-]+[.\w\-\d\[\]]+)=(["'])([^"'<>]+)["']/gi,
    (_match, name, delimiter, value) => {
      attributes = attributes || [];
      push.call(attributes, id);
      staticAttributes = staticAttributes || {};
      staticAttributes[id] = value;
      return ` data-__arg__${id++}=${delimiter}${name}${delimiter} __arg__ `;
    },
  );
  data = replace.call(data, /{{__arg__(\d+)}}/g, (_match, id) => {
    insertions = insertions || [];
    push.call(insertions, Number(id));
    return `<slot name="__arg__${id}"></slot>`;
  });
  data = trim.call(data);
  const template = document.createElement("template");
  template.innerHTML = data;
  /** @type {Template} */
  const cacheItem = {
    fragment: template.content,
    attributes,
    insertions,
    staticAttributes,
  };
  TemplateCache.set(strings, cacheItem);
  return cacheItem;
}

/**
 * @param {DocumentFragment} root
 * @param {{ [id: string]: any }} insertMap
 * @returns {void}
 */
function insertChildren(root, insertMap) {
  /** @type {Iterable<HTMLSlotElement>} */
  const elements = root.querySelectorAll("slot[name^=__arg__]");
  for (const elt of elements) {
    const value = insertMap[elt.name];
    if (
      value == null || typeof value === "boolean" ||
      (Array.isArray(value) && value.length === 0)
    ) {
      elt.remove();
      continue;
    }
    if (value instanceof Node) {
      replaceChild.call(elt.parentNode, value, elt);
    } else if (Array.isArray(value) || typeof value === "function") {
      const anchor = new Text();
      replaceChild.call(elt.parentNode, anchor, elt);
      createEffect((currentNodes) => {
        const nextNodes = createNodeArray([], () => value);
        reconcileNodes(anchor, currentNodes, nextNodes);
        return nextNodes;
      }, null);
    } else {
      replaceChild.call(elt.parentNode, new Text(String(value)), elt);
    }
  }
}

/**
 * @param {DocumentFragment} root
 * @param {{ [id: number]: any }} attributeMap
 * @returns {void}
 */
function insertAttributes(root, attributeMap) {
  /** @type {Iterable<HTMLElement | SVGElement>} */
  const elements = root.querySelectorAll("[__arg__]");
  for (const elt of elements) {
    removeAttribute.call(elt, "__arg__");
    for (const data in elt.dataset) {
      if (startsWith.call(data, "__arg__") === false) {
        continue;
      }
      const prop = elt.dataset[data];
      const value = attributeMap[slice.call(data, 7)];
      removeAttribute.call(elt, `data-${data}`);
      if (prop[0] === "*") {
        const directive = useApp().directives[slice.call(prop, 1)];
        directive?.(elt, value);
      } else if (prop[0] === "@") {
        setEventListener(elt, prop, value);
      } else if (typeof value === "function") {
        createEffect((currentValue) => {
          const nextValue = value();
          if (nextValue !== currentValue) {
            setProperty(elt, prop, nextValue);
          }
          return nextValue;
        });
      } else {
        setProperty(elt, prop, value);
      }
    }
  }
}

/**
 * @param {Element} elt
 * @param {string} prop
 * @param {any} value
 */
function setProperty(elt, prop, value) {
  let mode = 0;
  if (prop[0] === ".") {
    mode = 1;
    prop = slice.call(prop, 1);
  } else if (prop[0] === ":") {
    mode = 2;
    prop = slice.call(prop, 1);
  }
  if (mode === 1 || (mode !== 2 && prop in elt)) {
    elt[prop] = value;
    return;
  }
  const name = createAttributeName(prop);
  if (value != null) {
    setAttribute.call(elt, name, String(value));
  } else {
    removeAttribute.call(elt, name);
  }
}

/**
 * @param {Node[]} nodeArray
 * @param  {...any} elements
 * @returns {Node[]}
 */
function createNodeArray(nodeArray, ...elements) {
  for (const elt of elements) {
    if (elt == null || typeof elt === "boolean") {
      continue;
    }
    if (elt instanceof DocumentFragment) {
      push.call(nodeArray, ...elt.childNodes);
    } else if (elt instanceof Node) {
      push.call(nodeArray, elt);
    } else if (typeof elt === "string" || typeof elt === "number") {
      push.call(nodeArray, new Text(String(elt)));
    } else if (typeof elt === "function") {
      createNodeArray(nodeArray, elt());
    } else if (Symbol.iterator in elt) {
      createNodeArray(nodeArray, ...elt);
    }
  }
  return nodeArray;
}

/**
 * @param {string} name
 * @returns {string}
 */
function createAttributeName(name) {
  return replace.call(name, /([A-Z])/g, toLowerCase.call("-$1"));
}

/**
 * @param {Node} anchor
 * @param {(ChildNode | null)[] | null} currentNodes
 * @param {(Node | ChildNode)[]} nextNodes
 * @returns {void}
 */
function reconcileNodes(anchor, currentNodes, nextNodes) {
  if (currentNodes === null) {
    for (const nextNode of nextNodes) {
      insertBefore.call(anchor.parentNode, nextNode, anchor);
    }
    return;
  }
  next:
  for (let i = 0; i < nextNodes.length; i++) {
    const currentNode = currentNodes[i];
    for (let j = 0; j < currentNodes.length; j++) {
      if (currentNodes[j] === null) {
        continue;
      }
      if (isAlsoCharacterData.call(currentNodes[j], nextNodes[i])) {
        currentNodes[j].data = nextNodes[i].data;
        nextNodes[i] = currentNodes[j];
      } else if (isEqualNode.call(currentNodes[j], nextNodes[i])) {
        nextNodes[i] = currentNodes[j];
      }
      if (nextNodes[i] === currentNodes[j]) {
        currentNodes[j] = null;
        if (i === j) {
          continue next;
        }
        break;
      }
    }
    insertBefore.call(
      anchor.parentNode,
      nextNodes[i],
      currentNode?.nextSibling || anchor,
    );
  }
  while (currentNodes?.length) {
    currentNodes.pop()?.remove();
  }
}

/**
 * @this {Node}
 * @param {Node} node
 * @returns {node is CharacterData}
 */
function isAlsoCharacterData(node) {
  const type = this.nodeType;
  return (type === 3 || type === 8) && node.nodeType === type;
}

/**
 * @param {Event} event
 * @returns {void}
 */
function eventLoop(event) {
  const type = event.type;
  let elt = event.target;
  while (elt !== null) {
    elt?.[Events]?.[type]?.forEach((fn) => fn.call(elt, event));
    elt = elt.parentNode;
  }
}

/**
 * @param {Element} elt
 * @param {string} prop
 * @param {EventListener | string} listener
 */
function setEventListener(elt, prop, listener) {
  const app = useApp();
  if (typeof listener === "string") {
    listener = app.methods[listener];
  }
  prop = slice.call(prop, 1);
  const name = replace.call(prop, /(\w+)(.*)/, "$1");
  const options = replace.call(prop, /(\w+)(.*)/, "$2");
  if (includes.call(options, ".prevent")) {
    const listenerCopy = listener;
    listener = function (event) {
      preventDefault.call(event);
      listenerCopy.call(elt, event);
    };
  }
  if (includes.call(options, ".stop")) {
    const listenerCopy = listener;
    listener = function (event) {
      stopPropagation.call(event);
      listenerCopy.call(elt, event);
    };
  }
  if (includes.call(options, ".debounce[")) {
    const listenerCopy = listener;
    let timer;
    listener = function (event) {
      clearTimeout(timer);
      timer = setTimeout(() => {
        listenerCopy.call(elt, event);
      }, Number(match.call(options, /debounce\[(\d+)\]/)[1]));
    };
    prop = replace.call(prop, /(\.debounce)\[\d+\]/, "$1");
  }
  /** @type {AddEventListenerOptions} */
  let eventOptions = undefined;
  if (includes.call(options, ".once")) {
    eventOptions = eventOptions || {};
    eventOptions.once = true;
  }
  if (includes.call(options, ".capture")) {
    eventOptions = eventOptions || {};
    eventOptions.capture = true;
  }
  if (includes.call(options, ".passive")) {
    eventOptions = eventOptions || {};
    eventOptions.passive = true;
  }
  if (includes.call(options, ".delegate")) {
    elt[Events] = elt[Events] || {};
    elt[Events][name] = elt[Events][name] || [];
    push.call(elt[Events][name], listener);
    prop = replace.call(prop, ".delegate", "");
    if (app.registeredEvents[prop] === undefined) {
      addEventListener(name, eventLoop, eventOptions);
      app.registeredEvents[prop] = true;
      withNode(app.node, () => {
        onCleanup(() => removeEventListener(name, eventLoop, eventOptions));
        app.registeredEvents[prop] = undefined;
      });
    }
  } else {
    elt.addEventListener(name, listener, eventOptions);
  }
}
