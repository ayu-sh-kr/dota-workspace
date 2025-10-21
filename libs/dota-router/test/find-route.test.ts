import {describe, it, expect, beforeEach} from 'vitest';
import {BaseElement} from '@ayu-sh-kr/dota-core';
import { RouteConfig } from '@dota/Types';
import { RouterUtils } from '@dota/RouterUtils';
import { resetNavigationEntries } from './setup/MockNavigationUtility';

// Mock classes for testing
class TestComponent extends BaseElement {

  constructor() {
    super();
  }

  render(): string {
    throw new Error('Method not implemented.');
  }
}

describe('RouterUtils Edge Cases', () => {
  beforeEach(() => {
    resetNavigationEntries();
  });

  it('should handle empty routes array', () => {
    const routes: RouteConfig<BaseElement>[] = [];
    expect(RouterUtils.findRoute('/any-path', routes)).toBeUndefined();
  });

  it('should handle deeply nested routes', () => {
    const routes: RouteConfig<BaseElement>[] = [
      {
        path: '/level1',
        component: TestComponent,
        children: [
          {
            path: '/level2',
            component: TestComponent,
            children: [
              {
                path: '/level3',
                component: TestComponent
              }
            ]
          }
        ]
      }
    ];

    const route = RouterUtils.findRoute('/level1/level2/level3', routes);
    expect(route).toBeDefined();
    expect(route?.path).toBe('/level3');
  });

  it('should handle routes with trailing slashes correctly', () => {
    const routes: RouteConfig<BaseElement>[] = [
      {
        path: '/path/',
        component: TestComponent
      }
    ];

    // Make sure the algorithm correctly distinguishes between
    // paths with and without trailing slashes
    expect(RouterUtils.findRoute('/path', routes)?.path).not.toBe('/path/');
    expect(RouterUtils.findRoute('/path/', routes)?.path).toBe('/path/');
  });

  it('should find the exact match if available without failing', () => {
    const routes: RouteConfig<BaseElement>[] = [
      {
        path: '/home',
        component: TestComponent,
        children: [
          {
            path: '/test',
            component: TestComponent
          }
        ]
      }
    ];

    expect(RouterUtils.findRoute('/home', routes)?.path).toBe('/home')
  });
});