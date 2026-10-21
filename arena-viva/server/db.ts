import { and, asc, desc, eq, gte, lte, ne } from "drizzle-orm";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { InsertUser, blockedSlots, feedbacks, pushSubscriptions, releasedSlots, reservations, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _client: ReturnType<typeof postgres> | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && ENV.databaseUrl) {
    try {
      _client = postgres(ENV.databaseUrl, { max: 5, prepare: false, idle_timeout: 20 });
      _db = drizzle(_client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _client = null;
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) {
      const value = user[field] ?? null;
      values[field] = value;
      updateSet[field] = value;
    }
  }
  values.lastSignedIn = user.lastSignedIn ?? new Date();
  updateSet.lastSignedIn = values.lastSignedIn;
  if (user.role) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  await db.insert(users).values(values).onConflictDoUpdate({ target: users.openId, set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function savePushSubscription(input: { endpoint: string; p256dh: string; auth: string }) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.insert(pushSubscriptions).values(input).onConflictDoUpdate({
    target: pushSubscriptions.endpoint,
    set: { p256dh: input.p256dh, auth: input.auth, updatedAt: new Date() },
  });
}

export async function getPushSubscriptions() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pushSubscriptions);
}

export async function deletePushSubscription(endpoint: string) {
  const db = await getDb();
  if (!db) return;
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
}

export async function getReservationsForDate(reservationDate: string, professionalId?: string) {
  const db = await getDb();
  if (!db) return [];
  const filters = [eq(reservations.reservationDate, reservationDate), ne(reservations.status, "cancelled")];
  if (professionalId) filters.push(eq(reservations.professionalId, professionalId));
  return db.select().from(reservations).where(and(...filters)).orderBy(reservations.startTime);
}

export async function createReservation(input: { bookingCode: string; customerName: string; whatsapp: string; reservationDate: string; reservedHours: string; startTime: string; endTime: string; resources: string; professionalId: string; extras: string; amountCents: number; }) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.insert(reservations).values({ ...input, paymentStatus: "pending", status: "confirmed" });
  const created = await db.select().from(reservations).where(eq(reservations.bookingCode, input.bookingCode)).limit(1);
  return created[0];
}

export async function findConflictingReservations(reservationDate: string, startTimes: string[], professionalId = "amanda") {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(reservations).where(and(eq(reservations.reservationDate, reservationDate), eq(reservations.professionalId, professionalId), ne(reservations.status, "cancelled")));
  const counts = new Map<string, number>();
  rows.forEach(row => {
    try {
      (JSON.parse(row.reservedHours) as string[]).forEach(hour => counts.set(hour, (counts.get(hour) ?? 0) + 1));
    } catch {
      counts.set(row.startTime, (counts.get(row.startTime) ?? 0) + 1);
    }
  });
  return startTimes.filter(hour => (counts.get(hour) ?? 0) >= 2);
}

export async function cancelReservation(bookingCode: string, whatsapp: string) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  return db.update(reservations).set({ status: "cancelled" }).where(and(eq(reservations.bookingCode, bookingCode), eq(reservations.whatsapp, whatsapp), ne(reservations.status, "cancelled")));
}

export async function getReservationsByWhatsapp(whatsapp: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(reservations).where(eq(reservations.whatsapp, whatsapp)).orderBy(desc(reservations.reservationDate));
}

export async function getReservationsForRange(startDate: string, endDate: string, professionalId?: string) {
  const db = await getDb();
  if (!db) return [];
  const filters = [gte(reservations.reservationDate, startDate), lte(reservations.reservationDate, endDate)];
  if (professionalId) filters.push(eq(reservations.professionalId, professionalId));
  return db.select().from(reservations).where(and(...filters)).orderBy(asc(reservations.reservationDate), asc(reservations.startTime));
}

export async function createManualReservation(input: { bookingCode: string; customerName: string; whatsapp: string; reservationDate: string; reservedHours: string; startTime: string; endTime: string; resources: string; professionalId: string; extras: string; amountCents: number }) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.insert(reservations).values({ ...input, paymentStatus: "pending", status: "confirmed" });
  const created = await db.select().from(reservations).where(eq(reservations.bookingCode, input.bookingCode)).limit(1);
  return created[0];
}

