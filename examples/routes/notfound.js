import { template } from "signal/dom";

export default () => {
  return template`
    <style>
      body {
        background-color: indianred;
      }
    </style>
    <article>
      <h4>
        Page not found :(
        <sub>(ha-ha!)</sub>
      </h4>
      <p>There is no content for "${location}".</p>
    </article>
  `;
};
