import { Prisma } from "@prisma/client";
import { PrismaService } from "./prisma.service";

const MAX_SERIALIZABLE_ATTEMPTS = 3;

export async function runSerializableTransaction<T>(
  prisma: PrismaService,
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 1; attempt <= MAX_SERIALIZABLE_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      const isSerializationConflict =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034";

      if (!isSerializationConflict || attempt === MAX_SERIALIZABLE_ATTEMPTS) {
        throw error;
      }
    }
  }

  throw new Error("Serializable transaction retry limit exhausted");
}
