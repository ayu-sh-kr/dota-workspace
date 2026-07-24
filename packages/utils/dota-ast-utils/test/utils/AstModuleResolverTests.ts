import {parseSync, type Expression, type Module} from '@swc/core';
import {describe, expect, it} from 'vitest';
import {AstModuleResolver} from '../../src/utils/AstModuleResolver.ts';
import type {AstModuleIndex, AstModuleResolutionOptions, ParsedAstModule as ParsedModule} from '../../src/Types.ts';

const eventNamePolicy = (name: string): boolean => /(?:^|_)EVENT(?:_|$)/.test(name)
  || /(?:^|[a-z0-9])Event(?:$|[A-Z0-9])/.test(name);

function parseModule(sourceText: string): Module {
  return parseSync(sourceText, {syntax: 'typescript', decorators: true}) as Module;
}

function createModule(sourceFile: string, sourceText: string): ParsedModule {
  return {sourceFile, sourceText, ast: parseModule(sourceText)};
}

function createEventIndex(modules: ParsedModule[]): AstModuleIndex {
  return AstModuleResolver.createIndex(modules, {isDeclarationNameEligible: eventNamePolicy});
}

function getPublishedNameExpression(module: Module, statementIndex: number): Expression {
  const statement = module.body[statementIndex];
  if (statement?.type !== 'ExpressionStatement' || statement.expression.type !== 'CallExpression') {
    throw new Error('Expected a publish expression statement');
  }

  const eventArgument = statement.expression.arguments[0]?.expression;
  if (eventArgument?.type !== 'ObjectExpression') {
    throw new Error('Expected a publish object argument');
  }

  const nameProperty = eventArgument.properties.find(property => property.type === 'KeyValueProperty'
    && ((property.key.type === 'Identifier' || property.key.type === 'StringLiteral') && property.key.value === 'name'));
  if (nameProperty?.type !== 'KeyValueProperty') {
    throw new Error('Expected a name property');
  }

  return nameProperty.value;
}

describe('AstModuleResolver.createIndex', () => {
  it('uses the caller policy to exclude unrelated declarations', () => {
    const module = createModule('/workspace/src/events.ts', `
      const USER_EVENT = 'user:event';
      const VALUE = 'unrelated:value';
      class EventGroup {
        static GROUP_EVENT = USER_EVENT;
        static VALUE = 'unrelated:property';
      }
      publisher.publish({name: VALUE});
    `);

    const index = createEventIndex([module]);

    expect(AstModuleResolver.resolve(getPublishedNameExpression(module.ast, 3), module, index)).toBeNull();
  });
});

