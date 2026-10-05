import { TransformFnParams } from 'class-transformer';

export function toOptionalBoolean({ value }: TransformFnParams) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.toLowerCase();

    if (normalized === 'true') {
      return true;
    }

    if (normalized === 'false') {
      return false;
    }

    return value;
  }

  return value;
}

export function toOptionalNumber({ value }: TransformFnParams) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  return Number(value);
}
