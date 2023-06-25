declare global {
  namespace jail {
    type DOMElement = HTMLElement | SVGElement;

    interface App {
      directive<K extends keyof DirectiveRegistry>(
        name: K,
      ): DirectiveRegistry[K] | undefined;
      directive<K extends keyof DirectiveRegistry>(
        name: K,
        directive: DirectiveRegistry[K],
      ): App;
      directive(name: string): Directive | undefined;
      directive(name: string, directive: Directive): App;

      provide<T>(injection: Injection<T>, value: T): App;

      component<K extends keyof ComponentRegistry>(
        name: K,
        rootComponent: ComponentRegistry[K],
      ): App;
      component<K extends keyof ComponentRegistry>(
        name: K,
        rootComponent: ComponentRegistry[K],
        options?: ComponentOptions,
      ): App;
      component(name: string, rootComponent: Component): App;
      component(
        name: string,
        rootComponent: Component,
        options?: ComponentOptions,
      ): App;
      component<K extends keyof ComponentRegistry>(
        name: K,
      ): ComponentRegistry[K] | undefined;
      component(name: string): Component | undefined;

      mount(rootElement: DOMElement): App;
      unmount(): App;
      run<T>(callback: () => T): T;
      use(plugin: Plugin): App;
    }

    interface Plugin {
      install(app: App): void;
    }

    interface Template {
      fragment: DocumentFragment;
      hasAttributes: boolean;
      hasInsertions: boolean;
    }

    interface ComponentOptions {
      shadow?: boolean;
    }

    interface FunctionalComponent<
      P extends unknown[] = unknown[],
      R = unknown,
    > {
      (...params: P): R;
    }

    interface Component {
      new (): HTMLElement;
    }

    interface Binding<T> {
      readonly value: T;
      readonly rawValue: Signal<T> | Ref<T> | T;
      readonly arg: string | null;
      readonly modifiers: { [key: string]: boolean } | null;
    }

    interface AppInjection {
      node: Node | null;
      cleanup: Cleanup | null;
      mounted: boolean;
      anchor: globalThis.Node | null;
      rootElement: DOMElement | null;
      currentNodes: globalThis.Node[] | null;
      directives: { [name: string]: Directive };
      components: { [name: string]: Component };
    }

    interface DirectiveRegistry {
      [name: string]: Directive<any>;
    }

    interface ComponentRegistry {
      [name: string]: Component;
    }

    interface Directive<T = unknown> {
      (elt: DOMElement, binding: Binding<T>): void;
    }
  }
}

export function createApp(rootComponent: jail.Component): jail.App;

export function createComponent<
  T extends (...args: unknown[]) => unknown,
  P extends Parameters<T>,
  R extends ReturnType<T>,
>(component: jail.FunctionalComponent<P, R>): jail.FunctionalComponent<P, R>;

export function directive<T>(name: string, directive: jail.Directive<T>): void;

export function mount(
  rootElement: jail.DOMElement,
  rootComponent: jail.Component,
): jail.Cleanup;

export function template(strings: TemplateStringsArray): DocumentFragment;
export function template(
  strings: TemplateStringsArray,
  ...args: unknown[]
): DocumentFragment;
