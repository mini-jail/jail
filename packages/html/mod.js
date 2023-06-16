import { createEffect } from "signal";

const Property = /([@.-_:\w\d]+)="$/;

const Placeholder = "__placeholder__";

/**
 * @param {TemplateStringsArray} strings
 * @param  {...any} args
 * @returns {DocumentFragment}
 */
export function html(strings, ...args) {
  const { fragment, replacement, properties } = createFragment(strings, args);
  if (replacement) {
    replaceChildren(fragment, args);
  }
  if (properties) {
    setProperties(fragment, args);
  }
  return fragment;
}

/**
 * @param {TemplateStringsArray} strings
 * @param {any[]} args
 * @returns {{
 *   fragment: DocumentFragment,
 *   replacement: boolean,
 *   properties: boolean
 * }}
 */
function createFragment(strings, args) {
  const template = document.createElement("template");
  let result = "";
  let i = -1;
  const length = args.length;
  let replacement = false;
  let properties = false;

  while (++i < length) {
    const string = strings.raw[i];
    let nose = string;
    let tail = args[i];
    const isProperty = Property.test(string);

    if (isProperty) {
      nose = string.replace(
        Property,
        `data-__prop__ data-__key__${i}="$1" data-__arg__${i}="`,
      );
      tail = i;
      properties = true;
    } else if (isInsertable(tail)) {
      tail = `<!--${Placeholder}${i}-->`;
      replacement = true;
    }

    if (tail == null || typeof tail === "boolean") {
      tail = "";
    }

    result += nose + tail;
  }

  template.innerHTML = result += strings.at(-1);

  return {
    fragment: template.content,
    replacement,
    properties,
  };
}

/**
 * @param {DocumentFragment} fragment
 * @param {any[]} args
 * @returns {void}
 */
function replaceChildren(fragment, args) {
  const walker = document.createTreeWalker(fragment, 128);
  let node = null;
  while ((node = walker.nextNode())) {
    if (node.data.startsWith(Placeholder) === false) {
      continue;
    }
    const replacement = args[Number(node.data.replace(Placeholder, ""))];
    if (replacement instanceof Node) {
      node.parentNode.replaceChild(replacement, node);
    } else {
      const anchor = new Text();
      node.parentNode.replaceChild(anchor, node);
      createEffect((currentNodes) => {
        const nextNodes = createNodeArray(() => replacement);
        reconcileNodes(anchor, currentNodes, nextNodes);
        return nextNodes;
      }, []);
    }
  }
}

/**
 * @param {DocumentFragment} fragment
 * @param {any[]} args
 * @returns {void}
 */
function setProperties(fragment, args) {
  for (const elt of fragment.querySelectorAll("[data-__prop__]")) {
    let dynamicProperties = null;

    for (const data in elt.dataset) {
      if (data.startsWith("__key__") === false) {
        continue;
      }

      const index = data.replace("__key__", "");
      const property = elt.getAttribute(`data-__key__${index}`);
      const value = args[Number(elt.getAttribute(`data-__arg__${index}`))];

      if (property.startsWith("on")) {
        const name = property.startsWith("on:")
          ? property.slice("2")
          : property.slice("2").toLowerCase();
        elt.addEventListener(name, value);
      } else if (typeof value === "function") {
        if (dynamicProperties === null) {
          dynamicProperties = {};
        }
        dynamicProperties[property] = value;
      } else {
        setProperty(elt, property, value);
      }

      elt.removeAttribute(`data-__arg__${index}`);
      elt.removeAttribute(`data-__key__${index}`);
    }

    elt.removeAttribute("data-__prop__");

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
  if (property in elt) {
    elt[property] = value;
    return;
  }
  const name = property
    .replace(/([A-Z])/g, (str) => "-" + str[0])
    .toLowerCase();
  if (value !== null) {
    elt.setAttributeNS(null, name, String(value));
  } else {
    elt.removeAttributeNS(null, name);
  }
}

/**
 * @param  {...any} elements
 * @returns {Node[]}
 */
export function createNodeArray(...elements) {
  const nodeArray = [];
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
      nodeArray.push(...createNodeArray(elt()));
    } else if (Symbol.iterator in elt) {
      nodeArray.push(...createNodeArray(...elt));
    }
  }
  return nodeArray;
}

/**
 * @param {Node} anchor
 * @param {Node[]} currentNodes
 * @param {Node[]} nextNodes
 * @returns {void}
 */
function reconcileNodes(anchor, currentNodes, nextNodes) {
  const parentNode = anchor.parentNode,
    nextLength = nextNodes.length,
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
      parentNode.insertBefore(nextNodes[i], currentNode?.nextSibling || anchor);
    }
  }

  while (currentNodes.length) {
    currentNodes.pop()?.remove();
  }
}

/**
 * @param {any} value
 * @returns {boolean}
 */
function isInsertable(value) {
  return typeof value === "function" ||
    value instanceof Node ||
    Array.isArray(value);
}

export default html;
