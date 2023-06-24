declare global {
  interface App {
    directive(name: string): Directive | undefined;
    directive(name: string, directive: Directive): App;
    component(
      name: `${string}-${string}`,
      rootComponent: Component,
      options?: ComponentOptions,
    ): App;
    mount(rootElement: Element): App;
    unmount(): App;
    run<T>(callback: () => T): T;
    use(plugin: AppPlugin): App;
  }

  type Directive<T = unknown> = {
    (elt: Element, binding: Binding<T>): Cleanup;
  };

  type AppPlugin = {
    install(app: App): void;
  };

  type Template = {
    fragment: DocumentFragment;
    attributes: number[] | null;
    insertions: number[] | null;
  };

  type ComponentOptions = {
    shadow?: boolean;
  };

  type Component<P extends unknown[] = unknown[], R = unknown> = {
    (...params: P): R;
  };

  type Binding<T> = {
    readonly value: T;
    readonly rawValue: Signal<T> | Ref<T> | T;
    readonly arg: string | null;
    readonly modifiers: { [name: string]: boolean } | null;
  };

  type AppInjection = {
    branch: Branch | null;
    cleanup: Cleanup | null;
    mounted: boolean;
    anchor: Node | null;
    rootElement: Element | null;
    currentNodes: Node[] | null;
    directives: { [name: string]: Directive };
    components: { [name: string]: { new (): HTMLElement } };
  };
}

export function createApp(rootComponent: Component): App;

export function component<
  T extends (...args: unknown[]) => unknown,
  P extends Parameters<T>,
  R extends ReturnType<T>,
>(component: Component<P, R>): Component<P, R>;

export function directive<T>(name: string, directive: Directive<T>): void;

export function mount(rootElement: Element, rootComponent: Component): Cleanup;

export function template(strings: TemplateStringsArray): DocumentFragment;
export function template(
  strings: TemplateStringsArray,
  ...args: unknown[]
): DocumentFragment;
