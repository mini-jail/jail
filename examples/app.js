import { createEffect, onCleanup, onMount } from "signal";
import { createRouter, path } from "signal/router";
import { createApp, template } from "signal/dom";
import { Package } from "signal/dom/plugins";

import Home from "./routes/home.js";
import Counter from "./routes/counter.js";
import Sierpinski from "./routes/sierpinski.js";
import About from "./routes/about.js";
import Todo from "./routes/todo.js";
import NotFound from "./routes/notfound.js";

const Navigation = () => {
  return template`
    <nav>
      <a href="#/">home</a>
      <a href="#/counter">counter</a>
      <a href="#/sierpinski">sierpinski</a>
      <a href="#/todo">todo</a>
      <a href="#/about">about</a>
      <a href="#/error">error</a>
    </nav>
  `;
};

const HashRouter = () => {
  const getHash = () => location.hash.slice(1) || "/";

  const router = createRouter({
    "/": Home,
    "/counter": Counter,
    "/sierpinski": Sierpinski,
    "/sierpinski/:target": Sierpinski,
    "/sierpinski/:target/:size": Sierpinski,
    "/about": About,
    "/todo": Todo,
    "/:url": NotFound,
  });

  const listener = () => path(getHash());

  onMount(() => {
    path(getHash());
    addEventListener("hashchange", listener);
  });

  onCleanup(() => {
    removeEventListener("hashchange", listener);
  });

  return template`${router}`;
};

const RootComponent = () => {
  createEffect(() => document.title = `signal${path()}`);

  return template`
    <header>
      <h3>signal${path}</h3>
      <app-navigation>
      </app-navigation>
    </header>
    <main>
      <app-router>
      </app-router>
    </main>
  `;
};

createApp(RootComponent)
  .component("app-navigation", Navigation)
  .component("app-router", HashRouter)
  .use(Package)
  .mount(document.body);
