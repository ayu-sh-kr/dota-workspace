
/**
 * Defines styling configuration for markdown elements across light and dark modes.
 * Each property contains Tailwind utility classes applied directly to rendered HTML elements.
 * Enables theme-based color schemes while maintaining consistent structural layout patterns.
 */
export interface MarkdownElementTheme {
    wrapper:    string;
    body:       string;
    h1:         string;
    h2:         string;
    h3:         string;
    h4:         string;
    a:          string;
    code:       string;
    pre:        string;
    blockquote: string;
    hr:         string;
    th:         string;
    td:         string;
    strong:     string;
    ul:         string;
    ol:         string;
    /**
     * Raw CSS color values for text selection pseudo-elements.
     * Contains hex values for background and text colors in light/dark modes.
     * Applied via <style> rules since ::selection cannot use utility classes.
     */
    selection: {
        light: { bg: string; text: string };
        dark:  { bg: string; text: string };
    };
    /**
     * TOC sidebar theming — active link and indicator styles.
     */
    toc: {
        /** Tailwind classes for a normal (inactive) TOC link */
        link: string;
        /** Tailwind classes for the active TOC item link */
        activeLink: string;
        /** Tailwind classes for the active left-bar indicator */
        activeBar: string;
    };
}


/** Base wrapper styles for responsive typography and font rendering. */
const WRAPPER = 'font-sans antialiased text-sm sm:text-base leading-6 sm:leading-7';
/** H1 heading styles with responsive sizing, spacing, and bottom border. */
const H1 = 'text-2xl sm:text-3xl lg:text-4xl font-bold mt-0 mb-4 sm:mb-6 pb-2 sm:pb-3 border-b';
/** H2 heading styles with responsive sizing, spacing, and bottom border. */
const H2 = 'text-xl sm:text-2xl lg:text-3xl font-semibold mt-8 sm:mt-10 mb-3 sm:mb-4 pb-1.5 sm:pb-2 border-b';
/** H3 heading styles with responsive sizing and spacing. */
const H3 = 'text-lg sm:text-xl lg:text-2xl font-semibold mt-6 sm:mt-8 mb-2 sm:mb-3';
/** H4 heading styles with responsive sizing and spacing. */
const H4 = 'text-base sm:text-lg font-semibold mt-5 sm:mt-6 mb-1.5 sm:mb-2';
/** Link styles with underline offset, hover effects, and word breaking. */
const A = 'underline-offset-4 hover:underline transition-colors duration-150 break-words';
/** Inline code styles with padding, rounded corners, and monospace font. */
const CODE = 'px-1 sm:px-1.5 py-0.5 rounded text-[0.8em] sm:text-[0.875em] font-mono before:content-none after:content-none';
/** Code block container styles with border, shadow, and overflow handling. */
const PRE = 'rounded-lg sm:rounded-xl border shadow-md overflow-x-auto my-4 sm:my-6 text-sm';
/** Blockquote styles with left border accent and padding. */
const BLOCKQUOTE = 'border-l-4 not-italic rounded-r-lg px-3 sm:px-4 py-2 sm:py-3 my-3 sm:my-4';
/** Horizontal rule styles with top border and spacing. */
const HR = 'my-6 sm:my-8 border-0 border-t';
/** Table header cell styles with padding and text alignment. */
const TH = 'font-semibold px-3 sm:px-4 py-1.5 sm:py-2 text-left text-xs sm:text-sm';
/** Table data cell styles with padding, border, and vertical alignment. */
const TD = 'px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm align-top border-t';
/** Bold text emphasis styles. */
const STRONG = 'font-semibold';
/** Unordered list styles with bullets, padding, and item spacing. */
const UL = 'list-disc pl-5 sm:pl-6 my-3 sm:my-4 space-y-0.5 sm:space-y-1';
/** Ordered list styles with numbering, padding, and item spacing. */
const OL = 'list-decimal pl-5 sm:pl-6 my-3 sm:my-4 space-y-0.5 sm:space-y-1';

/**
 * Merges structural layout classes with theme-specific color classes.
 * Combines responsive sizing/spacing with color variants for light/dark modes.
 */
const t = (structural: string, colour: string) => `${structural} ${colour}`;

/**
 * Theme configuration mapping for markdown rendering.
 * Maps theme names to complete styling definitions for all markdown elements.
 * Each theme provides consistent color schemes across light and dark modes.
 */
