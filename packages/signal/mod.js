/// <reference types="./mod.d.ts" />
const Error = Symbol();
const Queue = new Set();
let isRunning = false;
let activeBranch = null;

export function tree(callback) {
  const localBranch = activeBranch = branch();
  try {
    return batch(() =>
      callback(
        callback.length === 0 ? undefined : clean.bind(localBranch, true),
      )
    );
  } catch (error) {
    handleError(error);
  } finally {
    activeBranch = localBranch.parentBranch;
  }
}

export function branchRef() {
  return activeBranch;
}

export function withBranch(branch, callback) {
  const previousBranch = activeBranch;
  activeBranch = branch;
  let result;
  try {
    result = callback();
  } catch (error) {
    handleError(error);
  } finally {
    activeBranch = previousBranch;
  }
  return result;
}

function branch(initialValue, onupdate) {
  const localBranch = {
    value: initialValue,
    parentBranch: activeBranch,
    childBranches: null,
    injections: null,
    cleanups: null,
    onupdate: onupdate || null,
    sources: null,
    sourceSlots: null,
  };
  if (activeBranch !== null) {
    addChild.call(activeBranch, localBranch);
  }
  return localBranch;
}

function addChild(branch) {
  if (this.childBranches === null) {
    this.childBranches = [branch];
  } else {
    this.childBranches.push(branch);
  }
}

export function mounted(callback) {
  effect(() => untrack(callback));
}

export function destroyed(callback) {
  cleaned(() => untrack(callback));
}

export function on(dependency, callback) {
  return ((currentValue) => {
    dependency();
    return untrack(() => callback(currentValue));
  });
}

export function effect(callback, initialValue) {
  if (activeBranch !== null) {
    const localBranch = branch(initialValue, callback);
    if (isRunning) {
      Queue.add(localBranch);
    } else {
      queueMicrotask(() => update.call(localBranch, false));
    }
  } else {
    queueMicrotask(() => callback(initialValue));
  }
}

export function computed(callback, initialValue) {
  const src = source(initialValue);
  effect(() => setValue.call(src, callback(src.value)));
  return getValue.bind(src);
}

function lookup(id) {
  return this !== null
    ? this.injections !== null && id in this.injections
      ? this.injections[id]
      : lookup.call(this.parentBranch, id)
    : undefined;
}

function source(initialValue) {
  return { value: initialValue, branches: null, branchSlots: null };
}

function getValue() {
  if (activeBranch !== null && activeBranch.onupdate !== null) {
    const sourceSlot = this.branches?.length || 0,
      branchSlot = activeBranch.sources?.length || 0;
    if (activeBranch.sources === null) {
      activeBranch.sources = [this];
      activeBranch.sourceSlots = [sourceSlot];
    } else {
      activeBranch.sources.push(this);
      activeBranch.sourceSlots.push(sourceSlot);
    }
    if (this.branches === null) {
      this.branches = [activeBranch];
      this.branchSlots = [branchSlot];
    } else {
      this.branches.push(activeBranch);
      this.branchSlots.push(branchSlot);
    }
  }
  return this.value;
}

function setValue(value) {
  if (typeof value === "function") {
    value = value(this.value);
  }
  this.value = value;
  queueBranches.call(this);
}

export function isReactive(data) {
  if (data == null) {
    return false;
  }
  if (typeof data === "function") {
    return true;
  }
  if (typeof data === "object" && "value" in data) {
    return true;
  }
  return false;
}

export function toValue(data) {
  return typeof data === "function" ? data() : data?.value || data;
}

function queueBranches() {
  if (this.branches?.length) {
    batch(() => {
      for (const branch of this.branches) {
        Queue.add(branch);
      }
    });
  }
}

function sourceValue(value) {
  return arguments.length === 1
    ? setValue.call(this, value)
    : getValue.call(this);
}

export function signal(initialValue) {
  return sourceValue.bind(source(initialValue));
}

export function ref(initialValue) {
  const src = source(initialValue);
  return {
    get value() {
      return getValue.call(src);
    },
    set value(nextValue) {
      setValue.call(src, nextValue);
    },
  };
}

function handleError(error) {
  const errorCallbacks = lookup.call(activeBranch, Error);
  if (!errorCallbacks) {
    return reportError(error);
  }
  for (const callback of errorCallbacks) {
    callback(error);
  }
}

export function catchError(callback) {
  if (activeBranch === null) {
    return;
  }
  if (activeBranch.injections === null) {
    activeBranch.injections = { [Error]: [callback] };
  } else {
    activeBranch.injections[Error].push(callback);
  }
}

export function cleaned(callback) {
  if (activeBranch === null) {
    return;
  }
  if (activeBranch.cleanups === null) {
    activeBranch.cleanups = [callback];
  } else {
    activeBranch.cleanups.push(callback);
  }
}

export function untrack(callback) {
  const branch = activeBranch;
  activeBranch = null;
  const result = callback();
  activeBranch = branch;
  return result;
}

function batch(callback) {
  if (isRunning) {
    return callback();
  }
  isRunning = true;
  const result = callback();
  queueMicrotask(flush);
  return result;
}

function flush() {
  if (isRunning === false) {
    return;
  }
  for (const branch of Queue) {
    Queue.delete(branch);
    update.call(branch, false);
  }
  isRunning = false;
}

function update(complete) {
  clean.call(this, complete);
  if (this.onupdate === null) {
    return;
  }
  const previousBranch = activeBranch;
  activeBranch = this;
  try {
    this.value = this.onupdate(this.value);
  } catch (error) {
    handleError(error);
  } finally {
    activeBranch = previousBranch;
  }
}

function cleanSources() {
  while (this.sources.length) {
    const source = this.sources.pop();
    const sourceSlot = this.sourceSlots.pop();
    if (source.branches?.length) {
      const sourceBranch = source.branches.pop();
      const branchSlot = source.branchSlots.pop();
      if (sourceSlot < source.branches.length) {
        source.branches[sourceSlot] = sourceBranch;
        source.branchSlots[sourceSlot] = branchSlot;
        sourceBranch.sourceSlots[branchSlot] = sourceSlot;
      }
    }
  }
}

function cleanChildBranches(complete) {
  const hasUpdateHandler = this.onupdate !== null;
  while (this.childBranches.length) {
    const childBranch = this.childBranches.pop();
    clean.call(
      childBranch,
      complete || (hasUpdateHandler && childBranch.onupdate !== null),
    );
  }
}

function clean(complete) {
  if (this.sources?.length) {
    cleanSources.call(this);
  }
  if (this.childBranches?.length) {
    cleanChildBranches.call(this, complete);
  }
  if (this.cleanups?.length) {
    cleanup.call(this);
  }
  this.injections = null;
  if (complete) {
    dispose.call(this);
  }
}

function cleanup() {
  while (this.cleanups.length) {
    this.cleanups.pop()();
  }
}

function dispose() {
  this.value = null;
  this.parentBranch = null;
  this.childBranches = null;
  this.cleanups = null;
  this.onupdate = null;
  this.sources = null;
  this.sourceSlots = null;
}

export function injection(defaultValue) {
  return {
    id: Symbol(),
    defaultValue,
    provide(value, callback) {
      return tree((cleanup) => {
        activeBranch.injections = { [this.id]: value };
        return callback(cleanup);
      });
    },
  };
}

export function inject(injection) {
  return lookup.call(activeBranch, injection.id) || injection.defaultValue;
}
