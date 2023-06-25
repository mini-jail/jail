/// <reference types="./mod.d.ts" />

const RegisteredEvents = {};
const Events = Symbol("Events");
/**
 * @param {Event} event
 */
function eventLoop(event) {
  const type = event.type;
  let elt = event.target;
  while (elt !== null) {
    elt?.[Events]?.[type]?.forEach((fn) => fn.call(elt, event));
    elt = elt.parentNode;
  }
}

/**
 * @type {jail.DirectiveRegistry["ref"]}
 */
export const RefDirective = (elt, { rawValue }) => {
  if (typeof rawValue === "function") {
    rawValue(elt);
  }
  if ("value" in rawValue) {
    rawValue.value = elt;
  }
};

/**
 * @type {jail.DirectiveRegistry["bind"]}
 */
export const BindDirective = (elt, binding) => elt[binding.arg] = binding.value;
BindDirective.shorthand = ":";

/**
 * @type {jail.DirectiveRegistry["html"]}
 */
export const HTMLDirective = (elt, binding) => elt.innerHTML = binding.value;

/**
 * @type {jail.DirectiveRegistry["text"]}
 */
export const TextDirective = (elt, binding) => elt.textContent = binding.value;

/**
 * @type {jail.DirectiveRegistry["show"]}
 */
export const ShowDirective = (elt, binding) => {
  elt.style.display = binding.value ? null : "none";
};

/**
 * @type {jail.DirectiveRegistry["on"]}
 */
export const OnDirective = (elt, { rawValue, arg, modifiers }) => {
  if (arg === null) {
    console.info(`missing name: d-on:[arg=name]...`);
    return;
  }
  let name = arg,
    identifier = name,
    listener = rawValue,
    eventOptions;
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
    }
  } else {
    elt.addEventListener(name, listener, eventOptions);
  }
};

/**
 * @type {jail.Plugin}
 */
export const Package = {
  install(app) {
    app.directive("ref", RefDirective);
    app.directive("bind", BindDirective);
    app.directive("html", HTMLDirective);
    app.directive("text", TextDirective);
    app.directive("show", ShowDirective);
    app.directive("on", OnDirective);
  },
};
