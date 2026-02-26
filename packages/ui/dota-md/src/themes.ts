import {Theme} from "@dota/Types.ts";

export const flatMarkdownTheme: Theme = {
  name: 'flat',
  fontFamily: 'Helvetica, Arial, sans-serif',

  // ── Structural / layout only — no color tokens ──────────────────────────────
  typography: {
    h1: 'text-2xl sm:text-3xl lg:text-4xl font-bold mt-0 mb-4 sm:mb-6 pb-2 sm:pb-3 border-b',
    h2: 'text-xl sm:text-2xl lg:text-3xl font-semibold mt-8 sm:mt-10 mb-3 sm:mb-4 pb-1.5 sm:pb-2 border-b',
    h3: 'text-lg sm:text-xl lg:text-2xl font-semibold mt-6 sm:mt-8 mb-2 sm:mb-3',
    h4: 'text-base sm:text-lg font-semibold mt-5 sm:mt-6 mb-1.5 sm:mb-2',
    h5: 'text-sm sm:text-base font-semibold mt-4 sm:mt-5 mb-1',
    h6: 'text-xs sm:text-sm font-semibold mt-3 sm:mt-4 mb-1',
    p: 'leading-relaxed my-3',
    a: 'underline-offset-4 hover:underline transition-colors duration-150 break-words',
    strong: 'font-semibold',
    em: 'italic',
    code: 'px-1 sm:px-1.5 py-0.5 rounded text-[0.8em] sm:text-[0.875em] font-mono before:content-none after:content-none',
    pre: 'rounded-lg sm:rounded-xl border shadow-md overflow-x-auto my-4 sm:my-6 text-sm',
    blockquote: 'border-l-4 not-italic rounded-r-lg px-3 sm:px-4 py-2 sm:py-3 my-3 sm:my-4',
    hr: 'my-6 sm:my-8 border-0 border-t',
    th: 'font-semibold px-3 sm:px-4 py-1.5 sm:py-2 text-left text-xs sm:text-sm',
    td: 'px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm align-top border-t',
    ul: 'list-disc pl-5 sm:pl-6 my-3 sm:my-4 space-y-0.5 sm:space-y-1',
    ol: 'list-decimal pl-5 sm:pl-6 my-3 sm:my-4 space-y-0.5 sm:space-y-1',
    li: 'my-1',
    table: 'table-auto border-collapse my-4 w-full',
    button: 'px-3 py-1.5 rounded text-sm font-medium border cursor-pointer select-none',
    span: 'leading-normal',
  },

  // ── Per-color semantic token buckets ─────────────────────────────────────────
  // text       → foreground text utilities
  // background → bg-* utilities
  // border     → border-* utilities
  // hover      → hover:* utilities
  // active     → active:* / pressed state utilities
  // focus      → focus:* / focus-visible:* utilities
  color: {
    // ── slate ────────────────────────────────────────────────────────────────
    slate: {
      selection: 'selection:bg-slate-200/70 dark:selection:bg-slate-500/70',
      h1: {text: 'text-slate-800 dark:text-slate-100', border: 'border-slate-200 dark:border-slate-700'},
      h2: {text: 'text-slate-800 dark:text-slate-100', border: 'border-slate-200 dark:border-slate-700'},
      h3: {text: 'text-slate-700 dark:text-slate-200'},
      h4: {text: 'text-slate-700 dark:text-slate-200'},
      h5: {text: 'text-slate-600 dark:text-slate-300'},
      h6: {text: 'text-slate-500 dark:text-slate-400'},
      p: {text: 'text-slate-700 dark:text-slate-300'},
      span: {text: 'text-slate-700 dark:text-slate-300'},
      strong: {text: 'text-slate-800 dark:text-slate-200'},
      em: {text: 'text-slate-600 dark:text-slate-400'},
      li: {text: 'text-slate-700 dark:text-slate-300'},
      a: {
        text: 'text-slate-600 dark:text-slate-400',
        hover: 'hover:text-slate-900 dark:hover:text-slate-100',
        focus: 'focus:ring-slate-400 dark:focus:ring-slate-500'
      },
      code: {text: 'text-slate-700 dark:text-slate-300', background: 'bg-slate-100 dark:bg-slate-800'},
      pre: {background: 'bg-slate-50 dark:bg-slate-900', border: 'border-slate-200 dark:border-slate-700'},
      blockquote: {
        text: 'text-slate-600 dark:text-slate-400',
        background: 'bg-slate-50 dark:bg-slate-800/40',
        border: 'border-slate-300 dark:border-slate-600'
      },
      hr: {border: 'border-slate-200 dark:border-slate-700'},
      th: {
        text: 'text-slate-700 dark:text-slate-300',
        background: 'bg-slate-100 dark:bg-slate-800/60',
        border: 'border-slate-200 dark:border-slate-700'
      },
      td: {text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-200 dark:border-slate-700'},
      table: {border: 'border-slate-200 dark:border-slate-700'},
      button: {
        text: 'text-slate-700 dark:text-slate-200',
        background: 'bg-slate-50 dark:bg-slate-800',
        border: 'border-slate-300 dark:border-slate-600',
        hover: 'hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100',
        active: 'active:bg-slate-200 dark:active:bg-slate-600',
        focus: 'focus:ring-slate-400 dark:focus:ring-slate-500'
      },
    },
    // ── gray ─────────────────────────────────────────────────────────────────
    gray: {
      selection: 'selection:bg-gray-200/70 dark:selection:bg-gray-500/70',
      h1: {text: 'text-gray-800 dark:text-gray-100', border: 'border-gray-200 dark:border-gray-700'},
      h2: {text: 'text-gray-800 dark:text-gray-100', border: 'border-gray-200 dark:border-gray-700'},
      h3: {text: 'text-gray-700 dark:text-gray-200'},
      h4: {text: 'text-gray-700 dark:text-gray-200'},
      h5: {text: 'text-gray-600 dark:text-gray-300'},
      h6: {text: 'text-gray-500 dark:text-gray-400'},
      p: {text: 'text-gray-700 dark:text-gray-300'},
      span: {text: 'text-gray-700 dark:text-gray-300'},
      strong: {text: 'text-gray-800 dark:text-gray-200'},
      em: {text: 'text-gray-600 dark:text-gray-400'},
      li: {text: 'text-gray-700 dark:text-gray-300'},
      a: {
        text: 'text-gray-600 dark:text-gray-400',
        hover: 'hover:text-gray-900 dark:hover:text-gray-100',
        focus: 'focus:ring-gray-400 dark:focus:ring-gray-500'
      },
      code: {text: 'text-gray-700 dark:text-gray-300', background: 'bg-gray-100 dark:bg-gray-800'},
      pre: {background: 'bg-gray-50 dark:bg-gray-900', border: 'border-gray-200 dark:border-gray-700'},
      blockquote: {
        text: 'text-gray-600 dark:text-gray-400',
        background: 'bg-gray-50 dark:bg-gray-800/40',
        border: 'border-gray-300 dark:border-gray-600'
      },
      hr: {border: 'border-gray-200 dark:border-gray-700'},
      th: {
        text: 'text-gray-700 dark:text-gray-300',
        background: 'bg-gray-100 dark:bg-gray-800/60',
        border: 'border-gray-200 dark:border-gray-700'
      },
      td: {text: 'text-gray-600 dark:text-gray-400', border: 'border-gray-200 dark:border-gray-700'},
      table: {border: 'border-gray-200 dark:border-gray-700'},
      button: {
        text: 'text-gray-700 dark:text-gray-200',
        background: 'bg-gray-50 dark:bg-gray-800',
        border: 'border-gray-300 dark:border-gray-600',
        hover: 'hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100',
        active: 'active:bg-gray-200 dark:active:bg-gray-600',
        focus: 'focus:ring-gray-400 dark:focus:ring-gray-500'
      },
    },
    // ── zinc ─────────────────────────────────────────────────────────────────
    zinc: {
      selection: 'selection:bg-zinc-200/70 dark:selection:bg-zinc-500/70',
      h1: {text: 'text-zinc-800 dark:text-zinc-100', border: 'border-zinc-200 dark:border-zinc-700'},
      h2: {text: 'text-zinc-800 dark:text-zinc-100', border: 'border-zinc-200 dark:border-zinc-700'},
      h3: {text: 'text-zinc-700 dark:text-zinc-200'},
      h4: {text: 'text-zinc-700 dark:text-zinc-200'},
      h5: {text: 'text-zinc-600 dark:text-zinc-300'},
      h6: {text: 'text-zinc-500 dark:text-zinc-400'},
      p: {text: 'text-zinc-700 dark:text-zinc-300'},
      span: {text: 'text-zinc-700 dark:text-zinc-300'},
      strong: {text: 'text-zinc-800 dark:text-zinc-200'},
      em: {text: 'text-zinc-600 dark:text-zinc-400'},
      li: {text: 'text-zinc-700 dark:text-zinc-300'},
      a: {
        text: 'text-zinc-600 dark:text-zinc-400',
        hover: 'hover:text-zinc-900 dark:hover:text-zinc-100',
        focus: 'focus:ring-zinc-400 dark:focus:ring-zinc-500'
      },
      code: {text: 'text-zinc-700 dark:text-zinc-300', background: 'bg-zinc-100 dark:bg-zinc-800'},
      pre: {background: 'bg-zinc-50 dark:bg-zinc-900', border: 'border-zinc-200 dark:border-zinc-700'},
      blockquote: {
        text: 'text-zinc-600 dark:text-zinc-400',
        background: 'bg-zinc-50 dark:bg-zinc-800/40',
        border: 'border-zinc-300 dark:border-zinc-600'
      },
      hr: {border: 'border-zinc-200 dark:border-zinc-700'},
      th: {
        text: 'text-zinc-700 dark:text-zinc-300',
        background: 'bg-zinc-100 dark:bg-zinc-800/60',
        border: 'border-zinc-200 dark:border-zinc-700'
      },
      td: {text: 'text-zinc-600 dark:text-zinc-400', border: 'border-zinc-200 dark:border-zinc-700'},
      table: {border: 'border-zinc-200 dark:border-zinc-700'},
      button: {
        text: 'text-zinc-700 dark:text-zinc-200',
        background: 'bg-zinc-50 dark:bg-zinc-800',
        border: 'border-zinc-300 dark:border-zinc-600',
        hover: 'hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-100',
        active: 'active:bg-zinc-200 dark:active:bg-zinc-600',
        focus: 'focus:ring-zinc-400 dark:focus:ring-zinc-500'
      },
    },
    // ── neutral ───────────────────────────────────────────────────────────────
    neutral: {
      selection: 'selection:bg-neutral-200/70 dark:selection:bg-neutral-500/70',
      h1: {text: 'text-neutral-800 dark:text-neutral-100', border: 'border-neutral-200 dark:border-neutral-700'},
      h2: {text: 'text-neutral-800 dark:text-neutral-100', border: 'border-neutral-200 dark:border-neutral-700'},
      h3: {text: 'text-neutral-700 dark:text-neutral-200'},
      h4: {text: 'text-neutral-700 dark:text-neutral-200'},
      h5: {text: 'text-neutral-600 dark:text-neutral-300'},
      h6: {text: 'text-neutral-500 dark:text-neutral-400'},
      p: {text: 'text-neutral-700 dark:text-neutral-300'},
      span: {text: 'text-neutral-700 dark:text-neutral-300'},
      strong: {text: 'text-neutral-800 dark:text-neutral-200'},
      em: {text: 'text-neutral-600 dark:text-neutral-400'},
      li: {text: 'text-neutral-700 dark:text-neutral-300'},
      a: {
        text: 'text-neutral-600 dark:text-neutral-400',
        hover: 'hover:text-neutral-900 dark:hover:text-neutral-100',
        focus: 'focus:ring-neutral-400 dark:focus:ring-neutral-500'
      },
      code: {text: 'text-neutral-700 dark:text-neutral-300', background: 'bg-neutral-100 dark:bg-neutral-800'},
      pre: {background: 'bg-neutral-50 dark:bg-neutral-900', border: 'border-neutral-200 dark:border-neutral-700'},
      blockquote: {
        text: 'text-neutral-600 dark:text-neutral-400',
        background: 'bg-neutral-50 dark:bg-neutral-800/40',
        border: 'border-neutral-300 dark:border-neutral-600'
      },
      hr: {border: 'border-neutral-200 dark:border-neutral-700'},
      th: {
        text: 'text-neutral-700 dark:text-neutral-300',
        background: 'bg-neutral-100 dark:bg-neutral-800/60',
        border: 'border-neutral-200 dark:border-neutral-700'
      },
      td: {text: 'text-neutral-600 dark:text-neutral-400', border: 'border-neutral-200 dark:border-neutral-700'},
      table: {border: 'border-neutral-200 dark:border-neutral-700'},
      button: {
        text: 'text-neutral-700 dark:text-neutral-200',
        background: 'bg-neutral-50 dark:bg-neutral-800',
        border: 'border-neutral-300 dark:border-neutral-600',
        hover: 'hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-neutral-100',
        active: 'active:bg-neutral-200 dark:active:bg-neutral-600',
        focus: 'focus:ring-neutral-400 dark:focus:ring-neutral-500'
      },
    },
    // ── stone ─────────────────────────────────────────────────────────────────
    stone: {
      selection: 'selection:bg-stone-200/70 dark:selection:bg-stone-500/70',
      h1: {text: 'text-stone-800 dark:text-stone-100', border: 'border-stone-200 dark:border-stone-700'},
      h2: {text: 'text-stone-800 dark:text-stone-100', border: 'border-stone-200 dark:border-stone-700'},
      h3: {text: 'text-stone-700 dark:text-stone-200'},
      h4: {text: 'text-stone-700 dark:text-stone-200'},
      h5: {text: 'text-stone-600 dark:text-stone-300'},
      h6: {text: 'text-stone-500 dark:text-stone-400'},
      p: {text: 'text-stone-700 dark:text-stone-300'},
      span: {text: 'text-stone-700 dark:text-stone-300'},
      strong: {text: 'text-stone-800 dark:text-stone-200'},
      em: {text: 'text-stone-600 dark:text-stone-400'},
      li: {text: 'text-stone-700 dark:text-stone-300'},
      a: {
        text: 'text-stone-600 dark:text-stone-400',
        hover: 'hover:text-stone-900 dark:hover:text-stone-100',
        focus: 'focus:ring-stone-400 dark:focus:ring-stone-500'
      },
      code: {text: 'text-stone-700 dark:text-stone-300', background: 'bg-stone-100 dark:bg-stone-800'},
      pre: {background: 'bg-stone-50 dark:bg-stone-900', border: 'border-stone-200 dark:border-stone-700'},
      blockquote: {
        text: 'text-stone-600 dark:text-stone-400',
        background: 'bg-stone-50 dark:bg-stone-800/40',
        border: 'border-stone-300 dark:border-stone-600'
      },
      hr: {border: 'border-stone-200 dark:border-stone-700'},
      th: {
        text: 'text-stone-700 dark:text-stone-300',
        background: 'bg-stone-100 dark:bg-stone-800/60',
        border: 'border-stone-200 dark:border-stone-700'
      },
      td: {text: 'text-stone-600 dark:text-stone-400', border: 'border-stone-200 dark:border-stone-700'},
      table: {border: 'border-stone-200 dark:border-stone-700'},
      button: {
        text: 'text-stone-700 dark:text-stone-200',
        background: 'bg-stone-50 dark:bg-stone-800',
        border: 'border-stone-300 dark:border-stone-600',
        hover: 'hover:bg-stone-100 dark:hover:bg-stone-700 hover:text-stone-900 dark:hover:text-stone-100',
        active: 'active:bg-stone-200 dark:active:bg-stone-600',
        focus: 'focus:ring-stone-400 dark:focus:ring-stone-500'
      },
    },
    // ── red ───────────────────────────────────────────────────────────────────
    red: {
      selection: 'selection:bg-red-200/70 dark:selection:bg-red-500/70',
      h1: {text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800'},
      h2: {text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800'},
      h3: {text: 'text-red-700 dark:text-red-300'},
      h4: {text: 'text-red-600 dark:text-red-400'},
      h5: {text: 'text-red-600 dark:text-red-400'},
      h6: {text: 'text-red-500 dark:text-red-500'},
      p: {text: 'text-red-900 dark:text-red-100'},
      span: {text: 'text-red-900 dark:text-red-100'},
      strong: {text: 'text-red-800 dark:text-red-200'},
      em: {text: 'text-red-700 dark:text-red-300'},
      li: {text: 'text-red-900 dark:text-red-100'},
      a: {
        text: 'text-red-600 dark:text-red-400',
        hover: 'hover:text-red-800 dark:hover:text-red-200',
        focus: 'focus:ring-red-400 dark:focus:ring-red-500'
      },
      code: {text: 'text-red-700 dark:text-red-300', background: 'bg-red-100 dark:bg-red-900/30'},
      pre: {background: 'bg-red-50 dark:bg-red-950/40', border: 'border-red-200 dark:border-red-800'},
      blockquote: {
        text: 'text-red-700 dark:text-red-300',
        background: 'bg-red-50 dark:bg-red-900/20',
        border: 'border-red-400 dark:border-red-600'
      },
      hr: {border: 'border-red-200 dark:border-red-800'},
      th: {
        text: 'text-red-700 dark:text-red-300',
        background: 'bg-red-100 dark:bg-red-900/30',
        border: 'border-red-200 dark:border-red-800'
      },
      td: {text: 'text-red-900 dark:text-red-100', border: 'border-red-200 dark:border-red-800'},
      table: {border: 'border-red-200 dark:border-red-800'},
      button: {
        text: 'text-red-700 dark:text-red-200',
        background: 'bg-red-50 dark:bg-red-900/20',
        border: 'border-red-300 dark:border-red-700',
        hover: 'hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-900 dark:hover:text-red-100',
        active: 'active:bg-red-200 dark:active:bg-red-900/40',
        focus: 'focus:ring-red-400 dark:focus:ring-red-500'
      },
    },
    // ── orange ────────────────────────────────────────────────────────────────
    orange: {
      selection: 'selection:bg-orange-200/70 dark:selection:bg-orange-500/70',
      h1: {text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-800'},
      h2: {text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-800'},
      h3: {text: 'text-orange-700 dark:text-orange-300'},
      h4: {text: 'text-orange-600 dark:text-orange-400'},
      h5: {text: 'text-orange-600 dark:text-orange-400'},
      h6: {text: 'text-orange-500 dark:text-orange-500'},
      p: {text: 'text-orange-900 dark:text-orange-100'},
      span: {text: 'text-orange-900 dark:text-orange-100'},
      strong: {text: 'text-orange-800 dark:text-orange-200'},
      em: {text: 'text-orange-700 dark:text-orange-300'},
      li: {text: 'text-orange-900 dark:text-orange-100'},
      a: {
        text: 'text-orange-600 dark:text-orange-400',
        hover: 'hover:text-orange-800 dark:hover:text-orange-200',
        focus: 'focus:ring-orange-400 dark:focus:ring-orange-500'
      },
      code: {text: 'text-orange-700 dark:text-orange-300', background: 'bg-orange-100 dark:bg-orange-900/30'},
      pre: {background: 'bg-orange-50 dark:bg-orange-950/40', border: 'border-orange-200 dark:border-orange-800'},
      blockquote: {
        text: 'text-orange-700 dark:text-orange-300',
        background: 'bg-orange-50 dark:bg-orange-900/20',
        border: 'border-orange-400 dark:border-orange-600'
      },
      hr: {border: 'border-orange-200 dark:border-orange-800'},
      th: {
        text: 'text-orange-700 dark:text-orange-300',
        background: 'bg-orange-100 dark:bg-orange-900/30',
        border: 'border-orange-200 dark:border-orange-800'
      },
      td: {text: 'text-orange-900 dark:text-orange-100', border: 'border-orange-200 dark:border-orange-800'},
      table: {border: 'border-orange-200 dark:border-orange-800'},
      button: {
        text: 'text-orange-700 dark:text-orange-200',
        background: 'bg-orange-50 dark:bg-orange-900/20',
        border: 'border-orange-300 dark:border-orange-700',
        hover: 'hover:bg-orange-100 dark:hover:bg-orange-900/30 hover:text-orange-900 dark:hover:text-orange-100',
        active: 'active:bg-orange-200 dark:active:bg-orange-900/40',
        focus: 'focus:ring-orange-400 dark:focus:ring-orange-500'
      },
    },
    // ── amber ─────────────────────────────────────────────────────────────────
    amber: {
      selection: 'selection:bg-amber-200/70 dark:selection:bg-amber-500/70',
      h1: {text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800'},
      h2: {text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800'},
      h3: {text: 'text-amber-700 dark:text-amber-300'},
      h4: {text: 'text-amber-600 dark:text-amber-400'},
      h5: {text: 'text-amber-600 dark:text-amber-400'},
      h6: {text: 'text-amber-500 dark:text-amber-500'},
      p: {text: 'text-amber-900 dark:text-amber-100'},
      span: {text: 'text-amber-900 dark:text-amber-100'},
      strong: {text: 'text-amber-800 dark:text-amber-200'},
      em: {text: 'text-amber-700 dark:text-amber-300'},
      li: {text: 'text-amber-900 dark:text-amber-100'},
      a: {
        text: 'text-amber-600 dark:text-amber-400',
        hover: 'hover:text-amber-800 dark:hover:text-amber-200',
        focus: 'focus:ring-amber-400 dark:focus:ring-amber-500'
      },
      code: {text: 'text-amber-700 dark:text-amber-300', background: 'bg-amber-100 dark:bg-amber-900/30'},
      pre: {background: 'bg-amber-50 dark:bg-amber-950/40', border: 'border-amber-200 dark:border-amber-800'},
      blockquote: {
        text: 'text-amber-700 dark:text-amber-300',
        background: 'bg-amber-50 dark:bg-amber-900/20',
        border: 'border-amber-400 dark:border-amber-600'
      },
      hr: {border: 'border-amber-200 dark:border-amber-800'},
      th: {
        text: 'text-amber-700 dark:text-amber-300',
        background: 'bg-amber-100 dark:bg-amber-900/30',
        border: 'border-amber-200 dark:border-amber-800'
      },
      td: {text: 'text-amber-900 dark:text-amber-100', border: 'border-amber-200 dark:border-amber-800'},
      table: {border: 'border-amber-200 dark:border-amber-800'},
      button: {
        text: 'text-amber-700 dark:text-amber-200',
        background: 'bg-amber-50 dark:bg-amber-900/20',
        border: 'border-amber-300 dark:border-amber-700',
        hover: 'hover:bg-amber-100 dark:hover:bg-amber-900/30 hover:text-amber-900 dark:hover:text-amber-100',
        active: 'active:bg-amber-200 dark:active:bg-amber-900/40',
        focus: 'focus:ring-amber-400 dark:focus:ring-amber-500'
      },
    },
    // ── yellow ────────────────────────────────────────────────────────────────
    yellow: {
      selection: 'selection:bg-yellow-200/70 dark:selection:bg-yellow-500/70',
      h1: {text: 'text-yellow-700 dark:text-yellow-300', border: 'border-yellow-200 dark:border-yellow-800'},
      h2: {text: 'text-yellow-700 dark:text-yellow-300', border: 'border-yellow-200 dark:border-yellow-800'},
      h3: {text: 'text-yellow-700 dark:text-yellow-300'},
      h4: {text: 'text-yellow-600 dark:text-yellow-400'},
      h5: {text: 'text-yellow-600 dark:text-yellow-400'},
      h6: {text: 'text-yellow-500 dark:text-yellow-500'},
      p: {text: 'text-yellow-900 dark:text-yellow-100'},
      span: {text: 'text-yellow-900 dark:text-yellow-100'},
      strong: {text: 'text-yellow-800 dark:text-yellow-200'},
      em: {text: 'text-yellow-700 dark:text-yellow-300'},
      li: {text: 'text-yellow-900 dark:text-yellow-100'},
      a: {
        text: 'text-yellow-600 dark:text-yellow-400',
        hover: 'hover:text-yellow-800 dark:hover:text-yellow-200',
        focus: 'focus:ring-yellow-400 dark:focus:ring-yellow-500'
      },
      code: {text: 'text-yellow-700 dark:text-yellow-300', background: 'bg-yellow-100 dark:bg-yellow-900/30'},
      pre: {background: 'bg-yellow-50 dark:bg-yellow-950/40', border: 'border-yellow-200 dark:border-yellow-800'},
      blockquote: {
        text: 'text-yellow-700 dark:text-yellow-300',
        background: 'bg-yellow-50 dark:bg-yellow-900/20',
        border: 'border-yellow-400 dark:border-yellow-600'
      },
      hr: {border: 'border-yellow-200 dark:border-yellow-800'},
      th: {
        text: 'text-yellow-700 dark:text-yellow-300',
        background: 'bg-yellow-100 dark:bg-yellow-900/30',
        border: 'border-yellow-200 dark:border-yellow-800'
      },
      td: {text: 'text-yellow-900 dark:text-yellow-100', border: 'border-yellow-200 dark:border-yellow-800'},
      table: {border: 'border-yellow-200 dark:border-yellow-800'},
      button: {
        text: 'text-yellow-700 dark:text-yellow-200',
        background: 'bg-yellow-50 dark:bg-yellow-900/20',
        border: 'border-yellow-300 dark:border-yellow-700',
        hover: 'hover:bg-yellow-100 dark:hover:bg-yellow-900/30 hover:text-yellow-900 dark:hover:text-yellow-100',
        active: 'active:bg-yellow-200 dark:active:bg-yellow-900/40',
        focus: 'focus:ring-yellow-400 dark:focus:ring-yellow-500'
      },
    },
    // ── lime ──────────────────────────────────────────────────────────────────
    lime: {
      selection: 'selection:bg-lime-200/70 dark:selection:bg-lime-500/70',
      h1: {text: 'text-lime-700 dark:text-lime-300', border: 'border-lime-200 dark:border-lime-800'},
      h2: {text: 'text-lime-700 dark:text-lime-300', border: 'border-lime-200 dark:border-lime-800'},
      h3: {text: 'text-lime-700 dark:text-lime-300'},
      h4: {text: 'text-lime-600 dark:text-lime-400'},
      h5: {text: 'text-lime-600 dark:text-lime-400'},
      h6: {text: 'text-lime-500 dark:text-lime-500'},
      p: {text: 'text-lime-900 dark:text-lime-100'},
      span: {text: 'text-lime-900 dark:text-lime-100'},
      strong: {text: 'text-lime-800 dark:text-lime-200'},
      em: {text: 'text-lime-700 dark:text-lime-300'},
      li: {text: 'text-lime-900 dark:text-lime-100'},
      a: {
        text: 'text-lime-600 dark:text-lime-400',
        hover: 'hover:text-lime-800 dark:hover:text-lime-200',
        focus: 'focus:ring-lime-400 dark:focus:ring-lime-500'
      },
      code: {text: 'text-lime-700 dark:text-lime-300', background: 'bg-lime-100 dark:bg-lime-900/30'},
      pre: {background: 'bg-lime-50 dark:bg-lime-950/40', border: 'border-lime-200 dark:border-lime-800'},
      blockquote: {
        text: 'text-lime-700 dark:text-lime-300',
        background: 'bg-lime-50 dark:bg-lime-900/20',
        border: 'border-lime-400 dark:border-lime-600'
      },
      hr: {border: 'border-lime-200 dark:border-lime-800'},
      th: {
        text: 'text-lime-700 dark:text-lime-300',
        background: 'bg-lime-100 dark:bg-lime-900/30',
        border: 'border-lime-200 dark:border-lime-800'
      },
      td: {text: 'text-lime-900 dark:text-lime-100', border: 'border-lime-200 dark:border-lime-800'},
      table: {border: 'border-lime-200 dark:border-lime-800'},
      button: {
        text: 'text-lime-700 dark:text-lime-200',
        background: 'bg-lime-50 dark:bg-lime-900/20',
        border: 'border-lime-300 dark:border-lime-700',
        hover: 'hover:bg-lime-100 dark:hover:bg-lime-900/30 hover:text-lime-900 dark:hover:text-lime-100',
        active: 'active:bg-lime-200 dark:active:bg-lime-900/40',
        focus: 'focus:ring-lime-400 dark:focus:ring-lime-500'
      },
    },
    // ── green ─────────────────────────────────────────────────────────────────
    green: {
      selection: 'selection:bg-green-200/70 dark:selection:bg-green-500/70',
      h1: {text: 'text-green-700 dark:text-green-300', border: 'border-green-200 dark:border-green-800'},
      h2: {text: 'text-green-700 dark:text-green-300', border: 'border-green-200 dark:border-green-800'},
      h3: {text: 'text-green-700 dark:text-green-300'},
      h4: {text: 'text-green-600 dark:text-green-400'},
      h5: {text: 'text-green-600 dark:text-green-400'},
      h6: {text: 'text-green-500 dark:text-green-500'},
      p: {text: 'text-green-900 dark:text-green-100'},
      span: {text: 'text-green-900 dark:text-green-100'},
      strong: {text: 'text-green-800 dark:text-green-200'},
      em: {text: 'text-green-700 dark:text-green-300'},
      li: {text: 'text-green-900 dark:text-green-100'},
      a: {
        text: 'text-green-600 dark:text-green-400',
        hover: 'hover:text-green-800 dark:hover:text-green-200',
        focus: 'focus:ring-green-400 dark:focus:ring-green-500'
      },
      code: {text: 'text-green-700 dark:text-green-300', background: 'bg-green-100 dark:bg-green-900/30'},
      pre: {background: 'bg-green-50 dark:bg-green-950/40', border: 'border-green-200 dark:border-green-800'},
      blockquote: {
        text: 'text-green-700 dark:text-green-300',
        background: 'bg-green-50 dark:bg-green-900/20',
        border: 'border-green-400 dark:border-green-600'
      },
      hr: {border: 'border-green-200 dark:border-green-800'},
      th: {
        text: 'text-green-700 dark:text-green-300',
        background: 'bg-green-100 dark:bg-green-900/30',
        border: 'border-green-200 dark:border-green-800'
      },
      td: {text: 'text-green-900 dark:text-green-100', border: 'border-green-200 dark:border-green-800'},
      table: {border: 'border-green-200 dark:border-green-800'},
      button: {
        text: 'text-green-700 dark:text-green-200',
        background: 'bg-green-50 dark:bg-green-900/20',
        border: 'border-green-300 dark:border-green-700',
        hover: 'hover:bg-green-100 dark:hover:bg-green-900/30 hover:text-green-900 dark:hover:text-green-100',
        active: 'active:bg-green-200 dark:active:bg-green-900/40',
        focus: 'focus:ring-green-400 dark:focus:ring-green-500'
      },
    },
    // ── emerald ───────────────────────────────────────────────────────────────
    emerald: {
      selection: 'selection:bg-emerald-200/70 dark:selection:bg-emerald-500/70',
      h1: {text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800'},
      h2: {text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800'},
      h3: {text: 'text-emerald-700 dark:text-emerald-300'},
      h4: {text: 'text-emerald-600 dark:text-emerald-400'},
      h5: {text: 'text-emerald-600 dark:text-emerald-400'},
      h6: {text: 'text-emerald-500 dark:text-emerald-500'},
      p: {text: 'text-emerald-900 dark:text-emerald-100'},
      span: {text: 'text-emerald-900 dark:text-emerald-100'},
      strong: {text: 'text-emerald-800 dark:text-emerald-200'},
      em: {text: 'text-emerald-700 dark:text-emerald-300'},
      li: {text: 'text-emerald-900 dark:text-emerald-100'},
      a: {
        text: 'text-emerald-600 dark:text-emerald-400',
        hover: 'hover:text-emerald-800 dark:hover:text-emerald-200',
        focus: 'focus:ring-emerald-400 dark:focus:ring-emerald-500'
      },
      code: {text: 'text-emerald-700 dark:text-emerald-300', background: 'bg-emerald-100 dark:bg-emerald-900/30'},
      pre: {background: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-200 dark:border-emerald-800'},
      blockquote: {
        text: 'text-emerald-700 dark:text-emerald-300',
        background: 'bg-emerald-50 dark:bg-emerald-900/20',
        border: 'border-emerald-400 dark:border-emerald-600'
      },
      hr: {border: 'border-emerald-200 dark:border-emerald-800'},
      th: {
        text: 'text-emerald-700 dark:text-emerald-300',
        background: 'bg-emerald-100 dark:bg-emerald-900/30',
        border: 'border-emerald-200 dark:border-emerald-800'
      },
      td: {text: 'text-emerald-900 dark:text-emerald-100', border: 'border-emerald-200 dark:border-emerald-800'},
      table: {border: 'border-emerald-200 dark:border-emerald-800'},
      button: {
        text: 'text-emerald-700 dark:text-emerald-200',
        background: 'bg-emerald-50 dark:bg-emerald-900/20',
        border: 'border-emerald-300 dark:border-emerald-700',
        hover: 'hover:bg-emerald-100 dark:hover:bg-emerald-900/30 hover:text-emerald-900 dark:hover:text-emerald-100',
        active: 'active:bg-emerald-200 dark:active:bg-emerald-900/40',
        focus: 'focus:ring-emerald-400 dark:focus:ring-emerald-500'
      },
    },
    // ── teal ──────────────────────────────────────────────────────────────────
    teal: {
      selection: 'selection:bg-teal-200/70 dark:selection:bg-teal-500/70',
      h1: {text: 'text-teal-700 dark:text-teal-300', border: 'border-teal-200 dark:border-teal-800'},
      h2: {text: 'text-teal-700 dark:text-teal-300', border: 'border-teal-200 dark:border-teal-800'},
      h3: {text: 'text-teal-700 dark:text-teal-300'},
      h4: {text: 'text-teal-600 dark:text-teal-400'},
      h5: {text: 'text-teal-600 dark:text-teal-400'},
      h6: {text: 'text-teal-500 dark:text-teal-500'},
      p: {text: 'text-teal-900 dark:text-teal-100'},
      span: {text: 'text-teal-900 dark:text-teal-100'},
      strong: {text: 'text-teal-800 dark:text-teal-200'},
      em: {text: 'text-teal-700 dark:text-teal-300'},
      li: {text: 'text-teal-900 dark:text-teal-100'},
      a: {
        text: 'text-teal-600 dark:text-teal-400',
        hover: 'hover:text-teal-800 dark:hover:text-teal-200',
        focus: 'focus:ring-teal-400 dark:focus:ring-teal-500'
      },
      code: {text: 'text-teal-700 dark:text-teal-300', background: 'bg-teal-100 dark:bg-teal-900/30'},
      pre: {background: 'bg-teal-50 dark:bg-teal-950/40', border: 'border-teal-200 dark:border-teal-800'},
      blockquote: {
        text: 'text-teal-700 dark:text-teal-300',
        background: 'bg-teal-50 dark:bg-teal-900/20',
        border: 'border-teal-400 dark:border-teal-600'
      },
      hr: {border: 'border-teal-200 dark:border-teal-800'},
      th: {
        text: 'text-teal-700 dark:text-teal-300',
        background: 'bg-teal-100 dark:bg-teal-900/30',
        border: 'border-teal-200 dark:border-teal-800'
      },
      td: {text: 'text-teal-900 dark:text-teal-100', border: 'border-teal-200 dark:border-teal-800'},
      table: {border: 'border-teal-200 dark:border-teal-800'},
      button: {
        text: 'text-teal-700 dark:text-teal-200',
        background: 'bg-teal-50 dark:bg-teal-900/20',
        border: 'border-teal-300 dark:border-teal-700',
        hover: 'hover:bg-teal-100 dark:hover:bg-teal-900/30 hover:text-teal-900 dark:hover:text-teal-100',
        active: 'active:bg-teal-200 dark:active:bg-teal-900/40',
        focus: 'focus:ring-teal-400 dark:focus:ring-teal-500'
      },
    },
    // ── cyan ──────────────────────────────────────────────────────────────────
    cyan: {
      selection: 'selection:bg-cyan-200/70 dark:selection:bg-cyan-500/70',
      h1: {text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-200 dark:border-cyan-800'},
      h2: {text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-200 dark:border-cyan-800'},
      h3: {text: 'text-cyan-700 dark:text-cyan-300'},
      h4: {text: 'text-cyan-600 dark:text-cyan-400'},
      h5: {text: 'text-cyan-600 dark:text-cyan-400'},
      h6: {text: 'text-cyan-500 dark:text-cyan-500'},
      p: {text: 'text-cyan-900 dark:text-cyan-100'},
      span: {text: 'text-cyan-900 dark:text-cyan-100'},
      strong: {text: 'text-cyan-800 dark:text-cyan-200'},
      em: {text: 'text-cyan-700 dark:text-cyan-300'},
      li: {text: 'text-cyan-900 dark:text-cyan-100'},
      a: {
        text: 'text-cyan-600 dark:text-cyan-400',
        hover: 'hover:text-cyan-800 dark:hover:text-cyan-200',
        focus: 'focus:ring-cyan-400 dark:focus:ring-cyan-500'
      },
      code: {text: 'text-cyan-700 dark:text-cyan-300', background: 'bg-cyan-100 dark:bg-cyan-900/30'},
      pre: {background: 'bg-cyan-50 dark:bg-cyan-950/40', border: 'border-cyan-200 dark:border-cyan-800'},
      blockquote: {
        text: 'text-cyan-700 dark:text-cyan-300',
        background: 'bg-cyan-50 dark:bg-cyan-900/20',
        border: 'border-cyan-400 dark:border-cyan-600'
      },
      hr: {border: 'border-cyan-200 dark:border-cyan-800'},
      th: {
        text: 'text-cyan-700 dark:text-cyan-300',
        background: 'bg-cyan-100 dark:bg-cyan-900/30',
        border: 'border-cyan-200 dark:border-cyan-800'
      },
      td: {text: 'text-cyan-900 dark:text-cyan-100', border: 'border-cyan-200 dark:border-cyan-800'},
      table: {border: 'border-cyan-200 dark:border-cyan-800'},
      button: {
        text: 'text-cyan-700 dark:text-cyan-200',
        background: 'bg-cyan-50 dark:bg-cyan-900/20',
        border: 'border-cyan-300 dark:border-cyan-700',
        hover: 'hover:bg-cyan-100 dark:hover:bg-cyan-900/30 hover:text-cyan-900 dark:hover:text-cyan-100',
        active: 'active:bg-cyan-200 dark:active:bg-cyan-900/40',
        focus: 'focus:ring-cyan-400 dark:focus:ring-cyan-500'
      },
    },
    // ── sky ───────────────────────────────────────────────────────────────────
    sky: {
      selection: 'selection:bg-sky-200/70 dark:selection:bg-sky-500/70',
      h1: {text: 'text-sky-700 dark:text-sky-300', border: 'border-sky-200 dark:border-sky-800'},
      h2: {text: 'text-sky-700 dark:text-sky-300', border: 'border-sky-200 dark:border-sky-800'},
      h3: {text: 'text-sky-700 dark:text-sky-300'},
      h4: {text: 'text-sky-600 dark:text-sky-400'},
      h5: {text: 'text-sky-600 dark:text-sky-400'},
      h6: {text: 'text-sky-500 dark:text-sky-500'},
      p: {text: 'text-sky-900 dark:text-sky-100'},
      span: {text: 'text-sky-900 dark:text-sky-100'},
      strong: {text: 'text-sky-800 dark:text-sky-200'},
      em: {text: 'text-sky-700 dark:text-sky-300'},
      li: {text: 'text-sky-900 dark:text-sky-100'},
      a: {
        text: 'text-sky-600 dark:text-sky-400',
        hover: 'hover:text-sky-800 dark:hover:text-sky-200',
        focus: 'focus:ring-sky-400 dark:focus:ring-sky-500'
      },
      code: {text: 'text-sky-700 dark:text-sky-300', background: 'bg-sky-100 dark:bg-sky-900/30'},
      pre: {background: 'bg-sky-50 dark:bg-sky-950/40', border: 'border-sky-200 dark:border-sky-800'},
      blockquote: {
        text: 'text-sky-700 dark:text-sky-300',
        background: 'bg-sky-50 dark:bg-sky-900/20',
        border: 'border-sky-400 dark:border-sky-600'
      },
      hr: {border: 'border-sky-200 dark:border-sky-800'},
      th: {
        text: 'text-sky-700 dark:text-sky-300',
        background: 'bg-sky-100 dark:bg-sky-900/30',
        border: 'border-sky-200 dark:border-sky-800'
      },
      td: {text: 'text-sky-900 dark:text-sky-100', border: 'border-sky-200 dark:border-sky-800'},
      table: {border: 'border-sky-200 dark:border-sky-800'},
      button: {
        text: 'text-sky-700 dark:text-sky-200',
        background: 'bg-sky-50 dark:bg-sky-900/20',
        border: 'border-sky-300 dark:border-sky-700',
        hover: 'hover:bg-sky-100 dark:hover:bg-sky-900/30 hover:text-sky-900 dark:hover:text-sky-100',
        active: 'active:bg-sky-200 dark:active:bg-sky-900/40',
        focus: 'focus:ring-sky-400 dark:focus:ring-sky-500'
      },
    },
    // ── blue ──────────────────────────────────────────────────────────────────
    blue: {
      selection: 'selection:bg-blue-200/70 dark:selection:bg-blue-500/70',
      h1: {text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800'},
      h2: {text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800'},
      h3: {text: 'text-blue-700 dark:text-blue-300'},
      h4: {text: 'text-blue-600 dark:text-blue-400'},
      h5: {text: 'text-blue-600 dark:text-blue-400'},
      h6: {text: 'text-blue-500 dark:text-blue-500'},
      p: {text: 'text-blue-900 dark:text-blue-100'},
      span: {text: 'text-blue-900 dark:text-blue-100'},
      strong: {text: 'text-blue-800 dark:text-blue-200'},
      em: {text: 'text-blue-700 dark:text-blue-300'},
      li: {text: 'text-blue-900 dark:text-blue-100'},
      a: {
        text: 'text-blue-600 dark:text-blue-400',
        hover: 'hover:text-blue-800 dark:hover:text-blue-200',
        focus: 'focus:ring-blue-400 dark:focus:ring-blue-500'
      },
      code: {text: 'text-blue-700 dark:text-blue-300', background: 'bg-blue-100 dark:bg-blue-900/30'},
      pre: {background: 'bg-blue-50 dark:bg-blue-950/40', border: 'border-blue-200 dark:border-blue-800'},
      blockquote: {
        text: 'text-blue-700 dark:text-blue-300',
        background: 'bg-blue-50 dark:bg-blue-900/20',
        border: 'border-blue-400 dark:border-blue-600'
      },
      hr: {border: 'border-blue-200 dark:border-blue-800'},
      th: {
        text: 'text-blue-700 dark:text-blue-300',
        background: 'bg-blue-100 dark:bg-blue-900/30',
        border: 'border-blue-200 dark:border-blue-800'
      },
      td: {text: 'text-blue-900 dark:text-blue-100', border: 'border-blue-200 dark:border-blue-800'},
      table: {border: 'border-blue-200 dark:border-blue-800'},
      button: {
        text: 'text-blue-700 dark:text-blue-200',
        background: 'bg-blue-50 dark:bg-blue-900/20',
        border: 'border-blue-300 dark:border-blue-700',
        hover: 'hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-900 dark:hover:text-blue-100',
        active: 'active:bg-blue-200 dark:active:bg-blue-900/40',
        focus: 'focus:ring-blue-400 dark:focus:ring-blue-500'
      },
    },
    // ── indigo ────────────────────────────────────────────────────────────────
    indigo: {
      selection: 'selection:bg-indigo-200/70 dark:selection:bg-indigo-500/70',
      h1: {text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-800'},
      h2: {text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-800'},
      h3: {text: 'text-indigo-700 dark:text-indigo-300'},
      h4: {text: 'text-indigo-600 dark:text-indigo-400'},
      h5: {text: 'text-indigo-600 dark:text-indigo-400'},
      h6: {text: 'text-indigo-500 dark:text-indigo-500'},
      p: {text: 'text-indigo-900 dark:text-indigo-100'},
      span: {text: 'text-indigo-900 dark:text-indigo-100'},
      strong: {text: 'text-indigo-800 dark:text-indigo-200'},
      em: {text: 'text-indigo-700 dark:text-indigo-300'},
      li: {text: 'text-indigo-900 dark:text-indigo-100'},
      a: {
        text: 'text-indigo-600 dark:text-indigo-400',
        hover: 'hover:text-indigo-800 dark:hover:text-indigo-200',
        focus: 'focus:ring-indigo-400 dark:focus:ring-indigo-500'
      },
      code: {text: 'text-indigo-700 dark:text-indigo-300', background: 'bg-indigo-100 dark:bg-indigo-900/30'},
      pre: {background: 'bg-indigo-50 dark:bg-indigo-950/40', border: 'border-indigo-200 dark:border-indigo-800'},
      blockquote: {
        text: 'text-indigo-700 dark:text-indigo-300',
        background: 'bg-indigo-50 dark:bg-indigo-900/20',
        border: 'border-indigo-400 dark:border-indigo-600'
      },
      hr: {border: 'border-indigo-200 dark:border-indigo-800'},
      th: {
        text: 'text-indigo-700 dark:text-indigo-300',
        background: 'bg-indigo-100 dark:bg-indigo-900/30',
        border: 'border-indigo-200 dark:border-indigo-800'
      },
      td: {text: 'text-indigo-900 dark:text-indigo-100', border: 'border-indigo-200 dark:border-indigo-800'},
      table: {border: 'border-indigo-200 dark:border-indigo-800'},
      button: {
        text: 'text-indigo-700 dark:text-indigo-200',
        background: 'bg-indigo-50 dark:bg-indigo-900/20',
        border: 'border-indigo-300 dark:border-indigo-700',
        hover: 'hover:bg-indigo-100 dark:hover:bg-indigo-900/30 hover:text-indigo-900 dark:hover:text-indigo-100',
        active: 'active:bg-indigo-200 dark:active:bg-indigo-900/40',
        focus: 'focus:ring-indigo-400 dark:focus:ring-indigo-500'
      },
    },
    // ── violet ────────────────────────────────────────────────────────────────
    violet: {
      selection: 'selection:bg-violet-200/70 dark:selection:bg-violet-500/70',
      h1: {text: 'text-violet-700 dark:text-violet-300', border: 'border-violet-200 dark:border-violet-800'},
      h2: {text: 'text-violet-700 dark:text-violet-300', border: 'border-violet-200 dark:border-violet-800'},
      h3: {text: 'text-violet-700 dark:text-violet-300'},
      h4: {text: 'text-violet-600 dark:text-violet-400'},
      h5: {text: 'text-violet-600 dark:text-violet-400'},
      h6: {text: 'text-violet-500 dark:text-violet-500'},
      p: {text: 'text-violet-900 dark:text-violet-100'},
      span: {text: 'text-violet-900 dark:text-violet-100'},
      strong: {text: 'text-violet-800 dark:text-violet-200'},
      em: {text: 'text-violet-700 dark:text-violet-300'},
      li: {text: 'text-violet-900 dark:text-violet-100'},
      a: {
        text: 'text-violet-600 dark:text-violet-400',
        hover: 'hover:text-violet-800 dark:hover:text-violet-200',
        focus: 'focus:ring-violet-400 dark:focus:ring-violet-500'
      },
      code: {text: 'text-violet-700 dark:text-violet-300', background: 'bg-violet-100 dark:bg-violet-900/30'},
      pre: {background: 'bg-violet-50 dark:bg-violet-950/40', border: 'border-violet-200 dark:border-violet-800'},
      blockquote: {
        text: 'text-violet-700 dark:text-violet-300',
        background: 'bg-violet-50 dark:bg-violet-900/20',
        border: 'border-violet-400 dark:border-violet-600'
      },
      hr: {border: 'border-violet-200 dark:border-violet-800'},
      th: {
        text: 'text-violet-700 dark:text-violet-300',
        background: 'bg-violet-100 dark:bg-violet-900/30',
        border: 'border-violet-200 dark:border-violet-800'
      },
      td: {text: 'text-violet-900 dark:text-violet-100', border: 'border-violet-200 dark:border-violet-800'},
      table: {border: 'border-violet-200 dark:border-violet-800'},
      button: {
        text: 'text-violet-700 dark:text-violet-200',
        background: 'bg-violet-50 dark:bg-violet-900/20',
        border: 'border-violet-300 dark:border-violet-700',
        hover: 'hover:bg-violet-100 dark:hover:bg-violet-900/30 hover:text-violet-900 dark:hover:text-violet-100',
        active: 'active:bg-violet-200 dark:active:bg-violet-900/40',
        focus: 'focus:ring-violet-400 dark:focus:ring-violet-500'
      },
    },
    // ── purple ────────────────────────────────────────────────────────────────
    purple: {
      selection: 'selection:bg-purple-200/70 dark:selection:bg-purple-500/70',
      h1: {text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800'},
      h2: {text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800'},
      h3: {text: 'text-purple-700 dark:text-purple-300'},
      h4: {text: 'text-purple-600 dark:text-purple-400'},
      h5: {text: 'text-purple-600 dark:text-purple-400'},
      h6: {text: 'text-purple-500 dark:text-purple-500'},
      p: {text: 'text-purple-900 dark:text-purple-100'},
      span: {text: 'text-purple-900 dark:text-purple-100'},
      strong: {text: 'text-purple-800 dark:text-purple-200'},
      em: {text: 'text-purple-700 dark:text-purple-300'},
      li: {text: 'text-purple-900 dark:text-purple-100'},
      a: {
        text: 'text-purple-600 dark:text-purple-400',
        hover: 'hover:text-purple-800 dark:hover:text-purple-200',
        focus: 'focus:ring-purple-400 dark:focus:ring-purple-500'
      },
      code: {text: 'text-purple-700 dark:text-purple-300', background: 'bg-purple-100 dark:bg-purple-900/30'},
      pre: {background: 'bg-purple-50 dark:bg-purple-950/40', border: 'border-purple-200 dark:border-purple-800'},
      blockquote: {
        text: 'text-purple-700 dark:text-purple-300',
        background: 'bg-purple-50 dark:bg-purple-900/20',
        border: 'border-purple-400 dark:border-purple-600'
      },
      hr: {border: 'border-purple-200 dark:border-purple-800'},
      th: {
        text: 'text-purple-700 dark:text-purple-300',
        background: 'bg-purple-100 dark:bg-purple-900/30',
        border: 'border-purple-200 dark:border-purple-800'
      },
      td: {text: 'text-purple-900 dark:text-purple-100', border: 'border-purple-200 dark:border-purple-800'},
      table: {border: 'border-purple-200 dark:border-purple-800'},
      button: {
        text: 'text-purple-700 dark:text-purple-200',
        background: 'bg-purple-50 dark:bg-purple-900/20',
        border: 'border-purple-300 dark:border-purple-700',
        hover: 'hover:bg-purple-100 dark:hover:bg-purple-900/30 hover:text-purple-900 dark:hover:text-purple-100',
        active: 'active:bg-purple-200 dark:active:bg-purple-900/40',
        focus: 'focus:ring-purple-400 dark:focus:ring-purple-500'
      },
    },
    // ── fuchsia ───────────────────────────────────────────────────────────────
    fuchsia: {
      selection: 'selection:bg-fuchsia-200/70 dark:selection:bg-fuchsia-500/70',
      h1: {text: 'text-fuchsia-700 dark:text-fuchsia-300', border: 'border-fuchsia-200 dark:border-fuchsia-800'},
      h2: {text: 'text-fuchsia-700 dark:text-fuchsia-300', border: 'border-fuchsia-200 dark:border-fuchsia-800'},
      h3: {text: 'text-fuchsia-700 dark:text-fuchsia-300'},
      h4: {text: 'text-fuchsia-600 dark:text-fuchsia-400'},
      h5: {text: 'text-fuchsia-600 dark:text-fuchsia-400'},
      h6: {text: 'text-fuchsia-500 dark:text-fuchsia-500'},
      p: {text: 'text-fuchsia-900 dark:text-fuchsia-100'},
      span: {text: 'text-fuchsia-900 dark:text-fuchsia-100'},
      strong: {text: 'text-fuchsia-800 dark:text-fuchsia-200'},
      em: {text: 'text-fuchsia-700 dark:text-fuchsia-300'},
      li: {text: 'text-fuchsia-900 dark:text-fuchsia-100'},
      a: {
        text: 'text-fuchsia-600 dark:text-fuchsia-400',
        hover: 'hover:text-fuchsia-800 dark:hover:text-fuchsia-200',
        focus: 'focus:ring-fuchsia-400 dark:focus:ring-fuchsia-500'
      },
      code: {text: 'text-fuchsia-700 dark:text-fuchsia-300', background: 'bg-fuchsia-100 dark:bg-fuchsia-900/30'},
      pre: {background: 'bg-fuchsia-50 dark:bg-fuchsia-950/40', border: 'border-fuchsia-200 dark:border-fuchsia-800'},
      blockquote: {
        text: 'text-fuchsia-700 dark:text-fuchsia-300',
        background: 'bg-fuchsia-50 dark:bg-fuchsia-900/20',
        border: 'border-fuchsia-400 dark:border-fuchsia-600'
      },
      hr: {border: 'border-fuchsia-200 dark:border-fuchsia-800'},
      th: {
        text: 'text-fuchsia-700 dark:text-fuchsia-300',
        background: 'bg-fuchsia-100 dark:bg-fuchsia-900/30',
        border: 'border-fuchsia-200 dark:border-fuchsia-800'
      },
      td: {text: 'text-fuchsia-900 dark:text-fuchsia-100', border: 'border-fuchsia-200 dark:border-fuchsia-800'},
      table: {border: 'border-fuchsia-200 dark:border-fuchsia-800'},
      button: {
        text: 'text-fuchsia-700 dark:text-fuchsia-200',
        background: 'bg-fuchsia-50 dark:bg-fuchsia-900/20',
        border: 'border-fuchsia-300 dark:border-fuchsia-700',
        hover: 'hover:bg-fuchsia-100 dark:hover:bg-fuchsia-900/30 hover:text-fuchsia-900 dark:hover:text-fuchsia-100',
        active: 'active:bg-fuchsia-200 dark:active:bg-fuchsia-900/40',
        focus: 'focus:ring-fuchsia-400 dark:focus:ring-fuchsia-500'
      },
    },
    // ── pink ──────────────────────────────────────────────────────────────────
    pink: {
      selection: 'selection:bg-pink-200/70 dark:selection:bg-pink-500/70',
      h1: {text: 'text-pink-700 dark:text-pink-300', border: 'border-pink-200 dark:border-pink-800'},
      h2: {text: 'text-pink-700 dark:text-pink-300', border: 'border-pink-200 dark:border-pink-800'},
      h3: {text: 'text-pink-700 dark:text-pink-300'},
      h4: {text: 'text-pink-600 dark:text-pink-400'},
      h5: {text: 'text-pink-600 dark:text-pink-400'},
      h6: {text: 'text-pink-500 dark:text-pink-500'},
      p: {text: 'text-pink-900 dark:text-pink-100'},
      span: {text: 'text-pink-900 dark:text-pink-100'},
      strong: {text: 'text-pink-800 dark:text-pink-200'},
      em: {text: 'text-pink-700 dark:text-pink-300'},
      li: {text: 'text-pink-900 dark:text-pink-100'},
      a: {
        text: 'text-pink-600 dark:text-pink-400',
        hover: 'hover:text-pink-800 dark:hover:text-pink-200',
        focus: 'focus:ring-pink-400 dark:focus:ring-pink-500'
      },
      code: {text: 'text-pink-700 dark:text-pink-300', background: 'bg-pink-100 dark:bg-pink-900/30'},
      pre: {background: 'bg-pink-50 dark:bg-pink-950/40', border: 'border-pink-200 dark:border-pink-800'},
      blockquote: {
        text: 'text-pink-700 dark:text-pink-300',
        background: 'bg-pink-50 dark:bg-pink-900/20',
        border: 'border-pink-400 dark:border-pink-600'
      },
      hr: {border: 'border-pink-200 dark:border-pink-800'},
      th: {
        text: 'text-pink-700 dark:text-pink-300',
        background: 'bg-pink-100 dark:bg-pink-900/30',
        border: 'border-pink-200 dark:border-pink-800'
      },
      td: {text: 'text-pink-900 dark:text-pink-100', border: 'border-pink-200 dark:border-pink-800'},
      table: {border: 'border-pink-200 dark:border-pink-800'},
      button: {
        text: 'text-pink-700 dark:text-pink-200',
        background: 'bg-pink-50 dark:bg-pink-900/20',
        border: 'border-pink-300 dark:border-pink-700',
        hover: 'hover:bg-pink-100 dark:hover:bg-pink-900/30 hover:text-pink-900 dark:hover:text-pink-100',
        active: 'active:bg-pink-200 dark:active:bg-pink-900/40',
        focus: 'focus:ring-pink-400 dark:focus:ring-pink-500'
      },
    },
    // ── rose ──────────────────────────────────────────────────────────────────
    rose: {
      selection: 'selection:bg-rose-200/70 dark:selection:bg-rose-500/70',
      h1: {text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-800'},
      h2: {text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-800'},
      h3: {text: 'text-rose-700 dark:text-rose-300'},
      h4: {text: 'text-rose-600 dark:text-rose-400'},
      h5: {text: 'text-rose-600 dark:text-rose-400'},
      h6: {text: 'text-rose-500 dark:text-rose-500'},
      p: {text: 'text-rose-900 dark:text-rose-100'},
      span: {text: 'text-rose-900 dark:text-rose-100'},
      strong: {text: 'text-rose-800 dark:text-rose-200'},
      em: {text: 'text-rose-700 dark:text-rose-300'},
      li: {text: 'text-rose-900 dark:text-rose-100'},
      a: {
        text: 'text-rose-600 dark:text-rose-400',
        hover: 'hover:text-rose-800 dark:hover:text-rose-200',
        focus: 'focus:ring-rose-400 dark:focus:ring-rose-500'
      },
      code: {text: 'text-rose-700 dark:text-rose-300', background: 'bg-rose-100 dark:bg-rose-900/30'},
      pre: {background: 'bg-rose-50 dark:bg-rose-950/40', border: 'border-rose-200 dark:border-rose-800'},
      blockquote: {
        text: 'text-rose-700 dark:text-rose-300',
        background: 'bg-rose-50 dark:bg-rose-900/20',
        border: 'border-rose-400 dark:border-rose-600'
      },
      hr: {border: 'border-rose-200 dark:border-rose-800'},
      th: {
        text: 'text-rose-700 dark:text-rose-300',
        background: 'bg-rose-100 dark:bg-rose-900/30',
        border: 'border-rose-200 dark:border-rose-800'
      },
      td: {text: 'text-rose-900 dark:text-rose-100', border: 'border-rose-200 dark:border-rose-800'},
      table: {border: 'border-rose-200 dark:border-rose-800'},
      button: {
        text: 'text-rose-700 dark:text-rose-200',
        background: 'bg-rose-50 dark:bg-rose-900/20',
        border: 'border-rose-300 dark:border-rose-700',
        hover: 'hover:bg-rose-100 dark:hover:bg-rose-900/30 hover:text-rose-900 dark:hover:text-rose-100',
        active: 'active:bg-rose-200 dark:active:bg-rose-900/40',
        focus: 'focus:ring-rose-400 dark:focus:ring-rose-500'
      },
    },
  },
}

// ── Material 3 ────────────────────────────────────────────────────────────────
// Typography inspiration:
//   • Roboto font — the M3 typeface
//   • Slightly wider letter-spacing on headings (tracking-tight → normal)
//   • Rounded corners everywhere (rounded-xl / rounded-2xl)
//   • font-medium for headings (M3 uses weight 500 for display/headline roles)
//   • Tonal surface containers for code / blockquote / pre
//   • border-b-2 dividers (M3 uses thicker outlines)
//   • Generous padding / spacing matching M3 density defaults
//
// Color inspiration:
//   • text     → on-surface / on-primary-container tone (600 light / 300 dark)
//   • background → surface-container / tonal-container (50 / 900/30 opacity)
//   • border   → outline / outline-variant (300 light / 700 dark)
//   • hover    → state layer 8% opacity → bg-*-100 / bg-*-800/50
//   • active   → state layer 12% opacity → bg-*-200 / bg-*-700/60
//   • focus    → focus-indicator ring matching M3 focus ring style

export const materialMarkdownTheme: Theme = {
  name: 'material',
  fontFamily: "'Roboto', 'Google Sans', sans-serif",

  // ── Structural / layout — Material 3 density & shape ────────────────────────
  typography: {
    h1: 'text-2xl sm:text-3xl lg:text-4xl font-medium tracking-tight mt-0 mb-4 sm:mb-6 pb-2 sm:pb-3 border-b-2',
    h2: 'text-xl sm:text-2xl lg:text-3xl font-medium tracking-tight mt-8 sm:mt-10 mb-3 sm:mb-4 pb-1.5 sm:pb-2 border-b-2',
    h3: 'text-lg sm:text-xl lg:text-2xl font-medium tracking-normal mt-6 sm:mt-8 mb-2 sm:mb-3',
    h4: 'text-base sm:text-lg font-medium tracking-normal mt-5 sm:mt-6 mb-1.5 sm:mb-2',
    h5: 'text-sm sm:text-base font-medium tracking-wide mt-4 sm:mt-5 mb-1',
    h6: 'text-xs sm:text-sm font-medium tracking-wide mt-3 sm:mt-4 mb-1',
    p: 'leading-relaxed my-3 tracking-normal',
    a: 'underline-offset-4 hover:underline transition-colors duration-200 break-words rounded',
    strong: 'font-semibold',
    em: 'italic',
    // M3 inline code: tonal container shape, rounded-md
    code: 'px-1.5 sm:px-2 py-0.5 rounded-md text-[0.8em] sm:text-[0.875em] font-mono before:content-none after:content-none',
    // M3 code block: elevated tonal surface, rounded-2xl
    pre: 'rounded-2xl border-2 shadow-sm overflow-x-auto my-4 sm:my-6 text-sm',
    // M3 blockquote: tonal container with left accent, rounded shape
    blockquote: 'border-l-[3px] not-italic rounded-r-2xl px-4 sm:px-5 py-3 sm:py-4 my-4 sm:my-5',
    // M3 divider: hairline 1px (border-0 border-t keeps it thin)
    hr: 'my-6 sm:my-8 border-0 border-t',
    th: 'font-medium px-4 sm:px-5 py-2 sm:py-2.5 text-left text-xs sm:text-sm tracking-wide',
    td: 'px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm align-top border-t',
    ul: 'list-disc pl-5 sm:pl-6 my-3 sm:my-4 space-y-1',
    ol: 'list-decimal pl-5 sm:pl-6 my-3 sm:my-4 space-y-1',
    li: 'my-1 leading-relaxed',
    table: 'table-auto border-collapse my-4 w-full rounded-xl overflow-hidden',
    // M3 button: filled tonal shape — rounded-full, no sharp corners
    button: 'px-4 py-2 rounded-full text-sm font-medium border-2 cursor-pointer select-none transition-all duration-200',
    span: 'leading-normal tracking-normal',
  },

  // ── Per-color M3 tonal tokens — per-tag ──────────────────────────────────
  // Neutral family: muted on-surface tones, thicker borders (outline-variant)
  // Chromatic family: accent heading tones, tonal surface containers, M3 state layers
  color: {
    // ── slate ─────────────────────────────────────────────────────────────────
    slate: {
      selection: 'selection:bg-slate-200/60 dark:selection:bg-slate-700/50',
      h1: {text: 'text-slate-700 dark:text-slate-200', border: 'border-slate-300 dark:border-slate-600'},
      h2: {text: 'text-slate-700 dark:text-slate-200', border: 'border-slate-300 dark:border-slate-600'},
      h3: {text: 'text-slate-700 dark:text-slate-200'},
      h4: {text: 'text-slate-600 dark:text-slate-300'},
      h5: {text: 'text-slate-600 dark:text-slate-300'},
      h6: {text: 'text-slate-500 dark:text-slate-400'},
      p: {text: 'text-slate-800 dark:text-slate-200'},
      span: {text: 'text-slate-800 dark:text-slate-200'},
      strong: {text: 'text-slate-900 dark:text-slate-100'},
      em: {text: 'text-slate-600 dark:text-slate-400'},
      li: {text: 'text-slate-800 dark:text-slate-200'},
      a: {
        text: 'text-slate-600 dark:text-slate-400',
        hover: 'hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/50',
        focus: 'focus:ring-2 focus:ring-slate-500 dark:focus:ring-slate-400 focus:outline-none'
      },
      code: {text: 'text-slate-700 dark:text-slate-300', background: 'bg-slate-100 dark:bg-slate-800/60'},
      pre: {background: 'bg-slate-50 dark:bg-slate-900/60', border: 'border-slate-300 dark:border-slate-600'},
      blockquote: {
        text: 'text-slate-600 dark:text-slate-400',
        background: 'bg-slate-50 dark:bg-slate-900/30',
        border: 'border-slate-400 dark:border-slate-500'
      },
      hr: {border: 'border-slate-300 dark:border-slate-600'},
      th: {
        text: 'text-slate-700 dark:text-slate-300',
        background: 'bg-slate-100 dark:bg-slate-800/50',
        border: 'border-slate-300 dark:border-slate-600'
      },
      td: {text: 'text-slate-800 dark:text-slate-200', border: 'border-slate-200 dark:border-slate-700'},
      table: {border: 'border-slate-300 dark:border-slate-600'},
      button: {
        text: 'text-slate-700 dark:text-slate-200',
        background: 'bg-slate-100 dark:bg-slate-800/50',
        border: 'border-slate-300 dark:border-slate-600',
        hover: 'hover:bg-slate-200 dark:hover:bg-slate-700/60 hover:text-slate-900 dark:hover:text-slate-100',
        active: 'active:bg-slate-200 dark:active:bg-slate-700/60',
        focus: 'focus:ring-2 focus:ring-slate-500 dark:focus:ring-slate-400 focus:outline-none'
      },
    },
    // ── gray ──────────────────────────────────────────────────────────────────
    gray: {
      selection: 'selection:bg-gray-200/60 dark:selection:bg-gray-700/50',
      h1: {text: 'text-gray-700 dark:text-gray-200', border: 'border-gray-300 dark:border-gray-600'},
      h2: {text: 'text-gray-700 dark:text-gray-200', border: 'border-gray-300 dark:border-gray-600'},
      h3: {text: 'text-gray-700 dark:text-gray-200'},
      h4: {text: 'text-gray-600 dark:text-gray-300'},
      h5: {text: 'text-gray-600 dark:text-gray-300'},
      h6: {text: 'text-gray-500 dark:text-gray-400'},
      p: {text: 'text-gray-800 dark:text-gray-200'},
      span: {text: 'text-gray-800 dark:text-gray-200'},
      strong: {text: 'text-gray-900 dark:text-gray-100'},
      em: {text: 'text-gray-600 dark:text-gray-400'},
      li: {text: 'text-gray-800 dark:text-gray-200'},
      a: {
        text: 'text-gray-600 dark:text-gray-400',
        hover: 'hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800/50',
        focus: 'focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400 focus:outline-none'
      },
      code: {text: 'text-gray-700 dark:text-gray-300', background: 'bg-gray-100 dark:bg-gray-800/60'},
      pre: {background: 'bg-gray-50 dark:bg-gray-900/60', border: 'border-gray-300 dark:border-gray-600'},
      blockquote: {
        text: 'text-gray-600 dark:text-gray-400',
        background: 'bg-gray-50 dark:bg-gray-900/30',
        border: 'border-gray-400 dark:border-gray-500'
      },
      hr: {border: 'border-gray-300 dark:border-gray-600'},
      th: {
        text: 'text-gray-700 dark:text-gray-300',
        background: 'bg-gray-100 dark:bg-gray-800/50',
        border: 'border-gray-300 dark:border-gray-600'
      },
      td: {text: 'text-gray-800 dark:text-gray-200', border: 'border-gray-200 dark:border-gray-700'},
      table: {border: 'border-gray-300 dark:border-gray-600'},
      button: {
        text: 'text-gray-700 dark:text-gray-200',
        background: 'bg-gray-100 dark:bg-gray-800/50',
        border: 'border-gray-300 dark:border-gray-600',
        hover: 'hover:bg-gray-200 dark:hover:bg-gray-700/60 hover:text-gray-900 dark:hover:text-gray-100',
        active: 'active:bg-gray-200 dark:active:bg-gray-700/60',
        focus: 'focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400 focus:outline-none'
      },
    },
    // ── zinc ──────────────────────────────────────────────────────────────────
    zinc: {
      selection: 'selection:bg-zinc-200/60 dark:selection:bg-zinc-700/50',
      h1: {text: 'text-zinc-700 dark:text-zinc-200', border: 'border-zinc-300 dark:border-zinc-600'},
      h2: {text: 'text-zinc-700 dark:text-zinc-200', border: 'border-zinc-300 dark:border-zinc-600'},
      h3: {text: 'text-zinc-700 dark:text-zinc-200'},
      h4: {text: 'text-zinc-600 dark:text-zinc-300'},
      h5: {text: 'text-zinc-600 dark:text-zinc-300'},
      h6: {text: 'text-zinc-500 dark:text-zinc-400'},
      p: {text: 'text-zinc-800 dark:text-zinc-200'},
      span: {text: 'text-zinc-800 dark:text-zinc-200'},
      strong: {text: 'text-zinc-900 dark:text-zinc-100'},
      em: {text: 'text-zinc-600 dark:text-zinc-400'},
      li: {text: 'text-zinc-800 dark:text-zinc-200'},
      a: {
        text: 'text-zinc-600 dark:text-zinc-400',
        hover: 'hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/50',
        focus: 'focus:ring-2 focus:ring-zinc-500 dark:focus:ring-zinc-400 focus:outline-none'
      },
      code: {text: 'text-zinc-700 dark:text-zinc-300', background: 'bg-zinc-100 dark:bg-zinc-800/60'},
      pre: {background: 'bg-zinc-50 dark:bg-zinc-900/60', border: 'border-zinc-300 dark:border-zinc-600'},
      blockquote: {
        text: 'text-zinc-600 dark:text-zinc-400',
        background: 'bg-zinc-50 dark:bg-zinc-900/30',
        border: 'border-zinc-400 dark:border-zinc-500'
      },
      hr: {border: 'border-zinc-300 dark:border-zinc-600'},
      th: {
        text: 'text-zinc-700 dark:text-zinc-300',
        background: 'bg-zinc-100 dark:bg-zinc-800/50',
        border: 'border-zinc-300 dark:border-zinc-600'
      },
      td: {text: 'text-zinc-800 dark:text-zinc-200', border: 'border-zinc-200 dark:border-zinc-700'},
      table: {border: 'border-zinc-300 dark:border-zinc-600'},
      button: {
        text: 'text-zinc-700 dark:text-zinc-200',
        background: 'bg-zinc-100 dark:bg-zinc-800/50',
        border: 'border-zinc-300 dark:border-zinc-600',
        hover: 'hover:bg-zinc-200 dark:hover:bg-zinc-700/60 hover:text-zinc-900 dark:hover:text-zinc-100',
        active: 'active:bg-zinc-200 dark:active:bg-zinc-700/60',
        focus: 'focus:ring-2 focus:ring-zinc-500 dark:focus:ring-zinc-400 focus:outline-none'
      },
    },
    // ── neutral ───────────────────────────────────────────────────────────────
    neutral: {
      selection: 'selection:bg-neutral-200/60 dark:selection:bg-neutral-700/50',
      h1: {text: 'text-neutral-700 dark:text-neutral-200', border: 'border-neutral-300 dark:border-neutral-600'},
      h2: {text: 'text-neutral-700 dark:text-neutral-200', border: 'border-neutral-300 dark:border-neutral-600'},
      h3: {text: 'text-neutral-700 dark:text-neutral-200'},
      h4: {text: 'text-neutral-600 dark:text-neutral-300'},
      h5: {text: 'text-neutral-600 dark:text-neutral-300'},
      h6: {text: 'text-neutral-500 dark:text-neutral-400'},
      p: {text: 'text-neutral-800 dark:text-neutral-200'},
      span: {text: 'text-neutral-800 dark:text-neutral-200'},
      strong: {text: 'text-neutral-900 dark:text-neutral-100'},
      em: {text: 'text-neutral-600 dark:text-neutral-400'},
      li: {text: 'text-neutral-800 dark:text-neutral-200'},
      a: {
        text: 'text-neutral-600 dark:text-neutral-400',
        hover: 'hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800/50',
        focus: 'focus:ring-2 focus:ring-neutral-500 dark:focus:ring-neutral-400 focus:outline-none'
      },
      code: {text: 'text-neutral-700 dark:text-neutral-300', background: 'bg-neutral-100 dark:bg-neutral-800/60'},
      pre: {background: 'bg-neutral-50 dark:bg-neutral-900/60', border: 'border-neutral-300 dark:border-neutral-600'},
      blockquote: {
        text: 'text-neutral-600 dark:text-neutral-400',
        background: 'bg-neutral-50 dark:bg-neutral-900/30',
        border: 'border-neutral-400 dark:border-neutral-500'
      },
      hr: {border: 'border-neutral-300 dark:border-neutral-600'},
      th: {
        text: 'text-neutral-700 dark:text-neutral-300',
        background: 'bg-neutral-100 dark:bg-neutral-800/50',
        border: 'border-neutral-300 dark:border-neutral-600'
      },
      td: {text: 'text-neutral-800 dark:text-neutral-200', border: 'border-neutral-200 dark:border-neutral-700'},
      table: {border: 'border-neutral-300 dark:border-neutral-600'},
      button: {
        text: 'text-neutral-700 dark:text-neutral-200',
        background: 'bg-neutral-100 dark:bg-neutral-800/50',
        border: 'border-neutral-300 dark:border-neutral-600',
        hover: 'hover:bg-neutral-200 dark:hover:bg-neutral-700/60 hover:text-neutral-900 dark:hover:text-neutral-100',
        active: 'active:bg-neutral-200 dark:active:bg-neutral-700/60',
        focus: 'focus:ring-2 focus:ring-neutral-500 dark:focus:ring-neutral-400 focus:outline-none'
      },
    },
    // ── stone ─────────────────────────────────────────────────────────────────
    stone: {
      selection: 'selection:bg-stone-200/60 dark:selection:bg-stone-700/50',
      h1: {text: 'text-stone-700 dark:text-stone-200', border: 'border-stone-300 dark:border-stone-600'},
      h2: {text: 'text-stone-700 dark:text-stone-200', border: 'border-stone-300 dark:border-stone-600'},
      h3: {text: 'text-stone-700 dark:text-stone-200'},
      h4: {text: 'text-stone-600 dark:text-stone-300'},
      h5: {text: 'text-stone-600 dark:text-stone-300'},
      h6: {text: 'text-stone-500 dark:text-stone-400'},
      p: {text: 'text-stone-800 dark:text-stone-200'},
      span: {text: 'text-stone-800 dark:text-stone-200'},
      strong: {text: 'text-stone-900 dark:text-stone-100'},
      em: {text: 'text-stone-600 dark:text-stone-400'},
      li: {text: 'text-stone-800 dark:text-stone-200'},
      a: {
        text: 'text-stone-600 dark:text-stone-400',
        hover: 'hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800/50',
        focus: 'focus:ring-2 focus:ring-stone-500 dark:focus:ring-stone-400 focus:outline-none'
      },
      code: {text: 'text-stone-700 dark:text-stone-300', background: 'bg-stone-100 dark:bg-stone-800/60'},
      pre: {background: 'bg-stone-50 dark:bg-stone-900/60', border: 'border-stone-300 dark:border-stone-600'},
      blockquote: {
        text: 'text-stone-600 dark:text-stone-400',
        background: 'bg-stone-50 dark:bg-stone-900/30',
        border: 'border-stone-400 dark:border-stone-500'
      },
      hr: {border: 'border-stone-300 dark:border-stone-600'},
      th: {
        text: 'text-stone-700 dark:text-stone-300',
        background: 'bg-stone-100 dark:bg-stone-800/50',
        border: 'border-stone-300 dark:border-stone-600'
      },
      td: {text: 'text-stone-800 dark:text-stone-200', border: 'border-stone-200 dark:border-stone-700'},
      table: {border: 'border-stone-300 dark:border-stone-600'},
      button: {
        text: 'text-stone-700 dark:text-stone-200',
        background: 'bg-stone-100 dark:bg-stone-800/50',
        border: 'border-stone-300 dark:border-stone-600',
        hover: 'hover:bg-stone-200 dark:hover:bg-stone-700/60 hover:text-stone-900 dark:hover:text-stone-100',
        active: 'active:bg-stone-200 dark:active:bg-stone-700/60',
        focus: 'focus:ring-2 focus:ring-stone-500 dark:focus:ring-stone-400 focus:outline-none'
      },
    },
    // ── red ───────────────────────────────────────────────────────────────────
    red: {
      selection: 'selection:bg-red-200/60 dark:selection:bg-red-700/50',
      h1: {text: 'text-red-700 dark:text-red-300', border: 'border-red-300 dark:border-red-700'},
      h2: {text: 'text-red-700 dark:text-red-300', border: 'border-red-300 dark:border-red-700'},
      h3: {text: 'text-red-700 dark:text-red-300'},
      h4: {text: 'text-red-600 dark:text-red-400'},
      h5: {text: 'text-red-600 dark:text-red-400'},
      h6: {text: 'text-red-500 dark:text-red-500'},
      p: {text: 'text-red-900 dark:text-red-100'},
      span: {text: 'text-red-900 dark:text-red-100'},
      strong: {text: 'text-red-900 dark:text-red-100'},
      em: {text: 'text-red-700 dark:text-red-300'},
      li: {text: 'text-red-900 dark:text-red-100'},
      a: {
        text: 'text-red-600 dark:text-red-400',
        hover: 'hover:text-red-900 dark:hover:text-red-100 hover:bg-red-100 dark:hover:bg-red-800/50',
        focus: 'focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:outline-none'
      },
      code: {text: 'text-red-700 dark:text-red-300', background: 'bg-red-100 dark:bg-red-900/40'},
      pre: {background: 'bg-red-50 dark:bg-red-900/30', border: 'border-red-300 dark:border-red-700'},
      blockquote: {
        text: 'text-red-700 dark:text-red-300',
        background: 'bg-red-50 dark:bg-red-900/30',
        border: 'border-red-500 dark:border-red-500'
      },
      hr: {border: 'border-red-300 dark:border-red-700'},
      th: {
        text: 'text-red-700 dark:text-red-300',
        background: 'bg-red-100 dark:bg-red-900/40',
        border: 'border-red-300 dark:border-red-700'
      },
      td: {text: 'text-red-900 dark:text-red-100', border: 'border-red-200 dark:border-red-800'},
      table: {border: 'border-red-300 dark:border-red-700'},
      button: {
        text: 'text-red-700 dark:text-red-200',
        background: 'bg-red-100 dark:bg-red-900/40',
        border: 'border-red-300 dark:border-red-700',
        hover: 'hover:bg-red-200 dark:hover:bg-red-800/50 hover:text-red-900 dark:hover:text-red-100',
        active: 'active:bg-red-200 dark:active:bg-red-700/60',
        focus: 'focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:outline-none'
      },
    },
    // ── orange ────────────────────────────────────────────────────────────────
    orange: {
      selection: 'selection:bg-orange-200/60 dark:selection:bg-orange-700/50',
      h1: {text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-300 dark:border-orange-700'},
      h2: {text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-300 dark:border-orange-700'},
      h3: {text: 'text-orange-700 dark:text-orange-300'},
      h4: {text: 'text-orange-600 dark:text-orange-400'},
      h5: {text: 'text-orange-600 dark:text-orange-400'},
      h6: {text: 'text-orange-500 dark:text-orange-500'},
      p: {text: 'text-orange-900 dark:text-orange-100'},
      span: {text: 'text-orange-900 dark:text-orange-100'},
      strong: {text: 'text-orange-900 dark:text-orange-100'},
      em: {text: 'text-orange-700 dark:text-orange-300'},
      li: {text: 'text-orange-900 dark:text-orange-100'},
      a: {
        text: 'text-orange-600 dark:text-orange-400',
        hover: 'hover:text-orange-900 dark:hover:text-orange-100 hover:bg-orange-100 dark:hover:bg-orange-800/50',
        focus: 'focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 focus:outline-none'
      },
      code: {text: 'text-orange-700 dark:text-orange-300', background: 'bg-orange-100 dark:bg-orange-900/40'},
      pre: {background: 'bg-orange-50 dark:bg-orange-900/30', border: 'border-orange-300 dark:border-orange-700'},
      blockquote: {
        text: 'text-orange-700 dark:text-orange-300',
        background: 'bg-orange-50 dark:bg-orange-900/30',
        border: 'border-orange-500 dark:border-orange-500'
      },
      hr: {border: 'border-orange-300 dark:border-orange-700'},
      th: {
        text: 'text-orange-700 dark:text-orange-300',
        background: 'bg-orange-100 dark:bg-orange-900/40',
        border: 'border-orange-300 dark:border-orange-700'
      },
      td: {text: 'text-orange-900 dark:text-orange-100', border: 'border-orange-200 dark:border-orange-800'},
      table: {border: 'border-orange-300 dark:border-orange-700'},
      button: {
        text: 'text-orange-700 dark:text-orange-200',
        background: 'bg-orange-100 dark:bg-orange-900/40',
        border: 'border-orange-300 dark:border-orange-700',
        hover: 'hover:bg-orange-200 dark:hover:bg-orange-800/50 hover:text-orange-900 dark:hover:text-orange-100',
        active: 'active:bg-orange-200 dark:active:bg-orange-700/60',
        focus: 'focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 focus:outline-none'
      },
    },
    // ── amber ─────────────────────────────────────────────────────────────────
    amber: {
      selection: 'selection:bg-amber-200/60 dark:selection:bg-amber-700/50',
      h1: {text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-300 dark:border-amber-700'},
      h2: {text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-300 dark:border-amber-700'},
      h3: {text: 'text-amber-700 dark:text-amber-300'},
      h4: {text: 'text-amber-600 dark:text-amber-400'},
      h5: {text: 'text-amber-600 dark:text-amber-400'},
      h6: {text: 'text-amber-500 dark:text-amber-500'},
      p: {text: 'text-amber-900 dark:text-amber-100'},
      span: {text: 'text-amber-900 dark:text-amber-100'},
      strong: {text: 'text-amber-900 dark:text-amber-100'},
      em: {text: 'text-amber-700 dark:text-amber-300'},
      li: {text: 'text-amber-900 dark:text-amber-100'},
      a: {
        text: 'text-amber-600 dark:text-amber-400',
        hover: 'hover:text-amber-900 dark:hover:text-amber-100 hover:bg-amber-100 dark:hover:bg-amber-800/50',
        focus: 'focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-400 focus:outline-none'
      },
      code: {text: 'text-amber-700 dark:text-amber-300', background: 'bg-amber-100 dark:bg-amber-900/40'},
      pre: {background: 'bg-amber-50 dark:bg-amber-900/30', border: 'border-amber-300 dark:border-amber-700'},
      blockquote: {
        text: 'text-amber-700 dark:text-amber-300',
        background: 'bg-amber-50 dark:bg-amber-900/30',
        border: 'border-amber-500 dark:border-amber-500'
      },
      hr: {border: 'border-amber-300 dark:border-amber-700'},
      th: {
        text: 'text-amber-700 dark:text-amber-300',
        background: 'bg-amber-100 dark:bg-amber-900/40',
        border: 'border-amber-300 dark:border-amber-700'
      },
      td: {text: 'text-amber-900 dark:text-amber-100', border: 'border-amber-200 dark:border-amber-800'},
      table: {border: 'border-amber-300 dark:border-amber-700'},
      button: {
        text: 'text-amber-700 dark:text-amber-200',
        background: 'bg-amber-100 dark:bg-amber-900/40',
        border: 'border-amber-300 dark:border-amber-700',
        hover: 'hover:bg-amber-200 dark:hover:bg-amber-800/50 hover:text-amber-900 dark:hover:text-amber-100',
        active: 'active:bg-amber-200 dark:active:bg-amber-700/60',
        focus: 'focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-400 focus:outline-none'
      },
    },
    // ── yellow ────────────────────────────────────────────────────────────────
    yellow: {
      selection: 'selection:bg-yellow-200/60 dark:selection:bg-yellow-700/50',
      h1: {text: 'text-yellow-700 dark:text-yellow-300', border: 'border-yellow-300 dark:border-yellow-700'},
      h2: {text: 'text-yellow-700 dark:text-yellow-300', border: 'border-yellow-300 dark:border-yellow-700'},
      h3: {text: 'text-yellow-700 dark:text-yellow-300'},
      h4: {text: 'text-yellow-600 dark:text-yellow-400'},
      h5: {text: 'text-yellow-600 dark:text-yellow-400'},
      h6: {text: 'text-yellow-500 dark:text-yellow-500'},
      p: {text: 'text-yellow-900 dark:text-yellow-100'},
      span: {text: 'text-yellow-900 dark:text-yellow-100'},
      strong: {text: 'text-yellow-900 dark:text-yellow-100'},
      em: {text: 'text-yellow-700 dark:text-yellow-300'},
      li: {text: 'text-yellow-900 dark:text-yellow-100'},
      a: {
        text: 'text-yellow-600 dark:text-yellow-400',
        hover: 'hover:text-yellow-900 dark:hover:text-yellow-100 hover:bg-yellow-100 dark:hover:bg-yellow-800/50',
        focus: 'focus:ring-2 focus:ring-yellow-500 dark:focus:ring-yellow-400 focus:outline-none'
      },
      code: {text: 'text-yellow-700 dark:text-yellow-300', background: 'bg-yellow-100 dark:bg-yellow-900/40'},
      pre: {background: 'bg-yellow-50 dark:bg-yellow-900/30', border: 'border-yellow-300 dark:border-yellow-700'},
      blockquote: {
        text: 'text-yellow-700 dark:text-yellow-300',
        background: 'bg-yellow-50 dark:bg-yellow-900/30',
        border: 'border-yellow-500 dark:border-yellow-500'
      },
      hr: {border: 'border-yellow-300 dark:border-yellow-700'},
      th: {
        text: 'text-yellow-700 dark:text-yellow-300',
        background: 'bg-yellow-100 dark:bg-yellow-900/40',
        border: 'border-yellow-300 dark:border-yellow-700'
      },
      td: {text: 'text-yellow-900 dark:text-yellow-100', border: 'border-yellow-200 dark:border-yellow-800'},
      table: {border: 'border-yellow-300 dark:border-yellow-700'},
      button: {
        text: 'text-yellow-700 dark:text-yellow-200',
        background: 'bg-yellow-100 dark:bg-yellow-900/40',
        border: 'border-yellow-300 dark:border-yellow-700',
        hover: 'hover:bg-yellow-200 dark:hover:bg-yellow-800/50 hover:text-yellow-900 dark:hover:text-yellow-100',
        active: 'active:bg-yellow-200 dark:active:bg-yellow-700/60',
        focus: 'focus:ring-2 focus:ring-yellow-500 dark:focus:ring-yellow-400 focus:outline-none'
      },
    },
    // ── lime ──────────────────────────────────────────────────────────────────
    lime: {
      selection: 'selection:bg-lime-200/60 dark:selection:bg-lime-700/50',
      h1: {text: 'text-lime-700 dark:text-lime-300', border: 'border-lime-300 dark:border-lime-700'},
      h2: {text: 'text-lime-700 dark:text-lime-300', border: 'border-lime-300 dark:border-lime-700'},
      h3: {text: 'text-lime-700 dark:text-lime-300'},
      h4: {text: 'text-lime-600 dark:text-lime-400'},
      h5: {text: 'text-lime-600 dark:text-lime-400'},
      h6: {text: 'text-lime-500 dark:text-lime-500'},
      p: {text: 'text-lime-900 dark:text-lime-100'},
      span: {text: 'text-lime-900 dark:text-lime-100'},
      strong: {text: 'text-lime-900 dark:text-lime-100'},
      em: {text: 'text-lime-700 dark:text-lime-300'},
      li: {text: 'text-lime-900 dark:text-lime-100'},
      a: {
        text: 'text-lime-600 dark:text-lime-400',
        hover: 'hover:text-lime-900 dark:hover:text-lime-100 hover:bg-lime-100 dark:hover:bg-lime-800/50',
        focus: 'focus:ring-2 focus:ring-lime-500 dark:focus:ring-lime-400 focus:outline-none'
      },
      code: {text: 'text-lime-700 dark:text-lime-300', background: 'bg-lime-100 dark:bg-lime-900/40'},
      pre: {background: 'bg-lime-50 dark:bg-lime-900/30', border: 'border-lime-300 dark:border-lime-700'},
      blockquote: {
        text: 'text-lime-700 dark:text-lime-300',
        background: 'bg-lime-50 dark:bg-lime-900/30',
        border: 'border-lime-500 dark:border-lime-500'
      },
      hr: {border: 'border-lime-300 dark:border-lime-700'},
      th: {
        text: 'text-lime-700 dark:text-lime-300',
        background: 'bg-lime-100 dark:bg-lime-900/40',
        border: 'border-lime-300 dark:border-lime-700'
      },
      td: {text: 'text-lime-900 dark:text-lime-100', border: 'border-lime-200 dark:border-lime-800'},
      table: {border: 'border-lime-300 dark:border-lime-700'},
      button: {
        text: 'text-lime-700 dark:text-lime-200',
        background: 'bg-lime-100 dark:bg-lime-900/40',
        border: 'border-lime-300 dark:border-lime-700',
        hover: 'hover:bg-lime-200 dark:hover:bg-lime-800/50 hover:text-lime-900 dark:hover:text-lime-100',
        active: 'active:bg-lime-200 dark:active:bg-lime-700/60',
        focus: 'focus:ring-2 focus:ring-lime-500 dark:focus:ring-lime-400 focus:outline-none'
      },
    },
    // ── green ─────────────────────────────────────────────────────────────────
    green: {
      selection: 'selection:bg-green-200/60 dark:selection:bg-green-700/50',
      h1: {text: 'text-green-700 dark:text-green-300', border: 'border-green-300 dark:border-green-700'},
      h2: {text: 'text-green-700 dark:text-green-300', border: 'border-green-300 dark:border-green-700'},
      h3: {text: 'text-green-700 dark:text-green-300'},
      h4: {text: 'text-green-600 dark:text-green-400'},
      h5: {text: 'text-green-600 dark:text-green-400'},
      h6: {text: 'text-green-500 dark:text-green-500'},
      p: {text: 'text-green-900 dark:text-green-100'},
      span: {text: 'text-green-900 dark:text-green-100'},
      strong: {text: 'text-green-900 dark:text-green-100'},
      em: {text: 'text-green-700 dark:text-green-300'},
      li: {text: 'text-green-900 dark:text-green-100'},
      a: {
        text: 'text-green-600 dark:text-green-400',
        hover: 'hover:text-green-900 dark:hover:text-green-100 hover:bg-green-100 dark:hover:bg-green-800/50',
        focus: 'focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:outline-none'
      },
      code: {text: 'text-green-700 dark:text-green-300', background: 'bg-green-100 dark:bg-green-900/40'},
      pre: {background: 'bg-green-50 dark:bg-green-900/30', border: 'border-green-300 dark:border-green-700'},
      blockquote: {
        text: 'text-green-700 dark:text-green-300',
        background: 'bg-green-50 dark:bg-green-900/30',
        border: 'border-green-500 dark:border-green-500'
      },
      hr: {border: 'border-green-300 dark:border-green-700'},
      th: {
        text: 'text-green-700 dark:text-green-300',
        background: 'bg-green-100 dark:bg-green-900/40',
        border: 'border-green-300 dark:border-green-700'
      },
      td: {text: 'text-green-900 dark:text-green-100', border: 'border-green-200 dark:border-green-800'},
      table: {border: 'border-green-300 dark:border-green-700'},
      button: {
        text: 'text-green-700 dark:text-green-200',
        background: 'bg-green-100 dark:bg-green-900/40',
        border: 'border-green-300 dark:border-green-700',
        hover: 'hover:bg-green-200 dark:hover:bg-green-800/50 hover:text-green-900 dark:hover:text-green-100',
        active: 'active:bg-green-200 dark:active:bg-green-700/60',
        focus: 'focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:outline-none'
      },
    },
    // ── emerald ───────────────────────────────────────────────────────────────
    emerald: {
      selection: 'selection:bg-emerald-200/60 dark:selection:bg-emerald-700/50',
      h1: {text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-300 dark:border-emerald-700'},
      h2: {text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-300 dark:border-emerald-700'},
      h3: {text: 'text-emerald-700 dark:text-emerald-300'},
      h4: {text: 'text-emerald-600 dark:text-emerald-400'},
      h5: {text: 'text-emerald-600 dark:text-emerald-400'},
      h6: {text: 'text-emerald-500 dark:text-emerald-500'},
      p: {text: 'text-emerald-900 dark:text-emerald-100'},
      span: {text: 'text-emerald-900 dark:text-emerald-100'},
      strong: {text: 'text-emerald-900 dark:text-emerald-100'},
      em: {text: 'text-emerald-700 dark:text-emerald-300'},
      li: {text: 'text-emerald-900 dark:text-emerald-100'},
      a: {
        text: 'text-emerald-600 dark:text-emerald-400',
        hover: 'hover:text-emerald-900 dark:hover:text-emerald-100 hover:bg-emerald-100 dark:hover:bg-emerald-800/50',
        focus: 'focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:outline-none'
      },
      code: {text: 'text-emerald-700 dark:text-emerald-300', background: 'bg-emerald-100 dark:bg-emerald-900/40'},
      pre: {background: 'bg-emerald-50 dark:bg-emerald-900/30', border: 'border-emerald-300 dark:border-emerald-700'},
      blockquote: {
        text: 'text-emerald-700 dark:text-emerald-300',
        background: 'bg-emerald-50 dark:bg-emerald-900/30',
        border: 'border-emerald-500 dark:border-emerald-500'
      },
      hr: {border: 'border-emerald-300 dark:border-emerald-700'},
      th: {
        text: 'text-emerald-700 dark:text-emerald-300',
        background: 'bg-emerald-100 dark:bg-emerald-900/40',
        border: 'border-emerald-300 dark:border-emerald-700'
      },
      td: {text: 'text-emerald-900 dark:text-emerald-100', border: 'border-emerald-200 dark:border-emerald-800'},
      table: {border: 'border-emerald-300 dark:border-emerald-700'},
      button: {
        text: 'text-emerald-700 dark:text-emerald-200',
        background: 'bg-emerald-100 dark:bg-emerald-900/40',
        border: 'border-emerald-300 dark:border-emerald-700',
        hover: 'hover:bg-emerald-200 dark:hover:bg-emerald-800/50 hover:text-emerald-900 dark:hover:text-emerald-100',
        active: 'active:bg-emerald-200 dark:active:bg-emerald-700/60',
        focus: 'focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:outline-none'
      },
    },
    // ── teal ──────────────────────────────────────────────────────────────────
    teal: {
      selection: 'selection:bg-teal-200/60 dark:selection:bg-teal-700/50',
      h1: {text: 'text-teal-700 dark:text-teal-300', border: 'border-teal-300 dark:border-teal-700'},
      h2: {text: 'text-teal-700 dark:text-teal-300', border: 'border-teal-300 dark:border-teal-700'},
      h3: {text: 'text-teal-700 dark:text-teal-300'},
      h4: {text: 'text-teal-600 dark:text-teal-400'},
      h5: {text: 'text-teal-600 dark:text-teal-400'},
      h6: {text: 'text-teal-500 dark:text-teal-500'},
      p: {text: 'text-teal-900 dark:text-teal-100'},
      span: {text: 'text-teal-900 dark:text-teal-100'},
      strong: {text: 'text-teal-900 dark:text-teal-100'},
      em: {text: 'text-teal-700 dark:text-teal-300'},
      li: {text: 'text-teal-900 dark:text-teal-100'},
      a: {
        text: 'text-teal-600 dark:text-teal-400',
        hover: 'hover:text-teal-900 dark:hover:text-teal-100 hover:bg-teal-100 dark:hover:bg-teal-800/50',
        focus: 'focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 focus:outline-none'
      },
      code: {text: 'text-teal-700 dark:text-teal-300', background: 'bg-teal-100 dark:bg-teal-900/40'},
      pre: {background: 'bg-teal-50 dark:bg-teal-900/30', border: 'border-teal-300 dark:border-teal-700'},
      blockquote: {
        text: 'text-teal-700 dark:text-teal-300',
        background: 'bg-teal-50 dark:bg-teal-900/30',
        border: 'border-teal-500 dark:border-teal-500'
      },
      hr: {border: 'border-teal-300 dark:border-teal-700'},
      th: {
        text: 'text-teal-700 dark:text-teal-300',
        background: 'bg-teal-100 dark:bg-teal-900/40',
        border: 'border-teal-300 dark:border-teal-700'
      },
      td: {text: 'text-teal-900 dark:text-teal-100', border: 'border-teal-200 dark:border-teal-800'},
      table: {border: 'border-teal-300 dark:border-teal-700'},
      button: {
        text: 'text-teal-700 dark:text-teal-200',
        background: 'bg-teal-100 dark:bg-teal-900/40',
        border: 'border-teal-300 dark:border-teal-700',
        hover: 'hover:bg-teal-200 dark:hover:bg-teal-800/50 hover:text-teal-900 dark:hover:text-teal-100',
        active: 'active:bg-teal-200 dark:active:bg-teal-700/60',
        focus: 'focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 focus:outline-none'
      },
    },
    // ── cyan ──────────────────────────────────────────────────────────────────
    cyan: {
      selection: 'selection:bg-cyan-200/60 dark:selection:bg-cyan-700/50',
      h1: {text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-300 dark:border-cyan-700'},
      h2: {text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-300 dark:border-cyan-700'},
      h3: {text: 'text-cyan-700 dark:text-cyan-300'},
      h4: {text: 'text-cyan-600 dark:text-cyan-400'},
      h5: {text: 'text-cyan-600 dark:text-cyan-400'},
      h6: {text: 'text-cyan-500 dark:text-cyan-500'},
      p: {text: 'text-cyan-900 dark:text-cyan-100'},
      span: {text: 'text-cyan-900 dark:text-cyan-100'},
      strong: {text: 'text-cyan-900 dark:text-cyan-100'},
      em: {text: 'text-cyan-700 dark:text-cyan-300'},
      li: {text: 'text-cyan-900 dark:text-cyan-100'},
      a: {
        text: 'text-cyan-600 dark:text-cyan-400',
        hover: 'hover:text-cyan-900 dark:hover:text-cyan-100 hover:bg-cyan-100 dark:hover:bg-cyan-800/50',
        focus: 'focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400 focus:outline-none'
      },
      code: {text: 'text-cyan-700 dark:text-cyan-300', background: 'bg-cyan-100 dark:bg-cyan-900/40'},
      pre: {background: 'bg-cyan-50 dark:bg-cyan-900/30', border: 'border-cyan-300 dark:border-cyan-700'},
      blockquote: {
        text: 'text-cyan-700 dark:text-cyan-300',
        background: 'bg-cyan-50 dark:bg-cyan-900/30',
        border: 'border-cyan-500 dark:border-cyan-500'
      },
      hr: {border: 'border-cyan-300 dark:border-cyan-700'},
      th: {
        text: 'text-cyan-700 dark:text-cyan-300',
        background: 'bg-cyan-100 dark:bg-cyan-900/40',
        border: 'border-cyan-300 dark:border-cyan-700'
      },
      td: {text: 'text-cyan-900 dark:text-cyan-100', border: 'border-cyan-200 dark:border-cyan-800'},
      table: {border: 'border-cyan-300 dark:border-cyan-700'},
      button: {
        text: 'text-cyan-700 dark:text-cyan-200',
        background: 'bg-cyan-100 dark:bg-cyan-900/40',
        border: 'border-cyan-300 dark:border-cyan-700',
        hover: 'hover:bg-cyan-200 dark:hover:bg-cyan-800/50 hover:text-cyan-900 dark:hover:text-cyan-100',
        active: 'active:bg-cyan-200 dark:active:bg-cyan-700/60',
        focus: 'focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400 focus:outline-none'
      },
    },
    // ── sky ───────────────────────────────────────────────────────────────────
    sky: {
      selection: 'selection:bg-sky-200/60 dark:selection:bg-sky-700/50',
      h1: {text: 'text-sky-700 dark:text-sky-300', border: 'border-sky-300 dark:border-sky-700'},
      h2: {text: 'text-sky-700 dark:text-sky-300', border: 'border-sky-300 dark:border-sky-700'},
      h3: {text: 'text-sky-700 dark:text-sky-300'},
      h4: {text: 'text-sky-600 dark:text-sky-400'},
      h5: {text: 'text-sky-600 dark:text-sky-400'},
      h6: {text: 'text-sky-500 dark:text-sky-500'},
      p: {text: 'text-sky-900 dark:text-sky-100'},
      span: {text: 'text-sky-900 dark:text-sky-100'},
      strong: {text: 'text-sky-900 dark:text-sky-100'},
      em: {text: 'text-sky-700 dark:text-sky-300'},
      li: {text: 'text-sky-900 dark:text-sky-100'},
      a: {
        text: 'text-sky-600 dark:text-sky-400',
        hover: 'hover:text-sky-900 dark:hover:text-sky-100 hover:bg-sky-100 dark:hover:bg-sky-800/50',
        focus: 'focus:ring-2 focus:ring-sky-500 dark:focus:ring-sky-400 focus:outline-none'
      },
      code: {text: 'text-sky-700 dark:text-sky-300', background: 'bg-sky-100 dark:bg-sky-900/40'},
      pre: {background: 'bg-sky-50 dark:bg-sky-900/30', border: 'border-sky-300 dark:border-sky-700'},
      blockquote: {
        text: 'text-sky-700 dark:text-sky-300',
        background: 'bg-sky-50 dark:bg-sky-900/30',
        border: 'border-sky-500 dark:border-sky-500'
      },
      hr: {border: 'border-sky-300 dark:border-sky-700'},
      th: {
        text: 'text-sky-700 dark:text-sky-300',
        background: 'bg-sky-100 dark:bg-sky-900/40',
        border: 'border-sky-300 dark:border-sky-700'
      },
      td: {text: 'text-sky-900 dark:text-sky-100', border: 'border-sky-200 dark:border-sky-800'},
      table: {border: 'border-sky-300 dark:border-sky-700'},
      button: {
        text: 'text-sky-700 dark:text-sky-200',
        background: 'bg-sky-100 dark:bg-sky-900/40',
        border: 'border-sky-300 dark:border-sky-700',
        hover: 'hover:bg-sky-200 dark:hover:bg-sky-800/50 hover:text-sky-900 dark:hover:text-sky-100',
        active: 'active:bg-sky-200 dark:active:bg-sky-700/60',
        focus: 'focus:ring-2 focus:ring-sky-500 dark:focus:ring-sky-400 focus:outline-none'
      },
    },
    // ── blue ──────────────────────────────────────────────────────────────────
    blue: {
      selection: 'selection:bg-blue-200/60 dark:selection:bg-blue-700/50',
      h1: {text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-300 dark:border-blue-700'},
      h2: {text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-300 dark:border-blue-700'},
      h3: {text: 'text-blue-700 dark:text-blue-300'},
      h4: {text: 'text-blue-600 dark:text-blue-400'},
      h5: {text: 'text-blue-600 dark:text-blue-400'},
      h6: {text: 'text-blue-500 dark:text-blue-500'},
      p: {text: 'text-blue-900 dark:text-blue-100'},
      span: {text: 'text-blue-900 dark:text-blue-100'},
      strong: {text: 'text-blue-900 dark:text-blue-100'},
      em: {text: 'text-blue-700 dark:text-blue-300'},
      li: {text: 'text-blue-900 dark:text-blue-100'},
      a: {
        text: 'text-blue-600 dark:text-blue-400',
        hover: 'hover:text-blue-900 dark:hover:text-blue-100 hover:bg-blue-100 dark:hover:bg-blue-800/50',
        focus: 'focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:outline-none'
      },
      code: {text: 'text-blue-700 dark:text-blue-300', background: 'bg-blue-100 dark:bg-blue-900/40'},
      pre: {background: 'bg-blue-50 dark:bg-blue-900/30', border: 'border-blue-300 dark:border-blue-700'},
      blockquote: {
        text: 'text-blue-700 dark:text-blue-300',
        background: 'bg-blue-50 dark:bg-blue-900/30',
        border: 'border-blue-500 dark:border-blue-500'
      },
      hr: {border: 'border-blue-300 dark:border-blue-700'},
      th: {
        text: 'text-blue-700 dark:text-blue-300',
        background: 'bg-blue-100 dark:bg-blue-900/40',
        border: 'border-blue-300 dark:border-blue-700'
      },
      td: {text: 'text-blue-900 dark:text-blue-100', border: 'border-blue-200 dark:border-blue-800'},
      table: {border: 'border-blue-300 dark:border-blue-700'},
      button: {
        text: 'text-blue-700 dark:text-blue-200',
        background: 'bg-blue-100 dark:bg-blue-900/40',
        border: 'border-blue-300 dark:border-blue-700',
        hover: 'hover:bg-blue-200 dark:hover:bg-blue-800/50 hover:text-blue-900 dark:hover:text-blue-100',
        active: 'active:bg-blue-200 dark:active:bg-blue-700/60',
        focus: 'focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:outline-none'
      },
    },
    // ── indigo ────────────────────────────────────────────────────────────────
    indigo: {
      selection: 'selection:bg-indigo-200/60 dark:selection:bg-indigo-700/50',
      h1: {text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-300 dark:border-indigo-700'},
      h2: {text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-300 dark:border-indigo-700'},
      h3: {text: 'text-indigo-700 dark:text-indigo-300'},
      h4: {text: 'text-indigo-600 dark:text-indigo-400'},
      h5: {text: 'text-indigo-600 dark:text-indigo-400'},
      h6: {text: 'text-indigo-500 dark:text-indigo-500'},
      p: {text: 'text-indigo-900 dark:text-indigo-100'},
      span: {text: 'text-indigo-900 dark:text-indigo-100'},
      strong: {text: 'text-indigo-900 dark:text-indigo-100'},
      em: {text: 'text-indigo-700 dark:text-indigo-300'},
      li: {text: 'text-indigo-900 dark:text-indigo-100'},
      a: {
        text: 'text-indigo-600 dark:text-indigo-400',
        hover: 'hover:text-indigo-900 dark:hover:text-indigo-100 hover:bg-indigo-100 dark:hover:bg-indigo-800/50',
        focus: 'focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:outline-none'
      },
      code: {text: 'text-indigo-700 dark:text-indigo-300', background: 'bg-indigo-100 dark:bg-indigo-900/40'},
      pre: {background: 'bg-indigo-50 dark:bg-indigo-900/30', border: 'border-indigo-300 dark:border-indigo-700'},
      blockquote: {
        text: 'text-indigo-700 dark:text-indigo-300',
        background: 'bg-indigo-50 dark:bg-indigo-900/30',
        border: 'border-indigo-500 dark:border-indigo-500'
      },
      hr: {border: 'border-indigo-300 dark:border-indigo-700'},
      th: {
        text: 'text-indigo-700 dark:text-indigo-300',
        background: 'bg-indigo-100 dark:bg-indigo-900/40',
        border: 'border-indigo-300 dark:border-indigo-700'
      },
      td: {text: 'text-indigo-900 dark:text-indigo-100', border: 'border-indigo-200 dark:border-indigo-800'},
      table: {border: 'border-indigo-300 dark:border-indigo-700'},
      button: {
        text: 'text-indigo-700 dark:text-indigo-200',
        background: 'bg-indigo-100 dark:bg-indigo-900/40',
        border: 'border-indigo-300 dark:border-indigo-700',
        hover: 'hover:bg-indigo-200 dark:hover:bg-indigo-800/50 hover:text-indigo-900 dark:hover:text-indigo-100',
        active: 'active:bg-indigo-200 dark:active:bg-indigo-700/60',
        focus: 'focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:outline-none'
      },
    },
    // ── violet ────────────────────────────────────────────────────────────────
    violet: {
      selection: 'selection:bg-violet-200/60 dark:selection:bg-violet-700/50',
      h1: {text: 'text-violet-700 dark:text-violet-300', border: 'border-violet-300 dark:border-violet-700'},
      h2: {text: 'text-violet-700 dark:text-violet-300', border: 'border-violet-300 dark:border-violet-700'},
      h3: {text: 'text-violet-700 dark:text-violet-300'},
      h4: {text: 'text-violet-600 dark:text-violet-400'},
      h5: {text: 'text-violet-600 dark:text-violet-400'},
      h6: {text: 'text-violet-500 dark:text-violet-500'},
      p: {text: 'text-violet-900 dark:text-violet-100'},
      span: {text: 'text-violet-900 dark:text-violet-100'},
      strong: {text: 'text-violet-900 dark:text-violet-100'},
      em: {text: 'text-violet-700 dark:text-violet-300'},
      li: {text: 'text-violet-900 dark:text-violet-100'},
      a: {
        text: 'text-violet-600 dark:text-violet-400',
        hover: 'hover:text-violet-900 dark:hover:text-violet-100 hover:bg-violet-100 dark:hover:bg-violet-800/50',
        focus: 'focus:ring-2 focus:ring-violet-500 dark:focus:ring-violet-400 focus:outline-none'
      },
      code: {text: 'text-violet-700 dark:text-violet-300', background: 'bg-violet-100 dark:bg-violet-900/40'},
      pre: {background: 'bg-violet-50 dark:bg-violet-900/30', border: 'border-violet-300 dark:border-violet-700'},
      blockquote: {
        text: 'text-violet-700 dark:text-violet-300',
        background: 'bg-violet-50 dark:bg-violet-900/30',
        border: 'border-violet-500 dark:border-violet-500'
      },
      hr: {border: 'border-violet-300 dark:border-violet-700'},
      th: {
        text: 'text-violet-700 dark:text-violet-300',
        background: 'bg-violet-100 dark:bg-violet-900/40',
        border: 'border-violet-300 dark:border-violet-700'
      },
      td: {text: 'text-violet-900 dark:text-violet-100', border: 'border-violet-200 dark:border-violet-800'},
      table: {border: 'border-violet-300 dark:border-violet-700'},
      button: {
        text: 'text-violet-700 dark:text-violet-200',
        background: 'bg-violet-100 dark:bg-violet-900/40',
        border: 'border-violet-300 dark:border-violet-700',
        hover: 'hover:bg-violet-200 dark:hover:bg-violet-800/50 hover:text-violet-900 dark:hover:text-violet-100',
        active: 'active:bg-violet-200 dark:active:bg-violet-700/60',
        focus: 'focus:ring-2 focus:ring-violet-500 dark:focus:ring-violet-400 focus:outline-none'
      },
    },
    // ── purple ────────────────────────────────────────────────────────────────
    purple: {
      selection: 'selection:bg-purple-200/60 dark:selection:bg-purple-700/50',
      h1: {text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-300 dark:border-purple-700'},
      h2: {text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-300 dark:border-purple-700'},
      h3: {text: 'text-purple-700 dark:text-purple-300'},
      h4: {text: 'text-purple-600 dark:text-purple-400'},
      h5: {text: 'text-purple-600 dark:text-purple-400'},
      h6: {text: 'text-purple-500 dark:text-purple-500'},
      p: {text: 'text-purple-900 dark:text-purple-100'},
      span: {text: 'text-purple-900 dark:text-purple-100'},
      strong: {text: 'text-purple-900 dark:text-purple-100'},
      em: {text: 'text-purple-700 dark:text-purple-300'},
      li: {text: 'text-purple-900 dark:text-purple-100'},
      a: {
        text: 'text-purple-600 dark:text-purple-400',
        hover: 'hover:text-purple-900 dark:hover:text-purple-100 hover:bg-purple-100 dark:hover:bg-purple-800/50',
        focus: 'focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:outline-none'
      },
      code: {text: 'text-purple-700 dark:text-purple-300', background: 'bg-purple-100 dark:bg-purple-900/40'},
      pre: {background: 'bg-purple-50 dark:bg-purple-900/30', border: 'border-purple-300 dark:border-purple-700'},
      blockquote: {
        text: 'text-purple-700 dark:text-purple-300',
        background: 'bg-purple-50 dark:bg-purple-900/30',
        border: 'border-purple-500 dark:border-purple-500'
      },
      hr: {border: 'border-purple-300 dark:border-purple-700'},
      th: {
        text: 'text-purple-700 dark:text-purple-300',
        background: 'bg-purple-100 dark:bg-purple-900/40',
        border: 'border-purple-300 dark:border-purple-700'
      },
      td: {text: 'text-purple-900 dark:text-purple-100', border: 'border-purple-200 dark:border-purple-800'},
      table: {border: 'border-purple-300 dark:border-purple-700'},
      button: {
        text: 'text-purple-700 dark:text-purple-200',
        background: 'bg-purple-100 dark:bg-purple-900/40',
        border: 'border-purple-300 dark:border-purple-700',
        hover: 'hover:bg-purple-200 dark:hover:bg-purple-800/50 hover:text-purple-900 dark:hover:text-purple-100',
        active: 'active:bg-purple-200 dark:active:bg-purple-700/60',
        focus: 'focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:outline-none'
      },
    },
    // ── fuchsia ───────────────────────────────────────────────────────────────
    fuchsia: {
      selection: 'selection:bg-fuchsia-200/60 dark:selection:bg-fuchsia-700/50',
      h1: {text: 'text-fuchsia-700 dark:text-fuchsia-300', border: 'border-fuchsia-300 dark:border-fuchsia-700'},
      h2: {text: 'text-fuchsia-700 dark:text-fuchsia-300', border: 'border-fuchsia-300 dark:border-fuchsia-700'},
      h3: {text: 'text-fuchsia-700 dark:text-fuchsia-300'},
      h4: {text: 'text-fuchsia-600 dark:text-fuchsia-400'},
      h5: {text: 'text-fuchsia-600 dark:text-fuchsia-400'},
      h6: {text: 'text-fuchsia-500 dark:text-fuchsia-500'},
      p: {text: 'text-fuchsia-900 dark:text-fuchsia-100'},
      span: {text: 'text-fuchsia-900 dark:text-fuchsia-100'},
      strong: {text: 'text-fuchsia-900 dark:text-fuchsia-100'},
      em: {text: 'text-fuchsia-700 dark:text-fuchsia-300'},
      li: {text: 'text-fuchsia-900 dark:text-fuchsia-100'},
      a: {
        text: 'text-fuchsia-600 dark:text-fuchsia-400',
        hover: 'hover:text-fuchsia-900 dark:hover:text-fuchsia-100 hover:bg-fuchsia-100 dark:hover:bg-fuchsia-800/50',
        focus: 'focus:ring-2 focus:ring-fuchsia-500 dark:focus:ring-fuchsia-400 focus:outline-none'
      },
      code: {text: 'text-fuchsia-700 dark:text-fuchsia-300', background: 'bg-fuchsia-100 dark:bg-fuchsia-900/40'},
      pre: {background: 'bg-fuchsia-50 dark:bg-fuchsia-900/30', border: 'border-fuchsia-300 dark:border-fuchsia-700'},
      blockquote: {
        text: 'text-fuchsia-700 dark:text-fuchsia-300',
        background: 'bg-fuchsia-50 dark:bg-fuchsia-900/30',
        border: 'border-fuchsia-500 dark:border-fuchsia-500'
      },
      hr: {border: 'border-fuchsia-300 dark:border-fuchsia-700'},
      th: {
        text: 'text-fuchsia-700 dark:text-fuchsia-300',
        background: 'bg-fuchsia-100 dark:bg-fuchsia-900/40',
        border: 'border-fuchsia-300 dark:border-fuchsia-700'
      },
      td: {text: 'text-fuchsia-900 dark:text-fuchsia-100', border: 'border-fuchsia-200 dark:border-fuchsia-800'},
      table: {border: 'border-fuchsia-300 dark:border-fuchsia-700'},
      button: {
        text: 'text-fuchsia-700 dark:text-fuchsia-200',
        background: 'bg-fuchsia-100 dark:bg-fuchsia-900/40',
        border: 'border-fuchsia-300 dark:border-fuchsia-700',
        hover: 'hover:bg-fuchsia-200 dark:hover:bg-fuchsia-800/50 hover:text-fuchsia-900 dark:hover:text-fuchsia-100',
        active: 'active:bg-fuchsia-200 dark:active:bg-fuchsia-700/60',
        focus: 'focus:ring-2 focus:ring-fuchsia-500 dark:focus:ring-fuchsia-400 focus:outline-none'
      },
    },
    // ── pink ──────────────────────────────────────────────────────────────────
    pink: {
      selection: 'selection:bg-pink-200/60 dark:selection:bg-pink-700/50',
      h1: {text: 'text-pink-700 dark:text-pink-300', border: 'border-pink-300 dark:border-pink-700'},
      h2: {text: 'text-pink-700 dark:text-pink-300', border: 'border-pink-300 dark:border-pink-700'},
      h3: {text: 'text-pink-700 dark:text-pink-300'},
      h4: {text: 'text-pink-600 dark:text-pink-400'},
      h5: {text: 'text-pink-600 dark:text-pink-400'},
      h6: {text: 'text-pink-500 dark:text-pink-500'},
      p: {text: 'text-pink-900 dark:text-pink-100'},
      span: {text: 'text-pink-900 dark:text-pink-100'},
      strong: {text: 'text-pink-900 dark:text-pink-100'},
      em: {text: 'text-pink-700 dark:text-pink-300'},
      li: {text: 'text-pink-900 dark:text-pink-100'},
      a: {
        text: 'text-pink-600 dark:text-pink-400',
        hover: 'hover:text-pink-900 dark:hover:text-pink-100 hover:bg-pink-100 dark:hover:bg-pink-800/50',
        focus: 'focus:ring-2 focus:ring-pink-500 dark:focus:ring-pink-400 focus:outline-none'
      },
      code: {text: 'text-pink-700 dark:text-pink-300', background: 'bg-pink-100 dark:bg-pink-900/40'},
      pre: {background: 'bg-pink-50 dark:bg-pink-900/30', border: 'border-pink-300 dark:border-pink-700'},
      blockquote: {
        text: 'text-pink-700 dark:text-pink-300',
        background: 'bg-pink-50 dark:bg-pink-900/30',
        border: 'border-pink-500 dark:border-pink-500'
      },
      hr: {border: 'border-pink-300 dark:border-pink-700'},
      th: {
        text: 'text-pink-700 dark:text-pink-300',
        background: 'bg-pink-100 dark:bg-pink-900/40',
        border: 'border-pink-300 dark:border-pink-700'
      },
      td: {text: 'text-pink-900 dark:text-pink-100', border: 'border-pink-200 dark:border-pink-800'},
      table: {border: 'border-pink-300 dark:border-pink-700'},
      button: {
        text: 'text-pink-700 dark:text-pink-200',
        background: 'bg-pink-100 dark:bg-pink-900/40',
        border: 'border-pink-300 dark:border-pink-700',
        hover: 'hover:bg-pink-200 dark:hover:bg-pink-800/50 hover:text-pink-900 dark:hover:text-pink-100',
        active: 'active:bg-pink-200 dark:active:bg-pink-700/60',
        focus: 'focus:ring-2 focus:ring-pink-500 dark:focus:ring-pink-400 focus:outline-none'
      },
    },
    // ── rose ──────────────────────────────────────────────────────────────────
    rose: {
      selection: 'selection:bg-rose-200/60 dark:selection:bg-rose-700/50',
      h1: {text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-300 dark:border-rose-700'},
      h2: {text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-300 dark:border-rose-700'},
      h3: {text: 'text-rose-700 dark:text-rose-300'},
      h4: {text: 'text-rose-600 dark:text-rose-400'},
      h5: {text: 'text-rose-600 dark:text-rose-400'},
      h6: {text: 'text-rose-500 dark:text-rose-500'},
      p: {text: 'text-rose-900 dark:text-rose-100'},
      span: {text: 'text-rose-900 dark:text-rose-100'},
      strong: {text: 'text-rose-900 dark:text-rose-100'},
      em: {text: 'text-rose-700 dark:text-rose-300'},
      li: {text: 'text-rose-900 dark:text-rose-100'},
      a: {
        text: 'text-rose-600 dark:text-rose-400',
        hover: 'hover:text-rose-900 dark:hover:text-rose-100 hover:bg-rose-100 dark:hover:bg-rose-800/50',
        focus: 'focus:ring-2 focus:ring-rose-500 dark:focus:ring-rose-400 focus:outline-none'
      },
      code: {text: 'text-rose-700 dark:text-rose-300', background: 'bg-rose-100 dark:bg-rose-900/40'},
      pre: {background: 'bg-rose-50 dark:bg-rose-900/30', border: 'border-rose-300 dark:border-rose-700'},
      blockquote: {
        text: 'text-rose-700 dark:text-rose-300',
        background: 'bg-rose-50 dark:bg-rose-900/30',
        border: 'border-rose-500 dark:border-rose-500'
      },
      hr: {border: 'border-rose-300 dark:border-rose-700'},
      th: {
        text: 'text-rose-700 dark:text-rose-300',
        background: 'bg-rose-100 dark:bg-rose-900/40',
        border: 'border-rose-300 dark:border-rose-700'
      },
      td: {text: 'text-rose-900 dark:text-rose-100', border: 'border-rose-200 dark:border-rose-800'},
      table: {border: 'border-rose-300 dark:border-rose-700'},
      button: {
        text: 'text-rose-700 dark:text-rose-200',
        background: 'bg-rose-100 dark:bg-rose-900/40',
        border: 'border-rose-300 dark:border-rose-700',
        hover: 'hover:bg-rose-200 dark:hover:bg-rose-800/50 hover:text-rose-900 dark:hover:text-rose-100',
        active: 'active:bg-rose-200 dark:active:bg-rose-700/60',
        focus: 'focus:ring-2 focus:ring-rose-500 dark:focus:ring-rose-400 focus:outline-none'
      },
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
/**
 * Apple / Cupertino-inspired theme — SF Pro design language.
 *
 * Traits:
 *  - Tight tracking, heavy weight headings (SF Pro Display)
 *  - 17 pt body copy equivalent, leading-[1.75]
 *  - SF Mono for inline code, slightly wider tracking
 *  - Frosted-glass pre blocks: very light bg + 1 px hairline border
 *  - Pill-style blockquotes (no left bar, just a tinted background)
 *  - Capsule buttons (rounded-full)
 *  - Hair-thin dividers, near-invisible border-b on h1/h2
 *  - Accent color always maps to the "system blue" tonal family per color
 */
export const appleMarkdownTheme: Theme = {
  name: 'apple',
  fontFamily: '"SF Pro Display","SF Pro Text",-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif',

  typography: {
    h1: 'text-[1.75rem] sm:text-[2.125rem] lg:text-[2.5rem] font-bold tracking-tight leading-tight mt-0 mb-5 sm:mb-7 pb-px border-b',
    h2: 'text-[1.375rem] sm:text-[1.625rem] lg:text-[1.875rem] font-semibold tracking-tight leading-snug mt-10 sm:mt-12 mb-3 sm:mb-4 pb-px border-b',
    h3: 'text-[1.125rem] sm:text-[1.25rem] lg:text-[1.375rem] font-semibold tracking-tight leading-snug mt-7 sm:mt-9 mb-2 sm:mb-3',
    h4: 'text-base sm:text-[1.0625rem] font-semibold tracking-tight mt-5 sm:mt-6 mb-1.5',
    h5: 'text-sm sm:text-base font-semibold tracking-tight mt-4 sm:mt-5 mb-1',
    h6: 'text-xs sm:text-sm font-semibold tracking-tight uppercase mt-3 sm:mt-4 mb-1',
    p:  'leading-[1.75] my-4 text-[0.9375rem] sm:text-base',
    a:  'underline-offset-[3px] decoration-[0.5px] hover:underline transition-colors duration-200 break-words',
    strong: 'font-semibold',
    em:     'italic',
    code: 'px-[0.35em] py-[0.15em] rounded-md text-[0.8125em] font-mono tracking-[0.01em] before:content-none after:content-none',
    pre:  'rounded-2xl border overflow-x-auto my-5 sm:my-7 text-[0.8125rem] leading-relaxed shadow-sm',
    blockquote: 'not-italic rounded-2xl px-4 sm:px-5 py-3 sm:py-4 my-4 sm:my-5',
    hr:   'my-8 sm:my-10 border-0 border-t',
    th:   'font-semibold px-4 sm:px-5 py-2 text-left text-xs sm:text-[0.8125rem] uppercase tracking-wide',
    td:   'px-4 sm:px-5 py-2.5 text-[0.875rem] sm:text-[0.9375rem] align-top border-t',
    ul:   'list-disc pl-5 sm:pl-6 my-4 sm:my-5 space-y-1',
    ol:   'list-decimal pl-5 sm:pl-6 my-4 sm:my-5 space-y-1',
    li:   'my-1',
    table:  'table-auto border-collapse my-5 w-full',
    button: 'px-4 py-1.5 rounded-full text-sm font-medium tracking-tight cursor-pointer select-none transition-all duration-200',
    span:   'leading-normal',
  },

  color: {
    // ── batch 1: slate · gray · zinc · neutral · stone · red ────────────────
    slate: {
      selection: 'selection:bg-slate-200/60 dark:selection:bg-slate-600/60',
      h1:  {text: 'text-slate-900 dark:text-slate-50',  border: 'border-slate-100 dark:border-slate-800'},
      h2:  {text: 'text-slate-800 dark:text-slate-100', border: 'border-slate-100 dark:border-slate-800'},
      h3:  {text: 'text-slate-800 dark:text-slate-100'},
      h4:  {text: 'text-slate-700 dark:text-slate-200'},
      h5:  {text: 'text-slate-600 dark:text-slate-300'},
      h6:  {text: 'text-slate-500 dark:text-slate-400'},
      p:   {text: 'text-slate-700 dark:text-slate-300'},
      span:{text: 'text-slate-700 dark:text-slate-300'},
      strong:{text: 'text-slate-900 dark:text-slate-50'},
      em:  {text: 'text-slate-600 dark:text-slate-400'},
      li:  {text: 'text-slate-700 dark:text-slate-300'},
      a:   {text: 'text-blue-500 dark:text-blue-400', hover: 'hover:text-blue-700 dark:hover:text-blue-300', focus: 'focus:ring-blue-400'},
      code:{text: 'text-slate-800 dark:text-slate-200', background: 'bg-slate-100 dark:bg-slate-800/70'},
      pre: {background: 'bg-slate-50/80 dark:bg-slate-900/80', border: 'border-slate-200 dark:border-slate-700/60'},
      blockquote:{text: 'text-slate-600 dark:text-slate-400', background: 'bg-slate-100/70 dark:bg-slate-800/40'},
      hr:  {border: 'border-slate-200/70 dark:border-slate-700/50'},
      th:  {text: 'text-slate-500 dark:text-slate-400', background: 'bg-slate-100/60 dark:bg-slate-800/50', border: 'border-slate-200 dark:border-slate-700'},
      td:  {text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-100 dark:border-slate-800'},
      table:{border: 'border-slate-200 dark:border-slate-700'},
      button:{text: 'text-blue-500 dark:text-blue-400', background: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-transparent', hover: 'hover:bg-blue-100 dark:hover:bg-blue-900/40', active: 'active:bg-blue-200 dark:active:bg-blue-800/40', focus: 'focus:ring-2 focus:ring-blue-400'},
    },
    gray: {
      selection: 'selection:bg-gray-200/60 dark:selection:bg-gray-600/60',
      h1:  {text: 'text-gray-900 dark:text-gray-50',  border: 'border-gray-100 dark:border-gray-800'},
      h2:  {text: 'text-gray-800 dark:text-gray-100', border: 'border-gray-100 dark:border-gray-800'},
      h3:  {text: 'text-gray-800 dark:text-gray-100'},
      h4:  {text: 'text-gray-700 dark:text-gray-200'},
      h5:  {text: 'text-gray-600 dark:text-gray-300'},
      h6:  {text: 'text-gray-500 dark:text-gray-400'},
      p:   {text: 'text-gray-700 dark:text-gray-300'},
      span:{text: 'text-gray-700 dark:text-gray-300'},
      strong:{text: 'text-gray-900 dark:text-gray-50'},
      em:  {text: 'text-gray-600 dark:text-gray-400'},
      li:  {text: 'text-gray-700 dark:text-gray-300'},
      a:   {text: 'text-blue-500 dark:text-blue-400', hover: 'hover:text-blue-700 dark:hover:text-blue-300', focus: 'focus:ring-blue-400'},
      code:{text: 'text-gray-800 dark:text-gray-200', background: 'bg-gray-100 dark:bg-gray-800/70'},
      pre: {background: 'bg-gray-50/80 dark:bg-gray-900/80', border: 'border-gray-200 dark:border-gray-700/60'},
      blockquote:{text: 'text-gray-600 dark:text-gray-400', background: 'bg-gray-100/70 dark:bg-gray-800/40'},
      hr:  {border: 'border-gray-200/70 dark:border-gray-700/50'},
      th:  {text: 'text-gray-500 dark:text-gray-400', background: 'bg-gray-100/60 dark:bg-gray-800/50', border: 'border-gray-200 dark:border-gray-700'},
      td:  {text: 'text-gray-700 dark:text-gray-300', border: 'border-gray-100 dark:border-gray-800'},
      table:{border: 'border-gray-200 dark:border-gray-700'},
      button:{text: 'text-blue-500 dark:text-blue-400', background: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-transparent', hover: 'hover:bg-blue-100 dark:hover:bg-blue-900/40', active: 'active:bg-blue-200 dark:active:bg-blue-800/40', focus: 'focus:ring-2 focus:ring-blue-400'},
    },
    zinc: {
      selection: 'selection:bg-zinc-200/60 dark:selection:bg-zinc-600/60',
      h1:  {text: 'text-zinc-900 dark:text-zinc-50',  border: 'border-zinc-100 dark:border-zinc-800'},
      h2:  {text: 'text-zinc-800 dark:text-zinc-100', border: 'border-zinc-100 dark:border-zinc-800'},
      h3:  {text: 'text-zinc-800 dark:text-zinc-100'},
      h4:  {text: 'text-zinc-700 dark:text-zinc-200'},
      h5:  {text: 'text-zinc-600 dark:text-zinc-300'},
      h6:  {text: 'text-zinc-500 dark:text-zinc-400'},
      p:   {text: 'text-zinc-700 dark:text-zinc-300'},
      span:{text: 'text-zinc-700 dark:text-zinc-300'},
      strong:{text: 'text-zinc-900 dark:text-zinc-50'},
      em:  {text: 'text-zinc-600 dark:text-zinc-400'},
      li:  {text: 'text-zinc-700 dark:text-zinc-300'},
      a:   {text: 'text-blue-500 dark:text-blue-400', hover: 'hover:text-blue-700 dark:hover:text-blue-300', focus: 'focus:ring-blue-400'},
      code:{text: 'text-zinc-800 dark:text-zinc-200', background: 'bg-zinc-100 dark:bg-zinc-800/70'},
      pre: {background: 'bg-zinc-50/80 dark:bg-zinc-900/80', border: 'border-zinc-200 dark:border-zinc-700/60'},
      blockquote:{text: 'text-zinc-600 dark:text-zinc-400', background: 'bg-zinc-100/70 dark:bg-zinc-800/40'},
      hr:  {border: 'border-zinc-200/70 dark:border-zinc-700/50'},
      th:  {text: 'text-zinc-500 dark:text-zinc-400', background: 'bg-zinc-100/60 dark:bg-zinc-800/50', border: 'border-zinc-200 dark:border-zinc-700'},
      td:  {text: 'text-zinc-700 dark:text-zinc-300', border: 'border-zinc-100 dark:border-zinc-800'},
      table:{border: 'border-zinc-200 dark:border-zinc-700'},
      button:{text: 'text-blue-500 dark:text-blue-400', background: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-transparent', hover: 'hover:bg-blue-100 dark:hover:bg-blue-900/40', active: 'active:bg-blue-200 dark:active:bg-blue-800/40', focus: 'focus:ring-2 focus:ring-blue-400'},
    },
    neutral: {
      selection: 'selection:bg-neutral-200/60 dark:selection:bg-neutral-600/60',
      h1:  {text: 'text-neutral-900 dark:text-neutral-50',  border: 'border-neutral-100 dark:border-neutral-800'},
      h2:  {text: 'text-neutral-800 dark:text-neutral-100', border: 'border-neutral-100 dark:border-neutral-800'},
      h3:  {text: 'text-neutral-800 dark:text-neutral-100'},
      h4:  {text: 'text-neutral-700 dark:text-neutral-200'},
      h5:  {text: 'text-neutral-600 dark:text-neutral-300'},
      h6:  {text: 'text-neutral-500 dark:text-neutral-400'},
      p:   {text: 'text-neutral-700 dark:text-neutral-300'},
      span:{text: 'text-neutral-700 dark:text-neutral-300'},
      strong:{text: 'text-neutral-900 dark:text-neutral-50'},
      em:  {text: 'text-neutral-600 dark:text-neutral-400'},
      li:  {text: 'text-neutral-700 dark:text-neutral-300'},
      a:   {text: 'text-blue-500 dark:text-blue-400', hover: 'hover:text-blue-700 dark:hover:text-blue-300', focus: 'focus:ring-blue-400'},
      code:{text: 'text-neutral-800 dark:text-neutral-200', background: 'bg-neutral-100 dark:bg-neutral-800/70'},
      pre: {background: 'bg-neutral-50/80 dark:bg-neutral-900/80', border: 'border-neutral-200 dark:border-neutral-700/60'},
      blockquote:{text: 'text-neutral-600 dark:text-neutral-400', background: 'bg-neutral-100/70 dark:bg-neutral-800/40'},
      hr:  {border: 'border-neutral-200/70 dark:border-neutral-700/50'},
      th:  {text: 'text-neutral-500 dark:text-neutral-400', background: 'bg-neutral-100/60 dark:bg-neutral-800/50', border: 'border-neutral-200 dark:border-neutral-700'},
      td:  {text: 'text-neutral-700 dark:text-neutral-300', border: 'border-neutral-100 dark:border-neutral-800'},
      table:{border: 'border-neutral-200 dark:border-neutral-700'},
      button:{text: 'text-blue-500 dark:text-blue-400', background: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-transparent', hover: 'hover:bg-blue-100 dark:hover:bg-blue-900/40', active: 'active:bg-blue-200 dark:active:bg-blue-800/40', focus: 'focus:ring-2 focus:ring-blue-400'},
    },
    stone: {
      selection: 'selection:bg-stone-200/60 dark:selection:bg-stone-600/60',
      h1:  {text: 'text-stone-900 dark:text-stone-50',  border: 'border-stone-100 dark:border-stone-800'},
      h2:  {text: 'text-stone-800 dark:text-stone-100', border: 'border-stone-100 dark:border-stone-800'},
      h3:  {text: 'text-stone-800 dark:text-stone-100'},
      h4:  {text: 'text-stone-700 dark:text-stone-200'},
      h5:  {text: 'text-stone-600 dark:text-stone-300'},
      h6:  {text: 'text-stone-500 dark:text-stone-400'},
      p:   {text: 'text-stone-700 dark:text-stone-300'},
      span:{text: 'text-stone-700 dark:text-stone-300'},
      strong:{text: 'text-stone-900 dark:text-stone-50'},
      em:  {text: 'text-stone-600 dark:text-stone-400'},
      li:  {text: 'text-stone-700 dark:text-stone-300'},
      a:   {text: 'text-blue-500 dark:text-blue-400', hover: 'hover:text-blue-700 dark:hover:text-blue-300', focus: 'focus:ring-blue-400'},
      code:{text: 'text-stone-800 dark:text-stone-200', background: 'bg-stone-100 dark:bg-stone-800/70'},
      pre: {background: 'bg-stone-50/80 dark:bg-stone-900/80', border: 'border-stone-200 dark:border-stone-700/60'},
      blockquote:{text: 'text-stone-600 dark:text-stone-400', background: 'bg-stone-100/70 dark:bg-stone-800/40'},
      hr:  {border: 'border-stone-200/70 dark:border-stone-700/50'},
      th:  {text: 'text-stone-500 dark:text-stone-400', background: 'bg-stone-100/60 dark:bg-stone-800/50', border: 'border-stone-200 dark:border-stone-700'},
      td:  {text: 'text-stone-700 dark:text-stone-300', border: 'border-stone-100 dark:border-stone-800'},
      table:{border: 'border-stone-200 dark:border-stone-700'},
      button:{text: 'text-blue-500 dark:text-blue-400', background: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-transparent', hover: 'hover:bg-blue-100 dark:hover:bg-blue-900/40', active: 'active:bg-blue-200 dark:active:bg-blue-800/40', focus: 'focus:ring-2 focus:ring-blue-400'},
    },
    red: {
      selection: 'selection:bg-red-100/70 dark:selection:bg-red-900/50',
      h1:  {text: 'text-gray-900 dark:text-gray-50',  border: 'border-red-100 dark:border-red-900/50'},
      h2:  {text: 'text-gray-800 dark:text-gray-100', border: 'border-red-100 dark:border-red-900/50'},
      h3:  {text: 'text-gray-800 dark:text-gray-100'},
      h4:  {text: 'text-gray-700 dark:text-gray-200'},
      h5:  {text: 'text-gray-600 dark:text-gray-300'},
      h6:  {text: 'text-red-500 dark:text-red-400'},
      p:   {text: 'text-gray-700 dark:text-gray-300'},
      span:{text: 'text-gray-700 dark:text-gray-300'},
      strong:{text: 'text-gray-900 dark:text-gray-50'},
      em:  {text: 'text-red-600 dark:text-red-400'},
      li:  {text: 'text-gray-700 dark:text-gray-300'},
      a:   {text: 'text-red-500 dark:text-red-400', hover: 'hover:text-red-700 dark:hover:text-red-300', focus: 'focus:ring-red-400'},
      code:{text: 'text-red-700 dark:text-red-300', background: 'bg-red-50 dark:bg-red-900/20'},
      pre: {background: 'bg-gray-50/80 dark:bg-gray-900/80', border: 'border-red-100 dark:border-red-900/40'},
      blockquote:{text: 'text-red-700 dark:text-red-300', background: 'bg-red-50/80 dark:bg-red-900/20'},
      hr:  {border: 'border-red-100 dark:border-red-900/40'},
      th:  {text: 'text-red-600 dark:text-red-400', background: 'bg-red-50/60 dark:bg-red-900/20', border: 'border-red-100 dark:border-red-900/40'},
      td:  {text: 'text-gray-700 dark:text-gray-300', border: 'border-red-50 dark:border-red-900/30'},
      table:{border: 'border-red-100 dark:border-red-900/40'},
      button:{text: 'text-red-500 dark:text-red-400', background: 'bg-red-50 dark:bg-red-900/20', border: 'border-transparent', hover: 'hover:bg-red-100 dark:hover:bg-red-900/40', active: 'active:bg-red-200 dark:active:bg-red-800/40', focus: 'focus:ring-2 focus:ring-red-400'},
    },
    // ── batch 2: orange · amber · yellow · lime · green · emerald ───────────
    orange: {
      selection: 'selection:bg-orange-100/70 dark:selection:bg-orange-900/50',
      h1:  {text: 'text-gray-900 dark:text-gray-50',  border: 'border-orange-100 dark:border-orange-900/50'},
      h2:  {text: 'text-gray-800 dark:text-gray-100', border: 'border-orange-100 dark:border-orange-900/50'},
      h3:  {text: 'text-gray-800 dark:text-gray-100'},
      h4:  {text: 'text-gray-700 dark:text-gray-200'},
      h5:  {text: 'text-gray-600 dark:text-gray-300'},
      h6:  {text: 'text-orange-500 dark:text-orange-400'},
      p:   {text: 'text-gray-700 dark:text-gray-300'},
      span:{text: 'text-gray-700 dark:text-gray-300'},
      strong:{text: 'text-gray-900 dark:text-gray-50'},
      em:  {text: 'text-orange-600 dark:text-orange-400'},
      li:  {text: 'text-gray-700 dark:text-gray-300'},
      a:   {text: 'text-orange-500 dark:text-orange-400', hover: 'hover:text-orange-700 dark:hover:text-orange-300', focus: 'focus:ring-orange-400'},
      code:{text: 'text-orange-700 dark:text-orange-300', background: 'bg-orange-50 dark:bg-orange-900/20'},
      pre: {background: 'bg-gray-50/80 dark:bg-gray-900/80', border: 'border-orange-100 dark:border-orange-900/40'},
      blockquote:{text: 'text-orange-700 dark:text-orange-300', background: 'bg-orange-50/80 dark:bg-orange-900/20'},
      hr:  {border: 'border-orange-100 dark:border-orange-900/40'},
      th:  {text: 'text-orange-600 dark:text-orange-400', background: 'bg-orange-50/60 dark:bg-orange-900/20', border: 'border-orange-100 dark:border-orange-900/40'},
      td:  {text: 'text-gray-700 dark:text-gray-300', border: 'border-orange-50 dark:border-orange-900/30'},
      table:{border: 'border-orange-100 dark:border-orange-900/40'},
      button:{text: 'text-orange-500 dark:text-orange-400', background: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-transparent', hover: 'hover:bg-orange-100 dark:hover:bg-orange-900/40', active: 'active:bg-orange-200 dark:active:bg-orange-800/40', focus: 'focus:ring-2 focus:ring-orange-400'},
    },
    amber: {
      selection: 'selection:bg-amber-100/70 dark:selection:bg-amber-900/50',
      h1:  {text: 'text-gray-900 dark:text-gray-50',  border: 'border-amber-100 dark:border-amber-900/50'},
      h2:  {text: 'text-gray-800 dark:text-gray-100', border: 'border-amber-100 dark:border-amber-900/50'},
      h3:  {text: 'text-gray-800 dark:text-gray-100'},
      h4:  {text: 'text-gray-700 dark:text-gray-200'},
      h5:  {text: 'text-gray-600 dark:text-gray-300'},
      h6:  {text: 'text-amber-500 dark:text-amber-400'},
      p:   {text: 'text-gray-700 dark:text-gray-300'},
      span:{text: 'text-gray-700 dark:text-gray-300'},
      strong:{text: 'text-gray-900 dark:text-gray-50'},
      em:  {text: 'text-amber-600 dark:text-amber-400'},
      li:  {text: 'text-gray-700 dark:text-gray-300'},
      a:   {text: 'text-amber-600 dark:text-amber-400', hover: 'hover:text-amber-800 dark:hover:text-amber-300', focus: 'focus:ring-amber-400'},
      code:{text: 'text-amber-700 dark:text-amber-300', background: 'bg-amber-50 dark:bg-amber-900/20'},
      pre: {background: 'bg-gray-50/80 dark:bg-gray-900/80', border: 'border-amber-100 dark:border-amber-900/40'},
      blockquote:{text: 'text-amber-700 dark:text-amber-300', background: 'bg-amber-50/80 dark:bg-amber-900/20'},
      hr:  {border: 'border-amber-100 dark:border-amber-900/40'},
      th:  {text: 'text-amber-600 dark:text-amber-400', background: 'bg-amber-50/60 dark:bg-amber-900/20', border: 'border-amber-100 dark:border-amber-900/40'},
      td:  {text: 'text-gray-700 dark:text-gray-300', border: 'border-amber-50 dark:border-amber-900/30'},
      table:{border: 'border-amber-100 dark:border-amber-900/40'},
      button:{text: 'text-amber-600 dark:text-amber-400', background: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-transparent', hover: 'hover:bg-amber-100 dark:hover:bg-amber-900/40', active: 'active:bg-amber-200 dark:active:bg-amber-800/40', focus: 'focus:ring-2 focus:ring-amber-400'},
    },
    yellow: {
      selection: 'selection:bg-yellow-100/70 dark:selection:bg-yellow-900/50',
      h1:  {text: 'text-gray-900 dark:text-gray-50',  border: 'border-yellow-100 dark:border-yellow-900/50'},
      h2:  {text: 'text-gray-800 dark:text-gray-100', border: 'border-yellow-100 dark:border-yellow-900/50'},
      h3:  {text: 'text-gray-800 dark:text-gray-100'},
      h4:  {text: 'text-gray-700 dark:text-gray-200'},
      h5:  {text: 'text-gray-600 dark:text-gray-300'},
      h6:  {text: 'text-yellow-500 dark:text-yellow-400'},
      p:   {text: 'text-gray-700 dark:text-gray-300'},
      span:{text: 'text-gray-700 dark:text-gray-300'},
      strong:{text: 'text-gray-900 dark:text-gray-50'},
      em:  {text: 'text-yellow-600 dark:text-yellow-400'},
      li:  {text: 'text-gray-700 dark:text-gray-300'},
      a:   {text: 'text-yellow-600 dark:text-yellow-400', hover: 'hover:text-yellow-800 dark:hover:text-yellow-300', focus: 'focus:ring-yellow-400'},
      code:{text: 'text-yellow-700 dark:text-yellow-300', background: 'bg-yellow-50 dark:bg-yellow-900/20'},
      pre: {background: 'bg-gray-50/80 dark:bg-gray-900/80', border: 'border-yellow-100 dark:border-yellow-900/40'},
      blockquote:{text: 'text-yellow-700 dark:text-yellow-300', background: 'bg-yellow-50/80 dark:bg-yellow-900/20'},
      hr:  {border: 'border-yellow-100 dark:border-yellow-900/40'},
      th:  {text: 'text-yellow-600 dark:text-yellow-400', background: 'bg-yellow-50/60 dark:bg-yellow-900/20', border: 'border-yellow-100 dark:border-yellow-900/40'},
      td:  {text: 'text-gray-700 dark:text-gray-300', border: 'border-yellow-50 dark:border-yellow-900/30'},
      table:{border: 'border-yellow-100 dark:border-yellow-900/40'},
      button:{text: 'text-yellow-600 dark:text-yellow-400', background: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-transparent', hover: 'hover:bg-yellow-100 dark:hover:bg-yellow-900/40', active: 'active:bg-yellow-200 dark:active:bg-yellow-800/40', focus: 'focus:ring-2 focus:ring-yellow-400'},
    },
    lime: {
      selection: 'selection:bg-lime-100/70 dark:selection:bg-lime-900/50',
      h1:  {text: 'text-gray-900 dark:text-gray-50',  border: 'border-lime-100 dark:border-lime-900/50'},
      h2:  {text: 'text-gray-800 dark:text-gray-100', border: 'border-lime-100 dark:border-lime-900/50'},
      h3:  {text: 'text-gray-800 dark:text-gray-100'},
      h4:  {text: 'text-gray-700 dark:text-gray-200'},
      h5:  {text: 'text-gray-600 dark:text-gray-300'},
      h6:  {text: 'text-lime-600 dark:text-lime-400'},
      p:   {text: 'text-gray-700 dark:text-gray-300'},
      span:{text: 'text-gray-700 dark:text-gray-300'},
      strong:{text: 'text-gray-900 dark:text-gray-50'},
      em:  {text: 'text-lime-700 dark:text-lime-400'},
      li:  {text: 'text-gray-700 dark:text-gray-300'},
      a:   {text: 'text-lime-600 dark:text-lime-400', hover: 'hover:text-lime-800 dark:hover:text-lime-300', focus: 'focus:ring-lime-500'},
      code:{text: 'text-lime-700 dark:text-lime-300', background: 'bg-lime-50 dark:bg-lime-900/20'},
      pre: {background: 'bg-gray-50/80 dark:bg-gray-900/80', border: 'border-lime-100 dark:border-lime-900/40'},
      blockquote:{text: 'text-lime-700 dark:text-lime-300', background: 'bg-lime-50/80 dark:bg-lime-900/20'},
      hr:  {border: 'border-lime-100 dark:border-lime-900/40'},
      th:  {text: 'text-lime-600 dark:text-lime-400', background: 'bg-lime-50/60 dark:bg-lime-900/20', border: 'border-lime-100 dark:border-lime-900/40'},
      td:  {text: 'text-gray-700 dark:text-gray-300', border: 'border-lime-50 dark:border-lime-900/30'},
      table:{border: 'border-lime-100 dark:border-lime-900/40'},
      button:{text: 'text-lime-600 dark:text-lime-400', background: 'bg-lime-50 dark:bg-lime-900/20', border: 'border-transparent', hover: 'hover:bg-lime-100 dark:hover:bg-lime-900/40', active: 'active:bg-lime-200 dark:active:bg-lime-800/40', focus: 'focus:ring-2 focus:ring-lime-500'},
    },
    green: {
      selection: 'selection:bg-green-100/70 dark:selection:bg-green-900/50',
      h1:  {text: 'text-gray-900 dark:text-gray-50',  border: 'border-green-100 dark:border-green-900/50'},
      h2:  {text: 'text-gray-800 dark:text-gray-100', border: 'border-green-100 dark:border-green-900/50'},
      h3:  {text: 'text-gray-800 dark:text-gray-100'},
      h4:  {text: 'text-gray-700 dark:text-gray-200'},
      h5:  {text: 'text-gray-600 dark:text-gray-300'},
      h6:  {text: 'text-green-600 dark:text-green-400'},
      p:   {text: 'text-gray-700 dark:text-gray-300'},
      span:{text: 'text-gray-700 dark:text-gray-300'},
      strong:{text: 'text-gray-900 dark:text-gray-50'},
      em:  {text: 'text-green-700 dark:text-green-400'},
      li:  {text: 'text-gray-700 dark:text-gray-300'},
      a:   {text: 'text-green-600 dark:text-green-400', hover: 'hover:text-green-800 dark:hover:text-green-300', focus: 'focus:ring-green-500'},
      code:{text: 'text-green-700 dark:text-green-300', background: 'bg-green-50 dark:bg-green-900/20'},
      pre: {background: 'bg-gray-50/80 dark:bg-gray-900/80', border: 'border-green-100 dark:border-green-900/40'},
      blockquote:{text: 'text-green-700 dark:text-green-300', background: 'bg-green-50/80 dark:bg-green-900/20'},
      hr:  {border: 'border-green-100 dark:border-green-900/40'},
      th:  {text: 'text-green-600 dark:text-green-400', background: 'bg-green-50/60 dark:bg-green-900/20', border: 'border-green-100 dark:border-green-900/40'},
      td:  {text: 'text-gray-700 dark:text-gray-300', border: 'border-green-50 dark:border-green-900/30'},
      table:{border: 'border-green-100 dark:border-green-900/40'},
      button:{text: 'text-green-600 dark:text-green-400', background: 'bg-green-50 dark:bg-green-900/20', border: 'border-transparent', hover: 'hover:bg-green-100 dark:hover:bg-green-900/40', active: 'active:bg-green-200 dark:active:bg-green-800/40', focus: 'focus:ring-2 focus:ring-green-500'},
    },
    emerald: {
      selection: 'selection:bg-emerald-100/70 dark:selection:bg-emerald-900/50',
      h1:  {text: 'text-gray-900 dark:text-gray-50',  border: 'border-emerald-100 dark:border-emerald-900/50'},
      h2:  {text: 'text-gray-800 dark:text-gray-100', border: 'border-emerald-100 dark:border-emerald-900/50'},
      h3:  {text: 'text-gray-800 dark:text-gray-100'},
      h4:  {text: 'text-gray-700 dark:text-gray-200'},
      h5:  {text: 'text-gray-600 dark:text-gray-300'},
      h6:  {text: 'text-emerald-600 dark:text-emerald-400'},
      p:   {text: 'text-gray-700 dark:text-gray-300'},
      span:{text: 'text-gray-700 dark:text-gray-300'},
      strong:{text: 'text-gray-900 dark:text-gray-50'},
      em:  {text: 'text-emerald-700 dark:text-emerald-400'},
      li:  {text: 'text-gray-700 dark:text-gray-300'},
      a:   {text: 'text-emerald-600 dark:text-emerald-400', hover: 'hover:text-emerald-800 dark:hover:text-emerald-300', focus: 'focus:ring-emerald-500'},
      code:{text: 'text-emerald-700 dark:text-emerald-300', background: 'bg-emerald-50 dark:bg-emerald-900/20'},
      pre: {background: 'bg-gray-50/80 dark:bg-gray-900/80', border: 'border-emerald-100 dark:border-emerald-900/40'},
      blockquote:{text: 'text-emerald-700 dark:text-emerald-300', background: 'bg-emerald-50/80 dark:bg-emerald-900/20'},
      hr:  {border: 'border-emerald-100 dark:border-emerald-900/40'},
      th:  {text: 'text-emerald-600 dark:text-emerald-400', background: 'bg-emerald-50/60 dark:bg-emerald-900/20', border: 'border-emerald-100 dark:border-emerald-900/40'},
      td:  {text: 'text-gray-700 dark:text-gray-300', border: 'border-emerald-50 dark:border-emerald-900/30'},
      table:{border: 'border-emerald-100 dark:border-emerald-900/40'},
      button:{text: 'text-emerald-600 dark:text-emerald-400', background: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-transparent', hover: 'hover:bg-emerald-100 dark:hover:bg-emerald-900/40', active: 'active:bg-emerald-200 dark:active:bg-emerald-800/40', focus: 'focus:ring-2 focus:ring-emerald-500'},
    },
    // ── batch 3: teal · cyan · sky · blue · indigo · violet ─────────────────
    teal: {
      selection: 'selection:bg-teal-100/70 dark:selection:bg-teal-900/50',
      h1:  {text: 'text-gray-900 dark:text-gray-50',  border: 'border-teal-100 dark:border-teal-900/50'},
      h2:  {text: 'text-gray-800 dark:text-gray-100', border: 'border-teal-100 dark:border-teal-900/50'},
      h3:  {text: 'text-gray-800 dark:text-gray-100'},
      h4:  {text: 'text-gray-700 dark:text-gray-200'},
      h5:  {text: 'text-gray-600 dark:text-gray-300'},
      h6:  {text: 'text-teal-600 dark:text-teal-400'},
      p:   {text: 'text-gray-700 dark:text-gray-300'},
      span:{text: 'text-gray-700 dark:text-gray-300'},
      strong:{text: 'text-gray-900 dark:text-gray-50'},
      em:  {text: 'text-teal-700 dark:text-teal-400'},
      li:  {text: 'text-gray-700 dark:text-gray-300'},
      a:   {text: 'text-teal-600 dark:text-teal-400', hover: 'hover:text-teal-800 dark:hover:text-teal-300', focus: 'focus:ring-teal-500'},
      code:{text: 'text-teal-700 dark:text-teal-300', background: 'bg-teal-50 dark:bg-teal-900/20'},
      pre: {background: 'bg-gray-50/80 dark:bg-gray-900/80', border: 'border-teal-100 dark:border-teal-900/40'},
      blockquote:{text: 'text-teal-700 dark:text-teal-300', background: 'bg-teal-50/80 dark:bg-teal-900/20'},
      hr:  {border: 'border-teal-100 dark:border-teal-900/40'},
      th:  {text: 'text-teal-600 dark:text-teal-400', background: 'bg-teal-50/60 dark:bg-teal-900/20', border: 'border-teal-100 dark:border-teal-900/40'},
      td:  {text: 'text-gray-700 dark:text-gray-300', border: 'border-teal-50 dark:border-teal-900/30'},
      table:{border: 'border-teal-100 dark:border-teal-900/40'},
      button:{text: 'text-teal-600 dark:text-teal-400', background: 'bg-teal-50 dark:bg-teal-900/20', border: 'border-transparent', hover: 'hover:bg-teal-100 dark:hover:bg-teal-900/40', active: 'active:bg-teal-200 dark:active:bg-teal-800/40', focus: 'focus:ring-2 focus:ring-teal-500'},
    },
    cyan: {
      selection: 'selection:bg-cyan-100/70 dark:selection:bg-cyan-900/50',
      h1:  {text: 'text-gray-900 dark:text-gray-50',  border: 'border-cyan-100 dark:border-cyan-900/50'},
      h2:  {text: 'text-gray-800 dark:text-gray-100', border: 'border-cyan-100 dark:border-cyan-900/50'},
      h3:  {text: 'text-gray-800 dark:text-gray-100'},
      h4:  {text: 'text-gray-700 dark:text-gray-200'},
      h5:  {text: 'text-gray-600 dark:text-gray-300'},
      h6:  {text: 'text-cyan-600 dark:text-cyan-400'},
      p:   {text: 'text-gray-700 dark:text-gray-300'},
      span:{text: 'text-gray-700 dark:text-gray-300'},
      strong:{text: 'text-gray-900 dark:text-gray-50'},
      em:  {text: 'text-cyan-700 dark:text-cyan-400'},
      li:  {text: 'text-gray-700 dark:text-gray-300'},
      a:   {text: 'text-cyan-600 dark:text-cyan-400', hover: 'hover:text-cyan-800 dark:hover:text-cyan-300', focus: 'focus:ring-cyan-500'},
      code:{text: 'text-cyan-700 dark:text-cyan-300', background: 'bg-cyan-50 dark:bg-cyan-900/20'},
      pre: {background: 'bg-gray-50/80 dark:bg-gray-900/80', border: 'border-cyan-100 dark:border-cyan-900/40'},
      blockquote:{text: 'text-cyan-700 dark:text-cyan-300', background: 'bg-cyan-50/80 dark:bg-cyan-900/20'},
      hr:  {border: 'border-cyan-100 dark:border-cyan-900/40'},
      th:  {text: 'text-cyan-600 dark:text-cyan-400', background: 'bg-cyan-50/60 dark:bg-cyan-900/20', border: 'border-cyan-100 dark:border-cyan-900/40'},
      td:  {text: 'text-gray-700 dark:text-gray-300', border: 'border-cyan-50 dark:border-cyan-900/30'},
      table:{border: 'border-cyan-100 dark:border-cyan-900/40'},
      button:{text: 'text-cyan-600 dark:text-cyan-400', background: 'bg-cyan-50 dark:bg-cyan-900/20', border: 'border-transparent', hover: 'hover:bg-cyan-100 dark:hover:bg-cyan-900/40', active: 'active:bg-cyan-200 dark:active:bg-cyan-800/40', focus: 'focus:ring-2 focus:ring-cyan-500'},
    },
    sky: {
      selection: 'selection:bg-sky-100/70 dark:selection:bg-sky-900/50',
      h1:  {text: 'text-gray-900 dark:text-gray-50',  border: 'border-sky-100 dark:border-sky-900/50'},
      h2:  {text: 'text-gray-800 dark:text-gray-100', border: 'border-sky-100 dark:border-sky-900/50'},
      h3:  {text: 'text-gray-800 dark:text-gray-100'},
      h4:  {text: 'text-gray-700 dark:text-gray-200'},
      h5:  {text: 'text-gray-600 dark:text-gray-300'},
      h6:  {text: 'text-sky-500 dark:text-sky-400'},
      p:   {text: 'text-gray-700 dark:text-gray-300'},
      span:{text: 'text-gray-700 dark:text-gray-300'},
      strong:{text: 'text-gray-900 dark:text-gray-50'},
      em:  {text: 'text-sky-600 dark:text-sky-400'},
      li:  {text: 'text-gray-700 dark:text-gray-300'},
      a:   {text: 'text-sky-500 dark:text-sky-400', hover: 'hover:text-sky-700 dark:hover:text-sky-300', focus: 'focus:ring-sky-400'},
      code:{text: 'text-sky-700 dark:text-sky-300', background: 'bg-sky-50 dark:bg-sky-900/20'},
      pre: {background: 'bg-gray-50/80 dark:bg-gray-900/80', border: 'border-sky-100 dark:border-sky-900/40'},
      blockquote:{text: 'text-sky-700 dark:text-sky-300', background: 'bg-sky-50/80 dark:bg-sky-900/20'},
      hr:  {border: 'border-sky-100 dark:border-sky-900/40'},
      th:  {text: 'text-sky-600 dark:text-sky-400', background: 'bg-sky-50/60 dark:bg-sky-900/20', border: 'border-sky-100 dark:border-sky-900/40'},
      td:  {text: 'text-gray-700 dark:text-gray-300', border: 'border-sky-50 dark:border-sky-900/30'},
      table:{border: 'border-sky-100 dark:border-sky-900/40'},
      button:{text: 'text-sky-500 dark:text-sky-400', background: 'bg-sky-50 dark:bg-sky-900/20', border: 'border-transparent', hover: 'hover:bg-sky-100 dark:hover:bg-sky-900/40', active: 'active:bg-sky-200 dark:active:bg-sky-800/40', focus: 'focus:ring-2 focus:ring-sky-400'},
    },
    blue: {
      // Apple system blue — the canonical accent
      selection: 'selection:bg-blue-100/70 dark:selection:bg-blue-900/50',
      h1:  {text: 'text-gray-900 dark:text-gray-50',  border: 'border-blue-100 dark:border-blue-900/50'},
      h2:  {text: 'text-gray-800 dark:text-gray-100', border: 'border-blue-100 dark:border-blue-900/50'},
      h3:  {text: 'text-gray-800 dark:text-gray-100'},
      h4:  {text: 'text-gray-700 dark:text-gray-200'},
      h5:  {text: 'text-gray-600 dark:text-gray-300'},
      h6:  {text: 'text-blue-500 dark:text-blue-400'},
      p:   {text: 'text-gray-700 dark:text-gray-300'},
      span:{text: 'text-gray-700 dark:text-gray-300'},
      strong:{text: 'text-gray-900 dark:text-gray-50'},
      em:  {text: 'text-blue-600 dark:text-blue-400'},
      li:  {text: 'text-gray-700 dark:text-gray-300'},
      a:   {text: 'text-blue-500 dark:text-blue-400', hover: 'hover:text-blue-700 dark:hover:text-blue-300', focus: 'focus:ring-blue-400'},
      code:{text: 'text-blue-700 dark:text-blue-300', background: 'bg-blue-50 dark:bg-blue-900/20'},
      pre: {background: 'bg-gray-50/80 dark:bg-gray-900/80', border: 'border-blue-100 dark:border-blue-900/40'},
      blockquote:{text: 'text-blue-700 dark:text-blue-300', background: 'bg-blue-50/80 dark:bg-blue-900/20'},
      hr:  {border: 'border-blue-100 dark:border-blue-900/40'},
      th:  {text: 'text-blue-600 dark:text-blue-400', background: 'bg-blue-50/60 dark:bg-blue-900/20', border: 'border-blue-100 dark:border-blue-900/40'},
      td:  {text: 'text-gray-700 dark:text-gray-300', border: 'border-blue-50 dark:border-blue-900/30'},
      table:{border: 'border-blue-100 dark:border-blue-900/40'},
      button:{text: 'text-white dark:text-white', background: 'bg-blue-500 dark:bg-blue-500', border: 'border-transparent', hover: 'hover:bg-blue-600 dark:hover:bg-blue-400', active: 'active:bg-blue-700 dark:active:bg-blue-300', focus: 'focus:ring-2 focus:ring-blue-400'},
    },
    indigo: {
      selection: 'selection:bg-indigo-100/70 dark:selection:bg-indigo-900/50',
      h1:  {text: 'text-gray-900 dark:text-gray-50',  border: 'border-indigo-100 dark:border-indigo-900/50'},
      h2:  {text: 'text-gray-800 dark:text-gray-100', border: 'border-indigo-100 dark:border-indigo-900/50'},
      h3:  {text: 'text-gray-800 dark:text-gray-100'},
      h4:  {text: 'text-gray-700 dark:text-gray-200'},
      h5:  {text: 'text-gray-600 dark:text-gray-300'},
      h6:  {text: 'text-indigo-500 dark:text-indigo-400'},
      p:   {text: 'text-gray-700 dark:text-gray-300'},
      span:{text: 'text-gray-700 dark:text-gray-300'},
      strong:{text: 'text-gray-900 dark:text-gray-50'},
      em:  {text: 'text-indigo-600 dark:text-indigo-400'},
      li:  {text: 'text-gray-700 dark:text-gray-300'},
      a:   {text: 'text-indigo-500 dark:text-indigo-400', hover: 'hover:text-indigo-700 dark:hover:text-indigo-300', focus: 'focus:ring-indigo-400'},
      code:{text: 'text-indigo-700 dark:text-indigo-300', background: 'bg-indigo-50 dark:bg-indigo-900/20'},
      pre: {background: 'bg-gray-50/80 dark:bg-gray-900/80', border: 'border-indigo-100 dark:border-indigo-900/40'},
      blockquote:{text: 'text-indigo-700 dark:text-indigo-300', background: 'bg-indigo-50/80 dark:bg-indigo-900/20'},
      hr:  {border: 'border-indigo-100 dark:border-indigo-900/40'},
      th:  {text: 'text-indigo-600 dark:text-indigo-400', background: 'bg-indigo-50/60 dark:bg-indigo-900/20', border: 'border-indigo-100 dark:border-indigo-900/40'},
      td:  {text: 'text-gray-700 dark:text-gray-300', border: 'border-indigo-50 dark:border-indigo-900/30'},
      table:{border: 'border-indigo-100 dark:border-indigo-900/40'},
      button:{text: 'text-white dark:text-white', background: 'bg-indigo-500 dark:bg-indigo-500', border: 'border-transparent', hover: 'hover:bg-indigo-600 dark:hover:bg-indigo-400', active: 'active:bg-indigo-700 dark:active:bg-indigo-300', focus: 'focus:ring-2 focus:ring-indigo-400'},
    },
    violet: {
      selection: 'selection:bg-violet-100/70 dark:selection:bg-violet-900/50',
      h1:  {text: 'text-gray-900 dark:text-gray-50',  border: 'border-violet-100 dark:border-violet-900/50'},
      h2:  {text: 'text-gray-800 dark:text-gray-100', border: 'border-violet-100 dark:border-violet-900/50'},
      h3:  {text: 'text-gray-800 dark:text-gray-100'},
      h4:  {text: 'text-gray-700 dark:text-gray-200'},
      h5:  {text: 'text-gray-600 dark:text-gray-300'},
      h6:  {text: 'text-violet-500 dark:text-violet-400'},
      p:   {text: 'text-gray-700 dark:text-gray-300'},
      span:{text: 'text-gray-700 dark:text-gray-300'},
      strong:{text: 'text-gray-900 dark:text-gray-50'},
      em:  {text: 'text-violet-600 dark:text-violet-400'},
      li:  {text: 'text-gray-700 dark:text-gray-300'},
      a:   {text: 'text-violet-500 dark:text-violet-400', hover: 'hover:text-violet-700 dark:hover:text-violet-300', focus: 'focus:ring-violet-400'},
      code:{text: 'text-violet-700 dark:text-violet-300', background: 'bg-violet-50 dark:bg-violet-900/20'},
      pre: {background: 'bg-gray-50/80 dark:bg-gray-900/80', border: 'border-violet-100 dark:border-violet-900/40'},
      blockquote:{text: 'text-violet-700 dark:text-violet-300', background: 'bg-violet-50/80 dark:bg-violet-900/20'},
      hr:  {border: 'border-violet-100 dark:border-violet-900/40'},
      th:  {text: 'text-violet-600 dark:text-violet-400', background: 'bg-violet-50/60 dark:bg-violet-900/20', border: 'border-violet-100 dark:border-violet-900/40'},
      td:  {text: 'text-gray-700 dark:text-gray-300', border: 'border-violet-50 dark:border-violet-900/30'},
      table:{border: 'border-violet-100 dark:border-violet-900/40'},
      button:{text: 'text-white dark:text-white', background: 'bg-violet-500 dark:bg-violet-500', border: 'border-transparent', hover: 'hover:bg-violet-600 dark:hover:bg-violet-400', active: 'active:bg-violet-700 dark:active:bg-violet-300', focus: 'focus:ring-2 focus:ring-violet-400'},
    },
    // ── batch 4: purple · fuchsia · pink · rose ──────────────────────────────
    purple: {
      selection: 'selection:bg-purple-100/70 dark:selection:bg-purple-900/50',
      h1:  {text: 'text-gray-900 dark:text-gray-50',  border: 'border-purple-100 dark:border-purple-900/50'},
      h2:  {text: 'text-gray-800 dark:text-gray-100', border: 'border-purple-100 dark:border-purple-900/50'},
      h3:  {text: 'text-gray-800 dark:text-gray-100'},
      h4:  {text: 'text-gray-700 dark:text-gray-200'},
      h5:  {text: 'text-gray-600 dark:text-gray-300'},
      h6:  {text: 'text-purple-500 dark:text-purple-400'},
      p:   {text: 'text-gray-700 dark:text-gray-300'},
      span:{text: 'text-gray-700 dark:text-gray-300'},
      strong:{text: 'text-gray-900 dark:text-gray-50'},
      em:  {text: 'text-purple-600 dark:text-purple-400'},
      li:  {text: 'text-gray-700 dark:text-gray-300'},
      a:   {text: 'text-purple-500 dark:text-purple-400', hover: 'hover:text-purple-700 dark:hover:text-purple-300', focus: 'focus:ring-purple-400'},
      code:{text: 'text-purple-700 dark:text-purple-300', background: 'bg-purple-50 dark:bg-purple-900/20'},
      pre: {background: 'bg-gray-50/80 dark:bg-gray-900/80', border: 'border-purple-100 dark:border-purple-900/40'},
      blockquote:{text: 'text-purple-700 dark:text-purple-300', background: 'bg-purple-50/80 dark:bg-purple-900/20'},
      hr:  {border: 'border-purple-100 dark:border-purple-900/40'},
      th:  {text: 'text-purple-600 dark:text-purple-400', background: 'bg-purple-50/60 dark:bg-purple-900/20', border: 'border-purple-100 dark:border-purple-900/40'},
      td:  {text: 'text-gray-700 dark:text-gray-300', border: 'border-purple-50 dark:border-purple-900/30'},
      table:{border: 'border-purple-100 dark:border-purple-900/40'},
      button:{text: 'text-white dark:text-white', background: 'bg-purple-500 dark:bg-purple-500', border: 'border-transparent', hover: 'hover:bg-purple-600 dark:hover:bg-purple-400', active: 'active:bg-purple-700 dark:active:bg-purple-300', focus: 'focus:ring-2 focus:ring-purple-400'},
    },
    fuchsia: {
      selection: 'selection:bg-fuchsia-100/70 dark:selection:bg-fuchsia-900/50',
      h1:  {text: 'text-gray-900 dark:text-gray-50',  border: 'border-fuchsia-100 dark:border-fuchsia-900/50'},
      h2:  {text: 'text-gray-800 dark:text-gray-100', border: 'border-fuchsia-100 dark:border-fuchsia-900/50'},
      h3:  {text: 'text-gray-800 dark:text-gray-100'},
      h4:  {text: 'text-gray-700 dark:text-gray-200'},
      h5:  {text: 'text-gray-600 dark:text-gray-300'},
      h6:  {text: 'text-fuchsia-500 dark:text-fuchsia-400'},
      p:   {text: 'text-gray-700 dark:text-gray-300'},
      span:{text: 'text-gray-700 dark:text-gray-300'},
      strong:{text: 'text-gray-900 dark:text-gray-50'},
      em:  {text: 'text-fuchsia-600 dark:text-fuchsia-400'},
      li:  {text: 'text-gray-700 dark:text-gray-300'},
      a:   {text: 'text-fuchsia-500 dark:text-fuchsia-400', hover: 'hover:text-fuchsia-700 dark:hover:text-fuchsia-300', focus: 'focus:ring-fuchsia-400'},
      code:{text: 'text-fuchsia-700 dark:text-fuchsia-300', background: 'bg-fuchsia-50 dark:bg-fuchsia-900/20'},
      pre: {background: 'bg-gray-50/80 dark:bg-gray-900/80', border: 'border-fuchsia-100 dark:border-fuchsia-900/40'},
      blockquote:{text: 'text-fuchsia-700 dark:text-fuchsia-300', background: 'bg-fuchsia-50/80 dark:bg-fuchsia-900/20'},
      hr:  {border: 'border-fuchsia-100 dark:border-fuchsia-900/40'},
      th:  {text: 'text-fuchsia-600 dark:text-fuchsia-400', background: 'bg-fuchsia-50/60 dark:bg-fuchsia-900/20', border: 'border-fuchsia-100 dark:border-fuchsia-900/40'},
      td:  {text: 'text-gray-700 dark:text-gray-300', border: 'border-fuchsia-50 dark:border-fuchsia-900/30'},
      table:{border: 'border-fuchsia-100 dark:border-fuchsia-900/40'},
      button:{text: 'text-white dark:text-white', background: 'bg-fuchsia-500 dark:bg-fuchsia-500', border: 'border-transparent', hover: 'hover:bg-fuchsia-600 dark:hover:bg-fuchsia-400', active: 'active:bg-fuchsia-700 dark:active:bg-fuchsia-300', focus: 'focus:ring-2 focus:ring-fuchsia-400'},
    },
    pink: {
      selection: 'selection:bg-pink-100/70 dark:selection:bg-pink-900/50',
      h1:  {text: 'text-gray-900 dark:text-gray-50',  border: 'border-pink-100 dark:border-pink-900/50'},
      h2:  {text: 'text-gray-800 dark:text-gray-100', border: 'border-pink-100 dark:border-pink-900/50'},
      h3:  {text: 'text-gray-800 dark:text-gray-100'},
      h4:  {text: 'text-gray-700 dark:text-gray-200'},
      h5:  {text: 'text-gray-600 dark:text-gray-300'},
      h6:  {text: 'text-pink-500 dark:text-pink-400'},
      p:   {text: 'text-gray-700 dark:text-gray-300'},
      span:{text: 'text-gray-700 dark:text-gray-300'},
      strong:{text: 'text-gray-900 dark:text-gray-50'},
      em:  {text: 'text-pink-600 dark:text-pink-400'},
      li:  {text: 'text-gray-700 dark:text-gray-300'},
      a:   {text: 'text-pink-500 dark:text-pink-400', hover: 'hover:text-pink-700 dark:hover:text-pink-300', focus: 'focus:ring-pink-400'},
      code:{text: 'text-pink-700 dark:text-pink-300', background: 'bg-pink-50 dark:bg-pink-900/20'},
      pre: {background: 'bg-gray-50/80 dark:bg-gray-900/80', border: 'border-pink-100 dark:border-pink-900/40'},
      blockquote:{text: 'text-pink-700 dark:text-pink-300', background: 'bg-pink-50/80 dark:bg-pink-900/20'},
      hr:  {border: 'border-pink-100 dark:border-pink-900/40'},
      th:  {text: 'text-pink-600 dark:text-pink-400', background: 'bg-pink-50/60 dark:bg-pink-900/20', border: 'border-pink-100 dark:border-pink-900/40'},
      td:  {text: 'text-gray-700 dark:text-gray-300', border: 'border-pink-50 dark:border-pink-900/30'},
      table:{border: 'border-pink-100 dark:border-pink-900/40'},
      button:{text: 'text-white dark:text-white', background: 'bg-pink-500 dark:bg-pink-500', border: 'border-transparent', hover: 'hover:bg-pink-600 dark:hover:bg-pink-400', active: 'active:bg-pink-700 dark:active:bg-pink-300', focus: 'focus:ring-2 focus:ring-pink-400'},
    },
    rose: {
      selection: 'selection:bg-rose-100/70 dark:selection:bg-rose-900/50',
      h1:  {text: 'text-gray-900 dark:text-gray-50',  border: 'border-rose-100 dark:border-rose-900/50'},
      h2:  {text: 'text-gray-800 dark:text-gray-100', border: 'border-rose-100 dark:border-rose-900/50'},
      h3:  {text: 'text-gray-800 dark:text-gray-100'},
      h4:  {text: 'text-gray-700 dark:text-gray-200'},
      h5:  {text: 'text-gray-600 dark:text-gray-300'},
      h6:  {text: 'text-rose-500 dark:text-rose-400'},
      p:   {text: 'text-gray-700 dark:text-gray-300'},
      span:{text: 'text-gray-700 dark:text-gray-300'},
      strong:{text: 'text-gray-900 dark:text-gray-50'},
      em:  {text: 'text-rose-600 dark:text-rose-400'},
      li:  {text: 'text-gray-700 dark:text-gray-300'},
      a:   {text: 'text-rose-500 dark:text-rose-400', hover: 'hover:text-rose-700 dark:hover:text-rose-300', focus: 'focus:ring-rose-400'},
      code:{text: 'text-rose-700 dark:text-rose-300', background: 'bg-rose-50 dark:bg-rose-900/20'},
      pre: {background: 'bg-gray-50/80 dark:bg-gray-900/80', border: 'border-rose-100 dark:border-rose-900/40'},
      blockquote:{text: 'text-rose-700 dark:text-rose-300', background: 'bg-rose-50/80 dark:bg-rose-900/20'},
      hr:  {border: 'border-rose-100 dark:border-rose-900/40'},
      th:  {text: 'text-rose-600 dark:text-rose-400', background: 'bg-rose-50/60 dark:bg-rose-900/20', border: 'border-rose-100 dark:border-rose-900/40'},
      td:  {text: 'text-gray-700 dark:text-gray-300', border: 'border-rose-50 dark:border-rose-900/30'},
      table:{border: 'border-rose-100 dark:border-rose-900/40'},
      button:{text: 'text-white dark:text-white', background: 'bg-rose-500 dark:bg-rose-500', border: 'border-transparent', hover: 'hover:bg-rose-600 dark:hover:bg-rose-400', active: 'active:bg-rose-700 dark:active:bg-rose-300', focus: 'focus:ring-2 focus:ring-rose-400'},
    },
  },
}

