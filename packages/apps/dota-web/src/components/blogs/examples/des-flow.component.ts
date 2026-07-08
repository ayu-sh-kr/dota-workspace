import {BaseElement, Component, HTML} from "@ayu-sh-kr/dota-wrap/core";

type FlowStage = {
  title: string;
  summary: string;
  before: string;
  change: string;
  after: string;
  formula: string;
  note: string;
};

const DES_FLOW_STAGES: FlowStage[] = [
  {
    title: "Input block",
    summary: "Start with the 64-bit plaintext block before DES touches it.",
    before: "Plaintext block",
    change: "Initial permutation",
    after: "Permuted block",
    formula: "P(plaintext) -> L0 + R0",
    note: "DES rearranges the bits first so the round flow starts from a fixed layout.",
  },
  {
    title: "Split",
    summary: "The block is divided into two 32-bit halves.",
    before: "L0 + R0",
    change: "Split into halves",
    after: "Left and right halves",
    formula: "L0 | R0",
    note: "Only one half drives the round function, and the other half waits to be mixed back in.",
  },
  {
    title: "Round function",
    summary: "The right half is expanded and mixed with the round key.",
    before: "R0",
    change: "Expand + key mix",
    after: "F(R0, K1)",
    formula: "E(R0) XOR K1",
    note: "This is the part that introduces the round key and reshapes the data for substitution.",
  },
  {
    title: "XOR",
    summary: "The scrambled value is combined with the left half.",
    before: "L0",
    change: "XOR with round output",
    after: "R1",
    formula: "L0 XOR F(R0, K1)",
    note: "XOR is what makes the Feistel structure reversible when the keys are used in reverse order.",
  },
  {
    title: "Swap",
    summary: "The halves switch places and become the input for the next round.",
    before: "R0 + R1",
    change: "Swap halves",
    after: "L1 + R1",
    formula: "L1 = R0, R1 = L0 XOR F(R0, K1)",
    note: "One completed round becomes the starting point for the next of the 16 DES rounds.",
  },
];

const ACCENT_BY_INDEX = [
  "text-sky-700 dark:text-sky-300",
  "text-amber-700 dark:text-amber-300",
  "text-emerald-700 dark:text-emerald-300",
  "text-violet-700 dark:text-violet-300",
  "text-rose-700 dark:text-rose-300",
];

const CARD_ACCENT_BY_INDEX = [
  "border-sky-200 bg-sky-50/80 dark:border-sky-900/60 dark:bg-sky-950/20",
  "border-amber-200 bg-amber-50/80 dark:border-amber-900/60 dark:bg-amber-950/20",
  "border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/60 dark:bg-emerald-950/20",
  "border-violet-200 bg-violet-50/80 dark:border-violet-900/60 dark:bg-violet-950/20",
  "border-rose-200 bg-rose-50/80 dark:border-rose-900/60 dark:bg-rose-950/20",
];

@Component({
  selector: "des-flow",
  shadow: false,
})
export class DesFlowComponent extends BaseElement {
  render(): string {
    const total = DES_FLOW_STAGES.length;

    return HTML`
      <scroll-deck aria-label="DES flow carousel">
        ${DES_FLOW_STAGES.map((stage, index) => {
          const accent = ACCENT_BY_INDEX[index % ACCENT_BY_INDEX.length];
          const cardAccent = CARD_ACCENT_BY_INDEX[index % CARD_ACCENT_BY_INDEX.length];
          const hasMore = index < total - 1;

          return `
            <article
              data-scroll-slide="true"
              class="relative min-w-full snap-start snap-always"
              aria-label="DES flow slide ${index + 1} of ${total}"
            >
              <div class="relative h-full min-h-[22rem] rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm
                          dark:border-slate-800 dark:bg-slate-950 sm:min-h-[24rem] sm:p-5 md:min-h-[26rem] md:p-6">
                <div class="absolute left-4 top-4 sm:left-5 sm:top-5">
                  <div class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-3 py-1.5 text-xs font-semibold tracking-[0.18em]
                              text-slate-500 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 dark:text-slate-400
                              ${hasMore ? "shadow-[0_0_0_1px_rgba(56,189,248,0.18),0_0_24px_rgba(56,189,248,0.22)] animate-pulse" : ""}">
                    <span class="${accent}">${String(index + 1).padStart(2, "0")}</span>
                    <span class="text-slate-300 dark:text-slate-700">/</span>
                    <span>${String(total).padStart(2, "0")}</span>
                  </div>
                </div>

                <div class="pt-11 sm:pt-12">
                  <div class="flex flex-col gap-4">
                    <div class="max-w-2xl">
                      <p class="text-xs font-semibold uppercase tracking-[0.22em] ${accent}">
                        ${stage.title}
                      </p>
                      <h4 class="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-[1.75rem]">
                        ${stage.summary}
                      </h4>
                      <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                        ${stage.note}
                      </p>
                    </div>

                    <div class="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
                      <div class="min-h-[5rem] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50">
                        <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Before</p>
                        <p class="mt-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100">${stage.before}</p>
                      </div>

                      <div class="flex items-center justify-center py-1 text-slate-400 dark:text-slate-500">
                        <span class="text-xl leading-none sm:text-2xl">→</span>
                      </div>

                      <div class="min-h-[5rem] rounded-2xl border ${cardAccent} px-4 py-3">
                        <p class="text-[11px] font-semibold uppercase tracking-[0.18em] ${accent}">After</p>
                        <p class="mt-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100">${stage.after}</p>
                      </div>
                    </div>

                    <div class="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300">
                      <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Formula</p>
                      <p class="mt-1.5 font-mono text-[13px] leading-6 text-slate-800 dark:text-slate-200">${stage.formula}</p>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          `;
        }).join("")}
      </scroll-deck>
    `;
  }
}
