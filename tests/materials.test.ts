import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { materialDuplicateWhere, materialOwnershipWhere } from "@/lib/materials/queries";
import { materialListArgs } from "@/lib/materials/listing";
import { topicMaterialsHref } from "@/lib/materials/links";
import { contentLengthExceedsMaterialBodyLimit, getMaterialRequestBodyLimit, limitMaterialRequestBody, MaterialBodyTooLargeError } from "@/lib/materials/body-limit";
import { resolveMaterialSubjectId } from "@/lib/materials/references";
import { materialResponseHeaders } from "@/lib/materials/preview";
import { appendMaterialFiles, resetMaterialUploadForm } from "@/lib/materials/upload";
import { deleteMaterialWithCompensation, isDuplicateInBatch, MaterialConsistencyError, putMaterialWithCompensation, sha256, validateMaterialBatch, validateMaterialContent } from "@/lib/materials/service";
import { DEFAULT_MAX_MATERIAL_BATCH_SIZE, DEFAULT_MAX_MATERIAL_FILES } from "@/lib/materials/constants";
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

describe("subida y validación de materiales", () => {
  it("rechaza cuerpos HTTP grandes antes de completar el parsing multipart", async () => {
    const request = new Request("http://localhost/api/materials", {
      method: "POST",
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([1, 2, 3]));
          controller.enqueue(new Uint8Array([4, 5, 6]));
          controller.close();
        },
      }),
      duplex: "half",
    } as RequestInit);
    expect(contentLengthExceedsMaterialBodyLimit("11", 10)).toBe(true);
    expect(contentLengthExceedsMaterialBodyLimit(null, 10)).toBe(false);
    expect(getMaterialRequestBodyLimit({ maxFiles: 20, maxBatchSize: 200 })).toBe(200 + 2 * 1024 * 1024);
    await expect(limitMaterialRequestBody(request, 4).arrayBuffer()).rejects.toMatchObject({ code: "MATERIAL_BODY_TOO_LARGE" });
    expect(new MaterialBodyTooLargeError().code).toBe("MATERIAL_BODY_TOO_LARGE");
  });

  it("usa la misma lista para selector y drag & drop sin duplicar FormData", () => {
    const first = new File(["%PDF-1.7"], "uno.pdf", { type: "application/pdf" });
    const second = new File(["%PDF-1.7"], "dos.pdf", { type: "application/pdf" });
    const data = new FormData();
    data.append("files", first);
    appendMaterialFiles(data, [first, second]);
    expect(data.getAll("files").map((file) => (file as File).name)).toEqual(["uno.pdf", "dos.pdf"]);
  });

  it("permite resetear el formulario después de completar la subida asíncrona", async () => {
    let resetCalls = 0;
    const form = { reset: () => { resetCalls += 1; } };
    const event = { currentTarget: form as typeof form | null };
    const capturedForm = event.currentTarget;
    await Promise.resolve();
    event.currentTarget = null;
    if (!capturedForm) throw new Error("No se capturó el formulario");
    resetMaterialUploadForm(capturedForm);
    expect(resetCalls).toBe(1);
  });

  it("aplica límites de archivos y tamaño total del lote", () => {
    expect(() => validateMaterialBatch(Array.from({ length: DEFAULT_MAX_MATERIAL_FILES + 1 }, () => ({ name: "a.pdf", size: 1, type: "application/pdf" })))).toThrow("TOO_MANY_FILES");
    expect(() => validateMaterialBatch([{ name: "a.pdf", size: DEFAULT_MAX_MATERIAL_BATCH_SIZE + 1, type: "application/pdf" }])).toThrow("BATCH_TOO_LARGE");
  });

  it("rechaza MIME/extensión o firma incompatibles y acepta una firma válida", () => {
    expect(() => validateMaterialContent({ name: "a.pdf", size: 7, type: "application/pdf" }, Buffer.from("not-pdf"))).toThrow("INVALID_FILE_CONTENT");
    expect(() => validateMaterialContent({ name: "a.pdf", size: 7, type: "image/png" }, Buffer.from("not-pdf"))).toThrow("INVALID_FILE_EXTENSION");
    expect(() => validateMaterialContent({ name: "a.png", size: 3, type: "image/png" }, Buffer.from([0, 1, 2]))).toThrow("INVALID_FILE_CONTENT");
    expect(() => validateMaterialContent({ name: "a.pdf", size: 8, type: "application/pdf" }, Buffer.from("%PDF-1.7"))).not.toThrow();
  });
});

