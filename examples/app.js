import { createEffect, onMount } from "signal";
import { createRouter, pathSignal } from "signal/router";
import { createApp, template } from "signal/dom";

import Home from "./routes/home.js";
import Counter from "./routes/counter.js";
import Sierpinski from "./routes/sierpinski.js";
import About from "./routes/about.js";
import Todo from "./routes/todo.js";
import NotFound from "./routes/notfound.js";

const App = () => {
  const getHash = () => location.hash.slice(1) || "/";

  onMount(() => {
    pathSignal(getHash());
    addEventListener("hashchange", () => pathSignal(getHash()));
  });

  createEffect(() => {
    document.title = `signal${pathSignal()}`;
  });

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

  return template`
    <header>
      <h3>signal${pathSignal}</h3>
      <nav>
        <a href="#/">home</a>
        <a href="#/counter">counter</a>
        <a href="#/sierpinski">sierpinski</a>
        <a href="#/todo">todo</a>
        <a href="#/about">about</a>
        <a href="#/error">error</a>
      </nav>
    </header>
    <main>
      ${Router}
    </main>
  `;
};

const app = createApp(App)
  .mount(document.body);
