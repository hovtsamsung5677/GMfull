import { IsString, Matches, MaxLength } from "class-validator";

/**
 * Marks a property as a valid entity identifier. Accepts both Prisma CUIDs
 * (`c...`, 24 chars) and standard UUIDs (v1-v5) because the database uses
 * `@default(cuid())` while some consumers may send UUIDs.
 *
 * Usage:
 *   @IsIdentifier()
 *   floorId!: string;
 *
 *   @Nullable()
 *   @IsIdentifier()
 *   @IsOptional()
 *   floorId?: string | null;
 */
const CUID_OR_UUID = /^c[a-z0-9]{24}$/i;

export function IsIdentifier() {
  return function (target: object, propertyKey: string | symbol) {
    IsString()(target, propertyKey);
    Matches(CUID_OR_UUID, {
      message: "value must be a valid CUID or UUID identifier",
    })(target, propertyKey);
    MaxLength(128)(target, propertyKey);
  };
}
