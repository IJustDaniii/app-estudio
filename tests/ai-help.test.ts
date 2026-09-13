import { describe, expect, it } from "vitest";
import { providerMessages } from "@/lib/ai/chat";

describe("ayuda interna de Aula 1B", () => {
  it("documenta pantallas, funciones, límites y acceso sin inventar capacidades", () => {
    const system = providerMessages({ history: [], contextText: "", images: [] })[0].content;

    expect(system).toContain("/app/ai");
    expect(system).toContain("/app/materials");
    expect(system).toContain("8.000 caracteres");
    expect(system).toContain("20 segundos por solicitud");
    expect(system).toContain("No puede crear, editar ni borrar");
    expect(system).toContain("No tiene acceso web, navegador ni internet");
  });
});
