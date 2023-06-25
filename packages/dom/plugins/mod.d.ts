declare global {
  namespace jail {
    type OnBinding<T extends Event = Event> = {
      (event: T): void;
    };

    interface DirectiveRegistry {
      ref: Directive<DOMElement>;
      on: Directive<OnBinding>;
      bind: Directive<unknown>;
      html: Directive<string>;
      text: Directive<string>;
      show: Directive<boolean>;
    }
  }
}

export const Package: jail.Plugin;
export const RefDirective: jail.DirectiveRegistry["ref"];
export const OnDirective: jail.DirectiveRegistry["on"];
export const BindDirective: jail.DirectiveRegistry["bind"];
export const HTMLDirective: jail.DirectiveRegistry["html"];
export const TextDirective: jail.DirectiveRegistry["text"];
export const ShowDirective: jail.DirectiveRegistry["show"];
