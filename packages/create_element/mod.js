import { createEffect, createScope } from "signal";

/**
 * @template [T = object]
 * @typedef {{ [K in keyof T]: T[K] | (() => T[K]) }} ReactiveProxy
 */

/** @type {Element | null} */
let parentElt = null;
/** @type {Node[] | null} */
let dynamicFragment = null;

/** @type {Element} */
const proxy = new Proxy({}, {
  get(_target, property) {
    if (typeof parentElt[property] === "function") {
      return parentElt[property].bind(parentElt);
    }
    return parentElt[property];
  },
  set(_target, property, value) {
    if (typeof value === "function" && !property.startsWith("on")) {
      const elt = parentElt;
      createEffect((currentValue) => {
        const nextValue = value();
        if (currentValue !== nextValue) {
          elt[property] = value();
        }
        return nextValue;
      });
    } else {
      parentElt[property] = value;
    }
    return true;
  },
});

/**
 * @template T
 * @param {T & keyof HTMLElementTagNameMap} tagName
 * @param {(elt: ReactiveProxy<HTMLElementTagNameMap[T]>) => void} [modify]
 * @returns {HTMLElementTagNameMap[T]}
 */
export function createElement(tagName, modify) {
  const parent = parentElt;
  const elt = document.createElement(tagName);
  if (modify) {
    parentElt = elt;
    modify(modify.length ? proxy : undefined);
    parentElt = parent;
  }
  insert(elt);
  return elt;
}

/**
 * @template T
 * @param {T & keyof SVGElementTagNameMap} tagName
 * @param {(elt: ReactiveProxy<SVGElementTagNameMap[T]>) => void} [modify]
 * @returns {SVGElementTagNameMap[T]}
 */
export function createElementNS(tagName, modify) {
  const parent = parentElt;
  const elt = document.createElementNS("http://www.w3.org/2000/svg", tagName);
  if (modify) {
    parentElt = elt;
    modify(modify.length ? proxy : undefined);
    parentElt = parent;
  }
  insert(elt);
  return elt;
}

/**
 * @param {() => void} modify
 * @returns {DocumentFragment}
 */
export function createFragment(modify) {
  const parent = parentElt;
  const elt = parentElt = new DocumentFragment();
  modify();
  parentElt = parent;
  insert(elt);
  return elt;
}

/**
 * @param {any} data
 * @returns {Text}
 */
export function createText(data) {
  const node = new Text();
  modifyCharacterData(node, data);
  return insert(node);
}

/**
 * @param {any} data
 * @returns {Comment}
 */
export function createComment(data) {
  const node = new Comment();
  modifyCharacterData(node, data);
  return insert(node);
}

/**
 * @param {CharacterData} node
 * @param {any} data
 * @returns {void}
 */
function modifyCharacterData(node, data) {
  if (typeof data === "function") {
    createEffect((currentValue) => {
      const nextValue = String(data());
      if (nextValue !== currentValue) {
        node.data = nextValue;
      }
      return nextValue;
    });
  } else {
    node.data = String(data);
  }
}

/**
 * @param {() => void} modify
 * @returns {void}
 */
export function createDynamic(modify) {
  const anchor = parentElt.appendChild(new Text());

  createEffect((currentNodes) => {
    const previousNodes = dynamicFragment;
    const nextNodes = dynamicFragment = [];
    parentElt = anchor.parentElement;
    modify();
    dynamicFragment = previousNodes;
    parentElt = null;
    union(anchor, currentNodes, nextNodes);
    if (nextNodes.length === 0) {
      return null;
    }
    return nextNodes;
  }, null);
}

/**
 * @template T
 * @param {T & Node} node
 * @returns {T}
 */
function insert(node) {
  if (dynamicFragment) dynamicFragment.push(node);
  else parentElt?.appendChild(node);
  return node;
}

/**
 * @template T
 * @param {T & keyof GlobalEventHandlersEventMap} name
 * @param {(ev: GlobalEventHandlersEventMap[T]) => void} listener
 * @param {boolean | AddEventListenerOptions} [options]
 * @returns {void}
 */
export function createListener(name, listener, options) {
  parentElt?.addEventListener(name, listener, options);
}

/**
 * @param {string} name
 * @param {any} value
 * @returns {void}
 */
export function setAttribute(name, value) {
  const qualifiedName = createQualifiedName(name);
  if (typeof value === "function") {
    const elt = parentElt;
    createEffect((currentValue) => {
      const nextValue = String(value());
      if (nextValue === "") {
        elt.removeAttributeNS(null);
        return nextValue;
      }
      if (nextValue !== currentValue) {
        elt.setAttributeNS(null, qualifiedName, nextValue);
      }
      return nextValue;
    });
  } else if (value) {
    parentElt.setAttributeNS(qualifiedName, String(value));
  }
}

/**
 * @param {string} name
 * @returns {string}
 */
function createQualifiedName(name) {
  return name
    .replace(/([A-Z])/g, (match) => "-" + match[0])
    .toLowerCase();
}

/**
 * @template T
 * @param {T & Element} rootElement
 * @param {(elt: T) => void} modify
 * @returns {import("signal").Cleanup}
 */
export function render(rootElement, modify) {
  return createScope((dispose) => {
    const previousparentElt = parentElt;
    parentElt = rootElement;
    modify(parentElt);
    parentElt = previousparentElt;
    return dispose;
  });
}

/**
 * @param {Text} anchor
 * @param {(Node | null)[] | null} curr
 * @param {Node[]} next
 * @returns {void}
 */
function union(anchor, curr, next) {
  const elt = anchor.parentNode;
  if (curr === null) {
    for (const node of next) {
      elt.insertBefore(node, anchor);
    }
    return;
  }
  const currLength = curr.length;
  const nextLength = next.length;
  outerLoop:
  for (let i = 0; i < nextLength; i++) {
    const currNode = curr[i];
    for (let j = 0; j < currLength; j++) {
      if (curr[j] === null) continue;
      else if (curr[j].nodeType === 3 && next[i].nodeType === 3) {
        if (curr[j].data !== next[i].data) curr[j].data = next[i].data;
        next[i] = curr[j];
      } else if (curr[j].isEqualNode(next[i])) next[i] = curr[j];
      if (next[i] === curr[j]) {
        curr[j] = null;
        if (i === j) continue outerLoop;
        break;
      }
    }
    elt.insertBefore(next[i], currNode?.nextSibling || null);
  }
  while (curr.length) curr.pop()?.remove();
}
