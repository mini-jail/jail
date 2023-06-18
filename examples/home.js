import { template } from "signal/dom";

export default () => {
  return template`
    <article>
      <h4>
        welcome home!
        <sub>(sucker)</sub>
      </h4>
      <pre>
        just look at my examples like <a href="#/counter">counter</a>.
        have fun!

        btw. this whole page is just an example, lol.
      </pre>
    </article>
  `;
};
