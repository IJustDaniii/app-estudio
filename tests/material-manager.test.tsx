import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { MaterialManager } from "@/components/material-manager";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

const baseMaterial = {
  id: "material-1",
  name: "Imagen de prueba",
  originalName: "imagen.png",
  mimeType: "image/png",
  size: 8,
  type: "OTHER" as const,
  description: null,
  isFavorite: false,
  isCompletedExam: false,
  subjectId: null,
  topicId: null,
  taskId: null,
  bossId: null,
  uploadedAt: "2026-09-13T00:00:00.000Z",
  subject: null,
  topic: null,
  task: null,
  boss: null,
};

function renderMaterials(materials: typeof baseMaterial[]) {
  return renderToStaticMarkup(createElement(MaterialManager, { materials, subjects: [], topics: [], tasks: [], bosses: [] }));
}

describe("vista previa de materiales", () => {
  it("renderiza imágenes sin forzar una altura fija y prepara la ampliación", () => {
    const markup = renderMaterials([baseMaterial]);

    expect(markup).toContain('src="/api/materials/material-1?preview=1"');
    expect(markup).toContain('aria-label="Ampliar vista previa de Imagen de prueba"');
    expect(markup).toContain("max-h-[26rem]");
    expect(markup).not.toContain("h-80 w-full rounded-lg border bg-muted");
  });
});
