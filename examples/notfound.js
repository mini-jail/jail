import { getParams } from "signal/router";
import { template } from "signal/dom";

export default () => {
  const { url } = getParams();
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
      <p>There is no content for "${url}".</p>
    </article>
  `;
};
