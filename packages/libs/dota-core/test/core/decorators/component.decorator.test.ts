import 'reflect-metadata';
import { BaseElement, Component, HelperUtils } from '@dota/core';
import { ComponentConfig, MethodDetails } from '@dota/core/types';
import { defineAndCreate, microtask } from '../../Utils.ts';

function getComponentConfig(ctor: any): ComponentConfig {
  return Reflect.getOwnMetadata('Component', ctor);
}

function getMethodMetadata(ctor: any): MethodDetails[] {
  return Reflect.getOwnMetadata(ctor.name, ctor) ?? [];
}

function getShadowMetadata(ctor: any): boolean | undefined {
  return Reflect.getOwnMetadata(ctor.name + ':shadow', ctor);
}

describe('@Component decorator – ComponentConfig metadata', () => {

  it('stores the selector in the Component metadata', () => {
    @Component({ selector: 'meta-selector-only', shadow: false })
    class TestComponent extends BaseElement {
      constructor() {
        super();
      }

      render() { return ``; }
    }

    const config = getComponentConfig(TestComponent);
    expect(config.selector).toBe('meta-selector-only');
  });

  it('stores shadow: false when shadow is explicitly false', () => {
    @Component({ selector: 'meta-shadow-false', shadow: false })
    class TestComponent extends BaseElement {
      constructor() {
        super();
      }

      render() { return ``; }
    }

    const config = getComponentConfig(TestComponent);
    expect(config.shadow).toBe(false);
  });

  it('stores shadow: true when shadow is explicitly true', () => {
    @Component({ selector: 'meta-shadow-true', shadow: true })
    class TestComponent extends BaseElement {
      constructor() {
        super();
      }

      render() { return ``; }
    }

    const config = getComponentConfig(TestComponent);
    expect(config.shadow).toBe(true);
  });

  it('stores shadow: undefined when the shadow option is omitted', () => {
    @Component({ selector: 'meta-shadow-omitted' })
    class TestComponent extends BaseElement {
      constructor() {
        super();
      }

      render() { return ``; }
    }

    const config = getComponentConfig(TestComponent);
    expect(config.shadow).toBeUndefined();
  });

  it('stores the complete config object so selector and shadow are always co-located', () => {
    @Component({ selector: 'meta-full-config', shadow: true })
    class TestComponent extends BaseElement {
      constructor() {
        super();
      }

      render() { return ``; }
    }

    const config = getComponentConfig(TestComponent);
    expect(config).toMatchObject({ selector: 'meta-full-config', shadow: true });
  });

  it('stores metadata on the constructor, not on its prototype or instances', () => {
    @Component({ selector: 'meta-on-constructor', shadow: false })
    class TestComponent extends BaseElement {
      constructor() {
        super();
      }

      render() { return ``; }
    }

    expect(Reflect.hasOwnMetadata('Component', TestComponent)).toBe(true);
    expect(Reflect.hasOwnMetadata('Component', TestComponent.prototype)).toBe(false);
  });

  it('two different classes store independent Component metadata', () => {
    @Component({ selector: 'meta-independent-a', shadow: false })
    class ComponentA extends BaseElement {
      constructor() {
        super();
      }

      render() {
        return ``;
      }
    }

    @Component({selector: 'meta-independent-b', shadow: true})
    class ComponentB extends BaseElement {
      constructor() {
        super();
      }

      render() { return ``; }
    }

    expect(getComponentConfig(ComponentA).selector).toBe('meta-independent-a');
    expect(getComponentConfig(ComponentB).selector).toBe('meta-independent-b');
    expect(getComponentConfig(ComponentA).shadow).toBe(false);
    expect(getComponentConfig(ComponentB).shadow).toBe(true);
  });
});

