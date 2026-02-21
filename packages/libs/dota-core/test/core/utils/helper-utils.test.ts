import 'reflect-metadata';
import { BaseElement, Component, HelperUtils } from '@dota/core';
import { DotaElementConstructor } from '@dota/core/types';
import { defineAndCreate } from '../../Utils.ts';

describe('HelperUtils.fetchOrCreate', () => {

  it('returns a Map instance on first call', () => {
    const target = new (class Foo {})();
    const result = HelperUtils.fetchOrCreate(target, 'Test');

    expect(result).toBeInstanceOf(Map);
  });

  it('returns an empty Map when no entries have been added yet', () => {
    const target = new (class EmptyHost {})();
    const result = HelperUtils.fetchOrCreate(target, 'Empty');

    expect(result.size).toBe(0);
  });

  it('returns the same Map reference on repeated calls for the same target and appender', () => {
    const target = new (class Repeated {})();

    const first  = HelperUtils.fetchOrCreate(target, 'Prop');
    const second = HelperUtils.fetchOrCreate(target, 'Prop');

    expect(first).toBe(second);
  });

  it('persists entries written between calls', () => {
    const target = new (class Persistent {})();

    const map = HelperUtils.fetchOrCreate<string>(target, 'Store');
    map.set('key', 'value');

    const again = HelperUtils.fetchOrCreate<string>(target, 'Store');
    expect(again.get('key')).toBe('value');
  });

  it('builds the metadata key as ClassName:appender', () => {
    class KeyCheck {}
    const target = new KeyCheck();
    HelperUtils.fetchOrCreate(target, 'Bind');

    const key = 'KeyCheck:Bind';
    expect(Reflect.hasMetadata(key, target)).toBe(true);
  });

  it('uses the constructor name of the target instance, not a generic label', () => {
    class Alpha {}
    class Beta  {}

    const a = new Alpha();
    const b = new Beta();

    HelperUtils.fetchOrCreate(a, 'X');
    HelperUtils.fetchOrCreate(b, 'X');

    expect(Reflect.hasMetadata('Alpha:X', a)).toBe(true);
    expect(Reflect.hasMetadata('Beta:X',  b)).toBe(true);
    expect(Reflect.hasMetadata('Alpha:X', b)).toBe(false);
    expect(Reflect.hasMetadata('Beta:X',  a)).toBe(false);
  });

  it('different appenders on the same target produce independent Maps', () => {
    const target = new (class Multi {})();

    const bindMap  = HelperUtils.fetchOrCreate(target, 'Bind');
    const propMap  = HelperUtils.fetchOrCreate(target, 'Property');
    const stateMap = HelperUtils.fetchOrCreate(target, 'State');

    expect(bindMap).not.toBe(propMap);
    expect(propMap).not.toBe(stateMap);
    expect(bindMap).not.toBe(stateMap);
  });

  it('entries added to one appender do not appear in another appender of the same target', () => {
    const target = new (class Isolated {})();

    const mapA = HelperUtils.fetchOrCreate<string>(target, 'A');
    mapA.set('shared-key', 'from-A');

    const mapB = HelperUtils.fetchOrCreate<string>(target, 'B');
    expect(mapB.has('shared-key')).toBe(false);
  });

  it('two instances of the same class receive independent Maps for the same appender', () => {
    class SharedClass {}

    const instanceA = new SharedClass();
    const instanceB = new SharedClass();

    const mapA = HelperUtils.fetchOrCreate<string>(instanceA, 'Data');
    const mapB = HelperUtils.fetchOrCreate<string>(instanceB, 'Data');

    mapA.set('entry', 'A');

    expect(mapB.has('entry')).toBe(false);
    expect(mapA).not.toBe(mapB);
  });

  it('accepts a prototype object (class-level decoration pattern) as the target', () => {
    class ProtoTarget {}

    const map = HelperUtils.fetchOrCreate(ProtoTarget.prototype, 'Proto');
    expect(map).toBeInstanceOf(Map);
  });

  it('Map returned is the live reference — mutations are visible on the next call', () => {
    const target = new (class LiveRef {})();

    HelperUtils.fetchOrCreate<number>(target, 'Live').set('count', 1);
    HelperUtils.fetchOrCreate<number>(target, 'Live').set('count', 2);

    const final = HelperUtils.fetchOrCreate<number>(target, 'Live');
    expect(final.get('count')).toBe(2);
    expect(final.size).toBe(1);
  });
});

