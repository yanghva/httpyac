import { ensureString } from './stringUtils';

export function toBoolean(value: unknown, defaultValue = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return !!value;
  const stringValue = ensureString(value);
  const trimmedValue = stringValue.trim();
  if (!trimmedValue) {
    return defaultValue;
  }
  if (/^true$/iu.test(trimmedValue)) {
    return true;
  }
  if (/^false$/iu.test(trimmedValue)) {
    return false;
  }
  const numberValue = parseFloat(stringValue);
  if (isNaN(numberValue)) {
    return defaultValue;
  }
  return !!numberValue;
}