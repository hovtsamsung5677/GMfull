export type AppConfiguration = {
  nodeEnv: string;
  port: number;
  databaseUrl: string;
  jwt: {
    secret: string;
    expiresIn: string;
    refreshExpiresIn: string;
  };
  corsOrigin: string;
};

export type AppConfigurationEnv = Record<string, unknown>;

export const APP_CONFIG_NAMESPACE = "app";

export function parseCorsOrigins(
  raw: string | undefined,
): string[] | undefined {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) {
    return undefined;
  }

  return trimmed
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

export function validate(env: AppConfigurationEnv): Record<string, unknown> {
  const errors: string[] = [];

  const nodeEnv = (env.NODE_ENV as string | undefined) ?? "development";
  const port = Number(env.PORT) || 3000;
  const corsOrigin = (env.CORS_ORIGIN as string | undefined) ?? "";
  const databaseUrl = env.DATABASE_URL as string | undefined;

  if (!databaseUrl) {
    errors.push("DATABASE_URL is required");
  }

  const jwtSecret = env.JWT_SECRET as string | undefined;
  if (!jwtSecret) {
    errors.push("JWT_SECRET is required (set a 32+ byte random value)");
  } else if (jwtSecret.length < 32) {
    errors.push(
      `JWT_SECRET must be at least 32 bytes long, got ${jwtSecret.length}`,
    );
  } else if (jwtSecret === "change-me-in-production") {
    errors.push("JWT_SECRET is using the default placeholder value");
  }

  if (nodeEnv === "production") {
    const trimmed = (corsOrigin ?? "").trim();
    if (!trimmed || trimmed === "*") {
      errors.push(
        "CORS_ORIGIN must be set to a comma-separated allow-list (no wildcard) in production",
      );
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Invalid application configuration:\n - ${errors.join("\n - ")}`,
    );
  }

  return {
    ...env,
    [APP_CONFIG_NAMESPACE]: {
      nodeEnv,
      port,
      databaseUrl: databaseUrl as string,
      jwt: {
        secret: jwtSecret as string,
        expiresIn: (env.JWT_EXPIRES_IN as string | undefined) ?? "15m",
        refreshExpiresIn:
          (env.JWT_REFRESH_EXPIRES_IN as string | undefined) ?? "7d",
      },
      corsOrigin,
    } satisfies AppConfiguration,
  };
}
