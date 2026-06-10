type JsonLike = null | boolean | number | string | JsonLike[] | { [key: string]: JsonLike };

function normalizeScalar(value: unknown): JsonLike {
  if (typeof value === 'undefined') {
    return null;
  }

  if (typeof value === 'bigint') {
    const asNumber = Number(value);
    return Number.isSafeInteger(asNumber) ? asNumber : value.toString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value && typeof value === 'object') {
    const decimalLike = value as {
      toNumber?: () => number;
      toString?: () => string;
    };

    if (typeof decimalLike.toNumber === 'function') {
      const numericValue = decimalLike.toNumber();
      if (Number.isFinite(numericValue)) {
        return numericValue;
      }
    }

    if (typeof decimalLike.toString === 'function') {
      const stringValue = decimalLike.toString();
      if (stringValue && stringValue !== '[object Object]') {
        const numericValue = Number(stringValue);
        return Number.isFinite(numericValue) ? numericValue : stringValue;
      }
    }
  }

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null
  ) {
    return value;
  }

  return null;
}

export function toJsonSafe<T>(value: T): JsonLike {
  if (Array.isArray(value)) {
    return value.map((item) => toJsonSafe(item));
  }

  if (value && typeof value === 'object') {
    const scalarValue = normalizeScalar(value);
    if (scalarValue !== null) {
      return scalarValue;
    }

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => [
        key,
        nestedValue && typeof nestedValue === 'object'
          ? toJsonSafe(nestedValue)
          : normalizeScalar(nestedValue),
      ]),
    );
  }

  return normalizeScalar(value);
}
