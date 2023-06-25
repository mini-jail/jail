import {
  createComputed,
  createInjection,
  createSignal,
  inject,
  onMount,
  onUnmount,
  provide,
} from "signal";
import { template } from "signal/dom";
import { getParams } from "signal/router";

/**
 * @type {jail.Injection<jail.Signal<number>>}
 */
const Counter = createInjection();

const Dot = (x, y, target) => {
  const counter = inject(Counter);
  const hover = createSignal(false);
  const onMouseOut = () => hover(false);
  const onMouseOver = () => hover(true);
  const text = () => hover() ? "*" + counter() + "*" : counter();

  const css = () => `
    width: ${target}px;
    height: ${target}px;
    line-height: ${target}px;
    background-color: ${hover() === true ? "lightpink" : "white"};
    left: ${x}px;
    top: ${y}px;
    font-size: ${(target / 2.5)}px;
    border-radius: ${target}px;
  `;

  return template`
    <div 
      class="dot" 
      d-text=${text}
      style=${css} 
      d-on:mouseover.delegate=${onMouseOver} 
      d-on:mouseout.delegate=${onMouseOut}></div>
  `;
};

const Triangle = (x, y, target, size) => {
  if (target <= size) {
    return Dot(x, y, target);
  }
  target = target / 2;
  return template`
    ${Triangle(x, y - target / 2, target, size)}
    ${Triangle(x - target, y + target / 2, target, size)}
    ${Triangle(x + target, y + target / 2, target, size)}
  `;
};

export default () => {
  const { target = "750", size = "25" } = getParams() || {};
  let id;
  const elapsed = createSignal(0);
  const count = createSignal(0);
  const scale = createComputed(() => {
    const e = (elapsed() / 1000) % 10;
    return 1 + (e > 5 ? 10 - e : e) / 10;
  });

  provide(Counter, count);

  onMount(() => {
    id = setInterval(() => count((count() % 10) + 1), 1000);
    const start = Date.now();
    const frame = () => {
      elapsed(Date.now() - start);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });

  onUnmount(() => {
    clearInterval(id);
  });

  const transform = () =>
    `transform: scaleX(${scale() / 2.1}) scaleY(0.7) translateZ(0.1px);`;

  return template`
    <div class="triangle-demo" style=${transform}>
      ${Triangle(0, 0, Number(target), Number(size), count)}
    </div>

    <style>
      .triangle-demo {
        position: absolute;
        left: 50%;
        top: 50%;
      }
      .dot {
        position: absolute;
        text-align: center;
        cursor: pointer;
        user-select: none;
      }
    </style>
  `;
};
