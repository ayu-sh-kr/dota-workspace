import {afterEach, describe, expect, it} from 'vitest';
import {extendTheme, registerTheme, resolveTheme, THEMES} from '@dota/themes.ts';
import {flatMarkdownTheme} from '@dota/md-themes';

afterEach(() => {
  delete THEMES.brand;
});

describe('extendTheme', () => {
  it('overrides single tags and tokens while keeping the rest of the base theme', () => {
    const brand = extendTheme(flatMarkdownTheme, {
      name: 'brand',
      typography: {pre: 'brand-code'},
      color: {
        indigo: {a: {text: 'text-brand'}},
        primary: {selection: 'selection:bg-brand', hr: {border: 'border-brand'}},
      },
    });

    expect(brand.fontFamily).toBe(flatMarkdownTheme.fontFamily);
    expect(brand.typography.pre).toBe('brand-code');
    expect(brand.typography.h1).toBe(flatMarkdownTheme.typography.h1);
    expect(brand.color.indigo?.a).toEqual({...flatMarkdownTheme.color.indigo?.a, text: 'text-brand'});
    expect(brand.color.indigo?.p).toBe(flatMarkdownTheme.color.indigo?.p);
    expect(brand.color.primary).toEqual({selection: 'selection:bg-brand', hr: {border: 'border-brand'}});
    expect(flatMarkdownTheme.color.indigo?.a?.text).not.toBe('text-brand');
  });
});

describe('registerTheme and resolveTheme', () => {
  it('resolves registered themes by name and falls back to flat', () => {
    const brand = registerTheme({...flatMarkdownTheme, name: 'brand'});

    expect(resolveTheme('brand')).toBe(brand);
    expect(resolveTheme('missing')).toBe(flatMarkdownTheme);
    expect(resolveTheme(undefined)).toBe(flatMarkdownTheme);
  });
});
