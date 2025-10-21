// Mock window.navigation for tests
class NavigationEntry {
  constructor(public readonly url: string) {}
}

class MockNavigation {
  private _entries: NavigationEntry[] = [];

  entries(): NavigationEntry[] {
    return this._entries;
  }

  // Method to add entries for testing
  _addEntry(url: string): void {
    this._entries.push(new NavigationEntry(url));
  }
}

// Setup global mocks
const mockNavigation = new MockNavigation();
Object.defineProperty(window, 'navigation', {
  value: mockNavigation,
  writable: true
});

// Helper to reset navigation entries between tests
export function resetNavigationEntries(): void {
  (window.navigation as any)._entries = [];
}

// Helper to add navigation entries for testing
export function addNavigationEntry(url: string): void {
  (window.navigation as any)._addEntry(url);
}