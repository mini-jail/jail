import { template } from "jail/dom"

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
        background-color: ${"indianred"};
        transition: 500ms;
      }
    </style>
  `
}
