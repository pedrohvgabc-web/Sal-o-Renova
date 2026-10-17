import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { cancelReservation, createBlockedSlot, createManualReservation, createReservation, deleteBlockedSlot, deleteReservationById, findConflictingReservations, getBlockedSlotsForDate, getBlockedSlotsForRange, getReservationsByWhatsapp, getReservationsForDate, getReservationsForRange, savePushSubscription } from "./db";
import { PUSH_PUBLIC_KEY, sendPushToAll } from "./push";

const serviceIds = ["selagem-organica", "coloracao", "argiloterapia-capilar", "coloracao-mechas", "loiro", "loiro-iluminado", "moreno-iluminado", "hidratacao-escova", "loiros", "moreno", "selagem", "argiloterapia", "cronograma"] as const;
const serviceNames: Record<string, string> = { "selagem-organica": "Selagem Orgânica", coloracao: "Coloração", "argiloterapia-capilar": "Argiloterapia Capilar", "coloracao-mechas": "Coloração + Mechas", loiro: "Loiro", "loiro-iluminado": "Loiro Iluminado", "moreno-iluminado": "Moreno iluminado", "hidratacao-escova": "Hidratação e escova" };
const managementCodes = ["2104", "0102"] as const;
const managementCode = z.enum(managementCodes);
const professionalForCode = (code: (typeof managementCodes)[number]) => code === "0102" ? "bianca" : "amanda";
const reservationInput = z.object({
  customerName: z.string().trim().min(2).max(120),
  whatsapp: z.string().trim().min(8).max(32),
  reservationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTimes: z.array(z.string().regex(/^([0-1]\d|2[0-3]):(00|30)$/)).min(1).max(16),
  serviceId: z.enum(serviceIds),
  professionalId: z.enum(["amanda", "bianca"]),
  extras: z.array(z.enum(["treatment", "nailart"])).default([]),
  amountCents: z.number().int().min(0),
});
const managementInput = z.object({
  accessCode: managementCode,
  customerName: z.string().trim().min(2).max(120),
  whatsapp: z.string().trim().min(8).max(32),
  reservationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^([0-1]\d|2[0-3]):(00|30)$/),
  serviceId: z.enum(serviceIds),
  professionalId: z.enum(["amanda", "bianca"]).default("amanda"),
});
const allowedHoursForDate = (dateValue: string) => {
  const day = new Date(`${dateValue}T12:00:00`).getDay();
  return day === 6 ? ["08:30", "09:30", "10:30", "11:30", "12:30", "13:30", "14:30", "15:30", "16:30", "17:30", "18:30"] : day >= 1 && day <= 5 ? ["14:00", "15:00", "16:00", "17:00", "18:00"] : [];
};

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => { const cookieOptions = getSessionCookieOptions(ctx.req); ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 }); return { success: true } as const; }),
  }),
  reservations: router({
    byDate: publicProcedure.input(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), professionalId: z.enum(["amanda", "bianca"]).default("amanda") })).query(({ input }) => getReservationsForDate(input.date, input.professionalId)),
    mine: publicProcedure.input(z.object({ whatsapp: z.string().trim().min(8).max(32) })).query(({ input }) => getReservationsByWhatsapp(input.whatsapp)),
    create: publicProcedure.input(reservationInput).mutation(async ({ input }) => {
      if (input.startTimes.some(time => !allowedHoursForDate(input.reservationDate).includes(time))) throw new Error("Esse dia não possui atendimento nesse horário.");
      const blocked = await getBlockedSlotsForDate(input.reservationDate, input.professionalId);
      if (input.startTimes.some(time => blocked.some(item => item.startTime === time))) throw new Error("Um dos horários escolhidos foi bloqueado pela gestão. Atualize a agenda e escolha outro.");
      const conflicts = await findConflictingReservations(input.reservationDate, input.startTimes, input.professionalId);
      if (conflicts.length > 0) throw new Error("Esse horário já foi escolhido. Atualize a agenda e selecione outra opção.");
      const bookingCode = `RN-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      const [h, m] = input.startTimes[input.startTimes.length - 1].split(":").map(Number);
      const end = h * 60 + m + 60;
      const created = await createReservation({ bookingCode, customerName: input.customerName, whatsapp: input.whatsapp, reservationDate: input.reservationDate, reservedHours: JSON.stringify(input.startTimes), startTime: input.startTimes[0], endTime: `${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`, resources: JSON.stringify([input.serviceId]), professionalId: input.professionalId, extras: JSON.stringify(input.extras), amountCents: input.amountCents });
      void sendPushToAll({ title: "Novo agendamento · Renova", body: `${input.customerName} agendou ${serviceNames[input.serviceId] ?? input.serviceId} para ${input.reservationDate} às ${input.startTimes.join(", ")} com ${input.professionalId === "amanda" ? "Amanda Vieira" : "Bianca"}.`, url: "/" });
      return { bookingCode, reservation: created };
    }),
    cancel: publicProcedure.input(z.object({ bookingCode: z.string().min(4), whatsapp: z.string().trim().min(8).max(32) })).mutation(async ({ input }) => { await cancelReservation(input.bookingCode, input.whatsapp); return { success: true } as const; }),
  }),
  availability: router({
    blockedByDate: publicProcedure.input(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), professionalId: z.enum(["amanda", "bianca"]).default("amanda") })).query(({ input }) => getBlockedSlotsForDate(input.date, input.professionalId)),
  }),
  push: router({
    publicKey: publicProcedure.query(() => ({ publicKey: PUSH_PUBLIC_KEY })),
    subscribe: publicProcedure.input(z.object({ endpoint: z.string().url().max(500), keys: z.object({ p256dh: z.string().min(16).max(255), auth: z.string().min(8).max(255) }) })).mutation(async ({ input }) => { await savePushSubscription({ endpoint: input.endpoint, p256dh: input.keys.p256dh, auth: input.keys.auth }); return { success: true } as const; }),
  }),
  management: router({
    week: publicProcedure.input(z.object({ accessCode: managementCode, startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) })).query(({ input }) => getReservationsForRange(input.startDate, input.endDate, input.accessCode === "2104" ? undefined : "bianca")),
    blocked: publicProcedure.input(z.object({ accessCode: managementCode, startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) })).query(({ input }) => getBlockedSlotsForRange(input.startDate, input.endDate, input.accessCode === "0102" ? "bianca" : "amanda")),
    create: publicProcedure.input(managementInput).mutation(async ({ input }) => {
      if (!allowedHoursForDate(input.reservationDate).includes(input.startTime)) throw new Error("Esse dia não possui atendimento nesse horário.");
      const professionalId = professionalForCode(input.accessCode);
      if (input.professionalId !== professionalId && input.accessCode === "0102") throw new Error("Acesso restrito à agenda da Bianca.");
      const conflicts = await findConflictingReservations(input.reservationDate, [input.startTime], input.professionalId);
      if (conflicts.length > 0) throw new Error("Esse horário já está lotado para duas clientes.");
      const [h, m] = input.startTime.split(":").map(Number);
      const end = h * 60 + m + 60;
      const bookingCode = `RN-M-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      return createManualReservation({ bookingCode, customerName: input.customerName, whatsapp: input.whatsapp, reservationDate: input.reservationDate, reservedHours: JSON.stringify([input.startTime]), startTime: input.startTime, endTime: `${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`, resources: JSON.stringify([input.serviceId]), professionalId: input.professionalId, extras: "[]", amountCents: 0 });
    }),
    delete: publicProcedure.input(z.object({ accessCode: managementCode, id: z.number().int().positive() })).mutation(({ input }) => deleteReservationById(input.id, input.accessCode === "0102" ? "bianca" : undefined)),
    block: publicProcedure.input(z.object({ accessCode: managementCode, blockDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), startTime: z.string().regex(/^([0-1]\d|2[0-3]):(00|30)$/), reason: z.string().trim().max(160).optional() })).mutation(async ({ input }) => { if (!allowedHoursForDate(input.blockDate).includes(input.startTime)) throw new Error("Esse horário não está dentro do funcionamento do salão."); return createBlockedSlot({ blockDate: input.blockDate, startTime: input.startTime, professionalId: professionalForCode(input.accessCode), reason: input.reason }); }),
    unblock: publicProcedure.input(z.object({ accessCode: managementCode, id: z.number().int().positive() })).mutation(({ input }) => deleteBlockedSlot(input.id, professionalForCode(input.accessCode))),
  }),
});

export type AppRouter = typeof appRouter;
