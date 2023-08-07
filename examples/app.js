const ERROR_INJECTION_KEY = Symbol();
const NodeQueue = new Set();
let isRunning = false;
let activeNode = null;
function createRoot(callback) {
    const previousNode = activeNode, localNode = createNode();
    try {
        activeNode = localNode;
        return batch(()=>callback(callback.length === 0 ? undefined : ()=>cleanNode(localNode, true)));
    } catch (error) {
        handleError(error);
    } finally{
        activeNode = previousNode;
    }
}
function createNode(initialValue) {
    const localNode = {
        value: initialValue,
        parentNode: activeNode,
        childNodes: null,
        injections: null,
        cleanups: null,
        onupdate: null,
        sources: null,
        sourceSlots: null
    };
    if (activeNode !== null) {
        if (activeNode.childNodes === null) {
            activeNode.childNodes = [
                localNode
            ];
        } else {
            activeNode.childNodes.push(localNode);
        }
    }
    return localNode;
}
function onMount(callback) {
    createEffect(()=>untrack(callback));
}
function onUnmount(cleanup) {
    onCleanup(()=>untrack(cleanup));
}
function on(dependency, callback) {
    return (currentValue)=>{
        dependency();
        return untrack(()=>callback(currentValue));
    };
}
function createEffect(callback, initialValue) {
    if (activeNode !== null) {
        const localNode = createNode(initialValue);
        localNode.onupdate = callback;
        if (isRunning) {
            NodeQueue.add(localNode);
        } else {
            queueMicrotask(()=>updateNode(localNode, false));
        }
    } else {
        queueMicrotask(()=>callback(initialValue));
    }
}
function createComputed(callback, initialValue) {
    const source = createSource(initialValue);
    createEffect(()=>setValue(source, callback(source.value)));
    return ()=>getValue(source);
}
function lookup(node, key) {
    return node !== null ? node.injections !== null && key in node.injections ? node.injections[key] : lookup(node.parentNode, key) : undefined;
}
function createSource(initialValue) {
    return {
        value: initialValue,
        nodes: null,
        nodeSlots: null
    };
}
function getValue(source) {
    if (activeNode !== null && activeNode.onupdate !== null) {
        const sourceSlot = source.nodes?.length || 0, nodeSlot = activeNode.sources?.length || 0;
        if (activeNode.sources === null) {
            activeNode.sources = [
                source
            ];
            activeNode.sourceSlots = [
                sourceSlot
            ];
        } else {
            activeNode.sources.push(source);
            activeNode.sourceSlots.push(sourceSlot);
        }
        if (source.nodes === null) {
            source.nodes = [
                activeNode
            ];
            source.nodeSlots = [
                nodeSlot
            ];
        } else {
            source.nodes.push(activeNode);
            source.nodeSlots.push(nodeSlot);
        }
    }
    return source.value;
}
function setValue(source, nextValue) {
    if (typeof nextValue === "function") {
        nextValue = nextValue(source.value);
    }
    source.value = nextValue;
    if (source.nodes?.length) {
        batch(()=>{
            for (const node of source.nodes){
                NodeQueue.add(node);
            }
        });
    }
}
function toValue(data) {
    return typeof data === "function" ? data() : data;
}
function createSignal(initialValue) {
    const source = createSource(initialValue);
    return function Signal(value) {
        return arguments.length === 1 ? setValue(source, value) : getValue(source);
    };
}
function handleError(error) {
    const errorCallbacks = lookup(activeNode, ERROR_INJECTION_KEY);
    if (!errorCallbacks) {
        return reportError(error);
    }
    for (const callback of errorCallbacks){
        callback(error);
    }
}
function onCleanup(cleanup) {
    if (activeNode.cleanups === null) {
        activeNode.cleanups = [
            cleanup
        ];
    } else {
        activeNode.cleanups.push(cleanup);
    }
}
function untrack(getter) {
    const localNode = activeNode;
    activeNode = null;
    const result = getter();
    activeNode = localNode;
    return result;
}
function batch(callback) {
    if (isRunning) {
        return callback();
    }
    isRunning = true;
    const result = callback();
    queueMicrotask(flush);
    return result;
}
function flush() {
    if (isRunning === false) {
        return;
    }
    for (const node of NodeQueue){
        NodeQueue.delete(node);
        updateNode(node, false);
    }
    isRunning = false;
}
function updateNode(node, complete) {
    cleanNode(node, complete);
    if (node.onupdate === null) {
        return;
    }
    const previousNode = activeNode;
    activeNode = node;
    try {
        node.value = node.onupdate(node.value);
    } catch (error) {
        handleError(error);
    } finally{
        activeNode = previousNode;
    }
}
function cleanNode(node, complete) {
    if (node.sources?.length) {
        while(node.sources.length){
            const source = node.sources.pop();
            const sourceSlot = node.sourceSlots.pop();
            if (source.nodes?.length) {
                const sourceNode = source.nodes.pop();
                const nodeSlot = source.nodeSlots.pop();
                if (sourceSlot < source.nodes.length) {
                    source.nodes[sourceSlot] = sourceNode;
                    source.nodeSlots[sourceSlot] = nodeSlot;
                    sourceNode.sourceSlots[nodeSlot] = sourceSlot;
                }
            }
        }
    }
    if (node.childNodes?.length) {
        const isUpdatable = node.onupdate !== null;
        while(node.childNodes.length){
            const childNode = node.childNodes.pop();
            cleanNode(childNode, complete || isUpdatable && childNode.onupdate !== null);
        }
    }
    if (node.cleanups?.length) {
        while(node.cleanups.length){
            node.cleanups.pop()();
        }
    }
    node.injections = null;
    if (complete) {
        node.value = null;
        node.parentNode = null;
        node.childNodes = null;
        node.cleanups = null;
        node.onupdate = null;
        node.sources = null;
        node.sourceSlots = null;
    }
}
function inject(key, defaultValue) {
    return lookup(activeNode, key) || defaultValue;
}
function provide(key, value) {
    if (activeNode.injections === null) {
        activeNode.injections = {
            [key]: value
        };
    } else {
        activeNode.injections[key] = value;
    }
}
const APP_INJECTION_KEY = Symbol();
const ON_DEL_DIR_SYM = Symbol(), IF_DIR_SYM = Symbol();
const TYPE = "__type", VALUE = "__value", QUERY = `[${TYPE}]`;
const DIR_PREFIX = "d-", DIR_PREFIX_LENGTH = DIR_PREFIX.length;
const DIR_RE = RegExp(`${sub(DIR_PREFIX, "-", "\\-")}[^"'<>=\\s]`), DIR_KEY_RE = /[a-z\-\_]+/, ARG_RE = /#{(\d+)}/g, SINGLE_VALUE_RE = /^@{(\d+)}$/, KEBAB_NAME_RE = /-[a-z]/g, CAMEL_NAME_RE = /([A-Z])/g, MULTI_VALUE_RE = /@{(\d+)}/g, KEY_VALUE_RE = /^([^\s]+)\s(.*)$/, BINDING_MOD_RE = /\.(?:[^"'.])+/g, BINDING_ARG_RE = /:([^"'<>.]+)/, START_WS_RE = /^[\s]+/gm, CONTENT_RE = /^\r\n|\n|\r(>)\s+(<)$/gm, QUOTE_RE = /["']/, COMP_RE = /^<((?:[A-Z][a-z]+)+)/, CLOSING_COMP_RE = /<\/(?:[A-Z][a-z]+)+>/g, TAG_RE = /<(([a-z\-]+)(?:"[^"]*"|'[^']*'|[^'">])*)>/gi, SC_TAG_RE = /<([a-zA-Z-]+)(("[^"]*"|'[^']*'|[^'">])*)\s*\/>/g, ATTR_RE = /\s([a-z]+[^\s=>"']*)(?:(?:="([^"]*)"|(?:='([^']*)'))|(?:=([^\s=>"']+)))?/gi;
const ATTR_REPLACEMENT = `<$1 ${TYPE}="attr">`, SLOT_REPLACEMENT = `<slot ${TYPE}="slot" ${VALUE}="$1"></slot>`, COMP_REPLACEMENTS = [
    `<template ${TYPE}="comp" ${VALUE}="$1"`,
    "</template>"
];
const FRAGMENT_CACHE = new Map();
const ATTR_VALUE_CACHE = {};
const DELEGATED_EVENTS = {};
const SC_TAGS = {
    "area": true,
    "base": true,
    "br": true,
    "col": true,
    "command": true,
    "embed": true,
    "hr": true,
    "img": true,
    "input": true,
    "keygen": true,
    "link": true,
    "meta": true,
    "param": true,
    "source": true,
    "track": true,
    "wbr": true,
    "circle": true,
    "ellipse": true,
    "line": true,
    "path": true,
    "polygon": true,
    "polyline": true,
    "rect": true,
    "stop": true,
    "use": true
};
function createDirective(name, directive) {
    const directives = inject(APP_INJECTION_KEY).directives;
    if (name in directives) {
        const directiveCopy = directives[name];
        onUnmount(()=>directives[name] = directiveCopy);
    }
    directives[name] = directive;
}
function createComponent(name, component) {
    const components = inject(APP_INJECTION_KEY).components;
    if (name in components) {
        const componentCopy = components[name];
        onUnmount(()=>components[name] = componentCopy);
    }
    components[name] = component;
}
function mount(rootElement, rootComp) {
    return createRoot((cleanup)=>{
        provide(APP_INJECTION_KEY, {
            directives: {
                on: onDirective,
                ref: refDirective,
                show: showDirective,
                html: htmlDirective,
                text: textDirective,
                style: styleDirective,
                bind: bindDirective,
                if: ifDirective
            },
            components: {}
        });
        let anchor = rootElement.appendChild(new Text());
        let currentNodes = null;
        createEffect(()=>{
            const nextNodes = createNodeArray([], rootComp());
            reconcileNodes(anchor, currentNodes, nextNodes);
            currentNodes = nextNodes;
        });
        onCleanup(()=>{
            reconcileNodes(anchor, currentNodes, []);
            anchor.remove();
            anchor = null;
            currentNodes = null;
        });
        return cleanup;
    });
}
function template(templateStrings, ...slots) {
    return render(createOrGetFragment(templateStrings), slots);
}
const renderMap = {
    attr: (elt, slots)=>{
        const props = createProps(elt, slots);
        for(const key in props){
            renderAttr(elt, key, props[key]);
        }
    },
    slot: (elt, slots)=>{
        const key = elt.getAttribute(VALUE);
        renderChild(elt, slots[key]);
    },
    comp: (elt, slots)=>{
        const name = elt.getAttribute(VALUE);
        const component = inject(APP_INJECTION_KEY).components[name];
        if (component === undefined) {
            elt.remove();
            return;
        }
        createRoot(()=>{
            const props = createProps(elt, slots);
            if (elt.content.hasChildNodes()) {
                props.children = render(elt.content, slots);
            }
            renderChild(elt, component(props));
        });
    }
};
function render(fragment, slots) {
    for (const elt of fragment.querySelectorAll(QUERY)){
        const type = elt.getAttribute(TYPE);
        elt.removeAttribute(TYPE);
        renderMap[type]?.(elt, slots);
    }
    if (fragment.childNodes.length === 0) {
        return;
    }
    if (fragment.childNodes.length === 1) {
        return fragment.childNodes[0];
    }
    return Array.from(fragment.childNodes);
}
function createProps(elt, slots) {
    const props = {};
    for(const key in elt.dataset){
        if (key.startsWith("__")) {
            const match = elt.dataset[key].match(KEY_VALUE_RE);
            props[match[1]] = createValue(match[2], slots);
            delete elt.dataset[key];
        }
    }
    return props;
}
function getOrCreateValueCache(value) {
    if (value in ATTR_VALUE_CACHE) {
        return ATTR_VALUE_CACHE[value];
    }
    const id = value.match(SINGLE_VALUE_RE)?.[1];
    if (id) {
        return ATTR_VALUE_CACHE[value] = id;
    }
    const matches = [
        ...value.matchAll(MULTI_VALUE_RE)
    ];
    if (matches.length === 0) {
        return ATTR_VALUE_CACHE[value] = undefined;
    }
    return ATTR_VALUE_CACHE[value] = matches.map((match)=>match[1]);
}
function createValue(value, slots) {
    const keyOrKeys = getOrCreateValueCache(value);
    if (keyOrKeys === undefined) {
        return value;
    }
    if (typeof keyOrKeys === "string") {
        return slots[keyOrKeys];
    }
    if (keyOrKeys.some((key)=>typeof slots[key] === "function")) {
        return ()=>sub(value, MULTI_VALUE_RE, (_, key)=>toValue(slots[key]));
    }
    return sub(value, MULTI_VALUE_RE, (_, key)=>slots[key]);
}
function createTemplateString(strings) {
    let templateString = "", arg = 0;
    while(arg < strings.length - 1){
        templateString = templateString + strings[arg] + `#{${arg++}}`;
    }
    templateString = templateString + strings[arg];
    templateString = sub(templateString, START_WS_RE, "");
    templateString = sub(templateString, SC_TAG_RE, (match, tag, attr)=>{
        return SC_TAGS[tag] ? match : `<${tag}${attr}></${tag}>`;
    });
    templateString = sub(templateString, CLOSING_COMP_RE, COMP_REPLACEMENTS[1]);
    templateString = sub(templateString, TAG_RE, (match)=>{
        const isComp = COMP_RE.test(match);
        let id = 0;
        match = sub(match, ATTR_RE, (match, name, val1, val2, val3)=>{
            if (isComp === false) {
                if (!ARG_RE.test(match) && !DIR_RE.test(match)) {
                    return match;
                }
            }
            const quote = match.match(QUOTE_RE)?.[0] || `"`;
            const value = sub(val1 ?? val2 ?? val3 ?? "", ARG_RE, "@{$1}");
            return ` data-__${id++}=${quote}${name} ${value}${quote}`;
        });
        if (isComp) {
            match = sub(match, COMP_RE, COMP_REPLACEMENTS[0]);
        } else if (id !== 0) {
            match = sub(match, TAG_RE, ATTR_REPLACEMENT);
        }
        return match;
    });
    templateString = sub(templateString, ARG_RE, SLOT_REPLACEMENT);
    templateString = sub(templateString, CONTENT_RE, "$1$2");
    return templateString;
}
function createOrGetFragment(templateStrings) {
    let template = FRAGMENT_CACHE.get(templateStrings);
    if (template === undefined) {
        const element = document.createElement("template");
        element.innerHTML = createTemplateString(templateStrings);
        FRAGMENT_CACHE.set(templateStrings, template = element.content);
    }
    return template.cloneNode(true);
}
function renderChild(elt, value) {
    if (value == null || typeof value === "boolean") {
        elt.remove();
    } else if (value instanceof Node) {
        elt.replaceWith(value);
    } else if (typeof value === "function") {
        renderDynamicChild(elt, value);
    } else if (Array.isArray(value)) {
        if (value.length === 0) {
            elt.remove();
        } else if (value.length === 1) {
            renderChild(elt, value[0]);
        } else if (value.some((item)=>typeof item === "function")) {
            renderDynamicChild(elt, value);
        } else {
            elt.replaceWith(...createNodeArray([], ...value));
        }
    } else {
        elt.replaceWith(value + "");
    }
}
function renderDynamicChild(elt, childElement) {
    const anchor = new Text();
    elt.replaceWith(anchor);
    createEffect((currentNodes)=>{
        const nextNodes = createNodeArray([], toValue(childElement));
        reconcileNodes(anchor, currentNodes, nextNodes);
        return nextNodes;
    }, null);
}
function renderAttr(elt, prop, data) {
    if (prop.startsWith(DIR_PREFIX)) {
        const key = prop.slice(DIR_PREFIX_LENGTH).match(DIR_KEY_RE)[0];
        const directive = inject(APP_INJECTION_KEY).directives[key];
        if (directive) {
            const binding = createBinding(prop, data);
            createEffect(()=>directive(elt, binding));
        }
    } else if (typeof data === "function") {
        createEffect((currentValue)=>{
            const nextValue = data();
            if (nextValue !== currentValue) {
                setProperty(elt, prop, nextValue);
            }
            return nextValue;
        });
    } else {
        setProperty(elt, prop, data);
    }
}
function createBinding(prop, rawValue) {
    const arg = prop.match(BINDING_ARG_RE)?.[1] || null;
    const modifiers = prop.match(BINDING_MOD_RE)?.reduce((modifiers, key)=>{
        modifiers[key.slice(1)] = true;
        return modifiers;
    }, {}) || null;
    return {
        get value () {
            return toValue(rawValue);
        },
        rawValue,
        arg,
        modifiers
    };
}
function createNodeArray(nodeArray, ...elements) {
    for (const elt of elements){
        if (elt == null || typeof elt === "boolean") {
            continue;
        }
        if (elt instanceof DocumentFragment) {
            nodeArray.push(...elt.childNodes);
        } else if (elt instanceof Node) {
            nodeArray.push(elt);
        } else if (typeof elt === "string" || typeof elt === "number") {
            nodeArray.push(new Text(elt + ""));
        } else if (typeof elt === "function") {
            createNodeArray(nodeArray, toValue(elt));
        } else if (Symbol.iterator in elt) {
            createNodeArray(nodeArray, ...elt);
        }
    }
    return nodeArray;
}
function reconcileNodes(anchor, currentNodes, nextNodes) {
    const parentNode = anchor.parentNode;
    if (currentNodes === null) {
        for (const nextNode of nextNodes){
            parentNode?.insertBefore(nextNode, anchor);
        }
        return;
    }
    let i = 0, j = 0, c = currentNodes.length, n = nextNodes.length;
    next: for(; i < n; i++){
        const currentNode = currentNodes[i];
        for(; j < c; j++){
            if (currentNodes[j] === null) {
                continue;
            }
            if (sameCharacterDataType(currentNodes[j], nextNodes[i])) {
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
        parentNode?.insertBefore(nextNodes[i], currentNode?.nextSibling || anchor);
    }
    while(currentNodes.length){
        currentNodes.pop()?.remove();
    }
}
function toCamelCase(data) {
    return sub(data, KEBAB_NAME_RE, (match)=>match.slice(1).toUpperCase());
}
function toKebabCase(data) {
    return sub(data, CAMEL_NAME_RE, "-$1").toLowerCase();
}
function setProperty(elt, prop, value) {
    if (prop in elt) {
        elt[prop] = value;
        return;
    }
    const name = toKebabCase(prop);
    if (value != null) {
        elt.setAttribute(name, value + "");
    } else {
        elt.removeAttribute(name);
    }
}
function sameCharacterDataType(node, otherNode) {
    const type = node.nodeType;
    return (type === 3 || type === 8) && otherNode.nodeType === type;
}
function delegatedEventListener(event) {
    const type = event.type;
    let elt = event.target;
    while(elt !== null){
        elt?.[ON_DEL_DIR_SYM]?.[type]?.forEach?.((fn)=>fn.call(elt, event));
        elt = elt.parentNode;
    }
}
function refDirective(elt, binding) {
    binding.rawValue?.(elt);
}
function styleDirective(elt, binding) {
    elt.style[binding.arg] = binding.value || null;
}
function bindDirective(elt, binding) {
    let prop = binding.arg;
    if (binding.modifiers?.camel) {
        prop = toCamelCase(prop);
    } else if (binding.modifiers?.attr) {
        prop = toKebabCase(prop);
    }
    if (binding.modifiers?.prop === true || prop in elt) {
        elt[prop] = binding.value;
    } else {
        elt.setAttribute(prop, binding.value + "");
    }
}
function htmlDirective(elt, binding) {
    elt.innerHTML = binding.value;
}
function textDirective(elt, binding) {
    elt.textContent = binding.value;
}
function showDirective(elt, binding) {
    elt.style.display = binding.value ? "" : "none";
}
function ifDirective(elt, binding) {
    elt[IF_DIR_SYM] = elt[IF_DIR_SYM] ?? new Text();
    const value = binding.value, target = value ? elt[IF_DIR_SYM] : elt;
    target.replaceWith(value ? elt : elt[IF_DIR_SYM]);
}
function onDirective(elt, binding) {
    const name = binding.arg;
    const modifiers = binding.modifiers;
    let id = name, listener = binding.rawValue, eventOptions;
    if (modifiers) {
        const { once , capture , passive  } = modifiers;
        eventOptions = {
            once,
            capture,
            passive
        };
        if (modifiers.prevent) {
            id = id + "_prevent";
            const listenerCopy = listener;
            listener = function(event) {
                event.preventDefault();
                listenerCopy.call(elt, event);
            };
        }
        if (modifiers.stop) {
            id = id + "_stop";
            const listenerCopy = listener;
            listener = function(event) {
                event.stopPropagation();
                listenerCopy.call(elt, event);
            };
        }
        if (once) {
            id = id + "_once";
        }
        if (capture) {
            id = id + "_capture";
        }
        if (passive) {
            id = id + "_passive";
        }
    }
    if (modifiers?.delegate) {
        elt[ON_DEL_DIR_SYM] = elt[ON_DEL_DIR_SYM] || {};
        elt[ON_DEL_DIR_SYM][name] = elt[ON_DEL_DIR_SYM][name] || [];
        elt[ON_DEL_DIR_SYM][name].push(listener);
        if (DELEGATED_EVENTS[id] === undefined) {
            addEventListener(name, delegatedEventListener, eventOptions);
            DELEGATED_EVENTS[id] = true;
        }
    } else {
        elt.addEventListener(name, listener, eventOptions);
    }
}
function sub(data, match, replacer) {
    return data.replace(match, replacer);
}
const PARAMS_INJECTION_KEY = Symbol();
const path = createSignal("");
const routeTypeHandlerMap = {
    hash () {
        const hash = ()=>location.hash.slice(1) || "/";
        const listener = ()=>path(hash());
        onMount(()=>{
            path(hash());
            addEventListener("hashchange", listener);
        });
        onCleanup(()=>removeEventListener("hashchange", listener));
    },
    pathname () {
        const url = new URL(location.toString());
        const clickListener = (event)=>{
            let elt = event.target, pathname;
            while(elt != null){
                pathname = elt.getAttribute?.("href");
                if (pathname?.startsWith("/")) {
                    event.preventDefault();
                    if (pathname !== url.pathname) {
                        path(pathname);
                        url.pathname = pathname;
                        return history.pushState(null, "", url);
                    }
                }
                elt = elt?.parentNode;
            }
        };
        const popStateListener = (event)=>{
            event.preventDefault();
            path(location.pathname);
        };
        onMount(()=>{
            path(location.pathname);
            addEventListener("click", clickListener);
            addEventListener("popstate", popStateListener);
        });
        onCleanup(()=>{
            removeEventListener("click", clickListener);
            removeEventListener("popstate", popStateListener);
        });
    }
};
function getParams() {
    return inject(PARAMS_INJECTION_KEY);
}
function createMatcher(path) {
    return RegExp("^" + path.replace(/:([^/:]+)/g, (_, name)=>`(?<${name}>[^/]+)`) + "$");
}
function createRoutes(routeMap) {
    return Object.keys(routeMap).map((path)=>({
            path,
            regexp: createMatcher(path),
            handler: routeMap[path]
        }));
}
function createRouter(routeMap, options) {
    const routeArray = createRoutes(routeMap);
    return createComputed(()=>{
        const nextPath = path();
        return createRoot(()=>{
            for (const route of routeArray){
                if (route.regexp.test(nextPath)) {
                    provide(PARAMS_INJECTION_KEY, route.regexp.exec(nextPath)?.groups);
                    return route.handler();
                }
            }
            return options?.fallback?.();
        });
    });
}
function Router(props) {
    const router = createRouter(props.routeMap, {
        fallback: props.fallback
    });
    routeTypeHandlerMap[props.type]();
    return [
        props.children,
        router
    ];
}
function install() {
    createComponent("Router", Router);
}
const __default = ()=>{
    return template`
    <article>
      <h4>
        welcome home!
        <sub>(sucker)</sub>
      </h4>
      <div>
        <p>just look at my examples like <a href="/counter">counter</a>.</p>
        <p>
          i tend to create examples like <a href="/sierpinski">sierpinski</a> 
          because i want to test out the performance of my libraries ^^"
        </p>
        <p>also try out some parameter values for that one!</p>
        <p>> /sierpinski/:target/:size <</p>
        <p><a href="/sierpinski/2000/50">sierpinski/2000/50</a></p>
        <p><a href="/sierpinski/250">sierpinski/250</a></p>
        <p>btw. this whole page is just an example, lol.</p>
      </div>
    </article>
  `;
};
const code = `
import { createSignal } from "jail/signal"
import { template } from "jail/dom"

function Counter() {
  const counter = createSignal(0)
  const up = () => counter(value => ++value)
  const down = () => counter(value => --value)

  return template\`
    <button d-on:click.delegate=\${down}>-</button>
    <span>current value: \${counter}</span>
    <button d-on:click.delegate=\${up}>+</button>
  \`
}`.trim();
const __default1 = ()=>{
    const counter = createSignal(0);
    const show = createSignal(false);
    const up = ()=>counter((value)=>++value);
    const down = ()=>counter((value)=>--value);
    const clicked = createComputed((currentValue)=>{
        counter();
        return currentValue + 1;
    }, -1);
    return template`
    <article data-user="user has clicked ${clicked} times (counter equals ${counter})">
      <h4>
        counter example
        <sub>(...what else?)</sub>
        <button d-on:click.delegate=${()=>show((value)=>!value)}>
          ${()=>show() ? "hide" : "show"} code
        </button>
      </h4>
      <button d-on:click.delegate=${down}>-</button>
      <span>current value: ${counter}</span>
      <button d-on:click.delegate=${up}>+</button>
      <div>> you have clicked ${clicked} times.</div>
      ${()=>clicked() >= 10 && template`<div>> why do you do this?????</div>`}
      ${()=>clicked() >= 20 && template`<div>> pls stop T_T</div>`}
      ${()=>clicked() >= 30 && template`<div>> enough :(</div>`}
      ${()=>clicked() >= 40 && template`<div>> it hurts @_@</div>`}
      <code d-show="${show}">
        ${code.split("\n").map((line)=>template`<pre>${line}</pre>`)}
      </code>
    </article>
  `;
};
function Counter() {
    const counter = createSignal(0);
    const up = ()=>counter((value)=>++value);
    const down = ()=>counter((value)=>--value);
    return template`
    <button d-on:click.delegate=${down}>-</button>
    <span>current value: ${counter}</span>
    <button d-on:click.delegate=${up}>+</button>
  `;
}
const Dot = (x, y, target)=>{
    const counter = inject("counter");
    const hover = createSignal(false);
    const text = ()=>hover() ? "*" + counter() + "*" : counter();
    const bgColor = ()=>hover() ? "lightpink" : "white";
    const css = `
    width: ${target}px;
    height: ${target}px;
    line-height: ${target}px;
    left: ${x}px;
    top: ${y}px;
    font-size: ${target / 2.5}px;
    border-radius: ${target}px;
    position: absolute;
    text-align: center;
    cursor: pointer;
    user-select: none;
  `;
    return template`
    <div
      d-text=${text} style=${css} d-style:background-color=${bgColor}
      d-on:mouseover.delegate=${()=>hover(true)}
      d-on:mouseout.delegate=${()=>hover(false)}
    />
  `;
};
const Triangle = (x, y, target, size)=>{
    if (target <= size) {
        return Dot(x, y, target);
    }
    target = target / 2;
    return [
        Triangle(x, y - target / 2, target, size),
        Triangle(x - target, y + target / 2, target, size),
        Triangle(x + target, y + target / 2, target, size)
    ];
};
const __default2 = ()=>{
    const { target ="750" , size ="25"  } = getParams() || {};
    let id;
    const elapsed = createSignal(0);
    const count = createSignal(0);
    const scale = createComputed(()=>{
        const e = elapsed() / 1000 % 10;
        return (1 + (e > 5 ? 10 - e : e) / 10) / 2;
    }, 0);
    provide("counter", count);
    onMount(()=>{
        id = setInterval(()=>count(count() % 10 + 1), 1000);
        const start = Date.now();
        const frame = ()=>{
            elapsed(Date.now() - start);
            requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
    });
    onUnmount(()=>clearInterval(id));
    createDirective("text", (elt, binding)=>{
        const value = binding.value + "";
        if (elt.firstChild?.nodeType === 3) {
            const textNode = elt.firstChild;
            textNode.data = value;
        } else {
            elt.prepend(value);
        }
    });
    return template`
    <div style="position: absolute; left: 50%; top: 50%;" d-style:transform="scale(${scale}) translateZ(0.1px)">
      ${Triangle(0, 0, +target, +size)}
    </div>
  `;
};
const __default3 = ()=>{
    return template`
    <article>
      <h4>
        about
        <sub>(signal? me? idk...)</sub>
      </h4>
      <h5>special thx to:</h5>
      <div>
        <div>inspiration:</div>
        <div>
          <a href="https://github.com/terkelg/facon" target="_blank">facon</a> 
          by <a href="https://github.com/terkelg" target="_blank">Terkel</a>
        </div>
        <div>
          <a href="https://github.com/solidjs/solid" target="_blank">solid</a> 
          by <a href="https://github.com/ryansolid" target="_blank">Ryan Carniato</a>
        </div>
        <div>
          <a href="https://github.com/vuejs" target="_blank">vue</a> 
          by <a href="https://github.com/yyx990803" target="_blank">Evan You</a>
        </div>
        <div>assets:</div>
        <div>
          <a href="https://github.com/TakWolf/ark-pixel-font" target="_blank">ark-pixel-font</a> 
          by <a href="https://github.com/TakWolf" target="_blank">狼人小林 / TakWolf</a>
        </div>
      </div>
    </article>
  `;
};
const list = createSignal([
    {
        id: 0,
        done: true,
        text: "eat cornflakes without soymilk"
    },
    {
        id: 1,
        done: false,
        text: "buy soymilk"
    }
]);
const Item = (props)=>{
    const deleteItem = ()=>list(list().filter((item)=>item.id !== props.id));
    const toggleItem = ()=>list((items)=>(props.done = !props.done, items));
    return template`
    <div class="todo-item" id=item_${props.id}>
      <div 
        class="todo-item-text" d-on:click.delegate=${toggleItem}
        style=${props.done ? "color: grey; font-style: italic;" : null}
      >
        ${props.text}
      </div>
      <div d-show=${props.done} class="todo-item-delete" d-on:click=${deleteItem}>
        delete
      </div>
    </div>
  `;
};
const __default4 = ()=>{
    const textValue = createSignal("");
    const addItem = (ev)=>{
        if (ev.key !== "Enter") {
            return;
        }
        list(list().concat({
            id: Date.now(),
            done: false,
            text: textValue()
        }));
        textValue("");
    };
    const onInput = (ev)=>textValue(ev.target.value);
    const length = ()=>list().length;
    const done = ()=>list().filter((item)=>item.done).length;
    const ToDoItems = ()=>list().map((item)=>Item(item));
    return template`
    <article class="todo-app">
      <h4>
        todo
        <sub>(no-one ever have done that, i promise!)</sub>
      </h4>
      <div class="todo-app-container">
        <input 
          type="text" placeholder="...milk?"
          required class="todo_input" value=${textValue}
          d-on:keyup=${addItem} d-on:input=${onInput}
        />
        <div class="todo-items">${ToDoItems}</div>
        <label>progress: ${done}/${length}</label>
        <progress max=${length} value=${done}></progress>
      </div>
    </article>
  `;
};
const __default5 = ()=>{
    const text = createSignal(`<div data-cool="user is \${state} cool!">\n  you are \${state} cool!\n</div>`);
    const inputLength = ()=>text().length;
    const time = createSignal(0);
    const timeMs = ()=>`millisecond${time() === 1 ? "" : "s"}`;
    const compiled = ()=>{
        const start = performance.now();
        const data = text().replace(/\$\{[^${}]+\}/gm, "${}").split("${}");
        const result = createTemplateString(data);
        const end = performance.now();
        untrack(()=>time(end - start));
        return result;
    };
    const outputLength = ()=>compiled().length;
    const onInput = (ev)=>text(ev.currentTarget.value);
    return template`
    <article style="display: flex; gap: 8px; flex-direction: column;">
      <h4>
        compiler
        <sub>(4 real????)</sub>
      </h4>
      <div style="display: flex; gap: 16px; flex-direction: column;">
        <label style="flex: 1;">input: (${inputLength} characters)</label>
        <textarea value=${text()} d-on:input=${onInput} />
        <label style="flex: 1;">output: (compiled in ${time} ${timeMs}, ${outputLength} characters)</label> 
        <pre style="min-height: 60px; background-color: white; box-shadow: 4px 4px 0px rgba(0, 0, 0, 0.1);">
          ${compiled}
        </pre>
      </div>
    </article>
  `;
};
const __default6 = ()=>{
    const { backgroundColor  } = document.body.style;
    onMount(()=>document.body.style.backgroundColor = "indianred");
    onUnmount(()=>document.body.style.backgroundColor = backgroundColor);
    return template`
    <article>
      <h4>
        Page not found :(
        <sub>(ha-ha!)</sub>
      </h4>
      <p>There is no content for "${location}".</p>
    </article>
  `;
};
const App = ()=>{
    createEffect(()=>{
        document.title = `jail${path()}`;
    });
    const routeMap = {
        "/": __default,
        "/counter": __default1,
        "/counter/simple": Counter,
        "/sierpinski": __default2,
        "/sierpinski/:target": __default2,
        "/sierpinski/:target/:size": __default2,
        "/about": __default3,
        "/todo": __default4,
        "/compiler": __default5
    };
    const animation = ()=>({
            frames: [
                {
                    opacity: 0,
                    transform: "translateY(-10px)"
                },
                {
                    opacity: 1,
                    transform: "unset"
                }
            ],
            options: {
                duration: 250,
                delay: 50,
                fill: "both"
            }
        });
    return template`
    <header>
      <h3>jail${path}</h3>
      <nav>
        <a href="/">home</a>
        <a href="/counter">counter</a>
        <a href="/sierpinski">sierpinski</a>
        <a href="/todo">todo</a>
        <a href="/about">about</a>
        <a href="/compiler">compiler</a>
      </nav>
    </header>
    <main d-animate=${on(path, animation)}>
      <Router type="pathname" fallback=${__default6} routeMap=${routeMap} />
    </main>
  `;
};
mount(document.body, ()=>{
    install();
    createDirective("animate", (elt, binding)=>{
        const { frames , options  } = binding.value;
        elt.animate(frames, options);
    });
    return App();
});
