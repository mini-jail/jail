const sourceMap = new WeakMap();
const nodeQueue = new Set();
const errorKey = Symbol("Error");
let isRunning = false;
let activeNode = null;
function SignalNode() {
    this.value = undefined;
    this.parentNode = activeNode;
    this.childNodes = null;
    this.sources = null;
    this.context = null;
    this.cleanups = null;
    this.onupdate = null;
    if (activeNode) {
        if (activeNode.childNodes === null) {
            activeNode.childNodes = [
                this
            ];
        } else {
            activeNode.childNodes.push(this);
        }
    }
}
function lookup(node, key) {
    return node === null ? undefined : node.context !== null && key in node.context ? node.context[key] : lookup(node.parentNode, key);
}
function handleError(error) {
    const errorFns = lookup(activeNode, errorKey);
    if (!errorFns) {
        return reportError(error);
    }
    errorFns.forEach((fn)=>fn(error));
}
function updateNode(node) {
    cleanNode(node, false);
    if (node.onupdate === null) {
        return;
    }
    const prevNode = activeNode;
    try {
        activeNode = node;
        node.value = node.onupdate(node.value);
    } catch (error) {
        handleError(error);
    } finally{
        activeNode = prevNode;
    }
}
function addNodeToQueue(node) {
    nodeQueue.add(node);
    if (isRunning === false) {
        isRunning = true;
        queueMicrotask(()=>{
            nodeQueue.forEach(updateNode);
            nodeQueue.clear();
            isRunning = false;
        });
    }
}
function cleanNode(node, dispose) {
    if (node.sources?.length) {
        let source = node.sources.pop(), sourceNodes;
        while(source){
            sourceNodes = sourceMap.get(source);
            if (sourceNodes) {
                let nodeIndex = sourceNodes.indexOf(node);
                while(nodeIndex !== -1){
                    sourceNodes.splice(nodeIndex, 1);
                    nodeIndex = sourceNodes.indexOf(node);
                }
            }
            source = node.sources.pop();
        }
    }
    if (node.childNodes?.length) {
        let childNode = node.childNodes.pop();
        while(childNode){
            cleanNode(childNode, childNode.onupdate ? true : dispose);
            childNode = node.childNodes.pop();
        }
    }
    if (node.cleanups?.length) {
        let cleanup = node.cleanups.pop();
        while(cleanup){
            cleanup();
            cleanup = node.cleanups.pop();
        }
    }
    node.context = null;
    if (dispose) {
        node.value = undefined;
        node.parentNode = null;
        node.childNodes = null;
        node.sources = null;
        node.cleanups = null;
        node.onupdate = null;
    }
}
function signal(value) {
    return function Signal() {
        if (arguments.length) {
            value = typeof arguments[0] === "function" ? arguments[0](value) : arguments[0];
            return push(Signal);
        }
        pull(Signal);
        return value;
    };
}
function computed(fn) {
    const computed = signal();
    effect(()=>computed(fn()));
    return ()=>computed();
}
function effect(update) {
    const node = new SignalNode();
    node.onupdate = update;
    if (isRunning) {
        nodeQueue.add(node);
    } else {
        queueMicrotask(()=>updateNode(node));
    }
}
function root(fn) {
    const prevNode = activeNode;
    try {
        const node = new SignalNode();
        activeNode = node;
        return fn(()=>cleanNode(node, true));
    } catch (error) {
        handleError(error);
    } finally{
        activeNode = prevNode;
    }
}
function provide(key, value) {
    if (activeNode === null) {
        throw new Error("provide(key, value): activeNode is null!");
    }
    if (activeNode.context === null) {
        activeNode.context = {};
    }
    activeNode.context[key] = value;
}
function inject(key, value) {
    return lookup(activeNode, key) ?? value;
}
function onCleanup(cleanup) {
    if (activeNode === null) {
        throw new Error("onCleanup(cleanup): activeNode is null!");
    }
    if (activeNode.cleanups === null) {
        activeNode.cleanups = [
            cleanup
        ];
    } else {
        activeNode.cleanups.push(cleanup);
    }
}
function pull(source) {
    if (activeNode?.onupdate) {
        const nodeSet = sourceMap.get(source);
        if (nodeSet === undefined) {
            sourceMap.set(source, [
                activeNode
            ]);
        } else {
            nodeSet.push(activeNode);
        }
        if (activeNode.sources === null) {
            activeNode.sources = [
                source
            ];
        } else {
            activeNode.sources.push(source);
        }
    }
}
function push(source) {
    sourceMap.get(source)?.forEach(addNodeToQueue);
}
const listenerMap = {};
const targetListeners = new WeakMap();
function resolve(value) {
    return typeof value === "function" ? value() : value;
}
function resolvable(value) {
    return typeof value === "function" && value.length === 0;
}
function* render(...children) {
    for (const child of children){
        if (child == null || typeof child === "boolean") {
            continue;
        } else if (typeof child === "string" || typeof child === "number") {
            yield child + "";
        } else if (child instanceof Node) {
            yield child;
        } else if (resolvable(child)) {
            const before = new Text();
            mount(null, child, before);
            yield before;
        } else if (child[Symbol.iterator]) {
            yield* render(...child);
        } else {
            console.info("unknown child type", child);
        }
    }
}
function mount(targetNode, child, before) {
    return root((cleanup)=>{
        let children = null;
        effect(()=>{
            children = reconcile(targetNode ?? before?.parentElement ?? null, before ?? null, children, Array.from(render(resolve(child))));
        });
        onCleanup(()=>{
            before?.remove();
            while(children?.length){
                children.pop()?.remove();
            }
            children = null;
        });
        return cleanup;
    });
}
function reconcile(parentNode, before, children, nodes) {
    nodes?.forEach((node, i)=>{
        const child = children?.[i];
        children?.some((child, j)=>{
            let isEqualNode = false;
            if (child.nodeType === 3 && (typeof node === "string" || node.nodeType === 3)) {
                child["data"] = typeof node === "string" ? node : node["data"];
                isEqualNode = true;
            } else if (typeof node !== "string" && child.isEqualNode(node)) {
                isEqualNode = true;
            }
            if (isEqualNode) {
                nodes[i] = child;
                children.splice(j, 1);
            }
            return isEqualNode;
        });
        if (child !== nodes[i]) {
            if (typeof nodes[i] === "string") {
                nodes[i] = new Text(nodes[i]);
            }
            parentNode?.insertBefore(nodes[i], child?.nextSibling ?? before);
        }
    });
    while(children?.length){
        children.pop()?.remove();
    }
    return nodes?.length ? nodes : null;
}
function create(type, attributes, ...children) {
    if (typeof type === "function") {
        return root(()=>render(type(attributes, ...children)));
    }
    const elt = document.createElement(type);
    if (attributes) {
        assign(elt, attributes, children);
    }
    if (children.length) {
        elt.append(...render(...children));
    }
    return elt;
}
function assign(elt, attributes, children) {
    for(const name in attributes){
        const value = attributes[name];
        if (name === "ref") {
            effect(()=>value(elt));
        } else if (name === "children") {
            children.push(value);
        } else if (name.startsWith("on")) {
            const type = name[2] === ":" ? name.slice(3) : name.slice(2).toLowerCase();
            if (Array.isArray(value)) {
                listen(elt, type, value[0], value[1]);
            } else {
                listen(elt, type, value);
            }
        } else if (resolvable(value)) {
            effect(()=>attribute(elt, name, resolve(value)));
        } else {
            attribute(elt, name, value);
        }
    }
}
function eventListener(event) {
    let target = event.target;
    while(target !== null){
        const listeners = targetListeners.get(target), listener = listeners?.[event.type];
        if (listener) {
            if (listener.options?.prevent) {
                event.preventDefault();
            }
            if (listener.options?.stop) {
                event.stopPropagation();
            }
            if (listener.options?.stopImmediate) {
                event.stopImmediatePropagation();
            }
            listener(event);
            if (listener.options?.once) {
                listeners[event.type] = undefined;
            }
            if (listener.options?.stopImmediate) {
                return;
            }
        }
        target = target.parentNode;
    }
}
function listen(target, name, listener, options) {
    listener.options = options;
    let listeners = targetListeners.get(target);
    if (listeners === undefined) {
        targetListeners.set(target, listeners = {});
    }
    listeners[name] = listener;
    if (listenerMap[name] === undefined) {
        listenerMap[name] = true;
        document.addEventListener(name, eventListener);
    }
}
function style(elt, name, value) {
    if (Reflect.has(elt.style, name)) {
        elt.style[name] = value;
    } else {
        elt.style.setProperty(name, value);
    }
}
function attribute(elt, name, value) {
    if (name.startsWith("style")) {
        if (typeof value === "string") {
            return style(elt, name[5] === ":" ? name.slice(6) : "cssText", value);
        }
        for(const prop in value){
            if (resolvable(value[prop])) {
                return effect(()=>{
                    for(const prop in value){
                        style(elt, prop, resolve(value[prop]));
                    }
                });
            } else {
                style(elt, prop, value[prop]);
            }
        }
        return;
    }
    let isProp = Reflect.has(elt, name);
    if (name.startsWith("attr:")) {
        isProp = false;
        name = name.slice(5);
    } else if (name.startsWith("prop:")) {
        isProp = true;
        name = name.slice(5);
    }
    if (isProp) {
        elt[name] = value;
    } else {
        if (value == null) {
            elt.removeAttribute(name);
        } else {
            elt.setAttribute(name, String(value));
        }
    }
}
class Context {
    id = Symbol();
    defaultValue;
    constructor(defaultValue){
        this.defaultValue = defaultValue;
    }
    provide(value) {
        provide(this.id, value);
    }
    inject() {
        return inject(this.id, this.defaultValue);
    }
}
const routerContext = new Context();
const path = signal("");
const routeTypeHandlerMap = {
    hash () {
        effect(()=>{
            path(hash());
            addEventListener("hashchange", hashChangeListener);
        });
        onCleanup(()=>{
            removeEventListener("hashchange", hashChangeListener);
        });
    },
    pathname () {
        const url = new URL(location.toString());
        const clickListener = (event)=>{
            let elt = event.target;
            let pathname;
            while(elt != null){
                pathname = elt?.getAttribute?.("href");
                if (pathname?.startsWith("/")) {
                    event.preventDefault();
                    if (pathname !== url.pathname) {
                        path(pathname);
                        url.pathname = pathname;
                        return history.pushState(null, "", url);
                    }
                }
                elt = elt?.parentElement;
            }
        };
        effect(()=>{
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
function createMatcher(path) {
    return RegExp("^" + path.replace(/:([^/:]+)/g, (_, name)=>`(?<${name}>[^/]+)`) + "$");
}
function popStateListener(event) {
    event.preventDefault();
    path(location.pathname);
}
function hash() {
    return location.hash.slice(1) || "/";
}
function hashChangeListener() {
    path(hash());
}
function Router(props, ...children) {
    const routes = children.map(({ child , path  })=>({
            matcher: createMatcher(path),
            child
        }));
    routeTypeHandlerMap[props.type]();
    onCleanup(()=>routes.length = 0);
    return computed(()=>{
        const nextPath = path();
        for (const route of routes){
            if (route.matcher.test(nextPath)) {
                routerContext.provide({
                    path: nextPath,
                    params: route.matcher.exec(nextPath)?.groups
                });
                return route.child;
            }
        }
    });
}
const counterContext = new Context(signal(0));
function animate(props) {
    return (elt)=>{
        const { keyframes , signal , ...options } = props;
        signal?.();
        elt.animate(keyframes, options);
    };
}
function Page(props, ...children) {
    return create("article", null, [
        create("h4", null, props.title, create("sub", null, props.description)),
        ...children
    ]);
}
function Paragraph(stringArray, ...children) {
    return create("p", null, [
        stringArray.map((string, index)=>{
            if (children[index] != null) {
                return [
                    string,
                    children[index]
                ];
            }
            return string;
        })
    ]);
}
function Anchor(href, ...children) {
    return create("a", {
        href
    }, ...children);
}
function Dot({ x , y , target  }) {
    const counter = counterContext.inject();
    const hover = signal(false);
    const cssText = `
    width: ${target}px;
    height: ${target}px;
    line-height: ${target}px;
    left: ${x}px;
    top: ${y}px;
    font-size: ${target / 2.5}px;
    border-radius: ${target}px;
  `;
    return create("div", {
        class: "sierpinski-dot",
        "style:cssText": cssText,
        "style:backgroundColor": ()=>hover() ? "lightpink" : "white",
        onMouseOver: ()=>hover(true),
        onMouseOut: ()=>hover(false),
        children: ()=>{
            return hover() ? "*" + counter() + "*" : counter() + "";
        }
    });
}
function* Triangle({ x , y , target , size  }) {
    if (target <= size) {
        return yield Dot({
            x,
            y,
            target
        });
    }
    target = target / 2;
    yield* Triangle({
        x,
        y: y - target / 2,
        target,
        size
    });
    yield* Triangle({
        x: x - target,
        y: y + target / 2,
        target,
        size
    });
    yield* Triangle({
        x: x + target,
        y: y + target / 2,
        target,
        size
    });
}
function SierpinskiTriangle() {
    let id, frameId;
    const elapsed = signal(0);
    const count = signal(0);
    const scale = ()=>{
        const e = elapsed() / 1000 % 10;
        return (1 + (e > 5 ? 10 - e : e) / 10) / 2;
    };
    counterContext.provide(count);
    effect(()=>{
        console.log("Sierpinski is alive");
        id = setInterval(()=>count(count() % 10 + 1), 1000);
        const start = Date.now();
        const frame = ()=>{
            elapsed(Date.now() - start);
            frameId = requestAnimationFrame(frame);
        };
        frameId = requestAnimationFrame(frame);
    });
    onCleanup(()=>{
        clearInterval(id);
        cancelAnimationFrame(frameId);
        console.log("Sierpinski is dead");
    });
    return create("div", {
        class: "sierpinski-wrapper",
        "style:transform": ()=>`scale(${scale()}) translateZ(0.1px)`,
        children: Triangle({
            x: 0,
            y: 0,
            target: 750,
            size: 25
        })
    });
}
function About() {
    return Page({
        title: "about",
        description: "(signal? me? idk...)"
    }, create("h5", null, "special thx to...actually me!"));
}
const code = `
function* SpaceCounter() {
  const counter = signal(0)
  yield create("button", { onClick: () => counter((value) => --value) }, "-")
  yield ["current value: ", counter]
  yield create("button", { onClick: () => counter((value) => ++value) }, "+")
}

function ReactCounter() {
  const [counter, setCounter] = useState(0)
  return (
    <>
      <button onClick={() => setCounter(counter - 1)}>-</button>
      current value: {counter}
      <button onClick={() => setCounter(counter + 1)}>+</button>
    </>
  )
}
`.trim();
function Counter() {
    const counter = signal(0);
    const show = signal(false);
    return Page({
        title: "counter example",
        description: "(...what else?)"
    }, [
        create("button", {
            onClick: ()=>counter((value)=>--value)
        }, "-"),
        "current value: ",
        counter,
        create("button", {
            onClick: ()=>counter((value)=>++value)
        }, "+"),
        create("div", null, [
            create("button", {
                onClick: ()=>show(!show())
            }, [
                ()=>show() ? "hide code" : "show code"
            ])
        ]),
        create("code", {
            "style:display": ()=>show() ? "" : "none"
        }, [
            code.split("\n").map((line)=>create("pre", null, line))
        ])
    ]);
}
function Home() {
    return Page({
        title: "welcome home!",
        description: "(sucker)"
    }, [
        Paragraph`
      just look at my examples like ${Anchor("/counter", "counter")}.
    `,
        Paragraph`
      i tend to create examples like ${Anchor("/sierpinski", "sierpinski")}
      because i want to test out the performance of my libraries ^^"
    `,
        Paragraph`btw. this whole page is just an example, lol.`
    ]);
}
function NotFound() {
    effect(()=>{
        const { backgroundColor  } = document.body.style;
        document.body.style.backgroundColor = "indianred";
        onCleanup(()=>{
            document.body.style.backgroundColor = backgroundColor;
        });
    });
    return Page({
        title: "Page not found :(",
        description: "(ha-ha!)"
    }, Paragraph`There is no content for "${location.pathname}".`);
}
function Sierpinski() {
    return Page({
        title: "sierpinski",
        description: "(i mean...why??)"
    }, SierpinskiTriangle());
}
let itemID = 0;
const list = signal([
    {
        id: itemID++,
        done: true,
        text: "eat cornflakes without soymilk"
    },
    {
        id: itemID++,
        done: false,
        text: "buy soymilk"
    }
]);
function List() {
    if (list().length === 0) {
        return "Nothing to do";
    }
    return list().map(Item);
}
const deleteItem = (props)=>{
    list((items)=>items.filter((item)=>item.id !== props.id));
};
const toggleItem = (props)=>{
    list((items)=>{
        const item = items.find((item)=>item.id === props.id);
        if (item) {
            item.done = !item.done;
        }
        return items;
    });
};
function Item(props) {
    return create("div", {
        class: "todo-item",
        id: "item_" + props.id
    }, [
        create("div", {
            class: "todo-item-text",
            onClick: ()=>toggleItem(props),
            children: props.text,
            "style:color": props.done ? "grey" : null,
            "style:fontStyle": props.done ? "italic" : null
        }),
        create("div", {
            class: "todo-item-delete",
            style: {
                display: props.done ? null : "none"
            },
            onClick: ()=>deleteItem(props),
            children: "delete"
        })
    ]);
}
function ToDo() {
    const text = signal("");
    const addItem = ()=>{
        list((items)=>items.concat({
                id: itemID++,
                done: false,
                text: text()
            }));
        text("");
    };
    const length = ()=>list().length;
    const done = ()=>list().filter((item)=>item.done).length;
    return Page({
        title: "todo",
        description: "(no-one ever have done that, i promise!)"
    }, create("div", {
        class: "todo-app-container"
    }, [
        create("form", {
            onSubmit: [
                addItem,
                {
                    prevent: true
                }
            ]
        }, [
            create("input", {
                type: "text",
                placeholder: "...milk?",
                required: true,
                class: "todo_input",
                value: text,
                onInput: ({ target  })=>text(target.value)
            })
        ]),
        create("div", {
            class: "todo-items"
        }, List),
        create("label", null, "progress: ", done, "/", length),
        create("progress", {
            max: length,
            value: done
        })
    ]));
}
function Header() {
    const pages = [
        {
            href: "/",
            text: "home"
        },
        {
            href: "/counter",
            text: "counter"
        },
        {
            href: "/sierpinski",
            text: "sierpinski"
        },
        {
            href: "/todo",
            text: "todo"
        },
        {
            href: "/about",
            text: "about"
        },
        {
            href: "/error",
            text: "error"
        }
    ];
    return create("header", null, [
        create("h3", null, "space", path),
        create("nav", null, [
            pages.map(({ href , text  })=>create("a", {
                    href
                }, text)),
            create("a", {
                onClick: unmount
            }, "unmount")
        ])
    ]);
}
function* App() {
    const animateProps = {
        signal: path,
        delay: 50,
        duration: 250,
        fill: "both",
        keyframes: [
            {
                opacity: 0,
                transform: "translateY(-10px)"
            },
            {
                opacity: 1,
                transform: "unset"
            }
        ]
    };
    yield create(Header);
    yield create("main", {
        ref: animate(animateProps)
    }, [
        create(Router, {
            type: "pathname"
        }, {
            path: "/",
            child: Home
        }, {
            path: "/counter",
            child: Counter
        }, {
            path: "/about",
            child: About
        }, {
            path: "/sierpinski",
            child: Sierpinski
        }, {
            path: "/todo",
            child: ToDo
        }, {
            path: "/[^]*",
            child: NotFound
        })
    ]);
}
const unmount = mount(document.body, App);