export const MarkdownThemeConfig: Record<string, MarkdownElementTheme> = {
  purple: {
        wrapper:    t(WRAPPER,    'text-gray-800 dark:text-gray-200'),
        body:       'text-gray-800 dark:text-gray-200',
        h1:         t(H1,         'text-gray-900 dark:text-white border-gray-200 dark:border-gray-700'),
        h2:         t(H2,         'text-gray-900 dark:text-white border-gray-200 dark:border-gray-700'),
        h3:         t(H3,         'text-gray-900 dark:text-white'),
        h4:         t(H4,         'text-gray-800 dark:text-gray-100'),
        a:          t(A,          'text-purple-600 dark:text-purple-400 decoration-purple-300 dark:decoration-purple-700 hover:text-purple-800 dark:hover:text-purple-300'),
        code:       t(CODE,       'text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/30'),
        pre:        t(PRE,        'bg-gray-950 dark:bg-gray-900 border-gray-200 dark:border-gray-700'),
        blockquote: t(BLOCKQUOTE, 'border-purple-400 dark:border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-gray-700 dark:text-gray-300'),
        hr:         t(HR,         'border-gray-200 dark:border-gray-700'),
        th:         t(TH,         'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200'),
        td:         t(TD,         'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'),
        strong:     t(STRONG,     'text-gray-900 dark:text-white'),
        ul:         t(UL,         'text-gray-800 dark:text-gray-200'),
        ol:         t(OL,         'text-gray-800 dark:text-gray-200'),
        selection:  { light: { bg: '#a855f7', text: '#ffffff' }, dark: { bg: '#c084fc', text: '#1a0030' } },
        toc: { link: 'text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400', activeLink: 'text-purple-600 dark:text-purple-400 font-medium', activeBar: 'bg-purple-500 dark:bg-purple-400' },
    },
  blue: {
        wrapper:    t(WRAPPER,    'text-gray-800 dark:text-gray-200'),
        body:       'text-gray-800 dark:text-gray-200',
        h1:         t(H1,         'text-gray-900 dark:text-white border-blue-200 dark:border-blue-800'),
        h2:         t(H2,         'text-gray-900 dark:text-white border-blue-100 dark:border-blue-900'),
        h3:         t(H3,         'text-blue-900 dark:text-blue-100'),
        h4:         t(H4,         'text-blue-800 dark:text-blue-200'),
        a:          t(A,          'text-blue-600 dark:text-blue-400 decoration-blue-300 dark:decoration-blue-700 hover:text-blue-800 dark:hover:text-blue-300'),
        code:       t(CODE,       'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30'),
        pre:        t(PRE,        'bg-gray-950 dark:bg-gray-900 border-blue-200 dark:border-blue-800'),
        blockquote: t(BLOCKQUOTE, 'border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-gray-700 dark:text-gray-300'),
        hr:         t(HR,         'border-blue-200 dark:border-blue-800'),
        th:         t(TH,         'bg-blue-50 dark:bg-blue-900/40 text-blue-900 dark:text-blue-200'),
        td:         t(TD,         'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'),
        strong:     t(STRONG,     'text-blue-900 dark:text-blue-100'),
        ul:         t(UL,         'text-gray-800 dark:text-gray-200'),
        ol:         t(OL,         'text-gray-800 dark:text-gray-200'),
        selection:  { light: { bg: '#3b82f6', text: '#ffffff' }, dark: { bg: '#60a5fa', text: '#001a40' } },
        toc: { link: 'text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400', activeLink: 'text-blue-600 dark:text-blue-400 font-medium', activeBar: 'bg-blue-500 dark:bg-blue-400' },
    },
  green: {
        wrapper:    t(WRAPPER,    'text-gray-800 dark:text-gray-200'),
        body:       'text-gray-800 dark:text-gray-200',
        h1:         t(H1,         'text-gray-900 dark:text-white border-green-200 dark:border-green-800'),
        h2:         t(H2,         'text-gray-900 dark:text-white border-green-100 dark:border-green-900'),
        h3:         t(H3,         'text-green-900 dark:text-green-100'),
        h4:         t(H4,         'text-green-800 dark:text-green-200'),
        a:          t(A,          'text-green-600 dark:text-green-400 decoration-green-300 dark:decoration-green-700 hover:text-green-800 dark:hover:text-green-300'),
        code:       t(CODE,       'text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/30'),
        pre:        t(PRE,        'bg-gray-950 dark:bg-gray-900 border-green-200 dark:border-green-800'),
        blockquote: t(BLOCKQUOTE, 'border-green-400 dark:border-green-500 bg-green-50 dark:bg-green-900/20 text-gray-700 dark:text-gray-300'),
        hr:         t(HR,         'border-green-200 dark:border-green-800'),
        th:         t(TH,         'bg-green-50 dark:bg-green-900/40 text-green-900 dark:text-green-200'),
        td:         t(TD,         'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'),
        strong:     t(STRONG,     'text-green-900 dark:text-green-100'),
        ul:         t(UL,         'text-gray-800 dark:text-gray-200'),
        ol:         t(OL,         'text-gray-800 dark:text-gray-200'),
        selection:  { light: { bg: '#22c55e', text: '#ffffff' }, dark: { bg: '#4ade80', text: '#002010' } },
        toc: { link: 'text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400', activeLink: 'text-green-600 dark:text-green-400 font-medium', activeBar: 'bg-green-500 dark:bg-green-400' },
    },
  emerald: {
        wrapper:    t(WRAPPER,    'text-gray-800 dark:text-gray-200'),
        body:       'text-gray-800 dark:text-gray-200',
        h1:         t(H1,         'text-gray-900 dark:text-white border-emerald-200 dark:border-emerald-800'),
        h2:         t(H2,         'text-gray-900 dark:text-white border-emerald-100 dark:border-emerald-900'),
        h3:         t(H3,         'text-emerald-900 dark:text-emerald-100'),
        h4:         t(H4,         'text-emerald-800 dark:text-emerald-200'),
        a:          t(A,          'text-emerald-600 dark:text-emerald-400 decoration-emerald-300 dark:decoration-emerald-700 hover:text-emerald-800 dark:hover:text-emerald-300'),
        code:       t(CODE,       'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30'),
        pre:        t(PRE,        'bg-gray-950 dark:bg-gray-900 border-emerald-200 dark:border-emerald-800'),
        blockquote: t(BLOCKQUOTE, 'border-emerald-400 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-gray-700 dark:text-gray-300'),
        hr:         t(HR,         'border-emerald-200 dark:border-emerald-800'),
        th:         t(TH,         'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-200'),
        td:         t(TD,         'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'),
        strong:     t(STRONG,     'text-emerald-900 dark:text-emerald-100'),
        ul:         t(UL,         'text-gray-800 dark:text-gray-200'),
        ol:         t(OL,         'text-gray-800 dark:text-gray-200'),
        selection:  { light: { bg: '#10b981', text: '#ffffff' }, dark: { bg: '#34d399', text: '#001a0f' } },
        toc: { link: 'text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400', activeLink: 'text-emerald-600 dark:text-emerald-400 font-medium', activeBar: 'bg-emerald-500 dark:bg-emerald-400' },
    },
  teal: {
        wrapper:    t(WRAPPER,    'text-gray-800 dark:text-gray-200'),
        body:       'text-gray-800 dark:text-gray-200',
        h1:         t(H1,         'text-gray-900 dark:text-white border-teal-200 dark:border-teal-800'),
        h2:         t(H2,         'text-gray-900 dark:text-white border-teal-100 dark:border-teal-900'),
        h3:         t(H3,         'text-teal-900 dark:text-teal-100'),
        h4:         t(H4,         'text-teal-800 dark:text-teal-200'),
        a:          t(A,          'text-teal-600 dark:text-teal-400 decoration-teal-300 dark:decoration-teal-700 hover:text-teal-800 dark:hover:text-teal-300'),
        code:       t(CODE,       'text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-900/30'),
        pre:        t(PRE,        'bg-gray-950 dark:bg-gray-900 border-teal-200 dark:border-teal-800'),
        blockquote: t(BLOCKQUOTE, 'border-teal-400 dark:border-teal-500 bg-teal-50 dark:bg-teal-900/20 text-gray-700 dark:text-gray-300'),
        hr:         t(HR,         'border-teal-200 dark:border-teal-800'),
        th:         t(TH,         'bg-teal-50 dark:bg-teal-900/40 text-teal-900 dark:text-teal-200'),
        td:         t(TD,         'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'),
        strong:     t(STRONG,     'text-teal-900 dark:text-teal-100'),
        ul:         t(UL,         'text-gray-800 dark:text-gray-200'),
        ol:         t(OL,         'text-gray-800 dark:text-gray-200'),
        selection:  { light: { bg: '#14b8a6', text: '#ffffff' }, dark: { bg: '#2dd4bf', text: '#001a18' } },
        toc: { link: 'text-gray-500 dark:text-gray-400 hover:text-teal-600 dark:hover:text-teal-400', activeLink: 'text-teal-600 dark:text-teal-400 font-medium', activeBar: 'bg-teal-500 dark:bg-teal-400' },
    },
  cyan: {
        wrapper:    t(WRAPPER,    'text-gray-800 dark:text-gray-200'),
        body:       'text-gray-800 dark:text-gray-200',
        h1:         t(H1,         'text-gray-900 dark:text-white border-cyan-200 dark:border-cyan-800'),
        h2:         t(H2,         'text-gray-900 dark:text-white border-cyan-100 dark:border-cyan-900'),
        h3:         t(H3,         'text-cyan-900 dark:text-cyan-100'),
        h4:         t(H4,         'text-cyan-800 dark:text-cyan-200'),
        a:          t(A,          'text-cyan-600 dark:text-cyan-400 decoration-cyan-300 dark:decoration-cyan-700 hover:text-cyan-800 dark:hover:text-cyan-300'),
        code:       t(CODE,       'text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-900/30'),
        pre:        t(PRE,        'bg-gray-950 dark:bg-gray-900 border-cyan-200 dark:border-cyan-800'),
        blockquote: t(BLOCKQUOTE, 'border-cyan-400 dark:border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20 text-gray-700 dark:text-gray-300'),
        hr:         t(HR,         'border-cyan-200 dark:border-cyan-800'),
        th:         t(TH,         'bg-cyan-50 dark:bg-cyan-900/40 text-cyan-900 dark:text-cyan-200'),
        td:         t(TD,         'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'),
        strong:     t(STRONG,     'text-cyan-900 dark:text-cyan-100'),
        ul:         t(UL,         'text-gray-800 dark:text-gray-200'),
        ol:         t(OL,         'text-gray-800 dark:text-gray-200'),
        selection:  { light: { bg: '#06b6d4', text: '#ffffff' }, dark: { bg: '#22d3ee', text: '#001a20' } },
        toc: { link: 'text-gray-500 dark:text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400', activeLink: 'text-cyan-600 dark:text-cyan-400 font-medium', activeBar: 'bg-cyan-500 dark:bg-cyan-400' },
    },
  sky: {
        wrapper:    t(WRAPPER,    'text-gray-800 dark:text-gray-200'),
        body:       'text-gray-800 dark:text-gray-200',
        h1:         t(H1,         'text-gray-900 dark:text-white border-sky-200 dark:border-sky-800'),
        h2:         t(H2,         'text-gray-900 dark:text-white border-sky-100 dark:border-sky-900'),
        h3:         t(H3,         'text-sky-900 dark:text-sky-100'),
        h4:         t(H4,         'text-sky-800 dark:text-sky-200'),
        a:          t(A,          'text-sky-600 dark:text-sky-400 decoration-sky-300 dark:decoration-sky-700 hover:text-sky-800 dark:hover:text-sky-300'),
        code:       t(CODE,       'text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-900/30'),
        pre:        t(PRE,        'bg-gray-950 dark:bg-gray-900 border-sky-200 dark:border-sky-800'),
        blockquote: t(BLOCKQUOTE, 'border-sky-400 dark:border-sky-500 bg-sky-50 dark:bg-sky-900/20 text-gray-700 dark:text-gray-300'),
        hr:         t(HR,         'border-sky-200 dark:border-sky-800'),
        th:         t(TH,         'bg-sky-50 dark:bg-sky-900/40 text-sky-900 dark:text-sky-200'),
        td:         t(TD,         'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'),
        strong:     t(STRONG,     'text-sky-900 dark:text-sky-100'),
        ul:         t(UL,         'text-gray-800 dark:text-gray-200'),
        ol:         t(OL,         'text-gray-800 dark:text-gray-200'),
        selection:  { light: { bg: '#0ea5e9', text: '#ffffff' }, dark: { bg: '#38bdf8', text: '#001828' } },
        toc: { link: 'text-gray-500 dark:text-gray-400 hover:text-sky-600 dark:hover:text-sky-400', activeLink: 'text-sky-600 dark:text-sky-400 font-medium', activeBar: 'bg-sky-500 dark:bg-sky-400' },
    },
  indigo: {
        wrapper:    t(WRAPPER,    'text-gray-800 dark:text-gray-200'),
        body:       'text-gray-800 dark:text-gray-200',
        h1:         t(H1,         'text-gray-900 dark:text-white border-indigo-200 dark:border-indigo-800'),
        h2:         t(H2,         'text-gray-900 dark:text-white border-indigo-100 dark:border-indigo-900'),
        h3:         t(H3,         'text-indigo-900 dark:text-indigo-100'),
        h4:         t(H4,         'text-indigo-800 dark:text-indigo-200'),
        a:          t(A,          'text-indigo-600 dark:text-indigo-400 decoration-indigo-300 dark:decoration-indigo-700 hover:text-indigo-800 dark:hover:text-indigo-300'),
        code:       t(CODE,       'text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30'),
        pre:        t(PRE,        'bg-gray-950 dark:bg-gray-900 border-indigo-200 dark:border-indigo-800'),
        blockquote: t(BLOCKQUOTE, 'border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-gray-700 dark:text-gray-300'),
        hr:         t(HR,         'border-indigo-200 dark:border-indigo-800'),
        th:         t(TH,         'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-900 dark:text-indigo-200'),
        td:         t(TD,         'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'),
        strong:     t(STRONG,     'text-indigo-900 dark:text-indigo-100'),
        ul:         t(UL,         'text-gray-800 dark:text-gray-200'),
        ol:         t(OL,         'text-gray-800 dark:text-gray-200'),
        selection:  { light: { bg: '#6366f1', text: '#ffffff' }, dark: { bg: '#818cf8', text: '#10002b' } },
        toc: { link: 'text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400', activeLink: 'text-indigo-600 dark:text-indigo-400 font-medium', activeBar: 'bg-indigo-500 dark:bg-indigo-400' },
    },
  violet: {
        wrapper:    t(WRAPPER,    'text-gray-800 dark:text-gray-200'),
        body:       'text-gray-800 dark:text-gray-200',
        h1:         t(H1,         'text-gray-900 dark:text-white border-violet-200 dark:border-violet-800'),
        h2:         t(H2,         'text-gray-900 dark:text-white border-violet-100 dark:border-violet-900'),
        h3:         t(H3,         'text-violet-900 dark:text-violet-100'),
        h4:         t(H4,         'text-violet-800 dark:text-violet-200'),
        a:          t(A,          'text-violet-600 dark:text-violet-400 decoration-violet-300 dark:decoration-violet-700 hover:text-violet-800 dark:hover:text-violet-300'),
        code:       t(CODE,       'text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-900/30'),
        pre:        t(PRE,        'bg-gray-950 dark:bg-gray-900 border-violet-200 dark:border-violet-800'),
        blockquote: t(BLOCKQUOTE, 'border-violet-400 dark:border-violet-500 bg-violet-50 dark:bg-violet-900/20 text-gray-700 dark:text-gray-300'),
        hr:         t(HR,         'border-violet-200 dark:border-violet-800'),
        th:         t(TH,         'bg-violet-50 dark:bg-violet-900/40 text-violet-900 dark:text-violet-200'),
        td:         t(TD,         'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'),
        strong:     t(STRONG,     'text-violet-900 dark:text-violet-100'),
        ul:         t(UL,         'text-gray-800 dark:text-gray-200'),
        ol:         t(OL,         'text-gray-800 dark:text-gray-200'),
        selection:  { light: { bg: '#8b5cf6', text: '#ffffff' }, dark: { bg: '#a78bfa', text: '#1a0035' } },
        toc: { link: 'text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400', activeLink: 'text-violet-600 dark:text-violet-400 font-medium', activeBar: 'bg-violet-500 dark:bg-violet-400' },
    },
  fuchsia: {
        wrapper:    t(WRAPPER,    'text-gray-800 dark:text-gray-200'),
        body:       'text-gray-800 dark:text-gray-200',
        h1:         t(H1,         'text-gray-900 dark:text-white border-fuchsia-200 dark:border-fuchsia-800'),
        h2:         t(H2,         'text-gray-900 dark:text-white border-fuchsia-100 dark:border-fuchsia-900'),
        h3:         t(H3,         'text-fuchsia-900 dark:text-fuchsia-100'),
        h4:         t(H4,         'text-fuchsia-800 dark:text-fuchsia-200'),
        a:          t(A,          'text-fuchsia-600 dark:text-fuchsia-400 decoration-fuchsia-300 dark:decoration-fuchsia-700 hover:text-fuchsia-800 dark:hover:text-fuchsia-300'),
        code:       t(CODE,       'text-fuchsia-700 dark:text-fuchsia-300 bg-fuchsia-50 dark:bg-fuchsia-900/30'),
        pre:        t(PRE,        'bg-gray-950 dark:bg-gray-900 border-fuchsia-200 dark:border-fuchsia-800'),
        blockquote: t(BLOCKQUOTE, 'border-fuchsia-400 dark:border-fuchsia-500 bg-fuchsia-50 dark:bg-fuchsia-900/20 text-gray-700 dark:text-gray-300'),
        hr:         t(HR,         'border-fuchsia-200 dark:border-fuchsia-800'),
        th:         t(TH,         'bg-fuchsia-50 dark:bg-fuchsia-900/40 text-fuchsia-900 dark:text-fuchsia-200'),
        td:         t(TD,         'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'),
        strong:     t(STRONG,     'text-fuchsia-900 dark:text-fuchsia-100'),
        ul:         t(UL,         'text-gray-800 dark:text-gray-200'),
        ol:         t(OL,         'text-gray-800 dark:text-gray-200'),
        selection:  { light: { bg: '#d946ef', text: '#ffffff' }, dark: { bg: '#e879f9', text: '#2d0030' } },
        toc: { link: 'text-gray-500 dark:text-gray-400 hover:text-fuchsia-600 dark:hover:text-fuchsia-400', activeLink: 'text-fuchsia-600 dark:text-fuchsia-400 font-medium', activeBar: 'bg-fuchsia-500 dark:bg-fuchsia-400' },
    },
  pink: {
        wrapper:    t(WRAPPER,    'text-gray-800 dark:text-gray-200'),
        body:       'text-gray-800 dark:text-gray-200',
        h1:         t(H1,         'text-gray-900 dark:text-white border-pink-200 dark:border-pink-800'),
        h2:         t(H2,         'text-gray-900 dark:text-white border-pink-100 dark:border-pink-900'),
        h3:         t(H3,         'text-pink-900 dark:text-pink-100'),
        h4:         t(H4,         'text-pink-800 dark:text-pink-200'),
        a:          t(A,          'text-pink-600 dark:text-pink-400 decoration-pink-300 dark:decoration-pink-700 hover:text-pink-800 dark:hover:text-pink-300'),
        code:       t(CODE,       'text-pink-700 dark:text-pink-300 bg-pink-50 dark:bg-pink-900/30'),
        pre:        t(PRE,        'bg-gray-950 dark:bg-gray-900 border-pink-200 dark:border-pink-800'),
        blockquote: t(BLOCKQUOTE, 'border-pink-400 dark:border-pink-500 bg-pink-50 dark:bg-pink-900/20 text-gray-700 dark:text-gray-300'),
        hr:         t(HR,         'border-pink-200 dark:border-pink-800'),
        th:         t(TH,         'bg-pink-50 dark:bg-pink-900/40 text-pink-900 dark:text-pink-200'),
        td:         t(TD,         'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'),
        strong:     t(STRONG,     'text-pink-900 dark:text-pink-100'),
        ul:         t(UL,         'text-gray-800 dark:text-gray-200'),
        ol:         t(OL,         'text-gray-800 dark:text-gray-200'),
        selection:  { light: { bg: '#ec4899', text: '#ffffff' }, dark: { bg: '#f472b6', text: '#2d001a' } },
        toc: { link: 'text-gray-500 dark:text-gray-400 hover:text-pink-600 dark:hover:text-pink-400', activeLink: 'text-pink-600 dark:text-pink-400 font-medium', activeBar: 'bg-pink-500 dark:bg-pink-400' },
    },
  rose: {
        wrapper:    t(WRAPPER,    'text-gray-800 dark:text-gray-200'),
        body:       'text-gray-800 dark:text-gray-200',
        h1:         t(H1,         'text-gray-900 dark:text-white border-rose-200 dark:border-rose-800'),
        h2:         t(H2,         'text-gray-900 dark:text-white border-rose-100 dark:border-rose-900'),
        h3:         t(H3,         'text-rose-900 dark:text-rose-100'),
        h4:         t(H4,         'text-rose-800 dark:text-rose-200'),
        a:          t(A,          'text-rose-600 dark:text-rose-400 decoration-rose-300 dark:decoration-rose-700 hover:text-rose-800 dark:hover:text-rose-300'),
        code:       t(CODE,       'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-900/30'),
        pre:        t(PRE,        'bg-gray-950 dark:bg-gray-900 border-rose-200 dark:border-rose-800'),
        blockquote: t(BLOCKQUOTE, 'border-rose-400 dark:border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-gray-700 dark:text-gray-300'),
        hr:         t(HR,         'border-rose-200 dark:border-rose-800'),
        th:         t(TH,         'bg-rose-50 dark:bg-rose-900/40 text-rose-900 dark:text-rose-200'),
        td:         t(TD,         'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'),
        strong:     t(STRONG,     'text-rose-900 dark:text-rose-100'),
        ul:         t(UL,         'text-gray-800 dark:text-gray-200'),
        ol:         t(OL,         'text-gray-800 dark:text-gray-200'),
        selection:  { light: { bg: '#f43f5e', text: '#ffffff' }, dark: { bg: '#fb7185', text: '#2d0010' } },
        toc: { link: 'text-gray-500 dark:text-gray-400 hover:text-rose-600 dark:hover:text-rose-400', activeLink: 'text-rose-600 dark:text-rose-400 font-medium', activeBar: 'bg-rose-500 dark:bg-rose-400' },
    },
  red: {
        wrapper:    t(WRAPPER,    'text-gray-800 dark:text-gray-200'),
        body:       'text-gray-800 dark:text-gray-200',
        h1:         t(H1,         'text-gray-900 dark:text-white border-red-200 dark:border-red-800'),
        h2:         t(H2,         'text-gray-900 dark:text-white border-red-100 dark:border-red-900'),
        h3:         t(H3,         'text-red-900 dark:text-red-100'),
        h4:         t(H4,         'text-red-800 dark:text-red-200'),
        a:          t(A,          'text-red-600 dark:text-red-400 decoration-red-300 dark:decoration-red-700 hover:text-red-800 dark:hover:text-red-300'),
        code:       t(CODE,       'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30'),
        pre:        t(PRE,        'bg-gray-950 dark:bg-gray-900 border-red-200 dark:border-red-800'),
        blockquote: t(BLOCKQUOTE, 'border-red-400 dark:border-red-500 bg-red-50 dark:bg-red-900/20 text-gray-700 dark:text-gray-300'),
        hr:         t(HR,         'border-red-200 dark:border-red-800'),
        th:         t(TH,         'bg-red-50 dark:bg-red-900/40 text-red-900 dark:text-red-200'),
        td:         t(TD,         'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'),
        strong:     t(STRONG,     'text-red-900 dark:text-red-100'),
        ul:         t(UL,         'text-gray-800 dark:text-gray-200'),
        ol:         t(OL,         'text-gray-800 dark:text-gray-200'),
        selection:  { light: { bg: '#ef4444', text: '#ffffff' }, dark: { bg: '#f87171', text: '#2d0000' } },
        toc: { link: 'text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400', activeLink: 'text-red-600 dark:text-red-400 font-medium', activeBar: 'bg-red-500 dark:bg-red-400' },
    },
  yellow: {
        wrapper:    t(WRAPPER,    'text-gray-800 dark:text-gray-200'),
        body:       'text-gray-800 dark:text-gray-200',
        h1:         t(H1,         'text-gray-900 dark:text-white border-yellow-200 dark:border-yellow-800'),
        h2:         t(H2,         'text-gray-900 dark:text-white border-yellow-100 dark:border-yellow-900'),
        h3:         t(H3,         'text-yellow-900 dark:text-yellow-100'),
        h4:         t(H4,         'text-yellow-800 dark:text-yellow-200'),
        a:          t(A,          'text-yellow-600 dark:text-yellow-400 decoration-yellow-300 dark:decoration-yellow-700 hover:text-yellow-800 dark:hover:text-yellow-300'),
        code:       t(CODE,       'text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/30'),
        pre:        t(PRE,        'bg-gray-950 dark:bg-gray-900 border-yellow-200 dark:border-yellow-800'),
        blockquote: t(BLOCKQUOTE, 'border-yellow-400 dark:border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 text-gray-700 dark:text-gray-300'),
        hr:         t(HR,         'border-yellow-200 dark:border-yellow-800'),
        th:         t(TH,         'bg-yellow-50 dark:bg-yellow-900/40 text-yellow-900 dark:text-yellow-200'),
        td:         t(TD,         'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'),
        strong:     t(STRONG,     'text-yellow-900 dark:text-yellow-100'),
        ul:         t(UL,         'text-gray-800 dark:text-gray-200'),
        ol:         t(OL,         'text-gray-800 dark:text-gray-200'),
        selection:  { light: { bg: '#eab308', text: '#1a1000' }, dark: { bg: '#facc15', text: '#1a1000' } },
        toc: { link: 'text-gray-500 dark:text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400', activeLink: 'text-yellow-600 dark:text-yellow-400 font-medium', activeBar: 'bg-yellow-500 dark:bg-yellow-400' },
    },
  amber: {
        wrapper:    t(WRAPPER,    'text-gray-800 dark:text-gray-200'),
        body:       'text-gray-800 dark:text-gray-200',
        h1:         t(H1,         'text-gray-900 dark:text-white border-amber-200 dark:border-amber-800'),
        h2:         t(H2,         'text-gray-900 dark:text-white border-amber-100 dark:border-amber-900'),
        h3:         t(H3,         'text-amber-900 dark:text-amber-100'),
        h4:         t(H4,         'text-amber-800 dark:text-amber-200'),
        a:          t(A,          'text-amber-600 dark:text-amber-400 decoration-amber-300 dark:decoration-amber-700 hover:text-amber-800 dark:hover:text-amber-300'),
        code:       t(CODE,       'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30'),
        pre:        t(PRE,        'bg-gray-950 dark:bg-gray-900 border-amber-200 dark:border-amber-800'),
        blockquote: t(BLOCKQUOTE, 'border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-gray-700 dark:text-gray-300'),
        hr:         t(HR,         'border-amber-200 dark:border-amber-800'),
        th:         t(TH,         'bg-amber-50 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200'),
        td:         t(TD,         'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'),
        strong:     t(STRONG,     'text-amber-900 dark:text-amber-100'),
        ul:         t(UL,         'text-gray-800 dark:text-gray-200'),
        ol:         t(OL,         'text-gray-800 dark:text-gray-200'),
        selection:  { light: { bg: '#f59e0b', text: '#1a0f00' }, dark: { bg: '#fbbf24', text: '#1a0f00' } },
        toc: { link: 'text-gray-500 dark:text-gray-400 hover:text-amber-600 dark:hover:text-amber-400', activeLink: 'text-amber-600 dark:text-amber-400 font-medium', activeBar: 'bg-amber-500 dark:bg-amber-400' },
    },
  orange: {
        wrapper:    t(WRAPPER,    'text-gray-800 dark:text-gray-200'),
        body:       'text-gray-800 dark:text-gray-200',
        h1:         t(H1,         'text-gray-900 dark:text-white border-orange-200 dark:border-orange-800'),
        h2:         t(H2,         'text-gray-900 dark:text-white border-orange-100 dark:border-orange-900'),
        h3:         t(H3,         'text-orange-900 dark:text-orange-100'),
        h4:         t(H4,         'text-orange-800 dark:text-orange-200'),
        a:          t(A,          'text-orange-600 dark:text-orange-400 decoration-orange-300 dark:decoration-orange-700 hover:text-orange-800 dark:hover:text-orange-300'),
        code:       t(CODE,       'text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-900/30'),
        pre:        t(PRE,        'bg-gray-950 dark:bg-gray-900 border-orange-200 dark:border-orange-800'),
        blockquote: t(BLOCKQUOTE, 'border-orange-400 dark:border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-gray-700 dark:text-gray-300'),
        hr:         t(HR,         'border-orange-200 dark:border-orange-800'),
        th:         t(TH,         'bg-orange-50 dark:bg-orange-900/40 text-orange-900 dark:text-orange-200'),
        td:         t(TD,         'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'),
        strong:     t(STRONG,     'text-orange-900 dark:text-orange-100'),
        ul:         t(UL,         'text-gray-800 dark:text-gray-200'),
        ol:         t(OL,         'text-gray-800 dark:text-gray-200'),
        selection:  { light: { bg: '#f97316', text: '#ffffff' }, dark: { bg: '#fb923c', text: '#1a0800' } },
        toc: { link: 'text-gray-500 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400', activeLink: 'text-orange-600 dark:text-orange-400 font-medium', activeBar: 'bg-orange-500 dark:bg-orange-400' },
    },
  lime: {
        wrapper:    t(WRAPPER,    'text-gray-800 dark:text-gray-200'),
        body:       'text-gray-800 dark:text-gray-200',
        h1:         t(H1,         'text-gray-900 dark:text-white border-lime-200 dark:border-lime-800'),
        h2:         t(H2,         'text-gray-900 dark:text-white border-lime-100 dark:border-lime-900'),
        h3:         t(H3,         'text-lime-900 dark:text-lime-100'),
        h4:         t(H4,         'text-lime-800 dark:text-lime-200'),
        a:          t(A,          'text-lime-600 dark:text-lime-400 decoration-lime-300 dark:decoration-lime-700 hover:text-lime-800 dark:hover:text-lime-300'),
        code:       t(CODE,       'text-lime-700 dark:text-lime-300 bg-lime-50 dark:bg-lime-900/30'),
        pre:        t(PRE,        'bg-gray-950 dark:bg-gray-900 border-lime-200 dark:border-lime-800'),
        blockquote: t(BLOCKQUOTE, 'border-lime-400 dark:border-lime-500 bg-lime-50 dark:bg-lime-900/20 text-gray-700 dark:text-gray-300'),
        hr:         t(HR,         'border-lime-200 dark:border-lime-800'),
        th:         t(TH,         'bg-lime-50 dark:bg-lime-900/40 text-lime-900 dark:text-lime-200'),
        td:         t(TD,         'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'),
        strong:     t(STRONG,     'text-lime-900 dark:text-lime-100'),
        ul:         t(UL,         'text-gray-800 dark:text-gray-200'),
        ol:         t(OL,         'text-gray-800 dark:text-gray-200'),
        selection:  { light: { bg: '#84cc16', text: '#1a2000' }, dark: { bg: '#a3e635', text: '#1a2000' } },
        toc: { link: 'text-gray-500 dark:text-gray-400 hover:text-lime-600 dark:hover:text-lime-400', activeLink: 'text-lime-600 dark:text-lime-400 font-medium', activeBar: 'bg-lime-500 dark:bg-lime-400' },
    },
  slate: {
        wrapper:    t(WRAPPER,    'text-slate-700 dark:text-slate-300'),
        body:       'text-slate-700 dark:text-slate-300',
        h1:         t(H1,         'text-slate-900 dark:text-slate-50 border-slate-200 dark:border-slate-700'),
        h2:         t(H2,         'text-slate-900 dark:text-slate-50 border-slate-200 dark:border-slate-700'),
        h3:         t(H3,         'text-slate-800 dark:text-slate-100'),
        h4:         t(H4,         'text-slate-700 dark:text-slate-200'),
        a:          t(A,          'text-slate-700 dark:text-slate-300 decoration-slate-400 dark:decoration-slate-500 hover:text-slate-900 dark:hover:text-slate-100'),
        code:       t(CODE,       'text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800'),
        pre:        t(PRE,        'bg-slate-950 dark:bg-slate-900 border-slate-200 dark:border-slate-700'),
        blockquote: t(BLOCKQUOTE, 'border-slate-400 dark:border-slate-500 bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400'),
        hr:         t(HR,         'border-slate-200 dark:border-slate-700'),
        th:         t(TH,         'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'),
        td:         t(TD,         'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'),
        strong:     t(STRONG,     'text-slate-900 dark:text-slate-50'),
        ul:         t(UL,         'text-slate-700 dark:text-slate-300'),
        ol:         t(OL,         'text-slate-700 dark:text-slate-300'),
        selection:  { light: { bg: '#475569', text: '#ffffff' }, dark: { bg: '#94a3b8', text: '#0f172a' } },
        toc: { link: 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200', activeLink: 'text-slate-800 dark:text-slate-100 font-medium', activeBar: 'bg-slate-600 dark:bg-slate-300' },
    },
  gray: {
        wrapper:    t(WRAPPER,    'text-gray-700 dark:text-gray-300'),
        body:       'text-gray-700 dark:text-gray-300',
        h1:         t(H1,         'text-gray-900 dark:text-gray-50 border-gray-200 dark:border-gray-700'),
        h2:         t(H2,         'text-gray-900 dark:text-gray-50 border-gray-200 dark:border-gray-700'),
        h3:         t(H3,         'text-gray-800 dark:text-gray-100'),
        h4:         t(H4,         'text-gray-700 dark:text-gray-200'),
        a:          t(A,          'text-gray-700 dark:text-gray-300 decoration-gray-400 dark:decoration-gray-500 hover:text-gray-900 dark:hover:text-gray-100'),
        code:       t(CODE,       'text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-800'),
        pre:        t(PRE,        'bg-gray-950 dark:bg-gray-900 border-gray-200 dark:border-gray-700'),
        blockquote: t(BLOCKQUOTE, 'border-gray-400 dark:border-gray-500 bg-gray-50 dark:bg-gray-800/40 text-gray-600 dark:text-gray-400'),
        hr:         t(HR,         'border-gray-200 dark:border-gray-700'),
        th:         t(TH,         'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200'),
        td:         t(TD,         'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'),
        strong:     t(STRONG,     'text-gray-900 dark:text-gray-50'),
        ul:         t(UL,         'text-gray-700 dark:text-gray-300'),
        ol:         t(OL,         'text-gray-700 dark:text-gray-300'),
        selection:  { light: { bg: '#6b7280', text: '#ffffff' }, dark: { bg: '#9ca3af', text: '#111827' } },
        toc: { link: 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200', activeLink: 'text-gray-800 dark:text-gray-100 font-medium', activeBar: 'bg-gray-600 dark:bg-gray-300' },
    },
  zinc: {
        wrapper:    t(WRAPPER,    'text-zinc-700 dark:text-zinc-300'),
        body:       'text-zinc-700 dark:text-zinc-300',
        h1:         t(H1,         'text-zinc-900 dark:text-zinc-50 border-zinc-200 dark:border-zinc-700'),
        h2:         t(H2,         'text-zinc-800 dark:text-zinc-100 border-zinc-200 dark:border-zinc-700'),
        h3:         t(H3,         'text-zinc-800 dark:text-zinc-100'),
        h4:         t(H4,         'text-zinc-700 dark:text-zinc-200'),
        a:          t(A,          'text-zinc-700 dark:text-zinc-300 decoration-zinc-400 dark:decoration-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'),
        code:       t(CODE,       'text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800'),
        pre:        t(PRE,        'bg-zinc-950 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700'),
        blockquote: t(BLOCKQUOTE, 'border-zinc-400 dark:border-zinc-500 bg-zinc-50 dark:bg-zinc-800/40 text-zinc-600 dark:text-zinc-400'),
        hr:         t(HR,         'border-zinc-200 dark:border-zinc-700'),
        th:         t(TH,         'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200'),
        td:         t(TD,         'border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'),
        strong:     t(STRONG,     'text-zinc-900 dark:text-zinc-50'),
        ul:         t(UL,         'text-zinc-700 dark:text-zinc-300'),
        ol:         t(OL,         'text-zinc-700 dark:text-zinc-300'),
        selection:  { light: { bg: '#52525b', text: '#ffffff' }, dark: { bg: '#a1a1aa', text: '#18181b' } },
        toc: { link: 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200', activeLink: 'text-zinc-800 dark:text-zinc-100 font-medium', activeBar: 'bg-zinc-600 dark:bg-zinc-300' },
    },
  neutral: {
        wrapper:    t(WRAPPER,    'text-neutral-700 dark:text-neutral-300'),
        body:       'text-neutral-700 dark:text-neutral-300',
        h1:         t(H1,         'text-neutral-900 dark:text-neutral-50 border-neutral-200 dark:border-neutral-700'),
        h2:         t(H2,         'text-neutral-800 dark:text-neutral-100 border-neutral-200 dark:border-neutral-700'),
        h3:         t(H3,         'text-neutral-800 dark:text-neutral-100'),
        h4:         t(H4,         'text-neutral-700 dark:text-neutral-200'),
        a:          t(A,          'text-neutral-700 dark:text-neutral-300 decoration-neutral-400 dark:decoration-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100'),
        code:       t(CODE,       'text-neutral-800 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800'),
        pre:        t(PRE,        'bg-neutral-950 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700'),
        blockquote: t(BLOCKQUOTE, 'border-neutral-400 dark:border-neutral-500 bg-neutral-50 dark:bg-neutral-800/40 text-neutral-600 dark:text-neutral-400'),
        hr:         t(HR,         'border-neutral-200 dark:border-neutral-700'),
        th:         t(TH,         'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200'),
        td:         t(TD,         'border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300'),
        strong:     t(STRONG,     'text-neutral-900 dark:text-neutral-50'),
        ul:         t(UL,         'text-neutral-700 dark:text-neutral-300'),
        ol:         t(OL,         'text-neutral-700 dark:text-neutral-300'),
        selection:  { light: { bg: '#525252', text: '#ffffff' }, dark: { bg: '#a3a3a3', text: '#171717' } },
        toc: { link: 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200', activeLink: 'text-neutral-800 dark:text-neutral-100 font-medium', activeBar: 'bg-neutral-600 dark:bg-neutral-300' },
    },
  stone: {
        wrapper:    t(WRAPPER,    'text-stone-700 dark:text-stone-300'),
        body:       'text-stone-700 dark:text-stone-300',
        h1:         t(H1,         'text-stone-900 dark:text-stone-50 border-stone-200 dark:border-stone-700'),
        h2:         t(H2,         'text-stone-800 dark:text-stone-100 border-stone-200 dark:border-stone-700'),
        h3:         t(H3,         'text-stone-800 dark:text-stone-100'),
        h4:         t(H4,         'text-stone-700 dark:text-stone-200'),
        a:          t(A,          'text-stone-700 dark:text-stone-300 decoration-stone-400 dark:decoration-stone-500 hover:text-stone-900 dark:hover:text-stone-100'),
        code:       t(CODE,       'text-stone-800 dark:text-stone-200 bg-stone-100 dark:bg-stone-800'),
        pre:        t(PRE,        'bg-stone-950 dark:bg-stone-900 border-stone-200 dark:border-stone-700'),
        blockquote: t(BLOCKQUOTE, 'border-stone-400 dark:border-stone-500 bg-stone-50 dark:bg-stone-800/40 text-stone-600 dark:text-stone-400'),
        hr:         t(HR,         'border-stone-200 dark:border-stone-700'),
        th:         t(TH,         'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200'),
        td:         t(TD,         'border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300'),
        strong:     t(STRONG,     'text-stone-900 dark:text-stone-50'),
        ul:         t(UL,         'text-stone-700 dark:text-stone-300'),
        ol:         t(OL,         'text-stone-700 dark:text-stone-300'),
        selection:  { light: { bg: '#57534e', text: '#ffffff' }, dark: { bg: '#a8a29e', text: '#1c1917' } },
        toc: { link: 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200', activeLink: 'text-stone-800 dark:text-stone-100 font-medium', activeBar: 'bg-stone-600 dark:bg-stone-300' },
    },
  none: {
        wrapper:    t(WRAPPER,    'text-gray-900 dark:text-gray-100'),
        body:       'text-gray-900 dark:text-gray-100',
        h1:         t(H1,         'text-black dark:text-white border-gray-300 dark:border-gray-600'),
        h2:         t(H2,         'text-black dark:text-white border-gray-300 dark:border-gray-600'),
        h3:         t(H3,         'text-gray-900 dark:text-gray-100'),
        h4:         t(H4,         'text-gray-800 dark:text-gray-200'),
        a:          t(A,          'text-gray-900 dark:text-white decoration-gray-500 dark:decoration-gray-400 hover:text-black dark:hover:text-gray-100'),
        code:       t(CODE,       'text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-800'),
        pre:        t(PRE,        'bg-gray-950 dark:bg-gray-900 border-gray-300 dark:border-gray-700'),
        blockquote: t(BLOCKQUOTE, 'border-gray-500 dark:border-gray-400 bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300'),
        hr:         t(HR,         'border-gray-300 dark:border-gray-600'),
        th:         t(TH,         'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'),
        td:         t(TD,         'border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200'),
        strong:     t(STRONG,     'text-black dark:text-white'),
        ul:         t(UL,         'text-gray-900 dark:text-gray-100'),
        ol:         t(OL,         'text-gray-900 dark:text-gray-100'),
        selection:  { light: { bg: '#111827', text: '#ffffff' }, dark: { bg: '#f9fafb', text: '#111827' } },
        toc: { link: 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200', activeLink: 'text-gray-900 dark:text-white font-medium', activeBar: 'bg-gray-700 dark:bg-gray-200' },
    },
};

/**
 * Available theme names for markdown rendering.
 * Type-safe union of all configured theme keys.
 */
export type MarkdownTheme = keyof typeof MarkdownThemeConfig;

