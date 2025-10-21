import {describe, it, expect} from 'vitest';
import {BaseElement} from '@ayu-sh-kr/dota-core';
import {ComponentClass} from '@dota/Types';
import { RouterUtils } from '@dota/RouterUtils';
import { Route } from '@dota/route.decorator';
import 'reflect-metadata';

// Mock components for testing
class HomePage extends BaseElement {
  constructor() {
    super();
  }
  render(): string {
    return '<div>Home Page</div>';
  }
}

class AboutPage extends BaseElement {
  constructor() {
    super();
  }
  render(): string {
    return '<div>About Page</div>';
  }
}

class ContactPage extends BaseElement {
  constructor() {
    super();
  }
  render(): string {
    return '<div>Contact Page</div>';
  }
}

class DocsPage extends BaseElement {
  constructor() {
    super();
  }
  render(): string {
    return '<div>Docs Page</div>';
  }
}

class DocsGuidePage extends BaseElement {
  constructor() {
    super();
  }
  render(): string {
    return '<div>Docs Guide Page</div>';
  }
}

class DocsApiPage extends BaseElement {
  constructor() {
    super();
  }
  render(): string {
    return '<div>Docs API Page</div>';
  }
}

class DocsApiMethodsPage extends BaseElement {
  constructor() {
    super();
  }
  render(): string {
    return '<div>Docs API Methods Page</div>';
  }
}

class DocsApiPropertiesPage extends BaseElement {
  constructor() {
    super();
  }
  render(): string {
    return '<div>Docs API Properties Page</div>';
  }
}

// Apply route decorators to create test scenarios
@Route({ path: '/', component: HomePage })
class HomeComponent extends HomePage {}

@Route({ path: '/about', component: AboutPage })
class AboutComponent extends AboutPage {}

@Route({ path: '/contact', component: ContactPage })
class ContactComponent extends ContactPage {}

@Route({ path: '/docs', component: DocsPage })
class DocsComponent extends DocsPage {}

@Route({ path: '/docs/guide', component: DocsGuidePage })
class DocsGuideComponent extends DocsGuidePage {}

@Route({ path: '/docs/api', component: DocsApiPage })
class DocsApiComponent extends DocsApiPage {}

@Route({ path: '/docs/api/methods', component: DocsApiMethodsPage })
class DocsApiMethodsComponent extends DocsApiMethodsPage {}

@Route({ path: '/docs/api/properties', component: DocsApiPropertiesPage })
class DocsApiPropertiesComponent extends DocsApiPropertiesPage {}

