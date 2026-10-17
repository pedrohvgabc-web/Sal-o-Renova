import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function context(role: "admin" | "user" = "user"): TrpcContext {
  return {
    user: { id: 1, openId: "management-test", email: "test@example.com", name: "Teste", loginMethod: "test", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("painel Renova Gestão", () => {
  it("protege a agenda semanal para administradores", async () => {
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.management.week({ accessCode: "0000" as "2104", startDate: "2026-09-14", endDate: "2026-09-20" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("não permite cadastrar atendimento fora do horário do salão", async () => {
    const caller = appRouter.createCaller(context("admin"));
    await expect(caller.management.create({ accessCode: "2104", customerName: "Cliente Teste", whatsapp: "69999999999", reservationDate: "2026-09-20", startTime: "14:00", serviceId: "loiros" })).rejects.toThrow("não possui atendimento");
  });

  it("não permite cadastro manual fora do catálogo de horários", async () => {
    const caller = appRouter.createCaller(context("admin"));
    await expect(caller.management.create({ accessCode: "2104", customerName: "Cliente Teste", whatsapp: "69999999999", reservationDate: "2026-09-15", startTime: "10:00", serviceId: "cronograma" })).rejects.toThrow("não possui atendimento");
  });

  it("não permite bloquear domingo ou horários fechados", async () => {
    const caller = appRouter.createCaller(context("admin"));
    await expect(caller.management.block({ accessCode: "2104", blockDate: "2026-09-20", startTime: "14:00", reason: "Compromisso" })).rejects.toThrow("não está dentro do funcionamento");
  });

  it("permite que a senha da Bianca valide bloqueios próprios", async () => {
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.management.block({ accessCode: "0102", blockDate: "2026-09-20", startTime: "14:00", reason: "Compromisso" })).rejects.toThrow("não está dentro do funcionamento");
  });

  it("não permite que Bianca lance atendimento na agenda da Amanda", async () => {
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.management.create({ accessCode: "0102", customerName: "Cliente Teste", whatsapp: "69999999999", reservationDate: "2026-09-15", startTime: "14:00", serviceId: "loiros", professionalId: "amanda" })).rejects.toThrow("Acesso restrito à agenda da Bianca");
  });
});
