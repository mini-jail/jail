/// <reference types="./mod.ts" />
import { createEffect, createRoot, inject, isReactive, onCleanup, onUnmount, provide, toValue } from "jail/signal";
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
export function createDirective(name, directive) {
    extendApp("directives", name, directive);
}
export function createComponent(name, component) {
    extendApp("components", name, component);
}
export function mount(rootElement, rootComponent) {
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
export function template(strings, ...args) {
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
        renderChild(elt, getValue(slot, args));
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
        return getValue(cached, args);
    }
    if (cached.some((id)=>isReactive(getValue(id, args)))) {
        return String.prototype.replace.bind(value, MValRegExp, (_, id)=>toValue(getValue(id, args)));
    }
    return String.prototype.replace.call(value, MValRegExp, (_, id)=>getValue(id, args));
}
function getValue(id, args) {
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
export function createTemplateString(strings) {
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
