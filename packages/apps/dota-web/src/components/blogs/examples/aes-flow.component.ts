import {BaseElement, Component, HTML} from "@ayu-sh-kr/dota-wrap/core";

type FlowStage = {
  title: string;
  summary: string;
  before: string;
  transform: string;
  after: string;
  formula: string;
  note: string;
};

type FlowMode = "encryption" | "decryption";

type FlowConfig = {
  eyebrow: string;
  title: string;
  subtitle: string;
  accent: string;
  badge: string;
  stages: FlowStage[];
};

const FLOW_CONFIG: Record<FlowMode, FlowConfig> = {
  encryption: {
    eyebrow: "AES encryption",
    title: "How plaintext becomes ciphertext",
    subtitle: "Watch the block move from readable bytes to an encrypted output. Each slide shows what the state looks like before a step, what changes during the step, and what the state becomes after it.",
    accent: "from-sky-500/20 via-cyan-500/10 to-emerald-500/10",
    badge: "text-sky-700 bg-sky-50 border-sky-200 dark:text-sky-300 dark:bg-sky-950/30 dark:border-sky-900/70",
    stages: [
      {
        title: "Plaintext block",
        summary: "Start with readable input and place it into the AES state.",
        before: "Readable bytes",
        transform: "Load the 128-bit block",
        after: "AES state",
        formula: "state = plaintext",
        note: "AES always works on a fixed 128-bit block, so the first job is to place the input into the internal state.",
      },
      {
        title: "Initial key mix",
        summary: "Mix the block with the first round key before the main rounds begin.",
        before: "AES state",
        transform: "XOR with round key 0",
        after: "Mixed state",
        formula: "state = plaintext XOR round key 0",
        note: "This is the first moment where the secret key directly changes the block.",
      },
      {
        title: "Main rounds",
        summary: "Repeat the core substitution and permutation steps.",
        before: "Mixed state",
        transform: "SubBytes -> ShiftRows -> MixColumns -> AddRoundKey",
        after: "Next round state",
        formula: "state = round(state, round key 1..n-1)",
        note: "Each full round spreads small changes across the whole block.",
      },
      {
        title: "Final round",
        summary: "Finish with the last round, which skips MixColumns.",
        before: "Round state",
        transform: "SubBytes -> ShiftRows -> AddRoundKey",
        after: "Cipher-ready state",
        formula: "state = final round(state, round key n)",
        note: "The last round completes the transformation without the extra mixing step.",
      },
      {
        title: "Ciphertext",
        summary: "Release the encrypted block as the final output.",
        before: "Cipher-ready state",
        transform: "Emit the output block",
        after: "Ciphertext",
        formula: "ciphertext",
        note: "The result should look unrelated to the original plaintext.",
      },
    ],
  },
  decryption: {
    eyebrow: "AES decryption",
    title: "How ciphertext becomes plaintext again",
    subtitle: "Decryption walks the same block in reverse. The same key is used, but the round keys are applied backward and the inverse operations undo each step.",
    accent: "from-amber-500/20 via-orange-500/10 to-violet-500/10",
    badge: "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/30 dark:border-amber-900/70",
    stages: [
      {
        title: "Ciphertext block",
        summary: "Start with the encrypted output from the previous flow.",
        before: "Encrypted bytes",
        transform: "Load the 128-bit block",
        after: "AES state",
        formula: "state = ciphertext",
        note: "Decryption starts from the ciphertext and places it into the same internal state layout.",
      },
      {
        title: "Initial reverse step",
        summary: "Apply the last round key and reverse the final-round layout.",
        before: "AES state",
        transform: "XOR with round key n and undo the final round order",
        after: "Partially reversed state",
        formula: "state = ciphertext XOR round key n",
        note: "The last encryption round is unwound first, because decryption runs the round keys in reverse.",
      },
      {
        title: "Inverse rounds",
        summary: "Step backward through the middle rounds.",
        before: "Partially reversed state",
        transform: "Inverse ShiftRows -> Inverse SubBytes -> AddRoundKey -> Inverse MixColumns",
        after: "Earlier round state",
        formula: "state = inverse round(state, round key n-1..1)",
        note: "The inverse operations restore the state one layer at a time.",
      },
      {
        title: "Final inverse round",
        summary: "Undo the first round and leave the block ready to read.",
        before: "Earlier round state",
        transform: "Inverse ShiftRows -> Inverse SubBytes -> AddRoundKey",
        after: "Recovered state",
        formula: "state = inverse round(state, round key 0)",
        note: "This brings the block back to its original shape without needing a final MixColumns reversal.",
      },
      {
        title: "Plaintext",
        summary: "Return the original readable data.",
        before: "Recovered state",
        transform: "Emit the plaintext bytes",
        after: "Plaintext",
        formula: "plaintext",
        note: "If the right key and mode were used, the original message comes back exactly.",
      },
    ],
  },
};

