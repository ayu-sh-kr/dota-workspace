import type {Expression} from "@swc/core";
import type {WebComponentInfo} from "../Types.ts";

/**
 * Normalizes and orders scanned component metadata before format-specific projection.
 * Keeping these policies independent of serializers lets Web Types and CEM consume
 * the same stable interpretation of component properties.
 */
export class ComponentMetadataUtils {
  /**
   * Maps inferred type names to the primitive vocabulary used by generated metadata.
   * Known primitive names are case-normalized while custom type names are preserved.
   * @param type Type name extracted from a component property.
   * @returns A normalized primitive or the unchanged custom type name.
   */
  static normalizePropertyType(type: string): string {
    switch (type.toLowerCase()) {
      case "string":
        return "string";
      case "number":
        return "number";
      case "boolean":
        return "boolean";
      case "array":
        return "array";
      case "object":
        return "object";
      default:
        return type;
    }
  }

  /**
   * Serializes simple initializers into the string form used by generated metadata.
   * Complex expressions are omitted because evaluating or printing them could report
   * a value that differs from the component's actual runtime default.
   * @param expression Property initializer extracted from the SWC class field.
   * @returns A stable primitive default string, or `undefined` for complex expressions.
   */
  static defaultValueFromExpression(expression: Expression | null): string | undefined {
    if (expression == null) return undefined;

    switch (expression.type) {
      case "StringLiteral":
      case "BooleanLiteral":
      case "NumericLiteral":
      case "BigIntLiteral":
        return String(expression.value);
      case "NullLiteral":
        return "null";
      case "Identifier":
        return expression.value;
      default:
        return undefined;
    }
  }

  /**
   * Keeps generated entries stable across repeated scans without mutating scan results.
   * Visible component and property identities are primary keys; source metadata only
   * breaks ties so unchanged input remains byte-for-byte deterministic.
   * @param scannedInfos Component metadata collected from source files.
   * @returns A sorted copy with independently copied property arrays.
   */
  static sortWebComponentInfos(scannedInfos: WebComponentInfo[]): WebComponentInfo[] {
    return [...scannedInfos]
      .map(component => ({
        ...component,
        properties: [...component.properties].sort((left, right) =>
          left.name.localeCompare(right.name)
          || (left.propertyName ?? left.name).localeCompare(right.propertyName ?? right.name)
          || ComponentMetadataUtils.compareOptionalNumber(left.source?.offset, right.source?.offset)
          || ComponentMetadataUtils.compareOptionalString(left.source?.file, right.source?.file)
          || left.type.localeCompare(right.type),
        ),
      }))
      .sort((left, right) =>
        left.tagName.localeCompare(right.tagName)
        || left.className.localeCompare(right.className)
        || ComponentMetadataUtils.compareOptionalString(left.source?.file, right.source?.file)
        || ComponentMetadataUtils.compareOptionalNumber(left.source?.offset, right.source?.offset),
      );
  }

  private static compareOptionalNumber(left?: number, right?: number): number {
    if (left == null && right == null) return 0;
    if (left == null) return 1;
    if (right == null) return -1;
    return left - right;
  }

  private static compareOptionalString(left?: string, right?: string): number {
    if (left == null && right == null) return 0;
    if (left == null) return 1;
    if (right == null) return -1;
    return left.localeCompare(right);
  }
}
