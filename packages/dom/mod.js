import {
  createEffect,
  createInjection,
  createScope,
  createSignal,
  inject,
  isReactive,
  nodeRef,
  onCleanup,
  toValue,
  withNode,
} from "signal";

/**
 * @typedef {{
 *   directive(name: string): Directive | undefined
 *   directive(name: string, directive: Directive): App
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
 *   directives: { [name: string]: Directive }
 *   components: { [name: string]: { new (): HTMLElement } }
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
 *   insertions: number[] | null
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
const { getAttribute, setAttribute, removeAttribute } = Element.prototype;
const { preventDefault, stopPropagation } = Event.prototype;
const { push } = Array.prototype;

const hash = ((size, chars) => {
  let counter = -1, result = "";
  while (++counter < size) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result + "_";
})(8, "abcdefghijklmnopqrstuvwxyz");

const ArgRegExp = /###(\d+)###/g;
const TagRegExp = /<[a-zA-Z0-9\-\!\/](?:"[^"]*"|'[^']*'|[^'">])*>/g;
const AttrRegExp = / ((?:d-\w+:?)?[\w]+[.\w\-\d\[\]]+)=["']###(\d+)###["']/gi;
const OnlyLastAttr = RegExp(`( ${hash})(?=.*[.])`, "g");
const Events = Symbol("Events");
const insertChildQuery = `slot[name^=${hash}]`;
const insertAttrQuery = `[${hash}]`;

/**
 * @type {Map<TemplateStringsArray, Template>}
 */
const TemplateCache = new Map();

/**
 * @type {import("signal").Injection<AppInjection>}
 */
const App = createInjection({
  node: null,
  cleanup: null,
  mounted: false,
  anchor: null,
  rootElement: document,
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
    app.directives = {};
    app.registeredEvents = {};
    app.components = {};
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
    component(name, rootComponent, options) {
      app.components[name] = class extends HTMLElement {
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
      };
      customElements.define(name, app.components[name]);
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
        attributeMap[id] = args[id];
        return attributeMap;
      }, {}),
    );
  }
  if (template.insertions) {
    insertChildren(
      fragment,
      template.insertions.reduce((insertMap, id) => {
        insertMap[hash + id] = args[id];
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
  /** @type {Template["insertions"]} */
  let insertions = null;
  /** @type {Template["attributes"]} */
  let attributes = null;
  let data = "", arg = 0;
  while (arg < strings.length - 1) {
    data = data + strings[arg] + `###${arg++}###`;
  }
  data = replace.call(trim.call(data + strings[arg]), /^[ \t]+/gm, "");
  data = replace.call(data, TagRegExp, (match) => {
    match = replace.call(match, /(\s+)/g, " ");
    match = replace.call(match, AttrRegExp, (_match, name, arg) => {
      attributes = attributes || [];
      push.call(attributes, Number(arg));
      return ` data-${hash + arg}="${name}" ${hash}`;
    });
    match = replace.call(match, ArgRegExp, (_match, arg) => {
      attributes = attributes || [];
      push.call(attributes, Number(arg));
      return ` data-${hash + arg}="d-ref" ${hash}`;
    });
    match = replace.call(match, OnlyLastAttr, "");
    return match;
  });
  data = replace.call(data, ArgRegExp, (_match, arg) => {
    insertions = insertions || [];
    push.call(insertions, Number(arg));
    return `<slot name="${hash + arg}"></slot>`;
  });
  data = trim.call(data);
  const template = document.createElement("template");
  template.innerHTML = data;
  /** @type {Template} */
  const cacheItem = {
    fragment: template.content,
    attributes,
    insertions,
  };
  TemplateCache.set(strings, cacheItem);
  return cacheItem;
}

/**
 * @param {DocumentFragment} root
 * @param {{ [id: string]: any }} args
 * @returns {void}
 */
function insertChildren(root, args) {
  /** @type {Iterable<HTMLSlotElement>} */
  const elements = root.querySelectorAll(insertChildQuery);
  for (const elt of elements) {
    insertChild(elt, args[elt.name]);
  }
}

/**
 * @param {Element} elt
 * @param {any} value
 */
function insertChild(elt, value) {
  if (value == null || typeof value === "boolean") {
    elt.remove();
    return;
  }
  if (value instanceof Node) {
    replaceChild.call(elt.parentNode, value, elt);
  } else if ((Array.isArray(value) && value.length) || isReactive(value)) {
    const anchor = new Text();
    replaceChild.call(elt.parentNode, anchor, elt);
    createEffect((currentNodes) => {
      const nextNodes = createNodeArray([], toValue(value));
      reconcileNodes(anchor, currentNodes, nextNodes);
      return nextNodes;
    }, null);
  } else {
    replaceChild.call(elt.parentNode, new Text(String(value)), elt);
  }
}

/**
 * @param {DocumentFragment} root
 * @param {{ [id: number]: any }} args
 * @returns {void}
 */
function insertAttributes(root, args) {
  /** @type {Iterable<HTMLElement | SVGElement>} */
  const elements = root.querySelectorAll(insertAttrQuery);
  for (const elt of elements) {
    removeAttribute.call(elt, hash);
    for (const data in elt.dataset) {
      if (startsWith.call(data, hash) === false) {
        continue;
      }
      const prop = getAttribute.call(elt, `data-${data}`);
      removeAttribute.call(elt, `data-${data}`);
      insertAttribute(elt, prop, args[slice.call(data, hash.length)]);
    }
  }
}

/**
 * @param {Element} elt
 * @param {string} prop
 * @param {any} data
 */
function insertAttribute(elt, prop, data) {
  if (startsWith.call(prop, "d-")) {
    prop = slice.call(prop, 2);
    if (startsWith.call(prop, "on")) {
      setEventListener(elt, prop, data);
    } else if (startsWith.call(prop, "ref")) {
      data?.(elt);
    } else {
      useApp().directives[prop]?.(elt, data);
    }
  } else if (isReactive(data)) {
    createEffect((currentValue) => {
      const nextValue = toValue(data);
      if (nextValue !== currentValue) {
        setProperty(elt, prop, nextValue);
      }
      return nextValue;
    });
  } else {
    setProperty(elt, prop, data);
  }
}

/**
 * @param {Element} elt
 * @param {string} prop
 * @param {any} value
 */
function setProperty(elt, prop, value) {
  if (prop in elt) {
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
    } else if (isReactive(elt)) {
      createNodeArray(nodeArray, toValue(elt));
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
  return toLowerCase.call(replace.call(name, /([A-Z])/g, "-$1"));
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
      if (bothAreCharacterData(currentNodes[j], nextNodes[i])) {
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
 * @param {Node} node
 * @param {Node} otherNode
 * @returns {boolean}
 */
function bothAreCharacterData(node, otherNode) {
  const type = node.nodeType;
  return (type === 3 || type === 8) && otherNode.nodeType === type;
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
 * @param {EventListener} listener
 */
function setEventListener(elt, prop, listener) {
  const app = useApp();
  // [d-]on:click => click
  prop = slice.call(prop, 3);
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
