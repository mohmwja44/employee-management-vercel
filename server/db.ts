import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import * as schema from "../drizzle/schema";
import { users, employees, shifts, systemSettings, shiftArchives } from "../drizzle/schema";
import { TRPCError } from "@trpc/server";
import { ENV } from "./_core/env";

// Database connection
let dbUrl = ENV.databaseUrl || "";

// Add SSL parameters for TiDB Cloud
if (dbUrl && dbUrl.includes('tidbcloud.com')) {
  const separator = dbUrl.includes('?') ? '&' : '?';
  dbUrl = dbUrl + separator + 'ssl={"rejectUnauthorized":false}';
}

const connection = await mysql.createConnection(dbUrl);
export const db = drizzle(connection, { schema, mode: "default" });

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
    .onDuplicateKeyUpdate({
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
  const existing = await getEmployeeByIbsId(ibsId);
  if (!existing) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Employee not found" });
  }
  if (existing.name.toLowerCase() !== name.toLowerCase()) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Employee details do not match" });
  }
  
  await db.update(employees)
    .set({ updatedAt: new Date() })
    .where(eq(employees.ibsId, ibsId));
    
  return existing;
}

export async function addEmployee(ibsId: string, name: string) {
  const existing = await getEmployeeByIbsId(ibsId);
  if (existing) throw new TRPCError({ code: "CONFLICT", message: "Employee with this IBS ID already exists." });
  
  const result = await db.insert(employees).values({
    ibsId,
    name,
    isAdmin: 0,
  });
  
  // Get the last inserted ID from the result
  const insertedId = (result as any)[0]?.insertId || (result as any).insertId;
  return await getEmployeeById(insertedId);
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

// Archive functions
export async function archiveWeeklyShifts(weekStartDate: Date, adminId: string) {
  const existingArchive = await db.select()
    .from(shiftArchives)
    .where(eq(shiftArchives.weekStartDate, weekStartDate))
    .limit(1);
    
  if (existingArchive.length > 0) {
    throw new TRPCError({ code: "CONFLICT", message: "This week is already archived." });
  }
  
  const currentShifts = await getAllShifts();
  if (currentShifts.length === 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "No shifts to archive." });
  }
  
  const archivesToInsert = currentShifts.map(shift => ({
    employeeId: shift.employeeId,
    weekStartDate: weekStartDate,
    saturday: shift.saturday,
    sunday: shift.sunday,
    monday: shift.monday,
    tuesday: shift.tuesday,
    wednesday: shift.wednesday,
    thursday: shift.thursday,
    friday: shift.friday,
    archivedBy: adminId,
  }));
  
  await db.insert(shiftArchives).values(archivesToInsert);
  return { success: true, count: archivesToInsert.length };
}

export async function getArchivedShiftsByWeek(weekStartDate: Date) {
  return await db.select().from(shiftArchives).where(eq(shiftArchives.weekStartDate, weekStartDate));
}

export async function getArchivedShiftsByMonth(year: number, month: number) {
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);
  
  return await db.select()
    .from(shiftArchives)
    .where(and(
      gte(shiftArchives.weekStartDate, startDate),
      lte(shiftArchives.weekStartDate, endDate)
    ));
}

export async function getAllArchivedShifts() {
  return await db.select().from(shiftArchives);
}

export async function getArchivedShiftsWithEmployeeInfo() {
  const archives = await db.select().from(shiftArchives);
  const allEmployees = await getAllEmployees();
  
  return archives.map(archive => ({
    ...archive,
    employee: allEmployees.find(e => e.id === archive.employeeId)
  }));
}

// System settings
export async function isShiftsOpen() {
  const result = await db.select()
    .from(systemSettings)
    .where(eq(systemSettings.key, "shifts_open"))
    .limit(1);
  return result[0]?.value === "true";
}

export async function toggleShiftsOpen(isOpen: boolean) {
  await db.insert(systemSettings)
    .values({
      key: "shifts_open",
      value: isOpen ? "true" : "false",
    })
    .onDuplicateKeyUpdate({
      set: {
        value: isOpen ? "true" : "false",
        updatedAt: new Date(),
      }
    });
  return { isOpen };
}
