import path from "node:path";
import { LocalStorageProvider } from "@/lib/materials/storage";

export function getPetStorageProvider() {
  return new LocalStorageProvider(process.env.PETS_STORAGE_DIR ?? path.join(process.cwd(), "storage", "pets"));
}
