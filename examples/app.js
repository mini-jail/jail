import { createEffect, onCleanup, onMount } from "signal";
import { createRouter, pathSignal } from "signal/router";
import { createApp, template } from "signal/dom";

import Home from "./routes/home.js";
import Counter from "./routes/counter.js";
import Sierpinski from "./routes/sierpinski.js";
import About from "./routes/about.js";
import Todo from "./routes/todo.js";
import NotFound from "./routes/notfound.js";

import TextPlugin from "./plugins/text.js";

const Navigation = () => {
  return template`
    <link href="/examples/app.css" rel="stylesheet"/>
    <nav path-signal="${pathSignal}">
      <a href="#/">home</a>
      <a href="#/counter">counter</a>
      <a href="#/sierpinski">sierpinski</a>
      <a href="#/todo">todo</a>
      <a href="#/about">about</a>
      <a href="#/error">error</a>
      <slot></slot>
    </nav>
  `;
};

const HashRouter = () => {
  const getHash = () => location.hash.slice(1) || "/";
  const listener = () => pathSignal(getHash());

  const Router = createRouter({
    "/": Home,
    "/counter": Counter,
    "/sierpinski": Sierpinski,
    "/sierpinski/:target": Sierpinski,
    "/sierpinski/:target/:size": Sierpinski,
    "/about": About,
    "/todo": Todo,
    "/:url": NotFound,
  });

  onMount(() => {
    pathSignal(getHash());
    addEventListener("hashchange", listener);
  });

  onCleanup(() => {
    removeEventListener("hashchange", listener);
  });

  return template`${Router}`;
};

const App = () => {
  createEffect(() => {
    document.title = `signal${pathSignal()}`;
  });

  return template`
    <header>
      <h3>signal${pathSignal}</h3>
      <app-navigation>
      </app-navigation>
    </header>
    <main>
      <app-router>
      </app-router>
    </main>
  `;
};

createApp(App)
  .component("app-navigation", Navigation, { shadow: true })
  .component("app-router", HashRouter)
  .use(TextPlugin)
  .mount(document.body);
