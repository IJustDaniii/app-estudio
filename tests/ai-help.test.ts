import { describe, expect, it } from "vitest";
import { providerMessages } from "@/lib/ai/chat";

describe("ayuda interna de Aula 1B", () => {
  it("documenta pantallas, limites y capacidades reales", () => {
    const system = providerMessages({ history: [], contextText: "", images: [] })[0].content;

    expect(system).toContain("/app/ai");
    expect(system).toContain("/app/materials");
    expect(system).toContain("8.000 caracteres");
    expect(system).toContain("20 segundos por solicitud");
    expect(system).toContain("puede preparar cambios que requieren confirmacion");
    expect(system).toContain("La IA puede consultar Internet");
    expect(system).toContain("No se pueden alterar XP");
  });
});
