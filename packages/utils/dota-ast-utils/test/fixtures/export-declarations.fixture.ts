import DeltaWidget from "./delta";
import {alphaLabel} from "./alpha";
import {deltaValue, deltaHelper as deltaAlias} from "./delta";
import * as betaNS from "./beta";
import type {DeltaOptions} from "./delta";
import "./gamma";

export class ExportedWidget {
  render() {
    return "widget";
  }
}

export function buildAlphaLabel() {
  return "alpha";
}

export function formatLabel<T extends string>(prefix: string, suffix: T) {
  return `${prefix}${suffix}`;
}

export const exportedVersion = "1.0.0";
export let exportedToggle = true;
export var exportedCounter = 3;
export const multiFirst = 1, multiSecond = 2;
export const {destructuredLabel} = {destructuredLabel: "destructured"};

export interface ExportedConfig {
  enabled: boolean;
}

export type ExportedName = string;

export enum ExportedKind {
  Alpha = "alpha",
  Beta = "beta",
}

export namespace ExportedNamespace {
  export const token = "ns";
}

export default class DefaultExportedWidget {
  kind = "default";
}

export {buildAlphaLabel as namedBuild};
export type {ExportedName as ExportedNameAlias};

export {alphaLabel as alphaAlias} from "./alpha";
export * as betaNamespace from "./beta";
export * from "./beta";
export * from "./alpha";
export * from "./gamma";
