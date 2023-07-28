const ErrorInjectionKey = Symbol();
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
function isReactive(data) {
    return typeof data === "function";
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
    const errorCallbacks = lookup(activeNode, ErrorInjectionKey);
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
const AppInjectionKey = Symbol();
const DelegatedEvents = Symbol();
const IfDirectiveSymbol = Symbol();
const TYPE = "__type", VALUE = "__value";
const Query = `[${TYPE}]`;
const DirPrefix = "d-", DirPrefixLength = DirPrefix.length, DirRE = RegExp(`${sub(DirPrefix, "-", "\\-")}[^"'<>=\\s]`), DirKeyRE = /[a-z\-\_]+/;
const ArgRE = /#{(\d+)}/g, SingleValueRE = /^@{(\d+)}$/, MultiValueRE = /@{(\d+)}/g;
const PropValueRE = /^([^\s]+)\s(.*)$/;
const BindingModRE = /\.(?:[^"'.])+/g, BindingArgRE = /:([^"'<>.]+)/;
const StartingWSRE = /^[\s]+/gm, ContentRE = /^\r\n|\n|\r(>)\s+(<)$/gm, HasUCRE = /[A-Z]/, QuoteRE = /["']/;
const CompRE = /^<((?:[A-Z][a-z]+)+)/, ClosingCompRE = /<\/(?:[A-Z][a-z]+)+>/g, SelfClosingTagRE = /<([a-zA-Z-]+)(("[^"]*"|'[^']*'|[^'">])*)\s*\/>/g;
const TagRE = /<([a-zA-Z\-]+(?:"[^"]*"|'[^']*'|[^'">])*)>/g;
const AttrRE = /\s([a-z][a-z0-9-_.:]+)(?:(?:="([^"]*)"|(?:='([^']*)'))|(?:=([^"'<>\s]+)))?/gi;
const AttrData = `<$1 ${TYPE}="attr">`;
const SlotData = `<slot ${TYPE}="slot" ${VALUE}="$1"></slot>`;
const CompData = [
    `<template ${TYPE}="comp" ${VALUE}="$1"`,
    "</template>"
];
const TemplateCache = new Map();
const ValueCache = {};
const RegisteredEvents = {};
const voidElements = [
    "area",
    "base",
    "br",
    "col",
    "command",
    "embed",
    "hr",
    "img",
    "input",
    "keygen",
    "link",
    "meta",
    "param",
    "source",
    "track",
    "wbr",
    "circle",
    "ellipse",
    "line",
    "path",
    "polygon",
    "polyline",
    "rect",
    "stop",
    "use"
];
function createDirective(name, directive) {
    const directives = inject(AppInjectionKey).directives;
    if (name in directives) {
        const directiveCopy = directives[name];
        onUnmount(()=>directives[name] = directiveCopy);
    }
    directives[name] = directive;
}
function createComponent(name, component) {
    const components = inject(AppInjectionKey).components;
    if (name in components) {
        const componentCopy = components[name];
        onUnmount(()=>components[name] = componentCopy);
    }
    components[name] = component;
}
function mount(rootElement, rootComp) {
    return createRoot((cleanup)=>{
        provide(AppInjectionKey, {
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
    return render(createOrGetTemplate(templateStrings), slots);
}
const renderMap = {
    attr (elt, slots) {
        const props = createProps(elt, slots);
        for(const key in props){
            renderAttr(elt, key, props[key]);
        }
    },
    slot (elt, slots) {
        const key = elt.getAttribute(VALUE);
        renderChild(elt, slots[key]);
    },
    comp (elt, slots) {
        const name = elt.getAttribute(VALUE);
        const component = inject(AppInjectionKey).components[name];
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
    for (const elt of fragment.querySelectorAll(Query)){
        const type = elt.getAttribute(TYPE);
        elt.removeAttribute(TYPE);
        renderMap[type]?.(elt, slots);
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
function createProps(elt, slots) {
    const props = {};
    for(const key in elt.dataset){
        if (key.startsWith("__")) {
            const match = elt.dataset[key].match(PropValueRE);
            props[match[1]] = createValue(match[2], slots);
            delete elt.dataset[key];
        }
    }
    return props;
}
function getOrCreateValueCache(value) {
    if (value in ValueCache) {
        return ValueCache[value];
    }
    const id = value.match(SingleValueRE)?.[1];
    if (id) {
        return ValueCache[value] = id;
    }
    const matches = [
        ...value.matchAll(MultiValueRE)
    ];
    if (matches.length === 0) {
        return ValueCache[value] = undefined;
    }
    return ValueCache[value] = matches.map((match)=>match[1]);
}
function createValue(value, slots) {
    const keyOrKeys = getOrCreateValueCache(value);
    if (keyOrKeys === undefined) {
        return value;
    }
    if (typeof keyOrKeys === "string") {
        return slots[keyOrKeys];
    }
    if (keyOrKeys.some((key)=>isReactive(slots[key]))) {
        return ()=>sub(value, MultiValueRE, (_, key)=>toValue(slots[key]));
    }
    return sub(value, MultiValueRE, (_, key)=>slots[key]);
}
function createTemplateString(strings) {
    let templateString = "", arg = 0;
    while(arg < strings.length - 1){
        templateString = templateString + strings[arg] + `#{${arg++}}`;
    }
    templateString = templateString + strings[arg];
    templateString = sub(templateString, StartingWSRE, "");
    templateString = sub(templateString, SelfClosingTagRE, (match, tag, attr)=>{
        if (HasUCRE.test(tag) || voidElements.includes(tag)) {
            return match;
        }
        return `<${tag}${attr}></${tag}>`;
    });
    templateString = sub(templateString, ClosingCompRE, CompData[1]);
    templateString = sub(templateString, TagRE, (data)=>{
        const isComp = CompRE.test(data);
        let id = 0;
        data = sub(data, AttrRE, (data, name, val1, val2, val3)=>{
            if (isComp === false) {
                if (!ArgRE.test(data) && !DirRE.test(data)) {
                    return data;
                }
            }
            const quote = data.match(QuoteRE)?.[0] || `"`;
            const value = sub(val1 ?? val2 ?? val3 ?? "", ArgRE, "@{$1}");
            return ` data-__${id++}=${quote}${name} ${value}${quote}`;
        });
        if (isComp) {
            data = sub(data, CompRE, CompData[0]);
        } else if (id !== 0) {
            data = sub(data, TagRE, AttrData);
        }
        return data;
    });
    templateString = sub(templateString, ArgRE, SlotData);
    templateString = sub(templateString, ContentRE, "$1$2");
    return templateString;
}
function createOrGetTemplate(templateStrings) {
    let template = TemplateCache.get(templateStrings);
    if (template === undefined) {
        const element = document.createElement("template");
        element.innerHTML = createTemplateString(templateStrings);
        TemplateCache.set(templateStrings, element.content);
        template = element.content;
    }
    return template.cloneNode(true);
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
function renderAttr(elt, prop, data) {
    if (prop.startsWith(DirPrefix)) {
        const key = prop.slice(DirPrefixLength).match(DirKeyRE)[0];
        const directive = inject(AppInjectionKey).directives[key];
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
    const arg = prop.match(BindingArgRE)?.[1] || null;
    const modifiers = prop.match(BindingModRE)?.reduce((modifiers, key)=>{
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
    return sub(data, /-[a-z]/g, (match)=>match.slice(1).toUpperCase());
}
function toKebabCase(data) {
    return sub(data, /([A-Z])/g, "-$1").toLowerCase();
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
        elt?.[DelegatedEvents]?.[type]?.forEach?.((fn)=>fn.call(elt, event));
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
    elt[IfDirectiveSymbol] = elt[IfDirectiveSymbol] || new Text();
    const value = binding.value, target = value ? elt[IfDirectiveSymbol] : elt;
    target.replaceWith(value ? elt : elt[IfDirectiveSymbol]);
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
        elt[DelegatedEvents] = elt[DelegatedEvents] || {};
        elt[DelegatedEvents][name] = elt[DelegatedEvents][name] || [];
        elt[DelegatedEvents][name].push(listener);
        if (RegisteredEvents[id] === undefined) {
            addEventListener(name, delegatedEventListener, eventOptions);
            RegisteredEvents[id] = true;
        }
    } else {
        elt.addEventListener(name, listener, eventOptions);
    }
}
function sub(data, match, replacer) {
    return data.replace(match, replacer);
}
const ParamsInjectionKey = Symbol();
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
    return inject(ParamsInjectionKey);
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
                    provide(ParamsInjectionKey, route.regexp.exec(nextPath)?.groups);
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
    function onInput() {
        textValue(this.value);
    }
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
