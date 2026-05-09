import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import * as schema from "../drizzle/schema.js";
import { users, employees, shifts, systemSettings } from "../drizzle/schema.js";
import { TRPCError } from "@trpc/server";
import { ENV } from "./_core/env";

if (!ENV.databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const sql_client = neon(ENV.databaseUrl);
export const db = drizzle(sql_client, { schema });

// Function to initialize tables if they don't exist
async function initTables() {
  console.log("Checking and initializing database tables (PostgreSQL)...");
  try {
    await sql_client`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        "openId" VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255),
        email VARCHAR(255),
        "loginMethod" VARCHAR(50),
        role VARCHAR(20) DEFAULT 'user' NOT NULL,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "lastSignedIn" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `;
    
    await sql_client`
      CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        "ibsId" VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        "isAdmin" INTEGER DEFAULT 0 NOT NULL,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `;

    await sql_client`
      CREATE TABLE IF NOT EXISTS shifts (
        id SERIAL PRIMARY KEY,
        "employeeId" INTEGER NOT NULL,
        saturday VARCHAR(50) DEFAULT 'OFF' NOT NULL,
        sunday VARCHAR(50) DEFAULT 'OFF' NOT NULL,
        monday VARCHAR(50) DEFAULT 'OFF' NOT NULL,
        tuesday VARCHAR(50) DEFAULT 'OFF' NOT NULL,
        wednesday VARCHAR(50) DEFAULT 'OFF' NOT NULL,
        thursday VARCHAR(50) DEFAULT 'OFF' NOT NULL,
        friday VARCHAR(50) DEFAULT 'OFF' NOT NULL,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `;

    await sql_client`
      CREATE TABLE IF NOT EXISTS "systemSettings" (
        id SERIAL PRIMARY KEY,
        key VARCHAR(255) NOT NULL UNIQUE,
        value VARCHAR(255) NOT NULL,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `;

    console.log("Database tables checked/created successfully.");
  } catch (error) {
    console.error("Error initializing tables:", error);
  }
}

// Run initialization
initTables().catch(console.error);

export async function getDb() {
  return db;
}

// User functions
export async function upsertUser(user: any) {
  const isAdmin = user.openId === "000000" && user.name === "Mohamed Hany";
  const role = isAdmin ? 'admin' : 'user';
  
  await db.insert(users)
    .values({
      openId: user.openId,
      name: user.name,
      email: user.email,
      loginMethod: user.loginMethod,
      role: role,
      lastSignedIn: new Date(),
    })
    .onConflictDoUpdate({
      target: users.openId,
      set: {
        name: user.name,
        email: user.email,
        loginMethod: user.loginMethod,
        role: role,
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      }
    });
}

export async function getUserByOpenId(openId: string) {
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

// Employee functions
export async function getEmployeeByIbsId(ibsId: string) {
  const result = await db.select().from(employees).where(eq(employees.ibsId, ibsId)).limit(1);
  return result[0];
}

export async function getEmployeeById(id: number) {
  const result = await db.select().from(employees).where(eq(employees.id, id)).limit(1);
  return result[0];
}

export async function getAllEmployees() {
  return await db.select().from(employees);
}

export async function createOrUpdateEmployee(ibsId: string, name: string) {
  try {
    const existing = await getEmployeeByIbsId(ibsId);
    
    // Auto-create admin if it's the special IBS ID 000000
    if (!existing && ibsId === "000000") {
      console.log("Bootstrap: Creating default admin Mohamed Hany");
      await db.insert(employees).values({
        ibsId: "000000",
        name: "Mohamed Hany",
        isAdmin: 1
      });
      return await getEmployeeByIbsId("000000");
    }

    if (!existing) {
      throw new TRPCError({ code: "NOT_FOUND", message: `Employee with IBS ID ${ibsId} not found. Please contact admin.` });
    }
    
    // Skip name check for the first admin login to ensure bootstrap success
    if (ibsId !== "000000" && existing.name.toLowerCase() !== name.toLowerCase()) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Employee name does not match our records." });
    }
    
    await db.update(employees)
      .set({ updatedAt: new Date() })
      .where(eq(employees.ibsId, ibsId));
      
    return existing;
  } catch (error) {
    console.error("Database error in createOrUpdateEmployee:", error);
    if (error instanceof TRPCError) throw error;
    throw new TRPCError({ 
      code: "INTERNAL_SERVER_ERROR", 
      message: "Database connection failed. Please check your Neon DATABASE_URL." 
    });
  }
}

export async function addEmployee(ibsId: string, name: string) {
  const existing = await getEmployeeByIbsId(ibsId);
  if (existing) throw new TRPCError({ code: "CONFLICT", message: "Employee with this IBS ID already exists." });
  
  const result = await db.insert(employees).values({
    ibsId,
    name,
    isAdmin: 0,
  }).returning();
  
  return result[0];
}

export async function deleteEmployee(id: number) {
  const employee = await getEmployeeById(id);
  if (!employee) throw new TRPCError({ code: "NOT_FOUND", message: "Employee not found." });
  
  await db.delete(shifts).where(eq(shifts.employeeId, id));
  await db.delete(employees).where(eq(employees.id, id));
  
  return employee;
}

// Shift functions
export async function getShiftByEmployeeId(employeeId: number) {
  const result = await db.select().from(shifts).where(eq(shifts.employeeId, employeeId)).limit(1);
  return result[0];
}

export async function getAllShifts() {
  return await db.select().from(shifts);
}

export async function createOrUpdateShift(employeeId: number, shiftData: any) {
  const existing = await getShiftByEmployeeId(employeeId);
  if (existing) {
    await db.update(shifts)
      .set({ ...shiftData, updatedAt: new Date() })
      .where(eq(shifts.employeeId, employeeId));
    return await getShiftByEmployeeId(employeeId);
  } else {
    await db.insert(shifts).values({
      employeeId,
      ...shiftData,
    });
    return await getShiftByEmployeeId(employeeId);
  }
}

export async function getEmployeeWithShift(employeeId: number) {
  const employee = await getEmployeeById(employeeId);
  const shift = await getShiftByEmployeeId(employeeId);
  return { employee, shift };
}

export async function getAllEmployeesWithShifts() {
  const allEmployees = await getAllEmployees();
  const allShifts = await getAllShifts();
  
  return allEmployees.map(emp => ({
    employee: emp,
    shift: allShifts.find(s => s.employeeId === emp.id),
  }));
}

export async function resetAllShifts() {
  await db.update(shifts).set({
    saturday: "OFF",
    sunday: "OFF",
    monday: "OFF",
    tuesday: "OFF",
    wednesday: "OFF",
    thursday: "OFF",
    friday: "OFF",
    updatedAt: new Date(),
  });
  return { success: true };
}

// System settings
export async function isShiftsOpen() {
  try {
    const result = await db.select()
      .from(systemSettings)
      .where(eq(systemSettings.key, "shifts_open"))
      .limit(1);
    return result[0]?.value === "true";
  } catch (e) {
    return true; // Default to true if table doesn't exist yet
  }
}

export async function toggleShiftsOpen(isOpen: boolean) {
  await db.insert(systemSettings)
    .values({
      key: "shifts_open",
      value: isOpen ? "true" : "false",
    })
    .onConflictDoUpdate({
      target: systemSettings.key,
      set: {
        value: isOpen ? "true" : "false",
        updatedAt: new Date(),
      }
    });
  return { isOpen };
}
