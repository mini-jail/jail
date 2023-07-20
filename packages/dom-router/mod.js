/// <reference types="./mod.ts" />
import { createComputed, createRoot, createSignal, inject, onCleanup, onMount, provide } from "jail/signal";
import { createComponent } from "jail/dom";
const Params = Symbol("Params");
export const path = createSignal("");
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
export function getParams() {
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
export function Router(props) {
    const router = createRouter(props.routeMap, {
        fallback: props.fallback
    });
    routeTypeHandlerMap[props.type]();
    return props.children ? [
        props.children,
        router
    ] : router;
}
export default function installRouter() {
    createComponent("Router", Router);
}
