/// <reference types="./mod.d.ts" />
import { cleaned, effect } from "signal";

const Events = Symbol("Events");

function eventLoop(event) {
  const type = event.type;
  let elt = event.target;
  while (elt !== null) {
    elt?.[Events]?.[type]?.forEach((fn) => fn.call(elt, event));
    elt = elt.parentNode;
  }
}

export default {
  install(app) {
    const RegisteredEvents = {};
    app.directive("ref", (elt, binding) => {
      if (binding.rawValue == null || typeof binding.rawValue === "boolean") {
        return;
      }
      if (typeof binding.rawValue === "function") {
        effect(() => {
          const cleanup = binding.rawValue(elt);
          if (typeof cleanup === "function") {
            cleaned(cleanup);
          }
        });
      }
      if ("value" in binding.rawValue) {
        binding.rawValue.value = elt;
      }
    });

    app.directive("on", (elt, { rawValue, arg, modifiers }) => {
      if (arg === null) {
        console.info(`missing name: d-on:[arg=name]...`);
        return;
      }
      let name = arg,
        identifier = name,
        listener = rawValue,
        eventOptions,
        cleanup;
      if (modifiers?.prevent) {
        identifier += "-prevent";
        const listenerCopy = listener;
        listener = function (event) {
          event.preventDefault();
          preventDefault.call(event);
          listenerCopy.call(elt, event);
        };
      }
      if (modifiers?.stop) {
        identifier += "-stop";
        const listenerCopy = listener;
        listener = function (event) {
          event.stopPropagation();
          listenerCopy.call(elt, event);
        };
      }
      if (modifiers?.once) {
        identifier += "-once";
        eventOptions = eventOptions || {};
        eventOptions.once = true;
      }
      if (modifiers?.capture) {
        identifier += "-capture";
        eventOptions = eventOptions || {};
        eventOptions.capture = true;
      }
      if (modifiers?.passive) {
        identifier += "-passive";
        eventOptions = eventOptions || {};
        eventOptions.passive = true;
      }
      if (modifiers?.delegate) {
        elt[Events] = elt[Events] || {};
        elt[Events][name] = elt[Events][name] || [];
        elt[Events][name].push(listener);
        if (RegisteredEvents[identifier] === undefined) {
          addEventListener(name, eventLoop, eventOptions);
          RegisteredEvents[identifier] = true;
          cleanup = () => {
            removeEventListener(name, eventLoop, eventOptions);
            delete RegisteredEvents[identifier];
          };
        }
      } else {
        elt.addEventListener(name, listener, eventOptions);
        cleanup = () => elt.removeEventListener(name, listener, eventOptions);
      }
      return cleanup;
    });
  },
};
