declare global {
  interface DirectiveRegistry {
    ref: Directive<Signal<Element> | Ref<Element>>;
    on: Directive<(event: Event) => void>;
  }
}

export default AppPlugin;
