function sealed<T extends abstract new (...args: any[]) => any>(target: T): T {
  return target;
}

function entity(label: string): ClassDecorator {
  void label;

  return target => target;
}

function tag(value: unknown): ClassDecorator {
  void value;

  return target => target;
}

@sealed
@entity("widget")
@tag(42)
@tag("featured")
@tag(["alpha", "beta", 3])
@tag({kind: "widget", enabled: true, meta: {version: 1}})
class DecoratedWidget {
}

class FeatureRichWidget {
  label = "feature";
  static version = "1.0.0";
  #count = 0;

  constructor(value: number) {
    this.#count = value;
  }

  get value() {
    return this.#count;
  }

  set value(next: number) {
    this.#count = next;
  }

  methodA() {
    return this.label;
  }

  static methodB() {
    return this.version;
  }

  #reset() {
    this.#count = 0;
  }

  static {
    this.version = "1.0.0";
  }

  [key: string]: string | number | (() => string);
}

class EmptyWidget {
}