describe('RouterUtils.prepareConfig', () => {

  describe('Case 1: 0 routes', () => {
    it('should return empty array when no elements provided', () => {
      const elements: ComponentClass<HTMLElement>[] = [];
      const result = RouterUtils.prepareConfig(elements);

      expect(result).toEqual([]);
      expect(result.length).toBe(0);
    });

    it('should return empty array when elements have no route metadata', () => {
      // Create elements without route decorators
      const elements = [HomePage, AboutPage];

      const result = RouterUtils.prepareConfig(elements);

      expect(result).toEqual([]);
      expect(result.length).toBe(0);
    });
  });

  describe('Case 2: Multiple routes with no children', () => {
    it('should return flat route structure for simple routes', () => {
      const elements = [
        HomeComponent,
        AboutComponent,
        ContactComponent
      ];

      const result = RouterUtils.prepareConfig(elements);

      expect(result).toHaveLength(3);

      // Check that all routes are top-level
      const paths = result.map(route => route.path);
      expect(paths).toContain('/');
      expect(paths).toContain('/about');
      expect(paths).toContain('/contact');

      // Verify no children exist
      result.forEach(route => {
        expect(route.children).toEqual([]);
      });
    });

    it('should preserve route configuration properties', () => {
      const elements = [
        HomeComponent,
        AboutComponent
      ];

      const result = RouterUtils.prepareConfig(elements);

      const homeRoute = result.find(route => route.path === '/');
      const aboutRoute = result.find(route => route.path === '/about');

      expect(homeRoute).toBeDefined();
      expect(homeRoute!.component).toBe(HomePage);
      expect(aboutRoute).toBeDefined();
      expect(aboutRoute!.component).toBe(AboutPage);
    });
  });

  describe('Case 3: Multiple routes with children', () => {
    it('should build hierarchy with parent-child relationships', () => {
      const elements = [
        HomeComponent,
        DocsComponent,
        DocsGuideComponent,
        DocsApiComponent
      ];

      const result = RouterUtils.prepareConfig(elements);

      // Should have 2 top-level routes: '/' and '/docs'
      expect(result).toHaveLength(2);

      const homeRoute = result.find(route => route.path === '/');
      const docsRoute = result.find(route => route.path === '/docs');

      expect(homeRoute).toBeDefined();
      expect(homeRoute!.children).toEqual([]);

      expect(docsRoute).toBeDefined();
      expect(docsRoute!.children).toHaveLength(2);

      const childPaths = docsRoute!.children!.map(child => child.path);
      expect(childPaths).toContain('/docs/guide');
      expect(childPaths).toContain('/docs/api');
    });

    it('should handle multiple parent routes with their own children', () => {
      // Create additional parent route for testing
      @Route({ path: '/blog', component: AboutPage })
      class BlogComponent extends AboutPage {}

      @Route({ path: '/blog/posts', component: ContactPage })
      class BlogPostsComponent extends ContactPage {}

      const elements = [
        DocsComponent,
        DocsGuideComponent,
        BlogComponent,
        BlogPostsComponent
      ];

      const result = RouterUtils.prepareConfig(elements);

      expect(result).toHaveLength(2);

      const docsRoute = result.find(route => route.path === '/docs');
      const blogRoute = result.find(route => route.path === '/blog');

      expect(docsRoute!.children).toHaveLength(1);
      expect(docsRoute!.children![0].path).toBe('/docs/guide');

      expect(blogRoute!.children).toHaveLength(1);
      expect(blogRoute!.children![0].path).toBe('/blog/posts');
    });
  });

  describe('Case 4: Multiple routes with children having children (nested hierarchy)', () => {
    it('should build deep nested hierarchy correctly', () => {
      const elements = [
        DocsComponent,
        DocsApiComponent,
        DocsApiMethodsComponent,
        DocsApiPropertiesComponent
      ];

      const result = RouterUtils.prepareConfig(elements);

      // Should have 1 top-level route: '/docs'
      expect(result).toHaveLength(1);

      const docsRoute = result[0];
      expect(docsRoute.path).toBe('/docs');
      expect(docsRoute.children).toHaveLength(1);

      // Check '/docs/api' as child of '/docs'
      const apiRoute = docsRoute.children![0];
      expect(apiRoute.path).toBe('/docs/api');
      expect(apiRoute.children).toHaveLength(2);

      // Check grandchildren of '/docs'
      const grandChildPaths = apiRoute.children!.map(child => child.path);
      expect(grandChildPaths).toContain('/docs/api/methods');
      expect(grandChildPaths).toContain('/docs/api/properties');

      // Verify grandchildren have no children
      apiRoute.children!.forEach(grandchild => {
        expect(grandchild.children).toEqual([]);
      });
    });

    it('should handle complex mixed hierarchy', () => {
      // Create a complex scenario with multiple levels
      @Route({ path: '/user', component: HomePage })
      class UserComponent extends HomePage {}

      @Route({ path: '/user/profile', component: AboutPage })
      class UserProfileComponent extends AboutPage {}

      @Route({ path: '/user/profile/settings', component: ContactPage })
      class UserProfileSettingsComponent extends ContactPage {}

      @Route({ path: '/user/profile/preferences', component: DocsPage })
      class UserProfilePreferencesComponent extends DocsPage {}

      const elements = [
        HomeComponent,
        UserComponent,
        UserProfileComponent,
        UserProfileSettingsComponent,
        UserProfilePreferencesComponent,
        DocsComponent,
        DocsApiComponent,
        DocsApiMethodsComponent
      ];

      const result = RouterUtils.prepareConfig(elements);

      // Should have 3 top-level routes: '/', '/user', '/docs'
      expect(result).toHaveLength(3);

      const userRoute = result.find(route => route.path === '/user');
      expect(userRoute).toBeDefined();
      expect(userRoute!.children).toHaveLength(1);

      const profileRoute = userRoute!.children![0];
      expect(profileRoute.path).toBe('/user/profile');
      expect(profileRoute.children).toHaveLength(2);

      const profileChildPaths = profileRoute.children!.map(child => child.path);
      expect(profileChildPaths).toContain('/user/profile/settings');
      expect(profileChildPaths).toContain('/user/profile/preferences');
    });

    it('should handle orphaned routes correctly', () => {
      // Create routes where children exist but parents don't
      @Route({ path: '/missing/child', component: HomePage })
      class OrphanedChildComponent extends HomePage {}

      const elements = [
        HomeComponent,
        OrphanedChildComponent // Parent '/missing' doesn't exist
      ];

      const result = RouterUtils.prepareConfig(elements);

      // Both should be top-level since '/missing' parent doesn't exist
      expect(result).toHaveLength(2);

      const paths = result.map(route => route.path);
      expect(paths).toContain('/');
      expect(paths).toContain('/missing/child');

      // Orphaned route should have no children
      const orphanedRoute = result.find(route => route.path === '/missing/child');
      expect(orphanedRoute!.children).toEqual([]);
    });
  });

  describe('Edge cases and validation', () => {
    it('should handle duplicate paths correctly', () => {
      // Create multiple elements with same route path
      @Route({ path: '/duplicate', component: HomePage })
      class DuplicateComponent1 extends HomePage {}

      @Route({ path: '/duplicate', component: AboutPage })
      class DuplicateComponent2 extends AboutPage {}

      const elements = [
        DuplicateComponent1,
        DuplicateComponent2
      ];

      const result = RouterUtils.prepareConfig(elements);

      // Should handle duplicates (last one wins due to Map behavior)
      expect(result).toHaveLength(1);
      expect(result[0].path).toBe('/duplicate');
      expect(result[0].component).toBe(AboutPage); // Last one should win
    });

    it('should preserve route configuration with custom render function', () => {
      const customRender = (path: string) => console.log(`Rendering ${path}`);

      @Route({
        path: '/custom',
        component: HomePage,
        render: customRender
      })
      class CustomRenderComponent extends HomePage {}

      const elements = [CustomRenderComponent];
      const result = RouterUtils.prepareConfig(elements);

      expect(result).toHaveLength(1);
      expect(result[0].render).toBe(customRender);
    });
  });
});
