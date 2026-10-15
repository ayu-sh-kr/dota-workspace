import { Metadata, MetadataKey } from '@dota/metadata/index.ts';

const ENTRIES = MetadataKey.map<number>('test.entries');
const LABEL = MetadataKey.value<string>('test.label');

describe('Metadata – owners', () => {

  it('resolves a class, its prototype, and its instances to the same record', () => {
    class Owner {}

    const record = Metadata.for(Owner);
    expect(Metadata.for(Owner.prototype)).toBe(record);
    expect(Metadata.for(new Owner())).toBe(record);
  });

  it('returns the record from every write so calls chain', () => {
    class Chained {}

    const record = Metadata.for(Chained);
    expect(record.set(LABEL, 'a').add(ENTRIES, 'x', 1)).toBe(record);
  });

  it('gives a plain object its own record instead of Object\'s', () => {
    const plain = {};
    Metadata.for(plain).set(LABEL, 'plain');

    expect(Metadata.for({}).get(LABEL)).toBeUndefined();
    expect(Metadata.for(plain).get(LABEL)).toBe('plain');
  });

  it('keeps sibling classes separate', () => {
    class A {}
    class B {}
    Metadata.for(A).add(ENTRIES, 'a', 1);

    expect(Metadata.for(B).get(ENTRIES).size).toBe(0);
  });
});

describe('Metadata – scoping', () => {

  it('treats keys created with the same name as distinct', () => {
    const first = MetadataKey.value<string>('test.same');
    const second = MetadataKey.value<string>('test.same');
    class Owner {}
    Metadata.for(Owner).set(first, 'first');

    expect(Metadata.for(Owner).get(second)).toBeUndefined();
    expect(Metadata.for(Owner).get(first)).toBe('first');
  });

  it('separates own metadata from inherited metadata', () => {
    class Parent {}
    class Child extends Parent {}
    Metadata.for(Parent).add(ENTRIES, 'p', 1).set(LABEL, 'parent');

    expect(Metadata.for(Child).own(ENTRIES).size).toBe(0);
    expect(Metadata.for(Child).own(LABEL)).toBeUndefined();
    expect(Metadata.for(Child).get(LABEL)).toBe('parent');
  });
});

describe('Metadata – inheritance', () => {

  it('merges map entries base first and lets a subclass replace an entry', () => {
    class Base {}
    class Middle extends Base {}
    class Leaf extends Middle {}
    Metadata.for(Base).add(ENTRIES, 'a', 1).add(ENTRIES, 'b', 2);
    Metadata.for(Leaf).add(ENTRIES, 'b', 20).add(ENTRIES, 'c', 3);

    expect([...Metadata.for(Leaf).get(ENTRIES)]).toEqual([['a', 1], ['b', 20], ['c', 3]]);
    expect([...Metadata.for(Base).get(ENTRIES)]).toEqual([['a', 1], ['b', 2]]);
  });

  it('reads the nearest value key', () => {
    class Base {}
    class Leaf extends Base {}
    Metadata.for(Base).set(LABEL, 'base');
    Metadata.for(Leaf).set(LABEL, 'leaf');

    expect(Metadata.for(Leaf).get(LABEL)).toBe('leaf');
    expect(Metadata.for(Base).get(LABEL)).toBe('base');
  });

  it('sees a parent write made after the child was first read', () => {
    class Base {}
    class Leaf extends Base {}
    expect(Metadata.for(Leaf).has(ENTRIES)).toBe(false);

    Metadata.for(Base).add(ENTRIES, 'late', 1);
    expect(Metadata.for(Leaf).get(ENTRIES).get('late')).toBe(1);
  });

  it('returns the same cached map until something is written', () => {
    class Cached {}
    Metadata.for(Cached).add(ENTRIES, 'a', 1);

    const first = Metadata.for(Cached).get(ENTRIES);
    expect(Metadata.for(new Cached()).get(ENTRIES)).toBe(first);

    Metadata.for(Cached).add(ENTRIES, 'b', 2);
    expect(Metadata.for(Cached).get(ENTRIES)).not.toBe(first);
  });
});

describe('Metadata – modification', () => {

  it('update receives the current own entry', () => {
    class Owner {}
    Metadata.for(Owner)
      .update(ENTRIES, 'n', (current) => (current ?? 0) + 1)
      .update(ENTRIES, 'n', (current) => (current ?? 0) + 1);

    expect(Metadata.for(Owner).get(ENTRIES).get('n')).toBe(2);
  });

  it('delete removes own entries and keeps inherited ones', () => {
    class Base {}
    class Leaf extends Base {}
    Metadata.for(Base).add(ENTRIES, 'shared', 1);
    Metadata.for(Leaf).add(ENTRIES, 'shared', 2).add(ENTRIES, 'own', 3);

    Metadata.for(Leaf).delete(ENTRIES, 'shared');
    expect([...Metadata.for(Leaf).get(ENTRIES)]).toEqual([['shared', 1], ['own', 3]]);

    Metadata.for(Leaf).delete(ENTRIES);
    expect([...Metadata.for(Leaf).get(ENTRIES)]).toEqual([['shared', 1]]);
  });
});

describe('Metadata – standard decorator contexts', () => {
  const metadataSymbol: symbol = (Symbol as any).metadata ?? Symbol.for('Symbol.metadata');

  beforeAll(() => {
    (Symbol as any).metadata ??= metadataSymbol;
  });

  it('writes through a context into the class\'s Symbol.metadata object', () => {
    const metadata = Object.create(null);
    Metadata.for({ kind: 'field', metadata }).add(ENTRIES, 'field', 1);

    class Standard {}
    Object.defineProperty(Standard, metadataSymbol, { value: metadata });

    expect(Metadata.for(Standard).get(ENTRIES).get('field')).toBe(1);
  });

  it('merges standard and legacy metadata along one inheritance chain', () => {
    class LegacyBase {}
    Metadata.for(LegacyBase).add(ENTRIES, 'legacy', 1);

    const metadata = Object.create(null);
    Metadata.for({ kind: 'method', metadata }).add(ENTRIES, 'standard', 2);
    class StandardChild extends LegacyBase {}
    Object.defineProperty(StandardChild, metadataSymbol, { value: metadata });

    expect([...Metadata.for(StandardChild).get(ENTRIES)]).toEqual([['legacy', 1], ['standard', 2]]);
  });

  it('prefers a class\'s standard metadata over its legacy metadata', () => {
    const metadata = Object.create(null);
    class Mixed {}
    Metadata.for(Mixed).set(LABEL, 'legacy');
    Metadata.for({ kind: 'class', metadata }).set(LABEL, 'standard');
    Object.defineProperty(Mixed, metadataSymbol, { value: metadata });

    expect(Metadata.for(Mixed).get(LABEL)).toBe('standard');
  });

  it('follows the metadata object prototype chain for context-only reads', () => {
    const parent = Object.create(null);
    const child = Object.create(parent);
    Metadata.for(parent).add(ENTRIES, 'parent', 1);

    expect(Metadata.for({ kind: 'class', metadata: child }).get(ENTRIES).get('parent')).toBe(1);
  });

  it('rejects a context without metadata', () => {
    expect(() => Metadata.for({ kind: 'field', metadata: undefined })).toThrow(/Symbol.metadata/);
  });
});
