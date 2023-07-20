const Error = Symbol("Error");
const NodeQueue = new Set();
let isRunning = false;
let activeNode = null;
function createRoot(callback) {
    const previousNode = activeNode, localNode = createNode();
    try {
        activeNode = localNode;
        return batch(()=>callback(callback.length === 0 ? undefined : clean.bind(localNode, true)));
    } catch (error) {
        handleError(error);
    } finally{
        activeNode = previousNode;
    }
}
function createNode(initialValue, onupdate) {
    const localNode = {
        value: initialValue,
        parentNode: activeNode,
        childNodes: null,
        injections: null,
        cleanups: null,
        onupdate: onupdate || null,
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
        const localNode = createNode(initialValue, callback);
        if (isRunning) {
            NodeQueue.add(localNode);
        } else {
            queueMicrotask(()=>update(localNode, false));
        }
    } else {
        queueMicrotask(()=>callback(initialValue));
    }
}
function createComputed(callback, initialValue) {
    const source = createSource(initialValue);
    createEffect(()=>setValue.call(source, callback(source.value)));
    return getValue.bind(source);
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
function getValue() {
    if (activeNode !== null && activeNode.onupdate != null) {
        const sourceSlot = this.nodes?.length || 0, nodeSlot = activeNode.sources?.length || 0;
        if (activeNode.sources === null) {
            activeNode.sources = [
                this
            ];
            activeNode.sourceSlots = [
                sourceSlot
            ];
        } else {
            activeNode.sources.push(this);
            activeNode.sourceSlots.push(sourceSlot);
        }
        if (this.nodes === null) {
            this.nodes = [
                activeNode
            ];
            this.nodeSlots = [
                nodeSlot
            ];
        } else {
            this.nodes.push(activeNode);
            this.nodeSlots.push(nodeSlot);
        }
    }
    return this.value;
}
function setValue(value) {
    if (typeof value === "function") {
        value = value(this.value);
    }
    this.value = value;
    queueNodes(this);
}
function isReactive(data) {
    return typeof data === "function";
}
function toValue(data) {
    return typeof data === "function" ? data() : data;
}
function queueNodes(source) {
    if (source.nodes?.length) {
        batch(()=>{
            for (const node of source.nodes){
                NodeQueue.add(node);
            }
        });
    }
}
function sourceValue(value) {
    return arguments.length === 1 ? setValue.call(this, value) : getValue.call(this);
}
function createSignal(initialValue) {
    return sourceValue.bind(createSource(initialValue));
}
function handleError(error) {
    const errorCallbacks = inject(Error);
    if (!errorCallbacks) {
        return reportError(error);
    }
    for (const callback of errorCallbacks){
        callback(error);
    }
}
function onCleanup(cleanup) {
    if (activeNode === null) {
        return;
    }
    if (activeNode.cleanups === null) {
        activeNode.cleanups = [
            cleanup
        ];
    } else {
        activeNode.cleanups.push(cleanup);
    }
}
function untrack(callback) {
    const localNode = activeNode;
    activeNode = null;
    const result = callback();
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
        update(node, false);
    }
    isRunning = false;
}
function update(node, complete) {
    clean.call(node, complete);
    if (node.onupdate == null) {
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
function cleanSources(node) {
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
function cleanChildNodes(node, complete) {
    const hasUpdateHandler = node.onupdate != null;
    while(node.childNodes.length){
        const childNode = node.childNodes.pop();
        clean.call(childNode, complete || hasUpdateHandler && childNode.onupdate != null);
    }
}
function clean(complete) {
    if (this.sources?.length) {
        cleanSources(this);
    }
    if (this.childNodes?.length) {
        cleanChildNodes(this, complete);
    }
    if (this.cleanups?.length) {
        cleanup(this);
    }
    this.injections = null;
    if (complete) {
        dispose(this);
    }
}
function cleanup(node) {
    while(node.cleanups.length){
        node.cleanups.pop()();
    }
}
function dispose(node) {
    node.value = null;
    node.parentNode = null;
    node.childNodes = null;
    node.cleanups = null;
    node.onupdate = null;
    node.sources = null;
    node.sourceSlots = null;
}
function inject(key, defaultValue) {
    return lookup(activeNode, key) || defaultValue;
}
function provide(key, value) {
    if (activeNode === null) {
        return;
    }
    if (activeNode.injections === null) {
        activeNode.injections = {
            [key]: value
        };
    } else {
        activeNode.injections[key] = value;
    }
}
const ATTRIBUTE = "a", INSERTION = "i", COMPONENT = "c";
const TYPE = "__t", VALUE = "__v";
const Query = `[${TYPE}]`;
const DirPrefix = "d-", DirPrefixLength = DirPrefix.length;
const DirRegExp = RegExp(`${DirPrefix.replace("-", "\\-")}[^"'<>=\\s]`);
const DirKeyRegExp = /[a-z\-\_]+/;
const ArgRegExp = /#{([^}]+)}/g, SValRegExp = /^@{([^}]+)}$/, MValRegExp = /@{([^}]+)}/g;
const BindingModRegExp = /\.(?:[^"'.])+/g, BindingArgRegExp = /:([^"'<>.]+)/;
const WSAndTabsRegExp = /^[\s\t]+/gm;
const QuoteRegExp = /["']/, DataRegExp = /data\-__\d+/;
const ComRegExp = /^<((?:[A-Z][a-z]+)+)/, ClosingComRegExp = /<\/((?:[A-Z][a-z]+)+)>/g;
const TagRegExp = /<([a-zA-Z\-]+(?:"[^"]*"|'[^']*'|[^'">])*)>/g;
const AtrRegExp = /\s(?:([^"'<>=\s]+)=(?:"([^"]*)"|'([^']*)'))|(?:\s([^"'<>=\s]+))/g;
const AttributeDataReplacement = `<$1 ${TYPE}="${ATTRIBUTE}">`;
const InsertionReplacement = `<slot ${TYPE}="${INSERTION}" ${VALUE}="$1"></slot>`;
const ComponentReplacement = [
    `<template ${TYPE}="${COMPONENT}" ${VALUE}="$1"`,
    "</template>"
];
const TemplateCache = new Map();
const ValueCacheMap = new Map();
const App = Symbol("App");
const Events = Symbol("Events");
const If = Symbol("If");
const RegisteredEvents = {};
function toCamelCase(data) {
    return data.replace(/-[a-z]/g, (match)=>match.slice(1).toUpperCase());
}
function toKebabCase(data) {
    return data.replace(/([A-Z])/g, "-$1").toLowerCase();
}
function eventLoop(event) {
    const type = event.type;
    let elt = event.target;
    while(elt !== null){
        elt?.[Events]?.[type]?.call(elt, event);
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
    }
    if (binding.modifiers?.attr) {
        prop = toKebabCase(prop);
    }
    if (binding.modifiers?.prop === true || prop in elt && binding.modifiers?.attr === false) {
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
    elt[If] = elt[If] || new Text();
    const value = binding.value, target = value ? elt[If] : elt;
    target.replaceWith(value ? elt : elt[If]);
}
function onDirective(elt, binding) {
    const name = binding.arg;
    const modifiers = binding.modifiers;
    let id = name, listener = binding.rawValue, eventOptions;
    if (modifiers) {
        if (modifiers.prevent) {
            id = id + "-prevent";
            const listenerCopy = listener;
            listener = function(event) {
                event.preventDefault();
                listenerCopy.call(elt, event);
            };
        }
        if (modifiers.stop) {
            id = id + "-stop";
            const listenerCopy = listener;
            listener = function(event) {
                event.stopPropagation();
                listenerCopy.call(elt, event);
            };
        }
        if (modifiers.once) {
            id = id + "-once";
            eventOptions = eventOptions || {};
            eventOptions.once = true;
        }
        if (modifiers.capture) {
            id = id + "-capture";
            eventOptions = eventOptions || {};
            eventOptions.capture = true;
        }
        if (modifiers.passive) {
            id = id + "-passive";
            eventOptions = eventOptions || {};
            eventOptions.passive = true;
        }
    }
    if (modifiers?.delegate) {
        elt[Events] = elt[Events] || {};
        if (elt[Events][name]) {
            const listenerCopy = elt[Events][name];
            elt[Events][name] = function(event) {
                listenerCopy.call(elt, event);
                listener.call(elt, event);
            };
        } else {
            elt[Events][name] = listener;
        }
        if (RegisteredEvents[id] === undefined) {
            addEventListener(name, eventLoop, eventOptions);
            RegisteredEvents[id] = true;
        }
    } else {
        elt.addEventListener(name, listener, eventOptions);
    }
}
function extendApp(key, name, item) {
    const items = inject(App)[key], copy = items[name];
    items[name] = item;
    if (copy) {
        onUnmount(()=>items[name] = copy);
    }
}
function createDirective(name, directive) {
    extendApp("directives", name, directive);
}
function createComponent(name, component) {
    extendApp("components", name, component);
}
function mount(rootElement, rootComponent) {
    return createRoot((cleanup)=>{
        const defaultDirectives = {
            on: onDirective,
            ref: refDirective,
            show: showDirective,
            html: htmlDirective,
            text: textDirective,
            style: styleDirective,
            bind: bindDirective,
            if: ifDirective
        };
        provide(App, {
            directives: defaultDirectives,
            components: {}
        });
        let anchor = rootElement.appendChild(new Text());
        let currentNodes = null;
        createEffect(()=>{
            const nextNodes = createNodeArray([], rootComponent());
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
function template(strings, ...args) {
    const template1 = TemplateCache.get(strings) || createTemplate(strings);
    return render(template1.cloneNode(true), args);
}
const renderMap = {
    a (elt, args) {
        const props = createProps(elt, args);
        for(const key in props){
            renderAttribute(elt, key, props[key]);
        }
    },
    i (elt, args) {
        const slot = elt.getAttribute(VALUE);
        renderChild(elt, getValue1(slot, args));
    },
    c (elt, args) {
        const name = elt.getAttribute(VALUE);
        const component = inject(App).components[name];
        if (component === undefined) {
            elt.remove();
            return;
        }
        createRoot(()=>{
            const props = createProps(elt, args);
            if (elt.content.hasChildNodes()) {
                props.children = render(elt.content, args);
            }
            renderChild(elt, component(props));
        });
    }
};
function attribute(elt, name) {
    const value = elt.getAttribute(name);
    elt.removeAttribute(name);
    return value;
}
function render(fragment, args) {
    for (const elt of fragment.querySelectorAll(Query)){
        renderMap[attribute(elt, TYPE)](elt, args);
    }
    const nodeList = fragment.childNodes;
    if (nodeList.length === 0) {
        return;
    }
    if (nodeList.length === 1) {
        return nodeList[0];
    }
    return Array.from(nodeList);
}
function createProps(elt, args) {
    const props = {};
    for(const key in elt.dataset){
        if (key.startsWith("__")) {
            const data = attribute(elt, `data-${key}`), prop = data.split(" ", 1)[0];
            props[prop] = createValue(data.slice(prop.length + 1), args);
        }
    }
    return props;
}
function getValueCache(value) {
    if (ValueCacheMap.has(value)) {
        return ValueCacheMap.get(value);
    }
    const id = value.match(SValRegExp)?.[1];
    if (id) {
        ValueCacheMap.set(value, id);
        return id;
    }
    const matches = [
        ...value.matchAll(MValRegExp)
    ];
    if (matches.length === 0) {
        ValueCacheMap.set(value, null);
        return null;
    }
    const ids = matches.map((match)=>match[1]);
    ValueCacheMap.set(value, ids);
    return ids;
}
function createValue(value, args) {
    const cached = getValueCache(value);
    if (cached === null) {
        return value;
    }
    if (typeof cached === "string") {
        return getValue1(cached, args);
    }
    if (cached.some((id)=>isReactive(getValue1(id, args)))) {
        return String.prototype.replace.bind(value, MValRegExp, (_, id)=>toValue(getValue1(id, args)));
    }
    return String.prototype.replace.call(value, MValRegExp, (_, id)=>getValue1(id, args));
}
function getValue1(id, args) {
    return id in args ? args[id] : getInjectedValue(id);
}
function getInjectedValue(id) {
    const value = inject(id);
    if (value) {
        return value;
    }
    const [mainId, ...keys] = id.split(".");
    const initialValue = inject(mainId);
    if (initialValue == null || keys.length === 0) {
        return;
    }
    return keys.reduce((value, key)=>value[key], initialValue);
}
function createTemplateString(strings) {
    let data = "", arg = 0;
    while(arg < strings.length - 1){
        data = data + strings[arg] + `#{${arg++}}`;
    }
    data = data + strings[arg];
    data = data.replace(WSAndTabsRegExp, "");
    data = data.replace(ClosingComRegExp, ComponentReplacement[1]);
    data = data.replace(TagRegExp, (match)=>{
        const isComponent = ComRegExp.test(match);
        let id = 0;
        match = match.replace(AtrRegExp, (data, name, val, val2, name2)=>{
            if (isComponent === false) {
                if (!ArgRegExp.test(data) && !DirRegExp.test(data)) {
                    return data;
                }
            }
            const quote = data.match(QuoteRegExp)[0];
            val = (val || val2).replace(ArgRegExp, "@{$1}");
            return ` data-__${id++}=${quote}${name || name2} ${val}${quote}`;
        });
        if (isComponent) {
            match = match.replace(ComRegExp, ComponentReplacement[0]);
        } else if (DataRegExp.test(match)) {
            match = match.replace(TagRegExp, AttributeDataReplacement);
        }
        return match.replace(ArgRegExp, "");
    });
    data = data.replace(ArgRegExp, InsertionReplacement);
    return data;
}
function createTemplate(strings) {
    const template = document.createElement("template");
    template.innerHTML = createTemplateString(strings);
    TemplateCache.set(strings, template.content);
    return template.content;
}
function renderChild(elt, value) {
    if (value == null || typeof value === "boolean") {
        elt.remove();
    } else if (value instanceof Node) {
        elt.replaceWith(value);
    } else if (isReactive(value)) {
        renderDynamicChild(elt, value);
    } else if (Array.isArray(value)) {
        if (value.length === 0) {
            elt.remove();
        } else if (value.length === 1) {
            renderChild(elt, value[0]);
        } else if (value.some((item)=>isReactive(item))) {
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
function renderAttribute(elt, prop, data) {
    if (prop.startsWith(DirPrefix)) {
        const key = prop.slice(DirPrefixLength).match(DirKeyRegExp)[0];
        const directive = inject(App).directives[key];
        if (directive) {
            const binding = createBinding(prop, data);
            createEffect(()=>directive(elt, binding));
        }
    } else if (isReactive(data)) {
        createEffect((currentValue)=>{
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
function createBinding(prop, rawValue) {
    const arg = prop.match(BindingArgRegExp)?.[1] || null;
    const modifiers = prop.match(BindingModRegExp)?.reduce((modifiers, key)=>{
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
function createNodeArray(nodeArray, ...elements) {
    for (const elt of elements){
        if (elt == null || typeof elt === "boolean") {
            continue;
        }
        if (elt instanceof DocumentFragment) {
            nodeArray.push(...Array.from(elt.childNodes));
        } else if (elt instanceof Node) {
            nodeArray.push(elt);
        } else if (typeof elt === "string" || typeof elt === "number") {
            const previousNode = nodeArray.at(-1);
            if (previousNode instanceof Text) {
                previousNode.data = previousNode.data + elt;
            } else {
                nodeArray.push(new Text(elt + ""));
            }
        } else if (isReactive(elt)) {
            createNodeArray(nodeArray, toValue(elt));
        } else if (Symbol.iterator in elt) {
            createNodeArray(nodeArray, ...elt);
        }
    }
    return nodeArray;
}
function reconcileNodes(anchor, currentNodes, nextNodes) {
    const parentNode = anchor.parentNode;
    if (currentNodes == null) {
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
function sameCharacterDataType(node, otherNode) {
    const type = node.nodeType;
    return (type === 3 || type === 8) && otherNode.nodeType === type;
}
const Params = Symbol("Params");
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
    return inject(Params);
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
                    provide(Params, route.regexp.exec(nextPath)?.groups);
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
    return props.children ? [
        props.children,
        router
    ] : router;
}
function installRouter() {
    createComponent("Router", Router);
}
const __default = ()=>{
    return template`
    <article>
      <h4>
        welcome home!
        <sub>(sucker)</sub>
      </h4>
      <pre>
        just look at my examples like <a href="/counter">counter</a>.
        have fun!
        i tend to create examples like <a href="/sierpinski">sierpinski</a>
        because i want to test out the performance of my libraries ^^"
        also try out some parameter values for that one!
        > /sierpinski/:target/:size <
        <a href="/sierpinski/2000/50">sierpinski/2000/50</a> 
        <a href="/sierpinski/250">sierpinski/250</a>
        btw. this whole page is just an example, lol.
      </pre>
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
    <button d-on:click.delegate="\${down}">-</button>
    <span>current value: \${counter}</span>
    <button d-on:click.delegate="\${up}">+</button>
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
        <button d-on:click.delegate="${()=>show((value)=>!value)}">
          ${()=>show() ? "hide" : "show"} code
        </button>
      </h4>
      <button d-on:click.delegate="${down}">-</button>
      <span>current value: ${counter}</span>
      <button d-on:click.delegate="${up}">+</button>
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
    <button d-on:click.delegate="${down}">-</button>
    <span>current value: ${counter}</span>
    <button d-on:click.delegate="${up}">+</button>
  `;
}
const Dot = (x, y, target)=>{
    const counter = inject("counter");
    const hover = createSignal(false);
    const onMouseOut = ()=>hover(false);
    const onMouseOver = ()=>hover(true);
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
      d-text="${text}" style="${css}" d-style:background-color="${bgColor}"
      d-on:mouseover.delegate="${onMouseOver}"
      d-on:mouseout.delegate="${onMouseOut}"
    ></div>
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
    });
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
        const value = String(binding.value);
        if (elt.firstChild?.nodeType === 3) {
            elt.firstChild.data = value;
        } else {
            elt.prepend(value);
        }
    });
    return template`
    <div style="position: absolute; left: 50%; top: 50%;" d-style:transform="scale(${scale}) translateZ(0.1px)">
      ${Triangle(0, 0, Number(target), Number(size))}
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
      <pre>
        inspiration:
        <a href="https://github.com/terkelg/facon" target="_blank">facon</a> by <a href="https://github.com/terkelg" target="_blank">Terkel</a>
        <a href="https://github.com/solidjs/solid" target="_blank">solid</a> by <a href="https://github.com/ryansolid" target="_blank">Ryan Carniato</a>
        <a href="https://github.com/vuejs" target="_blank">vue</a> by <a href="https://github.com/yyx990803" target="_blank">Evan You</a>
        assets:
        <a href="https://github.com/TakWolf/ark-pixel-font" target="_blank">ark-pixel-font</a> by <a href="https://github.com/TakWolf" target="_blank">狼人小林 / TakWolf</a>
      </pre>
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
    <div class="todo-item" id="item_${props.id}">
      <div 
        class="todo-item-text" d-on:click.delegate="${toggleItem}"
        style="${props.done ? "color: grey; font-style: italic;" : null}"
      >
        ${props.text}
      </div>
      <div d-show="${props.done}" class="todo-item-delete" d-on:click="${deleteItem}">
        delete
      </div>
    </div>
  `;
};
const __default4 = ()=>{
    const textValue = createSignal("");
    const addItem = (ev)=>{
        if (ev.key === "Enter") {
            list(list().concat({
                id: Date.now(),
                done: false,
                text: textValue()
            }));
            textValue("");
            return;
        }
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
          required class="todo_input" value="${textValue}"
          d-on:keyup="${addItem}" d-on:input="${onInput}"
        />
        <div class="todo-items">${ToDoItems}</div>
        <label>progress: ${done}/${length}</label>
        <progress max="${length}" value="${done}"></progress>
      </div>
    </article>

    <style>
      .todo-app-container {
        width: 500px;
        background-color: rgba(255, 255, 255, .5);
        padding: 10px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .todo-item {
        display: flex;
        gap: 20px;
        justify-content: space-between;
        cursor: pointer;
      }
      .todo-item-text {
        text-align: left;
        flex: 1;
      }
      .todo-items {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .todo-item-delete:hover {
        color: indianred;
      }
      .todo-app input, 
      .todo-app label,
      .todo-app progress {
        width: 100%;
        display: block;
        margin: 0 auto;
      }
    </style>
  `;
};
const __default5 = ()=>{
    const showExplanation = createSignal(false);
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
    const onClick = ()=>showExplanation(!showExplanation());
    const outputCSS = `
    min-height: 60px;
    background-color: white;
    box-shadow: 4px 4px 0px rgba(0, 0, 0, 0.1);
  `;
    const explainCSS = `
    background-color: papayawhip;
    padding: 10px;
    box-shadow: 4px 4px 0px rgba(0, 0, 0, .1);
  `;
    return template`
    <article style="display: flex; gap: 8px; flex-direction: column;">
      <h4>
        compiler
        <sub>(4 real????)</sub>
      </h4>
      <button d-on:click="${onClick}" d-style:margin="0 auto">show/hide explanation</button>
      <pre d-show="${showExplanation}" style="${explainCSS}">
        1.   join string literals with "${"#{\\d+}"}"
        2.   go inside tags with this regexp (in general): 
        .    <span d-style:color="red">${/<([a-zA-Z\-](?:"[^"]*"|'[^']*'|[^'">])*)>/g}</span>
        3.   look for valid attributes with this regexp:
        .    <span d-style:color="red">${/\s(?:([^"'<>=\s]+)=(?:"([^"]*)"|'([^']*)'))|(?:\s([^"'<>=\s]+))/g}</span>
        4.   replace dynamic values inside attributes with "${"#{\\d+}"}"
        5.   replace all other "${"#{\\d+}"}" with <span d-style:color="red">${`<slot __t="i" __v="\\d+"></slot>`}</span>
        6.   insert code into template element and extract its fragment
        7.   insert attributes, children and components inside fragment
        8.   ${"template`...`"} might return a single node, a node-array or undefined
      </pre>
      <pre style="display: flex; gap: 16px; flex-direction: column;">
        <label style="flex: 1;">input: (${inputLength} characters)</label>
        <textarea value="${text()}" d-on:input="${onInput}"></textarea>
        <label style="flex: 1;">output: (compiled in ${time} ${timeMs}, ${outputLength} characters)</label> 
        <pre style="${outputCSS}" d-text="${compiled}"></pre>
      </pre>
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
const App1 = ()=>{
    createEffect(()=>document.title = `jail${path()}`);
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
    <main d-animate="${on(path, animation)}">
      <Router type="pathname" fallback="${__default6}" routeMap="${routeMap}"></Router>
    </main>
  `;
};
mount(document.body, ()=>{
    installRouter();
    createDirective("animate", (elt, binding)=>{
        const { frames , options  } = binding.value;
        elt.animate(frames, options);
    });
    return App1();
});
