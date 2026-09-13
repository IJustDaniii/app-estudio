import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { SubjectIcon } from "@/components/subject-icon";

describe("interfaz del nucleo academico", () => {
  it("renderiza un icono del catalogo sin insertar texto como marcado", () => {
    const markup = renderToStaticMarkup(createElement(SubjectIcon, { icon: "calculator", label: "Matemáticas" }));
    expect(markup).toContain("aria-label=\"Matemáticas\"");
    expect(markup).toContain("<svg");
    expect(markup).not.toContain("<script");
  });

  it("muestra la confirmacion antes de enviar un borrado", () => {
    const markup = renderToStaticMarkup(createElement(ConfirmSubmit, { message: "¿Borrar?" }, "Borrar"));
    expect(markup).toContain("Borrar");
    expect(markup).toContain("type=\"submit\"");
  });
});
