import { createEffect, createScope, onDestroy, onMount } from "signal";

const Attribute = /([^\-\_\ ][\*\@\-\_\.\:a-zA-Z0-9]+)="$/;
const EventAndOptions = /(\w+)(\.?.*)/;

const { replace, slice, includes, startsWith, toLowerCase } = String.prototype;
const { replaceChild, insertBefore } = Node.prototype;
const { setAttribute, removeAttribute } = Element.prototype;

/** @type {{ [key: string]: DocumentFragment }} */
const Cache = Object.create(null);

const Events = Symbol("Events");
/** @type {{ [name: string]: boolean }} */
const EventMap = Object.create(null);

/** @type {{ [name: string]: (elt: HTMLElement | SVGElement, value: unknown) => void}} */
const DirectiveMap = Object.create(null);

/**
 * @param {string} name
 * @param {(elt: HTMLElement | SVGElement, value: unknown) => void} handler
 * @returns {() => void}
 */
export function directive(name, handler) {
  const originalDirective = DirectiveMap[name];
  onMount(() => DirectiveMap[name] = handler);
  onDestroy(() => DirectiveMap[name] = originalDirective);
}

/**
 * @param {TemplateStringsArray} strings
 * @param {...any} [args]
 * @returns {DocumentFragment}
 */
export function template(strings, ...args) {
  const length = args.length;

  if (length === 0) {
    return getTemplateContent(strings[0]);
  }

  let data = "", i = -1;
  /** @type {{ [id: string]: any } | null} */
  let insertMap = null;
  /** @type {{ [id: string]: any } | null} */
  let attributeMap = null;

  while (++i < length) {
    let nose = strings[i];
    let tail = args[i];

    if (Attribute.test(nose)) {
      nose = replace.call(nose, Attribute, `data-_att_${i}="$1" _att="`);
      attributeMap = attributeMap || {};
      attributeMap[i] = tail;
      tail = "";
    } else {
      insertMap = insertMap || {};
      insertMap["_ins_" + i] = tail;
      tail = `<br id=_ins_${i} />`;
    }

    data += nose + tail;
  }

  const content = getTemplateContent(data += strings.at(-1));

  if (attributeMap) {
    insertAttributes(content, attributeMap);
  }

  if (insertMap !== null) {
    insertChildren(content, insertMap);
  }

  return content;
}

/**
 * @param {string} data
 * @returns {DocumentFragment}
 */
function getTemplateContent(data) {
  if (data in Cache === false) {
    const template = document.createElement("template");
    let markup = data;
    markup = replace.call(markup, /^ +/gm, "");
    markup = replace.call(markup, /^\n+/, "");
    markup = replace.call(markup, /\n+$/, "");
    template.innerHTML = markup;
    Cache[data] = template.content;
  }
  return Cache[data].cloneNode(true);
}

/**
 * @param {DocumentFragment} root
 * @param {{ [id: string]: any }} insertMap
 * @returns {void}
 */
function insertChildren(root, insertMap) {
  /** @type {Iterable<HTMLBRElement>} */
  const elements = root.querySelectorAll("br[id]");
  for (const elt of elements) {
    const value = insertMap[elt.id];
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
 * @param {{ [id: string]: any }} attributeMap
 * @returns {void}
 */
function insertAttributes(root, attributeMap) {
  /** @type {Iterable<HTMLElement | SVGElement>} */
  const elements = root.querySelectorAll("[_att]");

  for (const elt of elements) {
    for (const data in elt.dataset) {
      if (startsWith.call(data, "_att_") === false) {
        continue;
      }

      const prop = elt.dataset[data];
      const value = attributeMap[replace.call(data, "_att_", "")];

      if (startsWith.call(prop, "*")) {
        DirectiveMap[slice.call(prop, 1)]?.(elt, value);
      } else if (startsWith.call(prop, "@")) {
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

    removeAttribute.call(elt, "_att");
  }
}

/**
 * @param {Element} elt
 * @param {string} property
 * @param {any} value
 */
function setProperty(elt, property, value) {
  let forceProperty = false;
  if (startsWith.call(property, ".")) {
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
 * @param {Event} ev
 * @returns {void}
 */
function eventLoop(ev) {
  const type = ev.type;
  let elt = ev.target;
  while (elt !== null) {
    elt?.[Events]?.[type]?.call?.(elt, ev);
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

  if (includes.call(options, ".delegate")) {
    elt[Events] = elt[Events] || {};
    elt[Events][name] = listener;
    !EventMap[name] && addEventListener(name, eventLoop);
    EventMap[name] = true;
    return;
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

  if (includes.call(options, ".prevent")) {
    const listenerCopy = listener;
    listener = function (event) {
      event.preventDefault();
      listenerCopy.call(elt, event);
    };
  }

  if (includes.call(options, ".stop")) {
    const listenerCopy = listener;
    listener = function (event) {
      event.stopPropagation();
      listenerCopy.call(elt, event);
    };
  }

  elt.addEventListener(name, listener, eventOptions);
}
