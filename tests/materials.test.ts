import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { materialDuplicateWhere, materialOwnershipWhere } from "@/lib/materials/queries";
import { sha256 } from "@/lib/materials/service";
import { LocalStorageProvider } from "@/lib/materials/storage";

describe("almacenamiento local de materiales", () => {
  it("guarda y elimina un archivo usando una clave abstracta", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "aula-materials-"));
    const storage = new LocalStorageProvider(root);
    const key = "materials/user-1/file-1";

    await storage.put(key, Buffer.from("contenido"));
    await expect(readFile(path.join(root, "materials", "user-1", "file-1"), "utf8")).resolves.toBe("contenido");
    await storage.delete(key);
    await expect(storage.exists(key)).resolves.toBe(false);

    await rm(root, { recursive: true, force: true });
  });

  it("rechaza claves que intentan salir del almacenamiento", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "aula-materials-"));
    const storage = new LocalStorageProvider(root);
    await expect(storage.put("../outside", Buffer.from("x"))).rejects.toThrow();
    await rm(root, { recursive: true, force: true });
  });
});

describe("aislamiento de materiales", () => {
  it("siempre incluye userId al buscar un material o un duplicado", () => {
    expect(materialOwnershipWhere("material-1", "user-1")).toEqual({ id: "material-1", userId: "user-1" });
    expect(materialDuplicateWhere("user-1", "a".repeat(64))).toEqual({ userId: "user-1", sha256: "a".repeat(64) });
  });

  it("identifica como duplicados los contenidos con el mismo hash", () => {
    expect(sha256(Buffer.from("apuntes"))).toBe(sha256(Buffer.from("apuntes")));
    expect(sha256(Buffer.from("apuntes"))).not.toBe(sha256(Buffer.from("otros apuntes")));
  });
});
