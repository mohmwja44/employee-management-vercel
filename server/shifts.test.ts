import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("Shift Management System", () => {
  describe("employees.login", () => {
    it("logs in existing employee with correct IBS ID and name", async () => {
      const ctx = createContext();
      const caller = appRouter.createCaller(ctx);

      const employee = await caller.employees.login({
        ibsId: "392848",
        name: "Akram Mostafa",
      });

      expect(employee).toBeDefined();
      expect(employee.ibsId).toBe("392848");
      expect(employee.name).toBe("Akram Mostafa");
      expect(employee.isAdmin).toBe(0);
    });

    it("rejects login with non-existent IBS ID", async () => {
      const ctx = createContext();
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.employees.login({
          ibsId: "999999",
          name: "Unknown User",
        });
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.message).toContain("Employee not found");
      }
    });

    it("rejects login with incorrect name", async () => {
      const ctx = createContext();
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.employees.login({
          ibsId: "392848",
          name: "Wrong Name",
        });
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.message).toContain("do not match");
      }
    });

    it("returns existing employee on second login", async () => {
      const ctx = createContext();
      const caller = appRouter.createCaller(ctx);

      // First login
      const employee1 = await caller.employees.login({
        ibsId: "392848",
        name: "Akram Mostafa",
      });

      // Second login with same credentials
      const employee2 = await caller.employees.login({
        ibsId: "392848",
        name: "Akram Mostafa",
      });

      expect(employee1.id).toBe(employee2.id);
    });
  });

  describe("shifts.submit", () => {
    it("creates a new shift record for an employee", async () => {
      const ctx = createContext();
      const caller = appRouter.createCaller(ctx);

      // Login existing employee
      const employee = await caller.employees.login({
        ibsId: "392848",
        name: "Akram Mostafa",
      });

      // Submit shifts
      const shift = await caller.shifts.submit({
        employeeId: employee.id,
        saturday: "Late",
        sunday: "Opening",
        monday: "Mid",
        tuesday: "OFF",
        wednesday: "Late",
        thursday: "Opening",
        friday: "OFF",
      });

      expect(shift).toBeDefined();
      expect(shift.employeeId).toBe(employee.id);
      expect(shift.saturday).toBe("Late");
      expect(shift.sunday).toBe("Opening");
      expect(shift.monday).toBe("Mid");
      expect(shift.tuesday).toBe("OFF");
    });

    it("updates existing shift record", async () => {
      const ctx = createContext();
      const caller = appRouter.createCaller(ctx);

      // Login existing employee
      const employee = await caller.employees.login({
        ibsId: "407280",
        name: "M.Ehab Nilo",
      });

      // Submit initial shifts
      await caller.shifts.submit({
        employeeId: employee.id,
        saturday: "Late",
        sunday: "Late",
        monday: "Late",
        tuesday: "Late",
        wednesday: "Late",
        thursday: "Late",
        friday: "Late",
      });

      // Update shifts
      const updatedShift = await caller.shifts.submit({
        employeeId: employee.id,
        saturday: "Opening",
        sunday: "Opening",
        monday: "Opening",
        tuesday: "Opening",
        wednesday: "Opening",
        thursday: "Opening",
        friday: "Opening",
      });

      expect(updatedShift.saturday).toBe("Opening");
      expect(updatedShift.sunday).toBe("Opening");
    });
  });

  describe("shifts.getCurrent", () => {
    it("retrieves current shift for an employee", async () => {
      const ctx = createContext();
      const caller = appRouter.createCaller(ctx);

      // Login and submit shifts
      const employee = await caller.employees.login({
        ibsId: "410029",
        name: "Ziad Ahmed",
      });

      await caller.shifts.submit({
        employeeId: employee.id,
        saturday: "Mid",
        sunday: "Mid",
        monday: "Mid",
        tuesday: "Mid",
        wednesday: "Mid",
        thursday: "Mid",
        friday: "Mid",
      });

      // Get current shift
      const shift = await caller.shifts.getCurrent({
        employeeId: employee.id,
      });

      expect(shift).toBeDefined();
      expect(shift?.saturday).toBe("Mid");
    });

    it("returns undefined if no shift exists", async () => {
      const ctx = createContext();
      const caller = appRouter.createCaller(ctx);

      // Get a non-existent employee ID
      const nonExistentEmployeeId = 99999;

      // Get current shift (should be undefined)
      const shift = await caller.shifts.getCurrent({
        employeeId: nonExistentEmployeeId,
      });

      expect(shift).toBeUndefined();
    });
  });

  describe("shifts.getAll", () => {
    it("retrieves all employees with their shifts", async () => {
      const ctx = createContext();
      const caller = appRouter.createCaller(ctx);

      const allShifts = await caller.shifts.getAll();

      expect(Array.isArray(allShifts)).toBe(true);
      expect(allShifts.length).toBeGreaterThan(0);
      
      // Check structure
      const firstEntry = allShifts[0];
      expect(firstEntry).toHaveProperty("employee");
      expect(firstEntry).toHaveProperty("shift");
      expect(firstEntry.employee).toHaveProperty("ibsId");
      expect(firstEntry.employee).toHaveProperty("name");
    });
  });

  describe("employees.list", () => {
    it("retrieves all employees", async () => {
      const ctx = createContext();
      const caller = appRouter.createCaller(ctx);

      const employees = await caller.employees.list();

      expect(Array.isArray(employees)).toBe(true);
      expect(employees.length).toBeGreaterThan(0);
      
      // Check structure
      const firstEmployee = employees[0];
      expect(firstEmployee).toHaveProperty("ibsId");
      expect(firstEmployee).toHaveProperty("name");
      expect(firstEmployee).toHaveProperty("isAdmin");
    });
  });

  describe("employees.getById", () => {
    it("retrieves employee by ID", async () => {
      const ctx = createContext();
      const caller = appRouter.createCaller(ctx);

      // First get all employees to get an ID
      const employees = await caller.employees.list();
      const firstEmployee = employees[0];

      // Get by ID
      const employee = await caller.employees.getById({
        id: firstEmployee.id,
      });

      expect(employee).toBeDefined();
      expect(employee?.id).toBe(firstEmployee.id);
      expect(employee?.ibsId).toBe(firstEmployee.ibsId);
    });
  });

  describe("Shift Types Validation", () => {
    it("accepts only valid shift types: Late, Opening, Mid, OFF", async () => {
      const ctx = createContext();
      const caller = appRouter.createCaller(ctx);

      // Login employee
      const employee = await caller.employees.login({
        ibsId: "392848",
        name: "Akram Mostafa",
      });

      // Test all valid shift types
      const validShifts = ["Late", "Opening", "Mid", "OFF"];
      
      for (const shiftType of validShifts) {
        const shift = await caller.shifts.submit({
          employeeId: employee.id,
          saturday: shiftType,
          sunday: shiftType,
          monday: shiftType,
          tuesday: shiftType,
          wednesday: shiftType,
          thursday: shiftType,
          friday: shiftType,
        });

        expect(shift.saturday).toBe(shiftType);
      }
    });
  });
});
