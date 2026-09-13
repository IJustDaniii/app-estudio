import { Prisma } from "@prisma/client";

export function isSerializationConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
}

/** Retries only database serialization conflicts; all other errors remain visible. */
export async function withSerializableRetry<T>(operation: () => Promise<T>) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isSerializationConflict(error)) throw error;
    }
  }
  throw lastError;
}