describe('@Component decorator – static constructor properties', () => {

  it('sets __dotaSelector to the configured selector string', () => {
    @Component({ selector: 'static-selector', shadow: false })
    class TestComponent extends BaseElement {
      constructor() {
        super();
      }

      render() {
        return ``;
      }
    }

    expect(HelperUtils.toDotaElementConstructor(TestComponent).__dotaSelector).toBe('static-selector');
  });

  it('sets __dotaShadow to false when shadow is false', () => {
    @Component({ selector: 'static-shadow-false', shadow: false })
    class TestComponent extends BaseElement {
      constructor() {
        super();
      }

      render() {
        return ``;
      }
    }

    expect(HelperUtils.toDotaElementConstructor(TestComponent).__dotaShadow).toBe(false);
  });

  it('sets __dotaShadow to true when shadow is true', () => {
    @Component({ selector: 'static-shadow-true', shadow: true })
    class TestComponent extends BaseElement {
      constructor() {
        super();
      }

      render() {
        return ``;
      }
    }

    expect(HelperUtils.toDotaElementConstructor(TestComponent).__dotaShadow).toBe(true);
  });

  it('sets __dotaShadow to undefined when the shadow option is omitted', () => {
    @Component({ selector: 'static-shadow-omitted' })
    class TestComponent extends BaseElement {
      constructor() {
        super();
      }

      render() {
        return ``;
      }
    }

    expect(HelperUtils.toDotaElementConstructor(TestComponent).__dotaShadow).toBeUndefined();
  });

  it('stores the shadow flag separately under the name:shadow metadata key', () => {
    @Component({ selector: 'static-named-shadow', shadow: true })
    class TestComponent extends BaseElement {
      constructor() {
        super();
      }

      render() { return ``; }
    }

    expect(getShadowMetadata(TestComponent)).toBe(true);
  });

  it('__dotaSelector on sibling classes are independent of each other', () => {
    @Component({ selector: 'static-sibling-a', shadow: false })
    class SiblingA extends BaseElement {
      constructor() {
        super();
      }

      render() {
        return ``;
      }
    }

    @Component({selector: 'static-sibling-b', shadow: false})
    class SiblingB extends BaseElement {
      constructor() {
        super();
      }

      render() {
        return ``;
      }
    }

    expect(HelperUtils.toDotaElementConstructor(SiblingA).__dotaSelector).toBe('static-sibling-a');
    expect(HelperUtils.toDotaElementConstructor(SiblingB).__dotaSelector).toBe('static-sibling-b');
  });
});

describe('@Component decorator – prototype method metadata', () => {

  it('collects all prototype methods except the constructor', () => {
    @Component({ selector: 'method-collection-basic', shadow: false })
    class TestComponent extends BaseElement {
      constructor() {
        super();
      }

      render() { return ``; }
      save() {}
      load() {}
    }

    const methods = getMethodMetadata(TestComponent);
    const names = methods.map(m => m.name);

    expect(names).toContain('render');
    expect(names).toContain('save');
    expect(names).toContain('load');
    expect(names).not.toContain('constructor');
  });

  it('stores the actual function reference for each method', () => {
    @Component({ selector: 'method-fn-ref', shadow: false })
    class TestComponent extends BaseElement {
      constructor() {
        super();
      }

      render() { return ``; }
      doWork() {}
    }

    const methods = getMethodMetadata(TestComponent);
    const doWork = methods.find(m => m.name === 'doWork');

    expect(typeof doWork?.method).toBe('function');
    expect(doWork?.method).toBe(TestComponent.prototype.doWork);
  });

  it('returns an empty method list when the component has no extra methods beyond render', () => {
    @Component({ selector: 'method-render-only', shadow: false })
    class TestComponent extends BaseElement {
      constructor() {
        super();
      }

      render() { return ``; }
    }

    const methods = getMethodMetadata(TestComponent);
    const names = methods.map(m => m.name);

    expect(names).toContain('render');
    expect(names.filter(n => n !== 'render').length).toBe(0);
  });

  it('stores method metadata under the class name key on the constructor', () => {
    @Component({ selector: 'method-key-check', shadow: false })
    class TestComponent extends BaseElement {
      constructor() {
        super();
      }

      render() { return ``; }
      submit() {}
    }

    expect(Reflect.hasOwnMetadata('TestComponent', TestComponent)).toBe(true);
  });

  it('method metadata of two sibling classes are stored independently', () => {
    @Component({ selector: 'method-sibling-a', shadow: false })
    class ComponentA extends BaseElement {
      constructor() {
        super();
      }

      render() {
        return ``;
      }

      methodA() {
      }
    }

    @Component({selector: 'method-sibling-b', shadow: false})
    class ComponentB extends BaseElement {
      constructor() {
        super();
      }

      render() { return ``; }
      methodB() {}
    }

    const namesA = getMethodMetadata(ComponentA).map(m => m.name);
    const namesB = getMethodMetadata(ComponentB).map(m => m.name);

    expect(namesA).toContain('methodA');
    expect(namesA).not.toContain('methodB');
    expect(namesB).toContain('methodB');
    expect(namesB).not.toContain('methodA');
  });
});

