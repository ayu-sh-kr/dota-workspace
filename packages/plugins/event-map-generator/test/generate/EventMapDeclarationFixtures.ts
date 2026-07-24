/**
 * Renders the stable declaration wrapper shared by event-map output assertions.
 * Tests provide only the varying module, body, and optional type imports.
 * @param moduleSpecifier - Module augmented by the generated declaration.
 * @param bodyLine - One or more fully indented interface-body lines.
 * @param imports - Sorted type-only import statements rendered before the declaration.
 * @returns Complete expected declaration text.
 */
export function renderExpectedEventMapDeclaration(moduleSpecifier: string, bodyLine: string, imports: string[] = []): string {
  return [
    'export {};',
    ...(imports.length === 0 ? [] : ['', ...imports]),
    '',
    '// Auto-generated application event map. Do not edit by hand.',
    '// Payload types are recovered syntactically from publish, publishAsync, and emit calls.',
    '// Unsupported publisher expressions become unknown; decorator-only events remain any for compatibility.',
    '',
    `declare module ${JSON.stringify(moduleSpecifier)} {`,
    '  interface ApplicationEventMap {',
    bodyLine,
    '  }',
    '}',
    '',
  ].join('\n');
}
