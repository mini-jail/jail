/// <reference types="./mod.d.ts" />
import {
  branchRef,
  cleaned,
  effect,
  inject,
  injection,
  isReactive,
  toValue,
  tree,
  withBranch,
} from "signal";

const { replace, slice, includes, startsWith, toLowerCase, match, trim } =
  String.prototype;
const { replaceChild, insertBefore, isEqualNode, cloneNode } = Node.prototype;
const { getAttribute, setAttribute, removeAttribute } = Element.prototype;
const { push } = Array.prototype;
const hash = ((size, chars) => {
  let counter = -1, result = "";
  while (++counter < size) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result + "_";
})(8, "abcdefghijklmnopqrstuvwxyz");
const ArgRegExp = /###(\d+)###/g;
const TagRegExp = /<[a-zA-Z\-](?:"[^"]*"|'[^']*'|[^'">])*>/g;
const AttrRegExp = / ([^"'<>]+)=["']###(\d+)###["']/g;
const OnlyLastAttr = RegExp(`( ${hash})(?=.*[.])`, "g");
const ChildQuery = `slot[name^=${hash}]`;
const AttrQuery = `[${hash}]`;
const TemplateCache = new Map();
const App = injection({
  branch: null,
  cleanup: null,
  mounted: false,
  anchor: null,
  rootElement: document,
  directives: {},
  currentNodes: null,
});

function useApp() {
  return inject(App);
}

function createAppInjection(callback) {
  return App.provide({}, (cleanup) => {
    const app = useApp();
    app.branch = branchRef();
    app.mounted = false;
    app.anchor = null;
    app.currentNodes = null;
    app.directives = {};
    app.components = {};
    app.cleanup = cleanup;
    return callback(app);
  });
}

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
          withBranch(app.branch, () => {
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
      withBranch(app.branch, () => {
        effect(() => {
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
      return withBranch(app.branch, callback);
    },
    use(plugin) {
      plugin.install(this);
      return this;
    },
  }));
}

export function component(component) {
  return function Component(...args) {
    return createScope(() => component(...args));
  };
}

export function directive(name, directive) {
  useApp().directives[name] = directive;
}

export function mount(rootElement, rootComponent) {
  return tree((cleanup) => {
    const anchor = rootElement.appendChild(new Text());
    let currentNodes = null;
    effect(() => {
      const nextNodes = createNodeArray([], rootComponent());
      reconcileNodes(anchor, currentNodes, nextNodes);
      currentNodes = nextNodes;
    });
    cleaned(() => {
      reconcileNodes(anchor, currentNodes, []);
      anchor?.remove();
      currentNodes = null;
    });
    return cleanup;
  });
}

export function template(strings, ...args) {
  const template = TemplateCache.get(strings) || createTemplate(strings);
  const fragment = cloneNode.call(template.fragment, true);
  if (template.attributes) {
    for (const elt of fragment.querySelectorAll(AttrQuery)) {
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
  if (template.insertions) {
    for (const elt of fragment.querySelectorAll(ChildQuery)) {
      insertChild(elt, args[slice.call(elt.name, hash.length)]);
    }
  }
  return fragment;
}

function createTemplate(strings) {
  let insertions = null;
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
    return replace.call(match, OnlyLastAttr, "");
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
  const cacheItem = { fragment: template.content, attributes, insertions };
  TemplateCache.set(strings, cacheItem);
  return cacheItem;
}

function insertChild(elt, value) {
  if (value == null || typeof value === "boolean") {
    elt.remove();
  } else if (value instanceof Node) {
    replaceChild.call(elt.parentNode, value, elt);
  } else if (isReactive(value) || (Array.isArray(value) && value.length)) {
    const anchor = new Text();
    replaceChild.call(elt.parentNode, anchor, elt);
    effect((currentNodes) => {
      const nextNodes = createNodeArray([], toValue(value));
      reconcileNodes(anchor, currentNodes, nextNodes);
      return nextNodes;
    }, null);
  } else {
    replaceChild.call(elt.parentNode, new Text(String(value)), elt);
  }
}

function insertAttribute(elt, prop, data) {
  if (startsWith.call(prop, "d-")) {
    prop = slice.call(prop, 2);
    const key = match.call(prop, /[^:.]+/)[0];
    const directive = useApp().directives[key];
    if (directive) {
      effect((binding) => {
        const cleanup = directive(elt, binding);
        if (typeof cleanup === "function") {
          cleaned(cleanup);
        }
        return binding;
      }, binding(prop, data));
    }
  } else if (isReactive(data)) {
    effect((currentValue) => {
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

function binding(prop, rawValue) {
  let modifiers = null, arg = null;
  if (includes.call(prop, ":")) {
    arg = match.call(prop, /:([^"'<>.]+)/)[1];
  }
  if (includes.call(prop, ".")) {
    for (const key of match.call(prop, /\.([^"'<>.]+)/g)) {
      modifiers = modifiers || {};
      modifiers[slice.call(key, 1)] = true;
    }
  }
  return {
    get value() {
      return toValue(rawValue);
    },
    rawValue,
    arg,
    modifiers,
  };
}

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

function createAttributeName(name) {
  return toLowerCase.call(replace.call(name, /([A-Z])/g, "-$1"));
}

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

function bothAreCharacterData(node, otherNode) {
  const type = node.nodeType;
  return (type === 3 || type === 8) && otherNode.nodeType === type;
}
