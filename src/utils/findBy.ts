export function findBy<T, K extends keyof T>(
    array: T[],
    key: K,
    value: T[K]
  ): T {
    const found = array.find(item => item[key] === value);
    if (!found) {
      throw new Error(`Object with ${String(key)} = "${value}" not found`);
    }
    return found;
  }