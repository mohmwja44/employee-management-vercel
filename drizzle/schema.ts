import { serial, varchar, timestamp, integer, pgTable } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 50 }),
  role: varchar("role", { length: 20 }).default("user").notNull(), // "user" | "admin"
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  ibsId: varchar("ibsId", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  isAdmin: integer("isAdmin").default(0).notNull(), // 0 = user, 1 = admin
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const shifts = pgTable("shifts", {
  id: serial("id").primaryKey(),
  employeeId: integer("employeeId").notNull(),
  saturday: varchar("saturday", { length: 50 }).default("OFF").notNull(),
  sunday: varchar("sunday", { length: 50 }).default("OFF").notNull(),
  monday: varchar("monday", { length: 50 }).default("OFF").notNull(),
  tuesday: varchar("tuesday", { length: 50 }).default("OFF").notNull(),
  wednesday: varchar("wednesday", { length: 50 }).default("OFF").notNull(),
  thursday: varchar("thursday", { length: 50 }).default("OFF").notNull(),
  friday: varchar("friday", { length: 50 }).default("OFF").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const systemSettings = pgTable("systemSettings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 255 }).notNull().unique(),
  value: varchar("value", { length: 255 }).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
