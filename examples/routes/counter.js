import { computed, signal } from "signal";
import { template } from "signal/dom";

export default () => {
  const counter = signal(0);
  const add = () => counter(counter() + 1);
  const sub = () => counter(counter() - 1);
  const clicked = computed((currentValue) => {
    counter();
    return currentValue + 1;
  }, -1);

  return template`
    <article>
      <h4>
        counter example
        <sub>(...what else?)</sub>
      </h4>
      <button d-on:click.delegate="${sub}">-</button>
      <span>current value: ${counter}</span>
      <button d-on:click.delegate="${add}">+</button>
      <div>> you have clicked ${clicked} times.</div>
      ${() => clicked() > 10 && template`<div>> why do you do this?????</div>`}
      ${() => clicked() > 20 && template`<div>> pls stop T_T</div>`}
      ${() => clicked() > 30 && template`<div>> enough :(</div>`}
      ${() => clicked() > 40 && template`<div>> it hurts @_@</div>`}
    </article>
  `;
};
