import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { extractMaterialText, MAX_AI_MATERIAL_BYTES } from "@/lib/ai/materials";

function simplePdf(text: string) {
  const stream = `BT /F1 18 Tf 50 100 Td (${text}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let body = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(body));
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(body);
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  body += offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(body);
}

describe("extractMaterialText", () => {
  it("extracts bounded text from a PDF", async () => {
    const text = await extractMaterialText("application/pdf", simplePdf("Hola PDF"), 2_000);
    expect(text).toContain("Hola PDF");
  });

  it("extracts raw text from a DOCX container", async () => {
    const zip = new JSZip();
    zip.file("word/document.xml", '<?xml version="1.0"?><w:document xmlns:w="x"><w:body><w:p><w:r><w:t>Primera línea</w:t></w:r></w:p><w:p><w:r><w:t>Segunda &amp; última</w:t></w:r></w:p></w:body></w:document>');
    const file = await zip.generateAsync({ type: "nodebuffer" });

    await expect(extractMaterialText("application/vnd.openxmlformats-officedocument.wordprocessingml.document", file, 2_000)).resolves.toContain("Primera línea\nSegunda & última");
  });

  it("rejects oversized and unsupported documents", async () => {
    await expect(extractMaterialText("application/pdf", Buffer.alloc(MAX_AI_MATERIAL_BYTES + 1), 2_000)).rejects.toThrow("AI_MATERIAL_TOO_LARGE");
    await expect(extractMaterialText("application/msword", Buffer.from("legacy"), 2_000)).rejects.toThrow("AI_MATERIAL_UNSUPPORTED");
  });
});
