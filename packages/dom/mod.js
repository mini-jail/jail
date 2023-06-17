import { createEffect, createScope } from "signal";

const Attribute = /([@-_:\w\d]+)="$/;
/** @type {{ [key: string]: DocumentFragment }} */
const Cache = Object.create(null);
const replaceChild = Node.prototype.replaceChild;
const insertBefore = Node.prototype.insertBefore;
const testAttribute = Attribute.test.bind(Attribute);
const getAttribute = Element.prototype.getAttributeNS;
const setAttribute = Element.prototype.setAttributeNS;
const removeAttribute = Element.prototype.removeAttributeNS;

/**
 * @param {TemplateStringsArray} strings
 * @param {any[]} args
 * @returns {DocumentFragment}
 */
export function template(strings, ...args) {
  const length = args.length;
  let data = "", i = -1, hasReplacement = false, hasProps = false;
  while (++i < length) {
    let nose = strings.raw[i];
    let tail = args[i];
    if (testAttribute(nose)) {
      nose = nose.replace(
        Attribute,
        `data-__att__ data-__key__${i}="$1" data-__arg__${i}="`,
      );
      tail = i;
      hasProps = true;
    } else if (tail != null && typeof tail !== "boolean") {
      tail = `<!--__arg__${i}-->`;
      hasReplacement = true;
    } else {
      tail = "";
    }
    data += nose + tail;
  }
  const content = getTemplateContent(data += strings.at(-1));
  if (hasProps) {
    setProperties(content, args);
  }
  if (hasReplacement) {
    replaceChildren(content, args);
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
    template.innerHTML = data.replaceAll("\n", "").replaceAll("  ", "");
    Cache[data] = template.content;
  }
  return Cache[data].cloneNode(true);
}

/**
 * @param {DocumentFragment} fragment
 * @param {any[]} args
 * @returns {void}
 */
function replaceChildren(fragment, args) {
  const iterator = document.createNodeIterator(fragment, 0x80);
  /** @type {Comment | null} */
  let node = null;
  while ((node = iterator.nextNode())) {
    if (node.data.startsWith("__arg__") === false) {
      continue;
    }
    const index = Number(node.data.replace("__arg__", ""));
    const value = args[index];
    if (value == null || typeof value === "boolean") {
      continue;
    }
    if (value instanceof Node) {
      replaceChild.call(node.parentNode, value, node);
    } else if (Array.isArray(value) || typeof value === "function") {
      const anchor = new Text();
      replaceChild.call(node.parentNode, anchor, node);
      createEffect((currentNodes) => {
        const nextNodes = createNodeArray(() => value);
        reconcileNodes(anchor, currentNodes, nextNodes);
        return nextNodes;
      }, []);
    } else {
      replaceChild.call(node.parentNode, new Text(String(value)), node);
    }
  }
}

/**
 * @param {DocumentFragment} fragment
 * @param {any[]} args
 * @returns {void}
 */
function setProperties(fragment, args) {
  for (const elt of fragment.querySelectorAll("[data-__att__]")) {
    let dynamicProperties = null;
    for (const data in elt.dataset) {
      if (data.startsWith("__key__") === false) {
        continue;
      }
      const index = Number(data.replace("__key__", ""));
      const property = getAttribute.call(elt, null, `data-__key__${index}`);
      const value = args[getAttribute.call(elt, null, `data-__arg__${index}`)];
      if (property.startsWith("on")) {
        elt.addEventListener(createEventName(property), value);
      } else if (typeof value === "function") {
        if (dynamicProperties === null) {
          dynamicProperties = {};
        }
        dynamicProperties[property] = value;
      } else {
        setProperty(elt, property, value);
      }
      removeAttribute.call(elt, null, `data-__arg__${index}`);
      removeAttribute.call(elt, null, `data-__key__${index}`);
    }
    removeAttribute.call(elt, null, "data-__att__");
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
  const name = createAttributeName(property);
  if (value !== null) {
    setAttribute.call(elt, null, name, String(value));
  } else {
    removeAttribute.call(elt, null, name);
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
 * @param {string} name
 * @returns {string}
 */
function createEventName(name) {
  return name.startsWith("on:")
    ? name.slice("2")
    : name.slice("2").toLowerCase();
}

/**
 * @param {string} name
 * @returns {string}
 */
function createAttributeName(name) {
  return name
    .replace(/([A-Z])/g, (str) => "-" + str[0])
    .toLowerCase();
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
      insertBefore.call(
        parentNode,
        nextNodes[i],
        currentNode?.nextSibling || anchor,
      );
    }
  }
  while (currentNodes.length) {
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
      const nextNodes = createNodeArray(application());
      reconcileNodes(anchor, currentNodes, nextNodes);
      return nextNodes;
    }, []);
    return cleanup;
  });
}

export default template;
