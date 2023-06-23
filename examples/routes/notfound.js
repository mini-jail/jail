import { template } from "signal/dom";
import { createSignal } from "signal";

const colors = createSignal("pink");

setInterval(() => {
  colors("#" + Math.floor(Math.random() * 16777215).toString(16));
}, 1000);

export default () => {
  return template`
    <article>
      <h4>
        Page not found :(
        <sub>(ha-ha!)</sub>
      </h4>
      <p>There is no content for "${location}".</p>
    </article>

    <style>
      body {
        background-color: indianred;
        transition: 500ms;
      }
    </style>
  `;
};
