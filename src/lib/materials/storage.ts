import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

export interface StorageProvider {
  put(key: string, content: Buffer): Promise<void>;
  get(key: string, signal?: AbortSignal): Promise<Buffer>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

export class LocalStorageProvider implements StorageProvider {
  constructor(private readonly rootDirectory: string) {}

  private resolve(key: string) {
    if (!/^[a-zA-Z0-9/_-]+$/.test(key)) throw new Error("INVALID_STORAGE_KEY");
    const root = path.resolve(this.rootDirectory);
    const target = path.resolve(root, key);
    if (!target.startsWith(`${root}${path.sep}`)) throw new Error("INVALID_STORAGE_KEY");
    return target;
  }

  async put(key: string, content: Buffer) {
    const target = this.resolve(key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content, { flag: "wx" });
  }

  async get(key: string, signal?: AbortSignal) {
    return readFile(this.resolve(key), { signal });
  }

  async delete(key: string) {
    await rm(this.resolve(key), { force: true });
  }

  async exists(key: string) {
    try {
      await stat(this.resolve(key));
      return true;
    } catch {
      return false;
    }
  }
}

export function getStorageProvider(): StorageProvider {
  // R2 can implement this same contract without leaking provider paths into PostgreSQL.
  return new LocalStorageProvider(process.env.MATERIALS_STORAGE_DIR ?? path.join(process.cwd(), "storage", "materials"));
}
