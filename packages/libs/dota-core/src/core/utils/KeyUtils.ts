
export class KeyUtils {
  private static keyCounter: number = 0;

  static getKey(): number {
    return ++this.keyCounter
  }
}