describe('AstModuleResolver.resolve', () => {
  it('returns direct literals and transparent TypeScript wrappers', () => {
    const module = createModule('/workspace/src/events.ts', `
      const WRAPPED_EVENT = (('wrapped:event' as const))!;
      publisher.publish({name: WRAPPED_EVENT});
    `);
    const index = createEventIndex([module]);

    expect(AstModuleResolver.resolve(getPublishedNameExpression(module.ast, 1), module, index)).toBe('wrapped:event');
  });

  it('resolves same-file constants and static class properties', () => {
    const module = createModule('/workspace/src/events.ts', `
      const USER_CREATED_EVENT = 'user:created';
      class UserEvents {
        static readonly STATIC_EVENT = USER_CREATED_EVENT;
      }
      publisher.publish({name: UserEvents.STATIC_EVENT});
    `);
    const index = createEventIndex([module]);

    expect(AstModuleResolver.resolve(getPublishedNameExpression(module.ast, 2), module, index)).toBe('user:created');
  });

  it('follows named imports and re-export chains', () => {
    const source = createModule('/workspace/src/events.ts', `
      export const USER_CREATED_EVENT = 'user:created';
      export const DIRECT_WRAPPED_EVENT = ('wrapped:event' as const)!;
    `);
    const intermediary = createModule('/workspace/src/re-exports.ts', `
      export {USER_CREATED_EVENT as ReExportedUserCreatedEvent} from './events.ts';
    `);
    const consumer = createModule('/workspace/src/consumer.ts', `
      import {USER_CREATED_EVENT, DIRECT_WRAPPED_EVENT} from './events.ts';
      import {ReExportedUserCreatedEvent as CREATED} from './re-exports.ts';
      publisher.publish({name: USER_CREATED_EVENT});
      publisher.publish({name: DIRECT_WRAPPED_EVENT});
      publisher.publish({name: CREATED});
    `);
    const index = createEventIndex([source, intermediary, consumer]);

    expect(AstModuleResolver.resolve(getPublishedNameExpression(consumer.ast, 2), consumer, index)).toBe('user:created');
    expect(AstModuleResolver.resolve(getPublishedNameExpression(consumer.ast, 3), consumer, index)).toBe('wrapped:event');
    expect(AstModuleResolver.resolve(getPublishedNameExpression(consumer.ast, 4), consumer, index)).toBe('user:created');
  });

  it('follows exact and prefix aliases through the indexed module set', () => {
    const source = createModule('/workspace/src/blog-events.ts', `
      export const BLOG_INDEX_DATA_EVENT = 'blog:index-data';
    `);
    const consumer = createModule('/workspace/src/blog-consumer.ts', `
      import {BLOG_INDEX_DATA_EVENT} from '@dota/blog-events.ts';
      publisher.publish({name: BLOG_INDEX_DATA_EVENT});
    `);
    const index = createEventIndex([source, consumer]);
    const options: AstModuleResolutionOptions = {
      aliases: [{find: '@dota', replacement: '/workspace/src', kind: 'prefix'}],
    };

    expect(AstModuleResolver.resolve(getPublishedNameExpression(consumer.ast, 1), consumer, index, options)).toBe('blog:index-data');
  });

  it('supports satisfies wrappers, static string composition, and wildcard exports', () => {
    const source = createModule('/workspace/src/events.ts', `
      export const BLOG_INDEX_DATA_EVENT = ('blog:' + 'index-data') satisfies string;
    `);
    const barrel = createModule('/workspace/src/barrel.ts', `
      export * from './events.ts';
    `);
    const consumer = createModule('/workspace/src/consumer.ts', `
      import {BLOG_INDEX_DATA_EVENT} from './barrel.ts';
      publisher.publish({name: BLOG_INDEX_DATA_EVENT});
    `);
    const index = createEventIndex([source, barrel, consumer]);

    expect(AstModuleResolver.resolve(getPublishedNameExpression(consumer.ast, 1), consumer, index)).toBe('blog:index-data');
  });

  it('resolves namespace members and exposes failure reasons without fabricating names', () => {
    const source = createModule('/workspace/src/events.ts', `
      export const BLOG_INDEX_DATA_EVENT = 'blog:index-data';
    `);
    const consumer = createModule('/workspace/src/consumer.ts', `
      import * as BlogEvents from './events.ts';
      publisher.publish({name: BlogEvents.BLOG_INDEX_DATA_EVENT});
    `);
    const dynamic = createModule('/workspace/src/dynamic.ts', `
      declare const runtimeValue: string;
      publisher.publish({name: runtimeValue});
    `);
    const index = createEventIndex([source, consumer, dynamic]);

    expect(AstModuleResolver.resolve(getPublishedNameExpression(consumer.ast, 1), consumer, index)).toBe('blog:index-data');
    const result = AstModuleResolver.resolveWithTrace(getPublishedNameExpression(dynamic.ast, 1), dynamic, index);
    expect(result.value).toBeNull();
    expect(result.reason).toBe('binding-not-found');
    expect(result.trace.length).toBeGreaterThan(0);
  });

  it('resolves static members from a default-exported class', () => {
    const source = createModule('/workspace/src/events.ts', `
      export default class BlogEvents {
        static BLOG_INDEX_DATA_EVENT = 'blog:index-data';
      }
    `);
    const consumer = createModule('/workspace/src/consumer.ts', `
      import BlogEvents from './events.ts';
      publisher.publish({name: BlogEvents.BLOG_INDEX_DATA_EVENT});
    `);
    const index = createEventIndex([source, consumer]);

    expect(AstModuleResolver.resolve(getPublishedNameExpression(consumer.ast, 1), consumer, index)).toBe('blog:index-data');
  });

  it('does not use a module event when an inner parameter shadows the name', () => {
    const module = createModule('/workspace/src/events.ts', `
      const BLOG_INDEX_DATA_EVENT = 'blog:index-data';
      class Feature {
        publish(BLOG_INDEX_DATA_EVENT: string) {
          publisher.publish({name: BLOG_INDEX_DATA_EVENT});
        }
      }
    `);
    const index = createEventIndex([module]);
    const classDeclaration = module.ast.body[1];
    if (classDeclaration?.type !== 'ClassDeclaration') throw new Error('Expected class declaration');
    const method = classDeclaration.body[0];
    if (method?.type !== 'ClassMethod') throw new Error('Expected class method');
    const statement = method.function.body?.stmts[0];
    if (statement?.type !== 'ExpressionStatement' || statement.expression.type !== 'CallExpression') {
      throw new Error('Expected publish call');
    }
    const eventObject = statement.expression.arguments[0]?.expression;
    if (eventObject?.type !== 'ObjectExpression') throw new Error('Expected event object');
    const eventProperty = eventObject.properties[0];
    if (eventProperty?.type !== 'KeyValueProperty') throw new Error('Expected event name property');

    const result = AstModuleResolver.resolveWithTrace(eventProperty.value, module, index);
    expect(result.value).toBeNull();
    expect(result.reason).toBe('binding-shadowed');
  });

  it('returns null for missing modules, missing exports, and cyclic aliases', () => {
    const missingModule = createModule('/workspace/src/missing-consumer.ts', `
      import {MISSING_EVENT} from './missing.ts';
      publisher.publish({name: MISSING_EVENT});
    `);
    const missingExport = createModule('/workspace/src/missing-export.ts', `
      export const OTHER_EVENT = 'other:event';
    `);
    const missingExportConsumer = createModule('/workspace/src/missing-export-consumer.ts', `
      import {MISSING_EVENT} from './missing-export.ts';
      publisher.publish({name: MISSING_EVENT});
    `);
    const cycle = createModule('/workspace/src/cycle.ts', `
      const FIRST_EVENT = SECOND_EVENT;
      const SECOND_EVENT = FIRST_EVENT;
      publisher.publish({name: FIRST_EVENT});
    `);
    const modules = [missingModule, missingExport, missingExportConsumer, cycle];
    const index = createEventIndex(modules);

    expect(AstModuleResolver.resolve(getPublishedNameExpression(missingModule.ast, 1), missingModule, index)).toBeNull();
    expect(AstModuleResolver.resolve(getPublishedNameExpression(missingExportConsumer.ast, 1), missingExportConsumer, index)).toBeNull();
    expect(AstModuleResolver.resolve(getPublishedNameExpression(cycle.ast, 2), cycle, index)).toBeNull();
  });
});