describe('@Component decorator – metadata retrieval via HelperUtils', () => {

  it('getComponentMetadata returns the stored ComponentConfig', () => {
    @Component({ selector: 'helper-read-config', shadow: false })
    class TestComponent extends BaseElement {
      constructor() {
        super();
      }

      render() { return ``; }
    }

    const config: ComponentConfig = HelperUtils.getComponentMetadata(TestComponent, 'Component');

    expect(config).toBeDefined();
    expect(config.selector).toBe('helper-read-config');
    expect(config.shadow).toBe(false);
  });

  it('getComponentMetadata returns undefined for a class without @Component', () => {
    class PlainClass {}

    const config = HelperUtils.getComponentMetadata(PlainClass, 'Component');
    expect(config).toBeUndefined();
  });

  it('getComponentMetadata returns the correct config for each of two decorated classes', () => {
    @Component({ selector: 'helper-multi-a', shadow: false })
    class ComponentA extends BaseElement {
      constructor() {
        super();
      }

      render() {
        return ``;
      }
    }

    @Component({selector: 'helper-multi-b', shadow: true})
    class ComponentB extends BaseElement {
      constructor() {
        super();
      }

      render() { return ``; }
    }

    const configA: ComponentConfig = HelperUtils.getComponentMetadata(ComponentA, 'Component');
    const configB: ComponentConfig = HelperUtils.getComponentMetadata(ComponentB, 'Component');

    expect(configA.selector).toBe('helper-multi-a');
    expect(configB.selector).toBe('helper-multi-b');
    expect(configA.shadow).toBe(false);
    expect(configB.shadow).toBe(true);
  });
});

describe('@Component decorator – custom element registration', () => {

  afterEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('defineAndCreate registers and instantiates the component using __dotaSelector', () => {
    @Component({ selector: 'runtime-registers', shadow: false })
    class TestComponent extends BaseElement {
      constructor() {
        super();
      }

      render() { return `<p>hello</p>`; }
    }

    const { el, tag } = defineAndCreate(TestComponent);

    expect(tag).toBe('runtime-registers');
    expect(el).toBeInstanceOf(TestComponent);
  });

  it('component is retrievable from the custom element registry after definition', () => {
    @Component({ selector: 'runtime-in-registry', shadow: false })
    class TestComponent extends BaseElement {
      constructor() {
        super();
      }

      render() { return ``; }
    }

    defineAndCreate(TestComponent);

    expect(customElements.get('runtime-in-registry')).toBe(TestComponent);
  });

  it('non-shadow component renders into its own innerHTML', async () => {
    @Component({ selector: 'runtime-no-shadow-html', shadow: false })
    class TestComponent extends BaseElement {
      constructor() {
        super();
      }

      render() { return `<span id="inner">content</span>`; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    expect(el.querySelector('#inner')).not.toBeNull();
    expect(el.shadowRoot).toBeFalsy();
  });

  it('shadow component renders into shadowRoot, not innerHTML', async () => {
    @Component({ selector: 'runtime-shadow-html', shadow: true })
    class TestComponent extends BaseElement {
      constructor() {
        super();
      }

      render() { return `<span id="inner">shadow content</span>`; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    expect(el.shadowRoot).not.toBeNull();
    expect(el.shadowRoot!.querySelector('#inner')).not.toBeNull();
    expect(el.querySelector('#inner')).toBeNull();
  });

  it('isShadow property on the instance matches the shadow config', async () => {
    @Component({ selector: 'runtime-is-shadow-flag', shadow: true })
    class TestComponent extends BaseElement {
      constructor() {
        super();
      }

      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    expect((el as any).isShadow).toBe(true);
  });

  it('isShadow is falsy on a non-shadow component', async () => {
    @Component({ selector: 'runtime-is-shadow-false-flag', shadow: false })
    class TestComponent extends BaseElement {
      constructor() {
        super();
      }

      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    expect((el as any).isShadow).toBeFalsy();
  });
});


