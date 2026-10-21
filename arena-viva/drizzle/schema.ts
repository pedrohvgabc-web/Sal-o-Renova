import { integer, pgEnum, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "paid"]);
export const reservationStatusEnum = pgEnum("reservation_status", ["confirmed", "cancelled"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRoleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const reservations = pgTable("reservations", {
  id: serial("id").primaryKey(),
  bookingCode: varchar("bookingCode", { length: 32 }).notNull().unique(),
  customerName: varchar("customerName", { length: 120 }).notNull(),
  whatsapp: varchar("whatsapp", { length: 32 }).notNull(),
  reservationDate: varchar("reservationDate", { length: 10 }).notNull(),
  reservedHours: text("reservedHours").notNull(),
  startTime: varchar("startTime", { length: 5 }).notNull(),
  endTime: varchar("endTime", { length: 5 }).notNull(),
  resources: text("resources").notNull(),
  professionalId: varchar("professionalId", { length: 32 }).notNull().default("any"),
  extras: text("extras"),
  amountCents: integer("amountCents").notNull(),
  paymentStatus: paymentStatusEnum("paymentStatus").default("pending").notNull(),
  status: reservationStatusEnum("status").default("confirmed").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const blockedSlots = pgTable("blocked_slots", {
  id: serial("id").primaryKey(),
  blockDate: varchar("blockDate", { length: 10 }).notNull(),
  startTime: varchar("startTime", { length: 5 }).notNull(),
  professionalId: varchar("professionalId", { length: 32 }).notNull().default("amanda"),
  reason: varchar("reason", { length: 160 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const releasedSlots = pgTable("released_slots", {
  id: serial("id").primaryKey(),
  releaseDate: varchar("releaseDate", { length: 10 }).notNull(),
  startTime: varchar("startTime", { length: 5 }).notNull(),
  professionalId: varchar("professionalId", { length: 32 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  endpoint: varchar("endpoint", { length: 500 }).notNull().unique(),
  p256dh: varchar("p256dh", { length: 255 }).notNull(),
  auth: varchar("auth", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const feedbacks = pgTable("feedbacks", {
  id: serial("id").primaryKey(),
  customerName: varchar("customerName", { length: 120 }).notNull(),
  rating: integer("rating").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Reservation = typeof reservations.$inferSelect;
export type InsertReservation = typeof reservations.$inferInsert;
export type BlockedSlot = typeof blockedSlots.$inferSelect;
export type InsertBlockedSlot = typeof blockedSlots.$inferInsert;
export type ReleasedSlot = typeof releasedSlots.$inferSelect;
export type InsertReleasedSlot = typeof releasedSlots.$inferInsert;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = typeof pushSubscriptions.$inferInsert;
export type Feedback = typeof feedbacks.$inferSelect;
export type InsertFeedback = typeof feedbacks.$inferInsert;

export const serviceCatalog = [
  { id: "corte", category: "Cabelo", name: "Corte", duration: 60, priceCents: 5000, description: "Um corte pensado para acompanhar seu estilo." },
  { id: "cronograma-capilar", category: "Tratamentos", name: "Cronograma capilar", duration: 90, priceCents: 38700, description: "Hidratação, nutrição e reconstrução." },
  { id: "hidratacao-escova", category: "Tratamentos", name: "Hidratação + escova", duration: 90, priceCents: 7500, description: "Cuidado, maciez e finalização com condição promocional." },
  { id: "coloracao", category: "Coloração", name: "Coloração", duration: 150, priceCents: 12000, description: "Uma nova cor para valorizar sua beleza." },
  { id: "moreno-iluminado", category: "Cabelo", name: "Moreno iluminado", duration: 240, priceCents: 35000, description: "Luz e profundidade para um resultado natural." },
  { id: "loiro-iluminado", category: "Cabelo", name: "Loiro iluminado", duration: 240, priceCents: 42000, description: "Iluminação delicada e radiante." },
  { id: "argiloterapia-capilar", category: "Tratamentos", name: "Argiloterapia", duration: 60, priceCents: 12000, description: "Cuidado profundo para couro cabeludo e fios." },
  { id: "loiro", category: "Cabelo", name: "Loiro", duration: 240, priceCents: 45000, description: "Clareamento pensado para iluminar seu visual." },
  { id: "botox-capilar", category: "Tratamentos", name: "Botox capilar", duration: 150, priceCents: 0, description: "Tratamento disponível com Bianca." },
  { id: "selagem-organica", category: "Tratamentos", name: "Selagem orgânica", duration: 150, priceCents: 0, description: "Alinhamento, brilho e movimento." },
  { id: "escova", category: "Cabelo", name: "Escova", duration: 60, priceCents: 0, description: "Finalização disponível com Bianca." },
] as const;

export const professionals = [
  { id: "amanda", name: "Amanda Vieira", role: "Proprietária · atendimento personalizado" },
  { id: "bianca", name: "Bianca", role: "Atendimento personalizado" },
] as const;

export type ServiceId = (typeof serviceCatalog)[number]["id"];
export type ProfessionalId = (typeof professionals)[number]["id"];