describe('HelperUtils.getComponentMetadata', () => {

  it('returns the value stored under the given key on the constructor', () => {
    class MyComp {}
    Reflect.defineMetadata('Component', { selector: 'my-comp', shadow: false }, MyComp);

    const result = HelperUtils.getComponentMetadata(MyComp, 'Component');
    expect(result).toEqual({ selector: 'my-comp', shadow: false });
  });

  it('returns undefined when no metadata exists for the given key', () => {
    class NoMeta {}

    const result = HelperUtils.getComponentMetadata(NoMeta, 'Component');
    expect(result).toBeUndefined();
  });

  it('returns undefined when the key exists on a parent but not on the class itself', () => {
    class Parent {}
    class Child extends Parent {}

    Reflect.defineMetadata('Component', { selector: 'parent' }, Parent);

    // getComponentMetadata uses hasOwnMetadata — must not traverse the prototype chain
    const result = HelperUtils.getComponentMetadata(Child, 'Component');
    expect(result).toBeUndefined();
  });

  it('returns own metadata when both parent and child define the same key', () => {
    class Base2 {}
    class Derived extends Base2 {}

    Reflect.defineMetadata('Component', { selector: 'base'    }, Base2);
    Reflect.defineMetadata('Component', { selector: 'derived' }, Derived);

    expect(HelperUtils.getComponentMetadata(Derived, 'Component').selector).toBe('derived');
    expect(HelperUtils.getComponentMetadata(Base2,   'Component').selector).toBe('base');
  });

  it('returns the correct config when used with an @Component-decorated class', () => {
    @Component({ selector: 'helper-decorated', shadow: true })
    class DecoratedComp extends BaseElement {
      render() { return ``; }
    }

    const config = HelperUtils.getComponentMetadata(DecoratedComp, 'Component');
    expect(config.selector).toBe('helper-decorated');
    expect(config.shadow).toBe(true);
  });

  it('two independently decorated classes return separate metadata objects', () => {
    @Component({ selector: 'helper-separate-a', shadow: false })
    class CompA extends BaseElement {
      render() { return ``; }
    }

    @Component({ selector: 'helper-separate-b', shadow: true })
    class CompB extends BaseElement {
      render() { return ``; }
    }

    const configA = HelperUtils.getComponentMetadata(CompA, 'Component');
    const configB = HelperUtils.getComponentMetadata(CompB, 'Component');

    expect(configA.selector).toBe('helper-separate-a');
    expect(configB.selector).toBe('helper-separate-b');
  });

  it('works with any arbitrary metadata key, not just Component', () => {
    class Arbitrary {}
    Reflect.defineMetadata('custom-key', { data: 42 }, Arbitrary);

    const result = HelperUtils.getComponentMetadata(Arbitrary, 'custom-key');
    expect(result).toEqual({ data: 42 });
  });

  it('returns undefined for a key that was deleted after being defined', () => {
    class Deletable {}
    Reflect.defineMetadata('temp', 'value', Deletable);
    Reflect.deleteMetadata('temp', Deletable);

    expect(HelperUtils.getComponentMetadata(Deletable, 'temp')).toBeUndefined();
  });
});

describe('HelperUtils.toDotaElementConstructor', () => {

  it('returns the constructor when passed a class that extends BaseElement', () => {
    @Component({ selector: 'to-dota-ctor', shadow: false })
    class ValidComp extends BaseElement {
      render() { return ``; }
    }

    const result = HelperUtils.toDotaElementConstructor(ValidComp);
    expect(result).toBe(ValidComp);
  });

  it('returns the constructor when passed an instance of a BaseElement subclass', () => {
    @Component({ selector: 'to-dota-instance', shadow: false })
    class ValidComp extends BaseElement {
      constructor() {
        super();
      }
      render() { return ``; }
    }

    const { el } = defineAndCreate(ValidComp);
    const result = HelperUtils.toDotaElementConstructor(el);

    expect(result).toBe(ValidComp);
  });

  it('the returned constructor carries __dotaSelector set by @Component', () => {
    @Component({ selector: 'to-dota-selector', shadow: false })
    class ValidComp extends BaseElement {
      render() { return ``; }
    }

    const ctor = HelperUtils.toDotaElementConstructor(ValidComp) as DotaElementConstructor;
    expect(ctor.__dotaSelector).toBe('to-dota-selector');
  });

  it('the returned constructor carries __dotaShadow set by @Component', () => {
    @Component({ selector: 'to-dota-shadow', shadow: true })
    class ValidComp extends BaseElement {
      render() { return ``; }
    }

    const ctor = HelperUtils.toDotaElementConstructor(ValidComp) as DotaElementConstructor;
    expect(ctor.__dotaShadow).toBe(true);
  });

  it('throws TypeError when passed a class that does not extend BaseElement', () => {
    class PlainClass {}

    expect(() => HelperUtils.toDotaElementConstructor(PlainClass))
      .toThrow(TypeError);
  });

  it('throws TypeError with the expected message for a non-BaseElement class', () => {
    class NotAnElement {}

    expect(() => HelperUtils.toDotaElementConstructor(NotAnElement))
      .toThrow('Target must extend BaseElement');
  });

  it('throws TypeError when passed null', () => {
    expect(() => HelperUtils.toDotaElementConstructor(null))
      .toThrow(TypeError);
  });

  it('throws TypeError when passed undefined', () => {
    expect(() => HelperUtils.toDotaElementConstructor(undefined))
      .toThrow(TypeError);
  });

  it('throws TypeError when passed a primitive number', () => {
    expect(() => HelperUtils.toDotaElementConstructor(42))
      .toThrow(TypeError);
  });

  it('throws TypeError when passed a plain object literal', () => {
    expect(() => HelperUtils.toDotaElementConstructor({}))
      .toThrow(TypeError);
  });

  it('throws TypeError when passed a plain string', () => {
    expect(() => HelperUtils.toDotaElementConstructor('my-element'))
      .toThrow(TypeError);
  });

  it('resolves the constructor from a deeply nested subclass of BaseElement', () => {
    @Component({ selector: 'to-dota-deep', shadow: false })
    class Level1 extends BaseElement {
      render() { return ``; }
    }

    class Level2 extends Level1 {
      render() { return ``; }
    }

    class Level3 extends Level2 {
      render() { return ``; }
    }

    const result = HelperUtils.toDotaElementConstructor(Level3);
    expect(result).toBe(Level3);
  });

  it('returns the same reference when called twice with the same constructor', () => {
    @Component({ selector: 'to-dota-idempotent', shadow: false })
    class ValidComp extends BaseElement {
      render() { return ``; }
    }

    const first  = HelperUtils.toDotaElementConstructor(ValidComp);
    const second = HelperUtils.toDotaElementConstructor(ValidComp);

    expect(first).toBe(second);
  });
});

