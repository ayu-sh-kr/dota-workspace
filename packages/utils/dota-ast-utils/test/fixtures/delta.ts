export default class DeltaWidget {
  kind = "delta";
}

export const deltaValue = 42;

export function deltaHelper() {
  return deltaValue;
}

export type DeltaOptions = {
  verbose: boolean;
};
