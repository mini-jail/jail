import { createEffect, createScope, onDestroy, onMount } from "signal";

/**
 * @typedef {object} Template
 * @property {DocumentFragment} Template.fragment
 * @property {string[] | null} Template.attributes
 * @property {string[] | null} Template.insertions
 */

/**
 * @callback Directive
 * @param {HTMLElement | SVGElement} elt
 * @param {unknown} value
 * @returns {void}
 */

/**
 * @typedef {{ [id: string]: any }} ArgumentMap
 */

const EventAndOptions = /(\w+)(.*)/;
const { replace, slice, includes, startsWith, toLowerCase, match } =
  String.prototype;
const { replaceChild, insertBefore } = Node.prototype;
const { setAttribute, removeAttribute } = Element.prototype;

const Events = Symbol("Events");

/** @type {Map<TemplateStringsArray, Template>} */
const TemplateCache = new Map();

/** @type {{ [name: string]: boolean }} */
const EventMap = Object.create(null);

/** @type {{ [name: string]: Directive }} */
const DirectiveMap = Object.create(null);

/**
 * @param {string} name
 * @param {Directive} directive
 * @returns {void}
 */
export function createDirective(name, directive) {
  const originalDirective = DirectiveMap[name];
  onMount(() => DirectiveMap[name] = directive);
  onDestroy(() => DirectiveMap[name] = originalDirective);
}

/**
 * @param {TemplateStringsArray} strings
 * @param {...any} [args]
 * @returns {DocumentFragment}
 */
export function template(strings, ...args) {
  const template = TemplateCache.get(strings) || createTemplate(strings);
  const fragment = template.fragment.cloneNode(true);
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
  /** @type {string[] | null} */
  let insertions = null;
  /** @type {string[] | null} */
  let attributes = null;
  let data = "", i = 0;
  while (i < strings.length - 1) {
    data = data + strings[i] + `{{__arg__${i++}}}`;
  }
  data = data + strings[i];
  data = replace.call(data, /^\n+/, "");
  data = replace.call(data, /\n+$/, "");
  data = replace.call(data, /^ +/gm, "");
  data = replace.call(data, /<(\w+)([^>]+)>/gm, (_match, tag, attributes) => {
    return `<${tag}${replace.call(attributes, /(\n| )+/g, " ")}>`;
  });
  data = replace.call(
    data,
    / ([.|@|:|\w|*]?[\w\-_][.\w\-\d\[\]]+)=("|'){{__arg__(\d+)}}("|')/gi,
    (_match, name, open, id, close) => {
      if (open !== close) {
        throw new SyntaxError(
          `expected ${open} but got ${close} at (${name}=${open}···${close})`,
        );
      }
      if (attributes === null) attributes = [id];
      else attributes.push(id);
      return ` data-__arg__${id}="${name}" __arg__`;
    },
  );

  data = replace.call(data, /{{__arg__(\d+)}}/g, (_match, id) => {
    if (insertions === null) insertions = [id];
    else insertions.push(id);
    return `<slot name="__arg__${id}"></slot>`;
  });
  const template = document.createElement("template");
  template.innerHTML = data;
  /** @type {Template} */
  const cacheItem = { fragment: template.content, attributes, insertions };
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
    if (value == null || typeof value === "boolean") {
      elt.remove();
      continue;
    }
    if (value instanceof Node) {
      replaceChild.call(elt.parentNode, value, elt);
    } else if (
      (Array.isArray(value) && value.length) ||
      typeof value === "function"
    ) {
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
    for (const data in elt.dataset) {
      if (startsWith.call(data, "__arg__") === false) {
        continue;
      }
      const prop = elt.dataset[data];
      const value = attributeMap[slice.call(data, 7)];
      if (prop[0] === "*") {
        DirectiveMap[slice.call(prop, 1)]?.(elt, value);
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
      removeAttribute.call(elt, `data-${data}`);
    }
    removeAttribute.call(elt, "__arg__");
  }
}

/**
 * @param {Element} elt
 * @param {string} property
 * @param {any} value
 */
function setProperty(elt, property, value) {
  let forceProperty = false;
  if (property[0] === ".") {
    property = slice.call(property, 1);
    forceProperty = true;
  }
  if (forceProperty || property in elt) {
    elt[property] = value;
    return;
  }
  const name = createAttributeName(property);
  if (value != null) {
    setAttribute.call(elt, name, String(value));
  } else {
    removeAttribute.call(elt, name);
  }
}

/**
 * @this {Node[]} nodeArray
 * @param  {...any} elements
 * @returns {Node[]}
 */
function createNodeArray(nodeArray = [], ...elements) {
  for (const elt of elements) {
    if (elt == null || typeof elt === "boolean") {
      continue;
    }
    if (elt instanceof DocumentFragment) {
      nodeArray.push(...elt.childNodes);
    } else if (elt instanceof Node) {
      nodeArray.push(elt);
    } else if (typeof elt === "string" || typeof elt === "number") {
      nodeArray.push(new Text(String(elt)));
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
  const nextLength = nextNodes.length,
    currentLength = currentNodes.length;
  let i = -1;
  next:
  while (++i < nextLength) {
    const currentNode = currentNodes[i];
    let j = -1;
    while (++j < currentLength) {
      if (currentNodes[j] === null) {
        continue;
      }
      if (currentNodes[j].nodeType === 3 && nextNodes[i].nodeType === 3) {
        currentNodes[j].data = nextNodes[i].data;
        nextNodes[i] = currentNodes[j];
      } else if (currentNodes[j].isEqualNode(nextNodes[i])) {
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
 * @param {Node} rootElement
 * @param {() => Node} application
 * @returns {import("signal").Cleanup}
 */
export function render(rootElement, application) {
  return createScope((cleanup) => {
    const anchor = rootElement.appendChild(new Text());
    createEffect((currentNodes) => {
      const nextNodes = createNodeArray([], application());
      reconcileNodes(anchor, currentNodes, nextNodes);
      return nextNodes;
    }, null);
    return cleanup;
  });
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
 * @param {string} property
 * @param {(ev: Event) => any} listener
 */
function setEventListener(elt, property, listener) {
  property = property.slice(1);
  const name = replace.call(property, EventAndOptions, "$1");
  const options = replace.call(property, EventAndOptions, "$2");
  if (includes.call(options, ".prevent")) {
    console.log("decorate prevent");
    const listenerCopy = listener;
    listener = function (event) {
      event.preventDefault();
      listenerCopy.call(elt, event);
    };
  }
  if (includes.call(options, ".stop")) {
    console.log("decorate stop");
    const listenerCopy = listener;
    listener = function (event) {
      event.stopPropagation();
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
    property = replace.call(property, /(\.debounce)\[\d+\]/, "$1");
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
    elt[Events][name].push(listener);
    property = replace.call(property, ".delegate", "");
    !EventMap[property] && addEventListener(name, eventLoop, eventOptions);
    EventMap[property] = true;
  } else {
    elt.addEventListener(name, listener, eventOptions);
  }
}
