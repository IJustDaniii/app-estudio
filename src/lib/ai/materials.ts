import JSZip, { type JSZipObject } from "jszip";
import { PDFParse } from "pdf-parse";

export const MAX_AI_MATERIAL_BYTES = 10 * 1024 * 1024;
const MAX_OFFICE_XML_BYTES = 5 * 1024 * 1024;
const MAX_OFFICE_XML_FILES = 200;
const MAX_PDF_PAGES = 50;

type SizedZipObject = JSZipObject & { _data?: { compressedSize?: number; uncompressedSize?: number } };

function normalizeText(text: string, maxCharacters: number) {
  return text
    .replace(/\0/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim()
    .slice(0, Math.max(0, maxCharacters));
}

function decodeXml(text: string) {
  return text.replace(/&#(x?[0-9A-Fa-f]+);|&(amp|lt|gt|quot|apos);/g, (entity, numeric: string | undefined, named: string | undefined) => {
    if (numeric) {
      const value = numeric.startsWith("x") ? Number.parseInt(numeric.slice(1), 16) : Number.parseInt(numeric, 10);
      return Number.isSafeInteger(value) ? String.fromCodePoint(value) : "";
    }
    return named ? ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" } as Record<string, string>)[named] ?? entity : entity;
  });
}

function textFromOfficeXml(xml: string) {
  return decodeXml(xml
    .replace(/<w:tab\b[^>]*\/?\s*>/gi, "\t")
    .replace(/<w:br\b[^>]*\/?\s*>/gi, "\n")
    .replace(/<\/(?:w:p|a:p)>/gi, "\n")
    .replace(/<[^>]+>/g, ""));
}

function officeEntryNames(zip: JSZip, mimeType: string) {
  const matcher = mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ? /^word\/(?:document|footnotes|endnotes|header\d+|footer\d+)\.xml$/
    : /^ppt\/slides\/slide\d+\.xml$/;
  return Object.values(zip.files).filter((entry) => !entry.dir && matcher.test(entry.name)).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}

function validateOfficeEntries(entries: JSZipObject[]) {
  if (!entries.length || entries.length > MAX_OFFICE_XML_FILES) throw new Error("AI_MATERIAL_INVALID");
  let declaredBytes = 0;
  for (const entry of entries) {
    const data = (entry as SizedZipObject)._data;
    if (!Number.isSafeInteger(data?.uncompressedSize) || !Number.isSafeInteger(data?.compressedSize)) throw new Error("AI_MATERIAL_INVALID");
    declaredBytes += data!.uncompressedSize!;
    if (declaredBytes > MAX_OFFICE_XML_BYTES) throw new Error("AI_MATERIAL_TOO_LARGE");
    if (data!.uncompressedSize! > 100_000 && data!.uncompressedSize! > Math.max(1, data!.compressedSize!) * 100) throw new Error("AI_MATERIAL_INVALID");
  }
}

async function extractOfficeText(mimeType: string, content: Buffer, maxCharacters: number) {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(content, { checkCRC32: true, createFolders: false });
  } catch {
    throw new Error("AI_MATERIAL_INVALID");
  }
  const entries = officeEntryNames(zip, mimeType);
  validateOfficeEntries(entries);
  const parts: string[] = [];
  let remaining = maxCharacters;
  for (const entry of entries) {
    if (remaining <= 0) break;
    const part = textFromOfficeXml(await entry.async("string")).slice(0, remaining);
    parts.push(part);
    remaining -= part.length;
  }
  return normalizeText(parts.join("\n"), maxCharacters);
}

async function extractPdfText(content: Buffer, maxCharacters: number) {
  const parser = new PDFParse({
    data: new Uint8Array(content),
    stopAtErrors: true,
    isEvalSupported: false,
    disableFontFace: true,
    maxImageSize: 1_000_000,
  });
  try {
    const result = await parser.getText({ first: MAX_PDF_PAGES, parseHyperlinks: false, includeMarkedContent: false });
    return normalizeText(result.text, maxCharacters);
  } catch {
    throw new Error("AI_MATERIAL_INVALID");
  } finally {
    await parser.destroy();
  }
}

export async function extractMaterialText(mimeType: string, content: Buffer, maxCharacters: number) {
  if (content.length > MAX_AI_MATERIAL_BYTES) throw new Error("AI_MATERIAL_TOO_LARGE");
  if (!Number.isSafeInteger(maxCharacters) || maxCharacters < 1) return "";
  if (mimeType === "application/pdf") return extractPdfText(content, maxCharacters);
  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation") {
    return extractOfficeText(mimeType, content, maxCharacters);
  }
  throw new Error("AI_MATERIAL_UNSUPPORTED");
}
