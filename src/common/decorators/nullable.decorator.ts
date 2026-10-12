import { Transform } from "class-transformer";

/**
 * Marks a property as nullable. The incoming `null` value is normalized to
 * `undefined` before validation runs, so downstream `@IsOptional()`,
 * `@IsString()`, `@IsNumber()` and `@IsObject()` decorators treat it exactly
 * like an omitted field. The service layer can still distinguish the two
 * cases by checking `dto.field === undefined`.
 *
 * Usage:
 *   @Nullable()
 *   @IsOptional()
 *   @IsString()
 *   field?: string | null;
 */
export function Nullable() {
  return Transform(({ value }) => (value === null ? undefined : value));
}
