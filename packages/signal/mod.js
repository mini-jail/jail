/// <reference types="./mod.ts" />
const Error = Symbol("Error");
const NodeQueue = new Set();
let isRunning = false;
let activeNode = null;
export function createRoot(callback) {
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
export function nodeRef() {
    return activeNode;
}
export function withNode(node, callback) {
    const localNode = activeNode;
    activeNode = node;
    let result;
    try {
        result = callback();
    } catch (error) {
        handleError(error);
    } finally{
        activeNode = localNode;
    }
    return result;
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
export function onMount(callback) {
    createEffect(()=>untrack(callback));
}
export function onUnmount(cleanup) {
    onCleanup(()=>untrack(cleanup));
}
export function on(dependency, callback) {
    return (currentValue)=>{
        dependency();
        return untrack(()=>callback(currentValue));
    };
}
export function createEffect(callback, initialValue) {
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
export function createComputed(callback, initialValue) {
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
export function isReactive(data) {
    return typeof data === "function";
}
export function toValue(data) {
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
export function createSignal(initialValue) {
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
export function catchError(callback) {
    if (activeNode === null) {
        return;
    }
    if (activeNode.injections === null) {
        activeNode.injections = {
            [Error]: [
                callback
            ]
        };
    } else {
        activeNode.injections[Error].push(callback);
    }
}
export function onCleanup(cleanup) {
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
export function untrack(callback) {
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
export function inject(key, defaultValue) {
    return lookup(activeNode, key) || defaultValue;
}
export function provide(key, value) {
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
export function createCallback(callback) {
    const boundNode = activeNode;
    return function Callback(...args) {
        return withNode(boundNode, ()=>callback(...args));
    };
}
