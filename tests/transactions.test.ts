import { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { withSerializableRetry } from "@/lib/domain/transactions";

function serializationConflict() {
  return new Prisma.PrismaClientKnownRequestError("serialization conflict", {
    code: "P2034",
    clientVersion: "6.12.0",
  });
}

describe("reintentos de transacciones seguras", () => {
  it("reintenta un choque de serializaciÃ³n y conserva el resultado", async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(serializationConflict())
      .mockRejectedValueOnce(serializationConflict())
      .mockResolvedValue("guardado");

    await expect(withSerializableRetry(operation)).resolves.toBe("guardado");
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it("no reintenta errores que no son choques de concurrencia", async () => {
    const failure = new Error("fallo permanente");
    const operation = vi.fn().mockRejectedValue(failure);

    await expect(withSerializableRetry(operation)).rejects.toBe(failure);
    expect(operation).toHaveBeenCalledTimes(1);
  });
});
