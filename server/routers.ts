import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import {
  getEmployeeByIbsId,
  createOrUpdateEmployee,
  getAllEmployees,
  getShiftByEmployeeId,
  createOrUpdateShift,
  getAllEmployeesWithShifts,
  getEmployeeById,
  addEmployee,
  deleteEmployee,
  archiveWeeklyShifts,
  getArchivedShiftsByWeek,
  getArchivedShiftsByMonth,
  getAllArchivedShifts,
  getArchivedShiftsWithEmployeeInfo,
  isShiftsOpen,
  toggleShiftsOpen,
  resetAllShifts,
} from "./db";

export const appRouter = router({
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  employees: router({
    // Login employee by IBS ID and name
    login: publicProcedure
      .input(z.object({ ibsId: z.string(), name: z.string() }))
      .mutation(async ({ input }) => {
        const employee = await createOrUpdateEmployee(input.ibsId, input.name);
        return employee;
      }),

    // Get all employees
    list: publicProcedure.query(async () => {
      return await getAllEmployees();
    }),

    // Get employee by ID
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getEmployeeById(input.id);
      }),

    // Add new employee (Admin only)
    add: publicProcedure
      .input(z.object({ ibsId: z.string(), name: z.string() }))
      .mutation(async ({ input }) => {
        return await addEmployee(input.ibsId, input.name);
      }),

    // Delete employee (Admin only)
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await deleteEmployee(input.id);
      }),
  }),

  shifts: router({
    // Get shift for current employee
    getCurrent: publicProcedure
      .input(z.object({ employeeId: z.number() }))
      .query(async ({ input }) => {
        return await getShiftByEmployeeId(input.employeeId);
      }),

    // Submit or update shift for employee
    submit: publicProcedure
      .input(
        z.object({
          employeeId: z.number(),
          saturday: z.string().default("OFF"),
          sunday: z.string().default("OFF"),
          monday: z.string().default("OFF"),
          tuesday: z.string().default("OFF"),
          wednesday: z.string().default("OFF"),
          thursday: z.string().default("OFF"),
          friday: z.string().default("OFF"),
        })
      )
      .mutation(async ({ input }) => {
        const { employeeId, ...shiftData } = input;
        return await createOrUpdateShift(employeeId, shiftData);
      }),

    // Get all shifts with employee info
    getAll: publicProcedure.query(async () => {
      return await getAllEmployeesWithShifts();
    }),

    // Archive weekly shifts
    archiveWeek: publicProcedure
      .input(z.object({ weekStartDate: z.date(), adminId: z.string() }))
      .mutation(async ({ input }) => {
        return await archiveWeeklyShifts(input.weekStartDate, input.adminId);
      }),

    // Get archived shifts by week
    getArchivedByWeek: publicProcedure
      .input(z.object({ weekStartDate: z.date() }))
      .query(async ({ input }) => {
        return await getArchivedShiftsByWeek(input.weekStartDate);
      }),

    // Get archived shifts by month
    getArchivedByMonth: publicProcedure
      .input(z.object({ year: z.number(), month: z.number() }))
      .query(async ({ input }) => {
        return await getArchivedShiftsByMonth(input.year, input.month);
      }),

    // Get all archived shifts with employee info
    getAllArchived: publicProcedure.query(async () => {
      return await getArchivedShiftsWithEmployeeInfo();
    }),

    // Reset all shifts to OFF
    resetAll: publicProcedure.mutation(async () => {
      return await resetAllShifts();
    }),
  }),

  system: router({
    ...systemRouter._def.procedures,
    isOpen: publicProcedure.query(async () => {
      return await isShiftsOpen();
    }),
    toggleOpen: publicProcedure
      .input(z.object({ isOpen: z.boolean() }))
      .mutation(async ({ input }) => {
        return await toggleShiftsOpen(input.isOpen);
      }),
  }),
});

export type AppRouter = typeof appRouter;
