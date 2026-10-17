import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createPublicContext(): TrpcContext {
  return { user: undefined, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("reservas do Renova", () => {
  it("rejeita dados incompletos antes de acessar o banco", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.reservations.create({
      customerName: "A", whatsapp: "123", reservationDate: "17/09/2026", startTimes: [], serviceId: "loiros", professionalId: "amanda", extras: [], amountCents: -1,
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejeita uma data fora do formato ISO", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.reservations.byDate({ date: "17-09-2026" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("mantém o contrato de atendimento com Amanda Vieira", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.reservations.create({
      customerName: "Amanda Cliente", whatsapp: "69999999999", reservationDate: "2026-09-17", startTimes: ["14:00"], serviceId: "loiros", professionalId: "any", extras: [], amountCents: 8500,
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("aceita somente Amanda ou Bianca como profissional", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.reservations.create({
      customerName: "Cliente Renova", whatsapp: "69999999999", reservationDate: "2026-09-17", startTimes: ["14:00"], serviceId: "loiros", professionalId: "carla" as "amanda", extras: [], amountCents: 8500,
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
