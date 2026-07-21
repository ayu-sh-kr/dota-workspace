/** Default visual slots for `app-scaffold`. */
export const ScaffoldStyle = {
  container: "p-2",
} as const;

/** Per-instance visual replacements for the scaffold's single layout wrapper. */
export interface ScaffoldStyleConfig {
  container?: string;
}
