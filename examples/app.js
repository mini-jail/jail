import { cleaned, effect, mounted } from "signal";
import { path, routed } from "signal/router";
import { createApp, template } from "signal/dom";
import Plugins from "signal/dom/plugins";

import Home from "./routes/home.js";
import Counter from "./routes/counter.js";
import Sierpinski from "./routes/sierpinski.js";
import About from "./routes/about.js";
import Todo from "./routes/todo.js";
import NotFound from "./routes/notfound.js";

import TextPlugin from "./plugins/text.js";

const Navigation = () => {
  return template`
    <nav d-on:click.once="${console.log}">
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
  const listener = () => path(getHash());

  const Router = routed({
    "/": Home,
    "/counter": Counter,
    "/sierpinski": Sierpinski,
    "/sierpinski/:target": Sierpinski,
    "/sierpinski/:target/:size": Sierpinski,
    "/about": About,
    "/todo": Todo,
    "/:url": NotFound,
  });

  mounted(() => {
    path(getHash());
    addEventListener("hashchange", listener);
  });

  cleaned(() => {
    removeEventListener("hashchange", listener);
  });

  return template`${Router}`;
};

const App = () => {
  effect(() => {
    document.title = `signal${path()}`;
  });

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

createApp(App)
  .component("app-navigation", Navigation)
  .component("app-router", HashRouter)
  .use(Plugins)
  .use(TextPlugin)
  .mount(document.body);
