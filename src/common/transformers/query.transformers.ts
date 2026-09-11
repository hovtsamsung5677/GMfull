import { TransformFnParams } from 'class-transformer';

export function toOptionalBoolean({ value }: TransformFnParams) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }

  return Boolean(value);
}

export function toOptionalNumber({ value }: TransformFnParams) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  return Number(value);
}
