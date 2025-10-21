import {describe, it, expect, beforeEach, vi, afterEach} from 'vitest';
import {RouterUtils} from '@dota/RouterUtils';
import {BaseElement} from '@ayu-sh-kr/dota-core';
import {RouteConfig, Router, RenderConfig} from '@dota/Types';
import 'reflect-metadata';
import {resetNavigationEntries} from "@test/setup/MockNavigationUtility";

// Mock classes
class TestComponent extends BaseElement {

  constructor() {
    super();
  }

  render(): string {
    throw new Error('Method not implemented.');
  }

}

class ErrorComponent extends BaseElement {

  constructor() {
    super();
  }

  render(): string {
    throw new Error('Method not implemented.');
  }
}

describe('RouterUtils render method', () => {
  // Setup DOM for tests
  beforeEach(() => {
    resetNavigationEntries();

    // Create app-root element
    const appRoot = document.createElement('div');
    appRoot.id = 'app-root';
    document.body.appendChild(appRoot);

    // Mock Reflect metadata
    vi.spyOn(Reflect, 'hasOwnMetadata').mockImplementation(() => true);
    vi.spyOn(Reflect, 'getOwnMetadata').mockImplementation(() => ({selector: 'test-component'}));
  });

  afterEach(() => {
    // Clean up
    document.body.innerHTML = '';
  });

  it('should render component for a valid route', () => {
    // Create mock route configuration
    const routes: RouteConfig<BaseElement>[] = [
      {
        path: '/test',
        component: TestComponent
      }
    ];

    // Create mock router
    const router: Router<BaseElement> = {
      routes,
      errorRoute: {
        path: '/error',
        component: ErrorComponent
      },
      defaultRoute: {
        path: '/',
        component: TestComponent
      },
      init: vi.fn()
    };

    // Test render method
    const config: RenderConfig<BaseElement> = {
      path: '/test',
      routes,
      router
    };

    RouterUtils.render(config);

    // Assert that the component was rendered
    expect(document.querySelector('#app-root')?.innerHTML).toContain('<test-component path="/test"></test-component>');
  });

  it('should render error component for invalid route', () => {
    // Mock route method to test error handling
    vi.spyOn(RouterUtils, 'route').mockImplementation(() => {
    });

    // Create mock router
    const router: Router<BaseElement> = {
      routes: [],
      errorRoute: {
        path: '/error',
        component: ErrorComponent
      },
      defaultRoute: {
        path: '/',
        component: TestComponent
      },
      init: vi.fn()
    };

    // Test render method with invalid path
    const config: RenderConfig<BaseElement> = {
      path: '/nonexistent',
      routes: [],
      router
    };

    RouterUtils.render(config);

    // Assert that the router.route method was called with error path
    expect(RouterUtils.route).toHaveBeenCalledWith(router, '/error', {message: 'Path not found'});
  });

  it('should use custom render function when available', () => {
    const customRender = vi.fn();

    // Create mock route with render function
    const routes: RouteConfig<BaseElement>[] = [
      {
        path: '/custom',
        component: TestComponent,
        render: customRender
      }
    ];

    // Create mock router
    const router: Router<BaseElement> = {
      routes,
      errorRoute: {
        path: '/error',
        component: ErrorComponent
      },
      defaultRoute: {
        path: '/',
        component: TestComponent
      },
      init: vi.fn()
    };

    // Test render method
    const config: RenderConfig<BaseElement> = {
      path: '/custom',
      routes,
      router
    };

    // Spy on console.info
    const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {
    });

    RouterUtils.render(config);

    // Assert that custom render was called
    expect(customRender).toHaveBeenCalledWith('/custom');
    expect(consoleInfoSpy).toHaveBeenCalled();
  });
});