describe("aislamiento de materiales", () => {
  it("abre los materiales del tema elegido y conserva el aislamiento por cuenta", () => {
    const args = materialListArgs({ userId: "user-a", topicId: "topic-1", sort: "date", page: 1 });

    expect(topicMaterialsHref("topic-1")).toBe("/app/materials?topicId=topic-1");
    expect(args.where).toEqual({ userId: "user-a", AND: [{ topicId: "topic-1" }] });
  });

  it("aplica filtros y ordenación antes de la ventana paginada", () => {
    const args = materialListArgs({ userId: "user-1", subjectId: "subject-1", filterSubjectId: "subject-1", query: "  álgebra  ".trim(), type: "EXAM", favorites: true, sort: "name", page: 3 });
    expect(args.where).toEqual({ userId: "user-1", AND: [{ subjectId: "subject-1" }, { subjectId: "subject-1" }, { name: { contains: "álgebra", mode: "insensitive" } }, { type: "EXAM" }, { isFavorite: true }] });
    expect(args.orderBy).toEqual([{ name: "asc" }, { id: "asc" }]);
    expect(args.skip).toBe(100);
    expect(args.take).toBe(51);
  });

  it("siempre incluye userId al buscar un material o un duplicado", () => {
    expect(materialOwnershipWhere("material-1", "user-1")).toEqual({ id: "material-1", userId: "user-1" });
    expect(materialDuplicateWhere("user-1", "a".repeat(64))).toEqual({ userId: "user-1", sha256: "a".repeat(64) });
  });

  it("identifica como duplicados los contenidos con el mismo hash", () => {
    expect(sha256(Buffer.from("apuntes"))).toBe(sha256(Buffer.from("apuntes")));
    expect(sha256(Buffer.from("apuntes"))).not.toBe(sha256(Buffer.from("otros apuntes")));
    const seen = new Set<string>();
    expect(isDuplicateInBatch("a", seen)).toBe(false);
    expect(isDuplicateInBatch("a", seen)).toBe(true);
  });

  it("rechaza referencias cruzadas y deriva una asignatura única", () => {
    expect(resolveMaterialSubjectId(null, ["subject-1", "subject-1"])).toBe("subject-1");
    expect(() => resolveMaterialSubjectId("subject-1", ["subject-2"])).toThrow("MATERIAL_SUBJECT_MISMATCH");
    expect(() => resolveMaterialSubjectId(null, ["subject-1", "subject-2"])).toThrow("MATERIAL_SUBJECT_MISMATCH");
  });
});

describe("consistencia y preview", () => {
  it("restaura el archivo si falla el borrado de metadatos", async () => {
    const files = new Map<string, Buffer<ArrayBuffer>>([["materials/u/f", Buffer.from("contenido") as Buffer<ArrayBuffer>]]);
    const storage = { exists: async (key: string) => files.has(key), get: async (key: string): Promise<Buffer<ArrayBuffer>> => files.get(key)!, delete: async (key: string) => { files.delete(key); }, put: async (key: string, value: Buffer) => { files.set(key, value as Buffer<ArrayBuffer>); } };
    await expect(deleteMaterialWithCompensation(storage, "materials/u/f", async () => { throw new Error("db"); })).rejects.toThrow("db");
    expect(files.has("materials/u/f")).toBe(true);
  });

  it("limpia el archivo si falla la creación de metadatos", async () => {
    const files = new Map<string, Buffer>();
    const storage = { put: async (key: string, value: Buffer) => { files.set(key, value); }, delete: async (key: string) => { files.delete(key); } };
    await expect(putMaterialWithCompensation(storage, "materials/u/f", Buffer.from("x"), async () => { throw new Error("db"); })).rejects.toThrow("db");
    expect(files.has("materials/u/f")).toBe(false);
  });

  it("mantiene headers privados y solo permite incrustar preview en el mismo origen", () => {
    const preview = materialResponseHeaders({ mimeType: "application/pdf", size: 8, originalName: "tema.pdf", preview: true });
    expect(preview.get("Cache-Control")).toBe("private, no-store");
    expect(preview.get("X-Content-Type-Options")).toBe("nosniff");
    expect(preview.get("X-Frame-Options")).toBe("SAMEORIGIN");
    expect(preview.get("Content-Security-Policy")).toContain("img-src 'self'");
    expect(preview.get("Content-Security-Policy")).toContain("object-src 'self'");
    expect(preview.get("Content-Disposition")).toContain("inline");
    const download = materialResponseHeaders({ mimeType: "application/pdf", size: 8, originalName: "tema.pdf", preview: false });
    expect(download.get("X-Frame-Options")).toBe("DENY");
    expect(download.get("Content-Disposition")).toContain("attachment");
  });

  it("informa si la compensación no puede restaurar o limpiar el archivo", async () => {
    const deleteFailingStorage = { put: async () => { throw new Error("restore"); }, delete: async () => undefined, exists: async () => true, get: async () => Buffer.from("contenido") };
    await expect(deleteMaterialWithCompensation(deleteFailingStorage, "materials/u/f", async () => { throw new Error("db"); })).rejects.toMatchObject({ code: "STORAGE_RESTORE_FAILED" });

    const cleanupFailingStorage = { put: async () => undefined, delete: async () => { throw new Error("cleanup"); } };
    await expect(putMaterialWithCompensation(cleanupFailingStorage, "materials/u/f", Buffer.from("x"), async () => { throw new Error("db"); })).rejects.toBeInstanceOf(MaterialConsistencyError);
  });
});
