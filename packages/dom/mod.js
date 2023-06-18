import { createEffect, createScope, onDestroy, onMount } from "signal";

const Attribute = /([@.:-_\w\d]+)="$/;
const EventAndOptions = /(\w+)(\.?.*)/;

const testAttribute = Attribute.test.bind(Attribute);

const { replace, slice, includes, startsWith, toLowerCase } = String.prototype;
const { replaceChild, insertBefore } = Node.prototype;
const { setAttribute, removeAttribute } = Element.prototype;

/** @type {{ [key: string]: DocumentFragment }} */
const Cache = Object.create(null);

const Events = Symbol("Events");
/** @type {{ [name: string]: boolean }} */
const EventMap = Object.create(null);

/** @type {{ [name: string]: (elt: Element, value: unknown) => void}} */
const DirectiveMap = Object.create(null);

/**
 * @param {string} name
 * @param {(elt: Element) => void}} handler
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

  let data = "", i = -1, hasPlaceholders = false, hasAttributes = false;

  while (++i < length) {
    let nose = strings[i];
    let tail = args[i];

    if (testAttribute(nose)) {
      nose = replace.call(
        nose,
        Attribute,
        `data-__attribute__${i}="$1" __attribute__="`,
      );
      tail = i;
      hasAttributes = true;
    } else {
      tail = `<!--__placeholder__${i}-->`;
      hasPlaceholders = true;
    }

    data += nose + tail;
  }

  const content = getTemplateContent(data += strings.at(-1));

  if (hasAttributes) {
    insertAttributes(content, args);
  }

  if (hasPlaceholders) {
    insertChildren(content, args);
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
    markup = replace.call(markup, /\n+$/, "");
    markup = replace.call(markup, /^\n+/, "");
    template.innerHTML = markup;
    Cache[data] = template.content;
  } else {
    console.log("cached", Cache[data]);
  }
  return Cache[data].cloneNode(true);
}

/**
 * @param {DocumentFragment} root
 * @param {any[]} args
 * @returns {void}
 */
function insertChildren(root, args) {
  const iterator = document.createNodeIterator(root, 0x80);

  /** @type {Comment | null} */
  let node = null;

  while ((node = iterator.nextNode())) {
    if (startsWith.call(node.data, "__placeholder__") === false) {
      continue;
    }

    const index = Number(replace.call(node.data, "__placeholder__", ""));
    const value = args[index];

    if (value == null || typeof value === "boolean") {
      continue;
    }

    if (value instanceof Node) {
      replaceChild.call(node.parentNode, value, node);
    } else if (
      (Array.isArray(value) && value.length) ||
      typeof value === "function"
    ) {
      const anchor = new Text();
      replaceChild.call(node.parentNode, anchor, node);
      createEffect((currentNodes) => {
        const nextNodes = createNodeArray([], () => value);
        reconcileNodes(anchor, currentNodes, nextNodes);
        return nextNodes;
      }, null);
    } else {
      replaceChild.call(node.parentNode, new Text(String(value)), node);
    }
  }
}

/**
 * @param {DocumentFragment} root
 * @param {any[]} args
 * @returns {void}
 */
function insertAttributes(root, args) {
  /** @type {Iterable<HTMLElement | SVGElement>} */
  const elements = root.querySelectorAll("[__attribute__]");

  for (const elt of elements) {
    let dynamicProperties = null;

    for (const data in elt.dataset) {
      if (startsWith.call(data, "__attribute__") === false) {
        continue;
      }

      const prop = elt.dataset[data];
      const index = Number(replace.call(data, "__attribute__", ""));
      const value = args[index];

      if (startsWith.call(prop, "use:")) {
        onMount(() => DirectiveMap[slice.call(prop, 4)]?.(elt, value));
      } else if (startsWith.call(prop, "@") || startsWith.call(prop, "on")) {
        setEventListener(elt, prop, value);
      } else if (typeof value === "function") {
        dynamicProperties = dynamicProperties || {};
        dynamicProperties[prop] = value;
      } else {
        setProperty(elt, prop, value);
      }

      removeAttribute.call(elt, `data-${data}`);
    }

    removeAttribute.call(elt, "__attribute__");

    if (dynamicProperties) {
      createEffect((values) => {
        for (const prop in dynamicProperties) {
          const nextValue = dynamicProperties[prop]();
          if (nextValue !== values[prop]) {
            values[prop] = nextValue;
            setProperty(elt, prop, nextValue);
          }
        }
        return values;
      }, {});
    }
  }
}

/**
 * @param {Element} elt
 * @param {string} property
 * @param {any} value
 */
function setProperty(elt, property, value) {
  let forceProperty = false;
  if (startsWith.call(property, ":")) {
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
    if (elt == null) {
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
 * @param {(Node | null)[] | null} currentNodes
 * @param {Node[]} nextNodes
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

  if (nextLength) {
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
  if (startsWith.call(property, "@")) {
    property = slice.call(property, 1);
  } else if (startsWith.call(property, "on:")) {
    property = slice.call(property, 3);
  } else if (startsWith.call(property, "on")) {
    property = slice.call(toLowerCase.call(property), 2);
  }

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
