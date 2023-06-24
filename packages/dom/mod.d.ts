declare global {
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

    component<K extends keyof ComponentRegistry>(
      name: K,
      rootComponent: ComponentRegistry[K],
      options?: ComponentOptions,
    ): App;
    component(
      name: `${string}-${string}`,
      rootComponent: Component,
      options?: ComponentOptions,
    ): App;
    component<K extends keyof ComponentRegistry>(
      name: K,
    ): ComponentRegistry[K] | undefined;
    component(name: `${string}-${string}`): Component | undefined;

    mount(rootElement: Element): App;
    unmount(): App;
    run<T>(callback: () => T): T;
    use(plugin: AppPlugin): App;
  }

  interface Directive<T = unknown> {
    (elt: Element, binding: Binding<T>): Cleanup;
  }

  interface AppPlugin {
    install(app: App): void;
  }

  interface Template {
    fragment: DocumentFragment;
    attributes: number[] | null;
    insertions: number[] | null;
  }

  interface ComponentOptions {
    shadow?: boolean;
  }

  interface FunctionalComponent<P extends unknown[] = unknown[], R = unknown> {
    (...params: P): R;
  }

  interface Component {
    new (): HTMLElement;
  }

  interface Binding<T> {
    readonly value: T;
    readonly rawValue: Signal<T> | Ref<T> | T;
    readonly arg: string | null;
    readonly modifiers: { [name: string]: boolean } | null;
  }

  interface AppInjection {
    branch: Branch | null;
    cleanup: Cleanup | null;
    mounted: boolean;
    anchor: Node | null;
    rootElement: Element | null;
    currentNodes: Node[] | null;
    directives: { [name: string]: Directive };
    components: { [name: string]: Component };
  }

  interface DirectiveRegistry {
    [name: string]: Directive<any>;
  }

  interface ComponentRegistry {
    [name: `${string}-${string}`]: Component;
  }
}

export function createApp(rootComponent: Component): App;

export function component<
  T extends (...args: unknown[]) => unknown,
  P extends Parameters<T>,
  R extends ReturnType<T>,
>(component: FunctionalComponent<P, R>): FunctionalComponent<P, R>;

export function directive<T>(name: string, directive: Directive<T>): void;

export function mount(rootElement: Element, rootComponent: Component): Cleanup;

export function template(strings: TemplateStringsArray): DocumentFragment;
export function template(
  strings: TemplateStringsArray,
  ...args: unknown[]
): DocumentFragment;