const STEP_ACCENTS = [
  "border-sky-200 bg-sky-50/80 dark:border-sky-900/70 dark:bg-sky-950/25",
  "border-cyan-200 bg-cyan-50/80 dark:border-cyan-900/70 dark:bg-cyan-950/25",
  "border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/70 dark:bg-emerald-950/25",
  "border-violet-200 bg-violet-50/80 dark:border-violet-900/70 dark:bg-violet-950/25",
  "border-rose-200 bg-rose-50/80 dark:border-rose-900/70 dark:bg-rose-950/25",
];

@Component({
  selector: "aes-flow",
  shadow: false,
})
export class AesFlowComponent extends BaseElement {
  private getMode(): FlowMode {
    const mode = (this.getAttribute("mode") ?? "encryption").toLowerCase();
    return mode === "decryption" ? "decryption" : "encryption";
  }

  render(): string {
    const config = FLOW_CONFIG[this.getMode()];
    const total = config.stages.length;

    return HTML`
      <scroll-deck aria-label="AES flow carousel">
        ${config.stages.map((stage, index) => {
          const accent = STEP_ACCENTS[index % STEP_ACCENTS.length];
          const hasMore = index < total - 1;

          return `
            <article
              data-scroll-slide="true"
              class="relative min-w-full snap-start snap-always"
              aria-label="AES flow slide ${index + 1} of ${total}"
            >
              <div class="relative h-full min-h-[24rem] rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:min-h-[25rem] sm:p-5 md:min-h-[27rem] md:p-6">
                <div class="absolute left-4 top-4 sm:left-5 sm:top-5">
                  <div class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-3 py-1.5 text-xs font-semibold tracking-[0.18em]
                              text-slate-500 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 dark:text-slate-400
                              ${hasMore ? "shadow-[0_0_0_1px_rgba(56,189,248,0.18),0_0_24px_rgba(56,189,248,0.22)] animate-pulse" : ""}">
                    <span class="${stage.title.toLowerCase().includes("ciphertext") || stage.title.toLowerCase().includes("plaintext") ? config.badge : "text-slate-700 dark:text-slate-300"}">${String(index + 1).padStart(2, "0")}</span>
                    <span class="text-slate-300 dark:text-slate-700">/</span>
                    <span>${String(total).padStart(2, "0")}</span>
                  </div>
                </div>

                <div class="pt-11 sm:pt-12">
                  <div class="flex flex-col gap-4">
                    <div class="max-w-2xl">
                      <p class="text-xs font-semibold uppercase tracking-[0.22em] ${config.badge}">
                        ${stage.title}
                      </p>
                      <h4 class="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-[1.75rem]">
                        ${stage.summary}
                      </h4>
                      <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300 break-words">
                        ${stage.note}
                      </p>
                    </div>

                    <div class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-stretch">
                      <div class="min-w-0 min-h-[5.25rem] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50">
                        <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Before</p>
                        <p class="mt-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100 break-words">${stage.before}</p>
                      </div>

                      <div class="hidden lg:flex items-center justify-center py-1 text-slate-400 dark:text-slate-500">
                        <span class="text-xl leading-none sm:text-2xl">→</span>
                      </div>

                      <div class="min-w-0 min-h-[5.25rem] rounded-2xl border ${accent} px-4 py-3">
                        <p class="text-[11px] font-semibold uppercase tracking-[0.18em] ${config.badge}">Transform</p>
                        <p class="mt-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100 break-words">${stage.transform}</p>
                      </div>

                      <div class="hidden lg:flex items-center justify-center py-1 text-slate-400 dark:text-slate-500">
                        <span class="text-xl leading-none sm:text-2xl">→</span>
                      </div>

                      <div class="min-w-0 min-h-[5.25rem] rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                        <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">After</p>
                        <p class="mt-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100 break-words">${stage.after}</p>
                      </div>
                    </div>

                    <div class="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300">
                      <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Formula</p>
                      <p class="mt-1.5 font-mono text-[12px] leading-6 text-slate-800 dark:text-slate-200 break-words whitespace-normal">${stage.formula}</p>
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
