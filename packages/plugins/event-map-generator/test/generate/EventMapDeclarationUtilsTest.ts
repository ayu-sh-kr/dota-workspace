import { describe, expect, it } from 'vitest';
import { EventMapModuleConstants } from '@dota/Constants.ts';
import { EventMapDeclarationUtils } from '@dota/generate/EventMapDeclarationUtils.ts';
import { renderExpectedEventMapDeclaration } from '@test/generate/EventMapDeclarationFixtures.ts';

describe('EventMapDeclarationUtils.createDeclaration', () => {
  it('rejects conflicting fully-resolved payloads for one event key', () => {
    expect(() => EventMapDeclarationUtils.createDeclaration([
      {
        name: 'shared:event',
        sourceFile: '/tmp/first.ts',
        kind: 'publish',
        payload: { text: 'string', isComplete: true, imports: [] },
      },
      {
        name: 'shared:event',
        sourceFile: '/tmp/second.ts',
        kind: 'publish',
        payload: { text: 'number', isComplete: true, imports: [] },
      },
    ])).toThrow('Conflicting payload types for "shared:event": string, number');
  });

  it('uses unknown for a legacy candidate without payload metadata', () => {
    const artifact = EventMapDeclarationUtils.createDeclaration(
      [{ name: 'legacy:event', sourceFile: '/tmp/legacy.ts', kind: 'decorator' }],
      { moduleSpecifier: '@example/app/events' },
    );

    expect(artifact).toEqual({
      names: ['legacy:event'],
      declaration: renderExpectedEventMapDeclaration(
        '@example/app/events',
        '    "legacy:event": unknown;',
      ),
    });
  });

  it('uses the richest incomplete payload when no candidate is fully resolved', () => {
    const artifact = EventMapDeclarationUtils.createDeclaration(
      [
        {
          name: 'partial:event',
          sourceFile: '/tmp/handler.ts',
          kind: 'decorator',
          payload: { text: 'any', isComplete: false, imports: [] },
        },
        {
          name: 'partial:event',
          sourceFile: '/tmp/publisher.ts',
          kind: 'publish',
          payload: { text: '{ id: string }', isComplete: false, imports: [] },
        },
      ],
      { moduleSpecifier: '@example/app/events' },
    );

    expect(artifact.declaration).toBe(renderExpectedEventMapDeclaration(
      '@example/app/events',
      '    "partial:event": { id: string };',
    ));
  });

  it('renders sorted payload types and lets a complete publisher override an unknown decorator', () => {
    const artifact = EventMapDeclarationUtils.createDeclaration(
      [
        {
          name: 'beta:event',
          sourceFile: '/tmp/b.ts',
          kind: 'publish',
          payload: { text: 'null', isComplete: true, imports: [] },
        },
        {
          name: 'alpha:event',
          sourceFile: '/tmp/a.ts',
          kind: 'decorator',
          payload: { text: 'unknown', isComplete: false, imports: [] },
        },
        {
          name: 'alpha:event',
          sourceFile: '/tmp/a.ts',
          kind: 'publish',
          payload: { text: '{ id: number }', isComplete: true, imports: [] },
        },
      ],
      { moduleSpecifier: '@example/app/events' },
    );

    expect(artifact.names).toEqual(['alpha:event', 'beta:event']);
    expect(artifact.declaration).toBe(renderExpectedEventMapDeclaration(
      '@example/app/events',
      [
        '    "alpha:event": { id: number };',
        '    "beta:event": null;',
      ].join('\n'),
    ));
  });

  it('deduplicates and sorts type imports before rendering their event entries', () => {
    const artifact = EventMapDeclarationUtils.createDeclaration(
      [
        {
          name: 'theme:change',
          sourceFile: '/workspace/src/theme.ts',
          kind: 'publish',
          payload: {
            text: 'ThemeName',
            isComplete: true,
            imports: [
              { name: 'ThemeName', moduleSpecifier: '@example/theme', sourceFile: '/workspace/src/theme.ts' },
              { name: 'ThemeName', moduleSpecifier: '@example/theme', sourceFile: '/workspace/src/theme.ts' },
            ],
          },
        },
        {
          name: 'accent:change',
          sourceFile: '/workspace/src/accent.ts',
          kind: 'publish',
          payload: {
            text: 'AccentName',
            isComplete: true,
            imports: [{ name: 'AccentName', moduleSpecifier: '@example/accent', sourceFile: '/workspace/src/accent.ts' }],
          },
        },
      ],
      { moduleSpecifier: '@example/app/events' },
    );

    expect(artifact.declaration).toBe(renderExpectedEventMapDeclaration(
      '@example/app/events',
      [
        '    "accent:change": AccentName;',
        '    "theme:change": ThemeName;',
      ].join('\n'),
      [
        'import type { AccentName } from "@example/accent";',
        'import type { ThemeName } from "@example/theme";',
      ],
    ));
  });

  it('rebases source-relative type imports from the generated declaration path', () => {
    const artifact = EventMapDeclarationUtils.createDeclaration(
      [{
        name: 'local:payload',
        sourceFile: '/workspace/src/features/payload.ts',
        kind: 'publish',
        payload: {
          text: 'LocalPayload',
          isComplete: true,
          imports: [{ name: 'LocalPayload', moduleSpecifier: './payload.ts', sourceFile: '/workspace/src/features/payload.ts' }],
        },
      }],
      { moduleSpecifier: '@example/app/events', outFile: '/workspace/src/generated/event-map.d.ts' },
    );

    expect(artifact.declaration).toBe(renderExpectedEventMapDeclaration(
      '@example/app/events',
      '    "local:payload": LocalPayload;',
      ['import type { LocalPayload } from "../features/payload.ts";'],
    ));
  });

  it('retains source-relative type imports when no generated declaration path is provided', () => {
    const artifact = EventMapDeclarationUtils.createDeclaration(
      [{
        name: 'local:payload',
        sourceFile: '/workspace/src/features/payload.ts',
        kind: 'publish',
        payload: {
          text: 'LocalPayload',
          isComplete: true,
          imports: [{ name: 'LocalPayload', moduleSpecifier: './payload.ts', sourceFile: '/workspace/src/features/payload.ts' }],
        },
      }],
      { moduleSpecifier: '@example/app/events' },
    );

    expect(artifact.declaration).toBe(renderExpectedEventMapDeclaration(
      '@example/app/events',
      '    "local:payload": LocalPayload;',
      ['import type { LocalPayload } from "./payload.ts";'],
    ));
  });

  it('uses the default module specifier and empty-state placeholder when no events are discovered', () => {
    const artifact = EventMapDeclarationUtils.createDeclaration([]);

    expect(artifact.names).toEqual([]);
    expect(artifact.declaration).toBe(renderExpectedEventMapDeclaration(
      EventMapModuleConstants.DEFAULT_MODULE_SPECIFIER,
      '    // No application events have been discovered yet.',
    ));
  });
});
