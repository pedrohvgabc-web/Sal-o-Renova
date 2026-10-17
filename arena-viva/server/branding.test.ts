import { describe, expect, it } from "vitest";

describe("branding do Renova", () => {
  it("mantém título e logo configurados no ambiente", () => {
    expect(process.env.VITE_APP_TITLE).toBe("Renova — Salão de Beleza");
    expect(process.env.VITE_APP_LOGO).toBe("/manus-storage/renova-favicon-source_54f0a92b.png");
  });
});