export async function deleteReservationById(id: number, professionalId?: string) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const filters = [eq(reservations.id, id)];
  if (professionalId) filters.push(eq(reservations.professionalId, professionalId));
  await db.delete(reservations).where(and(...filters));
  return { success: true } as const;
}

export async function getBlockedSlotsForDate(blockDate: string, professionalId?: string) {
  const db = await getDb();
  if (!db) return [];
  const filters = [eq(blockedSlots.blockDate, blockDate)];
  if (professionalId) filters.push(eq(blockedSlots.professionalId, professionalId));
  return db.select().from(blockedSlots).where(and(...filters)).orderBy(asc(blockedSlots.startTime));
}

export async function getBlockedSlotsForRange(startDate: string, endDate: string, professionalId?: string) {
  const db = await getDb();
  if (!db) return [];
  const filters = [gte(blockedSlots.blockDate, startDate), lte(blockedSlots.blockDate, endDate)];
  if (professionalId) filters.push(eq(blockedSlots.professionalId, professionalId));
  return db.select().from(blockedSlots).where(and(...filters)).orderBy(asc(blockedSlots.blockDate), asc(blockedSlots.startTime));
}

export async function createBlockedSlot(input: { blockDate: string; startTime: string; professionalId: string; reason?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.insert(blockedSlots).values(input);
  const created = await db.select().from(blockedSlots).where(and(eq(blockedSlots.blockDate, input.blockDate), eq(blockedSlots.startTime, input.startTime), eq(blockedSlots.professionalId, input.professionalId))).orderBy(desc(blockedSlots.id)).limit(1);
  return created[0];
}

export async function deleteBlockedSlot(id: number, professionalId?: string) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const filters = [eq(blockedSlots.id, id)];
  if (professionalId) filters.push(eq(blockedSlots.professionalId, professionalId));
  await db.delete(blockedSlots).where(and(...filters));
  return { success: true } as const;
}

export async function getReleasedSlotsForDate(releaseDate: string, professionalId?: string) {
  const db = await getDb();
  if (!db) return [];
  try {
    const filters = [eq(releasedSlots.releaseDate, releaseDate)];
    if (professionalId) filters.push(eq(releasedSlots.professionalId, professionalId));
    return await db.select().from(releasedSlots).where(and(...filters)).orderBy(asc(releasedSlots.startTime));
  } catch {
    return [];
  }
}

export async function getReleasedSlotsForRange(startDate: string, endDate: string, professionalId?: string) {
  const db = await getDb();
  if (!db) return [];
  try {
    const filters = [gte(releasedSlots.releaseDate, startDate), lte(releasedSlots.releaseDate, endDate)];
    if (professionalId) filters.push(eq(releasedSlots.professionalId, professionalId));
    return await db.select().from(releasedSlots).where(and(...filters)).orderBy(asc(releasedSlots.releaseDate), asc(releasedSlots.startTime));
  } catch {
    return [];
  }
}

export async function createReleasedSlot(input: { releaseDate: string; startTime: string; professionalId: string }) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const existing = await db.select().from(releasedSlots).where(and(eq(releasedSlots.releaseDate, input.releaseDate), eq(releasedSlots.startTime, input.startTime), eq(releasedSlots.professionalId, input.professionalId))).limit(1);
  if (existing[0]) return existing[0];
  await db.insert(releasedSlots).values(input);
  const created = await db.select().from(releasedSlots).where(and(eq(releasedSlots.releaseDate, input.releaseDate), eq(releasedSlots.startTime, input.startTime), eq(releasedSlots.professionalId, input.professionalId))).orderBy(desc(releasedSlots.id)).limit(1);
  return created[0];
}

export async function deleteReleasedSlot(id: number, professionalId?: string) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const filters = [eq(releasedSlots.id, id)];
  if (professionalId) filters.push(eq(releasedSlots.professionalId, professionalId));
  await db.delete(releasedSlots).where(and(...filters));
  return { success: true } as const;
}

export async function createFeedback(input: { customerName: string; rating: number; message: string }) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.insert(feedbacks).values(input);
  return db.select().from(feedbacks).orderBy(desc(feedbacks.id)).limit(1).then(rows => rows[0]);
}

export async function getFeedbacks() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(feedbacks).orderBy(desc(feedbacks.createdAt));
}

export async function deleteFeedback(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.delete(feedbacks).where(eq(feedbacks.id, id));
  return { success: true } as const;
}
