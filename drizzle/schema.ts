import { int, varchar, timestamp, mysqlTable } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  openId: varchar("openId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 50 }),
  role: varchar("role", { length: 20 }).default("user").notNull(), // "user" | "admin"
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const employees = mysqlTable("employees", {
  id: int("id").primaryKey().autoincrement(),
  ibsId: varchar("ibsId", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  isAdmin: int("isAdmin").default(0).notNull(), // 0 = user, 1 = admin
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = typeof employees.$inferInsert;

export const shifts = mysqlTable("shifts", {
  id: int("id").primaryKey().autoincrement(),
  employeeId: int("employeeId").notNull(),
  saturday: varchar("saturday", { length: 50 }).default("OFF").notNull(),
  sunday: varchar("sunday", { length: 50 }).default("OFF").notNull(),
  monday: varchar("monday", { length: 50 }).default("OFF").notNull(),
  tuesday: varchar("tuesday", { length: 50 }).default("OFF").notNull(),
  wednesday: varchar("wednesday", { length: 50 }).default("OFF").notNull(),
  thursday: varchar("thursday", { length: 50 }).default("OFF").notNull(),
  friday: varchar("friday", { length: 50 }).default("OFF").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Shift = typeof shifts.$inferSelect;
export type InsertShift = typeof shifts.$inferInsert;

export const shiftArchives = mysqlTable("shiftArchives", {
  id: int("id").primaryKey().autoincrement(),
  employeeId: int("employeeId").notNull(),
  weekStartDate: timestamp("weekStartDate").notNull(), // Start of the week
  saturday: varchar("saturday", { length: 50 }).default("OFF").notNull(),
  sunday: varchar("sunday", { length: 50 }).default("OFF").notNull(),
  monday: varchar("monday", { length: 50 }).default("OFF").notNull(),
  tuesday: varchar("tuesday", { length: 50 }).default("OFF").notNull(),
  wednesday: varchar("wednesday", { length: 50 }).default("OFF").notNull(),
  thursday: varchar("thursday", { length: 50 }).default("OFF").notNull(),
  friday: varchar("friday", { length: 50 }).default("OFF").notNull(),
  archivedAt: timestamp("archivedAt").defaultNow().notNull(),
  archivedBy: varchar("archivedBy", { length: 255 }), // ID of admin who archived
});

export type ShiftArchive = typeof shiftArchives.$inferSelect;
export type InsertShiftArchive = typeof shiftArchives.$inferInsert;

export const systemSettings = mysqlTable("systemSettings", {
  id: int("id").primaryKey().autoincrement(),
  key: varchar("key", { length: 255 }).notNull().unique(),
  value: varchar("value", { length: 255 }).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = typeof systemSettings.$inferInsert;
